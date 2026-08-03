# Apply Blue Current V35.6.0

Replace:
- `client/index.html`
- `client/styles.css`
- `client/js/appState.js`
- `client/js/app-v15.1.3.js`

Add:
- `client/js/modules/pilotOperationsEngine.js`
- `client/js/modules/pilotOperationsCenter.js`
- `V35.6.0-RELEASE.md`
- `README-APPLY-V35.6.0.md`

Then run:

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/pilotOperationsEngine.js client/js/modules/pilotOperationsCenter.js V35.6.0-RELEASE.md README-APPLY-V35.6.0.md
git commit -m "V35.6.0 pilot operations validation"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
