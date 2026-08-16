# APPLY V77.50.1

Run one command at a time:

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v77.50.1-command-auth-diagnostics-hotfix.js
node scripts/maintenance/test-v77.50-outcome-verification-closed-loop-learning.js
npm run check
npm run start
```

Then hard refresh Edge:

`Ctrl + Shift + R`

Expected:
- health version `"77.50.1"`
- diagnostic control is a small top-right button, not over Quick Jobs
- no repeated Command 401 calls while signed out
- sign-in overlay opens when the Command session expires

If `/api/events` still shows `502 Bad Gateway`, verify the local server is running and restart the Cloudflare quick tunnel.
