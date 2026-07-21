# Blue Current Cloud V23 API

## Public

- `GET /api/health`
- `POST /api/auth/login`

## Authenticated

- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/switch-organization`
- `GET /api/bootstrap`
- `GET /api/reservations`
- `POST /api/reservations`
- `GET /api/audit`
- `POST /api/audit`
- `GET /api/invitations`
- `POST /api/invitations`
- `PATCH /api/configurations/:id`
- `GET /api/events`

Protected endpoints require:

`Authorization: Bearer <session-token>`

V23 scopes database results to the authenticated organization and authorized locations.
