BLUE CURRENT V34.2.0 — AUTHENTICATION & SESSION RELIABILITY

REPLACE
- client/index.html
- client/js/cloud/cloudApi.js
- client/js/modules/cloudFoundation.js
- client/js/modules/authOrganizations.js

ADD
- client/js/cloud/authSessionManager.js

IMPLEMENTED
- Single authentication-session coordinator
- Valid-session restoration before protected modules load
- Protected-request gate that prevents cascading unauthorized fetches
- Structured Auth, API, and Network error classification
- Session-expiration detection and one-time cleanup
- Organization, role, user, and authorized-location context persistence
- Reliable sign-in, sign-out, and token cleanup
- Auth-aware cloud bootstrap
- Auth-aware real-time event connection
- Clear Connected, Sign In Required, and Offline diagnostics
- Defensive DOM handling in the authentication panel
- Cross-module session-state events

TEST
1. Replace/add the five files.
2. Run npm run check.
3. Run npm start.
4. Open http://localhost:8787/client/.
5. With no token, confirm one sign-in overlay appears and protected endpoints do not flood the console with 401 errors.
6. Sign in with a demo account and confirm Cloud Foundation bootstraps once.
7. Refresh and confirm the session, organization, role, and location context restore.
8. Switch organizations and refresh again.
9. Log out and confirm token/context cleanup.
10. Delete or invalidate the stored token, refresh, and confirm the app returns to the sign-in gate cleanly.
