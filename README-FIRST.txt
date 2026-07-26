BLUE CURRENT V34.0.5i — CC-006h ACTION NOTES

REPLACE:
- client/js/modules/actionList.js
- server/services/actionListService.js

WHAT THIS MICRO-UPDATE ADDS
- Add Note / Edit Note button on every manager action
- Notes display directly under the action details
- Notes persist on the server
- Operations Feed records note additions and removals
- Notes work on both manual and automatic actions

TEST
1. npm run check
2. npm start
3. Open the Command Center
4. Add a note to an action
5. Refresh and verify the note remains
6. Edit the note
7. Clear the note and confirm it is removed
8. Confirm the Operations Feed records the change
