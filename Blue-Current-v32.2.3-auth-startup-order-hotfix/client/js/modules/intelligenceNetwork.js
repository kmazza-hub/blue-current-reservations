(function () {
  "use strict";

  function createIntelligenceNetworkModule(eventBus, appState) {
    const locations = [
      { id:"marina", name:"Marina Grille", city:"Belmar", health:96, occupancy:91, kitchen:11.2, revenue:31800, guests:126, status:"healthy", conversion:94 },
      { id:"harbor", name:"Harbor House", city:"Point Pleasant", health:98, occupancy:87, kitchen:10.4, revenue:34620, guests:118, status:"healthy", conversion:96 },
      { id:"river", name:"River & Rail", city:"Red Bank", health:93, occupancy:84, kitchen:13.1, revenue:29450, guests:109, status:"healthy", conversion:91 },
      { id:"shore", name:"Shoreline Kitchen", city:"Asbury Park", health:91, occupancy:95, kitchen:16.8, revenue:32780, guests:142, status:"watch", conversion:89 },
      { id:"dock", name:"The Dock Room", city:"Sea Bright", health:88, occupancy:97, kitchen:19.4, revenue:30110, guests:134, status:"action", conversion:86 },
      { id:"garden", name:"Garden Social", city:"Spring Lake", health:95, occupancy:82, kitchen:12.6, revenue:25660, guests:96, status:"healthy", conversion:93 }
    ];
    const knowledge = [
      { source:"Harbor House", situation:"Large-party arrival pressure", action:"Open overflow section 18 minutes early", result:"Wait reduced 8 minutes", confidence:93 },
      { source:"Marina Grille", situation:"Kitchen ticket growth", action:"Assign manager to expo for 15 minutes", result:"Ticket time reduced 4.2 minutes", confidence:91 },
      { source:"Garden Social", situation:"Low early occupancy", action:"Offer flexible callers a 6:45 PM slot", result:"Reservation conversion increased 11%", confidence:89 }
    ];
    let selectedId = appState.get("selectedLocationId") || "marina";

    const $ = id => document.getElementById(id);
    const money = value => `$${Number(value).toLocaleString()}`;
    const selected = () => locations.find(l => l.id === selectedId) || locations[0];

    function statusLabel(status){ return status === "action" ? "Action required" : status === "watch" ? "Watch" : "Healthy"; }

    function renderSummary() {
      const totalRevenue = locations.reduce((n,l)=>n+l.revenue,0);
      const totalGuests = locations.reduce((n,l)=>n+l.guests,0);
      const avgHealth = Math.round(locations.reduce((n,l)=>n+l.health,0)/locations.length);
      $("intelPortfolioHealth").textContent=avgHealth;
      $("intelPortfolioRevenue").textContent=money(totalRevenue);
      $("intelActiveGuests").textContent=totalGuests.toLocaleString();
    }

    function renderLocations() {
      $("intelLocationGrid").innerHTML = locations.map(l=>`<button class="intel-location-card ${l.status} ${l.id===selectedId?'selected':''}" data-intel-location="${l.id}"><div><span class="intel-dot"></span><small>${l.city}</small></div><strong>${l.name}</strong><p><b>${l.health}</b> health · ${l.occupancy}% occupied</p><em>${statusLabel(l.status)}</em></button>`).join("");
    }

    function renderDetail() {
      const l=selected();
      $("intelSelectedName").textContent=l.name;
      $("intelSelectedStatus").textContent=statusLabel(l.status);
      $("intelSelectedStatus").className=`intel-status ${l.status}`;
      $("intelSelectedHealth").textContent=l.health;
      $("intelSelectedOccupancy").textContent=`${l.occupancy}%`;
      $("intelSelectedKitchen").textContent=`${l.kitchen.toFixed(1)} min`;
      $("intelSelectedRevenue").textContent=money(l.revenue);
      const best = [...locations].sort((a,b)=>a.kitchen-b.kitchen)[0];
      $("intelLocationBrief").textContent = l.status === "action"
        ? `${l.name} is under capacity pressure. A proven ${best.name} pacing playbook could reduce wait time by approximately 6–8 minutes.`
        : `${l.name} is ${l.health >= 95 ? "outperforming" : "tracking near"} the portfolio. Reservation conversion is ${l.conversion}% and kitchen pacing is ${l.kitchen.toFixed(1)} minutes.`;
    }

    function renderBenchmarks(metric="health") {
      const lowerBetter = metric === "kitchen";
      const sorted=[...locations].sort((a,b)=>lowerBetter?a[metric]-b[metric]:b[metric]-a[metric]);
      const max=Math.max(...locations.map(l=>l[metric]));
      $("intelBenchmarkRows").innerHTML=sorted.map((l,i)=>{
        const display=metric==="revenue"?money(l[metric]):metric==="kitchen"?`${l[metric].toFixed(1)} min`:`${l[metric]}${metric==="occupancy"?'%':''}`;
        const width=lowerBetter?Math.max(28,100-(l[metric]/max*55)):Math.max(28,l[metric]/max*100);
        return `<button data-intel-location="${l.id}" class="intel-benchmark-row"><span>#${i+1}</span><strong>${l.name}</strong><i><b style="width:${width}%"></b></i><em>${display}</em></button>`;
      }).join("");
    }

    function renderKnowledge() {
      $("intelKnowledgeFeed").innerHTML=knowledge.map(k=>`<article><div><small>${k.source}</small><span>${k.confidence}% confidence</span></div><strong>${k.situation}</strong><p>${k.action}</p><em>${k.result}</em><button data-apply-playbook="${k.action}">Apply playbook</button></article>`).join("");
    }

    function selectLocation(id) {
      selectedId=id;
      appState.update({selectedLocationId:id,lastOperationalEvent:{type:"intelligence:location-selected",locationId:id,occurredAt:new Date().toISOString()}});
      renderLocations(); renderDetail();
      eventBus.emit("intelligence:location-selected", selected());
    }

    function runPulse() {
      const cards=[...document.querySelectorAll('.intel-location-card')];
      cards.forEach((card,i)=>setTimeout(()=>{card.classList.add('pulsing');setTimeout(()=>card.classList.remove('pulsing'),650);},i*130));
      setTimeout(()=>{
        $("intelExecutiveBrief").textContent="Network pulse complete: four locations are healthy, Shoreline Kitchen is on watch, and The Dock Room requires immediate capacity intervention.";
        eventBus.emit("intelligence:network-pulse",{locations:locations.length,actionRequired:1,watch:1});
      },900);
    }

    function downloadReport() {
      const report={generatedAt:new Date().toISOString(),organization:appState.get("organization"),summary:{health:$("intelPortfolioHealth").textContent,revenue:locations.reduce((n,l)=>n+l.revenue,0),activeGuests:locations.reduce((n,l)=>n+l.guests,0)},locations,knowledge};
      const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='blue-current-v20-portfolio-report.json'; a.click(); URL.revokeObjectURL(url);
      eventBus.emit("intelligence:report-generated",report.summary);
    }

    document.addEventListener("click",e=>{
      const location=e.target.closest("[data-intel-location]"); if(location) selectLocation(location.dataset.intelLocation);
      const play=e.target.closest("[data-apply-playbook]"); if(play){
        const action=play.dataset.applyPlaybook;
        play.textContent="Deployed"; play.disabled=true;
        appState.update({executiveBrief:`Portfolio playbook deployed: ${action}.`,lastOperationalEvent:{type:"intelligence:playbook-deployed",action,occurredAt:new Date().toISOString()}});
        eventBus.emit("intelligence:playbook-deployed",{action,location:selected()});
      }
    });
    $("intelBenchmarkSelect")?.addEventListener("change",e=>renderBenchmarks(e.target.value));
    $("intelPulse")?.addEventListener("click",runPulse);
    $("intelGenerateReport")?.addEventListener("click",downloadReport);
    $("intelShareLearning")?.addEventListener("click",()=>{
      knowledge.unshift({source:selected().name,situation:"Current service pattern",action:"Share selected location pacing model",result:"Published to portfolio network",confidence:92});
      renderKnowledge(); eventBus.emit("intelligence:learning-shared",{location:selected()});
    });
    eventBus.on("autonomy:decision-accept",decision=>{
      if(!decision) return;
      knowledge.unshift({source:selected().name,situation:decision.title,action:decision.detail,result:`Estimated impact +$${decision.impact}`,confidence:decision.confidence});
      knowledge.splice(5); renderKnowledge();
      appState.update({intelligenceNetwork:{status:"learning",learnedOutcomes:(appState.get("intelligenceNetwork")?.learnedOutcomes||42)+1,confidence:Math.min(99,decision.confidence)}});
    });

    renderSummary(); renderLocations(); renderDetail(); renderBenchmarks(); renderKnowledge();
    eventBus.emit("intelligence:network-online",{locations:locations.length,knowledgeRecords:knowledge.length});
    return {getLocations:()=>structuredClone(locations),selectLocation,runPulse,getKnowledge:()=>structuredClone(knowledge)};
  }
  window.createBlueCurrentIntelligenceNetworkModule=createIntelligenceNetworkModule;
})();
