BLUE CURRENT V35.0.6 — RESERVATION TIMELINE

BASELINE
Built from the real V35.0.5 Waitlist Engine release.

REPLACE
- client/index.html
- client/styles.css

ADD
- client/js/modules/reservationTimeline.js

WHAT THIS RELEASE ADDS
- Lunch, dinner, and full-day reservation timelines
- 15- and 30-minute service intervals
- Reservation and cover counts by time window
- Peak-pressure detection
- Large-party and unassigned-reservation KPIs
- Live comparison against current floor capacity
- Projected wait by arrival window
- Blue Current seating recommendations
- Create Seating Plan workflow
- Host Stand shortcut
- Automatic updates after seating or table clearing
- Persistent timeline settings and seating plans

TEST
1. Copy the files into the master project.
2. Run: npm run check
3. Run: npm start
4. Confirm Reservation Timeline appears.
5. Test lunch, dinner, and full-day windows.
6. Test 15- and 30-minute intervals.
7. Select several time windows.
8. Confirm pressure, projected wait, and recommendation update.
9. Create a seating plan.
10. Seat a party or clear a table and confirm the timeline recalculates.
