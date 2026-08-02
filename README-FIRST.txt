BLUE CURRENT V34.1.7 — AUTONOMY DEPLOYMENT OBSERVATORY

REPLACE
- client/index.html
- client/styles.css
- client/js/modules/aiBrainAutonomyGuardrails.js

ADD
- client/js/modules/autonomyDeploymentObservatory.js

ADDS
- Live deployment-health score
- Weighted autonomy-exposure tracking
- Healthy, Watch, and Critical rollout states
- Deployment map by location and operating domain
- Rollout filtering
- Selected-deployment inspector
- Early-warning deployment alerts
- Portfolio deployment brief
- Pause and resume controls
- Persistent deployment-event history
- Guardrail blocking for paused rollout domains

TEST
1. Replace/add the four files.
2. Run npm run check.
3. Run npm start.
4. Create multiple rollout plans across locations and domains.
5. Record successful and underperforming outcomes.
6. Confirm health states, exposure, alerts, and portfolio brief update.
7. Pause a deployment and confirm matching bounded-autonomy actions become blocked.
8. Resume the deployment and verify the guardrail restriction clears.
9. Test filtering and Copy Deployment Brief.
