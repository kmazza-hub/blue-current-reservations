# V100.2.88 — iPad Resume State Rehydration Integrity

After iPad sleep/wake, Blue Current now completes the existing resume chain in this order:

1. Verify Blue Current server.
2. Verify authenticated session.
3. Replay queued writes.
4. Refresh the existing Cloud Foundation bootstrap state.
5. Emit the completed resume lifecycle signal.

This prevents the completed-resume signal from racing ahead of shared restaurant state rehydration. No polling, reload, service worker, or new data system is introduced.

```powershell
node APPLY-V100.2.88.js
node scripts/maintenance/test-v100.2.88-ipad-resume-state-rehydration-integrity.js
node scripts/maintenance/test-v100.2.87-ipad-session-resume-integrity.js
```
