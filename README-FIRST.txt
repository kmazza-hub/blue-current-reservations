BLUE CURRENT V34.0.13.5 — PREDICTIVE DECISION LIFECYCLE

REPLACE
- client/index.html
- client/styles.css
- client/js/modules/predictiveDecisionBridge.js

ADD
- client/js/modules/predictiveDecisionLifecycle.js

USER STORY
After converting a What-If simulation into an executive decision, the simulator
shows whether that recommendation is Open, Approved, Measured, or Dismissed.

TEST
1. Replace/add the four files.
2. Run npm run check.
3. Run npm start.
4. Run a What-If simulation.
5. Create an executive decision.
6. Confirm the lifecycle strip shows Open.
7. Approve the recommendation in Executive Decision Center.
8. Confirm the lifecycle strip changes to Approved.
9. Record the result in Decision Outcome Tracker.
10. Confirm the lifecycle strip changes to Measured and shows observed value.
