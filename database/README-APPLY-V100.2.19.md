# V100.2.19 — Runtime Loop Guard

Forward-only hotfix for the browser hang introduced by priority-queue DOM maintenance.

From the Blue Current repository root:

```powershell
node APPLY-V100.2.19.js
npm run check
node scripts/maintenance/test-v100.2.19-runtime-loop-guard.js
npm start
```

Acceptance test:
1. Host Stand loads and remains responsive for at least 30 seconds.
2. Floor / Reservations / Waitlist / Guests remain clickable.
3. Seat enters table selection without freezing.
4. Cancel exits cleanly.
5. Mark arrived still moves an expected reservation into the ready-to-seat queue.

This patch does not roll back V100.2.17 or V100.2.18. It makes the priority observer and queue sorting idempotent so they cannot continuously mutate each other.
