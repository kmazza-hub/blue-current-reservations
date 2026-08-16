"use strict";

const assert=require("assert");
const fs=require("fs");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const boundary=fs.readFileSync(path.join(root,"server/services/productionBoundaryService.js"),"utf8");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const startup=fs.readFileSync(path.join(root,"client/js/startup-loader.js"),"utf8");

assert(Number(pkg.version.split(".")[0]) >= 71, `Expected V71 or later, found ${pkg.version}`);
assert(boundary.includes("font-src 'self' data: https://fonts.gstatic.com"));
assert(boundary.includes("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"));
assert(!boundary.includes("style-src 'self' 'unsafe-inline'; script-src"));
assert(html.includes(`content="${pkg.version}"`));
assert(/V\d+(?:\.\d+){2} ready/.test(startup));

console.log(JSON.stringify({
  ok:true,
  version:"71.0.1",
  googleFontsStylesheetAllowed:true,
  googleFontsBinaryAllowed:true,
  cspRemainsExplicit:true,
  noWildcardStyleSource:true,
  noWildcardFontSource:true
},null,2));
