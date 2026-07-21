/** Blue Current Concierge module */
function createConciergeModule(eventBus) {
  if (!eventBus) throw new Error("Concierge module requires an Event Bus.");

  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (node && value != null) node.textContent = String(value);
  };

  const unsubscribers = [
    eventBus.on("concierge:call-started", () => {
      setText("callStatus", "Incoming call");
      setText("thinkingText", "Listening");
    }),
    eventBus.on("guest:recognized", (guest) => {
      setText("conversationGuest", guest.guestName);
      setText("reservationGuest", guest.guestName);
    }),
    eventBus.on("reservation:confirmed", ({ reservation }) => {
      setText("reservationStatus", "Confirmed");
      setText("reservationGuest", reservation.guestName);
      setText("reservationTime", reservation.reservationTime);
      setText("reservationParty", `${reservation.partySize} guests`);
      setText("reservationOccasion", reservation.occasion || "—");
      setText("reservationSeating", reservation.seatingPreference || "—");
      const button = document.getElementById("confirmReservationButton");
      if (button) button.textContent = "Reservation confirmed ✓";
    })
  ];

  return { destroy: () => unsubscribers.forEach((unsubscribe) => unsubscribe()) };
}

window.createBlueCurrentConciergeModule = createConciergeModule;
