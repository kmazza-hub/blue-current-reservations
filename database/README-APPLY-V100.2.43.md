# Blue Current V100.2.43

## Expected-only Reservations + Persistent Guests + Organic Collision-Safe Floor

Run from the repository root:

```powershell
node APPLY-V100.2.43.js
npm run check
node scripts/maintenance/test-v100.2.43-guest-lifecycle-organic-floor.js
npm start
```

Operational intent:

- Reservations shows guests who are still expected.
- `Add to waitlist` is the authoritative arrival handoff; after it succeeds, the reservation disappears from Reservations and exists on the live Floor queue.
- Guests who enter the operating flow are retained in a small local guest registry and remain available in the Guests workspace after their live state changes.
- The floor returns to a more natural, staggered restaurant composition while retaining direct collision-safe positioning.
