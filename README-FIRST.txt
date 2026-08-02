BLUE CURRENT V34.1.6 — AUTONOMY ROLLOUT MANAGER

REPLACE
- client/index.html
- client/styles.css
- client/js/modules/aiBrainAutonomyGuardrails.js

ADD
- client/js/modules/autonomyRolloutManager.js

ADDS
- Controlled autonomy rollout plans by operating domain and location
- Canary, pilot, controlled, and full-deployment exposure levels
- Minimum success-rate, value-delivery, and verified-outcome gates
- Rollout evaluation with promote, hold, and rollback decisions
- One-click exposure promotion
- One-click rollback to supervised autonomy
- Active pilot, location, domain, promotion-ready, and rollback-required KPIs
- Persistent rollout and audit history
- Guardrail enforcement requiring an active rollout plan for bounded execution

TEST
1. Replace/add the four files.
2. Run npm run check.
3. Run npm start.
4. Create a Kitchen rollout at 25% exposure.
5. Record verified Kitchen autonomous outcomes.
6. Evaluate the rollout gates.
7. Promote the rollout through 50% and 100%.
8. Test rollback and confirm Autonomy Guardrails returns to supervised mode.
9. Confirm bounded execution requires an active rollout plan for the recommendation domain.
