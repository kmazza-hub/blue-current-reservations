# Blue Current V100.3.68

This forward-only hotfix closes the two defects confirmed during live V100.3.67 testing.

- Integration Control now renders visibly inside the Integrations workspace.
- Add Employee now takes reliable capture ownership and marks every empty required field with a concise inline message.
- The existing birthday-derived PIN, scheduling, PTO, time-clock, navigation, and recovery behavior is preserved.
- Installation verifies that the external runtime database is unchanged.

Run `INSTALL-V100.3.68.ps1` from the extracted update folder, then restart Blue Current and hard-refresh the browser.
