# Apply V100.2.10 — Table Assignment & Seating Lifecycle

Forward-only Host Stand lifecycle patch. Apply on top of V100.2.9.

1. Extract this ZIP.
2. Copy the extracted package contents into the Blue Current repository root, replacing `client/styles.css` when prompted.
3. From the repository root run: `node APPLY-V100.2.10.js`
4. Run: `npm run check`
5. Run: `node scripts/maintenance/test-v100.2.10-table-assignment-seating-lifecycle.js`
6. Run: `npm start`

Acceptance path:
- Select/assign the featured table to Anthony Russo.
- The CTA becomes `Seat Anthony at Table 14` rather than a dead `Assigned to Anthony` state.
- Click it when seating the party.
- Table 14 becomes seated/occupied.
- Anthony's Arrivals record says `Seated · Table 14`.
- The selected-table detail says Anthony is the current guest at Table 14.
- The stale assignment CTA disappears after seating.

The apply script creates a `.v100.2.10.bak` backup beside every JavaScript file it changes. No auth, server, database, RBAC, reservation creation, waitlist seating, or persistence code is changed.
