#!/usr/bin/env python3
"""Wait for a newly submitted inbox comment, print it, then exit to wake an agent."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
import sys
import time

import inbox_watch as iw


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inbox", type=Path, required=True)
    parser.add_argument("--state-dir", type=Path, required=True)
    parser.add_argument("--seen", type=Path, help="Notification ledger (default: state-dir/notifications.json)")
    parser.add_argument("--interval", type=float, default=3)
    parser.add_argument("--init", action="store_true", help="Mark current submissions as notified and exit")
    parser.add_argument("--once", action="store_true", help="Scan once; exit 1 when no new comment exists")
    args = parser.parse_args()
    if args.interval <= 0:
        parser.error("--interval must be positive")
    seen_path = args.seen or args.state_dir / "notifications.json"
    try:
        saved = json.loads(seen_path.read_text(encoding="utf-8")) if seen_path.exists() else []
        if not isinstance(saved, list) or not all(isinstance(item, str) and re.fullmatch(r"[0-9a-f]{64}", item) for item in saved):
            raise ValueError("invalid notification ledger")
        seen = set(saved)
        while True:
            raw = args.inbox.read_text(encoding="utf-8")
            comments = iw.pending_comments(raw, args.state_dir)
            fresh = [item for item in comments if iw._fingerprint(item) not in seen]
            if fresh or args.init:
                seen.update(iw._fingerprint(item) for item in fresh)
                seen_path.parent.mkdir(parents=True, exist_ok=True)
                iw._write_json_atomic(seen_path, sorted(seen), ".notifications.")
                if not args.init:
                    print("\n\n".join(fresh), flush=True)
                return 0
            if args.once:
                return 1
            time.sleep(args.interval)
    except (OSError, ValueError) as error:
        print(f"inbox notification: {type(error).__name__}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
