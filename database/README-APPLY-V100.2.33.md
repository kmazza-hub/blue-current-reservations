# Blue Current V100.2.33 — Neutral Table Detail Dismiss

Apply after V100.2.32 from the repository root:

```powershell
node APPLY-V100.2.33.js
npm run check
node scripts/maintenance/test-v100.2.33-neutral-table-detail-dismiss.js
npm start
```

Acceptance test: click an OPEN table with no active guest flow. The Selected Table card opens. Close it with the **×**, by clicking empty floor space, or with **Esc**. Seating/table-choice workflows remain unchanged.
