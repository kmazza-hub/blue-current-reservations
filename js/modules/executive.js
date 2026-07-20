/**
 * Blue Current Executive Intelligence
 */

function createExecutiveModule(eventBus) {

  const metrics = {
    reservations: document.getElementById("metricReservations"),
    occupancy: document.getElementById("metricOccupancy"),
    revenue: document.getElementById("metricRevenue"),
    satisfaction: document.getElementById("metricSatisfaction"),
    brief: document.getElementById("executiveBrief")
  };

  function updateReservations(value) {
    if (metrics.reservations) {
      metrics.reservations.textContent = value;
    }
  }

  function updateOccupancy(value) {
    if (metrics.occupancy) {
      metrics.occupancy.textContent = value + "%";
    }
  }

  function updateRevenue(value) {
    if (metrics.revenue) {
      metrics.revenue.textContent =
        "$" + value.toLocaleString();
    }
  }

  function updateSatisfaction(value) {
    if (metrics.satisfaction) {
      metrics.satisfaction.textContent = value.toFixed(1);
    }
  }

  function updateBrief(message) {
    if (!metrics.brief) return;

    metrics.brief.classList.remove("fade-in");

    void metrics.brief.offsetWidth;

    metrics.brief.textContent = message;
    metrics.brief.classList.add("fade-in");
  }

  eventBus.on("reservation:created", ({ reservationCount }) => {

    updateReservations(reservationCount);

    updateBrief(
      "Reservation captured. Forecast updated."
    );

  });

  eventBus.on("occupancy:updated", ({ occupancyPercent }) => {

    updateOccupancy(occupancyPercent);

    updateRevenue(18760);

    updateSatisfaction(4.9);

    updateBrief(
      "Dining room occupancy increased. Revenue forecast improved."
    );

  });

  return {};
}

window.createBlueCurrentExecutiveModule =
  createExecutiveModule;