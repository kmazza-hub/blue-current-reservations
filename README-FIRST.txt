BLUE CURRENT V34.0.8d — CC-009d APPLY SCENARIO

REPLACE:
- client/index.html
- client/styles.css
- client/js/modules/managerShiftBrief.js

WHAT THIS MICRO-UPDATE ADDS
- Action button on each operating scenario
- Protect service, Balanced move, and Aggressive savings can each become a manager action
- Selected scenario persists through the existing Action List API
- Scenario rationale is attached as a manager note
- Action List refreshes immediately
- Clear sign-in, saving, success, and error messaging

TEST
1. npm run check
2. npm start
3. Sign in and open Command Center
4. Choose one of the three operating scenarios
5. Confirm the status message appears
6. Confirm a new AI Scenario action appears in Today’s Action List
7. Open its note and confirm the scenario rationale was saved
8. Refresh and verify the action remains
