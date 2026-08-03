# Apply Blue Current V36.0.0

Copy the files in this patch into the repository root and allow the folders to merge. Replace files when prompted.

## Replace
- client/index.html
- client/styles.css
- client/js/appState.js
- client/js/app-v15.1.3.js

## Add
- client/js/modules/unifiedCommandEngine.js
- client/js/modules/unifiedCommandCenter.js
- V36.0.0-RELEASE.md

## Commit
```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/unifiedCommandEngine.js client/js/modules/unifiedCommandCenter.js V36.0.0-RELEASE.md README-APPLY-V36.0.0.md
git commit -m "V36.0 unified restaurant command"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
