# Apply V100.2.0 Consolidated Operator Shell Ownership

Forward-only repair package built from the full current V100.1.6 repository snapshot supplied during the operational audit.

Merge this package into the root of the live repository, preserving relative paths and replacing matching files.

This is not a rollback. It preserves the V100.1.x authentication, transport, overlay, lifecycle, routing, and connectivity repairs while removing conflicting legacy ownership of the Hospitality OS shell.

After merge, run:

```powershell
npm run check
node scripts/maintenance/test-v100.2.0-consolidated-operator-shell-ownership.js
node scripts/maintenance/test-v100.1-operator-shell-stabilization.js
node scripts/maintenance/test-v100.1.1-command-auth-transport.js
node scripts/maintenance/test-v100.1.2-command-lifecycle-api-contract.js
node scripts/maintenance/test-v100.1.3-auth-overlay-interaction-focus.js
node scripts/maintenance/test-v100.1.4-command-auth-state-synchronization.js
node scripts/maintenance/test-v100.1.5-command-auth-presentation-synchronization.js
node scripts/maintenance/test-v100.1.6-command-connectivity-state-reconciliation.js
node scripts/maintenance/test-v100.0-commercial-v1-certification.js
npm start
```
