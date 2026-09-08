# APPLY V80.75.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v80.75-pilot-shift-certification-go-no-go.js
node scripts/maintenance/test-v80.50-pilot-incident-recovery-certification.js
node scripts/maintenance/test-v80.25-pilot-runtime-guardrails-service-night-safety.js
node scripts/maintenance/test-v80.0-pilot-data-authority-cutover.js
node scripts/maintenance/test-v79.75-integration-drift-recovery-continuity.js
node scripts/maintenance/test-v79.50-provider-reconciliation-data-confidence.js
node scripts/maintenance/test-v79.25-provider-connection-readiness.js
node scripts/maintenance/test-v79.0-live-data-source-truth.js
node scripts/maintenance/test-v78.75-auth-session-lifecycle-hardening.js
npm run check
npm run start
```

Expected: `"version":"80.75.0"`

```powershell
git add -A
git commit -m "V80.75.0 add pilot shift certification go no-go control"
git push origin live-service-timeline
```
