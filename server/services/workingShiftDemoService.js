"use strict";
const { HarborPointDemoService } = require("./harborPointDemoService");
const fail = (message, statusCode = 409) => { throw Object.assign(new Error(message), { statusCode }); };
class WorkingShiftDemoService extends HarborPointDemoService {
  initial() {
    const s = super.initial();
    s.shift = { name: "Wharfside · sample dinner shift", date: "2026-11-26", manager: "Frank Koch", venueApproved: false };
    s.team = [
      {id:"lead",name:"Demo Taylor",role:"Host lead",status:"working",section:"Welcome"},
      {id:"avery",name:"Demo Avery",role:"Server",status:"working",section:"Inlet Room"},
      {id:"jordan",name:"Demo Jordan",role:"Server",status:"working",section:"Sunset Ballroom"},
      {id:"casey",name:"Demo Casey",role:"Cook",status:"working",section:"Hot line"},
      {id:"morgan",name:"Demo Morgan",role:"Expo",status:"break",section:"Pass"},
      {id:"riley",name:"Demo Riley",role:"Runner",status:"scheduled",section:"Dining room"}
    ];
    s.inventory = [
      {id:"fish",name:"Sample fish portions",unit:"portions",opening:24,par:12},
      {id:"chowder",name:"Sample chowder",unit:"bowls",opening:14,par:12},
      {id:"salad",name:"Sample salad",unit:"portions",opening:20,par:10},
      {id:"fries",name:"Sample fries",unit:"portions",opening:30,par:14}
    ];
    s.menu = [
      {id:"fish",name:"Sample fish plate",cents:2800,recipe:{fish:1,fries:1}},
      {id:"chowder",name:"Sample chowder",cents:1200,recipe:{chowder:1}},
      {id:"salad",name:"Sample salad",cents:1600,recipe:{salad:1}}
    ];
    s.receipts = []; s.tickets = []; s.payments = [];
    const rows = [
      ["Demo Parker",2,"seated","I01","cooking","fish"],
      ["Demo Ellis",3,"seated","I02","ready","chowder"],
      ["Demo Brooks",4,"seated","S01","served","fish"],
      ["Demo Quinn",2,"arrived",null,null,null],
      ["Demo Reese",3,"waiting",null,null,null],
      ["Demo Lane",4,"confirmed",null,null,null],
      ["Demo Blake",2,"confirmed",null,null,null],
      ["Demo Drew",3,"completed","S02","served","chowder"],
      ["Demo Sage",2,"completed","S03","served","fish"],
      ["Demo Rowan",4,"completed","S04","served","salad"]
    ];
    rows.forEach(([name,size,status,tableId,ticketStatus,menuId],i) => {
      const r = {id:`shift_guest_${i}`,guestName:name,phone:`73255501${String(i+10).padStart(2,"0")}`,partySize:size,status,tableId,
        holidayEvent:"Thanksgiving",date:s.shift.date,time:i<5?"17:30":"18:00",notes:i===3?"Demo birthday · offer a warm welcome":"",createdAt:"2026-11-26T21:00:00Z"};
      s.reservations.push(r);
      if(tableId && status==="seated") Object.assign(s.tables.find(t=>t.id===tableId),{status:"seated",reservationId:r.id});
      if(i===7) Object.assign(s.tables.find(t=>t.id===tableId),{status:"cleaning",reservationId:r.id});
      if(ticketStatus) {
        const ticket={id:`shift_ticket_${i}`,reservationId:r.id,tableId,status:ticketStatus,menuId,quantity:size,serverId:tableId[0]==="I"?"avery":"jordan"};
        s.tickets.push(ticket);
        if(status==="completed") s.payments.push({id:`shift_payment_${i}`,reservationId:r.id,cents:s.menu.find(m=>m.id===menuId).cents*size,kind:"simulated",at:"2026-11-26T22:00:00Z"});
      }
    });
    s.tasks = [{id:"brief",title:"Confirm the sample shift briefing",done:true},{id:"runner",title:"Bring the sample runner onto the floor",done:false},{id:"stock",title:"Review chowder stock before the next wave",done:false}];
    s.events = [{id:"opening",at:"2026-11-26T21:00:00Z",actor:"Demo shift",text:"Fictional dinner loaded. All tables, staff, menu, and service policies are illustrative."}];
    s.integration = {simulations:0,lastAt:null};
    return s;
  }
  stock(s) {
    return s.inventory.map(item=>{
      const used=s.tickets.filter(t=>t.status==="served").reduce((sum,t)=>sum+(s.menu.find(m=>m.id===t.menuId)?.recipe[item.id]||0)*t.quantity,0);
      const received=s.receipts.filter(r=>r.itemId===item.id).reduce((sum,r)=>sum+r.quantity,0);
      return {...item,used,received,onHand:item.opening+received-used};
    });
  }
  async snapshot() {
    const s=await super.snapshot(),stock=this.stock(s),active=s.reservations.filter(r=>r.status==="seated");
    s.stock=stock;
    s.metrics={bookings:s.reservations.length,arrivals:s.reservations.filter(r=>["arrived","waiting"].includes(r.status)).length,
      covers:active.reduce((n,r)=>n+r.partySize,0),occupied:active.length,tables:s.tables.length,
      occupancy:Math.round(active.length/s.tables.length*100),completed:s.reservations.filter(r=>r.status==="completed").length,
      sampleSalesCents:s.payments.reduce((n,p)=>n+p.cents,0),working:s.team.filter(p=>p.status==="working").length,
      ready:s.tickets.filter(t=>t.status==="ready").length,cooking:s.tickets.filter(t=>t.status==="cooking").length,
      lowStock:stock.filter(i=>i.onHand<i.par).length,tasksOpen:s.tasks.filter(t=>!t.done).length};
    return s;
  }
  async operate(input,actor="Demo operator") {
    if(input.action==="book") return this.create(input);
    return this.change(input.version,s=>{
      const row=s.reservations.find(r=>r.id===input.reservationId),table=s.tables.find(t=>t.id===input.tableId),ticket=s.tickets.find(t=>t.id===input.ticketId);
      let text;
      switch(input.action) {
        case "arrive": if(row?.status!=="confirmed")fail("Choose a confirmed party."); row.status="arrived";text=`${row.guestName} arrived`;break;
        case "wait": if(row?.status!=="arrived")fail("Choose an arrived party.");row.status="waiting";text=`${row.guestName} joined the sample waitlist`;break;
        case "cancel": if(!row||!["confirmed","arrived","waiting"].includes(row.status))fail("Only an unseated party can be cancelled.");row.status="cancelled";text=`${row.guestName} cancelled`;break;
        case "seat": {
          if(!row||!["arrived","waiting"].includes(row.status)||!table||table.status!=="available"||table.seats<row.partySize)fail("Choose an available sample table that fits this arrived party.");
          const server=s.team.find(p=>p.id===input.serverId&&p.role==="Server"&&p.status==="working"),menu=s.menu.find(m=>m.id===input.menuId);
          if(!server||!menu)fail("Choose a working demo server and sample menu item.");
          row.status="seated";row.tableId=table.id;table.status="seated";table.reservationId=row.id;
          s.tickets.push({id:`ticket_${s.version}_${row.id}`,reservationId:row.id,tableId:table.id,serverId:server.id,menuId:menu.id,quantity:row.partySize,status:"cooking"});
          text=`${row.guestName} seated at ${table.id}; sample kitchen ticket created`;break;
        }
        case "ticket_ready": if(ticket?.status!=="cooking")fail("Choose a cooking ticket.");ticket.status="ready";text=`${ticket.tableId} sample food is ready`;break;
        case "serve": {
          if(ticket?.status!=="ready")fail("Choose a ready ticket.");
          const recipe=s.menu.find(m=>m.id===ticket.menuId).recipe,stock=this.stock(s);
          if(Object.entries(recipe).some(([id,qty])=>stock.find(i=>i.id===id).onHand<qty*ticket.quantity))fail("Insufficient sample stock. Receive demo stock first.");
          ticket.status="served";text=`${ticket.tableId} served; sample stock updated`;break;
        }
        case "complete": {
          if(row?.status!=="seated")fail("Choose a seated party.");
          const order=s.tickets.find(t=>t.reservationId===row.id),linked=s.tables.find(t=>t.id===row.tableId&&t.reservationId===row.id);
          if(!linked||order?.status!=="served")fail("Serve the sample order before completing service.");
          row.status="completed";linked.status="cleaning";
          s.payments.push({id:`payment_${row.id}`,reservationId:row.id,cents:s.menu.find(m=>m.id===order.menuId).cents*order.quantity,kind:"simulated",at:new Date().toISOString()});
          text=`${row.guestName} completed; sample sale recorded; ${linked.id} needs cleaning`;break;
        }
        case "clean": if(table?.status!=="cleaning")fail("Choose a cleaning table.");table.status="available";table.reservationId=null;text=`${table.id} cleaned and available`;break;
        case "team": {
          const person=s.team.find(p=>p.id===input.staffId);if(!person)fail("Unknown demo team member.",404);
          if(!["working","break","scheduled"].includes(input.status))fail("Invalid demo attendance state.",400);
          if(input.status!=="working"&&s.tickets.some(t=>t.serverId===person.id&&s.reservations.some(r=>r.id===t.reservationId&&r.status==="seated")))fail("Finish this server's active parties before changing attendance.");
          person.status=input.status;text=`${person.name} is ${person.status}`;break;
        }
        case "receive": {
          if(!s.inventory.some(i=>i.id===input.itemId)||!Number.isInteger(Number(input.quantity))||Number(input.quantity)<1||Number(input.quantity)>50)fail("Choose sample stock and 1–50 units.",400);
          s.receipts.push({itemId:input.itemId,quantity:Number(input.quantity),at:new Date().toISOString()});text=`Received ${input.quantity} fictional stock units`;break;
        }
        case "task": {const task=s.tasks.find(t=>t.id===input.taskId);if(!task||task.done)fail("Choose an open execution task.");task.done=true;task.actor=actor;text=task.title;break;}
        case "sync": s.integration.simulations++;s.integration.lastAt=new Date().toISOString();text="Sample connector round trip simulated; no external system contacted";break;
        case "reset": {
          if(input.confirmation!=="RESET FICTIONAL SHIFT")fail("Confirm the fictional shift reset.",400);
          const version=s.version;Object.assign(s,this.initial(),{version});text="Fictional shift restored to the starting scenario";break;
        }
        default: fail("Unknown demo action.",400);
      }
      s.events.unshift({id:`event_${s.version}`,at:new Date().toISOString(),actor,text});s.events=s.events.slice(0,100);
      return {action:input.action,message:text};
    });
  }
}
module.exports={WorkingShiftDemoService};
