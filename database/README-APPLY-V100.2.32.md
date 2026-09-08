# Blue Current V100.2.32 — Arrived → Seating Queue Handoff

Apply from the Blue Current repository root after V100.2.31:

```powershell
node APPLY-V100.2.32.js
npm run check
node scripts/maintenance/test-v100.2.32-arrival-queue-handoff.js
npm start
```

Acceptance check: in Reservations/Arrivals, click **Mark arrived** on an Expected reservation. The guest must immediately leave Arrivals, appear exactly once in Waitlist at `0m`, retain special notes, and expose **Seat**. Seat the guest and verify they leave the queue and the selected table becomes seated.
