const fs=require("fs");
const assert=(ok,msg)=>{if(!ok){console.error("FAIL:",msg);process.exitCode=1}else console.log("PASS:",msg)};
const js=fs.readFileSync("client/js/fullscreen-floor-zone-controls-v100.3.10.3.js","utf8");
const html=fs.readFileSync("client/index.html","utf8");

assert(js.includes('VERSION="100.3.10.3"'),"repair version is declared");
assert(js.includes('#bcFloorFocusStage .host-floor-toolbar [data-host-zone]'),"delegation is scoped to fullscreen room controls");
assert(js.includes('if(!inFocusedFloor())return null'),"regular Floor view is explicitly excluded");
assert(js.includes('__bcHostFloorRestorationV100_2_47'),"production floor restoration controller owns room rendering");
assert(js.includes('__bcHostZonesV100_2_34'),"compatible host-zone fallback remains available");
assert(js.includes('map.dataset.bcActiveZone=zone'),"active room state is synchronized");
assert(js.includes('aria-pressed'),"room control accessibility state is synchronized");
assert(!js.includes('MutationObserver'),"repair adds no mutation observer");
assert(!js.includes('stopImmediatePropagation'),"repair does not block existing Floor handlers");
assert(html.includes('fullscreen-floor-zone-controls-v100.3.10.3.js?v=100.3.10.3'),"repair is loaded with a new cache key");
if(!process.exitCode)console.log("V100.3.10.3 fullscreen Floor zone-control gate passed 10/10");
