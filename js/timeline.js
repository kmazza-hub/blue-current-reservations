/**
 * Blue Current Live Service Timeline
 *
 * Describes the sequence of events used during the guided
 * dinner-service demonstration.
 */

function createLiveServiceTimeline(eventBus) {
  if (!eventBus) {
    throw new Error("createLiveServiceTimeline requires an Event Bus.");
  }

  return [
    {
      name: "Start dinner service",
      delay: 1000,
      action: () => {
        eventBus.emit("service:started", {
          serviceName: "Dinner service",
          startedAt: new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
          })
        });
      }
    },
    {
      name: "Incoming guest call",
      delay: 1800,
      action: () => {
        eventBus.emit("concierge:call-started", {
          phoneNumber: "(732) 555-0148",
          guestType: "new"
        });
      }
    },
    {
      name: "Reservation captured",
      delay: 2400,
      action: () => {
        eventBus.emit("reservation:created", {
          id: "reservation-1048",
          guestName: "Anthony Russo",
          partySize: 4,
          reservationTime: "7:15 PM",
          seatingPreference: "Waterfront"
        });
      }
    },
    {
      name: "Guest recognized",
      delay: 2200,
      action: () => {
        eventBus.emit("guest:recognized", {
          guestName: "Anthony Russo",
          visits: 6,
          preferences: ["Waterfront seating", "Quiet table"],
          occasion: "Birthday"
        });
      }
    },
    {
      name: "Table assigned",
      delay: 2200,
      action: () => {
        eventBus.emit("table:assigned", {
          tableNumber: 14,
          partySize: 4
        });
      }
    },
    {
      name: "Occupancy updated",
      delay: 1800,
      action: () => {
        eventBus.emit("occupancy:updated", {
          occupancyPercent: 82
        });
      }
    },
    {
      name: "Executive metrics refreshed",
      delay: 2000,
      action: () => {
        eventBus.emit("executive:updated", {
          reservationsCaptured: 1,
          callsHandled: 1,
          occupancyPercent: 82
        });
      }
    }
  ];
}

window.createBlueCurrentLiveServiceTimeline = createLiveServiceTimeline;