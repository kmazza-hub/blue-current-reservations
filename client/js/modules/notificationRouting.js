(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.notificationRouting.v34.1.7b";
  const byId = id => document.getElementById(id);

  const defaults = [
    {
      id:"critical-operations",
      label:"Critical operations",
      detail:"High-risk labor, kitchen, guest, or portfolio-health events.",
      severity:"critical",
      audience:"Regional VP",
      channel:"Immediate",
      delivery:"In-app + SMS",
      enabled:true
    },
    {
      id:"warning-forecast",
      label:"Forecast warnings",
      detail:"Predicted risks that may develop before the next operating window.",
      severity:"warning",
      audience:"District Manager",
      channel:"Immediate",
      delivery:"In-app",
      enabled:true
    },
    {
      id:"executive-actions",
      label:"Executive actions",
      detail:"Action assignments, completion, review, and escalation activity.",
      severity:"info",
      audience:"Executive Team",
      channel:"Digest",
      delivery:"In-app + Email",
      enabled:true
    },
    {
      id:"guest-events",
      label:"Guest experience",
      detail:"VIP activity, service recovery, and reservation-pressure events.",
      severity:"warning",
      audience:"Operations Director",
      channel:"Digest",
      delivery:"In-app + Email",
      enabled:true
    }
  ];

  const state = { rules: [] };

  function cloneDefaults() {
    return defaults.map(rule => ({ ...rule }));
  }

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      state.rules = Array.isArray(value) && value.length ? value : cloneDefaults();
    } catch {
      state.rules = cloneDefaults();
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rules));
  }

  function syncKPIs() {
    const active = state.rules.filter(rule => rule.enabled).length;
    const critical = state.rules.filter(rule => rule.enabled && rule.severity === "critical").length;
    const digest = state.rules.filter(rule => rule.enabled && rule.channel === "Digest").length;
    const muted = state.rules.filter(rule => !rule.enabled).length;

    byId("notificationRoutingActiveCount").textContent = String(active);
    byId("notificationRoutingCriticalCount").textContent = String(critical);
    byId("notificationRoutingDigestCount").textContent = String(digest);
    byId("notificationRoutingMutedCount").textContent = String(muted);
  }

  function render() {
    const list = byId("notificationRoutingList");
    if (!list) return;

    syncKPIs();
    list.replaceChildren();

    state.rules.forEach(rule => {
      const card = document.createElement("article");
      card.className = "notification-routing-card";
      card.classList.toggle("is-muted", !rule.enabled);

      const copy = document.createElement("div");
      copy.className = "notification-routing-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p>";
      copy.querySelector("small").textContent = rule.severity;
      copy.querySelector("strong").textContent = rule.label;
      copy.querySelector("p").textContent = rule.detail;

      function select(label, value, options, key) {
        const wrapper = document.createElement("label");
        wrapper.textContent = label;
        const input = document.createElement("select");

        options.forEach(option => {
          const node = document.createElement("option");
          node.value = option;
          node.textContent = option;
          node.selected = option === value;
          input.append(node);
        });

        input.addEventListener("change", () => {
          rule[key] = input.value;
          syncKPIs();
        });

        wrapper.append(input);
        return wrapper;
      }

      const audience = select(
        "Audience",
        rule.audience,
        ["District Manager","Regional VP","Operations Director","Executive Team"],
        "audience"
      );

      const channel = select(
        "Cadence",
        rule.channel,
        ["Immediate","Digest"],
        "channel"
      );

      const delivery = select(
        "Delivery",
        rule.delivery,
        ["In-app","In-app + Email","In-app + SMS","In-app + Email + SMS"],
        "delivery"
      );

      const toggle = document.createElement("label");
      toggle.className = "notification-routing-toggle";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = rule.enabled;
      const toggleText = document.createElement("span");
      toggleText.textContent = "Enabled";

      checkbox.addEventListener("change", () => {
        rule.enabled = checkbox.checked;
        card.classList.toggle("is-muted", !rule.enabled);
        syncKPIs();
      });

      toggle.append(checkbox, toggleText);
      card.append(copy, audience, channel, delivery, toggle);
      list.append(card);
    });

    byId("notificationRoutingUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US", {
        hour:"numeric",
        minute:"2-digit"
      }).format(new Date())}`;
  }

  function ruleFor(notification) {
    if (notification.severity === "critical") {
      return state.rules.find(rule => rule.id === "critical-operations");
    }
    if (/forecast/i.test(notification.title || "") || /forecast/i.test(notification.detail || "")) {
      return state.rules.find(rule => rule.id === "warning-forecast");
    }
    if (/executive action|action created|completed/i.test(notification.title || "")) {
      return state.rules.find(rule => rule.id === "executive-actions");
    }
    if (/guest|reservation|vip|service/i.test(notification.title || "")) {
      return state.rules.find(rule => rule.id === "guest-events");
    }
    return null;
  }

  function publishRoutingDecision(notification) {
    const rule = ruleFor(notification);
    if (!rule || !rule.enabled) return;

    window.dispatchEvent(new CustomEvent("bluecurrent:notification-routed", {
      detail:{
        notification,
        rule:{
          id:rule.id,
          audience:rule.audience,
          channel:rule.channel,
          delivery:rule.delivery
        }
      }
    }));
  }

  function bind() {
    byId("notificationRoutingSave")?.addEventListener("click", () => {
      save();
      byId("notificationRoutingStatus").textContent = "Routing rules saved.";
      window.dispatchEvent(new CustomEvent("bluecurrent:notification-routing-updated", {
        detail:{ rules: state.rules.map(rule => ({ ...rule })) }
      }));
      render();
    });

    byId("notificationRoutingReset")?.addEventListener("click", () => {
      state.rules = cloneDefaults();
      save();
      byId("notificationRoutingStatus").textContent = "Default routing restored.";
      render();
    });

    window.addEventListener("bluecurrent:regional-notification-created", event => {
      if (event.detail?.notification) {
        publishRoutingDecision(event.detail.notification);
      }
    });
  }

  function init() {
    if (!byId("notificationRouting")) return;
    load();
    bind();
    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once:true })
    : init();
})();
