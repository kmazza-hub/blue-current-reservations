# Apply V100.1.7
Copy the contents of this package over the current V100.1.6 repository, preserving paths and replacing files when prompted.

Then run:

```powershell
npm run check
node scripts/maintenance/test-v100.1.7-command-shell-visibility-ownership.js
```

Start Blue Current with `npm start`, hard-refresh once, and verify Command remains visible beyond startup/deferred-script activation.
