BLUE CURRENT V34.0.7a — CC-008a LIVE MANAGER RECOMMENDATION

REPLACE ONLY:
- client/js/modules/managerShiftBrief.js

WHAT THIS MICRO-UPDATE ADDS
- Dynamic Blue Current manager recommendations
- Recommendations respond to:
  - Projected labor
  - Reservation volume
  - Sales forecast versus last year
  - Weather and rain probability
  - Pending PTO
  - Open manager actions and attention items
- Dynamic confidence level
- Automatic refresh whenever operating data changes

NO HTML, CSS, SERVER, OR API FILES CHANGE.

TEST
1. npm run check
2. npm start
3. Open Command Center
4. Confirm the Blue Current recommendation is no longer static
5. Change or refresh operational data
6. Confirm the recommendation and confidence update
