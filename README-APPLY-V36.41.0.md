# Apply Blue Current V36.41.0

Replace the four existing files and add the six module files plus this documentation.

```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/pilotEvidenceEngine.js client/js/modules/pilotEvidenceCenter.js client/js/modules/accessReadinessEngine.js client/js/modules/accessReadinessCenter.js client/js/modules/releaseCertificationEngine.js client/js/modules/releaseCertificationCenter.js V36.41.0-RELEASE.md README-APPLY-V36.41.0.md
git commit -m "V36.41 pilot certification bundle"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
