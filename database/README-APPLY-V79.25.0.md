# APPLY V79.25.0

Run one command at a time:

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v79.25-provider-connection-readiness.js
node scripts/maintenance/test-v79.0-live-data-source-truth.js
node scripts/maintenance/test-v78.75-auth-session-lifecycle-hardening.js

npm run check
npm run start
```

Expected health:

`"version":"79.25.0"`

Command will continue to show the source state. A provider can only reach `Pilot-ready source` when the full readiness gate passes.

Commit:

```powershell
git add -A
git commit -m "V79.25.0 add provider connection readiness gate"
git push origin live-service-timeline
```
