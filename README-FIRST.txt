BLUE CURRENT V34.1.3a — CC-014a DISTRICT COMMAND CENTER

REPLACE:
- client/index.html
- client/styles.css

ADD:
- client/js/modules/districtCommandCenter.js

WHAT THIS MICRO-UPDATE ADDS
- Multi-location portfolio dashboard
- Portfolio health, alerts, guests, revenue, and weighted labor
- Location health score and operating status
- Sorting by:
  - Highest risk
  - Health score
  - Revenue
  - Labor
  - Active alerts
- District-wide priority banner
- Open Location drill-down event

INITIAL PILOT LOCATIONS
- Marina Grill
- Asbury Boardwalk
- Lobster Shanty

TEST
1. npm run check
2. npm start
3. Open Command Center
4. Confirm District Command Center appears
5. Test all sort options
6. Click Review priority location
7. Click Open location on each card
8. Confirm the dashboard scrolls to the single-location Command Center
