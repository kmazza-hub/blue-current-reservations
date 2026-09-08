# V100.2.62 — Kitchen First Priority / Exception Intelligence

Apply from the repository root:

```powershell
node APPLY-V100.2.62.js
npm run check
node scripts/maintenance/test-v100.2.62-kitchen-priority-exceptions.js
npm start
```

Priority order is deliberately restrained:

1. Ready food
2. Recovery needed (23+ minutes in Ordering without Ready)
3. Needs check (15+ minutes in Ordering without Ready)
4. Oldest on-pace handoff

Blue Current does not diagnose why a handoff is late.
