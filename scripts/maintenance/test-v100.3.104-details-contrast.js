"use strict";

const assert=require("assert/strict");
const fs=require("fs");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const pkg=JSON.parse(read("package.json"));
const html=read("client/index.html");
const css=read("client/styles.css");
const reservations=read("client/js/holiday-reservation-book-v100.3.98.js");

assert(["100.3.104","100.3.105","100.3.106","100.3.107"].includes(pkg.version));
assert(html.includes(`name="blue-current-build" content="${pkg.version}"`));
assert(html.includes(`Blue Current V${pkg.version}`));
assert(html.includes(`styles.css?v=${pkg.version}`));
assert(reservations.includes("data-holiday-details>Details</button>"),"holiday reservation Details action must remain rendered");
assert(css.includes("V100.3.104 — holiday reservation Details action contrast"));
assert(css.includes("button[data-holiday-details]"),"contrast rule must target the actual holiday Details attribute");
assert(css.includes("background:#075f7a!important"));
assert(css.includes("color:#ffffff!important"));
assert(css.includes("-webkit-text-fill-color:#ffffff!important"),"Safari must retain visible Details text");
assert(css.includes("min-height:44px!important"),"Details action must retain its touch target");
assert(css.includes("outline:3px solid rgba(126,215,232,.5)!important"),"Details keyboard focus must remain visible");
assert(html.includes('id="bcHolidayReservationDialog" aria-labelledby="bcHolidayReservationTitle"'),"detail sheet must expose its title to assistive technology");
assert(css.includes("V100.3.104 — first-class holiday reservation detail sheet"));
assert(css.includes("#bcHolidayReservationDialog .bc-reservation-detail__grid"));
assert(css.includes("grid-template-columns:repeat(3,minmax(0,1fr))"),"desktop detail sheet must use structured information cards");
assert(css.includes("background:linear-gradient(135deg,#082d3b 0%,#0b5368 100%)"),"detail sheet must retain its first-class header");
assert(css.includes("max-height:calc(100dvh - 20px)"),"detail sheet must fit the iPad and phone viewport");
assert(css.includes("padding:14px 16px calc(14px + env(safe-area-inset-bottom,0px))"),"detail actions must respect mobile safe areas");

console.log("V100.3.104 holiday reservation Details contrast passed.");
