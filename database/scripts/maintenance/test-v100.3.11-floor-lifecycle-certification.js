const fs=require("fs");
const read=file=>fs.readFileSync(file,"utf8");
const moduleJs=read("client/js/floor-lifecycle-certification-v100.3.11.js");
const serviceJs=read("client/js/service-table-lifecycle-v100.2.57.js");
const appJs=read("client/js/app-v15.1.3.js");
const clarityJs=read("client/js/fullscreen-floor-clarity-v100.3.10.js");
const focusJs=read("client/js/focused-operator-workspaces-v100.3.9.js");
const html=read("client/index.html");
const checks=[
  ["version declared",moduleJs.includes('VERSION="100.3.11"')],
  ["Service CHECK is authoritative",moduleJs.includes('status||"").toLowerCase()==="check"')],
  ["CHECK is limited to seated tables",moduleJs.includes('table.classList.contains("seated")&&checkTables.has')],
  ["CHECK label is synchronized",moduleJs.includes('label.textContent="CHECK"')],
  ["non-CHECK seated label is restored",moduleJs.includes('label.textContent="SEATED"')],
  ["event-driven lifecycle only",!moduleJs.includes("MutationObserver")&&!moduleJs.includes("setInterval")],
  ["service completion removes CHECK",serviceJs.includes('"available","check"')],
  ["service completion clears guest ownership",serviceJs.includes("delete table.dataset.bcGuestName")&&serviceJs.includes("delete table.dataset.bcGuestStatus")],
  ["service completion clears seated timestamp",serviceJs.includes("delete table.dataset.bcSeatedAt")],
  ["manual cleaning transition removes CHECK",appJs.includes("classList.remove('seated','reserved','available','check')")],
  ["manual open transition removes CHECK",appJs.includes("classList.remove('cleaning','reserved','seated','check')")],
  ["manual open clears service stage",appJs.includes("delete activeTable.dataset.bcServiceStage")],
  ["fullscreen CHECK status remains readable",clarityJs.includes('if(status==="check")')],
  ["seating completion still exits Floor",focusJs.includes('bc:host-guest-seated')&&focusJs.includes('exitFloor({returnHome:true})')],
  ["module loaded after fullscreen repairs",html.indexOf("floor-lifecycle-certification-v100.3.11.js")>html.indexOf("fullscreen-floor-zone-controls-v100.3.10.3.js")],
  ["new browser cache key",html.includes('floor-lifecycle-certification-v100.3.11.js?v=100.3.11')]
];
let passed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}: ${name}`);if(ok)passed++;else process.exitCode=1;}
console.log(`V100.3.11 Floor lifecycle certification gate: ${passed}/${checks.length}`);
