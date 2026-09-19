# Blue Current V100.3.88 — Focused Mock Trial

This release repairs the single-iPad rehearsal discovered during live verification.

- Initializes Guest Journey during the normal focused startup used by Render.
- Adds one obvious **Run single-iPad rehearsal** action to System.
- Opens and starts the eight-stage rehearsal with one tap.
- Keeps the rehearsal presentation-only with no API or browser-storage writes.
- Preserves the 44px minimum acknowledgement target.
- Chains the V100.3.87 certification suite.

Run:

```powershell
npm run certify:pilot
```
