# Apply V100.1.4 Command Auth State Synchronization Hotfix

Merge the contents of this package into the root of the existing V100.1.3 repository, preserving relative paths and replacing matching files only.

This hotfix keeps the commercial package version at `100.0.0` and does not modify database data, persistence, RBAC, or server implementation.

After merge, run:

```powershell
npm run check
node scripts/maintenance/test-v100.1.4-command-auth-state-synchronization.js
node scripts/maintenance/test-v100.1.3-auth-overlay-interaction-focus.js
node scripts/maintenance/test-v100.1.2-command-lifecycle-api-contract.js
node scripts/maintenance/test-v100.1.1-command-auth-transport.js
node scripts/maintenance/test-v100.1-operator-shell-stabilization.js
node scripts/maintenance/test-v100.0-commercial-v1-certification.js
npm start
```

Manual acceptance:
1. Load Command with a valid authenticated session.
2. Confirm `/api/auth/me` and bootstrap are 200.
3. Confirm the top access banner and Sign in CTA disappear after auth state hydrates.
4. Confirm `/api/command/operating-picture` loads and Command renders.
5. Wait at least 45 seconds and confirm the session remains authenticated and the banner does not return.
6. Sign out or expire the session and confirm the Sign in banner returns.
