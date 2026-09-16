# Blue Current V100.3.78

This focused release closes the defects reproduced during the authenticated V100.3.77 Render audit.

- The focused-workspace runtime now performs cleanup only. The Hospitality OS shell is the single owner of sidebar destinations, eliminating the live Service-to-Team and Guests-to-Team race.
- Command publishes certified readiness through one retained authority. System re-reads that authority whenever its workspace opens, preserving the same `HOLD`, blocker count, and health truth.
- Dynamic manager actions and the persistent startup diagnostic control now meet the 44-pixel touch-target standard after the final CSS cascade.
- Authentication, sign-out, runtime database, Render provisioning, source-truth, and all earlier certification gates remain intact.

Run `INSTALL-V100.3.78.ps1`, commit and push to `live-service-timeline`, then manually deploy the latest commit on Render.
