# Apply V100.2.56

From the Blue Current repository root:

```powershell
node APPLY-V100.2.56.js
npm run check
node scripts/maintenance/test-v100.2.55-service-first-priority.js
node scripts/maintenance/test-v100.2.56-service-exception-recovery.js
npm start
```

Then hard refresh and open **Service · Run floor**.

Expected behavior:

- Normal service remains **Service on pace**.
- A table that crosses its normal stage threshold remains **Needs attention**.
- A table that reaches 1.5× its stage pace escalates to **Recovery needed**.
- First Priority explains the known lifecycle exception and gives one next action.
- Blue Current does not claim a kitchen/server/root cause it cannot actually observe.
- Host Stand / Floor presentation must remain unchanged.
