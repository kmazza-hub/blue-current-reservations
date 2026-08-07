# Apply Blue Current V35.2.0

Replace:
- client/index.html
- client/styles.css
- client/js/appState.js
- client/js/app-v15.1.3.js

Add:
- client/js/modules/executiveBriefingEngine.js
- client/js/modules/executiveBriefingCenter.js
- V35.2.0-RELEASE.md
- README-APPLY-V35.2.0.md

Then run:

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/executiveBriefingEngine.js client/js/modules/executiveBriefingCenter.js V35.2.0-RELEASE.md README-APPLY-V35.2.0.md
git commit -m "V35.2.0 executive briefing"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
