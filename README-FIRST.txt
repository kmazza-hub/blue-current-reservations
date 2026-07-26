BLUE CURRENT V34.0.8e — CC-009e ACTIVE DECISION TRACKER

REPLACE:
- client/index.html
- client/styles.css
- client/js/modules/managerShiftBrief.js

WHAT THIS MICRO-UPDATE ADDS
- Active Decision card after a scenario is applied
- Tracks:
  - Selected scenario
  - Expected savings
  - Expected guest wait impact
  - Review point
  - Time since the decision was started
- Local persistence after browser refresh
- Review Now shortcut to the shift-close timeline checkpoint
- Clear Decision control

TEST
1. npm run check
2. npm start
3. Sign in and choose a scenario
4. Confirm the Active Decision card appears
5. Refresh and verify it remains
6. Click Review now
7. Click Clear decision and confirm the card disappears
