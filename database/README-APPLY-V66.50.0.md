# APPLY V66.50.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v66.50-microcopy.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `66.50.0`

Browser checks:
- primary actions use clear verbs
- Details reads View details
- Ask reads Ask Blue Current where applicable
- Reset reads Reset view
- Host quick-add/search actions explain their purpose
- high-impact actions have a review cue
- keyboard/screen-reader names remain meaningful
- no workflow behavior changes

```powershell
git add -A
git commit -m "V66.50.0 polish microcopy and action language"
git push origin live-service-timeline
```
