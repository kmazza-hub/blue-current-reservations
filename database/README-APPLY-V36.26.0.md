# Apply V36.26.0

Replace the four existing client files and add the six new modules plus this release documentation.

## Git
```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules README-APPLY-V36.26.0.md V36.26.0-RELEASE.md
git commit -m "V36.26 accelerated purchase prep closeout wave"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
