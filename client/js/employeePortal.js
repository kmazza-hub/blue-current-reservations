(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const tokenKey = "blueCurrentEmployeePortalToken";
  let token = localStorage.getItem(tokenKey) || "";
  let state = null;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
    return payload;
  }

  function showPanel(name) {
    document.querySelectorAll(".ep-tab").forEach((item) => item.classList.toggle("active", item.dataset.panel === name));
    document.querySelectorAll(".ep-panel").forEach((item) => item.classList.toggle("active", item.dataset.panelView === name));
  }

  function shiftHtml(shift, action = "") {
    return `<div class="ep-item"><div><strong>${esc(shift.role)} · ${esc(shift.department || "Service")}</strong><small>${esc(shift.date)} · ${esc(shift.startTime)}–${esc(shift.endTime)}</small>${shift.notes ? `<small>${esc(shift.notes)}</small>` : ""}</div>${action}</div>`;
  }

  function setPtoStatus(message = "", type = "") {
    const status = $("epPtoStatus");
    if (!status) return;
    status.textContent = message;
    status.className = `ep-form-status${type ? ` ${type}` : ""}`;
  }

  function configurePtoDates() {
    const today = new Date().toISOString().slice(0, 10);
    const start = $("epPtoStart");
    const end = $("epPtoEnd");
    start.min = today;
    end.min = start.value || today;
    if (!start.value) start.value = today;
    if (!end.value) end.value = start.value;
  }

  function ptoHistoryHtml(request) {
    const type = request.requestType || "time off";
    return `<div class="ep-item"><div class="ep-pto-summary"><div><strong>${esc(request.startDate)} → ${esc(request.endDate)}</strong><span class="ep-pto-type">${esc(type)}</span>${request.reason ? `<small>${esc(request.reason)}</small>` : `<small>No note provided</small>`}</div></div><span class="ep-status ${esc(request.status)}">${esc(request.status)}</span></div>`;
  }

  function render() {
    const employee = state.employee;
    const summary = state.summary;
    const todaysShift = state.todaysShift;
    const nextShift = state.nextShift;

    $("epGreeting").textContent = `Hello, ${employee.name.split(" ")[0]}`;
    $("epRole").textContent = `${employee.role} · ${employee.department}`;
    $("epHours").textContent = `${Number(summary.scheduledHours).toFixed(1)}h`;
    $("epNext").textContent = nextShift ? nextShift.date.slice(5) : "None";
    $("epNextDetail").textContent = nextShift ? `${nextShift.startTime}–${nextShift.endTime}` : "No upcoming shift";
    $("epOpenCount").textContent = summary.openShiftCount;
    $("epUnread").textContent = summary.unreadNotifications;
    $("epUnreadSummary").textContent = `${summary.unreadNotifications} unread notice${summary.unreadNotifications === 1 ? "" : "s"}`;
    $("epTodayTitle").textContent = todaysShift ? `${todaysShift.role} · ${todaysShift.department || "Service"}` : "You are off today";
    $("epTodayMeta").textContent = todaysShift ? (todaysShift.notes || "Your scheduled shift is ready.") : "Enjoy your day. Check open shifts if you want extra hours.";
    $("epTodayTime").textContent = todaysShift ? `${todaysShift.startTime}–${todaysShift.endTime}` : "No shift";
    $("epToday").innerHTML = todaysShift ? shiftHtml(todaysShift) : '<p class="ep-empty">You are not scheduled today.</p>';
    $("epSchedule").innerHTML = state.myShifts.map((shift) => shiftHtml(shift, `<button class="ep-button secondary" data-swap-go="${shift.id}">Swap</button>`)).join("") || '<p class="ep-empty">No shifts scheduled this week.</p>';
    $("epOpen").innerHTML = state.openShifts.map((shift) => shiftHtml(shift, `<button class="ep-button" data-claim="${shift.id}">Claim</button>`)).join("") || '<p class="ep-empty">No open shifts are available.</p>';
    $("epPtoList").innerHTML = state.ptoRequests.map(ptoHistoryHtml).join("") || '<p class="ep-empty">No time-off requests yet.</p>';
    $("epSwapShift").innerHTML = state.myShifts.map((shift) => `<option value="${shift.id}">${shift.date} · ${shift.role} · ${shift.startTime}–${shift.endTime}</option>`).join("");
    $("epSwapList").innerHTML = state.swapRequests.map((request) => `<div class="ep-item"><div><strong>Shift swap request</strong><small>${esc(request.reason || "No reason")}</small></div><span class="ep-status ${esc(request.status)}">${esc(request.status)}</span></div>`).join("") || '<p class="ep-empty">No swap requests.</p>';
    $("epNotifications").innerHTML = state.notifications.map((notification) => `<div class="ep-item ep-note ${notification.readAt ? "" : "unread"}"><div><strong>${esc(notification.title)}</strong><small>${esc(notification.message)}</small></div>${notification.readAt ? "" : `<button class="ep-button secondary" data-read="${notification.id}">Mark read</button>`}</div>`).join("") || '<p class="ep-empty">No notifications.</p>';
    $("epAnnouncements").innerHTML = state.notifications.slice(0, 3).map((notification) => `<div class="ep-announcement"><strong>${esc(notification.title)}</strong><small>${esc(notification.message)}</small></div>`).join("") || '<p class="ep-empty">No new announcements.</p>';
  }

  async function load() {
    state = await api("/api/employee-portal/snapshot");
    $("epLogin").hidden = true;
    $("epApp").hidden = false;
    configurePtoDates();
    render();
  }

  async function run(action) {
    try {
      await action();
      await load();
    } catch (error) {
      alert(error.message);
    }
  }

  $("epSignIn").onclick = async () => {
    try {
      const result = await api("/api/employee-portal/login", {
        method: "POST",
        body: JSON.stringify({ employeeId: $("epEmployee").value, pin: $("epPin").value })
      });
      token = result.token;
      localStorage.setItem(tokenKey, token);
      $("epError").textContent = "";
      await load();
    } catch (error) {
      $("epError").textContent = error.message;
    }
  };

  $("epSignOut").onclick = () => {
    token = "";
    localStorage.removeItem(tokenKey);
    $("epApp").hidden = true;
    $("epLogin").hidden = false;
  };

  $("epPtoStart").addEventListener("change", () => {
    $("epPtoEnd").min = $("epPtoStart").value;
    if (!$("epPtoEnd").value || $("epPtoEnd").value < $("epPtoStart").value) {
      $("epPtoEnd").value = $("epPtoStart").value;
    }
    setPtoStatus();
  });

  $("epPtoEnd").addEventListener("change", () => setPtoStatus());

  $("epPtoForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const startDate = $("epPtoStart").value;
    const endDate = $("epPtoEnd").value;
    const requestType = $("epPtoType").value;
    const reason = $("epPtoReason").value.trim();
    const button = $("epPtoSubmit");

    if (!startDate || !endDate) return setPtoStatus("Choose both the first and last day off.", "error");
    if (endDate < startDate) return setPtoStatus("The last day cannot be before the first day.", "error");

    button.disabled = true;
    button.textContent = "Submitting…";
    setPtoStatus("Submitting your request…");

    try {
      await api("/api/employee-portal/pto", {
        method: "POST",
        body: JSON.stringify({ startDate, endDate, requestType, reason })
      });
      $("epPtoReason").value = "";
      setPtoStatus("Time-off request submitted. Status: Pending.", "success");
      await load();
    } catch (error) {
      setPtoStatus(error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = "Submit request";
    }
  });

  document.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-panel]");
    if (tab) showPanel(tab.dataset.panel);

    const go = event.target.closest("[data-go]");
    if (go) showPanel(go.dataset.go);

    const swap = event.target.closest("[data-swap-go]");
    if (swap) {
      showPanel("swaps");
      $("epSwapShift").value = swap.dataset.swapGo;
    }

    const claim = event.target.closest("[data-claim]");
    if (claim && confirm("Claim this open shift?")) {
      run(() => api(`/api/employee-portal/open-shifts/${encodeURIComponent(claim.dataset.claim)}`, { method: "POST", body: "{}" }));
    }

    const read = event.target.closest("[data-read]");
    if (read) run(() => api(`/api/employee-portal/notifications/${encodeURIComponent(read.dataset.read)}`, { method: "PATCH", body: "{}" }));
  });

  $("epSwapSubmit").onclick = () => run(() => api("/api/employee-portal/swaps", {
    method: "POST",
    body: JSON.stringify({ shiftId: $("epSwapShift").value, reason: $("epSwapReason").value })
  }));

  if (token) {
    load().catch(() => {
      token = "";
      localStorage.removeItem(tokenKey);
    });
  }
}());
