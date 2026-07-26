BLUE CURRENT V34.0.5e — CC-006d MANUAL MANAGER ACTIONS

REPLACE:
- client/index.html
- client/styles.css
- client/js/modules/actionList.js
- client/js/cloud/cloudApi.js
- server/api/router.js
- server/services/actionListService.js

IMPORTANT
This index.html includes BOTH:
- The Manager Action List UI from V34.0.5a
- The duplicate Command Center navigation fix from V34.0.5c

WHAT THIS MICRO-UPDATE ADDS
- Add Action button
- Action composer with title, source, priority, and due field
- Server persistence for manually created actions
- Operations Feed event when a manager creates an action
- Local fallback when the API is unavailable

TEST
1. npm run check
2. npm start
3. Sign in and open Command Center
4. Confirm only one Command Center navigation item appears
5. Click Add action
6. Create a task
7. Refresh the page and confirm it remains
8. Confirm Operations Feed shows the creation event
