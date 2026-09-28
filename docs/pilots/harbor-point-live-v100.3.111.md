# Harbor Point live holiday pilot — configuration and release gate

Status: **HOLD** until the venue supplies and approves the items below. The fictional rehearsal at `/harbor-point.html` remains isolated. The live host workspace is `/harbor-point-live.html` and reads and writes the primary Blue Current reservation and floor records only after manager activation. Do not migrate fictional bookings or use real guest data in certification.

## Dedicated organization

Provision a new Harbor Point organization in the approved account setup process with `dedicatedForHarborPoint: true`, exactly one venue location, its approved tables, and location-scoped host and manager memberships. Do not reuse the Chefs International demo organization or any sample restaurant location. The live gate checks these records before accepting guest entry.

## Venue worksheet (awaiting manager confirmation)

- Official venue name, address, public phone, operational contact, and manager name.
- Holiday service dates: Thanksgiving November 26, 2026; Christmas Eve December 24, 2026; Christmas Day December 25, 2026; New Year's Eve December 31, 2026; New Year's Day January 1, 2027. Confirm which dates the venue will actually accept bookings before activation. The current gate requires all five dates.
- For each date: first and last seating, reservation time increment, maximum covers per time slot, and operating hours.
- Maximum party size; large-party approval rule; late-arrival grace period; cancellation, no-show, and overbooking policies.
- Table inventory with real table names, capacities, sections, accessible tables, and combine-table rules. Confirm seating-duration assumptions.
- Named manager and host accounts with location access, printer and printed-backup procedure, recovery test, device acceptance for each iPad in portrait and landscape, and escalation contact.
- Exact current Waitlist product and operational handoff. No integration is included or promised.
- Mock holiday day result and manager sign-off. Approval is recorded by the manager activation endpoint after all checks pass. Configuration edits revoke activation.

## Operating boundary

The focused live screen provides booking, search, editing, cancellation, arrival, optional waitlist, explicit table seating, completion, cleaning, and a printable reservation list. It does not send SMS, take deposits, or accept public online bookings. Slot capacity and duplicate checks are atomic. It uses the existing real reservation, floor, and service lifecycle. A manager must verify the printed-backup output and recovery procedure on the actual devices before accepting guests.

Manager configuration uses the authenticated `/api/harbor-point-live/config` endpoint and requires admin permission. It must reference an already provisioned dedicated organization, location, tables, and host accounts. The authenticated `/api/harbor-point-live/activate` endpoint requires the exact confirmation `APPROVE HARBOR POINT LIVE BOOKINGS`. Do not call it until all venue facts and physical acceptance evidence are reviewed. A configuration change clears activation.
