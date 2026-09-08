# APPLY BLUE CURRENT V47.35.0

Apply over the exact V47.30.0 repository.

Extract `BLUE-CURRENT-V47.35.0-PATCH.zip` into the repository root, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v47.35-multi-location-performance.js
npm run start
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "47.35.0"
```

Then `Ctrl+F5`.

Git:

```powershell
git add -A
git commit -m "V47.35.0 add multi-location performance"
git push origin live-service-timeline
```
