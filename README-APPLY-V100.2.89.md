# V100.2.89 — iPad Resume Interaction Guard

Pilot-hardening wave. The live `#main` operating surface is made inert and marked busy while an authenticated iPad resume is verifying connectivity, session, queued writes, and shared restaurant state. The guard releases only after fresh shared state is confirmed. Authentication and retry controls remain outside the guarded operating surface.

```powershell
node APPLY-V100.2.89.js
node scripts/maintenance/test-v100.2.89-ipad-resume-interaction-guard.js
node scripts/maintenance/test-v100.2.88-ipad-resume-state-rehydration-integrity.js
```
