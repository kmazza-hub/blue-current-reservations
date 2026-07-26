BLUE CURRENT V34.0.5g — CC-006f EDIT MANUAL ACTIONS

REPLACE:
- client/js/modules/actionList.js
- server/services/actionListService.js

WHAT THIS MICRO-UPDATE ADDS
- Edit button on manually created manager actions
- Managers can update title, due timing, priority, and source
- Server persistence for edited actions
- Operations Feed entry when an action is edited
- Automatic actions remain protected from manual editing

TEST
1. npm run check
2. npm start
3. Add a manual action
4. Click Edit
5. Change its title, timing, priority, or source
6. Refresh and verify the edits remain
7. Confirm automatic actions do not show Edit or Remove
8. Confirm the Operations Feed records the update
