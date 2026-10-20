"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),{spawn}=require("node:child_process");
const root=path.resolve(__dirname,"../.."),dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-working-shift-api-")),primary=path.join(dir,"primary.json"),port=31000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;
const seed=JSON.parse(fs.readFileSync(path.join(root,"database/seed/seed.json"))),manager=seed.users.find(u=>u.id==="usr_sarah");
for(const [id,role,org] of [["shift_host","host","org_chefs"],["shift_cook","kitchen_manager","org_chefs"],["shift_other","owner","org_blueharbor"]]){
 seed.users.push({...manager,id,name:"Fictional API Role",email:`${id}@bluecurrent.demo`,organizationId:org,role});
 seed.memberships.push({id:`m_${id}`,userId:id,organizationId:org,role,locationIds:["*"]});
}
fs.writeFileSync(primary,JSON.stringify(seed));
let child,logs="";const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function call(url,token,method="GET",body){const response=await fetch(base+url,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()};}
async function start(){child=spawn(process.execPath,[path.join(root,"server/server.js")],{cwd:root,env:{...process.env,PORT:String(port),BLUE_CURRENT_DB:primary,BLUE_CURRENT_HARBOR_DEMO_DB:path.join(dir,"holiday-demo.json"),BLUE_CURRENT_MANAGED_BACKUPS:"false"},stdio:["ignore","pipe","pipe"]});child.stdout.on("data",c=>{logs+=c;});child.stderr.on("data",c=>{logs+=c;});for(let i=0;i<150;i++){if(child.exitCode!==null)throw Error(logs.slice(-1800));try{if((await call("/api/health")).status===200)return;}catch{}await pause(100);}throw Error("Test startup timed out");}
async function stop(){if(child&&child.exitCode===null){const exited=new Promise(r=>child.once("exit",r));child.kill("SIGTERM");let timeout;try{await Promise.race([exited,new Promise((_,reject)=>{timeout=setTimeout(()=>{child.kill("SIGKILL");reject(Error("Shutdown timed out"));},12000);})]);}finally{clearTimeout(timeout);}}}
(async()=>{try{
 await start();
 const endpoint="/api/working-shift-demo";
 assert.equal((await call(endpoint)).status,401);assert.equal((await call(endpoint,null,"POST",{action:"reset"})).status,401);
 const login=async email=>{const result=await call("/api/auth/login",null,"POST",{email,password:"Manager23!"});assert.equal(result.status,200);return result.data.token;};
 const frank=await login("frank@bluecurrent.demo"),host=await login("shift_host@bluecurrent.demo"),cook=await login("shift_cook@bluecurrent.demo"),other=await login("shift_other@bluecurrent.demo");
 const state=async token=>(await call(endpoint,token)).data;
 const action=async(token,body)=>call(endpoint,token,"POST",{...body,version:(await state(token)).version});
 const first=await state(frank);assert.equal(first.mode,"FICTIONAL_DEMO_ONLY");
 assert.equal((await action(host,{action:"reset",confirmation:"RESET FICTIONAL SHIFT"})).status,403);
 assert.equal((await action(host,{action:"ticket_ready",ticketId:"shift_ticket_0"})).status,403);
 assert.equal((await action(cook,{action:"arrive",reservationId:"shift_guest_5"})).status,403);
 assert.equal((await action(frank,{action:"task",taskId:"runner"})).status,200);
 assert.equal((await state(other)).tasks.find(t=>t.id==="runner").done,false);
 assert.equal((await action(host,{action:"arrive",reservationId:"shift_guest_5"})).status,200);
 assert.equal((await action(cook,{action:"ticket_ready",ticketId:"shift_ticket_0"})).status,200);
 assert.equal((await call("/api/harbor-point-demo",frank)).data.reservations.length,0);
 assert.equal((await call("/api/harbor-point-live",frank)).data.readiness,"HOLD");
 const after=JSON.parse(fs.readFileSync(primary));
 for(const key of ["reservations","tables","staff","inventoryItems","orders","kitchenTickets","locations","organizations","users","memberships"])assert.deepEqual(after[key],seed[key],`primary ${key} changed`);
 const version=(await state(frank)).version;
 assert.equal((await call(endpoint,frank,"POST",{action:"sync",version:version-1})).status,412);
 assert.equal((await state(frank)).version,version);
 await stop();await start();
 assert.equal((await state(frank)).version,version);
 assert.equal((await state(frank)).tasks.find(t=>t.id==="runner").done,true);
 assert.equal((await call("/api/auth/logout",frank,"POST",{})).status,200);
 assert.equal((await call(endpoint,frank)).status,401);
 const landing=await fetch(base+"/");assert.equal(landing.status,200);const landingHtml=await landing.text();assert(landingHtml.includes("FICTIONAL WORKING DEMO"));assert(landingHtml.includes('href="/index.html"'));assert(landingHtml.includes('src="/working-shift-demo.js'));
 const platform=await fetch(base+"/index.html");assert.equal(platform.status,200);assert((await platform.text()).includes('id="blueCurrentCommand"'));
 const page=await fetch(base+"/working-shift-demo.html");assert.equal(page.status,200);assert((await page.text()).includes("FICTIONAL WORKING DEMO"));
 console.log("V100.3.118 working shift API passed: auth, roles, org isolation, primary/demo isolation, HOLD, stale writes, restart and sign-out.");
}finally{await stop();fs.rmSync(dir,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1});
