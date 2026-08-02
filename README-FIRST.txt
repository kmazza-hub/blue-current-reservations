BLUE CURRENT V34.1.5 — AUTONOMY PERFORMANCE GOVERNOR

REPLACE
- client/index.html
- client/styles.css
- client/js/modules/aiBrainAutonomyGuardrails.js

ADD
- client/js/modules/autonomyPerformanceGovernor.js

ADDS
- System-wide autonomy trust band
- Domain-level autonomy scoring for staffing, kitchen, floor, demand, and recovery
- Active, supervised, and suspended domain states
- Automatic rollback recommendations
- Recommended autonomy mode, confidence floor, and maximum value
- One-click governor policy application
- Emergency stop for all automatic execution
- Estimated protected value from failed autonomous actions
- Persistent governor audit trail
- Guardrail enforcement of emergency stop and suspended domains

TEST
1. Replace/add the four files.
2. Run npm run check.
3. Run npm start.
4. Record several successful and underperforming autonomous outcomes.
5. Confirm trust band, domain states, rollback recommendations, and protected value update.
6. Apply the governor policy.
7. Confirm Autonomy Guardrails reflects the recommended mode and thresholds.
8. Activate Emergency Stop and confirm eligible recommendations become blocked.
