# Blue Current V100.2.57 — Service Completion / Table Turn Handoff

From the Blue Current repository root:

```powershell
node APPLY-V100.2.57.js
npm run check
node scripts/maintenance/test-v100.2.55-service-first-priority.js
node scripts/maintenance/test-v100.2.56-service-exception-recovery.js
node scripts/maintenance/test-v100.2.57-service-table-turn-handoff.js
npm start
```

Operator gauntlet: seat a real waitlist/reservation party at a specific table, confirm Service shows that same table, advance through Check down, then Complete service. The Service card should disappear and the same floor table should become CLEANING — never OPEN. Marking OPEN remains a separate human confirmation from the Floor lifecycle.
