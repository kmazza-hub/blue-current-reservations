# Apply V36.8.0

Replace the four existing files and add the six new JavaScript modules listed in this package. Preserve folder paths exactly.

Then run:

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/digitalTwinVisualizationEngine.js client/js/modules/digitalTwinVisualizationCenter.js client/js/modules/executiveMorningBriefEngine.js client/js/modules/executiveMorningBriefCenter.js client/js/modules/intelligenceGraphEngine.js client/js/modules/intelligenceGraphCenter.js V36.8.0-RELEASE.md README-APPLY-V36.8.0.md
git commit -m "V36.8 accelerated experience wave"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
