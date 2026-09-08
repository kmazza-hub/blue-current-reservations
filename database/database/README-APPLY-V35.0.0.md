# Apply Blue Current V35.0.0

Copy the files in this patch into the project root, preserving the folder structure.

## Replace

- `client/index.html`
- `client/styles.css`
- `client/js/appState.js`
- `client/js/app-v15.1.3.js`

## Add

- `client/js/modules/restaurantPerformanceEngine.js`
- `client/js/modules/restaurantPerformanceCenter.js`
- `V35.0.0-RELEASE.md`

## Git

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/restaurantPerformanceEngine.js client/js/modules/restaurantPerformanceCenter.js V35.0.0-RELEASE.md README-APPLY-V35.0.0.md
git commit -m "V35.0 restaurant performance engine"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
