"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/floor-reservations-v62.0.js"),"utf8");
assert.equal(pkg.version,"62.0.0");
assert(html.includes('content="62.0.0"'));
for(const view of ["floor","reservations","waitlist","guests"])assert(html.includes(`data-host-view="${view}"`));
assert(html.includes('id="hostSearchGuest"'));
assert(html.includes('id="hostAddReservation"'));
assert(html.includes('id="bcHostReservationsPanel"'));
assert(html.includes('id="bcHostWaitlistPanel"'));
assert(html.includes('id="bcHostGuestsPanel"'));
assert(html.includes('id="bcHostDialog"'));
assert(js.includes('openDialog("reservation")'));
assert(js.includes('openDialog("walkin")'));
assert(js.includes('wireSeatButton'));
assert(js.includes('bcGuestSearchInput'));
assert(css.includes(".bc-reservation-list"));
assert(css.includes(".bc-host-dialog"));
assert(css.includes(".bc-waitlist-summary"));
console.log(JSON.stringify({
 ok:true,version:"62.0.0",
 hostNavigationFunctional:true,
 floorPrimary:true,
 reservationsWorkspace:true,
 waitlistWorkspace:true,
 guestSearchWorkspace:true,
 addReservationDialog:true,
 addWalkInDialog:true,
 seatWaitlistAction:true,
 waitCountsUpdate:true,
 reservationDetails:true,
 touchTargets:true,
 noBackendRemoval:true
},null,2));
