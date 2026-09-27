"use strict";

const assert=require("assert/strict");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"../..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const pkg=JSON.parse(read("package.json"));
const html=read("client/index.html");
const client=read("client/js/holiday-reservation-book-v100.3.98.js");

const version=String(pkg.version).split(".").map(Number);
assert(version[0]===100&&version[1]===3&&version[2]>=102,"build must retain V100.3.102 or later");
assert(Boolean(pkg.scripts["certify:pilot"]),"a pilot certification command must remain registered");
assert.equal(pkg.scripts["certify:universal"],pkg.scripts["certify:pilot"]);
assert(html.includes(`name="blue-current-build" content="${pkg.version}"`));
assert(html.includes(`Blue Current V${pkg.version}`));
assert(html.includes(`holiday-reservation-book-v100.3.98.js?v=${pkg.version}`));

const sandbox={
  window:{addEventListener(){}},
  document:{getElementById(){return null;},addEventListener(){}},
  localStorage:{getItem(){return "";}},
  fetch(){throw new Error("network must not run during holiday date unit checks");},
  FormData:class{},CustomEvent:class{},setTimeout(){},queueMicrotask(){},console
};
vm.runInNewContext(client,sandbox,{filename:"holiday-reservation-book-v100.3.98.js"});
const dates=sandbox.window.BlueCurrentHolidayReservationBook;
assert(dates,"holiday date API must be available");
assert.equal(dates.holidayDate("Thanksgiving","2026-09-21"),"2026-11-26");
assert.equal(dates.holidayDate("Christmas Eve","2026-09-21"),"2026-12-24");
assert.equal(dates.holidayDate("Christmas Day","2026-09-21"),"2026-12-25");
assert.equal(dates.holidayDate("New Year's Eve","2026-09-21"),"2026-12-31");
assert.equal(dates.holidayDate("New Year's Day","2026-09-21"),"2027-01-01");
assert.equal(dates.holidayDate("Thanksgiving","2026-11-27"),"2027-11-25");
assert.equal(dates.holidayDate("","2026-09-21"),"");

assert(client.includes('holidaySelect.addEventListener("change",()=>{const next=holidayDate(holidaySelect.value);if(next&&dateInput)dateInput.value=next;})'),"reservation form holiday selection must populate its date");
assert(client.includes('$("bcReservationBookEvent")?.addEventListener("change",event=>{const next=holidayDate(event.currentTarget.value);if(next)$("bcReservationBookDate").value=next;render();})'),"reservation book holiday filter must populate its date");

console.log("V100.3.102 holiday auto-date passed for Thanksgiving, Christmas Eve/Day, and New Year's Eve/Day.");
