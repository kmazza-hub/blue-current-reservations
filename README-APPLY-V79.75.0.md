# APPLY V79.75.0

Run one command at a time:

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v79.75-integration-drift-recovery-continuity.js
node scripts/maintenance/test-v79.50-provider-reconciliation-data-confidence.js
node scripts/maintenance/test-v79.25-provider-connection-readiness.js
node scripts/maintenance/test-v79.0-live-data-source-truth.js
node scripts/maintenance/test-v78.75-auth-session-lifecycle-hardening.js
npm run check
npm run start
```

Expected health:

`"version":"79.75.0"`

Commit:

```powershell
git add -A
git commit -m "V79.75.0 add integration drift recovery and continuity"
git push origin live-service-timeline
```
