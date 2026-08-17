# APPLY V83.50.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v83.50-portfolio-decision-ledger-accountability.js
node scripts/maintenance/test-v83.25-portfolio-exception-command-executive-escalation.js
node scripts/maintenance/test-v83.25.1-light-surface-typography-hotfix.js
node scripts/maintenance/test-v83.0-multi-location-portfolio-governance.js
npm run check
npm run start
```

Expected: `"version":"83.50.0"`

```powershell
git add -A
git commit -m "V83.50.0 add portfolio decision ledger and executive accountability"
git push origin live-service-timeline
```
