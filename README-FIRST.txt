BLUE CURRENT V35.0.2 — LIVE SERVICE MODE

BASELINE
Built from the real V35.0.1 Restaurant Opening Dashboard release.

REPLACE
- client/index.html
- client/styles.css

ADD
- client/js/modules/liveServiceMode.js

WHAT THIS RELEASE ADDS
- Nine restaurant operating modes:
  - Closed
  - Opening
  - Lunch Prep
  - Lunch Service
  - Afternoon
  - Dinner Prep
  - Dinner Rush
  - Late Night
  - Closing
- Current mode, selected mode, and suggested mode
- Time-based mode recommendation
- Persistent operating mode after refresh
- Mode-start time and elapsed timer
- Mode-specific primary focus
- Mode-specific recommended screen
- Quick navigation to the recommended screen
- Service-mode browser event for future modules
- Opening Dashboard integration after the restaurant opens

TEST
1. Copy the three files into the master project.
2. Run: npm run check
3. Run: npm start
4. Open Command Center.
5. Confirm Live Service Mode appears below the Opening Dashboard.
6. Select a different operating mode.
7. Confirm the mode.
8. Refresh and verify the selected mode remains active.
9. Click Use Suggested Mode.
10. Test Open Recommended Screen.
