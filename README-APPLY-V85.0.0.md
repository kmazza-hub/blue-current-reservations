# APPLY V85.0.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v85.0-architecture-freeze-pilot-baseline.js
node scripts/maintenance/test-v84.75-intelligence-consolidation-architecture-rationalization.js
node scripts/maintenance/test-v84.50-learning-governance-playbook-authority.js
node scripts/maintenance/test-v84.25-playbook-evidence-lifecycle-continuous-validation.js
node scripts/maintenance/test-v84.0-portfolio-learning-operating-playbook-intelligence.js
npm run check
npm run start
```

Expected: `"version":"85.0.0"`

```powershell
git add -A
git commit -m "V85.0.0 freeze architecture and establish pilot build baseline"
git push origin live-service-timeline
```
