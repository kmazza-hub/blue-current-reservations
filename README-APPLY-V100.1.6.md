# Apply V100.1.6 Command Connectivity State Reconciliation Hotfix

Merge the contents of this package into the root of the existing authoritative V100.1.5 repository, preserving relative paths and replacing only matching files.

This package is intentionally narrow. It does **not** replace the full repository and does not modify database, persistence, RBAC, or server-authentication files.

After merge, run:

```powershell
npm run check
node scripts/maintenance/test-v100.1.6-command-connectivity-state-reconciliation.js
node scripts/maintenance/test-v100.1.5-command-auth-presentation-synchronization.js
node scripts/maintenance/test-v100.1.4-command-auth-state-synchronization.js
node scripts/maintenance/test-v100.1.3-auth-overlay-interaction-focus.js
node scripts/maintenance/test-v100.1.2-command-lifecycle-api-contract.js
node scripts/maintenance/test-v100.1.1-command-auth-transport.js
node scripts/maintenance/test-v100.1-operator-shell-stabilization.js
node scripts/maintenance/test-v100.0-commercial-v1-certification.js
npm start
```

Manual acceptance path:

1. Open `http://localhost:8787`.
2. Authenticate if needed.
3. Confirm the Command access banner no longer remains in `reconnecting` after authenticated bootstrap succeeds.
4. In DevTools Network, confirm `/api/command/operating-picture` is requested and returns 200.
5. Confirm Command metrics render from the operating-picture payload.
6. Wait at least 45 seconds and confirm the 30-second refresh remains healthy.
