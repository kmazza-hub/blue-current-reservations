"use strict";
const fs=require("fs"),path=require("path");
let pass=0,total=0;
function ok(c,m){total++;if(c){pass++;console.log("PASS:",m)}else{console.error("FAIL:",m);process.exitCode=1}}
(async()=>{
 const f=path.join(process.cwd(),"server/services/inventoryIntelligenceService.js");
 ok(fs.existsSync(f),"inventory service exists");
 const src=fs.readFileSync(f,"utf8");
 ok(src.includes('uniqueId(prefix)'),"collision-resistant identity remains active");
 ok(src.includes('finiteNumber(value,label'),"numeric integrity guard remains active");
 const S=require(f);
 const data={
  locations:[{id:"loc_a",organizationId:"org_a"},{id:"loc_b",organizationId:"org_a"},{id:"loc_x",organizationId:"org_x"}],
  vendors:[{id:"v_a",organizationId:"org_a"},{id:"v_x",organizationId:"org_x"}],
  inventoryItems:[
   {id:"i_a",organizationId:"org_a",locationId:"loc_a",name:"Tomatoes",onHand:2,par:10,dailyUsage:2,unitCost:1,unit:"lb",vendorId:"v_a"},
   {id:"i_b",organizationId:"org_a",locationId:"loc_b",name:"Cheese",onHand:20,par:10,dailyUsage:2,unitCost:2,unit:"lb",vendorId:"v_a"},
   {id:"i_x",organizationId:"org_x",locationId:"loc_x",name:"Secret",onHand:1,par:8,dailyUsage:1,unitCost:5,unit:"ea",vendorId:"v_x"}],
  purchaseOrders:[],inventoryActions:[],inventoryPolicies:[],recipes:[],kitchenTickets:[],wasteEvents:[]
 };
 const db={data,async read(){return this.data},async get(c,id){return(this.data[c]||[]).find(x=>x.id===id)||null},async insert(c,r){this.data[c]||=[];this.data[c].push(r);return r},async mutate(fn){return fn(this.data)}};
 const events=[],audits=[];
 const s=new S(db,{async record(x){audits.push(x)}},{publish(n,p){events.push({n,p})}});
 const snapA=await s.snapshot("org_a","loc_a"),snapB=await s.snapshot("org_a","loc_b");
 ok(snapA.items.length===1&&snapA.items[0].id==="i_a","location A snapshot isolated");
 ok(snapB.items.length===1&&snapB.items[0].id==="i_b","location B snapshot isolated");
 ok(!snapA.items.some(x=>x.organizationId==="org_x"),"organization boundary preserved in snapshot");
 ok(snapA.items[0].reorderQty===8,"below-par truth calculated from recorded on-hand/par");
 ok(snapB.items[0].reorderQty===0,"healthy item does not create false below-par quantity");
 const old=Date.now;Date.now=()=>777;
 const orders=await Promise.all(Array.from({length:12},(_,i)=>s.createPurchaseOrder({locationId:i%2?"loc_a":"loc_b",vendorId:"v_a",items:[],total:i},"mgr","org_a")));
 Date.now=old;
 ok(new Set(orders.map(x=>x.id)).size===12,"12 same-millisecond purchase orders have unique IDs");
 ok(orders.filter(x=>x.locationId==="loc_a").length===6&&orders.filter(x=>x.locationId==="loc_b").length===6,"rapid purchase orders retain location ownership");
 const old2=Date.now;Date.now=()=>888;
 const acts=await Promise.all(Array.from({length:12},(_,i)=>s.act("inv_hold",{locationId:i%2?"loc_a":"loc_b",decision:"held",note:String(i)},"mgr","org_a")));
 Date.now=old2;
 ok(new Set(acts.map(x=>x.id)).size===12,"12 same-millisecond inventory actions have unique IDs");
 ok(acts.every(x=>x.organizationId==="org_a"),"rapid actions retain organization ownership");
 ok(acts.filter(x=>x.locationId==="loc_a").length===6&&acts.filter(x=>x.locationId==="loc_b").length===6,"rapid actions retain location ownership");
 let rejected=0;
 for(const bad of [NaN,Infinity,-1,"bad"]){try{await s.createPurchaseOrder({locationId:"loc_a",items:[{quantity:bad}],total:0},"mgr","org_a")}catch(e){if(e.statusCode===400)rejected++}}
 ok(rejected===4,"invalid/negative purchase quantities rejected under stress");
 let cross=false;try{await s.createPurchaseOrder({locationId:"loc_a",vendorId:"v_x",items:[],total:0},"mgr","org_a")}catch(e){cross=e.statusCode===400}
 ok(cross,"cross-organization vendor rejected");
 let crossItem=false;try{await s.createPurchaseOrder({locationId:"loc_a",items:[{inventoryId:"i_b",quantity:1}],total:1},"mgr","org_a")}catch(e){crossItem=e.statusCode===400}
 ok(crossItem,"cross-location inventory item rejected");
 ok(events.filter(e=>e.n==="inventory:purchase-order-created").length===12,"purchase-order realtime events remain one-per-successful-order");
 ok(events.filter(e=>e.n==="inventory:action-recorded").length===12,"inventory-action realtime events remain one-per-successful-action");
 ok(audits.length===24,"audit stream records all successful rush mutations");
 ok(src.includes("async snapshot(")&&src.includes("async act(")&&src.includes("async createPurchaseOrder("),"inventory public lifecycle preserved");
 ok(!src.includes("setInterval("),"no polling interval introduced");
 ok(!src.includes("MutationObserver"),"no observer introduced");
 ok(!src.includes("setTimeout("),"no timeout loop introduced");
 console.log(`V100.2.83 validation ${pass}/${total}`);
 if(pass!==total)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});