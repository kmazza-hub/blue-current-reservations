"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const jsPath = path.join(root,"client","js","app-v15.1.3.js");
const cssPath = path.join(root,"client","styles.css");
const cssFragPath = path.join(root,"patches","host-special-note-pills-v100.2.27.cssfrag");
for (const p of [jsPath,cssPath,cssFragPath]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.27 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
const js = fs.readFileSync(jsPath,"utf8");
let css = fs.readFileSync(cssPath,"utf8");
if (!js.includes("__bcHostWaitQuoteV100_2_26")) { console.error("V100.2.27 requires V100.2.26 first."); process.exit(1); }
if (css.includes("V100.2.27 — Host Stand Special Note Pill Polish")) { console.log("V100.2.27 already applied."); process.exit(0); }
const frag = fs.readFileSync(cssFragPath,"utf8").trim();
fs.writeFileSync(cssPath+".v100.2.27.bak",css);
fs.writeFileSync(cssPath,css+"\n\n"+frag+"\n");
console.log(JSON.stringify({
  ok:true,
  version:"100.2.27",
  repair:"Host Stand Special Note Pill Polish",
  fixes:[
    "special occasion and guest-need pills fully contain their complete label",
    "priority pill text and star remain optically centered",
    "waitlist information column no longer clips max-content labels",
    "common notes such as Anniversary and High chair retain clean separation from Seat",
    "tablet layout preserves full labels without changing queue or seating behavior"
  ]
},null,2));
