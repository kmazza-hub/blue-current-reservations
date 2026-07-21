/** Blue Current Executive module */
function createExecutiveModule(eventBus, appState) {
  if (!eventBus || !appState) {
    throw new Error("Executive module requires Event Bus and App State.");
  }

  const formatRevenue = (value) => {
    const amount = Number(value) || 0;
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const render = (state) => {
    const values = {
      execGuests: Number(state.guestsExpected || 0).toLocaleString(),
      execReservations: Number(state.reservationsToday || 0).toLocaleString(),
      execCalls: Number(state.callsAnswered || 0).toLocaleString(),
      execRevenue: formatRevenue(state.estimatedRevenue),
      executiveBrief: state.executiveBrief
    };
    Object.entries(values).forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (node && value != null) node.textContent = String(value);
    });
  };

  const unsubscribers = [
    eventBus.on("state:updated", ({ state }) => render(state)),
    eventBus.on("state:reset", ({ state }) => render(state))
  ];

  render(appState.getState());
  return { destroy: () => unsubscribers.forEach((unsubscribe) => unsubscribe()) };
}

window.createBlueCurrentExecutiveModule = createExecutiveModule;
