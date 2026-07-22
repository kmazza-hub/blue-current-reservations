(function(){"use strict";
function createBlueCurrentInventoryIntelligenceModule(eventBus,appState,cloudFoundationModule){
 const api=cloudFoundationModule?.api||new window.BlueCurrentCloudApi(""),$=id=>document.getElementById(id);
 let state={summary:{},items:[],recipeCosts:[],draftOrders:[],recommendations:[],waste:[],actions:[],policy:{}};
 const money=v=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(Number(v||0));
 function render(){
  const s=state.summary||{};
  $("inventoryValue").textContent=money(s.inventoryValue);$("inventorySkus").textContent=s.skuCount??"—";
  $("inventoryCritical").textContent=s.criticalItems??"—";$("inventoryWarning").textContent=s.warningItems??"—";
  $("inventoryFoodCost").textContent=`${s.actualFoodCost??"—"}%`;$("inventoryWaste").textContent=money(s.wasteCost);
  $("inventoryOrderValue").textContent=money(s.draftOrderValue);
  const variance=Number(s.actualFoodCost||0)-Number(s.targetFoodCostPercent||0);
  $("inventoryFoodCostVariance").textContent=`${variance>=0?"+":""}${variance.toFixed(1)} pts vs target`;
  $("inventoryFoodCostBar")?.style.setProperty("--food-cost",`${Math.min(100,Math.max(0,Number(s.actualFoodCost||0)*2.5))}%`);
  $("inventoryUpdated").textContent=state.generatedAt?new Date(state.generatedAt).toLocaleTimeString():"—";
  $("inventoryItems").innerHTML=state.items.map(item=>`<article class="inventory-item risk-${item.risk}"><div><small>${item.category} · ${item.vendorName}</small><strong>${item.name}</strong><span>${item.onHand} ${item.unit} on hand · par ${item.par}</span></div><div><b>${item.daysRemaining} days</b><span>${money(item.stockValue)}</span></div></article>`).join("");
  $("inventoryRecipes").innerHTML=state.recipeCosts.map(item=>`<article class="${item.status}"><div><strong>${item.name}</strong><span>${money(item.theoreticalCost)} cost · ${money(item.menuPrice)} price</span></div><b>${item.foodCostPercent}%</b><small>${money(item.margin)} margin</small></article>`).join("");
  $("inventoryRecommendations").innerHTML=state.recommendations.map(item=>`<article class="severity-${item.severity}"><span>${item.severity}</span><div><strong>${item.title}</strong><p>${item.reason}</p><small>${item.impact}</small></div><div><button data-inv-action="${item.id}" data-decision="approved">Approve</button><button data-inv-action="${item.id}" data-decision="dismissed">Dismiss</button></div></article>`).join("");
  $("inventoryOrders").innerHTML=state.draftOrders.map(order=>`<article><div><strong>${order.vendorName}</strong><span>${order.items.length} items</span></div><b>${money(order.total)}</b><button data-create-order="${order.vendorId}">Create draft</button></article>`).join("");
  $("inventoryWasteLog").innerHTML=state.waste.map(item=>`<article><strong>${item.reason}</strong><span>${item.quantity} units</span><b>${money(item.cost)}</b></article>`).join("")||"<p>No waste recorded.</p>";
  $("inventoryActions").innerHTML=state.actions.map(item=>`<article><strong>${item.decision}</strong><span>${item.recommendationId}</span><small>${new Date(item.createdAt).toLocaleTimeString()}</small></article>`).join("")||"<p>No inventory decisions yet.</p>";
  appState.update({inventoryValue:s.inventoryValue||0,inventoryCriticalItems:s.criticalItems||0,inventoryFoodCost:s.actualFoodCost||0});
 }
 async function load(){if(!api.token)return;state=await api.inventoryIntelligence();render();eventBus.emit("inventory:loaded",state.summary);}
 $("inventoryRefresh")?.addEventListener("click",load);
 $("inventoryRecommendations")?.addEventListener("click",async e=>{const b=e.target.closest("[data-inv-action]");if(!b)return;await api.decideInventoryRecommendation(b.dataset.invAction,{decision:b.dataset.decision,locationId:"loc_marina"});await load();});
 $("inventoryOrders")?.addEventListener("click",async e=>{const b=e.target.closest("[data-create-order]");if(!b)return;const order=state.draftOrders.find(x=>x.vendorId===b.dataset.createOrder);if(order){await api.createInventoryPurchaseOrder({locationId:"loc_marina",vendorId:order.vendorId,items:order.items,total:order.total});await load();}});
 $("inventoryPolicy")?.addEventListener("click",async()=>{const current=state.policy||{},target=prompt("Target food cost %",current.targetFoodCostPercent||29);if(target===null||Number.isNaN(Number(target)))return;await api.updateInventoryPolicy("loc_marina",{targetFoodCostPercent:Number(target),criticalDaysRemaining:current.criticalDaysRemaining||1.5,autoDraftOrders:current.autoDraftOrders});await load();});
 ["inventory:action-recorded","inventory:purchase-order-created","inventory:policy-updated"].forEach(type=>eventBus.on?.(type,load));
 eventBus.on?.("auth:signed-in",load);eventBus.on?.("auth:restored",load);setInterval(load,60000);load();
 return{reload:load,getState:()=>JSON.parse(JSON.stringify(state))};
}
window.createBlueCurrentInventoryIntelligenceModule=createBlueCurrentInventoryIntelligenceModule;})();