# Blue Current V100.3.82

This focused release removes the final primary-navigation interception reproduced during the authenticated V100.3.81 Render audit.

- The shell now captures primary pointer and keyboard-click navigation at the window boundary, before the older focused-workspace document listener can perform synchronous teardown.
- The shell stops the original navigation event, then performs focused-workspace cleanup inside its controlled next-frame activation path.
- Immediate intent, reduced visible-section cleanup, settlement recovery, and direct System readiness rendering remain intact.
- The focused-workspace layer remains cleanup-only, preserving one destination authority.
- Authentication, sign-out, touch targets, runtime database protection, Render provisioning, and all earlier certification gates remain intact.

Run `INSTALL-V100.3.82.ps1`, commit and push to `live-service-timeline`, then manually deploy the latest commit on Render.
