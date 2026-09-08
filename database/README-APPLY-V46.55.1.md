# APPLY BLUE CURRENT V46.55.1

## Baseline
Apply over Blue Current V46.55.0.

This is a normal overlay hotfix. It does not delete files.

## Apply
Extract `BLUE-CURRENT-V46.55.1-HOTFIX.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate
```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v46.55.1-margin-intelligence-startup.js
npm run start
```

Then open Blue Current and refresh the browser with `Ctrl+F5`.

The console should no longer report:

`ReferenceError: marginIntelligenceCenterModule is not defined`

Health check:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "46.55.1"
```

## Git
```powershell
git add package.json
git add server/server.js
git add server/api/router.js
git add client/index.html
git add client/js/startup-loader.js
git add client/js/app-v15.1.3.js
git add client/app-v15.1.3.js
git add app-v15.1.3.js
git add scripts/maintenance/test-v46.55.1-margin-intelligence-startup.js
git add README-APPLY-V46.55.1.md
git add V46.55.1-RELEASE.md
git add V46.55.1-IMPLEMENTATION.patch

git commit -m "V46.55.1 fix margin intelligence startup registration"
git push origin live-service-timeline
```
