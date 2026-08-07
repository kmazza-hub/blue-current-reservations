/**
 * Blue Current Event Bus
 *
 * Allows independent modules to publish and subscribe to shared
 * application events without depending on one another.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, callback) {
    this.#validateSubscription(eventName, callback);

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    this.listeners.get(eventName).add(callback);
    return () => this.off(eventName, callback);
  }

  once(eventName, callback) {
    this.#validateSubscription(eventName, callback);

    const unsubscribe = this.on(eventName, (payload) => {
      unsubscribe();
      callback(payload);
    });

    return unsubscribe;
  }

  off(eventName, callback) {
    const eventListeners = this.listeners.get(eventName);
    if (!eventListeners) return false;

    const removed = eventListeners.delete(callback);
    if (eventListeners.size === 0) this.listeners.delete(eventName);
    return removed;
  }

  emit(eventName, payload = {}) {
    if (typeof eventName !== "string" || !eventName.trim()) {
      throw new TypeError("EventBus.emit requires a valid event name.");
    }

    const eventListeners = this.listeners.get(eventName);
    if (!eventListeners) return 0;

    let delivered = 0;
    [...eventListeners].forEach((callback) => {
      try {
        callback(payload);
        delivered += 1;
      } catch (error) {
        console.error(`Event Bus listener failed: ${eventName}`, error);
      }
    });

    return delivered;
  }

  clear(eventName) {
    if (typeof eventName === "string") {
      return this.listeners.delete(eventName);
    }

    this.listeners.clear();
    return true;
  }

  listenerCount(eventName) {
    return this.listeners.get(eventName)?.size ?? 0;
  }

  #validateSubscription(eventName, callback) {
    if (typeof eventName !== "string" || !eventName.trim()) {
      throw new TypeError("EventBus.on requires a valid event name.");
    }

    if (typeof callback !== "function") {
      throw new TypeError("EventBus.on requires a callback function.");
    }
  }
}

window.BlueCurrentEventBus = EventBus;
