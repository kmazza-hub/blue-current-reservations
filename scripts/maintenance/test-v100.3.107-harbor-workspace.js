"use strict";
const assert=require("assert/strict"),fs=require("fs"),os=require("os"),path=require("path"),crypto=require("crypto"),{spawn}=require("child_process");
const root=path.resolve(__dirname,"../.."),read=p=>fs.readFileSync(path.join(root,p),"utf8"),pkg=JSON.parse(read("package.json"));
assert(["100.3.107","100.3.108","100.3.109","100.3.110","100.3.111"].includes(pkg.version));const html=read("client/harbor-point.html"),js=read("client/harbor-point-workspace-v100.3.107.js"),css=read("client/harbor-point-workspace-v100.3.107.css"),app=read("client/index.html");
for(const label of ["Book","Arrivals","Floor","Manager"])assert(html.includes(label));
assert(html.includes('id="loginForm"')&&html.includes('id="signOut"'));
assert(app.includes('data-destination="/harbor-point.html"'));
assert(app.includes(`js/harbor-point-operations-v100.3.106.js?v=${pkg.version}`));
assert(js.includes('data-job="manager"')&&js.includes('me.permissions.includes("write")'));
assert(css.includes('@media(max-width:440px)'));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-harbor-107-")),primary=path.join(dir,"primary.json"),seed=JSON.parse(read("database/seed/seed.json")),port=23000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;
seed.users.push({...seed.users.find(u=>u.id==="usr_keith"),id:"usr_harbor_test",name:"Demo Host",email:"host@bluecurrent.demo",role:"host"});seed.memberships.push({id:"m_harbor_test",userId:"usr_harbor_test",organizationId:"org_chefs",role:"host",locationIds:["loc_marina"]});fs.writeFileSync(primary,JSON.stringify(seed));let server;
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function start(){server=spawn(process.execPath,[path.join(root,"server/server.js")],{cwd:root,env:{...process.env,PORT:String(port),BLUE_CURRENT_DB:primary,BLUE_CURRENT_HARBOR_DEMO_DB:path.join(dir,"demo.json")},stdio:"ignore"});for(let i=0;i<150;i++){try{if((await fetch(base+"/api/health")).ok)return;}catch{}await pause(100);}throw Error("Server did not start");}
async function call(p,token,body){const response=await fetch(base+p,{method:body?"POST":"GET",headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body?{"Content-Type":"application/json","X-Blue-Current-Idempotency-Key":crypto.randomUUID()}:{})},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json().catch(()=>null)};}
(async()=>{try{await start();const page=await fetch(base+"/harbor-point.html");assert.equal(page.status,200);assert((await page.text()).includes("Holiday rehearsal"));
const host=await call("/api/auth/login",null,{email:"host@bluecurrent.demo",password:"BlueCurrent23!"});assert.equal(host.status,200);const token=host.data.token;
assert.equal((await call("/api/harbor-point-demo",token)).status,200);assert.equal((await call("/api/harbor-point-demo/manager",token)).status,403);
const owner=await call("/api/auth/login",null,{email:"keith@bluecurrent.demo",password:"BlueCurrent23!"});assert.equal(owner.status,200);const manager=await call("/api/harbor-point-demo/manager",owner.data.token);assert.equal(manager.status,200);assert.equal(manager.data.readiness,"HOLD");assert(manager.data.awaiting.length>=6);
const booking=await call("/api/harbor-point-demo/reservations",token,{version:0,guestName:"Demo Host Party",phone:"732-555-0109",partySize:2,holidayEvent:"Thanksgiving",time:"18:00"});assert.equal(booking.status,201);assert.equal((await call("/api/harbor-point-demo",owner.data.token)).data.reservations.length,1);
console.log("V100.3.107 dedicated host workspace passed: page, host booking, manager denial, manager oversight, shared state.");
}finally{if(server&&server.exitCode===null){server.kill();await Promise.race([new Promise(r=>server.once("exit",r)),pause(3000)]);}fs.rmSync(dir,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1});
