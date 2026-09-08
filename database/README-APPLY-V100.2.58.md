# Apply V100.2.58

From the V100.2.57 repository root:

```powershell
node APPLY-V100.2.58.js
npm run check
node scripts/maintenance/test-v100.2.55-service-first-priority.js
node scripts/maintenance/test-v100.2.56-service-exception-recovery.js
node scripts/maintenance/test-v100.2.57-service-table-turn-handoff.js
node scripts/maintenance/test-v100.2.58-completed-visit-turn-certification.js
npm start
```
