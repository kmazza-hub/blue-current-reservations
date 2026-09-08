# APPLY V78.50.0

Run one command at a time:

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v78.25-product-surface-consolidation.js
node scripts/maintenance/test-v78.0-intervention-effectiveness-playbook-intelligence.js
node scripts/maintenance/test-v78.50-shift-memory-contextual-playbook.js

npm run check
npm run start
```

Expected health version:

`"version":"78.50.0"`

Normal application:
`http://localhost:8787`

Developer inspection remains:
`http://localhost:8787/?advanced=1`

Then:

```powershell
git add -A
git commit -m "V78.50.0 add shift memory contextual playbook matching"
git push origin live-service-timeline
```
