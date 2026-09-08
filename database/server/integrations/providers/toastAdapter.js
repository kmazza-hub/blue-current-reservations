"use strict";
function val(p,...keys){for(const k of keys)if(p?.[k]!==undefined&&p?.[k]!==null)return p[k];return undefined;}
module.exports={
 id:"toast",name:"Toast",provider:"Toast",sourceType:"pos",status:"contract-ready",
 authentication:"provider-issued server credentials",
 capabilities:["orders.read","payments.read","menu.read","inventory.read","labor.read","kitchen.read"],
 normalize(raw={}){
   const kind=String(raw.kind||raw.eventType||raw.type||"").toLowerCase();
   const p=raw.payload&&typeof raw.payload==="object"?raw.payload:raw;
   let type;
   if(["order.closed","check.closed","closed"].includes(kind))type="order.closed";
   else if(["order.opened","opened"].includes(kind))type="order.opened";
   else if(["order.updated","updated"].includes(kind))type="order.updated";
   else if(["menu.item.upserted","menu_item"].includes(kind))type="menu.item.upserted";
   else if(["inventory.level.updated","stock.updated"].includes(kind))type="inventory.level.updated";
   else if(["employee.upserted","employee.updated"].includes(kind))type="employee.upserted";
   else if(["shift.started","clocked.in"].includes(kind))type="shift.started";
   else if(["shift.ended","clocked.out"].includes(kind))type="shift.ended";
   else if(["kitchen.ticket.updated","ticket.updated"].includes(kind))type="kitchen.ticket.updated";
   else if(["payment.recorded","payment"].includes(kind))type="payment.recorded";
   else throw new Error(`Toast adapter does not map event type: ${kind||"(missing)"}`);
   const common={locationId:val(p,"locationId","restaurantGuid","restaurantId","locationGuid")};
   const map={
    "order.opened":{...common,orderId:val(p,"orderId","guid","id"),checkId:val(p,"checkId","checkGuid"),tableId:val(p,"tableId","tableGuid"),employeeId:val(p,"employeeId","serverGuid"),guestCount:val(p,"guestCount","covers"),openedAt:val(p,"openedAt","createdAt"),items:p.items,subtotal:p.subtotal,tax:p.tax,total:p.total},
    "order.updated":{...common,orderId:val(p,"orderId","guid","id"),checkId:val(p,"checkId","checkGuid"),tableId:val(p,"tableId","tableGuid"),employeeId:val(p,"employeeId","serverGuid"),guestCount:val(p,"guestCount","covers"),items:p.items,subtotal:p.subtotal,tax:p.tax,total:p.total,status:p.status},
    "order.closed":{...common,orderId:val(p,"orderId","guid","id"),checkId:val(p,"checkId","checkGuid"),tableId:val(p,"tableId","tableGuid"),employeeId:val(p,"employeeId","serverGuid"),guestCount:val(p,"guestCount","covers"),items:p.items,subtotal:p.subtotal,tax:p.tax,tip:p.tip,total:val(p,"total","checkTotal","amount"),discount:p.discount,closedAt:val(p,"closedAt","paidAt"),payments:p.payments},
    "menu.item.upserted":{...common,itemId:val(p,"itemId","guid","id"),name:p.name,groupId:val(p,"groupId","menuGroupGuid"),price:p.price,active:p.active,sku:p.sku,modifiers:p.modifiers},
    "inventory.level.updated":{...common,itemId:val(p,"itemId","guid","id"),quantity:val(p,"quantity","onHand"),unit:p.unit,available:p.available,cost:p.cost},
    "employee.upserted":{...common,employeeId:val(p,"employeeId","guid","id"),firstName:p.firstName,lastName:p.lastName,role:val(p,"role","jobTitle"),jobId:val(p,"jobId","jobGuid"),active:p.active,hourlyRate:p.hourlyRate},
    "shift.started":{...common,employeeId:val(p,"employeeId","employeeGuid"),shiftId:val(p,"shiftId","guid","id"),jobId:val(p,"jobId","jobGuid"),role:p.role,startedAt:val(p,"startedAt","clockIn"),hourlyRate:p.hourlyRate},
    "shift.ended":{...common,employeeId:val(p,"employeeId","employeeGuid"),shiftId:val(p,"shiftId","guid","id"),jobId:val(p,"jobId","jobGuid"),role:p.role,startedAt:val(p,"startedAt","clockIn"),endedAt:val(p,"endedAt","clockOut"),regularHours:p.regularHours,overtimeHours:p.overtimeHours},
    "kitchen.ticket.updated":{...common,ticketId:val(p,"ticketId","guid","id"),orderId:val(p,"orderId","orderGuid"),tableId:val(p,"tableId","tableGuid"),stationId:val(p,"stationId","stationGuid"),status:p.status,items:p.items,firedAt:p.firedAt,completedAt:p.completedAt,durationSeconds:p.durationSeconds},
    "payment.recorded":{...common,paymentId:val(p,"paymentId","guid","id"),orderId:val(p,"orderId","orderGuid"),checkId:val(p,"checkId","checkGuid"),amount:val(p,"amount","total"),type:p.type,tip:p.tip,status:p.status,paidAt:p.paidAt}
   };
   return {type,payload:map[type],sourceEventId:String(val(raw,"sourceEventId","eventId","id")||"" )||null,occurredAt:val(raw,"occurredAt","timestamp","createdAt")||null};
 }
};