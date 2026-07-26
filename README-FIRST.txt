BLUE CURRENT V34.0.7c — CC-008c RECOMMENDATION EXPLAINABILITY

REPLACE:
- client/index.html
- client/styles.css
- client/js/modules/managerShiftBrief.js

WHAT THIS MICRO-UPDATE ADDS
- Why? button beneath the Blue Current recommendation
- Expandable signal panel showing the data behind the recommendation
- Signal chips for:
  - Labor
  - Reservations
  - Scheduled staff
  - Forecast versus last year
  - Weather and rain
  - Pending PTO
  - Open priorities
- Watch and risk styling for stronger signals
- Automatic updates whenever operating data changes

TEST
1. npm run check
2. npm start
3. Open Command Center
4. Click Why? beneath the Blue Current recommendation
5. Confirm the signal chips match the live dashboard
6. Refresh operating data and confirm the chips update
