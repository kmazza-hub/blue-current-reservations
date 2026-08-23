# Apply V100.2.26

From the Blue Current repository root:

```powershell
node APPLY-V100.2.26.js
npm run check
node scripts/maintenance/test-v100.2.26-host-wait-reserved-tools.js
npm start
```

Acceptance test:
1. Confirm the right rail shows one **Current wait** quote.
2. Add or remove waitlist parties and confirm the quote changes.
3. With no fitting table open, press Seat and confirm the message shows queue position + one estimate.
4. Click a reserved table. Link a guest, then either Mark arrived or Seat depending on guest state.
5. Confirm seating closes the card and updates table/count state.
6. Re-open a reserved table and use Release table; it should return to OPEN and close the card.
