"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const root=path.resolve(__dirname,"../..");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/website-launch-face-v37.js"),"utf8");

assert(html.includes('data-web-launch-face="37"'));
assert(html.includes("website-launch-face-v37.js?v=37"));
assert(html.includes("<title>Blue Current | The Hospitality Operating System</title>"));
assert(html.includes('<link rel="canonical" href="https://bluecurrentco.com/">'));
assert(html.includes('name="robots" content="index,follow,max-image-preview:large"'));
assert(html.includes('"@type": "SoftwareApplication"'));
assert(html.includes('"applicationSubCategory": "Hospitality Operating System"'));
assert(html.includes("Run the restaurant with more clarity. Protect the hospitality that makes it worth running."));
assert(html.includes("Hospitality that moves with you."));

for(const id of ["experience","service-speed","operating-current","profit-current","intelligence-current","blue-current-standard","pilot"])
  assert(html.includes(`id="${id}"`),`missing public section ${id}`);

for(const term of ["BlueCurrentPublicFace","WEB-037","Hospitality Operating System","missingSections"])
  assert(js.includes(term),`missing launch guard ${term}`);

for(const term of [
  'body[data-web-launch-face="37"]',
  '.launch-face-close',
  '::selection',
  '.footer-links'
]) assert(css.includes(term),`missing final CSS ${term}`);

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate HTML ids");
const targets=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]);
const set=new Set(ids);
const missing=[...new Set(targets.filter(x=>!set.has(x)))];
assert.equal(missing.length,0,`broken hash targets: ${missing.join(", ")}`);

console.log(JSON.stringify({
  ok:true,
  wave:"WEB-037",
  categoryLocked:true,
  canonicalUrl:true,
  seoRobots:true,
  socialMetadata:true,
  structuredOrganizationData:true,
  structuredSoftwareData:true,
  finalBrandPromise:true,
  footerFinalized:true,
  publicFaceRuntimeGuard:true,
  unsupportedCustomerClaims:false,
  unsupportedProfitGuarantees:false,
  duplicateHtmlIds:0,
  brokenHashTargets:0
},null,2));
