BLUE CURRENT V34.0.6a — CC-007a MANAGER SHIFT BRIEF

REPLACE:
- client/index.html
- client/styles.css

ADD:
- client/js/modules/managerShiftBrief.js

WHAT THIS MICRO-UPDATE ADDS
- One-minute manager shift brief above the existing Command Center cards
- Today’s priority list
- Yesterday sales, guests, labor, and today weather snapshot
- Short operating narrative
- Start Shift button with local browser persistence
- Responsive desktop and mobile layout

THIS IS UI-ONLY
The values are pilot data in this first micro-story. The next stories will connect live operational data.

TEST
1. npm run check
2. npm start
3. Open the Command Center
4. Confirm the new Manager Brief appears above the existing cards
5. Click Start shift
6. Refresh and confirm the started state remains
