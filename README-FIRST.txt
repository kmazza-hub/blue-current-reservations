BLUE CURRENT V34.0.9a — CC-010a LIVE RESTAURANT PULSE

REPLACE:
- client/index.html
- client/styles.css
- client/js/modules/managerShiftBrief.js

FEATURES
- New 'Restaurant Pulse' banner at the top of Command Center
- Overall operating health score (0-100)
- Color-coded state:
  • Calm
  • Building
  • Busy
  • Critical
- Top three live drivers (labor, reservations, kitchen, weather, staffing)
- One-click jump to the highest priority module
- Auto-refresh whenever live operational data changes

UI PATCH
1. Insert a Restaurant Pulse banner above the Executive Command Center.
2. Add pulse styles.
3. Add:
   - calculateRestaurantPulse()
   - syncRestaurantPulse()
4. Call syncRestaurantPulse() whenever dashboard state updates.

GOAL
Managers should understand the state of the restaurant in under three seconds.
