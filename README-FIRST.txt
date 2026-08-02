BLUE CURRENT V34.2.1 — DURABLE BOOTSTRAP & STATE HYDRATION

REPLACE
- client/index.html
- client/js/cloud/cloudApi.js
- client/js/modules/cloudFoundation.js

ADD
- client/js/cloud/bootstrapStateHydrator.js

IMPLEMENTED
- Central cloud-bootstrap state hydrator
- Authenticated organization and location context normalization
- Durable organization-scoped bootstrap cache
- Immediate cached-state restoration after refresh
- Fresh and stale cache classification
- Network refresh after cache hydration
- Single in-flight bootstrap request deduplication
- Protection against outdated bootstrap responses
- AppState hydration for organizations, locations, users, configuration, feature flags, audit logs, reservations, role, and authorized locations
- Clear Restoring, Refreshing, Connected, Sign In Required, and Offline states
- Cross-module bootstrap-hydrated events
- Manual bootstrap refresh API for future modules
- Defensive Cloud Foundation DOM rendering

TEST
1. Replace/add the four files.
2. Run npm run check.
3. Run npm start.
4. Sign in and confirm Cloud Foundation loads organization, location, users, audit, and reservations.
5. Refresh and confirm cached operating state appears immediately while the network refresh completes.
6. Confirm only one /api/bootstrap request runs during startup.
7. Switch organizations and verify a separate organization-scoped cache is used.
8. Stop the Node server after one successful sign-in and refresh; confirm the cached snapshot is marked stale rather than presented as current.
9. Restart the server and use Cloud Refresh; confirm the state returns to synchronized.
10. Log out and confirm protected cloud state becomes unavailable.
