# APPLY V84.0.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v84.0-portfolio-learning-operating-playbook-intelligence.js
node scripts/maintenance/test-v83.75-executive-decision-outcome-intelligence.js
node scripts/maintenance/test-v83.50-portfolio-decision-ledger-accountability.js
node scripts/maintenance/test-v83.25-portfolio-exception-command-executive-escalation.js
node scripts/maintenance/test-v83.25.1-light-surface-typography-hotfix.js
node scripts/maintenance/test-v83.0-multi-location-portfolio-governance.js
npm run check
npm run start
```

Expected: `"version":"84.0.0"`

```powershell
git add -A
git commit -m "V84.0.0 add portfolio learning and operating playbook intelligence"
git push origin live-service-timeline
```
