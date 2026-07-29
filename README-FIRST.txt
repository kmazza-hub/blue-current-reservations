BLUE CURRENT V34.1.0d — CC-011d PREDICTIVE ALERT ESCALATION

REPLACE:
- client/index.html
- client/styles.css
- client/js/modules/predictiveOperations.js

WHAT THIS MICRO-UPDATE ADDS
- Dynamic alert level:
  - Watch
  - Warning
  - Critical
- Acknowledge control
- Snooze for 30 minutes
- Browser persistence after refresh
- Automatic snooze expiration
- Visual acknowledged and snoozed states
- Existing preventive-action workflow remains unchanged

TEST
1. npm run check
2. npm start
3. Open Command Center
4. Confirm the alert level appears
5. Click Acknowledge and refresh
6. Confirm acknowledged state remains
7. Click Snooze 30 min and refresh
8. Confirm the snooze-until time remains visible
