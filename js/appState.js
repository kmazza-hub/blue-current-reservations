/**
 * Blue Current Application State
 *
 * Stores shared restaurant-service data and announces changes
 * through the Event Bus.
 */

class AppState {
  constructor(eventBus, initialState = {}) {
    if (!eventBus) {
      throw new Error("AppState requires an Event Bus instance.");
    }

    this.eventBus = eventBus;

    this.state = {
      serviceStatus: "closed",
      occupancyPercent: 0,
      reservations: [],
      activeGuest: null,
      activeTable: null,
      ...initialState
    };
  }

  getState() {
    return structuredClone(this.state);
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    const previousValue = this.state[key];

    this.state[key] = value;

    this.eventBus.emit("state:changed", {
      key,
      value,
      previousValue,
      state: this.getState()
    });
  }

  update(changes = {}) {
    if (!changes || typeof changes !== "object") {
      throw new TypeError("AppState.update expects an object.");
    }

    const previousState = this.getState();

    this.state = {
      ...this.state,
      ...changes
    };

    this.eventBus.emit("state:updated", {
      changes,
      previousState,
      state: this.getState()
    });
  }

  reset() {
    this.update({
      serviceStatus: "closed",
      occupancyPercent: 0,
      reservations: [],
      activeGuest: null,
      activeTable: null
    });

    this.eventBus.emit("state:reset", {
      state: this.getState()
    });
  }
}

window.BlueCurrentAppState = AppState;