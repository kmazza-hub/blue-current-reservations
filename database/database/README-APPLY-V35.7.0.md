# Apply Blue Current V35.7.0

Copy the patch files into the project root while preserving paths.

## Replace

- `client/index.html`
- `client/styles.css`
- `client/js/appState.js`
- `client/js/app-v15.1.3.js`

## Add

- `client/js/modules/pilotReviewEngine.js`
- `client/js/modules/pilotReviewCenter.js`
- `V35.7.0-RELEASE.md`
- `README-APPLY-V35.7.0.md`

## Commit

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/pilotReviewEngine.js client/js/modules/pilotReviewCenter.js V35.7.0-RELEASE.md README-APPLY-V35.7.0.md
git commit -m "V35.7.0 pilot review and rollout decision"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
