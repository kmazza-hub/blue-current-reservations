# Blue Current V100.3.71 — Render Pilot Provisioning Gate

This forward-only infrastructure wave prepares the first permanent Render pilot origin.

- Adds a Render Blueprint for one Docker web service in Virginia.
- Attaches a 1 GB persistent disk at `/var/lib/blue-current`.
- Disables automatic deploys and fixes the service at one instance.
- Adds a locked first-deploy provisioning mode so an empty disk can become healthy without exposing the application.
- Refuses normal production startup until the certified database exists and parses successfully.
- Preserves V100.3.70 application behavior and does not package the runtime database or secrets.

Installing this update prepares the repository. It does not create a Render service, transfer data, spend money, or change DNS.
