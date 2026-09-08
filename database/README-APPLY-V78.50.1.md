# APPLY V78.50.1

Run one command at a time:

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v78.50-shift-memory-contextual-playbook.js
node scripts/maintenance/test-v78.50.1-command-auth-startup-race-hotfix.js
node scripts/maintenance/test-v78.25-product-surface-consolidation.js

npm run check
npm run start
```

Then hard refresh Edge:

`Ctrl + Shift + R`

Expected:
- health version `"78.50.1"`
- `/api/auth/me` completes before Command begins its authenticated operating read
- Command remains visible if sign-in is required
- the page does not collapse to a blank dark viewport on a Command 401

Commit:

```powershell
git add -A
git commit -m "V78.50.1 fix Command authentication startup race"
git push origin live-service-timeline
```
