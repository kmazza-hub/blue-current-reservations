# APPLY V71.0.1

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v71.0.1-google-fonts-csp-hotfix.js
node scripts/maintenance/test-v71.0-persistence-abstraction-migration-readiness.js
node scripts/maintenance/test-v70.0-production-configuration-readiness.js
npm run check

npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `"71.0.1"`

Then hard-refresh Edge with `Ctrl + Shift + R`.

Commit:

```powershell
git add -A
git commit -m "V71.0.1 allow Google Fonts through CSP"
git push origin live-service-timeline
```
