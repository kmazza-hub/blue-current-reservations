# Apply V36.38.0

Copy the included files into the repository root, preserving paths.

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/operatorWorkspaceEngine.js client/js/modules/operatorWorkspaceCenter.js client/js/modules/runtimeRecoveryEngine.js client/js/modules/runtimeRecoveryCenter.js client/js/modules/pilotLaunchEngine.js client/js/modules/pilotLaunchCenter.js V36.38.0-RELEASE.md README-APPLY-V36.38.0.md
git commit -m "V36.38 operator workspace resilience and pilot launch"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
