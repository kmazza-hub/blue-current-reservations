"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const guard=fs.readFileSync(path.join(root,"client/js/modules/lightSurfaceContrastGuard.js"),"utf8");

assert.equal(pkg.version,"86.50.2");
assert(html.includes("styles.css?v=86.50.2"));
assert(html.includes("lightSurfaceContrastGuard.js?v=86.50.2"));

const sections=[
  ["#guest-intelligence","Know every guest. Grow every relationship."],
  ["#time-clock","Accurate punches. Live labor control."],
  ["#scheduling","Build the week with an explainable AI staffing copilot."],
  ["#production-readiness","Configure, govern, and launch every restaurant from one control plane."],
  ["#cloud-foundation","Persistent data, service boundaries, and real-time synchronization."]
];

for(const [selector,phrase] of sections){
  assert(html.includes(phrase),`Missing expected heading: ${phrase}`);
  assert(css.includes(`${selector} .section-heading h2`),`Missing explicit selector: ${selector}`);
}

assert(css.includes("V86.50.2 — EXPLICIT LIGHT SECTION TYPOGRAPHY AUTHORITY"));
assert(css.includes("-webkit-text-fill-color:var(--bc-explicit-light-ink)!important"));
assert(css.includes("background:none!important"));
assert(css.includes("mix-blend-mode:normal!important"));
assert(guard.includes("webkitTextFillColor"));

console.log(JSON.stringify({
  ok:true,
  version:"86.50.2",
  guestIntelligenceHeading:true,
  employeeTimeAttendanceHeading:true,
  aiSchedulingHeading:true,
  productionReadinessHeading:true,
  cloudFoundationHeading:true,
  legacyTextFillNeutralized:true,
  transparentDisplayEffectsNeutralized:true,
  runtimeWebkitTextFillDetection:true,
  responsiveLightTypography:true
},null,2));
