BLUE CURRENT V34.0.5c — NAVIGATION MICRO-FIX

REPLACE:
- client/index.html

CHANGES:
- Removed the duplicate Command Center navigation link.
- Added aria-current="page" to the remaining Command Center link.
- Updated the client build marker to 34.0.5c.

TEST:
1. Replace client/index.html
2. Restart the app if needed
3. Hard-refresh with Ctrl + F5
4. Confirm only one Command Center tab appears
