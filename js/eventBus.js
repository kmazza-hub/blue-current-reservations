/**
 * Blue Current Event Bus
 *
 * Allows independent modules to publish and subscribe to shared
 * application events.
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event.
   *
   * Returns an unsubscribe function.
   */
  on(eventName, callback) {
    if (typeof eventName !== "string" || !eventName.trim()) {
      throw new TypeError("EventBus.on requires a valid event name.");
    }

    if (typeof callback !== "function") {
      throw new TypeError("EventBus.on requires a callback function.");
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    this.listeners.get(eventName).add(callback);

    return () => {
      this.off(eventName, callback);
    };
  }

  /**
   * Subscribe to an event once.
   */
  once(eventName, callback) {
    const unsubscribe = this.on(eventName, (payload) => {
      unsubscribe();
      callback(payload);
    });

    return unsubscribe;
  }

  /**
   * Remove a specific event listener.
   */
  off(eventName, callback) {
    const eventListeners = this.listeners.get(eventName);

    if (!eventListeners) {
      return;
    }

    eventListeners.delete(callback);

    if (eventListeners.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  /**
   * Publish an event to every subscriber.
   */
  emit(eventName, payload = {}) {
    const eventListeners = this.listeners.get(eventName);

    if (!eventListeners) {
      return;
    }

    [...eventListeners].forEach((callback) => {
      try {
        callback(payload);
      } catch (error) {
        console.error(`Event Bus listener failed: ${eventName}`, error);
      }
    });
  }

  /**
   * Remove all listeners, or all listeners for one event.
   */
  clear(eventName) {
    if (typeof eventName === "string") {
      this.listeners.delete(eventName);
      return;
    }

    this.listeners.clear();
  }
}

window.BlueCurrentEventBus = EventBus;