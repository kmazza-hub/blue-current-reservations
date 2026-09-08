# Apply Blue Current V35.3.0

Replace:
- `client/index.html`
- `client/styles.css`
- `client/js/appState.js`
- `client/js/app-v15.1.3.js`

Add:
- `client/js/modules/portfolioPerformanceEngine.js`
- `client/js/modules/portfolioPerformanceCenter.js`
- `V35.3.0-RELEASE.md`

Then run:
```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/portfolioPerformanceEngine.js client/js/modules/portfolioPerformanceCenter.js V35.3.0-RELEASE.md README-APPLY-V35.3.0.md
git commit -m "V35.3.0 portfolio performance hub"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
