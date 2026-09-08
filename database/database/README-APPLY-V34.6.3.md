# Apply V34.6.3

Copy the files in this patch into the project root, preserving paths. Replace existing files when prompted.

## Replace
- client/index.html
- client/styles.css
- client/js/appState.js
- client/js/app-v15.1.3.js

## Add
- client/js/modules/operationalDigitalTwinEngine.js
- client/js/modules/operationalDigitalTwinCenter.js
- V34.6.3-RELEASE.md

## Git
```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/operationalDigitalTwinEngine.js client/js/modules/operationalDigitalTwinCenter.js V34.6.3-RELEASE.md README-APPLY-V34.6.3.md
git commit -m "V34.6.3 operational digital twin"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
