"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm"),root=path.resolve(__dirname,"../..");
let passed=0;
const check=(name,ok)=>{if(!ok)throw new Error(`FAIL: ${name}`);passed+=1;console.log(`PASS: ${name}`);};
class MemoryStorage{
  constructor(){this.values=new Map();}
  getItem(key){return this.values.has(key)?this.values.get(key):null;}
  setItem(key,value){this.values.set(key,String(value));}
  removeItem(key){this.values.delete(key);}
}
class TestCustomEvent extends Event{constructor(type,options={}){super(type);this.detail=options.detail;}}
(async()=>{
  const localStorage=new MemoryStorage(),requests=[];
  const context={
    Event,EventTarget,CustomEvent:TestCustomEvent,localStorage,
    structuredClone,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,
    fetch:async(url,options={})=>{
      requests.push({url:String(url),authorization:options.headers?.Authorization||null});
      return {ok:true,status:200,json:async()=>({organizations:[],locations:[],users:[],auditLogs:[],reservations:[]})};
    },
    window:{dispatchEvent(){},EventSource:null}
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,"client/js/cloud/authSessionManager.js"),"utf8"),context);
  vm.runInContext(fs.readFileSync(path.join(root,"client/js/cloud/cloudApi.js"),"utf8"),context);
  const coordinator=context.window.BlueCurrentAuthSession,api=new context.window.BlueCurrentCloudApi("");
  const initial=await coordinator.restore(api);
  check("Anonymous startup resolves without a token",initial.status==="anonymous"&&!initial.authenticated);
  const session={token:"v100.3.72-test-token",organizationId:"org-test",locationIds:["loc-test"],role:"owner",user:{id:"user-test"}};
  coordinator.authenticate(session,api);
  check("Successful login updates the current session",coordinator.snapshot().authenticated===true);
  const ready=await coordinator.whenReady();
  check("Readiness reflects the successful post-startup login",ready.authenticated===true&&ready.session?.organizationId==="org-test");
  const restored=await coordinator.restore(api);
  check("A reconnect reuses the current authenticated session",restored.authenticated===true&&restored.session?.user?.id==="user-test");
  await api.bootstrap();
  check("The first protected request proceeds after login",requests.length===1&&requests[0].url==="/api/bootstrap");
  check("The protected request carries the authenticated bearer token",requests[0].authorization==="Bearer v100.3.72-test-token");
  coordinator.signOut(api);
  const signedOut=await coordinator.whenReady();
  check("Readiness follows an explicit sign-out",signedOut.status==="anonymous"&&!signedOut.authenticated);
  const pkg=require(path.join(root,"package.json")),html=fs.readFileSync(path.join(root,"client/index.html"),"utf8"),blueprint=fs.readFileSync(path.join(root,"render.yaml"),"utf8");
  check("Build retains V100.3.72 or later",["100.3.72","100.3.73","100.3.74","100.3.75","100.3.76","100.3.77","100.3.78","100.3.83"].includes(pkg.version)&&/content="100\.3\.(?:72|73|74|75|76|77|78|79|80|81|82|83)"/.test(html));
  check("Corrected session authority is cache advanced",/authSessionManager\.js\?v=100\.3\.(?:72|73|74|75|76|77|78|79|80|81|82|83)/.test(html));
  check("Render preserves both certified and pilot origins",blueprint.includes("value: https://app.bluecurrentco.com,https://blue-current-pilot.onrender.com"));
  check("Render Blueprint omits the disk-incompatible shutdown option",!blueprint.includes("maxShutdownDelaySeconds"));
  console.log(`V100.3.72 authenticated readiness continuity ${passed}/${passed}`);
})().catch(error=>{console.error(error.stack||error.message);process.exit(1);});
