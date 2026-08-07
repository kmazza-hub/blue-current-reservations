# Apply Blue Current V35.8.0

Replace:
- client/index.html
- client/styles.css
- client/js/appState.js
- client/js/app-v15.1.3.js

Add:
- client/js/modules/deploymentReadinessEngine.js
- client/js/modules/deploymentReadinessCenter.js
- V35.8.0-RELEASE.md
- README-APPLY-V35.8.0.md

Then run:
```powershell
git add .
git commit -m "V35.8.0 deployment readiness and go-live control"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
