# APPLY V60.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v60.0-operator-priority-readability.js
node scripts/maintenance/test-v59.50-product-experience-perfection.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `60.0.0`

Verify in the restaurant UI:
- primary surfaces are bright and readable
- each major section states its purpose
- low-priority tools are hidden by default
- Show tools restores specialist/configuration surfaces
- Show advanced controls restores release/certification surfaces
- keyboard focus is obvious
- inputs/placeholders remain readable in dim-room conditions

```powershell
git add -A
git commit -m "V60.0.0 operator priority and dark room readability"
git push origin live-service-timeline
```
