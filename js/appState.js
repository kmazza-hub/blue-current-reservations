/**
 * Blue Current Application State
 *
 * The single source of truth for shared hospitality-service data.
 * Every committed change is announced through the Event Bus.
 */
class AppState {
  constructor(eventBus, initialState = {}) {
    if (!eventBus) throw new Error("AppState requires an Event Bus instance.");

    this.eventBus = eventBus;
    this.defaultState = {
      serviceStatus: "closed",
      occupancyPercent: 0,
      reservations: [],
      activeGuest: null,
      activeTable: null,
      activeCall: null,
      tables: null,

      guestsExpected: 1026,
      reservationsToday: 220,
      callsAnswered: 176,
      estimatedRevenue: 31800,
      guestSatisfaction: 4.8,

      organization: { id: "blue-current-demo", name: "Blue Current Hospitality Group" },
      selectedLocationId: "marina",
      intelligenceNetwork: { status: "online", learnedOutcomes: 42, confidence: 93 },

      executiveBrief: "Waiting for dinner service…",
      lastOperationalEvent: null
    };

    this.state = this.#clone({ ...this.defaultState, ...initialState });
  }

  getState() {
    return this.#clone(this.state);
  }

  get(key) {
    return this.#clone(this.state[key]);
  }

  set(key, value) {
    return this.update({ [key]: value });
  }

  update(changes = {}) {
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
      throw new TypeError("AppState.update expects an object.");
    }

    const changedEntries = Object.entries(changes).filter(
      ([key, value]) => !this.#isEqual(this.state[key], value)
    );

    if (changedEntries.length === 0) return false;

    const previousState = this.getState();
    const committedChanges = Object.fromEntries(changedEntries);

    this.state = {
      ...this.state,
      ...this.#clone(committedChanges)
    };

    changedEntries.forEach(([key]) => {
      this.eventBus.emit("state:changed", {
        key,
        value: this.get(key),
        previousValue: previousState[key],
        state: this.getState()
      });
    });

    this.eventBus.emit("state:updated", {
      changes: this.#clone(committedChanges),
      previousState,
      state: this.getState()
    });

    return true;
  }

  increment(key, amount = 1) {
    const currentValue = this.state[key];
    if (typeof currentValue !== "number") {
      throw new TypeError(`AppState.increment cannot update "${key}" because it is not numeric.`);
    }
    if (typeof amount !== "number" || Number.isNaN(amount)) {
      throw new TypeError("AppState.increment amount must be a number.");
    }

    return this.set(key, currentValue + amount);
  }

  appendReservation(reservation) {
    if (!reservation || typeof reservation !== "object" || Array.isArray(reservation)) {
      throw new TypeError("AppState.appendReservation expects a reservation object.");
    }

    const alreadyExists = reservation.id &&
      this.state.reservations.some((item) => item.id === reservation.id);

    if (alreadyExists) return false;
    return this.set("reservations", [...this.state.reservations, reservation]);
  }

  reset(overrides = {}) {
    const previousState = this.getState();
    this.state = this.#clone({ ...this.defaultState, ...overrides });

    const state = this.getState();
    this.eventBus.emit("state:reset", { previousState, state });
    this.eventBus.emit("state:updated", {
      changes: state,
      previousState,
      state
    });
  }

  #clone(value) {
    if (value === undefined || value === null || typeof value !== "object") return value;
    return structuredClone(value);
  }

  #isEqual(left, right) {
    if (Object.is(left, right)) return true;
    if (left && right && typeof left === "object" && typeof right === "object") {
      try {
        return JSON.stringify(left) === JSON.stringify(right);
      } catch {
        return false;
      }
    }
    return false;
  }
}

window.BlueCurrentAppState = AppState;
