# Apply Blue Current V34.7.0

Copy the files in this patch into the project root, preserving their paths.

## Replace

- `client/index.html`
- `client/styles.css`
- `client/js/appState.js`
- `client/js/app-v15.1.3.js`

## Add

- `client/js/modules/executiveWorkflowEngine.js`
- `client/js/modules/executiveWorkflowCenter.js`
- `V34.7.0-RELEASE.md`

## Commit

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/executiveWorkflowEngine.js client/js/modules/executiveWorkflowCenter.js V34.7.0-RELEASE.md README-APPLY-V34.7.0.md
git commit -m "V34.7.0 executive workflow engine"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
