# Apply V100.2.9 — Host Stand Service-Scale Typography

Forward-only presentation patch. Apply on top of the current V100.2.8 repository state.

1. Extract this ZIP.
2. Copy the package contents into the Blue Current repository root and replace matching files.
3. Run `npm run check`.
4. Run `node scripts/maintenance/test-v100.2.9-host-stand-service-scale-typography.js`.
5. Run `node scripts/maintenance/test-v100.2.8-host-stand-contrast-hardening.js`.
6. Start Blue Current and verify Waitlist and Arrivals at the Host Stand.

No server, database, persistence, queue-state, seating, or reservation behavior is changed.
