# Blue Current V100.3.62 — Focused Staff Action Runtime

V100.3.62 is a cumulative update from V100.3.60. It includes the V100.3.61 authentication and Staff Coverage navigation repairs, then closes the remaining focused-startup defect: the employee and schedule forms could render while their JavaScript modules were intentionally deferred, leaving buttons without handlers.

The Staff runtime now loads the existing Workforce Foundation and Scheduling factories before starting a small focused-mode bridge. That bridge shares the authenticated Cloud API authority, initializes each module exactly once, and refreshes it after sign-in. Full-platform startup continues using its existing initialization path.

Covered actions: add employee, availability, PTO request and manager decision, shift template, add/edit/delete/copy/publish schedule, Time Clock clock-in/out, breaks, and manager corrections. Existing server authentication, organization/location isolation, and write permissions remain authoritative.

After installation and restart, confirm the page meta reports V100.3.62. Sign in as manager and run each Staff operation using pilot test data. A successful write must immediately appear in its list and survive a page refresh.
