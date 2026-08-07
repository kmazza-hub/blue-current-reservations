# Apply V35.1.0

Replace:
- client/index.html
- client/styles.css
- client/js/appState.js
- client/js/app-v15.1.3.js

Add:
- client/js/modules/outcomeIntelligenceEngine.js
- client/js/modules/outcomeIntelligenceCenter.js
- V35.1.0-RELEASE.md
- README-APPLY-V35.1.0.md

Then run:
```powershell
git add .
git commit -m "V35.1.0 outcome intelligence"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
