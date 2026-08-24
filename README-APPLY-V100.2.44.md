# Blue Current V100.2.44 — Guest Workspace Foundation

Apply from the Blue Current repository root after V100.2.43:

```powershell
node APPLY-V100.2.44.js
npm run check
node scripts/maintenance/test-v100.2.44-guest-workspace-foundation.js
npm start
```

This patch intentionally stays narrow: it upgrades the Host Stand Guests workspace without changing floor seating, reservations, waitlist, or table-layout behavior.
