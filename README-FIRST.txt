BLUE CURRENT V34.0.13.4 — PREDICTIVE DECISION BRIDGE

BASELINE
Built directly from your recovered V34.0.13.3 Git commit 630d11d.

REPLACE
- client/index.html
- client/styles.css
- client/js/modules/whatIfSimulator.js

ADD
- client/js/modules/predictiveDecisionBridge.js

USER STORY
As an executive, I can convert a completed What-If simulation into a real
Executive Decision Center recommendation so the simulated response can be
reviewed, noted, approved, and measured.

TEST
1. Replace/add the four files.
2. Run npm run check.
3. Run npm start.
4. Open What-If Simulator and run a scenario.
5. Click Create Executive Decision.
6. Confirm the page scrolls to Executive Decision Center.
7. Confirm the new recommendation appears with urgency, confidence,
   revenue impact, guest impact, labor impact, and simulation rationale.
