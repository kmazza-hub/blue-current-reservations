# Blue Current V100.3.74 — Visible Sign-Out and Session Control

This forward-only release makes secure sign-out a first-class part of the Hospitality OS shell.

- Adds an always-visible **Sign out** control to the desktop application rail.
- Keeps **Sign out** available on iPad and narrow screens without hiding it in the scrolling workspace navigation.
- Displays the authenticated user in the desktop account area.
- Calls the protected logout API to revoke the server session.
- Clears the shared session coordinator and all authenticated application scope.
- Returns directly to the protected Blue Current login screen with confirmation.
- Prevents duplicate logout submissions while the request is running.
- Preserves the Render persistent database and all V100.3.73 runtime-marker protections.

## Install

Run `INSTALL-V100.3.74.ps1` from the extracted update folder. The installer requires certified V100.3.73, validates the source, runs the full pilot certification chain, and confirms that the runtime database hash is unchanged.

After installation, commit and push the certified files, then manually deploy the latest commit on Render.
