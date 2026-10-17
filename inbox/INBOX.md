# Unfinished comments

Write below the line, one comment per top-level bullet. Name a slide by ID (for example **U01**) or slide number. Indented subpoints and pasted screenshot links belong to that comment. End the whole comment with `done!` when you are ready for the coding agent to read it (`done` also works). Draft comments stay untouched. `done!` means you finished writing, not that the requested edit is resolved.

- `INBOX.md`: unfinished comments, including queued, assigned, in-progress and awaiting-verification items.
- `COMMENTS.md`: permanent archive of your exact original comments, both unfinished and resolved. Keep your wording and screenshot references only.
- `LOG.md`: the coding agent's interpretation, assignments, progress, checks and resolution records.

For agents: archive each new comment verbatim in `COMMENTS.md` before processing it, without duplicating an already archived original. Preserve previous entries. If a comment is revised, keep the earlier original and append the revised version. Receiving or starting a comment does not remove it from this inbox. Remove an item only after every part is resolved and checked, the full original is safely archived, and the resolution is recorded in `LOG.md`. Keep partially resolved or unverified items here.

The watcher only notifies. It does not edit slides, archive comments or remove inbox items. Its private state belongs in `.local/inbox/`, which Git ignores.

---

