# V100.2.87 — iPad Session Resume Integrity

Hardens iPad foreground resume ordering:

1. Verify Blue Current server.
2. Verify authenticated session with `/api/auth/me`.
3. Refresh session truth.
4. Replay queued writes only when both server and session are verified.

No polling, reload, or new authentication system is added.

```powershell
node APPLY-V100.2.87.js
node scripts/maintenance/test-v100.2.87-ipad-session-resume-integrity.js
```
