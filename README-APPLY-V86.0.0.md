# APPLY V86.0.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v86.0-integration-readiness-connector-data-trust.js
node scripts/maintenance/test-v85.0-architecture-freeze-pilot-baseline.js
node scripts/maintenance/test-v84.75-intelligence-consolidation-architecture-rationalization.js
npm run check
npm run start
```

Expected: `"version":"86.0.0"`

```powershell
git add -A
git commit -m "V86.0.0 add integration readiness and connector data trust"
git push origin live-service-timeline
```
