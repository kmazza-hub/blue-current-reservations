# Architecture baseline — V32.3

## Active runtime layers
1. Core helpers: safe DOM, module registry, event bus, application state.
2. Cloud layer: API client, cloud foundation, authentication.
3. Operational modules: floor, reservations, staff, kitchen, service coordination, AI brain, executive command, guest, workforce, inventory, and time clock.
4. Diagnostics: registry report and health checks.

## Retirement policy
Superseded browser modules move to `client/js/legacy/` and are not referenced by `client/index.html`. Historical server APIs remain available until an integration migration explicitly removes them.

## Module rules
- A module may start only after declared dependencies are ready.
- A missing optional view causes a documented skip, not a crash.
- Rendering code must tolerate absent DOM elements.
- Every release must pass `npm run check`.
