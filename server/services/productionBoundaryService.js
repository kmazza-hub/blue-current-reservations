"use strict";

class ProductionBoundaryService {
  constructor({
    maxBodyBytes = Number(process.env.BLUE_CURRENT_MAX_BODY_BYTES || 1_000_000),
    windowMs = Number(process.env.BLUE_CURRENT_RATE_WINDOW_MS || 60_000),
    apiLimit = Number(process.env.BLUE_CURRENT_RATE_LIMIT || 600),
    authLimit = Number(process.env.BLUE_CURRENT_AUTH_RATE_LIMIT || 20),
    webhookLimit = Number(process.env.BLUE_CURRENT_WEBHOOK_RATE_LIMIT || 180),
    maxTrackedKeys = 10000
  } = {}) {
    this.maxBodyBytes = maxBodyBytes;
    this.windowMs = windowMs;
    this.apiLimit = apiLimit;
    this.authLimit = authLimit;
    this.webhookLimit = webhookLimit;
    this.maxTrackedKeys = maxTrackedKeys;
    this.buckets = new Map();
    this.counters = {
      checked: 0,
      blocked: 0,
      oversized: 0,
      badContentType: 0,
      badOrigin: 0,
      badMethod: 0
    };
  }

  clientIp(request) {
    const forwarded = String(request.headers["cf-connecting-ip"] || request.headers["x-forwarded-for"] || "")
      .split(",")[0].trim();
    return forwarded || request.socket?.remoteAddress || "unknown";
  }

  routeClass(pathname) {
    if (/\/(?:login|auth\/login)$/.test(pathname) || pathname === "/api/employee-portal/login") return "auth";
    if (pathname.startsWith("/api/live/webhooks/")) return "webhook";
    return "api";
  }

  limitFor(routeClass) {
    return routeClass === "auth" ? this.authLimit :
      routeClass === "webhook" ? this.webhookLimit : this.apiLimit;
  }

  consume(request, pathname) {
    const routeClass = this.routeClass(pathname);
    const limit = this.limitFor(routeClass);
    const now = Date.now();
    const key = `${routeClass}:${this.clientIp(request)}`;
    let bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + this.windowMs, lastSeenAt: now };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;
    bucket.lastSeenAt = now;
    this.counters.checked += 1;

    if (this.buckets.size > this.maxTrackedKeys) {
      const oldest = [...this.buckets.entries()]
        .sort((a,b) => a[1].lastSeenAt - b[1].lastSeenAt)
        .slice(0, Math.max(1, this.buckets.size - this.maxTrackedKeys));
      oldest.forEach(([oldKey]) => this.buckets.delete(oldKey));
    }

    const remaining = Math.max(0, limit - bucket.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    const allowed = bucket.count <= limit;
    if (!allowed) this.counters.blocked += 1;

    return {
      allowed,
      routeClass,
      limit,
      remaining,
      resetAt: bucket.resetAt,
      retryAfterSeconds
    };
  }

  validateRequest(request, pathname) {
    const method = String(request.method || "GET").toUpperCase();
    const allowedMethods = new Set(["GET","HEAD","POST","PUT","PATCH","DELETE","OPTIONS"]);
    if (!allowedMethods.has(method)) {
      this.counters.badMethod += 1;
      return { ok: false, status: 405, code: "METHOD_NOT_ALLOWED", error: "HTTP method not allowed." };
    }

    const declaredLength = Number(request.headers["content-length"] || 0);
    if (Number.isFinite(declaredLength) && declaredLength > this.maxBodyBytes) {
      this.counters.oversized += 1;
      return {
        ok: false,
        status: 413,
        code: "PAYLOAD_TOO_LARGE",
        error: `Request body exceeds ${this.maxBodyBytes} bytes.`
      };
    }

    if (["POST","PUT","PATCH"].includes(method)) {
      const contentType = String(request.headers["content-type"] || "").toLowerCase();
      if (declaredLength > 0 && !contentType.includes("application/json")) {
        this.counters.badContentType += 1;
        return {
          ok: false,
          status: 415,
          code: "UNSUPPORTED_MEDIA_TYPE",
          error: "Blue Current API mutations require application/json."
        };
      }
    }

    return { ok: true };
  }

  corsOrigin(request) {
    const origin = String(request.headers.origin || "");
    if (!origin) return null;

    const configured = String(process.env.BLUE_CURRENT_ALLOWED_ORIGINS || "")
      .split(",").map(value => value.trim()).filter(Boolean);
    if (configured.includes(origin)) return origin;

    const mode = String(process.env.BLUE_CURRENT_ENV || process.env.NODE_ENV || "development")
      .trim().toLowerCase();

    // Production browser origins are explicit-only. Development/staging retain
    // localhost and temporary Cloudflare convenience without weakening production.
    if (mode !== "production") {
      try {
        const url = new URL(origin);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return origin;
        if (url.hostname === "bluecurrentco.com" || url.hostname.endsWith(".bluecurrentco.com")) return origin;
        if (url.hostname.endsWith(".trycloudflare.com")) return origin;
      } catch {}
    }

    this.counters.badOrigin += 1;
    return false;
  }

  securityHeaders({ api = false } = {}) {
    return {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": api ? "same-site" : "same-origin",
      "Content-Security-Policy": "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; img-src 'self' data:; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self' https: wss:",
      ...(api ? { "Cache-Control": "no-store" } : {})
    };
  }

  snapshot() {
    return {
      version: "69.0.0",
      maxBodyBytes: this.maxBodyBytes,
      windowMs: this.windowMs,
      limits: { api: this.apiLimit, auth: this.authLimit, webhook: this.webhookLimit },
      trackedBuckets: this.buckets.size,
      counters: { ...this.counters }
    };
  }
}

module.exports = ProductionBoundaryService;
