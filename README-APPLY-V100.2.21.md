# Blue Current V100.2.21 — Host Stand Contrast Hardening

Forward-only presentation patch built for the recovered V100.2.20 Host Stand baseline.

From the repository root:

```powershell
node APPLY-V100.2.21.js
npm run check
node scripts/maintenance/test-v100.2.21-host-stand-contrast-hardening.js
npm start
```

Acceptance check:

1. Start a ready-to-seat guest flow.
2. Confirm **Choose a table for [guest]** is bright and readable.
3. Confirm both Cancel controls use dark readable text on a warm light background.
4. Select a highlighted available table.
5. Confirm the white seating card has dark readable label/body copy and a strong teal primary button.
6. Confirm Waitlist Seat buttons and priority/source chips remain easy to scan.

No seating state, arrival state, persistence, auth, server, or runtime-observer logic is changed.
