# APPLY V89.50.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v89.50-pilot-runtime-session-control.js
node scripts/maintenance/test-v89.25-pilot-readiness-launch-control.js
node scripts/maintenance/test-v89.0-pilot-operator-acceptance.js
node scripts/maintenance/test-v88.75-pilot-scenario-service-simulation.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
```

Expected: `"version":"89.50.0"`

```powershell
git add -A
git commit -m "V89.50.0 add pilot runtime guardrails and session control"
git push origin live-service-timeline
```
