PR: drive: normalize status + surface failures

Summary:
Small follow-up changes to prevent Postgres enum errors and surface save/import failures to users.

Included:
- Normalize incoming status keys before DB write (writeDosarWithSchemaCompat)
- Add safe fallback + console.warn in getStatusDefinition for unknown status keys
- Surface short showNotice for saveClaim failures in LocalDrive flows and LocalDriveView
- Keep detailed console.error logs for diagnostics

Testing notes:
1. Checkout branch agents/drive-fix-20260918-1650
2. Start frontend and reproduce Drive import flows with nonstandard statuses
3. Confirm no 400/22P02 from DB and that warnings/notifications appear as expected.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>