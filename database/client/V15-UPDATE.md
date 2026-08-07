# Blue Current V15 — Shared Application State

This version keeps the V14 interface and moves the runtime to modular JavaScript.

Load order:
1. Event Bus
2. App State
3. Motion Engine
4. Timeline
5. Concierge, Digital Twin, and Executive modules
6. App bootstrap

The `reservation:confirmed` event is the synchronization point. It commits the reservation, guest, table, occupancy, and executive metrics to App State in one update. Existing visual modules then react to compatibility events emitted from that committed state.

`script.legacy.js` is retained only as a backup and is not loaded by `index.html`.
