(function () {
  "use strict";

  const CACHE_PREFIX = "blueCurrentV3421Bootstrap";
  const MAX_CACHE_AGE_MS = 15 * 60 * 1000;

  function clone(value) {
    if (value === undefined || value === null || typeof value !== "object") return value;
    return structuredClone(value);
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function firstLocation(data, session) {
    const allowed = new Set(safeArray(session?.locationIds));
    return safeArray(data.locations).find(location => allowed.size === 0 || allowed.has(location.id))
      || safeArray(data.locations)[0]
      || null;
  }

  function configurationFor(data, locationId) {
    return safeArray(data.configurations).find(item => item.locationId === locationId) || null;
  }

  function cacheKey(session) {
    const organizationId = session?.organizationId || "anonymous";
    return `${CACHE_PREFIX}:${organizationId}`;
  }

  class BootstrapStateHydrator extends EventTarget {
    constructor() {
      super();
      this.lastSnapshot = null;
      this.lastHydratedAt = null;
      this.lastSource = null;
    }

    normalize(data, session) {
      const organization = safeArray(data.organizations)[0] || null;
      const selectedLocation = firstLocation(data, session);
      const selectedLocationId = selectedLocation?.id || null;
      const configuration = configurationFor(data, selectedLocationId);
      const reservations = safeArray(data.reservations);

      return {
        schemaVersion: "34.2.1",
        organization,
        organizations: safeArray(data.organizations),
        locations: safeArray(data.locations),
        users: safeArray(data.users),
        configurations: safeArray(data.configurations),
        featureFlags: safeArray(data.featureFlags),
        auditLogs: safeArray(data.auditLogs),
        reservations,
        auth: data.auth || session || null,
        selectedLocation,
        selectedLocationId,
        selectedConfiguration: configuration,
        reservationCount: reservations.length,
        userCount: safeArray(data.users).length,
        locationCount: safeArray(data.locations).length,
        auditCount: safeArray(data.auditLogs).length,
        hydratedAt: new Date().toISOString()
      };
    }

    stateChanges(snapshot) {
      return {
        cloudBootstrapReady: true,
        cloudBootstrapSource: this.lastSource,
        cloudBootstrapHydratedAt: snapshot.hydratedAt,
        cloudBootstrapSchemaVersion: snapshot.schemaVersion,
        cloudOrganization: snapshot.organization,
        cloudOrganizations: snapshot.organizations,
        cloudLocations: snapshot.locations,
        cloudUsers: snapshot.users,
        cloudConfigurations: snapshot.configurations,
        cloudFeatureFlags: snapshot.featureFlags,
        cloudAuditLogs: snapshot.auditLogs,
        cloudConfiguration: snapshot.selectedConfiguration,
        organization: snapshot.organization || undefined,
        selectedLocationId: snapshot.selectedLocationId,
        authorizedLocationIds: safeArray(snapshot.auth?.locationIds),
        activeRole: snapshot.auth?.role || null,
        reservations: snapshot.reservations,
        reservationsToday: snapshot.reservationCount
      };
    }

    hydrate(appState, data, session, options = {}) {
      const source = options.source || "network";
      const snapshot = this.normalize(data, session);
      this.lastSource = source;
      this.lastSnapshot = clone(snapshot);
      this.lastHydratedAt = snapshot.hydratedAt;

      const changes = this.stateChanges(snapshot);
      Object.keys(changes).forEach(key => {
        if (changes[key] === undefined) delete changes[key];
      });

      appState.update(changes);
      this.persist(snapshot, session);

      const detail = {
        source,
        snapshot: clone(snapshot),
        changes: clone(changes)
      };
      this.dispatchEvent(new CustomEvent("hydrated", { detail }));
      window.dispatchEvent(new CustomEvent("bluecurrent:bootstrap-hydrated", { detail }));
      return snapshot;
    }

    persist(snapshot, session) {
      try {
        localStorage.setItem(cacheKey(session), JSON.stringify({
          cachedAt: new Date().toISOString(),
          snapshot
        }));
      } catch (error) {
        console.warn("Blue Current bootstrap cache could not be written.", error);
      }
    }

    readCache(session) {
      try {
        const value = JSON.parse(localStorage.getItem(cacheKey(session)) || "null");
        if (!value?.snapshot || !value.cachedAt) return null;
        const ageMs = Date.now() - new Date(value.cachedAt).getTime();
        return {
          snapshot: value.snapshot,
          cachedAt: value.cachedAt,
          ageMs,
          fresh: ageMs <= MAX_CACHE_AGE_MS
        };
      } catch (_) {
        return null;
      }
    }

    hydrateFromCache(appState, session) {
      const cached = this.readCache(session);
      if (!cached) return null;

      this.lastSource = cached.fresh ? "cache" : "stale-cache";
      this.lastSnapshot = clone(cached.snapshot);
      this.lastHydratedAt = new Date().toISOString();

      const changes = this.stateChanges({
        ...cached.snapshot,
        hydratedAt: this.lastHydratedAt
      });
      changes.cloudBootstrapReady = cached.fresh;
      changes.cloudBootstrapStale = !cached.fresh;
      changes.cloudBootstrapCacheAgeMs = cached.ageMs;

      Object.keys(changes).forEach(key => {
        if (changes[key] === undefined) delete changes[key];
      });
      appState.update(changes);

      const detail = {
        source: this.lastSource,
        snapshot: clone(cached.snapshot),
        cachedAt: cached.cachedAt,
        ageMs: cached.ageMs,
        fresh: cached.fresh
      };
      this.dispatchEvent(new CustomEvent("cache-hydrated", { detail }));
      window.dispatchEvent(new CustomEvent("bluecurrent:bootstrap-cache-hydrated", { detail }));
      return cached;
    }

    clear(session) {
      localStorage.removeItem(cacheKey(session));
      this.lastSnapshot = null;
      this.lastHydratedAt = null;
      this.lastSource = null;
    }

    snapshot() {
      return {
        source: this.lastSource,
        hydratedAt: this.lastHydratedAt,
        data: clone(this.lastSnapshot)
      };
    }
  }

  window.BlueCurrentBootstrapHydrator = new BootstrapStateHydrator();
  window.BLUE_CURRENT_BOOTSTRAP_HYDRATOR_VERSION = "34.2.1";
})();