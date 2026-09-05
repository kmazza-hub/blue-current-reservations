const fs=require("fs");
const read=file=>fs.readFileSync(file,"utf8");
const moduleJs=read("client/js/host-lifecycle-certification-v100.3.12.js");
const appJs=read("client/js/app-v15.1.3.js");
const floorJs=read("client/js/floor-reservations-v62.0.js");
const focusJs=read("client/js/focused-operator-workspaces-v100.3.9.js");
const html=read("client/index.html");
const checks=[
  ["version declared",moduleJs.includes('VERSION="100.3.12"')],
  ["reservation cleanup is scoped",moduleJs.includes('removeMatching("#bcReservationList",name)')],
  ["arrival cleanup is scoped",moduleJs.includes('removeMatching("#arrivalQueue",name)')],
  ["seated waitlist cleanup is scoped",moduleJs.includes('removeMatching("#waitlistQueue",name)')],
  ["cleanup uses normalized guest identity",moduleJs.includes("const normalize=value=>")&&moduleJs.includes("rowName(row)!==key")],
  ["counts and wait quote resynchronize",moduleJs.includes("syncCounts")&&moduleJs.includes("__bcHostWaitQuoteV100_2_26")],
  ["cleanup is event driven",!moduleJs.includes("MutationObserver")&&!moduleJs.includes("setInterval")],
  ["arrival handoff removes reservation card",appJs.includes("querySelectorAll('#bcReservationList article')")],
  ["arrival handoff publishes lifecycle event",appJs.includes("bc:host-reservation-entered-waitlist")],
  ["reserved seating records seated timestamp",appJs.includes("table.dataset.bcSeatedAt = String(seatedAt)")],
  ["reserved seating publishes authoritative seating",appJs.includes("source:'reserved-table'")&&appJs.includes("bc:host-guest-seated")],
  ["standard reservation detail still hands off",floorJs.includes("handoffReservationToFloor(activeReservationArticle)")],
  ["standard reservation handoff still removes source card",floorJs.includes("article.remove()")],
  ["walk-in creation still enters waitlist",floorJs.includes('mode==="walkin"')&&floorJs.includes("addWalkin")],
  ["standard seating still removes queue card",appJs.includes("if (row.isConnected) row.remove()")],
  ["seating still exits focused Floor",focusJs.includes("bc:host-guest-seated")&&focusJs.includes("exitFloor({returnHome:true})")],
  ["module loaded after Floor lifecycle",html.indexOf("host-lifecycle-certification-v100.3.12.js")>html.indexOf("floor-lifecycle-certification-v100.3.11.js")],
  ["new browser cache key",html.includes('host-lifecycle-certification-v100.3.12.js?v=100.3.12')]
];
let passed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}: ${name}`);if(ok)passed++;else process.exitCode=1;}
console.log(`V100.3.12 Host lifecycle certification gate: ${passed}/${checks.length}`);
