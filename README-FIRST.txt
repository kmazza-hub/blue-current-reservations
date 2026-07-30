BLUE CURRENT V34.0.8 — LIVE SHIFT COMMANDER

BASELINE
Built from the validated V34.0.7 Service Recovery Playbooks release.

REPLACE
- client/index.html
- client/styles.css

ADD
- client/js/modules/liveShiftCommander.js

WHAT THIS RELEASE ADDS
- Live Shift Commander inside Mission Control
- Dynamic command score
- Immediate, next-10-minute, and next-30-minute action counts
- AI shift briefing
- Prioritized command queue
- Open-source navigation to affected modules
- Next-90-minute operational timeline
- Shift execution goals
- Live synchronization with incidents, playbooks, floor, and kitchen state

TEST
1. Replace the two files and add the new JavaScript module.
2. Run: npm run check
3. Run: npm start
4. Open Mission Control.
5. Create an incident or start a recovery playbook.
6. Confirm the command score, briefing, queue, KPIs, and goals update.
