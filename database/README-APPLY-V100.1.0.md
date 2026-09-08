# Apply V100.1.0 Operator Shell Stabilization

Merge the contents of this ZIP into the root of the existing authoritative V100 repository, preserving relative paths and replacing only matching files.

This package is intentionally narrow. It does **not** replace the full repository and does not modify server/database files.

After merge, run:

```powershell
npm run check
node scripts/maintenance/test-v100.1-operator-shell-stabilization.js
node scripts/maintenance/test-v100.0-commercial-v1-certification.js
npm start
```

Then perform the manual operator-shell acceptance path documented in `V100.1.0-RELEASE.md`.
