BLUE CURRENT V34.0.5d — CC-006c AUTOMATIC ACTION GENERATION

REPLACE ONLY:
- server/services/actionListService.js

WHAT CHANGED
The Manager Action List now generates tasks from live operating conditions:

- Pending PTO requests
- Inventory items at or below 60% of par
- Open maintenance tickets
- Missing or stale shift handoffs

AUTOMATIC RESOLUTION
When the underlying condition is resolved, Blue Current automatically marks the related action complete.

IMPORTANT
- Existing manager completion choices are preserved while a condition remains active.
- No client, HTML, CSS, router, or database-schema files change.
- This update builds directly on V34.0.5b.

TEST
1. Replace server/services/actionListService.js
2. Run npm run check
3. Run npm start
4. Sign in and open Command Center
5. Confirm live tasks appear from current operating data
6. Resolve a source condition and refresh the Action List
7. Confirm the corresponding task auto-resolves
