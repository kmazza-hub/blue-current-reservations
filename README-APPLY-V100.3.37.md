# Apply Blue Current V100.3.37

Extract the ZIP into the repository root, preserving directories and replacing matching files.

Included files:

- `server/api/router.js`
- `server/services/schedulingService.js`
- `scripts/maintenance/test-v100.3.37-frontline-request-contract-integrity.js`
- `V100.3.37-RELEASE.md`
- `README-APPLY-V100.3.37.md`

Run `npm run check`, the V100.3.37 maintenance test, and the preceding V100.3 regression chain before starting the server.

This package does not contain or replace runtime database files.
