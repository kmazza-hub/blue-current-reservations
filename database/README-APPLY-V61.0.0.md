# APPLY V61.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v61.0-operator-shell-navigation-contrast.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `61.0.0`

Browser verification:
- only one compact operator utility strip appears before Command Center
- Shift Focus, Show insights, and Show advanced controls still work
- all eight top navigation buttons work
- Live KPI numbers and labels are bright and readable
- Restaurant Health, Copilot, Timeline, and action panels are readable in dark conditions

```powershell
git add -A
git commit -m "V61.0.0 compact operator shell and fix navigation"
git push origin live-service-timeline
```
