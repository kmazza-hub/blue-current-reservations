# Blue Current V100.3.87 — Single-iPad Mock Trial

This release closes the defects found during the first live single-iPad rehearsal.

- Loads the existing eight-stage Guest Journey module before application startup.
- Keeps the rehearsal presentation-only: it performs no API or browser-storage writes.
- Reconciles named Command reservation signals into Host Stand guest search.
- Labels the rehearsal as a single-iPad sandbox with explicit no-persistence copy.
- Raises the remaining "Got it" control to the 44px interaction minimum.
- Adds a deployment certification that chains the V100.3.86 launch-hardening suite.

Run:

```powershell
npm run certify:pilot
```
