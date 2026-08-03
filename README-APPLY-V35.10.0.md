# Apply Blue Current V35.10.0

Replace these files in the repository root:

- `client/index.html`
- `client/styles.css`
- `client/js/appState.js`
- `client/js/app-v15.1.3.js`

Add:

- `client/js/modules/expansionBenchmarkEngine.js`
- `client/js/modules/expansionBenchmarkCenter.js`
- `V35.10.0-RELEASE.md`

Then run:

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/expansionBenchmarkEngine.js client/js/modules/expansionBenchmarkCenter.js V35.10.0-RELEASE.md
git commit -m "V35.10.0 expansion control and benchmarking"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
