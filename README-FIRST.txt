BLUE CURRENT V35.0.7 — SERVICE FLOW MONITOR

BASELINE
Built from the real V35.0.6 Reservation Timeline release.

REPLACE
- client/index.html
- client/styles.css

ADD
- client/js/modules/serviceFlowMonitor.js

WHAT THIS RELEASE ADDS
- Live service progression for every occupied table
- Waiting, Drinks, Appetizers, Entrees, Dessert, and Check stages
- Stage-target timing
- Stalled-table detection
- Active table, stalled, checks-open, cycle-time, and next-turn KPIs
- Smart service-pressure indicator
- Table-level service recommendations
- Call Server workflow
- Flag Manager workflow
- Advance Stage workflow
- Persistent stage timing
- Automatic synchronization with Live Floor Operations
- Browser events for future manager and staff tools

TEST
1. Copy the files into the master project.
2. Run: npm run check
3. Run: npm start
4. Confirm Service Flow Monitor appears.
5. Select an occupied table.
6. Advance its service stage.
7. Call the server.
8. Flag the table for manager attention.
9. Confirm the table changes to Needs Attention on Live Floor Operations.
10. Refresh and confirm the service stage remains.
