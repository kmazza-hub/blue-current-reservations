BLUE CURRENT V34.0.5 — MISSION CONTROL DEPTH

BASELINE
Built from the recovered, validated V34.0.4 frontend.

REPLACE
- client/index.html
- client/styles.css
- client/js/modules/missionControl.js

WHAT THIS RELEASE ADDS
- Mission Control command wall
- Live incident count
- Tables-needing-attention count
- Kitchen handoff risk
- Manager action queue
- Stable / Watch / High Risk pressure state
- Highest-priority navigation
- Working incident-aware recommendations
- Live synchronization with Floor, Kitchen, Handoff, and occupancy data
- New incident events in the Mission Control feed

TEST
1. Replace the three files.
2. Run: npm run check
3. Run: npm start
4. Open Mission Control.
5. Confirm the command wall appears above the event feed.
6. Flag a table for manager attention.
7. Confirm incident count, action queue, recommendations, and priority navigation update.
8. Mark a kitchen ticket late or ready and verify risk changes.
