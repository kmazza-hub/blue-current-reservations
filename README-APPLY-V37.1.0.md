# Apply V37.1.0

Copy the files in this patch into the repository root, preserving paths.

Then run:

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/dataContractEngine.js client/js/modules/dataContractCenter.js client/js/modules/connectorSyncEngine.js client/js/modules/connectorSyncCenter.js client/js/modules/reconciliationEngine.js client/js/modules/reconciliationCenter.js V37.1.0-RELEASE.md README-APPLY-V37.1.0.md
git commit -m "V37.1 live data contracts and reconciliation"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
