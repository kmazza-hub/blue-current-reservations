# Apply Blue Current V35.14.0

Replace these files in the repository root:

- `client/index.html`
- `client/styles.css`
- `client/js/appState.js`
- `client/js/app-v15.1.3.js`

Add:

- `client/js/modules/costVarianceEngine.js`
- `client/js/modules/costVarianceCenter.js`
- `V35.14.0-RELEASE.md`

Then run:

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/costVarianceEngine.js client/js/modules/costVarianceCenter.js V35.14.0-RELEASE.md README-APPLY-V35.14.0.md
git commit -m "V35.14.0 cost variance and profit protection"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
