# Apply V100.1.1 Command Auth Transport Hotfix

Prerequisite: the V100.1.0 Operator Shell Stabilization package must already be merged into the authoritative V100 repository.

Merge the contents of this package into the root of the existing Blue Current repository, preserving relative paths and replacing only matching files.

This hotfix is intentionally narrow. It does **not** modify server, database, persistence, RBAC, or commercial certification files.

After merge, run:

```powershell
npm run check
node scripts/maintenance/test-v100.1-operator-shell-stabilization.js
node scripts/maintenance/test-v100.1.1-command-auth-transport.js
node scripts/maintenance/test-v100.0-commercial-v1-certification.js
npm start
```

Then hard-refresh `http://localhost:8787`, sign in, remain on Command for at least 45 seconds, and confirm the session stays authenticated through the 30-second operating-picture refresh.
