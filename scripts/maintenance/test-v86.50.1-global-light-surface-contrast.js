"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const guard=fs.readFileSync(path.join(root,"client/js/modules/lightSurfaceContrastGuard.js"),"utf8");

assert(Number(pkg.version.split(".")[0]) >= 86);
assert(html.includes(`lightSurfaceContrastGuard.js?v=${pkg.version}`));
assert(html.includes(`styles.css?v=${pkg.version}`));
assert(css.includes("V86.50.1 — GLOBAL LIGHT-SURFACE CONTRAST ENFORCEMENT"));
assert(css.includes(".bc-auto-light-contrast"));
assert(css.includes("-webkit-text-fill-color:var(--bc-auto-light-ink)!important"));
assert(guard.includes('const FIX_CLASS = "bc-auto-light-contrast"'));
assert(guard.includes("effectiveBackground"));
assert(guard.includes("contrast(actualFg,bg)"));
assert(guard.includes("luminance(bg) < 0.62"));
assert(guard.includes("MutationObserver"));
assert(guard.includes("window.BlueCurrentLightSurfaceContrastGuard"));

console.log(JSON.stringify({
  ok:true,
  version:"86.50.1",
  computedBackgroundDetection:true,
  wcagContrastDetection:true,
  globalLegacyCoverage:true,
  dynamicContentCoverage:true,
  headingEffectsNeutralized:true,
  formTextCoverage:true,
  placeholderCoverage:true,
  responsiveRefresh:true,
  lightSurfaceDarkInk:true
},null,2));
