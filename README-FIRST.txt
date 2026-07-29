BLUE CURRENT V35.0.3 — LIVE FLOOR OPERATIONS 2.0

BASELINE
Built from the real V35.0.2 Live Service Mode release.

REPLACE
- client/index.html
- client/styles.css

ADD
- client/js/modules/liveFloorOperationsV2.js

WHAT THIS RELEASE ADDS
- Operational dining-room floor map
- 12 working table records
- Table states:
  - Available
  - Reserved
  - Occupied
  - Needs attention
  - Blocked
- Guest count, assigned server, seated time, meal stage, and next reservation
- Occupancy, reserved, available, attention, and average-time KPIs
- Seat Party, Clear Table, and Save Table workflows
- Persistent table state after refresh
- Automatic seated-time updates
- Browser events for table updates, seating, and clearing
- Live Service Mode integration

TEST
1. Copy the three files into the master project.
2. Run: npm run check
3. Run: npm start
4. Confirm Live Floor Operations 2.0 appears.
5. Select several tables.
6. Change status and meal stage, then save.
7. Seat an available table.
8. Clear an occupied table.
9. Refresh and verify the table state remains.
10. Switch Live Service Mode to Dinner Rush and confirm the floor warning appears.
