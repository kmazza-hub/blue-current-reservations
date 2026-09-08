# Apply V100.2.49 — Seated Guest Handoff

From the current Blue Current repository root, after V100.2.48:

```powershell
node APPLY-V100.2.49.js
npm run check
node scripts/maintenance/test-v100.2.49-seated-guest-handoff.js
npm start
```

Hard-refresh the Host Stand. Add/choose a waiting party, seat them, and verify that the party leaves the active waitlist while remaining available in Guests.
