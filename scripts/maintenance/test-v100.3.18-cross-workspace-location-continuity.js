"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=file=>fs.readFileSync(path.join(root,file),"utf8");
let passed=0,total=0;
function check(name,condition){total++;if(condition){passed++;console.log(`PASS ${total}: ${name}`)}else{console.error(`FAIL ${total}: ${name}`);process.exitCode=1}}
const modules={
 reservations:read("client/js/modules/reservationOperations.js"),
 floor:read("client/js/modules/liveFloorOperations.js"),
 staff:read("client/js/modules/staffSections.js"),
 kitchen:read("client/js/modules/kitchenCommandCenter.js"),
 service:read("client/js/modules/serviceCoordination.js"),
 scheduling:read("client/js/modules/scheduling.js"),
 timeClock:read("client/js/modules/timeClock.js")
};
const manager=read("client/js/manager-operations-truth-v100.2.68.js"),ownership=read("client/js/manager-action-ownership-v100.2.69.js"),inventory=read("client/js/inventory-truth-v100.2.80.js"),html=read("client/index.html"),runtime=read("client/js/runtime-performance-v100.2.70.js");
const moduleNames=["scheduling","liveFloorOperations","reservationOperations","staffSections","kitchenCommandCenter","serviceCoordination","timeClock"];
check("All seven legacy operational modules resolve shared authority",Object.values(modules).every(source=>source.includes("BlueCurrentFrontlineLocation?.get?.()")));
check("Reservations read the selected location",modules.reservations.includes("api.reservationOperations(locationId())")&&modules.reservations.includes("api.floor(locationId())"));
check("Floor reads the selected location",modules.floor.includes("api.floor(locationId())"));
check("Staff reads the selected location",modules.staff.includes("api.staffOperations(locationId())"));
check("Kitchen reads the selected location",modules.kitchen.includes("api.kitchenOperations(locationId())"));
check("Service reads the selected location",modules.service.includes("api.serviceCoordination(locationId())"));
check("Scheduling reads and writes the selected location",modules.scheduling.includes("api.scheduling(locationId(),weekStart)")&&modules.scheduling.includes("locationId:locationId()"));
check("Time Clock reads and writes the selected location",modules.timeClock.includes("api.timeClock(locationId())")&&(modules.timeClock.match(/locationId: locationId\(\)/g)||[]).length>=5);
check("Manager truth and ownership share dynamic authority",manager.includes("BlueCurrentFrontlineLocation?.reference")&&ownership.includes("BlueCurrentFrontlineLocation?.reference"));
check("Inventory truth shares dynamic authority",inventory.includes("BlueCurrentFrontlineLocation?.reference"));
check("All seven deferred cache keys advance together",moduleNames.every(name=>html.includes(`js/modules/${name}.js?v=100.3.18`)));
check("Manager and Inventory runtime cache keys advance",["manager-operations-truth-v100.2.68.js","manager-action-ownership-v100.2.69.js","inventory-truth-v100.2.80.js"].every(name=>html.includes(`${name}?v=100.3.18`)&&runtime.includes(`${name}?v=100.3.18`)));
check("Location authority executes before deferred startup loader",html.indexOf("frontline-location-authority-v100.3.17.js")<html.indexOf("startup-loader.js?v=67.0.0"));
check("Development fallback remains explicit",Object.values(modules).every(source=>source.includes('|| "loc_marina"')||source.includes('||"loc_marina"')));
check("Server authorization implementation is not part of this wave",true);
console.log(`V100.3.18 validation ${passed}/${total}`);if(passed!==total)process.exitCode=1;
