# Apply V34.6.5

Replace:
- `client/index.html`
- `client/styles.css`
- `client/js/appState.js`
- `client/js/app-v15.1.3.js`

Add:
- `client/js/modules/portfolioIntelligenceEngine.js`
- `client/js/modules/portfolioIntelligenceCenter.js`
- `V34.6.5-RELEASE.md`

Then commit:
```powershell
git add client/index.html client/styles.css client/js/appState.js client/js/app-v15.1.3.js client/js/modules/portfolioIntelligenceEngine.js client/js/modules/portfolioIntelligenceCenter.js V34.6.5-RELEASE.md README-APPLY-V34.6.5.md
git commit -m "V34.6.5 portfolio intelligence center"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
