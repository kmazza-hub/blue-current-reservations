BLUE CURRENT V34.0.5f — CC-006e REMOVE MANUAL ACTIONS

REPLACE:
- client/js/modules/actionList.js
- client/js/cloud/cloudApi.js
- server/api/router.js
- server/services/actionListService.js

WHAT THIS MICRO-UPDATE ADDS
- Remove button for manually created manager actions
- Confirmation before removal
- Server-side DELETE endpoint
- Operations Feed event when a manual action is removed
- Automatic actions cannot be deleted; resolve the underlying condition instead

TEST
1. npm run check
2. npm start
3. Add a manual action
4. Click Remove and confirm
5. Refresh and verify it stays removed
6. Confirm automatic actions have no Remove button
7. Confirm Operations Feed records the removal
