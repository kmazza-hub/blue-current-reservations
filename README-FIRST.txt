BLUE CURRENT V35.0.8 — KITCHEN EXPO COMMAND

BASELINE
Built from the real V35.0.7 Service Flow Monitor release.

REPLACE
- client/index.html
- client/styles.css

ADD
- client/js/modules/kitchenExpoCommand.js

WHAT THIS RELEASE ADDS
- Live kitchen ticket board generated from active floor tables
- Hold, Fired, Ready, and Late views
- Station filtering
- Course targets and ticket aging
- Open, Held, Fired, Ready, and Average Age KPIs
- Kitchen pressure indicator
- Ticket-specific Blue Current recommendations
- Hold, Fire, and Mark Ready workflows
- Automatic synchronization with Live Floor Operations
- Automatic course progression when a ticket is marked Ready
- Persistent ticket state after refresh

TEST
1. Copy the files into the master project.
2. Run: npm run check
3. Run: npm start
4. Confirm Kitchen Expo Command appears.
5. Select an active ticket.
6. Test Hold, Fire, and Mark Ready.
7. Confirm filters work.
8. Mark a course Ready and confirm the related table advances in Service Flow Monitor.
9. Refresh and verify ticket state remains.
