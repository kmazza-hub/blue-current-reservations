# APPLY V78.25.0

Run one command at a time:

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v78.0-intervention-effectiveness-playbook-intelligence.js
node scripts/maintenance/test-v78.25-product-surface-consolidation.js

npm run check
npm run start
```

Expected health version:

`"version":"78.25.0"`

Normal product:
`http://localhost:8787`

Developer inspection of retired surfaces:
`http://localhost:8787/?advanced=1`

Commit:

```powershell
git add -A
git commit -m "V78.25.0 consolidate product surface and retire legacy UI"
git push origin live-service-timeline
```
