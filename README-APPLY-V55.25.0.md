# APPLY V55.25.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v55.25-restaurant-intelligence-decision-support.js
node scripts/maintenance/test-v55.0-v54-operator-experience-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `55.25.0`

```powershell
git add -A
git commit -m "V55.25.0 add restaurant intelligence decision support"
git push origin live-service-timeline
```
