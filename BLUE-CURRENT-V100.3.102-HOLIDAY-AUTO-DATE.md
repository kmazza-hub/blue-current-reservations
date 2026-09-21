# Blue Current V100.3.102 — Holiday Auto-Date

V100.3.102 removes an unnecessary host-step from holiday reservation entry.

- Choosing Thanksgiving automatically selects the fourth Thursday in November.
- Choosing Christmas Eve, Christmas Day, New Year's Eve, or New Year's Day automatically selects its next upcoming calendar date.
- Holiday selection works in both the reservation form and reservation-book filter.
- The date remains editable for exceptions and regular-service reservations.
- V100.3.101 immediate sign-out and post-seating return behavior remains blocking.
- The complete V100.3.100 universal current-system certification remains blocking.

Run the full certification with `npm run certify:universal`.
