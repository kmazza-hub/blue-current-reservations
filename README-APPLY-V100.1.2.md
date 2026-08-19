# Apply V100.1.2 Command Lifecycle & API Contract Hotfix

Merge the contents of this package into the root of the existing Blue Current repository that already contains V100.1.0 and V100.1.1. Preserve relative paths and replace only matching files.

This is a targeted P0 repair. It does not change package.json, database data, authentication cryptography, persistence adapters, RBAC policy, or the V100 Commercial V1 baseline version.

After merge, from the repository root run:

```powershell
npm run check
node scripts/maintenance/test-v100.1-operator-shell-stabilization.js
node scripts/maintenance/test-v100.1.1-command-auth-transport.js
node scripts/maintenance/test-v100.1.2-command-lifecycle-api-contract.js
node scripts/maintenance/test-v100.0-commercial-v1-certification.js
npm start
```

Manual acceptance path:

1. Open `http://localhost:8787` and hard-refresh once.
2. Sign in fresh if prompted.
3. Confirm the top Sign in/reconnecting access banner clears after successful authentication.
4. In DevTools Network > Fetch/XHR, confirm `/api/auth/me` returns 200.
5. Confirm `/api/command/operating-picture` appears and returns 200.
6. Leave Command untouched for at least 45 seconds. Confirm a subsequent operating-picture refresh occurs and the session remains authenticated.
7. Confirm Command metrics render from the operating-picture payload. Seed data may correctly identify itself as `historical-demo`; do not interpret it as live restaurant telemetry.

If any acceptance step fails, stop and capture the Network request/status before making additional changes.
