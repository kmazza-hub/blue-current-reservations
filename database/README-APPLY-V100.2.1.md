# Apply V100.2.1 — Command Presentation State Ownership

Merge the contents of this package into the root of the current Blue Current repository, preserving relative paths and replacing only matching files.

This is a forward-only repair on top of V100.2.0. It does not roll back shell ownership, authentication, connectivity, navigation, server, database, or persistence changes.

After merge, run:

```powershell
npm run check
node scripts/maintenance/test-v100.2.1-command-presentation-state-ownership.js
npm start
```

Manual acceptance:
1. Open `http://localhost:8787`.
2. Allow Command to settle for at least 15 seconds.
3. Confirm Command remains visible and dark-theme text is readable at normal contrast.
4. Confirm the quick-action rail remains visible and no legacy/light-surface styling is injected into Command.
