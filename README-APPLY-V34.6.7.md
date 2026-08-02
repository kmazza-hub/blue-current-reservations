# Apply V34.6.7

Replace:
- client/index.html
- client/styles.css
- client/js/appState.js
- client/js/app-v15.1.3.js

Add:
- client/js/modules/predictiveServiceEngine.js
- client/js/modules/predictiveServiceCenter.js
- V34.6.7-RELEASE.md

Then run:
```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/predictiveServiceEngine.js client/js/modules/predictiveServiceCenter.js V34.6.7-RELEASE.md README-APPLY-V34.6.7.md
git commit -m "V34.6.7 predictive service center"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
