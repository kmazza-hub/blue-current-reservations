# Apply Blue Current V35.9.0

Replace these files:

- `client/index.html`
- `client/styles.css`
- `client/js/appState.js`
- `client/js/app-v15.1.3.js`

Add these files:

- `client/js/modules/postLaunchValueEngine.js`
- `client/js/modules/postLaunchValueCenter.js`
- `V35.9.0-RELEASE.md`
- `README-APPLY-V35.9.0.md`

Then run:

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/postLaunchValueEngine.js client/js/modules/postLaunchValueCenter.js V35.9.0-RELEASE.md README-APPLY-V35.9.0.md
git commit -m "V35.9.0 post-launch command and value realization"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
