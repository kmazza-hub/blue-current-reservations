# Apply Blue Current V36.1.0

Replace the four existing files and add the two new module files at the exact paths included in this archive.

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/guidedShiftEngine.js client/js/modules/guidedShiftCenter.js V36.1.0-RELEASE.md README-APPLY-V36.1.0.md
git commit -m "V36.1 guided operator flow"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
