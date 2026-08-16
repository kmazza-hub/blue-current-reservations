# APPLY V79.0.0

Run one command at a time:

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v79.0-live-data-source-truth.js
node scripts/maintenance/test-v78.75-auth-session-lifecycle-hardening.js
node scripts/maintenance/test-v78.50.2-light-surface-typography-contract.js

npm run check
npm run start
```

Expected health:

`"version":"79.0.0"`

In Command, the old unconditional `Service live` label is replaced by a source-aware state such as `Local data`, `Partial sources`, or `Live sources`.

Commit:

```powershell
git add -A
git commit -m "V79.0.0 add live data source truth and integration readiness"
git push origin live-service-timeline
```
