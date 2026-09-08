# Apply V100.1.3 Authentication Overlay Interaction & Focus Hotfix

Merge the contents of this package into the root of the existing Blue Current repository that already contains V100.1.0, V100.1.1, and V100.1.2. Preserve relative paths and replace only matching files.

This package is intentionally narrow. It does not replace the repository and does not modify database data, persistence, RBAC, or commercial certification services.

After merge, run:

```powershell
npm run check
node scripts/maintenance/test-v100.1.3-auth-overlay-interaction-focus.js
node scripts/maintenance/test-v100.1.2-command-lifecycle-api-contract.js
node scripts/maintenance/test-v100.1.1-command-auth-transport.js
node scripts/maintenance/test-v100.1-operator-shell-stabilization.js
node scripts/maintenance/test-v100.0-commercial-v1-certification.js
npm start
```

Manual acceptance path:

1. Open `http://localhost:8787`.
2. From Command, choose **Sign in** if authentication is required.
3. Confirm the login overlay is interactive and the gold **Sign in** button sends the login request.
4. Confirm successful authentication closes the auth overlay and restores Command interaction.
5. Confirm the Command access/reconnecting banner clears when the operating picture succeeds.
6. Leave Command open for at least 45 seconds and confirm the 30-second refresh does not expire the session.
7. Confirm no `aria-hidden` focused-descendant warning is emitted during the Command → login → Command focus handoff.
