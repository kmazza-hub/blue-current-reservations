"use strict";
const fs=require('fs'),path=require('path');
const root=process.cwd(),kit=__dirname;
const cssDst=path.join(root,'client','styles.css');
if(!fs.existsSync(cssDst))throw new Error('V100.2.48 requires the current Blue Current repo with client/styles.css');
const current=fs.readFileSync(cssDst,'utf8');
if(!current.includes('V100.2.47 — Floor Layout Restoration'))throw new Error('V100.2.48 requires V100.2.47 first.');
if(current.includes('V100.2.48 — Floor Cell Readability Lock')){console.log('V100.2.48 already applied.');process.exit(0);}
const src=path.join(kit,'patches','client','styles.css');
if(!fs.existsSync(src))throw new Error(`Missing patch ${src}`);
fs.copyFileSync(cssDst,cssDst+'.v100.2.48.bak');
fs.copyFileSync(src,cssDst);
const testSrc=path.join(kit,'scripts','maintenance','test-v100.2.48-floor-cell-readability.js');
const testDst=path.join(root,'scripts','maintenance','test-v100.2.48-floor-cell-readability.js');
fs.mkdirSync(path.dirname(testDst),{recursive:true});fs.copyFileSync(testSrc,testDst);
console.log(JSON.stringify({ok:true,version:'100.2.48',repair:'Floor Cell Readability Lock',fixes:['moved capacity labels inside each table cell','increased table number and state contrast','kept CLEANING and every live state fully inside its own cell','made 2/4/6/8-top cells large enough for their complete labels','preserved V100.2.47 organic floor positions and all guest/reservation logic']},null,2));
