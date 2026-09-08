
"use strict";

const crypto = require("crypto");
const models = require("../../shared/models");

const TOKEN_BYTES = 32;
const SESSION_HOURS = Number(process.env.BLUE_CURRENT_SESSION_HOURS || 12);
const SESSION_IDLE_MINUTES = Number(process.env.BLUE_CURRENT_SESSION_IDLE_MINUTES || 120);
const SESSION_TOUCH_MINUTES = Number(process.env.BLUE_CURRENT_SESSION_TOUCH_MINUTES || 5);
const MAX_ACTIVE_SESSIONS_PER_USER = Number(process.env.BLUE_CURRENT_MAX_ACTIVE_SESSIONS || 10);
const FAILED_LOGIN_WINDOW_MINUTES = Number(process.env.BLUE_CURRENT_FAILED_LOGIN_WINDOW_MINUTES || 15);
const FAILED_LOGIN_THRESHOLD = Number(process.env.BLUE_CURRENT_FAILED_LOGIN_THRESHOLD || 5);
const LOGIN_LOCK_MINUTES = Number(process.env.BLUE_CURRENT_LOGIN_LOCK_MINUTES || 15);
const REVOKED_SESSION_RETENTION_HOURS = Number(process.env.BLUE_CURRENT_REVOKED_SESSION_RETENTION_HOURS || 168);

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, encoded) {
  const [salt, expected] = String(encoded || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === actual.length && crypto.timingSafeEqual(expectedBuffer, actual);
}

class AuthService {
  constructor(database, auditService) {
    this.database = database;
    this.auditService = auditService;
  }

  _normalizedEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  _sessionState(session, now = Date.now()) {
    if (!session) return "missing";
    if (session.revokedAt) return "revoked";
    if (new Date(session.expiresAt).getTime() <= now) return "expired";
    if (session.idleExpiresAt && new Date(session.idleExpiresAt).getTime() <= now) return "idle-expired";
    return "active";
  }

  async cleanupSessions() {
    const now = Date.now();
    const revokedCutoff = now - REVOKED_SESSION_RETENTION_HOURS * 60 * 60 * 1000;

    return this.database.mutate(database => {
      database.sessions ||= [];
      const before = database.sessions.length;
      let expired = 0;
      let revokedExpired = 0;

      database.sessions = database.sessions.filter(session => {
        const state = this._sessionState(session, now);
        if (state === "expired" || state === "idle-expired") {
          expired += 1;
          return false;
        }
        if (state === "revoked" && new Date(session.revokedAt).getTime() <= revokedCutoff) {
          revokedExpired += 1;
          return false;
        }
        return true;
      });

      return {
        version: "69.50.0",
        before,
        after: database.sessions.length,
        removed: before - database.sessions.length,
        expired,
        revokedExpired,
        cleanedAt: new Date().toISOString()
      };
    });
  }

  async _loginSecurityState(email) {
    const normalized = this._normalizedEmail(email);
    const database = await this.database.read();
    return (database.authSecurityStates || []).find(item => item.id === `auth_${normalized}`) || null;
  }

  async _recordFailedLogin(email, reason = "invalid-credentials") {
    const normalized = this._normalizedEmail(email);
    const now = Date.now();
    const windowMs = FAILED_LOGIN_WINDOW_MINUTES * 60 * 1000;
    const lockMs = LOGIN_LOCK_MINUTES * 60 * 1000;

    return this.database.mutate(database => {
      database.authSecurityStates ||= [];
      const id = `auth_${normalized}`;
      let state = database.authSecurityStates.find(item => item.id === id);
      if (!state) {
        state = {
          id,
          email: normalized,
          failures: [],
          lockedUntil: null,
          totalFailures: 0,
          createdAt: new Date().toISOString()
        };
        database.authSecurityStates.push(state);
      }

      state.failures = (state.failures || []).filter(item =>
        now - new Date(item.at).getTime() <= windowMs
      );
      state.failures.push({ at: new Date(now).toISOString(), reason });
      state.totalFailures = Number(state.totalFailures || 0) + 1;
      state.lastFailureAt = new Date(now).toISOString();

      if (state.failures.length >= FAILED_LOGIN_THRESHOLD) {
        state.lockedUntil = new Date(now + lockMs).toISOString();
        state.lastLockoutAt = new Date(now).toISOString();
      }
      state.updatedAt = new Date().toISOString();

      return {
        failuresInWindow: state.failures.length,
        lockedUntil: state.lockedUntil,
        locked: Boolean(state.lockedUntil && new Date(state.lockedUntil).getTime() > now)
      };
    });
  }

  async _clearFailedLogin(email) {
    const normalized = this._normalizedEmail(email);
    return this.database.mutate(database => {
      database.authSecurityStates ||= [];
      const state = database.authSecurityStates.find(item => item.id === `auth_${normalized}`);
      if (!state) return false;
      state.failures = [];
      state.lockedUntil = null;
      state.lastSuccessfulLoginAt = new Date().toISOString();
      state.updatedAt = state.lastSuccessfulLoginAt;
      return true;
    });
  }

  async _enforceSessionLimit(userId, preserveSessionId) {
    const now = Date.now();
    return this.database.mutate(database => {
      database.sessions ||= [];
      const active = database.sessions
        .filter(item => item.userId === userId && item.id !== preserveSessionId &&
          this._sessionState(item, now) === "active")
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

      const excess = Math.max(0, active.length - (MAX_ACTIVE_SESSIONS_PER_USER - 1));
      if (excess > 0) {
        for (const session of active.slice(-excess)) {
          session.revokedAt = new Date().toISOString();
          session.revokedReason = "concurrent-session-limit";
          session.updatedAt = session.revokedAt;
        }
      }
      return excess;
    });
  }

  async initializePasswords() {
    return this.database.mutate(database => {
      database.users ||= [];
      let changed = false;
      for (const user of database.users) {
        if (user.password && !String(user.password).includes(":")) {
          user.passwordHash = hashPassword(user.password);
          delete user.password;
          changed = true;
        }
      }
      return changed;
    });
  }

  async login(email, password, requestedOrganizationId = null) {
    const normalizedEmail = this._normalizedEmail(email);
    const security = await this._loginSecurityState(normalizedEmail);
    const now = Date.now();

    if (security?.lockedUntil && new Date(security.lockedUntil).getTime() > now) {
      await this.auditService.record({
        actor: normalizedEmail || "Unknown",
        action: "Blocked login attempt during security lockout",
        category: "security"
      });
      return null;
    }

    const database = await this.database.read();
    const user = (database.users || []).find(item =>
      this._normalizedEmail(item.email) === normalizedEmail && item.status === "active"
    );

    if (!user || !verifyPassword(password, user.passwordHash)) {
      const failed = await this._recordFailedLogin(normalizedEmail, "invalid-credentials");
      await this.auditService.record({
        actor: normalizedEmail || "Unknown",
        action: failed.locked
          ? "Failed login threshold reached; temporary lockout applied"
          : "Failed login attempt",
        category: "security"
      });
      return null;
    }

    const memberships = (database.memberships || []).filter(item => item.userId === user.id);
    const membership = requestedOrganizationId
      ? memberships.find(item => item.organizationId === requestedOrganizationId)
      : memberships[0];

    if (!membership) {
      await this._recordFailedLogin(normalizedEmail, "organization-access-denied");
      await this.auditService.record({
        actor: user.name,
        action: "Login rejected for unauthorized organization",
        category: "security"
      });
      return null;
    }

    await this._clearFailedLogin(normalizedEmail);

    const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
    const createdAt = new Date();
    const session = {
      id: models.operationalEvent({}).id.replace("evt_", "ses_"),
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
      locationIds: membership.locationIds,
      createdAt: createdAt.toISOString(),
      lastSeenAt: createdAt.toISOString(),
      idleExpiresAt: new Date(createdAt.getTime() + SESSION_IDLE_MINUTES * 60 * 1000).toISOString(),
      expiresAt: new Date(createdAt.getTime() + SESSION_HOURS * 60 * 60 * 1000).toISOString(),
      revokedAt: null,
      revokedReason: null
    };

    await this.database.create("sessions", session);
    await this._enforceSessionLimit(user.id, session.id);

    await this.auditService.record({
      organizationId: membership.organizationId,
      actor: user.name,
      action: "Signed in to Blue Current Cloud",
      category: "security"
    });

    return {
      token,
      user: this.publicUser(user),
      organizationId: membership.organizationId,
      role: membership.role,
      locationIds: membership.locationIds,
      organizations: memberships.map(item => ({
        organizationId: item.organizationId,
        role: item.role,
        locationIds: item.locationIds
      })),
      expiresAt: session.expiresAt,
      idleExpiresAt: session.idleExpiresAt
    };
  }

  async authenticate(token) {
    if (!token) return null;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const database = await this.database.read();
    const session = (database.sessions || []).find(item => item.tokenHash === tokenHash);
    if (!session || this._sessionState(session) !== "active") return null;

    const user = (database.users || []).find(item => item.id === session.userId && item.status === "active");
    const membership = (database.memberships || []).find(item =>
      item.userId === session.userId && item.organizationId === session.organizationId
    );
    if (!user || !membership) return null;

    const now = Date.now();
    const lastSeen = new Date(session.lastSeenAt || session.createdAt).getTime();
    if (now - lastSeen >= SESSION_TOUCH_MINUTES * 60 * 1000) {
      await this.database.update("sessions", session.id, {
        lastSeenAt: new Date(now).toISOString(),
        idleExpiresAt: new Date(now + SESSION_IDLE_MINUTES * 60 * 1000).toISOString(),
        role: membership.role,
        locationIds: membership.locationIds
      });
      session.lastSeenAt = new Date(now).toISOString();
      session.idleExpiresAt = new Date(now + SESSION_IDLE_MINUTES * 60 * 1000).toISOString();
    }

    return {
      session,
      user: this.publicUser(user),
      membership
    };
  }

  async switchOrganization(token, organizationId) {
    const auth = await this.authenticate(token);
    if (!auth) return null;
    const database = await this.database.read();
    const membership = (database.memberships || []).find(item =>
      item.userId === auth.user.id && item.organizationId === organizationId
    );
    if (!membership) {
      await this.auditService.record({
        organizationId: auth.membership.organizationId,
        actor: auth.user.name,
        action: `Denied organization switch to ${organizationId}`,
        category: "security"
      });
      return null;
    }

    await this.database.update("sessions", auth.session.id, {
      organizationId,
      role: membership.role,
      locationIds: membership.locationIds,
      organizationSwitchedAt: new Date().toISOString()
    });

    await this.auditService.record({
      organizationId,
      actor: auth.user.name,
      action: `Switched Blue Current organization context to ${organizationId}`,
      category: "security"
    });

    return {
      organizationId,
      role: membership.role,
      locationIds: membership.locationIds
    };
  }

  async logout(token) {
    if (!token) return false;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const database = await this.database.read();
    const session = (database.sessions || []).find(item => item.tokenHash === tokenHash);
    if (!session) return false;

    await this.database.update("sessions", session.id, {
      revokedAt: new Date().toISOString(),
      revokedReason: "user-logout"
    });
    return true;
  }

  async revokeAllUserSessions(userId, reason = "user-requested-revocation", exceptSessionId = null) {
    const revokedAt = new Date().toISOString();
    return this.database.mutate(database => {
      database.sessions ||= [];
      let revoked = 0;
      for (const session of database.sessions) {
        if (session.userId !== userId || session.id === exceptSessionId || session.revokedAt) continue;
        session.revokedAt = revokedAt;
        session.revokedReason = reason;
        session.updatedAt = revokedAt;
        revoked += 1;
      }
      return { revoked, revokedAt, reason };
    });
  }

  async revokeOrganizationUserSessions(organizationId, userId, actor = "Administrator") {
    const database = await this.database.read();
    const membership = (database.memberships || []).find(item =>
      item.organizationId === organizationId && item.userId === userId
    );
    if (!membership) return null;

    const revokedAt = new Date().toISOString();
    const result = await this.database.mutate(data => {
      data.sessions ||= [];
      let revoked = 0;
      for (const session of data.sessions) {
        if (session.userId !== userId || session.organizationId !== organizationId || session.revokedAt) continue;
        session.revokedAt = revokedAt;
        session.revokedReason = "administrator-revocation";
        session.updatedAt = revokedAt;
        revoked += 1;
      }
      return { revoked, revokedAt, organizationId, userId };
    });

    await this.auditService.record({
      organizationId,
      actor,
      action: `Revoked ${result.revoked} session(s) for user ${userId}`,
      category: "security"
    });
    return result;
  }

  async securitySnapshot(organizationId = null) {
    const database = await this.database.read();
    const now = Date.now();
    const memberships = organizationId
      ? (database.memberships || []).filter(item => item.organizationId === organizationId)
      : (database.memberships || []);
    const userIds = new Set(memberships.map(item => item.userId));
    const sessions = (database.sessions || []).filter(item =>
      !organizationId || item.organizationId === organizationId || userIds.has(item.userId)
    );
    const states = database.authSecurityStates || [];

    const countState = state => sessions.filter(item => this._sessionState(item, now) === state).length;
    return {
      version: "69.50.0",
      generatedAt: new Date().toISOString(),
      organizationId,
      policy: {
        sessionHours: SESSION_HOURS,
        idleMinutes: SESSION_IDLE_MINUTES,
        touchMinutes: SESSION_TOUCH_MINUTES,
        maxActiveSessionsPerUser: MAX_ACTIVE_SESSIONS_PER_USER,
        failedLoginWindowMinutes: FAILED_LOGIN_WINDOW_MINUTES,
        failedLoginThreshold: FAILED_LOGIN_THRESHOLD,
        loginLockMinutes: LOGIN_LOCK_MINUTES,
        revokedSessionRetentionHours: REVOKED_SESSION_RETENTION_HOURS
      },
      sessions: {
        total: sessions.length,
        active: countState("active"),
        expired: countState("expired"),
        idleExpired: countState("idle-expired"),
        revoked: countState("revoked")
      },
      loginSecurity: {
        tracked: states.length,
        currentlyLocked: states.filter(item =>
          item.lockedUntil && new Date(item.lockedUntil).getTime() > now
        ).length,
        recent: states
          .filter(item => item.lastFailureAt || item.lastLockoutAt)
          .sort((a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
          .slice(0,25)
          .map(item => ({
            email: item.email,
            failuresInWindow: (item.failures || []).length,
            totalFailures: item.totalFailures || 0,
            lastFailureAt: item.lastFailureAt || null,
            lockedUntil: item.lockedUntil || null
          }))
      }
    };
  }

  publicUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status
    };
  }

  permissionsForRole(role) {
    const rolePermissions = {
      owner: ["read", "write", "admin", "write_operations", "write_reservations", "invite", "switch_org", "manage_users", "manage_settings"],
      administrator: ["read", "write", "admin", "write_operations", "write_reservations", "invite", "manage_users", "manage_settings"],
      general_manager: ["read", "write", "write_operations", "write_reservations", "invite"],
      host: ["read", "write_reservations"],
      kitchen_manager: ["read", "write_operations"],
      staff: ["read"]
    };
    return [...(rolePermissions[role] || [])];
  }

  can(auth, permission) {
    return this.permissionsForRole(auth?.membership?.role).includes(permission);
  }
}

module.exports = AuthService;
