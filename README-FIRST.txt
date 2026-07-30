BLUE CURRENT V34.0.14.1 — EXECUTIVE SESSION PLAYBACK

REPLACE
- client/index.html
- client/styles.css

ADD
- client/js/modules/executiveSessionPlayback.js

USER STORY
As an executive, I can replay the retained operating timeline step by step and see
what decisions, outcomes, critical events, and session score were visible at each point.

TEST
1. Replace/add the three files.
2. Run npm run check.
3. Run npm start.
4. Create timeline history through incidents, decisions, outcomes, or maintenance plans.
5. Open Executive Intelligence Timeline.
6. Test Start, Pause, Reset, speed control, and manual range selection.
7. Confirm timeline events appear progressively and snapshot KPIs update.
