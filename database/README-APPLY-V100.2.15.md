# Blue Current V100.2.15 — Host Stand Readability + Guided Waitlist Seating

Forward-only refinement from V100.2.14.

## Apply
Copy this package into the Blue Current repository root, then run:

```powershell
node APPLY-V100.2.15.js
npm run check
node scripts/maintenance/test-v100.2.15-host-stand-readability-guided-seating.js
npm start
```

## Acceptance test
1. Open Host Stand → Waitlist.
2. Confirm names, party details, times, tabs, and action buttons are easy to scan.
3. Click **Seat** for Sarah/Mark/Priya. The guest must **not** become seated immediately.
4. Blue Current returns to Floor and says **Choose a table for [guest]**.
5. Available/cleaning tables are highlighted; occupied/reserved tables are visually de-emphasized.
6. Tap an available table, then confirm **Seat [guest] at Table X**.
7. Only after confirmation: guest leaves Waitlist, Table X becomes Seated, counts update, and a success message appears.
8. Test Anthony: select an available table and **Reserve Table X for Anthony**. The table detail card should collapse immediately after the hold succeeds.

No server/database/auth changes are included.
