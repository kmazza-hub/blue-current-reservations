# Apply V47.40.0

Baseline: exact V47.35.0 repository. Extract into the repository root and replace matching files.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v47.40-release-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `47.40.0`. Then `Ctrl+F5`.

```powershell
git add -A
git commit -m "V47.40.0 certify and close V47"
git push origin live-service-timeline
```
