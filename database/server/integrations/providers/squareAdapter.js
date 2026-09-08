"use strict";
function val(p,...keys){for(const k of keys)if(p?.[k]!==undefined&&p?.[k]!==null)return p[k];}
module.exports={id:"square",name:"Square",provider:"Square",sourceType:"pos",status:"contract-ready",authentication:"provider OAuth/access token",
 capabilities:["orders.read","orders.webhook","payments.read","menu.read","inventory.read","inventory.webhook","labor.read","labor.webhook"],
 normalize(raw={}){const kind=String(raw.kind||raw.eventType||raw.type||"").toLowerCase(),p=raw.payload&&typeof raw.payload==="object"?raw.payload:raw;
 let type;if(kind.includes("payment"))type="payment.recorded";else if(kind.includes("inventory"))type="inventory.level.updated";else if(kind.includes("catalog"))type="menu.item.upserted";else if(kind.includes("shift")&&kind.includes("end"))type="shift.ended";else if(kind.includes("shift"))type="shift.started";else if(kind.includes("order")&&kind.includes("closed"))type="order.closed";else if(kind.includes("order"))type="order.updated";else throw new Error(`Square adapter does not map event type: ${kind||"(missing)"}`);
 const locationId=val(p,"locationId","location_id");const payload={
 "payment.recorded":{locationId,paymentId:val(p,"paymentId","payment_id","id"),orderId:val(p,"orderId","order_id"),amount:val(p,"amount","amountMoney","total"),tip:p.tip,status:p.status,paidAt:val(p,"paidAt","created_at")},
 "inventory.level.updated":{locationId,itemId:val(p,"itemId","catalog_object_id","variationId"),quantity:val(p,"quantity","count"),unit:p.unit,available:p.available},
 "menu.item.upserted":{locationId,itemId:val(p,"itemId","catalog_object_id","id"),name:p.name,price:p.price,active:p.active,sku:p.sku},
 "shift.started":{locationId,employeeId:val(p,"employeeId","team_member_id"),shiftId:val(p,"shiftId","id"),jobId:val(p,"jobId","job_id"),startedAt:val(p,"startedAt","start_at"),hourlyRate:p.hourlyRate},
 "shift.ended":{locationId,employeeId:val(p,"employeeId","team_member_id"),shiftId:val(p,"shiftId","id"),jobId:val(p,"jobId","job_id"),startedAt:val(p,"startedAt","start_at"),endedAt:val(p,"endedAt","end_at"),regularHours:p.regularHours,overtimeHours:p.overtimeHours},
 "order.updated":{locationId,orderId:val(p,"orderId","order_id","id"),guestCount:p.guestCount,items:p.items,total:p.total,status:p.status},
 "order.closed":{locationId,orderId:val(p,"orderId","order_id","id"),guestCount:p.guestCount,items:p.items,total:val(p,"total","totalMoney"),tax:p.tax,tip:p.tip,closedAt:p.closedAt}
 }[type];return {type,payload,sourceEventId:String(val(raw,"eventId","id")||"")||null,occurredAt:val(raw,"occurredAt","created_at")||null};}
};