/**
 * Blue Current Live Service Timeline
 *
 * One guided reservation journey. The final reservation:confirmed
 * event contains everything required to synchronize the application.
 */
function createLiveServiceTimeline(eventBus) {
  if (!eventBus) {
    throw new Error("createLiveServiceTimeline requires an Event Bus.");
  }

  const reservation = {
    id: "reservation-1048",
    guestName: "Anthony Russo",
    phoneNumber: "(732) 555-0148",
    partySize: 4,
    reservationDate: "Friday, July 24",
    reservationTime: "7:15 PM",
    tableNumber: 14,
    seatingPreference: "Quiet waterfront",
    occasion: "Birthday",
    notes: ["Tree nut allergy", "Premier guest"]
  };

  return [
    {
      name: "Start dinner service",
      delay: 1000,
      action: () => eventBus.emit("service:started", {
        serviceName: "Dinner service",
        startedAt: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit"
        })
      })
    },
    {
      name: "Incoming guest call",
      delay: 1800,
      action: () => eventBus.emit("concierge:call-started", {
        id: "call-1048",
        phoneNumber: reservation.phoneNumber,
        guestType: "returning"
      })
    },
    {
      name: "Guest recognized",
      delay: 2200,
      action: () => eventBus.emit("guest:recognized", {
        guestName: reservation.guestName,
        visits: 11,
        tier: "Premier Guest",
        preferences: ["Waterfront seating", "Quiet table"],
        allergies: ["Tree nut"],
        occasion: reservation.occasion
      })
    },
    {
      name: "Availability recovered",
      delay: 2200,
      action: () => eventBus.emit("availability:matched", {
        requestedTime: "7:30 PM",
        offeredTime: reservation.reservationTime,
        tableNumber: reservation.tableNumber,
        reason: "Waterfront inventory constrained at 7:30 PM"
      })
    },
    {
      name: "Reservation confirmed",
      delay: 2400,
      action: () => eventBus.emit("reservation:confirmed", {
        reservation,
        occupancyPercent: 82,
        revenueImpact: 340,
        executiveBrief:
          "One waterfront reservation was recovered, Table 14 was assigned, and the host team received the birthday and allergy notes."
      })
    }
  ];
}

window.createBlueCurrentLiveServiceTimeline = createLiveServiceTimeline;
