BLUE CURRENT V34.0.4 — CC-005 OPERATIONS FEED

Replace the matching files in your current master project and add the two new files.

CHANGED
- client/index.html
- client/styles.css
- client/js/cloud/cloudApi.js
- client/js/modules/commandCenter.js
- server/api/router.js
- server/server.js
- server/services/commandCenterService.js
- package.json

NEW
- server/services/operationsFeedService.js
- V34.0.4-CC005-RELEASE-NOTES.md

TEST
1. Run: npm run check
2. Run: npm start
3. Sign in and open Command Center.
4. Confirm Operations Feed loads newest activity first.
5. Test every category filter.
6. Post and acknowledge a shift handoff; confirm both appear in the feed after refresh.
