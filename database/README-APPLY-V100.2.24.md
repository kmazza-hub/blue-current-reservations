# V100.2.24 — Host Stand Scalable Service Funnel

Design rule: **Aim small, miss small.** Blue Current may know 100 things; the host should see only what changes the next decision.

Apply after V100.2.23:

```powershell
node APPLY-V100.2.24.js
npm run check
node scripts/maintenance/test-v100.2.24-host-service-funnel.js
npm start
```

Acceptance test:
1. Waitlist cards show name, party, wait, meaningful need/occasion, and Seat — no Reservation/Walk-in pill.
2. Arrivals remains readable with compact time/name/action rows.
3. Special occasions and operational needs still pop.
4. A long queue scrolls independently instead of shrinking type or stretching the entire page.
5. Floor glance mode remains unchanged.
