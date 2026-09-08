# Apply V42.20.0

Replace the files included in this patch, add the six new client modules, and restart the Node server. Configure a server environment variable such as `BLUE_CURRENT_TOAST_WEBHOOK_SECRET`, bind that environment-variable name to the connector in Server Secret Binding, then send signed provider-shaped webhook payloads to the displayed webhook path.

Webhook signature format: `X-Blue-Current-Signature: sha256=<hex HMAC-SHA256 of the raw request body>`.
