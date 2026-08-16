# APPLY V78.0.0

Run one command at a time:

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v77.50.1-command-auth-diagnostics-hotfix.js
node scripts/maintenance/test-v77.50-outcome-verification-closed-loop-learning.js
node scripts/maintenance/test-v78.0-intervention-effectiveness-playbook-intelligence.js

npm run check
npm run start
```

Expected health version:

`"version":"78.0.0"`

Then:

```powershell
git add -A
git commit -m "V78.0.0 add intervention effectiveness playbook intelligence"
git push origin live-service-timeline
```
