# Blue Current V100.3.91 — Guests / Host Stand Route Continuity

This focused release repairs the live navigation regression found during the V100.3.90 deployment test.

## Fix

- Sidebar **Guests** reliably opens the Host Stand workspace.
- Command **Guests / Reservations · Waitlist · Host Stand** opens the same workspace.
- Mouse, iPad touch, click, and keyboard activation share one route.
- The route is reasserted briefly after activation so competing legacy listeners cannot return the operator to Command.
- The selected Guests control exposes `aria-current="page"`.
- V100.3.90 Reservations/Waitlist heading synchronization remains intact.
- No reservation, waitlist, table, service, or persistence data is changed.

## Certification

```powershell
npm run certify:pilot
```

The certification chains V100.3.90 and verifies the new route is DOM-only, syntax-valid, cache-busted, and loaded after the Hospitality OS shell.
