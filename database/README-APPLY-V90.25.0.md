# APPLY V90.25.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v90.25-pilot-learning-next-session-decision.js
node scripts/maintenance/test-v90.0-pilot-session-closeout-evidence.js
node scripts/maintenance/test-v89.75-pilot-runtime-observability-incident-control.js
node scripts/maintenance/test-v89.50-pilot-runtime-session-control.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
```

Expected: `"version":"90.25.0"`

```powershell
git add -A
git commit -m "V90.25.0 add pilot learning review and next-session decision"
git push origin live-service-timeline
```
