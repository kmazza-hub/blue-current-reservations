# Blue Current V100.3.61 — Staff Coverage Operational Parity

V100.3.61 repairs the focused Staff Coverage workflow. Staffing modules now adopt the authenticated browser session after sign-in instead of retaining an empty startup token. The focused staffing surface provides large iPad actions for Employees/Availability/PTO, Schedule/Publish, and Time Clock/Corrections, while retaining the existing authoritative APIs and permission checks.

The recorded schedule view now includes an explicit Edit Schedule action that opens the existing shift editor and manager publication controls. No synthetic staffing data is introduced. Runtime data, backups, reservations, floor service, and authentication policy are unchanged.

## Install

Stop Node, extract the update, then run `INSTALL-V100.3.61.ps1` from PowerShell. The installer preserves and hashes the external runtime database before and after certification.

## iPad acceptance

Sign in as a manager, open Staff Coverage, and verify:

1. Live staff truth loads without an Authentication required message.
2. Employees opens Add Employee, availability, PTO, PTO approval, and shift templates.
3. Schedule opens recorded shifts; Edit Schedule exposes Add Shift and Publish Week.
4. Time Clock exposes clock in/out, breaks, timecards, and manager correction.
5. Returning to Staff Coverage refreshes the latest live truth.
6. A reconnecting `/api/events` stream does not remove or disable these controls.

## Git checkpoint

Stage only the twelve files delivered by this update, run `git diff --cached --check`, commit as `Complete V100.3.61 staff coverage operational parity`, tag `v100.3.61-certified`, and push the branch and tag after live acceptance.
