# APPLY V78.75.0

Run one command at a time:

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v78.75-auth-session-lifecycle-hardening.js
node scripts/maintenance/test-v78.50.2-light-surface-typography-contract.js
node scripts/maintenance/test-v78.25-product-surface-consolidation.js

npm run check
npm run start
```

Hard refresh Edge:

`Ctrl + Shift + R`

Expected health:

`"version":"78.75.0"`

In DevTools, normal authenticated startup should no longer produce repeated Command 401s, and closing the auth dialog should no longer produce the `aria-hidden` retained-focus warning.

Commit:

```powershell
git add -A
git commit -m "V78.75.0 harden authentication session lifecycle"
git push origin live-service-timeline
```
