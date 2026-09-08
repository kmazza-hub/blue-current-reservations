# Apply Blue Current V36.2.0

Replace:
- client/index.html
- client/styles.css
- client/js/appState.js
- client/js/app-v15.1.3.js

Add:
- client/js/modules/operatorCopilotEngine.js
- client/js/modules/operatorCopilotCenter.js
- V36.2.0-RELEASE.md
- README-APPLY-V36.2.0.md

Then run:
```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/operatorCopilotEngine.js client/js/modules/operatorCopilotCenter.js V36.2.0-RELEASE.md README-APPLY-V36.2.0.md
git commit -m "V36.2.0 AI Operator Copilot"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
