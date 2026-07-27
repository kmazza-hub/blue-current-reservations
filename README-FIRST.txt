BLUE CURRENT V34.1.0c — CC-011c PREDICTIVE WATCHLIST

REPLACE:
- client/index.html
- client/styles.css
- client/js/modules/predictiveOperations.js

WHAT THIS MICRO-UPDATE ADDS
- Forecast Watchlist inside Predictive Operations
- Top three signals ranked by risk:
  - Guest arrival pace
  - Staffing coverage
  - Kitchen pressure
  - Labor pace
  - Weather effect
- Stable, Watch, and Risk states
- Automatic updates whenever live operating data changes

TEST
1. npm run check
2. npm start
3. Open Command Center
4. Confirm Forecast Watchlist appears
5. Verify the top three signals match current conditions
6. Refresh or change operating data
7. Confirm ranking and labels update
