BLUE CURRENT V34.1.2 — AI BRAIN DECISION SCENARIO SIMULATOR

REPLACE
- client/index.html
- client/styles.css
- client/js/modules/aiBrainDecisionOrchestrator.js

ADD
- client/js/modules/aiBrainScenarioSimulator.js

ADDS
- Staffing, kitchen, floor, demand, and recovery scenarios
- Conservative, balanced, and aggressive intervention strengths
- Next-shift, three-shift, and seven-day horizons
- Before-and-after operating-state comparison
- Projected portfolio score, revenue, risk reduction, effort, and success probability
- AI recommendation with owner, dependency, checkpoint, and proceed/revise decision
- Scenario history
- One-click promotion into the Decision Orchestrator
- Decision Orchestrator support for promoted scenarios

TEST
1. Replace/add the four files.
2. Run npm run check.
3. Run npm start.
4. Run multiple scenario types and strengths.
5. Confirm projected metrics and recommendation update.
6. Save a scenario and reload it from history.
7. Promote a scenario.
8. Confirm it appears in the Decision Orchestrator.
