#!/usr/bin/env python3
"""Watch submitted inbox bullets and notify a local coding-agent command."""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
import re
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
from typing import Callable
import uuid


RETRY_CAP = 60.0
STATE_VERSION = 3
RECEIPT_VERSION = 1
RESOLVED_VERSION = 1
DONE_MARKER = re.compile(r"(?:^|\s)(?:done!?|\*\*done!?\*\*!?)\s*$", re.IGNORECASE)


class AlreadyRunning(RuntimeError):
    """Another watcher holds this state directory's lock."""


class QueueFailure(RuntimeError):
    def __init__(self, returncode: int):
        self.returncode = returncode
        super().__init__(f"queue exit status {returncode}")


class ResolvedLedgerError(ValueError):
    """An existing completion ledger cannot be trusted."""


def _digest(line: str) -> str:
    return hashlib.sha256(line.encode("utf-8")).hexdigest()


def _fingerprint(raw: str) -> str:
    """Keep revisions distinct, including changed indentation and line breaks."""
    match = DONE_MARKER.search(raw)
    if match is None:
        raise ValueError("comment is not submitted")
    canonical = raw[:match.start()].rstrip() + "\ndone"
    return _digest(canonical)


def _fence_after(line: str, fence: tuple[str, int] | None) -> tuple[str, int] | None:
    marker = re.match(r"^\s*(`{3,}|~{3,})(.*)$", line)
    if not marker:
        return fence
    token, rest = marker.groups()
    if fence is None:
        return token[0], len(token)
    if token[0] == fence[0] and len(token) >= fence[1] and not rest.strip():
        return None
    return fence


def _unclosed_fence(raw: str) -> bool:
    fence = None
    for index, line in enumerate(raw.splitlines()):
        if index == 0:
            line = re.sub(r"^[-+*]\s+", "", line)
        fence = _fence_after(line, fence)
    return fence is not None


def _comment_blocks(text: str) -> list[str]:
    lines = text.splitlines()
    separator = next((i for i, line in enumerate(lines) if line.strip() == "---"), None)
    if separator is None:
        return []
    blocks: list[list[str]] = []
    current: list[str] | None = None
    fence: tuple[str, int] | None = None
    for line in lines[separator + 1:]:
        if fence is None and re.match(r"^[-+*]\s+", line):
            if current is not None:
                blocks.append(current)
            current = [line]
            fence = _fence_after(re.sub(r"^[-+*]\s+", "", line), None)
        elif current is not None:
            current.append(line)
            fence = _fence_after(line, fence)
    if current is not None:
        blocks.append(current)
    return ["\n".join(block).rstrip() for block in blocks]


def ready_comments(text: str) -> list[str]:
    """One top-level bullet is one comment; done! submits it (legacy done also works)."""
    ready = []
    for raw in _comment_blocks(text):
        if _unclosed_fence(raw):
            continue
        match = DONE_MARKER.search(raw)
        if match is None:
            continue
        payload = re.sub(r"^[-+*](?:\s+|$)", "", raw[:match.start()]).strip()
        if payload:
            ready.append(raw)
    return ready


def _unique_json_pairs(pairs: list[tuple[str, object]]) -> dict[str, object]:
    data = {}
    for key, value in pairs:
        if key in data:
            raise ResolvedLedgerError("resolved comments ledger has duplicate keys")
        data[key] = value
    return data


def _load_resolved(state_dir: Path) -> dict[str, dict[str, str]]:
    path = Path(state_dir) / "resolved_comments.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_unique_json_pairs)
    except FileNotFoundError as error:
        if os.path.lexists(path):
            raise ResolvedLedgerError("resolved comments ledger is unreadable") from error
        return {}
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ResolvedLedgerError("resolved comments ledger is invalid") from error
    if (
        not isinstance(data, dict)
        or set(data) != {"version", "resolved"}
        or type(data["version"]) is not int
        or data["version"] != RESOLVED_VERSION
        or not isinstance(data["resolved"], dict)
    ):
        raise ResolvedLedgerError("resolved comments ledger has an invalid version or structure")
    records = data["resolved"]
    if any(
        not isinstance(digest, str)
        or re.fullmatch(r"[0-9a-f]{64}", digest) is None
        or not isinstance(metadata, dict)
        or set(metadata) != {"resolved_at", "note"}
        or not all(isinstance(metadata[field], str) and metadata[field].strip()
                   for field in ("resolved_at", "note"))
        for digest, metadata in records.items()
    ):
        raise ResolvedLedgerError("resolved comments ledger has invalid records")
    return records


def pending_comments(text: str, state_dir: Path) -> list[str]:
    """Submitted comments without a durable completion record, in original form."""
    resolved = _load_resolved(state_dir)
    return [raw for raw in ready_comments(text) if _fingerprint(raw) not in resolved]


def _snapshot(inbox: Path) -> tuple[list[tuple[str, str]], Counter[str]] | None:
    try:
        text = inbox.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None
    if not any(line.strip() == "---" for line in text.splitlines()):
        return None
    entries = [(_fingerprint(raw), raw) for raw in ready_comments(text)]
    return entries, Counter(digest for digest, _ in entries)


def _pending_snapshot(inbox: Path, state_dir: Path) -> tuple[list[tuple[str, str]], Counter[str]] | None:
    # Load first so a broken ledger never permits a receipt or a dispatch.
    resolved = _load_resolved(state_dir)
    snapshot = _snapshot(inbox)
    if snapshot is None:
        return None
    entries = [(digest, raw) for digest, raw in snapshot[0] if digest not in resolved]
    return entries, Counter(digest for digest, _ in entries)


def _valid_counts(counts: object) -> bool:
    return isinstance(counts, dict) and all(
        isinstance(key, str)
        and len(key) == 64
        and all(char in "0123456789abcdef" for char in key)
        and type(value) is int
        and value > 0
        for key, value in counts.items()
    )


def _valid_receipt_id(value: object) -> bool:
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{32}", value) is not None


def _write_json_atomic(path: Path, data: dict, prefix: str) -> None:
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=path.parent, prefix=prefix, delete=False,
        ) as handle:
            temporary = Path(handle.name)
            json.dump(data, handle, sort_keys=True, separators=(",", ":"))
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def _new_lines(entries: list[tuple[str, str]], baseline: Counter[str]) -> list[str]:
    seen: Counter[str] = Counter()
    added = []
    for digest, raw in entries:
        seen[digest] += 1
        if seen[digest] > baseline[digest]:
            added.append(raw)
    return added


def _error_label(error: Exception) -> str:
    # Never persist exception text: subprocess errors can include the message.
    if isinstance(error, QueueFailure):
        return str(error)
    if isinstance(error, subprocess.TimeoutExpired):
        return "queue timeout"
    if isinstance(error, OSError):
        return f"{type(error).__name__} (errno {error.errno})"
    return type(error).__name__


class InboxWatch:
    def __init__(
        self,
        *,
        prompt_file: Path,
        inbox: Path,
        state_dir: Path,
        command: list[str] | None = None,
        debounce: float = 0.0,
        interval: float = 2.0,
        timeout: float = 120.0,
        dispatcher: Callable[[str], None] | None = None,
        activity_probe: Callable[[], str] | None = None,
    ) -> None:
        if debounce < 0 or interval <= 0 or timeout <= 0:
            raise ValueError("debounce must be nonnegative; interval and timeout must be positive")
        self.prompt_file = Path(prompt_file)
        self.inbox = Path(inbox)
        self.state_dir = Path(state_dir)
        self.command = command
        self.debounce = debounce
        self.interval = interval
        self.timeout = timeout
        self.dispatcher = dispatcher or self._queue
        self.activity_probe = activity_probe
        self.state_path = self.state_dir / "inbox_watch_state.json"
        self.receipt_path = self.state_dir / "inbox_read_receipt.json"
        self.lock_path = self.state_dir / "inbox_watch.lock"
        self.baseline: Counter[str] = Counter()
        self.wake_pending = False
        self.seen_receipt_id: str | None = None
        self.thread_activity = "unknown"
        self.last_dispatch: str | None = None
        self.last_error: str | None = None
        self.pid: int | None = None
        self._saved_state: dict | None = None
        self._lock = None
        self._candidate: Counter[str] | None = None
        self._candidate_since = 0.0
        self._retry_attempt = 0
        self._retry_at = 0.0

    def __enter__(self) -> InboxWatch:
        self.state_dir.mkdir(parents=True, exist_ok=True)
        lock = self.lock_path.open("a+")
        try:
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            lock.close()
            raise AlreadyRunning(f"watcher already running for {self.state_dir}") from error
        self._lock = lock
        try:
            self._load_state()
            self.pid = os.getpid()
            self._save_state()
        except Exception:
            fcntl.flock(lock.fileno(), fcntl.LOCK_UN)
            lock.close()
            self._lock = None
            raise
        return self

    def __exit__(self, _type: object, _value: object, _traceback: object) -> None:
        if self._lock is not None:
            try:
                self.pid = None
                self._save_state()
            finally:
                fcntl.flock(self._lock.fileno(), fcntl.LOCK_UN)
                self._lock.close()
                self._lock = None

    def _load_state(self) -> None:
        try:
            data = json.loads(self.state_path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return
        if (
            not isinstance(data, dict)
            or data.get("version") not in (2, STATE_VERSION)
            or not _valid_counts(data.get("baseline"))
        ):
            raise ValueError("unsupported or invalid watcher state")
        self.baseline = Counter(data["baseline"])
        if data["version"] == STATE_VERSION:
            wake_pending = data.get("wake_pending", False)
            seen_receipt_id = data.get("seen_receipt_id")
            thread_activity = data.get("thread_activity", "unknown")
            if (
                type(wake_pending) is not bool
                or (seen_receipt_id is not None and not _valid_receipt_id(seen_receipt_id))
                or thread_activity not in ("active", "idle", "unknown")
            ):
                raise ValueError("invalid watcher state")
            self.wake_pending = wake_pending
            self.seen_receipt_id = seen_receipt_id
            self.thread_activity = thread_activity
        self.last_dispatch = data.get("last_dispatch")
        self.last_error = data.get("last_error")
        self._saved_state = data

    def _save_state(self) -> None:
        data = {
            "version": STATE_VERSION,
            "baseline": dict(self.baseline),
            "wake_pending": self.wake_pending,
            "seen_receipt_id": self.seen_receipt_id,
            "thread_activity": self.thread_activity,
            "last_dispatch": self.last_dispatch,
            "last_error": self.last_error,
            "pid": self.pid,
        }
        if data != self._saved_state:
            _write_json_atomic(self.state_path, data, ".inbox_watch_state.")
            self._saved_state = data

    def _observe_activity(self) -> str | None:
        if self.activity_probe is None:
            return None
        try:
            activity = self.activity_probe()
        except Exception:
            activity = "unknown"
        if activity not in ("active", "idle"):
            activity = "unknown"
        self.thread_activity = activity
        if activity == "active":
            self.wake_pending = False
        return activity

    def _consume_receipt(self) -> None:
        try:
            receipt = json.loads(self.receipt_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            return
        if (
            not isinstance(receipt, dict)
            or set(receipt) != {"version", "receipt_id", "counts"}
            or type(receipt["version"]) is not int
            or receipt["version"] != RECEIPT_VERSION
            or not _valid_receipt_id(receipt["receipt_id"])
            or not _valid_counts(receipt["counts"])
            or receipt["receipt_id"] == self.seen_receipt_id
        ):
            return
        for digest, count in receipt["counts"].items():
            self.baseline[digest] = max(self.baseline[digest], count)
        self.seen_receipt_id = receipt["receipt_id"]
        self.wake_pending = False

    def _message(self, added: list[str]) -> str:
        instructions = self.prompt_file.read_text(encoding="utf-8").rstrip()
        return f"{instructions}\nInbox: {self.inbox}\nSubmitted updates: {len(added)}.\n\n" + "\n\n".join(added)

    def _queue(self, message: str) -> None:
        if not self.command:
            print(message, flush=True)
            return
        # Send text on stdin; never interpolate a comment into a shell command.
        result = subprocess.run(
            self.command,
            input=message,
            capture_output=True,
            text=True,
            timeout=self.timeout,
            check=False,
        )
        if result.returncode != 0:
            raise QueueFailure(result.returncode)

    def _clear_candidate(self) -> None:
        self._candidate = None
        self._retry_attempt = 0
        self._retry_at = 0.0

    def _record_ledger_error(self, error: ValueError | OSError) -> str:
        if isinstance(error, OSError):
            label = f"resolved ledger: {type(error).__name__} (errno {error.errno})"
        else:
            label = "resolved ledger: invalid or unsupported"
        if label != self.last_error:
            print(f"inbox watch: {label}", file=sys.stderr)
        self.last_error = label
        self._clear_candidate()
        self._save_state()
        return "error"

    def _retire_removed(self, counts: Counter[str]) -> bool:
        removed = False
        for digest in list(self.baseline):
            if counts[digest] < self.baseline[digest]:
                removed = True
                if counts[digest]:
                    self.baseline[digest] = counts[digest]
                else:
                    del self.baseline[digest]
        return removed

    def poll_once(self, now: float | None = None) -> str:
        """Make one observation. now is a monotonic timestamp for fixtures."""
        if self._lock is None:
            raise RuntimeError("acquire the watcher lock before polling")
        if now is None:
            now = time.monotonic()
        try:
            snapshot = _pending_snapshot(self.inbox, self.state_dir)
        except (ResolvedLedgerError, OSError) as error:
            return self._record_ledger_error(error)
        if self.last_error is not None and self.last_error.startswith("resolved ledger: "):
            self.last_error = None
        activity = self._observe_activity()
        self._consume_receipt()
        if snapshot is None:
            self._clear_candidate()
            self._save_state()
            return "unavailable"

        entries, counts = snapshot
        if counts == self.baseline:
            self._clear_candidate()
            self._save_state()
            return "unchanged"
        if self._candidate != counts:
            self._candidate = counts.copy()
            self._candidate_since = now
            self._retry_attempt = 0
            self._retry_at = 0.0
            self._save_state()
            return "pending"
        if now - self._candidate_since < self.debounce or now < self._retry_at:
            self._save_state()
            return "pending"

        # Deletions retire acknowledged multiplicity even while dispatch is gated.
        # An unchanged receipt must never restore it on a later poll.
        removed = self._retire_removed(counts)
        added = _new_lines(entries, self.baseline)
        if not added:
            self._save_state()
            self._clear_candidate()
            return "cleanup" if removed else "unchanged"

        if activity in ("active", "unknown"):
            self._save_state()
            return activity
        if activity == "idle" and self.wake_pending:
            self._save_state()
            return "wake_pending"

        # Recheck at the send boundary: a turn or read receipt may have arrived
        # while the inbox snapshot was being examined. Completion can change too.
        activity = self._observe_activity()
        try:
            resolved = _load_resolved(self.state_dir)
        except (ResolvedLedgerError, OSError) as error:
            return self._record_ledger_error(error)
        self._consume_receipt()
        entries = [(digest, raw) for digest, raw in entries if digest not in resolved]
        counts = Counter(digest for digest, _ in entries)
        self._retire_removed(counts)
        added = _new_lines(entries, self.baseline)
        if not added:
            self._save_state()
            self._clear_candidate()
            return "unchanged"
        if activity in ("active", "unknown"):
            self._save_state()
            return activity
        if activity == "idle" and self.wake_pending:
            self._save_state()
            return "wake_pending"

        try:
            self.dispatcher(self._message(added))
        except Exception as error:
            self.last_error = _error_label(error)
            self._retry_attempt += 1
            delay = min(RETRY_CAP, self.interval * 2 ** min(self._retry_attempt - 1, 16))
            self._retry_at = now + delay
            self._save_state()
            return "error"

        self.baseline = counts.copy()
        self.wake_pending = True
        self.last_dispatch = datetime.now(timezone.utc).isoformat(timespec="seconds")
        self.last_error = None
        self._save_state()
        self._clear_candidate()
        return "dispatched"


def _selected_comments(path: Path) -> list[str]:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as error:
        raise ValueError("comments file is not valid UTF-8") from error
    if not any(line.strip() == "---" for line in text.splitlines()):
        raise ValueError("comments file has no --- separator")
    blocks = _comment_blocks(text)
    if not blocks or blocks != ready_comments(text):
        raise ValueError("comments file must contain only submitted, nonempty bullets")
    return blocks


def _verify_archive(archive: Path, selected: list[str]) -> None:
    try:
        text = archive.read_text(encoding="utf-8")
    except UnicodeDecodeError as error:
        raise ValueError("archive is not valid UTF-8") from error
    originals = set(_comment_blocks(text))
    for raw in set(selected):
        # A matching prefix of a longer archived comment is not the original.
        if raw not in originals:
            raise ValueError("archive is missing an exact selected comment")


def _change_resolved(state_dir: Path, selected: list[str], *, note: str | None) -> int:
    state_dir.mkdir(parents=True, exist_ok=True)
    path = state_dir / "resolved_comments.json"
    lock_path = state_dir / "resolved_comments.lock"
    digests = {_fingerprint(raw) for raw in selected}
    with lock_path.open("a+") as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        try:
            records = _load_resolved(state_dir)
            changed = 0
            if note is None:
                for digest in digests:
                    if digest in records:
                        del records[digest]
                        changed += 1
            else:
                now = datetime.now(timezone.utc).isoformat(timespec="seconds")
                for digest in digests:
                    if digest not in records:
                        records[digest] = {"resolved_at": now, "note": note}
                        changed += 1
            if changed:
                _write_json_atomic(
                    path, {"version": RESOLVED_VERSION, "resolved": records}, ".resolved_comments."
                )
            return changed
        finally:
            fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


def _cli_error(error: Exception) -> str:
    if isinstance(error, OSError):
        return f"{type(error).__name__} (errno {error.errno})"
    return str(error)


def _resolve_main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Record verified comment completions")
    parser.add_argument("--comments-file", type=Path, required=True)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--state-dir", type=Path, required=True)
    parser.add_argument("--note", required=True)
    args = parser.parse_args(argv)
    try:
        if not args.note.strip():
            raise ValueError("resolution note must not be blank")
        selected = _selected_comments(args.comments_file)
        _verify_archive(args.archive, selected)
        changed = _change_resolved(args.state_dir, selected, note=args.note)
    except (ValueError, OSError) as error:
        print(f"resolve: {_cli_error(error)}", file=sys.stderr)
        return 2
    print(f"Resolved {changed} of {len({_fingerprint(raw) for raw in selected})} selected comments.")
    return 0


def _reopen_main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Reopen selected completed comments")
    parser.add_argument("--comments-file", type=Path, required=True)
    parser.add_argument("--state-dir", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        selected = _selected_comments(args.comments_file)
        changed = _change_resolved(args.state_dir, selected, note=None)
    except (ValueError, OSError) as error:
        print(f"reopen: {_cli_error(error)}", file=sys.stderr)
        return 2
    print(f"Reopened {changed} of {len({_fingerprint(raw) for raw in selected})} selected comments.")
    return 0


def _read_main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Read completed inbox comments and acknowledge this snapshot")
    parser.add_argument("--inbox", type=Path, required=True)
    parser.add_argument("--state-dir", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        snapshot = _pending_snapshot(args.inbox, args.state_dir)
    except (ResolvedLedgerError, OSError) as error:
        print(f"read: resolved ledger unavailable: {_cli_error(error)}", file=sys.stderr)
        return 2
    if snapshot is None:
        print(f"inbox unavailable or invalid: {args.inbox}", file=sys.stderr)
        return 2
    entries, counts = snapshot
    args.state_dir.mkdir(parents=True, exist_ok=True)
    _write_json_atomic(
        args.state_dir / "inbox_read_receipt.json",
        {"version": RECEIPT_VERSION, "receipt_id": uuid.uuid4().hex, "counts": dict(counts)},
        ".inbox_read_receipt.",
    )
    if entries:
        print("\n\n".join(raw for _, raw in entries))
    return 0


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]
    if argv and argv[0] == "read":
        return _read_main(argv[1:])
    if argv and argv[0] == "resolve":
        return _resolve_main(argv[1:])
    if argv and argv[0] == "reopen":
        return _reopen_main(argv[1:])
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt-file", type=Path, required=True)
    parser.add_argument("--inbox", type=Path, required=True)
    parser.add_argument("--state-dir", type=Path, required=True)
    parser.add_argument("--command", nargs=argparse.REMAINDER, help="Local notifier argv, last option; message arrives on stdin")
    parser.add_argument("--debounce", type=float, default=0.0)
    parser.add_argument("--interval", type=float, default=2.0)
    parser.add_argument("--timeout", type=float, default=120.0)
    args = parser.parse_args(argv)
    try:
        options = vars(args)
        watcher = InboxWatch(**options)
    except ValueError as error:
        parser.error(str(error))

    stopping = False

    def stop(_signum: int, _frame: object) -> None:
        nonlocal stopping
        stopping = True

    previous_term = signal.signal(signal.SIGTERM, stop)
    try:
        with watcher:
            while not stopping:
                watcher.poll_once()
                time.sleep(watcher.interval)
    except KeyboardInterrupt:
        pass
    except AlreadyRunning as error:
        print(error, file=sys.stderr)
        return 2
    finally:
        signal.signal(signal.SIGTERM, previous_term)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
