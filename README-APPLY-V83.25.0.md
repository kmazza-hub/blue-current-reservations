# APPLY V83.25.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v83.25-portfolio-exception-command-executive-escalation.js
node scripts/maintenance/test-v83.0-multi-location-portfolio-governance.js
node scripts/maintenance/test-v82.75-expansion-stabilization-early-life-support.js
node scripts/maintenance/test-v82.50-expansion-launch-certification-production-activation.js
npm run check
npm run start
```
Expected: `"version":"83.25.0"`
```powershell
git add -A
git commit -m "V83.25.0 add portfolio exception command and executive escalation"
git push origin live-service-timeline
```
