# Blue Current V100.3.101 — iPad Host Return

V100.3.101 removes two delays from the live host workflow without changing reservation, waitlist, table, service, or persistence contracts.

- Sign-out opens the protected login screen immediately while the captured server session is revoked in the background.
- Background logout is bounded to 2.5 seconds and does not retry.
- Completing a seating transaction exits full-screen floor mode and returns the host to the normal main screen.
- The V100.3.100 universal current-system certification remains blocking and is extended by the V100.3.101 regression contract.

Run the complete certification with:

```powershell
npm run certify:universal
```

Certification uses disposable database copies and does not deploy or alter the live restaurant database.
