BLUE CURRENT V34.1.2a — CC-013a AI OPERATIONS TIMELINE

REPLACE:
- client/index.html
- client/styles.css

ADD:
- client/js/modules/operationsTimeline.js

WHAT THIS MICRO-UPDATE ADDS
- Unified operating timeline
- Combines:
  - Restaurant Pulse
  - Predictive risk
  - Shift Risk Heatmap
  - Previous shift handoff
  - Open manager actions
  - Weather
  - Reservation demand
- Filters for All, Risk, People, and Service
- Live risk/watch styling
- Automatic refresh when underlying data changes

TEST
1. npm run check
2. npm start
3. Open Command Center
4. Confirm AI Operations Timeline appears
5. Test each filter
6. Complete or add a manager action and confirm the timeline updates
7. Change the selected heatmap hour and confirm the timeline updates
