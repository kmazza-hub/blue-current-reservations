# Apply Blue Current V100.3.35

Extract the ZIP into the repository root, preserving directories and replacing matching files.

Included files:

- `server/services/workforceIntelligenceService.js`
- `server/services/inventoryIntelligenceService.js`
- `scripts/maintenance/test-v100.3.35-frontline-intelligence-tenant-truth.js`
- `V100.3.35-RELEASE.md`
- `README-APPLY-V100.3.35.md`

Run `npm run check`, the V100.3.35 maintenance test, and the preceding V100.3 regression chain before starting the server.

This package does not contain or replace runtime database files.
