BLUE CURRENT V34.0.6c — CC-007c PREVIOUS SHIFT HANDOFF

REPLACE:
- client/index.html
- client/styles.css
- client/js/modules/managerShiftBrief.js

WHAT THIS MICRO-UPDATE ADDS
- Previous Shift section inside the Manager Shift Brief
- Live handoff manager/time metadata
- Live handoff summary
- Highlight chips pulled from the existing handoff
- Needs-attention warning pulled from the existing handoff
- Automatic updates whenever the underlying handoff changes

TEST
1. npm run check
2. npm start
3. Open Command Center
4. Confirm Previous Shift appears inside the Manager Brief
5. Post a new handoff
6. Confirm the brief updates without reloading
7. Refresh and confirm the latest handoff remains visible
