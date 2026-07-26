BLUE CURRENT V34.0.6b — CC-007b LIVE MANAGER BRIEF

REPLACE:
- client/index.html
- client/js/modules/managerShiftBrief.js

WHAT THIS MICRO-UPDATE DOES
- Connects the Manager Shift Brief to the existing live Command Center values
- Uses today’s forecast revenue and comparison
- Uses current reservations, scheduled team, pending PTO, and projected labor
- Uses live weather condition, temperature, rain, and weather impact
- Pulls priorities from the Manager Action List
- Falls back to Needs Attention items when the Action List is still loading
- Automatically refreshes when Command Center data changes

NO CSS OR SERVER FILES CHANGE.

TEST
1. npm run check
2. npm start
3. Sign in and open Command Center
4. Confirm the Manager Shift Brief matches the cards below it
5. Complete or add an action and confirm the priority list updates
6. Refresh the brief and confirm weather/operations values stay synchronized
