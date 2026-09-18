# Blue Current V100.3.85 — Public Website Direct Call

This corrective update targets the actual public website entry files used by `bluecurrentco.com`.

It replaces:

- `Book a private demo`
- `Schedule a private walkthrough`

with:

`Call Keith · 848-309-0042`

The new buttons use `tel:+18483090042`, so phones and tablets open the dialer directly. The installer patches both `index.html` and `client/index.html` when present, preserving the contact form, email address, application data, and runtime database.

After installation and certification, commit and push the changed files. Publish the new commit through the hosting provider connected to `bluecurrentco.com`; a Render deployment is only necessary if that domain is mapped to the Render service.
