# Apply V34.6.1

Copy the included files into the repository, preserving their paths. Replace existing files when prompted.

Then run:

```powershell
npm run check
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/recommendationEngine.js client/js/modules/orchestrationEngine.js client/js/modules/aiOrchestrationCenter.js V34.6.1-RELEASE.md README-APPLY-V34.6.1.md
git commit -m "V34.6.1 AI orchestration foundation"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
