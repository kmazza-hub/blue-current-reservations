# APPLY V55.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v55.0-v54-operator-experience-certification.js
node scripts/maintenance/test-v54.75-role-based-service-ergonomics.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `55.0.0`

```powershell
git add -A
git commit -m "V55.0.0 close V54 operator experience"
git push origin live-service-timeline
```
