# APPLY V90.0.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v90.0-pilot-session-closeout-evidence.js
node scripts/maintenance/test-v89.75-pilot-runtime-observability-incident-control.js
node scripts/maintenance/test-v89.50-pilot-runtime-session-control.js
node scripts/maintenance/test-v89.25-pilot-readiness-launch-control.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
```

Expected: `"version":"90.0.0"`

```powershell
git add -A
git commit -m "V90.0.0 add pilot session closeout and evidence capture"
git push origin live-service-timeline
```
