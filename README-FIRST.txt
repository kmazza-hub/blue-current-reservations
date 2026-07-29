BLUE CURRENT V35.0.4 — HOST STAND DASHBOARD

BASELINE
Built from the real V35.0.3 Live Floor Operations 2.0 release.

REPLACE
- client/index.html
- client/styles.css

ADD
- client/js/modules/hostStandDashboard.js

WHAT THIS RELEASE ADDS
- Live arrival queue
- Reservations and walk-ins
- Upcoming, checked-in, walk-in, and VIP filters
- Guest intake form
- VIP and guest notes
- Current wait-time calculation
- Arrival-pressure indicator
- Best-fit table matching using Live Floor Operations 2.0
- Check-in workflow
- One-click seating to an available table
- Automatic floor-table update after seating
- Persistent host queue after refresh

TEST
1. Copy the files into the master project.
2. Run: npm run check
3. Run: npm start
4. Confirm Host Stand Dashboard appears.
5. Add a walk-in.
6. Check in an upcoming reservation.
7. Seat a checked-in party at the suggested table.
8. Confirm the table becomes occupied in Live Floor Operations 2.0.
9. Refresh and confirm the queue and floor state remain.
