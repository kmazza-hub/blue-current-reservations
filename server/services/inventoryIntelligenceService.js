"use strict";
class InventoryIntelligenceService {
  constructor(database,auditService,realtimeHub){
    Object.assign(this,{database,auditService,realtimeHub});
  }
  round(value,places=1){const p=10**places;return Math.round(Number(value||0)*p)/p;}
  async snapshot(organizationId,locationId="loc_marina"){
    const db=await this.database.read();
    const items=(db.inventoryItems||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const vendors=(db.vendors||[]).filter(x=>x.organizationId===organizationId);
    const recipes=(db.recipes||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const tickets=(db.kitchenTickets||[]).filter(x=>x.locationId===locationId&&!["cancelled"].includes(x.status));
    const waste=(db.wasteEvents||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const policy=(db.inventoryPolicies||[]).find(x=>x.organizationId===organizationId&&x.locationId===locationId)||{targetFoodCostPercent:29,criticalDaysRemaining:1.5,autoDraftOrders:true};
    const itemMap=new Map(items.map(x=>[x.id,x]));
    const demandByName={};
    for(const ticket of tickets) for(const item of ticket.items||[]) demandByName[item.name]=(demandByName[item.name]||0)+Number(item.qty||1);
    const enriched=items.map(item=>{
      const daysRemaining=item.dailyUsage?this.round(item.onHand/item.dailyUsage,1):99;
      const reorderQty=Math.max(0,this.round(item.par-item.onHand,2));
      const stockValue=this.round(item.onHand*item.unitCost,2);
      const risk=daysRemaining<=Number(policy.criticalDaysRemaining||1.5)?"critical":daysRemaining<=3?"warning":"healthy";
      const vendor=vendors.find(v=>v.id===item.vendorId);
      return {...item,daysRemaining,reorderQty,stockValue,risk,vendorName:vendor?.name||"Unassigned",demandSignal:demandByName[item.name]||0};
    });
    const recipeCosts=recipes.map(recipe=>{
      const theoreticalCost=this.round((recipe.ingredients||[]).reduce((sum,ingredient)=>{
        const inventory=itemMap.get(ingredient.inventoryId);
        return sum+(inventory?Number(inventory.unitCost)*Number(ingredient.quantity):0);
      },0),2);
      const foodCostPercent=recipe.menuPrice?this.round(theoreticalCost/recipe.menuPrice*100,1):0;
      const margin=this.round(recipe.menuPrice-theoreticalCost,2);
      return {...recipe,theoreticalCost,foodCostPercent,margin,status:foodCostPercent>Number(policy.targetFoodCostPercent||29)+4?"high-cost":foodCostPercent>Number(policy.targetFoodCostPercent||29)?"watch":"healthy"};
    });
    const inventoryValue=this.round(enriched.reduce((sum,x)=>sum+x.stockValue,0),2);
    const wasteCost=this.round(waste.reduce((sum,x)=>sum+Number(x.cost||0),0),2);
    const theoreticalFoodCost=recipeCosts.length?this.round(recipeCosts.reduce((sum,x)=>sum+x.foodCostPercent,0)/recipeCosts.length,1):0;
    const actualFoodCost=this.round(theoreticalFoodCost+(wasteCost/Math.max(1,inventoryValue))*100,1);
    const critical=enriched.filter(x=>x.risk==="critical");
    const warning=enriched.filter(x=>x.risk==="warning");
    const orderGroups={};
    for(const item of enriched.filter(x=>x.reorderQty>0)){
      const key=item.vendorId||"unassigned";
      orderGroups[key]||={vendorId:key,vendorName:item.vendorName,items:[],total:0};
      const lineTotal=this.round(item.reorderQty*item.unitCost,2);
      orderGroups[key].items.push({inventoryId:item.id,name:item.name,quantity:item.reorderQty,unit:item.unit,unitCost:item.unitCost,lineTotal});
      orderGroups[key].total=this.round(orderGroups[key].total+lineTotal,2);
    }
    const recommendations=[];
    for(const item of critical) recommendations.push({id:`inv_reorder_${item.id}`,type:"reorder",severity:"critical",title:`Reorder ${item.name} now`,reason:`Only ${item.daysRemaining} days remain against a ${item.par} ${item.unit} par.`,impact:`Protect approximately ${Math.round(item.dailyUsage*3)} ${item.unit} of three-day demand.`,inventoryId:item.id,status:"active"});
    if(actualFoodCost>Number(policy.targetFoodCostPercent||29)) recommendations.push({id:"inv_food_cost_gap",type:"margin",severity:"high",title:"Close the food-cost variance",reason:`Actual modeled food cost is ${actualFoodCost}% against a ${policy.targetFoodCostPercent}% target.`,impact:`Recover about $${Math.round((actualFoodCost-policy.targetFoodCostPercent)/100*22400)} per $22.4k sales day.`,status:"active"});
    if(wasteCost>25) recommendations.push({id:"inv_waste_control",type:"waste",severity:"medium",title:"Tighten prep and receiving controls",reason:`Recorded waste is $${wasteCost.toFixed(2)} today.`,impact:"Reduce preventable food loss.",status:"active"});
    if(!recommendations.length) recommendations.push({id:"inv_hold","type":"operations",severity:"low",title:"Maintain current inventory plan",reason:"Stock coverage and modeled food cost are within target.","impact":"Stable product availability.",status:"active"});
    return {
      generatedAt:new Date().toISOString(),locationId,
      summary:{skuCount:enriched.length,inventoryValue,criticalItems:critical.length,warningItems:warning.length,wasteCost,theoreticalFoodCost,actualFoodCost,targetFoodCostPercent:Number(policy.targetFoodCostPercent||29),draftOrderValue:this.round(Object.values(orderGroups).reduce((sum,x)=>sum+x.total,0),2)},
      items:enriched.sort((a,b)=>({critical:0,warning:1,healthy:2}[a.risk]-({critical:0,warning:1,healthy:2}[b.risk]))),
      recipeCosts:recipeCosts.sort((a,b)=>b.foodCostPercent-a.foodCostPercent),
      draftOrders:Object.values(orderGroups),
      recommendations,
      waste:waste.slice().reverse(),
      actions:(db.inventoryActions||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId).slice(-20).reverse(),
      policy
    };
  }
  async act(recommendationId,input,actor,organizationId){
    const record={id:`inventory_action_${Date.now()}`,organizationId,locationId:input.locationId||"loc_marina",recommendationId,decision:input.decision||"approved",note:String(input.note||""),actor,createdAt:new Date().toISOString()};
    await this.database.mutate(db=>{db.inventoryActions||=[];db.purchaseOrders||=[];db.inventoryActions.push(record);if(record.decision==="approved"&&recommendationId.startsWith("inv_reorder_")){const inventoryId=recommendationId.replace("inv_reorder_",""),item=(db.inventoryItems||[]).find(x=>x.id===inventoryId);if(item)db.purchaseOrders.push({id:`po_${Date.now()}`,organizationId,locationId:record.locationId,vendorId:item.vendorId,status:"draft",createdAt:record.createdAt,items:[{inventoryId:item.id,name:item.name,quantity:Math.max(0,item.par-item.onHand),unit:item.unit,unitCost:item.unitCost}]});}return record;});
    await this.auditService.record({organizationId,actor,action:`Inventory recommendation ${record.decision}: ${recommendationId}`,category:"inventory"});
    this.realtimeHub.publish("inventory:action-recorded",record);
    return record;
  }
  async createPurchaseOrder(input,actor,organizationId){
    const order={id:`po_${Date.now()}`,organizationId,locationId:input.locationId||"loc_marina",vendorId:input.vendorId,status:"draft",items:Array.isArray(input.items)?input.items:[],total:Number(input.total||0),createdAt:new Date().toISOString(),createdBy:actor};
    await this.database.insert("purchaseOrders",order);
    await this.auditService.record({organizationId,actor,action:`Draft purchase order created: ${order.id}`,category:"inventory"});
    this.realtimeHub.publish("inventory:purchase-order-created",order);
    return order;
  }
  async updatePolicy(locationId,input,actor,organizationId){
    let result;
    await this.database.mutate(db=>{db.inventoryPolicies||=[];let policy=db.inventoryPolicies.find(x=>x.organizationId===organizationId&&x.locationId===locationId);if(!policy){policy={id:`policy_${locationId}`,organizationId,locationId};db.inventoryPolicies.push(policy);}Object.assign(policy,{targetFoodCostPercent:Number(input.targetFoodCostPercent??policy.targetFoodCostPercent??29),criticalDaysRemaining:Number(input.criticalDaysRemaining??policy.criticalDaysRemaining??1.5),autoDraftOrders:input.autoDraftOrders===undefined?Boolean(policy.autoDraftOrders):Boolean(input.autoDraftOrders),updatedAt:new Date().toISOString()});result=policy;return policy;});
    await this.auditService.record({organizationId,actor,action:"Inventory policy updated",category:"inventory"});
    this.realtimeHub.publish("inventory:policy-updated",result);
    return result;
  }
}
module.exports=InventoryIntelligenceService;
