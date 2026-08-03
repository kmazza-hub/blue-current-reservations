# Apply V35.12.0

Replace:
- client/index.html
- client/styles.css
- client/js/appState.js
- client/js/app-v15.1.3.js

Add:
- client/js/modules/enterpriseValuePlanEngine.js
- client/js/modules/enterpriseValuePlanCenter.js
- V35.12.0-RELEASE.md
- README-APPLY-V35.12.0.md

Then run:
```powershell
git add .
git commit -m "V35.12.0 enterprise value plan"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
