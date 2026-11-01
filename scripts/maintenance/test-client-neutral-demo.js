"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const {updateDemoLabels, migrateDemoLabels, demoJsonReplacer} = require("../../server/services/demoBranding");
const {WorkingShiftDemoService} = require("../../server/services/workingShiftDemoService");
const Database = require("../../server/services/databaseService");
const Auth = require("../../server/services/authService");
const Audit = require("../../server/services/auditService");
const root=path.resolve(__dirname,"../.."), dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-neutral-demo-"));
(async()=>{try {
 const seed=JSON.parse(fs.readFileSync(path.join(root,"database/seed/seed.json"),"utf8"));
 // Simulate an already-persisted pre-generic demo, including an unrelated tenant.
 const demo=seed.organizations.find(o=>o.id==="org_chefs");demo.name="Chefs International";
 const venue=seed.locations.find(l=>l.id==="loc_marina");venue.name="The Wharfside";
 seed.organizations.push({id:"unrelated",name:"Chefs International"});
 seed.locations.push({id:"unrelated-venue",organizationId:"unrelated",name:"The Wharfside"});
 const manager=seed.users.find(u=>u.id==="usr_sarah");manager.name="Frank Koch";
 const before=structuredClone(seed), count=updateDemoLabels(seed);
 assert(count>0);assert.equal(updateDemoLabels(seed),0);
 assert.equal(demo.name,"Demo Hospitality Group");assert.equal(venue.name,"Demo Restaurant");assert.equal(manager.name,"Demo Manager");
 assert.equal(seed.organizations.at(-1).name,"Chefs International");assert.equal(seed.locations.at(-1).name,"The Wharfside");
 for(const key of ["memberships","sessions","authSecurityStates","tables","reservations"])assert.deepEqual(seed[key],before[key]);
 for(let i=0;i<seed.users.length;i++){assert.equal(seed.users[i].id,before.users[i].id);assert.equal(seed.users[i].email,before.users[i].email);assert.equal(seed.users[i].passwordHash,before.users[i].passwordHash);}
 const historical={id:"org_chefs",actor:"Frank Koch",action:"Wharfside shift reviewed",token:"Frank",email:"unchanged@example.com"};
 const presented=JSON.parse(JSON.stringify(historical,demoJsonReplacer));
 assert.equal(presented.actor,"Demo Manager");assert.equal(presented.action,"Demo Restaurant shift reviewed");
 assert.equal(presented.id,historical.id);assert.equal(presented.token,historical.token);assert.equal(historical.actor,"Frank Koch");
 const dbFile=path.join(dir,"fictional.json");fs.writeFileSync(dbFile,JSON.stringify(before));const db=new Database(dbFile);
 await migrateDemoLabels(db);assert.equal(await migrateDemoLabels(db),0);
 const auth=new Auth(db,new Audit(db));await auth.initializePasswords();
 const login=await auth.login("manager@bluecurrent.demo","Manager23!");assert(login);assert.equal(login.user.name,"Demo Manager");
 assert.equal(await auth.login("frank@bluecurrent.demo","Manager23!"),null);
 assert.equal(auth.can(await auth.authenticate(login.token),"admin"),false);
 assert.equal(await auth.login("manager@bluecurrent.demo","Manager23!","org_blueharbor"),null);
 await auth.logout(login.token);assert.equal(await auth.authenticate(login.token),null);
 const shiftFile=path.join(dir,"shift.json"),shift=new WorkingShiftDemoService(shiftFile),s=shift.initial();
 s.shift.name="Wharfside · sample dinner shift";s.shift.manager="Frank Koch";s.tasks[1].actor="Frank Koch";
 fs.writeFileSync(shiftFile,JSON.stringify(s));const loaded=await shift.snapshot();
 assert.equal(loaded.shift.manager,"Demo Manager");assert.equal(loaded.shift.name,"Demo Restaurant · sample dinner shift");assert.equal(loaded.tasks[1].actor,"Demo Manager");
 assert.deepEqual(loaded.reservations,s.reservations);assert.equal(loaded.version,s.version);
 for(const page of ["manager-command.html","thanksgiving-demo.html","working-shift-demo.html","host-demo.html","pilot-setup.html"]){
  const text=fs.readFileSync(path.join(root,"client",page),"utf8");
  const displayed=text.replace(/(?:href|src|data-destination)="[^"]*"/g,"");
  assert(!/\bfrank\b|\bkoch\b|Chefs International|Wharfside|Harbor Point/i.test(displayed),page);
  for(const match of text.matchAll(/(?:href|src)="(\/[^"?#]+)(?:[?#][^"]*)?"/g))assert(fs.existsSync(path.join(root,"client",match[1])),`${page}: ${match[1]}`);
 }
 console.log("PASS: generic startup migration is scoped and idempotent; credentials, tenant scopes, reservation links and live gates retained; old shift saves and shared routes render neutral labels.");
}finally{fs.rmSync(dir,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1});
