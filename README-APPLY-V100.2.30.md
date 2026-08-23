# Blue Current V100.2.30 — Waitlist Seat Button Fit

A narrow visual repair for V100.2.29. It keeps the Waitlist **Seat** action fully inside the right rail at desktop and iPad widths.

## Apply

```powershell
node APPLY-V100.2.30.js
npm run check
node scripts/maintenance/test-v100.2.30-waitlist-seat-button-fit.js
npm start
```

## Live acceptance check

1. Open Host Stand → Floor → Waitlist.
2. Confirm every **Seat** button is fully visible, including the right border/radius.
3. Scroll the waitlist and confirm the scrollbar does not cover the button.
4. Confirm Anniversary / High chair pills remain readable.

No workflow logic is changed.
