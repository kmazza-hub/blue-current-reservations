
"use strict";

class RealtimeHub {
  constructor() {
    this.clients = new Set();
  }

  add(response) {
    this.clients.add(response);
    response.write(`event: connected\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
    return () => this.clients.delete(response);
  }

  publish(type, payload) {
    const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.clients) {
      try { client.write(message); } catch (_) { this.clients.delete(client); }
    }
  }

  count() {
    return this.clients.size;
  }
}

module.exports = RealtimeHub;
