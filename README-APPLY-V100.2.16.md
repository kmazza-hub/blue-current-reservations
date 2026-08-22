# V100.2.16 — Generic Guest Action Context + Host Stand Contrast Polish

Apply from the Blue Current repository root **after V100.2.15**.

```powershell
node APPLY-V100.2.16.js
npm run check
node scripts/maintenance/test-v100.2.16-generic-guest-action-context.js
npm start
```

## Acceptance test

1. Open **Reservations** and tap/click any guest row or **View details**.
2. Confirm the same simple guest detail surface opens for Melissa, Anthony, Daniel, Alyssa, and a newly added reservation such as Audit Test.
3. For an **Expected** reservation, use **Mark arrived**.
4. Once **Arrived**, choose **Seat guest** → choose a highlighted table → confirm seating.
5. Confirm Arrivals/status and the chosen table both show the same guest/table.
6. For an Expected guest, test **Reserve a table** and confirm the action closes after the hold is created.
7. Click a floor table with no active guest. It must show neutral table information and must **not** inject Anthony Russo.
8. Verify Waitlist **Seat → choose table → confirm** still works.
9. Verify Cancel buttons and the white seating card are easy to read.
