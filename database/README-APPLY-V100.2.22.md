# V100.2.22 — Trustworthy Table Lifecycle + Predictive Availability

Apply only after V100.2.20 and V100.2.21.

```powershell
node APPLY-V100.2.22.js
npm run check
node scripts/maintenance/test-v100.2.22-host-table-trust.js
npm start
```

## Acceptance test

1. Load Host Stand and verify the page remains responsive.
2. Verify table labels are explicit: `OPEN`, `RESERVED · time`, `SEATED · Xm`, `OPEN ~Xm`, `CHECK TABLE`, or `CLEANING · Xm`.
3. Choose a ready party and press **Seat**. Only open tables that fit the party should highlight.
4. If no fitting table is open, Blue Current should show the next-likely estimates instead of opening a dead-end chooser.
5. Seat a party and confirm the table becomes `SEATED · 0m`.
6. Tap a seated table, choose **Party left**, and confirm it becomes `CLEANING`.
7. Tap the cleaning table and choose **Mark table open**. Only then should it become `OPEN`.
8. Confirm Cancel and confirmation copy are dark and readable on light cards.

The prediction is advisory. Blue Current never marks a table open solely because a timer expired.
