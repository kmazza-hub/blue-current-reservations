# Blue Current V100.3.80

This focused release closes the two defects still reproduced during the authenticated V100.3.79 Render audit.

- Primary navigation ownership now lives on the persistent document rather than one sidebar node. Rebuilt navigation elements therefore retain the same authoritative pointer and keyboard-click path, and older downstream handlers cannot reclaim the previous workspace.
- System readiness is rendered directly by the Hospitality OS shell whenever System opens. The existing deferred System module remains synchronized, but `HOLD`, blocker count, and health no longer wait for lazy-module initialization.
- The focused-workspace layer remains cleanup-only, preserving one destination authority.
- Authentication, sign-out, touch targets, runtime database protection, Render provisioning, and all earlier certification gates remain intact.

Run `INSTALL-V100.3.80.ps1`, commit and push to `live-service-timeline`, then manually deploy the latest commit on Render.
