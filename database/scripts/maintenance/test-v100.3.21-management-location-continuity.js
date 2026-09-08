"use strict";
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8");
let passed=0,total=0;
function check(name,condition){total++;if(condition){passed++;console.log(`PASS ${total}: ${name}`)}else{console.error(`FAIL ${total}: ${name}`);process.exitCode=1}}
const files={
  cloud:read("client/js/modules/cloudFoundation.js"),
  command:read("client/js/modules/commandCenter.js"),
  actions:read("client/js/modules/actionList.js"),
  brief:read("client/js/modules/managerShiftBrief.js"),
  workforce:read("client/js/modules/workforceFoundation.js"),
  inventory:read("client/js/modules/inventoryIntelligence.js")
};
const index=read("client/index.html");
const usesAuthority=source=>source.includes("BlueCurrentFrontlineLocation?.get?.()")&&source.includes('|| "loc_marina"')||source.includes('||"loc_marina"');
check("All active management modules use shared location authority",Object.values(files).every(usesAuthority));
check("Cloud reservation creation uses selected location",files.cloud.includes("locationId: locationId()"));
check("Command feed, snapshot, and handoff use selected location",files.command.includes("operationsFeed(locationId()")&&files.command.includes("commandCenter(locationId())")&&files.command.includes("locationId:locationId()"));
check("Manager actions read and write selected location",files.actions.includes("managerActions(locationId())")&&files.actions.match(/locationId: locationId\(\)/g)?.length>=5&&files.actions.includes("deleteManagerAction(action.id, locationId())"));
check("Local manager-action fallback is location scoped",files.actions.includes("`${STORAGE_KEY_BASE}.${locationId()}`")&&files.actions.includes("localStorage.setItem(storageKey()"));
check("Marina legacy fallback migrates once without leaking to other locations",files.actions.includes('locationId() === "loc_marina"')&&files.actions.includes("localStorage.removeItem(STORAGE_KEY_BASE)"));
check("Manager brief actions and notes use selected location",files.brief.match(/locationId: locationId\(\)/g)?.length===3);
check("Workforce foundation reads and creates for selected location",files.workforce.includes("workforceFoundation(locationId())")&&files.workforce.match(/locationId:locationId\(\)/g)?.length===2);
check("Inventory intelligence reads and writes selected location",files.inventory.includes("inventoryIntelligence(locationId())")&&files.inventory.includes("updateInventoryPolicy(locationId()")&&files.inventory.match(/locationId:locationId\(\)/g)?.length===2);
for(const module of ["commandCenter","actionList","managerShiftBrief","workforceFoundation","inventoryIntelligence","cloudFoundation"]){
  check(`${module} cache key is V100.3.21`,index.includes(`js/modules/${module}.js?v=100.3.21`));
}
check("Shared authority still loads before deferred startup",index.indexOf("frontline-location-authority-v100.3.17.js")<index.indexOf("startup-loader.js"));
check("No active management request retains a fixed Marina argument",!Object.values(files).some(source=>/\((?:"loc_marina"|'loc_marina')|locationId\s*:\s*(?:"loc_marina"|'loc_marina')/.test(source)));
console.log(`V100.3.21 validation ${passed}/${total}`);if(passed!==total)process.exitCode=1;
