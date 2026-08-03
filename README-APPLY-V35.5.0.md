# Apply Blue Current V35.5.0

Replace the four existing files and add the two new JavaScript modules and two release documents. Preserve the paths exactly.

## Replace
- `client/index.html`
- `client/styles.css`
- `client/js/appState.js`
- `client/js/app-v15.1.3.js`

## Add
- `client/js/modules/pilotReleaseEngine.js`
- `client/js/modules/pilotReleaseCenter.js`
- `V35.5.0-RELEASE.md`
- `README-APPLY-V35.5.0.md`

## Git
```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/pilotReleaseEngine.js client/js/modules/pilotReleaseCenter.js V35.5.0-RELEASE.md README-APPLY-V35.5.0.md
git commit -m "V35.5.0 pilot-ready performance platform"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
