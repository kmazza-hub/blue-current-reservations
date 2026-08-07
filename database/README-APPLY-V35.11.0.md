# Apply Blue Current V35.11.0

Replace the four existing files and add the two new module files listed below.

## Replace
- `client/index.html`
- `client/styles.css`
- `client/js/appState.js`
- `client/js/app-v15.1.3.js`

## Add
- `client/js/modules/performanceGovernanceEngine.js`
- `client/js/modules/performanceGovernanceCenter.js`
- `V35.11.0-RELEASE.md`

## Git
```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/performanceGovernanceEngine.js client/js/modules/performanceGovernanceCenter.js V35.11.0-RELEASE.md
git commit -m "V35.11 performance governance"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
