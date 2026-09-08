# V100.2.66 — Published Shift Attendance Exceptions

Apply from the repository root:

```powershell
node APPLY-V100.2.66.js
npm run check
node scripts/maintenance/test-v100.2.66-staff-attendance-exceptions.js
npm start
```

After a 10-minute grace period, Blue Current surfaces an assigned published shift when the scheduled employee has no matching active Time Clock record. It does not infer callout/no-show cause.
