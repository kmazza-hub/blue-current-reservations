# Apply V100.1.5 Command Auth Presentation Synchronization Hotfix

Merge the contents of this package into the root of the existing authoritative V100.1.4 repository, preserving relative paths and replacing only matching files.

This package is intentionally narrow. It does not replace the full repository and does not modify database, persistence, RBAC, or server-authentication files.

After merge, run:

```powershell
npm run check
node scripts/maintenance/test-v100.1.5-command-auth-presentation-synchronization.js
node scripts/maintenance/test-v100.1.4-command-auth-state-synchronization.js
node scripts/maintenance/test-v100.1.3-auth-overlay-interaction-focus.js
node scripts/maintenance/test-v100.1.2-command-lifecycle-api-contract.js
node scripts/maintenance/test-v100.1.1-command-auth-transport.js
node scripts/maintenance/test-v100.1-operator-shell-stabilization.js
node scripts/maintenance/test-v100.0-commercial-v1-certification.js
npm start
```

Manual acceptance:

1. Open `http://localhost:8787`.
2. Sign in if needed.
3. Confirm the authoritative authenticated session does not coexist with a visible **Sign in** CTA.
4. If Command is reconnecting, the reconnecting banner may remain visible, but the **Sign in** CTA must stay hidden while the session coordinator reports authenticated.
5. Wait at least 45 seconds and confirm the session remains stable.
