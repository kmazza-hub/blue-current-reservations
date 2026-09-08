# APPLY WEB-031

This package is cumulative: it includes WEB-030 + WEB-031 website changes.

Copy the ZIP into the repository root and replace the included files.

```powershell
node scripts/maintenance/test-web-030-hospitality-os-story.js
node scripts/maintenance/test-web-031-service-speed-buyer-journey.js
npm run check
npm run start
```

Review the public homepage through the same route used by bluecurrentco.com.

```powershell
git add -A
git commit -m "WEB-031 service speed and buyer journey polish"
git push origin live-service-timeline
```
