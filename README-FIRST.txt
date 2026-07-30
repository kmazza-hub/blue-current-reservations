BLUE CURRENT V34.0.11 — EXECUTIVE DECISION CENTER

BASELINE
Built from the validated V34.0.10 Live Executive Event Wall release.

REPLACE
- client/index.html
- client/styles.css

ADD
- client/js/modules/executiveDecisionCenter.js

WHAT THIS RELEASE ADDS
- Executive Decision Center inside Mission Control
- Ranked decision queue
- Immediate, Today, Monitor, and Completed filters
- Business Health Index
- Revenue protected, at risk, and recovered
- Recommendation confidence
- Revenue, guest, labor, and cost impact
- Executive notes
- Approve, dismiss, and open-source workflows
- 30, 60, and 120-minute operational forecast
- Decision timeline with recorded outcomes
- Persistent decision history after refresh

TEST
1. Replace the two files and add the new JavaScript module.
2. Run: npm run check
3. Run: npm start
4. Open Mission Control.
5. Create a floor, kitchen, or handoff incident.
6. Confirm the decision queue, health index, revenue exposure, and forecast update.
7. Select a decision, add a note, open its source, and approve it.
8. Confirm the approved decision appears in the timeline.
