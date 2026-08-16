"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Command=require(path.join(root,"server/services/commandOperatingPictureService"));

(async()=>{
  assert.equal(pkg.version,"76.0.0");

  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
  const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");

  assert(router.includes("/api/command/operating-picture"));
  assert(server.includes("CommandOperatingPictureService"));
  assert(html.includes('id="bcCommandTruth"'));
  assert(html.includes('id="bcAttentionList"'));
  assert(html.includes('id="bcSalesForecast"'));
  assert(shell.includes("fetch(`/api/command/operating-picture"));
  assert(shell.includes('method:"GET"'));
  assert(!shell.includes('method:"POST"'));
  assert(!html.includes('<strong id="bcCmdRevenue">+6.8%</strong>'));
  assert(!html.includes('<strong id="bcCmdGuests">318</strong>'));
  assert(!html.includes('<strong>27</strong><small>Reservations</small>'));

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v76-"));
  const dbPath=path.join(dir,"db.json");
  const now=Date.now();
  fs.writeFileSync(dbPath,JSON.stringify({
    organizations:[{id:"o",name:"Group"}],
    locations:[{id:"l",organizationId:"o",name:"Pilot",capacity:20,timezone:"America/New_York"}],
    configurations:[{id:"cfg",locationId:"l",occupancyThreshold:80,waitThreshold:20,revenueTarget:10000}],
    tables:[
      {id:"t1",organizationId:"o",locationId:"l",status:"seated",partySize:4,seats:4},
      {id:"t2",organizationId:"o",locationId:"l",status:"seated",partySize:4,seats:4},
      {id:"t3",organizationId:"o",locationId:"l",status:"available",partySize:0,seats:4}
    ],
    reservations:[
      {id:"r1",organizationId:"o",locationId:"l",guestName:"VIP Guest",partySize:4,status:"confirmed",vip:true,reservationTime:new Date(now+10*60000).toISOString(),createdAt:new Date(now).toISOString()},
      {id:"r2",organizationId:"o",locationId:"l",guestName:"Guest Two",partySize:2,status:"confirmed",reservationTime:new Date(now+20*60000).toISOString(),createdAt:new Date(now).toISOString()}
    ],
    waitlist:[{id:"w1",organizationId:"o",locationId:"l",status:"waiting",quotedMinutes:30,createdAt:new Date(now).toISOString()}],
    staff:[{id:"s1",organizationId:"o",locationId:"l",status:"active"}],
    kitchenTickets:[
      {id:"k1",organizationId:"o",locationId:"l",priority:"vip",status:"cooking",targetMinutes:18,createdAt:new Date(now).toISOString(),items:[{id:"i",status:"ready"}]}
    ],
    inventoryItems:[
      {id:"inv1",organizationId:"o",locationId:"l",onHand:2,par:10},
      {id:"inv2",organizationId:"o",locationId:"l",onHand:8,par:10}
    ],
    laborPlans:[{id:"lp",organizationId:"o",locationId:"l",date:"2026-08-16",salesForecast:12000,laborBudget:2200,targetLaborPercent:18}]
  },null,2));

  const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
  const result=await new Command(db,{}).snapshot("o",["l"],"l");

  assert.equal(result.dataMode,"live-current");
  assert.equal(result.location.id,"l");
  assert.equal(result.service.activeCovers,8);
  assert.equal(result.service.activeTables,2);
  assert.equal(result.service.occupancyPercent,40);
  assert.equal(result.service.averageQuotedWaitMinutes,30);
  assert.equal(result.service.foodReadyItems,1);
  assert.equal(result.next30Minutes.reservations,2);
  assert.equal(result.next30Minutes.covers,6);
  assert.equal(result.next30Minutes.expectedTurns,null);
  assert.equal(result.financial.salesForecast,12000);
  assert.equal(result.financial.actualRevenue,null);
  assert.equal(result.financial.actualsAvailable,false);
  assert.equal(result.inventory.lowStockItems,1);
  assert(result.attention.some(x=>x.domain==="kitchen"));
  assert(result.attention.some(x=>x.domain==="guests"));
  assert(result.attention.some(x=>x.domain==="inventory"));
  assert.equal(result.truth.syntheticCommandMetrics,false);
  assert.equal(result.truth.revenueActualNotInvented,true);
  assert.equal(result.truth.expectedTurnsNotInvented,true);

  await assert.rejects(
    ()=>new Command(db,{}).snapshot("o",["l"],"unknown"),
    error=>error.statusCode===404
  );

  console.log(JSON.stringify({
    ok:true,version:"76.0.0",
    realPersistedOperatingPicture:true,
    authorizedLocationScope:true,
    activeCoversDerived:true,
    occupancyDerived:true,
    waitDerived:true,
    kitchenDerived:true,
    next30MinutesDerived:true,
    inventoryDerived:true,
    ruleBasedAttention:true,
    historicalDataDisclosure:true,
    revenueActualInvented:false,
    expectedTurnsInvented:false,
    commandApiReadOnly:true
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
