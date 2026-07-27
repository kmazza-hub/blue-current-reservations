BLUE CURRENT V34.1.0b — CC-011b PREVENTIVE FORECAST ACTIONS

REPLACE:
- client/index.html
- client/styles.css
- client/js/modules/predictiveOperations.js

WHAT THIS MICRO-UPDATE ADDS
- Expected time-to-risk estimate
- Live signal chips explaining the predicted risk
- Create Preventive Action button
- Predictive risk converted into a persisted manager action
- Forecast rationale attached as a manager note
- Action List refresh event
- Saving, sign-in, success, and error messages

TEST
1. npm run check
2. npm start
3. Sign in and open Command Center
4. Confirm ETA and risk signals appear
5. Click Create preventive action
6. Confirm the new Predictive Operations action appears
7. Confirm the rationale note is attached
8. Refresh and verify the action remains
