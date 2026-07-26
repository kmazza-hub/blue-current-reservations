(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
  const text = (id, value) => { const el = byId(id); if (el && value !== undefined && value !== null) el.textContent = value; };
  let currentHandoff = null;
  let activeApi = null;

  const weatherCode = code => ({0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Foggy",48:"Foggy",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorms"}[code] || "Current conditions");
  const titleCase = value => String(value || "shift").replace(/\b\w/g, letter => letter.toUpperCase());

  async function loadWeather(location) {
    const latitude = location?.latitude || 40.1784;
    const longitude = location?.longitude || -74.0218;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunset&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather unavailable");
    const data = await response.json();
    text("weatherTemperature", `${Math.round(data.current?.temperature_2m || 0)}°`);
    text("weatherCondition", weatherCode(data.current?.weather_code));
    text("weatherHighLow", `High ${Math.round(data.daily?.temperature_2m_max?.[0] || 0)}° · Low ${Math.round(data.daily?.temperature_2m_min?.[0] || 0)}°`);
    text("weatherRain", `Rain ${Math.round(data.daily?.precipitation_probability_max?.[0] || 0)}%`);
    const sunset = data.daily?.sunset?.[0];
    text("weatherSunset", sunset ? `Sunset ${new Date(sunset).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Sunset —");
    text("weatherImpact", (data.daily?.precipitation_probability_max?.[0] || 0) >= 50 ? "Rain may shift demand indoors. Review floor and staffing plans." : "Conditions support normal patio demand through service.");
    const chip = byId("commandCenterDataChip");
    if (chip) chip.textContent = "Live operations + weather";
  }

  function renderHandoff(handoff) {
    currentHandoff = handoff || null;
    const acknowledge = byId("acknowledgeHandoff");
    const highlights = byId("handoffHighlights");
    const attention = byId("handoffAttention");
    if (!handoff) {
      text("handoffMeta", "No handoff posted yet");
      text("handoffSummary", "The latest manager can leave a concise handoff for the next shift.");
      if (highlights) highlights.innerHTML = '<span>Ready for first note</span>';
      if (attention) { attention.hidden = true; attention.textContent = ""; }
      if (acknowledge) { acknowledge.disabled = true; acknowledge.classList.remove("is-complete"); acknowledge.textContent = "Nothing to acknowledge"; }
      return;
    }
    const created = new Date(handoff.createdAt);
    text("handoffMeta", `${titleCase(handoff.shift)} · ${created.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${handoff.authorName || "Manager"}`);
    text("handoffSummary", handoff.summary);
    if (highlights) highlights.innerHTML = (handoff.highlights?.length ? handoff.highlights : ["Shift summary posted"]).map(item => `<span>${escapeHtml(item)}</span>`).join("");
    if (attention) {
      const items = handoff.needsAttention || [];
      attention.hidden = !items.length;
      attention.innerHTML = items.length ? `<strong>Next shift attention</strong><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
    }
    if (acknowledge) {
      const acknowledged = (handoff.acknowledgements || []).length > 0;
      acknowledge.disabled = false;
      acknowledge.classList.toggle("is-complete", acknowledged);
      acknowledge.textContent = acknowledged ? `Acknowledged by ${(handoff.acknowledgements || []).length} manager${handoff.acknowledgements.length === 1 ? "" : "s"} ✓` : "Acknowledge handoff";
    }
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[character]));
  }


  function renderReadinessBreakdown(readiness = {}) {
    const grid = byId("readinessComponentGrid");
    const components = Array.isArray(readiness.components) ? readiness.components : [];
    text("readinessBreakdownSummary", readiness.summary || "Operating signals are being evaluated.");
    text("readinessNextAction", readiness.nextAction || "Review the lowest-scoring operating signal before service.");
    if (!grid) return;
    grid.innerHTML = components.length ? components.map(component => {
      const score = Math.max(0, Math.min(100, Number(component.score || 0)));
      const state = score < 70 ? "is-critical" : score < 86 ? "is-warning" : "is-good";
      return `<article class="readiness-component ${state}">
        <div class="readiness-component-head"><strong>${escapeHtml(component.label)}</strong><b>${Math.round(score)}%</b></div>
        <div class="readiness-component-track"><i style="width:${score}%"></i></div>
        <p>${escapeHtml(component.detail)}</p>
        <footer><span>${escapeHtml(component.impact)}</span><span>${Number(component.weight || 0)}% weight</span></footer>
      </article>`;
    }).join("") : '<article class="readiness-component is-warning"><div class="readiness-component-head"><strong>Readiness details</strong><b>—</b></div><p>Sign in and refresh to calculate the complete breakdown.</p></article>';
  }

  function render(snapshot) {
    const b=snapshot.business||{}, o=snapshot.operation||{}, r=snapshot.readiness||{};
    text("commandCenterLocation", snapshot.location?.name || "Marina Grille");
    text("readinessScore", r.score);
    text("readinessStatus", r.status);
    const meter=byId("readinessMeterFill"); if(meter) meter.style.width=`${r.score || 0}%`;
    text("readinessStaffing", o.scheduled ? `${o.scheduled} team members active` : "Staffing needs review");
    text("readinessReservations", `${o.reservations || 0} reservations · ${o.covers || 0} covers`);
    text("readinessAttention", `${r.attentionCount || 0} item${r.attentionCount===1?"":"s"} need attention`);
    const readinessPanel = byId("readinessMeterFill")?.closest(".readiness-meter");
    if (readinessPanel) readinessPanel.setAttribute("aria-label", `Restaurant readiness ${r.score || 0} percent`);
    renderReadinessBreakdown(r);
    text("lastYearRevenue", money(b.lastYearRevenue));
    text("lastYearDetails", `${b.lastYearGuests || 0} guests · ${b.historicalLabor || 0}% labor · $${Number(b.averageCheck || 0).toFixed(2)} average check`);
    text("lastWeekRevenue", money(b.lastWeekRevenue));
    text("forecastRevenue", money(b.forecastRevenue));
    text("forecastChange", `${Number(b.forecastChange || 0) >= 0 ? "+" : ""}${b.forecastChange || 0}%`);
    text("operationReservations", o.reservations || 0); text("operationScheduled", o.scheduled || 0); text("operationPto", o.pendingPto || 0); text("operationLabor", `${o.projectedLabor || 0}%`);
    const list=byId("attentionList"); if(list){
      const items=snapshot.attention||[];
      list.innerHTML=items.length?items.map(item=>`<li class="${item.priority==='normal'?'attention-low':''}"><i></i><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div></li>`).join(""):'<li class="attention-low"><i></i><div><strong>No urgent operating alerts</strong><span>Core signals are within range.</span></div></li>';
    }
    renderHandoff(snapshot.handoff);
    text("aiRecommendation", snapshot.recommendation?.text);
    text("aiConfidence", snapshot.recommendation?.confidence || "Medium");
    text("briefLastUpdated", `Updated ${new Date(snapshot.generatedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`);
  }

  async function loadBrief(button) {
    if(button){button.disabled=true;button.textContent="Refreshing…";}
    try {
      activeApi = window.BlueCurrentCloudApi ? new window.BlueCurrentCloudApi("") : null;
      if (!activeApi?.token) throw new Error("Sign in to load live operating data");
      const snapshot = await activeApi.commandCenter("loc_marina");
      render(snapshot);
      await loadWeather(snapshot.location).catch(()=>text("weatherImpact","Live weather could not be reached; operating data is current."));
      if(button) button.textContent="Brief updated ✓";
    } catch(error) {
      const chip=byId("commandCenterDataChip"); if(chip) chip.textContent="Pilot view · sign in for live data";
      renderHandoff(null);
      if(button) button.textContent="Sign in for live brief";
    } finally {
      if(button){button.disabled=false;setTimeout(()=>button.textContent="Refresh brief",1800);}
    }
  }

  function setComposer(open) {
    const composer = byId("handoffComposer");
    if (composer) composer.hidden = !open;
    const opener = byId("openHandoffComposer");
    if (opener) opener.hidden = open;
    if (open) byId("handoffSummaryInput")?.focus();
  }

  async function saveHandoff(event) {
    event.preventDefault();
    const status = byId("handoffFormStatus"), button = byId("saveHandoff");
    const summary = byId("handoffSummaryInput")?.value.trim();
    if (!summary || summary.length < 10) { if(status) status.textContent="Add a little more detail before posting."; return; }
    if (!activeApi?.token) { if(status) status.textContent="Sign in before posting a handoff."; return; }
    button.disabled = true; button.textContent = "Posting…"; if(status) status.textContent="";
    try {
      await activeApi.createShiftHandoff({ locationId:"loc_marina", shift:byId("handoffShift")?.value, summary, highlights:byId("handoffHighlightInput")?.value, needsAttention:byId("handoffAttentionInput")?.value });
      event.target.reset(); byId("handoffShift").value="closing"; setComposer(false); await loadBrief();
    } catch(error) { if(status) status.textContent=error.message; }
    finally { button.disabled=false; button.textContent="Post handoff"; }
  }

  async function acknowledgeHandoff() {
    const button = byId("acknowledgeHandoff");
    if (!currentHandoff?.id || !activeApi?.token) return;
    button.disabled=true; button.textContent="Saving…";
    try { await activeApi.acknowledgeShiftHandoff(currentHandoff.id); await loadBrief(); }
    catch(error) { button.textContent=error.message; }
    finally { button.disabled=false; }
  }

  const ready = callback => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded",callback,{once:true}) : callback();
  ready(() => {
    const dateLabel=byId("commandCenterDate");
    if(dateLabel) dateLabel.innerHTML=`${new Intl.DateTimeFormat("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(new Date())} · <span id="commandCenterLocation">Marina Grille</span>`;
    const actions=[...document.querySelectorAll("[data-manager-action]")], progress=byId("managerActionProgress");
    const update=()=>{const done=actions.filter(x=>x.checked).length; actions.forEach(x=>x.closest("label")?.classList.toggle("is-complete",x.checked)); if(progress)progress.textContent=`${done} of ${actions.length} complete`;};
    actions.forEach(x=>x.addEventListener("change",update)); update();
    byId("acknowledgeHandoff")?.addEventListener("click",acknowledgeHandoff);
    byId("openHandoffComposer")?.addEventListener("click",()=>setComposer(true));
    byId("cancelHandoffComposer")?.addEventListener("click",()=>setComposer(false));
    byId("handoffComposer")?.addEventListener("submit",saveHandoff);
    const readinessToggle = byId("readinessDetailsToggle");
    readinessToggle?.addEventListener("click", () => {
      const breakdown = byId("readinessBreakdown");
      const open = breakdown?.hidden !== false;
      if (breakdown) breakdown.hidden = !open;
      readinessToggle.setAttribute("aria-expanded", String(open));
      readinessToggle.textContent = open ? "Hide breakdown" : "View breakdown";
    });
    const refresh=byId("commandCenterRefresh"); refresh?.addEventListener("click",()=>loadBrief(refresh));
    loadBrief();
    window.addEventListener("storage",event=>{if(event.key==="blueCurrentV3230Token")loadBrief();});
    setTimeout(loadBrief,1500);
  });
})();
