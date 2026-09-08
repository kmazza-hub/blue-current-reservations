# APPLY WEB-033

WEB-033 builds on WEB-030, WEB-031, and WEB-032 already present in the uploaded repo.

Copy the ZIP into the repository root and replace the included files.

```powershell
node scripts/maintenance/test-web-030-hospitality-os-story.js
node scripts/maintenance/test-web-031-service-speed-buyer-journey.js
node scripts/maintenance/test-web-032-brand-authority-pilot-proof.js
node scripts/maintenance/test-web-033-profitability-calm-operations.js
npm run check
npm run start
```

Review bluecurrentco.com visually before committing.

```powershell
git add -A
git commit -m "WEB-033 profitability and calm operations story"
git push origin live-service-timeline
```
