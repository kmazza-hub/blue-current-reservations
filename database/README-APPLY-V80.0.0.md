# APPLY V80.0.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v80.0-pilot-data-authority-cutover.js
node scripts/maintenance/test-v79.75-integration-drift-recovery-continuity.js
node scripts/maintenance/test-v79.50-provider-reconciliation-data-confidence.js
node scripts/maintenance/test-v79.25-provider-connection-readiness.js
node scripts/maintenance/test-v79.0-live-data-source-truth.js
node scripts/maintenance/test-v78.75-auth-session-lifecycle-hardening.js
npm run check
npm run start
```

Expected: `"version":"80.0.0"`

```powershell
git add -A
git commit -m "V80.0.0 add pilot data authority and operational cutover"
git push origin live-service-timeline
```
