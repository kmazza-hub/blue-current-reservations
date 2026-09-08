# APPLY V66.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v66.0-ui-system.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `66.0.0`

Browser verification:
- compare Command, Live, Floor, Staff, Kitchen, Service, AI Brain, and Executive side-by-side
- verify buttons use the same hierarchy
- verify status pills use consistent semantic treatment
- verify cards, borders, spacing, and inputs feel like one product
- verify dark Live/Service surfaces retain bright readable content
- verify desktop, tablet, and mobile layouts remain readable

```powershell
git add -A
git commit -m "V66.0.0 unify visual system and responsive consistency"
git push origin live-service-timeline
```
