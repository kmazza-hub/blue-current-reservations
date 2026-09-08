# Apply Blue Current V35.4.0

1. Close the local development server.
2. Copy the files in this patch into the repository root, preserving their paths.
3. Replace files when Windows asks.
4. Restart the application and open the Restaurant AI / intelligence experience.
5. Confirm the **Learning & Pilot Hardening** center appears after Portfolio Performance.
6. Commit and push:

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/restaurantPerformanceEngine.js client/js/modules/performanceLearningEngine.js client/js/modules/performanceLearningCenter.js V35.4.0-RELEASE.md README-APPLY-V35.4.0.md
git commit -m "V35.4.0 learning calibration and pilot hardening"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```

Do not copy the enclosing patch folder into the repository. Copy its contents while preserving the listed paths.
