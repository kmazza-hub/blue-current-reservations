# V100.3.113 — Wharfside presentation

Make The Wharfside the featured illustrative venue in the application presentation and label the isolated rehearsal for the Wharfside pilot conversation. Sample portfolio selectors retain distinct Marina Grille and Wharfside entries. Sample cities and the featured emblem follow their labels.

The `/harbor-point.html` and `/harbor-point-live.html` routes remain compatible. Existing API names, organization/location IDs, activation confirmation protocol, database schema, seed, and production records are unchanged. The rehearsal's room names, holidays, 18 tables, capacities, and guest records remain fictional examples, not Wharfside inventory or approved service settings.

Wharfside's official contact page (https://www.wharfsidenj.com/contact), reviewed October 18, 2026, publishes first-come seating and no reservations. The rehearsal and setup pages make clear that any reservation exception needs restaurant approval. Display branding does not provision or activate a restaurant. Real operating views continue to use server-provided location names; neutral fallbacks avoid relabeling stored location records as Wharfside.

## Deployment

Run `npm run certify:universal` in an isolated checkout with temporary test databases. Push the verified source to `live-service-timeline`. Render automatic deployment is off: manually deploy the latest verified commit, confirm `/api/health` reports `100.3.113`, then check the application presentation and authenticated rehearsal. Never reset or copy the persistent production JSON database.

The separate `kmazza-hub/bluecurrentco` website change also needs publication through its existing hosting project. A source push alone is not proof that bluecurrentco.com has changed.
