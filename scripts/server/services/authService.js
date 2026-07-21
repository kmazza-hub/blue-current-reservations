
"use strict";

const crypto = require("crypto");
const models = require("../../shared/models");

const TOKEN_BYTES = 32;
const SESSION_HOURS = 12;

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
    const database = await this.database.read();
    const user = (database.users || []).find(item =>
      item.email.toLowerCase() === String(email).toLowerCase() && item.status === "active"
    );
    if (!user || !verifyPassword(password, user.passwordHash)) {
      await this.auditService.record({
        actor: email || "Unknown",
        action: "Failed login attempt",
        category: "security"
      });
      return null;
    }

    const memberships = (database.memberships || []).filter(item => item.userId === user.id);
    const membership = requestedOrganizationId
      ? memberships.find(item => item.organizationId === requestedOrganizationId)
      : memberships[0];

    if (!membership) return null;

    const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
    const session = {
      id: models.operationalEvent({}).id.replace("evt_", "ses_"),
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
      locationIds: membership.locationIds,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString()
    };

    await this.database.create("sessions", session);
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
      expiresAt: session.expiresAt
    };
  }

  async authenticate(token) {
    if (!token) return null;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const database = await this.database.read();
    const session = (database.sessions || []).find(item =>
      item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > Date.now()
    );
    if (!session) return null;

    const user = (database.users || []).find(item => item.id === session.userId);
    const membership = (database.memberships || []).find(item =>
      item.userId === session.userId && item.organizationId === session.organizationId
    );
    if (!user || !membership) return null;

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
    if (!membership) return null;

    await this.database.update("sessions", auth.session.id, {
      organizationId,
      role: membership.role,
      locationIds: membership.locationIds
    });

    return {
      organizationId,
      role: membership.role,
      locationIds: membership.locationIds
    };
  }

  async logout(token) {
    if (!token) return;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await this.database.mutate(database => {
      database.sessions = (database.sessions || []).filter(item => item.tokenHash !== tokenHash);
      return true;
    });
  }

  publicUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status
    };
  }

  can(auth, permission) {
    const rolePermissions = {
      owner: ["read", "write", "invite", "switch_org", "manage_users", "manage_settings"],
      administrator: ["read", "write", "invite", "manage_users", "manage_settings"],
      general_manager: ["read", "write", "invite"],
      host: ["read", "write_reservations"],
      kitchen_manager: ["read", "write_operations"]
    };
    return (rolePermissions[auth.membership.role] || []).includes(permission);
  }
}

module.exports = AuthService;
