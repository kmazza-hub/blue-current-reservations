# Blue Current V100.3.66 — Staff Reliability

This forward-only update converts the live QA failures into protected staff workflows.

## Included

- Birthday is required during employee setup.
- The clock PIN is automatically created as `DDMM` and remains editable for duplicate birthdays.
- Duplicate PIN errors appear directly beside the PIN field.
- PTO and shift-template forms validate before calling the server.
- Staff write buttons display progress and block accidental double submissions.
- Employee termination uses an in-app manager dialog instead of `window.prompt`.
- Timecard correction uses an in-app manager dialog with an explicit clock-out field for missed punches.
- Timecards show both the date and time so overnight records are unambiguous.
- Employee birthdays persist with the staff record.
- Managers can change a duplicate PIN in a validated in-app dialog.
- Scheduling refreshes after employee, availability, and PTO changes.
- The Team quick bar opens the schedule builder directly.

## Install

Stop Blue Current, extract the update, then run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
& ".\INSTALL-V100.3.66.ps1"
```

The installer requires certified V100.3.65 and verifies that the external runtime database does not change during installation.
