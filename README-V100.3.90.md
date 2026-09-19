# Blue Current V100.3.90 — Host Navigation Truth

This focused release closes the final Host Stand navigation-label inconsistency found during the complete host lifecycle rehearsal.

## What changed

- Synchronizes the selected Host Stand navigation item with the visible workspace heading.
- Keeps Reservations tied to the arrivals queue and Waitlist tied to the live waitlist queue.
- Reasserts the correct state after downstream render activity.
- Adds `aria-current="page"` to the selected primary Host Stand tab.
- Adds `aria-pressed` state to the queue selector.
- Leaves reservation, seating, cleaning, table, and persistence logic unchanged.

## Certification

Run:

```powershell
npm run certify:pilot
```

The V100.3.90 certification chains the complete V100.3.89 suite and verifies this patch is DOM-only, cache-busted, syntax-valid, and non-mutating.
