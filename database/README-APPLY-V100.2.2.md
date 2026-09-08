# Apply V100.2.2 — Guest Search Consistency & Readability

Forward-only merge package for the current V100.2.1 repository.

Merge the contents of this folder into the root of the existing Blue Current repository, preserving relative paths and replacing matching files only.

This package intentionally changes only the Host Stand guest-search client logic, the existing stylesheet, and adds a dedicated regression test. It does not change server authentication, database/persistence, RBAC, Command shell ownership, or API contracts.

After merge, run:

```powershell
npm run check
node scripts/maintenance/test-v100.2.2-guest-search-consistency-readability.js
npm start
```

Manual acceptance path:

1. Guests → Walk-in → add a uniquely named guest.
2. Confirm the guest appears on the live waitlist.
3. Find guest → search the same name.
4. Confirm the same guest is returned immediately and the search field is clearly readable.
5. Confirm existing reservation names (for example Anthony Russo) remain searchable.
