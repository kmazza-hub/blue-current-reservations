# Blue Current V100.2.38 — Centered Table Detail + Floor Collision Polish

Apply from the repository root after V100.2.37:

```powershell
node APPLY-V100.2.38.js
npm run check
node scripts/maintenance/test-v100.2.38-floor-detail-center.js
npm start
```

Acceptance check: click an OPEN table with no active guest flow. The Selected Table card opens centered inside the floor map, with readable dark text on white, and remains dismissible by **×**, **Esc**, or empty floor space. Room maps should also look quieter, with nonessential construction-line annotations removed.
