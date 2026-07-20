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
  // Service
  serviceStatus: "closed",

  // Live Operations
  occupancyPercent: 0,
  reservations: [],
  activeGuest: null,
  activeTable: null,

  // Executive Metrics
  guestsExpected: 1026,
  reservationsToday: 220,
  callsAnswered: 176,
  estimatedRevenue: 31800,
  guestSatisfaction: 4.8,

  // AI Summary
  executiveBrief: "Waiting for dinner service…",

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

  increment(key, amount = 1) {

  if (typeof this.state[key] !== "number") {
    throw new Error(
      `${key} is not numeric.`
    );
  }

  this.set(
    key,
    this.state[key] + amount
  );

}

appendReservation(reservation) {

  const reservations = [

    ...this.state.reservations,

    reservation

  ];

  this.set(
    "reservations",
    reservations
  );

}

  reset() {
    this.update({

  serviceStatus: "closed",

  occupancyPercent: 0,

  reservations: [],

  activeGuest: null,

  activeTable: null,

  guestsExpected: 1026,

  reservationsToday: 220,

  callsAnswered: 176,

  estimatedRevenue: 31800,

  guestSatisfaction: 4.8,

  executiveBrief: "Waiting for dinner service..."

});

    this.eventBus.emit("state:reset", {
      state: this.getState()
    });
  }
}

window.BlueCurrentAppState = AppState;