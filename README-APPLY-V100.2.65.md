# V100.2.65 — Published Schedule → Live Role Coverage

Apply from the repository root:

```powershell
node APPLY-V100.2.65.js
npm run check
node scripts/maintenance/test-v100.2.65-staff-role-coverage.js
npm start
```

Coverage is certified only when the current schedule is published. Blue Current compares roles on shifts active right now against clocked-in employees who are not on break.
