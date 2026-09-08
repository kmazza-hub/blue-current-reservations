"use strict";
function val(p,...keys){for(const k of keys)if(p?.[k]!==undefined&&p?.[k]!==null)return p[k];}
module.exports={id:"clover",name:"Clover",provider:"Clover",sourceType:"pos",status:"contract-ready",authentication:"provider merchant access token",
 capabilities:["orders.read","payments.read","menu.read","inventory.read"],
 normalize(raw={}){const kind=String(raw.kind||raw.eventType||raw.type||"").toLowerCase(),p=raw.payload&&typeof raw.payload==="object"?raw.payload:raw;
 let type;if(kind.includes("payment"))type="payment.recorded";else if(kind.includes("inventory")||kind.includes("item"))type="inventory.level.updated";else if(kind.includes("order")&&kind.includes("closed"))type="order.closed";else if(kind.includes("order"))type="order.updated";else throw new Error(`Clover adapter does not map event type: ${kind||"(missing)"}`);
 const locationId=val(p,"locationId","merchantId","merchant_id");const payload={
 "payment.recorded":{locationId,paymentId:val(p,"paymentId","id"),orderId:val(p,"orderId","order_id"),amount:p.amount,tip:p.tipAmount,status:p.status,paidAt:p.createdTime},
 "inventory.level.updated":{locationId,itemId:val(p,"itemId","id"),quantity:val(p,"quantity","stockCount"),unit:p.unit,cost:p.cost},
 "order.updated":{locationId,orderId:val(p,"orderId","id"),employeeId:val(p,"employeeId","employee_id"),guestCount:p.guestCount,items:val(p,"items","lineItems"),total:p.total,status:p.status},
 "order.closed":{locationId,orderId:val(p,"orderId","id"),employeeId:val(p,"employeeId","employee_id"),guestCount:p.guestCount,items:val(p,"items","lineItems"),total:p.total,tax:p.tax,tip:p.tip,closedAt:p.closedAt,payments:p.payments}
 }[type];return {type,payload,sourceEventId:String(val(raw,"eventId","id")||"")||null,occurredAt:val(raw,"occurredAt","timestamp")||null};}
};