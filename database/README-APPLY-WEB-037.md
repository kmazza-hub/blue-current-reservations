# APPLY WEB-037

This is the public-face freeze for the current website phase.

```powershell
node scripts/maintenance/test-web-030-hospitality-os-story.js
node scripts/maintenance/test-web-031-service-speed-buyer-journey.js
node scripts/maintenance/test-web-032-brand-authority-pilot-proof.js
node scripts/maintenance/test-web-033-profitability-calm-operations.js
node scripts/maintenance/test-web-034-homepage-compression-conversion.js
node scripts/maintenance/test-web-035-first-class-art-direction.js
node scripts/maintenance/test-web-036-visual-certification.js
node scripts/maintenance/test-web-037-launch-face-finalization.js
npm run check
npm run start
```

After visual review:

```powershell
git add -A
git commit -m "WEB-037 lock and finalize Blue Current public face"
git push origin live-service-timeline
```
