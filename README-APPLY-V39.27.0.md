# Apply Blue Current V39.27.0

Replace:
- `client/index.html`
- `client/styles.css`
- `client/js/app-v15.1.3.js`
- `client/js/startup-loader.js`

Add:
- `client/js/modules/operationalAssuranceEngine.js`
- `client/js/modules/operationalAssuranceCenter.js`
- `client/js/modules/complianceReviewEngine.js`
- `client/js/modules/complianceReviewCenter.js`
- `client/js/modules/leadershipPreventionBriefEngine.js`
- `client/js/modules/leadershipPreventionBriefCenter.js`
- `V39.27.0-RELEASE.md`
- `README-APPLY-V39.27.0.md`

Restart:

```powershell
taskkill /F /IM node.exe
npm run start
```

Open:

`http://localhost:8787/?pack=operations`
