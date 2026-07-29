BLUE CURRENT V35.0.5 — WAITLIST ENGINE

BASELINE
Built from the real V35.0.4 Host Stand Dashboard release.

REPLACE
- client/index.html
- client/styles.css

ADD
- client/js/modules/waitlistEngine.js

WHAT THIS RELEASE ADDS
- Live checked-in guest waitlist
- Smart-priority, oldest-first, party-size, and best-fit sorting
- Dynamic wait-time quotes
- Longest-wait and average-quote KPIs
- Automatic best-table matching
- VIP and over-quote prioritization
- Host notes and quote adjustments
- Text Guest and Mark Ready workflows
- One-click seating
- Automatic updates to Host Stand and Live Floor Operations
- Persistent waitlist state after refresh

TEST
1. Copy the files into the master project.
2. Run: npm run check
3. Run: npm start
4. Add or check in a party at the Host Stand.
5. Confirm the party appears in Waitlist Engine.
6. Change the sort mode.
7. Adjust the quoted wait and add a note.
8. Mark the guest as texted.
9. Seat the party.
10. Confirm Host Stand and Live Floor Operations update.
11. Refresh and verify state remains.
