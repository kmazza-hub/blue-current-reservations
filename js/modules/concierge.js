/**
 * Blue Current Concierge Module
 *
 * Connects live-service events to the hero call panel.
 */

function createConciergeModule(eventBus) {
  if (!eventBus) {
    throw new Error("Concierge module requires an Event Bus.");
  }

  const elements = {
    callStatus: document.getElementById("callStatus"),
    callerName: document.getElementById("callerName"),
    callerPhone: document.getElementById("callerPhone"),
    callTimer: document.getElementById("callTimer"),
    waveform: document.getElementById("callWaveform"),
    aiLine: document.getElementById("aiLine"),
    guestLine: document.getElementById("guestLine"),
    thinkingText: document.getElementById("thinkingText")
  };

  let timerId = null;
  let elapsedSeconds = 0;

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();

    elapsedSeconds = 0;

    if (elements.callTimer) {
      elements.callTimer.textContent = formatTime(elapsedSeconds);
    }

    timerId = window.setInterval(() => {
      elapsedSeconds += 1;

      if (elements.callTimer) {
        elements.callTimer.textContent = formatTime(elapsedSeconds);
      }
    }, 1000);
  }

  function setWaveformActive(isActive) {
    if (!elements.waveform) {
      return;
    }

    elements.waveform.classList.toggle("is-active", isActive);
  }

  function handleCallStarted(call) {
    if (elements.callStatus) {
      elements.callStatus.textContent = "Conversation live";
    }

    if (elements.callerName) {
      elements.callerName.textContent =
        call.guestType === "returning" ? "Returning guest" : "New guest";
    }

    if (elements.callerPhone) {
      elements.callerPhone.textContent = call.phoneNumber;
    }

    if (elements.aiLine) {
      elements.aiLine.textContent =
        "Good evening, thank you for calling Marina Grille. How may I help?";
    }

    if (elements.guestLine) {
      elements.guestLine.textContent =
        "Hi, I would like to reserve a table for four this evening.";
    }

    if (elements.thinkingText) {
      elements.thinkingText.textContent = "Listening";
    }

    setWaveformActive(true);
    startTimer();
  }

  function handleReservationCreated(reservation) {
    if (elements.callStatus) {
      elements.callStatus.textContent = "Reservation captured";
    }

    if (elements.callerName) {
      elements.callerName.textContent = reservation.guestName;
    }

    if (elements.aiLine) {
      elements.aiLine.textContent =
        `Absolutely, ${reservation.guestName}. I have a table for ` +
        `${reservation.partySize} at ${reservation.reservationTime}.`;
    }

    if (elements.guestLine) {
      elements.guestLine.textContent =
        `${reservation.seatingPreference} seating would be perfect.`;
    }

    if (elements.thinkingText) {
      elements.thinkingText.textContent = "Confirming details";
    }
  }

  function handleGuestRecognized(guest) {
    if (elements.callStatus) {
      elements.callStatus.textContent = "Guest recognized";
    }

    if (elements.callerName) {
      elements.callerName.textContent = guest.guestName;
    }

    if (elements.aiLine) {
      elements.aiLine.textContent =
        `Welcome back, ${guest.guestName}. I also see that this is a ` +
        `${guest.occasion.toLowerCase()} celebration.`;
    }

    if (elements.guestLine) {
      elements.guestLine.textContent =
        "Yes, thank you. Waterfront seating would be wonderful.";
    }

    if (elements.thinkingText) {
      elements.thinkingText.textContent = "Guest profile matched";
    }

    stopTimer();
    setWaveformActive(false);
  }

  const unsubscribeCallStarted = eventBus.on(
    "concierge:call-started",
    handleCallStarted
  );

  const unsubscribeReservationCreated = eventBus.on(
    "reservation:created",
    handleReservationCreated
  );

  const unsubscribeGuestRecognized = eventBus.on(
    "guest:recognized",
    handleGuestRecognized
  );

  return {
    destroy() {
      stopTimer();
      setWaveformActive(false);

      unsubscribeCallStarted();
      unsubscribeReservationCreated();
      unsubscribeGuestRecognized();
    }
  };
}

window.createBlueCurrentConciergeModule = createConciergeModule;