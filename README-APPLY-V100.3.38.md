# Apply Blue Current V100.3.38

Extract the ZIP into the repository root, preserving directories and replacing matching files.

Included files:

- `scripts/maintenance/test-v100.3.38-operational-lifecycle-stress-certification.js`
- `V100.3.38-RELEASE.md`
- `README-APPLY-V100.3.38.md`

Run `npm run check`, then the V100.3.38 certification. The test starts and stops its own isolated server; stop the normal localhost server first to keep console output clear.

This package does not contain or replace runtime database files.
