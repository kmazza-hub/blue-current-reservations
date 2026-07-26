BLUE CURRENT V34.0.5h — CC-006g ACTION OWNERSHIP

REPLACE:
- client/js/modules/actionList.js
- server/services/actionListService.js

WHAT THIS MICRO-UPDATE ADDS
- Assign or reassign any manager action
- Assigned employee/manager displayed directly on the action
- Assignment persists on the server
- Operations Feed records assignments and unassignments
- Automatic actions can be assigned, while still remaining protected from edit/delete

TEST
1. npm run check
2. npm start
3. Open the Command Center
4. Click Assign on an action
5. Enter a team member name
6. Refresh and verify the assignment remains
7. Reassign or clear the name to unassign
8. Confirm the Operations Feed records the change
