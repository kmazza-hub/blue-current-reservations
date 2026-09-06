# Apply Blue Current V100.3.36

Extract the ZIP into the repository root, preserving directories and replacing matching files.

Included files:

- `server/services/schedulingService.js`
- `server/services/workforceFoundationService.js`
- `server/services/timeClockService.js`
- `server/services/employeePortalService.js`
- `scripts/maintenance/test-v100.3.36-labor-record-assignment-integrity.js`
- `V100.3.36-RELEASE.md`
- `README-APPLY-V100.3.36.md`

Run `npm run check`, the V100.3.36 maintenance test, and the preceding V100.3 regression chain before starting the server.

This package does not contain or replace runtime database files.
