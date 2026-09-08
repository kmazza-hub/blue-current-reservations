# APPLY V84.25.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v84.25-playbook-evidence-lifecycle-continuous-validation.js
node scripts/maintenance/test-v84.0-portfolio-learning-operating-playbook-intelligence.js
npm run check
npm run start
```
Expected: `"version":"84.25.0"`
```powershell
git add -A
git commit -m "V84.25.0 add playbook evidence lifecycle and continuous validation"
git push origin live-service-timeline
```
