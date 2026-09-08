(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
  const text = (id, value) => { const el = byId(id); if (el && value !== undefined && value !== null) el.textContent = value; };

  const weatherCode = code => ({0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Foggy",48:"Foggy",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorms"}[code] || "Current conditions");

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

  function render(snapshot) {
    const b=snapshot.business||{}, o=snapshot.operation||{}, r=snapshot.readiness||{};
    text("commandCenterLocation", snapshot.location?.name || "Marina Grille");
    text("readinessScore", r.score);
    text("readinessStatus", r.status);
    const meter=byId("readinessMeterFill"); if(meter) meter.style.width=`${r.score || 0}%`;
    text("readinessStaffing", o.scheduled ? `${o.scheduled} team members active` : "Staffing needs review");
    text("readinessReservations", `${o.reservations || 0} reservations · ${o.covers || 0} covers`);
    text("readinessAttention", `${r.attentionCount || 0} item${r.attentionCount===1?"":"s"} need attention`);
    text("lastYearRevenue", money(b.lastYearRevenue));
    text("lastYearDetails", `${b.lastYearGuests || 0} guests · ${b.historicalLabor || 0}% labor · $${Number(b.averageCheck || 0).toFixed(2)} average check`);
    text("lastWeekRevenue", money(b.lastWeekRevenue));
    text("forecastRevenue", money(b.forecastRevenue));
    text("forecastChange", `${Number(b.forecastChange || 0) >= 0 ? "+" : ""}${b.forecastChange || 0}%`);
    text("operationReservations", o.reservations || 0); text("operationScheduled", o.scheduled || 0); text("operationPto", o.pendingPto || 0); text("operationLabor", `${o.projectedLabor || 0}%`);
    const list=byId("attentionList"); if(list){
      const items=snapshot.attention||[];
      list.innerHTML=items.length?items.map(item=>`<li class="${item.priority==='normal'?'attention-low':''}"><i></i><div><strong>${item.title}</strong><span>${item.detail}</span></div></li>`).join(""):'<li class="attention-low"><i></i><div><strong>No urgent operating alerts</strong><span>Core signals are within range.</span></div></li>';
    }
    text("aiRecommendation", snapshot.recommendation?.text);
    text("aiConfidence", snapshot.recommendation?.confidence || "Medium");
    text("briefLastUpdated", `Updated ${new Date(snapshot.generatedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`);
  }

  async function loadBrief(button) {
    if(button){button.disabled=true;button.textContent="Refreshing…";}
    try {
      const api = window.BlueCurrentCloudApi ? new window.BlueCurrentCloudApi("") : null;
      if (!api?.token) throw new Error("Sign in to load live operating data");
      const snapshot = await api.commandCenter("loc_marina");
      render(snapshot);
      await loadWeather(snapshot.location).catch(()=>text("weatherImpact","Live weather could not be reached; operating data is current."));
      if(button) button.textContent="Brief updated ✓";
    } catch(error) {
      const chip=byId("commandCenterDataChip"); if(chip) chip.textContent="Pilot view · sign in for live data";
      if(button) button.textContent="Sign in for live brief";
    } finally {
      if(button){button.disabled=false;setTimeout(()=>button.textContent="Refresh brief",1800);}
    }
  }

  const ready = callback => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded",callback,{once:true}) : callback();
  ready(() => {
    const dateLabel=byId("commandCenterDate");
    if(dateLabel) dateLabel.innerHTML=`${new Intl.DateTimeFormat("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(new Date())} · <span id="commandCenterLocation">Marina Grille</span>`;
    const actions=[...document.querySelectorAll("[data-manager-action]")], progress=byId("managerActionProgress");
    const update=()=>{const done=actions.filter(x=>x.checked).length; actions.forEach(x=>x.closest("label")?.classList.toggle("is-complete",x.checked)); if(progress)progress.textContent=`${done} of ${actions.length} complete`;};
    actions.forEach(x=>x.addEventListener("change",update)); update();
    const handoff=byId("acknowledgeHandoff"); handoff?.addEventListener("click",()=>{const done=handoff.classList.toggle("is-complete");handoff.textContent=done?"Handoff acknowledged ✓":"Acknowledge handoff";});
    const refresh=byId("commandCenterRefresh"); refresh?.addEventListener("click",()=>loadBrief(refresh));
    loadBrief();
    window.addEventListener("storage",event=>{if(event.key==="blueCurrentV3230Token")loadBrief();});
    setTimeout(loadBrief,1500);
  });
})();
