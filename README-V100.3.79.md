# Blue Current V100.3.79

This focused release closes the two defects reproduced during the authenticated V100.3.78 Render audit.

- The Hospitality OS shell now captures sidebar intent on pointerdown and retains it through a bounded 1.8-second settlement lease. The later click is deduplicated, preventing Guests from reclaiming the workspace after Team is selected.
- Command writes certified readiness into shared DOM state. System reads and observes that same authority, so `HOLD`, blocker count, and health no longer depend on module initialization timing.
- The focused-workspace layer remains cleanup-only, preserving one destination authority.
- Authentication, sign-out, touch targets, runtime database protection, Render provisioning, and all earlier certification gates remain intact.

Run `INSTALL-V100.3.79.ps1`, commit and push to `live-service-timeline`, then manually deploy the latest commit on Render.
