# Apply Blue Current V35.13.0

Replace:
- client/index.html
- client/styles.css
- client/js/appState.js
- client/js/app-v15.1.3.js

Add:
- client/js/modules/marginIntelligenceEngine.js
- client/js/modules/marginIntelligenceCenter.js
- V35.13.0-RELEASE.md

Then run:
```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/marginIntelligenceEngine.js client/js/modules/marginIntelligenceCenter.js V35.13.0-RELEASE.md README-APPLY-V35.13.0.md
git commit -m "V35.13.0 margin intelligence and profit control"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
