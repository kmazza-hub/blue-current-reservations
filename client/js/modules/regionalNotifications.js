(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.regionalNotifications.v34.1.7a";
  const byId = id => document.getElementById(id);

  const state = {
    filter: "all",
    notifications: []
  };

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      state.notifications = Array.isArray(value) ? value : [];
    } catch {
      state.notifications = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notifications.slice(0, 100)));
  }

  function add(notification) {
    state.notifications.unshift({
      id: notification.id || `note_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      createdAt: notification.createdAt || new Date().toISOString(),
      locationId: notification.locationId || "loc_marina",
      locationName: notification.locationName || "Portfolio",
      severity: notification.severity || "info",
      title: notification.title || "Regional notification",
      detail: notification.detail || "",
      acknowledged: Boolean(notification.acknowledged),
      escalated: Boolean(notification.escalated)
    });
    save();
    render();
  }

  function seed() {
    if (state.notifications.length) return;

    state.notifications = [
      {
        id:"seed_regional_1",
        createdAt:new Date(Date.now()-7*60000).toISOString(),
        locationId:"loc_asbury",
        locationName:"Asbury Boardwalk",
        severity:"critical",
        title:"Labor and guest pressure are converging",
        detail:"Projected labor is above target while arrival volume is building toward dinner.",
        acknowledged:false,
        escalated:false
      },
      {
        id:"seed_regional_2",
        createdAt:new Date(Date.now()-19*60000).toISOString(),
        locationId:"loc_lobster",
        locationName:"Lobster Shanty",
        severity:"warning",
        title:"Kitchen pressure forecast increased",
        detail:"Expo and ticket-time pressure are expected to rise during the next operating window.",
        acknowledged:false,
        escalated:false
      },
      {
        id:"seed_regional_3",
        createdAt:new Date(Date.now()-41*60000).toISOString(),
        locationId:"loc_marina",
        locationName:"Marina Grill",
        severity:"info",
        title:"Portfolio health remains strong",
        detail:"Current location health and labor are within the expected operating range.",
        acknowledged:true,
        escalated:false
      }
    ];

    save();
  }

  function visible() {
    if (state.filter === "critical") {
      return state.notifications.filter(item => item.severity === "critical");
    }
    if (state.filter === "unread") {
      return state.notifications.filter(item => !item.acknowledged);
    }
    if (state.filter === "acknowledged") {
      return state.notifications.filter(item => item.acknowledged);
    }
    return state.notifications;
  }

  function update(id, patch) {
    const item = state.notifications.find(note => note.id === id);
    if (!item) return;
    Object.assign(item, patch);
    save();
    render();
  }

  function renderKPIs() {
    const unread = state.notifications.filter(item => !item.acknowledged).length;
    const critical = state.notifications.filter(item => item.severity === "critical" && !item.acknowledged).length;
    const acknowledged = state.notifications.filter(item => item.acknowledged).length;
    const escalated = state.notifications.filter(item => item.escalated).length;

    byId("regionalNotificationUnread").textContent = String(unread);
    byId("regionalNotificationCritical").textContent = String(critical);
    byId("regionalNotificationAcknowledged").textContent = String(acknowledged);
    byId("regionalNotificationEscalated").textContent = String(escalated);

    byId("regionalNotificationHeadline").textContent =
      critical > 0
        ? `${critical} critical regional notification${critical === 1 ? "" : "s"} require attention.`
        : unread > 0
          ? `${unread} regional notification${unread === 1 ? "" : "s"} remain unread.`
          : "No urgent regional notifications.";

    byId("regionalNotificationUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function render() {
    const list = byId("regionalNotificationList");
    if (!list) return;

    renderKPIs();
    list.replaceChildren();

    const notifications = visible();

    if (!notifications.length) {
      const empty = document.createElement("div");
      empty.className = "regional-notification-empty";
      empty.textContent = "No notifications match this view.";
      list.append(empty);
      return;
    }

    notifications.forEach(notification => {
      const card = document.createElement("article");
      card.className = "regional-notification-card";
      card.dataset.severity = notification.severity;
      card.classList.toggle("is-acknowledged", notification.acknowledged);

      const copy = document.createElement("div");
      copy.className = "regional-notification-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p><div class='regional-notification-meta'></div>";
      copy.querySelector("small").textContent = notification.locationName;
      copy.querySelector("strong").textContent = notification.title;
      copy.querySelector("p").textContent = notification.detail;

      const meta = copy.querySelector(".regional-notification-meta");
      [
        notification.severity,
        new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date(notification.createdAt)),
        notification.acknowledged ? "Acknowledged" : "Unread",
        notification.escalated ? "Escalated" : "Monitoring"
      ].forEach(value => {
        const chip = document.createElement("span");
        chip.textContent = value;
        meta.append(chip);
      });

      const actions = document.createElement("div");
      actions.className = "regional-notification-actions";

      const acknowledge = document.createElement("button");
      acknowledge.type = "button";
      acknowledge.className = "regional-notification-secondary";
      acknowledge.textContent = notification.acknowledged ? "Mark unread" : "Acknowledge";
      acknowledge.addEventListener("click", () => update(notification.id, {
        acknowledged: !notification.acknowledged
      }));

      const escalate = document.createElement("button");
      escalate.type = "button";
      escalate.className = "regional-notification-primary";
      escalate.textContent = notification.escalated ? "Escalated" : "Create action";
      escalate.disabled = notification.escalated;
      escalate.addEventListener("click", () => {
        update(notification.id, { escalated:true, acknowledged:true });

        window.dispatchEvent(new CustomEvent("bluecurrent:manager-action-created", {
          detail:{
            action:{
              id:`regional_${notification.id}`,
              title:notification.title,
              locationId:notification.locationId,
              locationName:notification.locationName,
              source:"Regional Notification",
              priority:notification.severity === "critical" ? "high" : "medium",
              due:notification.severity === "critical" ? "Within 30 minutes" : "Before peak service",
              note:notification.detail
            }
          }
        }));

        byId("regionalNotificationStatus").textContent =
          `Action created for ${notification.locationName}.`;
      });

      actions.append(acknowledge, escalate);
      card.append(copy, actions);
      list.append(card);
    });
  }

  function bindSystemEvents() {
    byId("regionalNotificationFilter")?.addEventListener("change", event => {
      state.filter = event.target.value;
      render();
    });

    window.addEventListener("bluecurrent:manager-action-created", event => {
      const action = event.detail?.action;
      if (!action || action.source === "Regional Notification") return;

      add({
        locationId:action.locationId,
        locationName:action.locationName || "Portfolio",
        severity:action.priority === "high" ? "warning" : "info",
        title:`${action.source || "Blue Current"} action created`,
        detail:action.title,
        acknowledged:true,
        escalated:true
      });
    });
  }

  function observeForecast() {
    const forecast = byId("executiveForecastCenter");
    if (!forecast || !window.MutationObserver) return;

    let previousHeadline = byId("executiveForecastHeadline")?.textContent || "";

    const observer = new MutationObserver(() => {
      const headline = byId("executiveForecastHeadline")?.textContent || "";
      if (!headline || headline === previousHeadline) return;

      previousHeadline = headline;

      if (/peak|pressure|attention/i.test(headline)) {
        add({
          locationId:byId("executiveForecastReview")?.dataset.locationId || "loc_marina",
          locationName:"Executive Forecast",
          severity:/peak/i.test(headline) ? "warning" : "info",
          title:headline,
          detail:byId("executiveForecastNarrative")?.textContent || "Forecast conditions changed.",
          acknowledged:false,
          escalated:false
        });
      }
    });

    observer.observe(forecast, {
      childList:true,
      subtree:true,
      characterData:true,
      attributes:true
    });
  }

  function init() {
    if (!byId("regionalNotifications")) return;
    load();
    seed();
    bindSystemEvents();
    observeForecast();
    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once:true })
    : init();
})();
