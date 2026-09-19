# Blue Current V100.3.92 — Accessible Selected-State Continuity

This focused release closes the two accessibility gaps found during the live V100.3.91 rehearsal.

## Fix

- The selected Hospitality OS workspace now consistently exposes `aria-current="page"`.
- Host Stand Floor, Reservations, Waitlist, and Guests selection remains aligned with its visual active state.
- Waitlist and Arrivals tabs consistently expose `aria-pressed="true"` and `aria-pressed="false"`.
- State is reconciled after legacy rendering, mouse input, iPad touch, and keyboard activation.
- The patch is DOM-only and does not change reservation, guest, table, restaurant, or persistence data.
- The V100.3.91 route repair and the 100% single-iPad rehearsal remain certified.

## Certification

```powershell
npm run certify:pilot
```
