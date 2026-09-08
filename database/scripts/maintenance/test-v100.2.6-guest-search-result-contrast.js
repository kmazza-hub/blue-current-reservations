const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const css=fs.readFileSync(path.join(root,'client/styles.css'),'utf8');
const checks=[
  ['scoped light result card foreground',/#host-stand #bcGuestSearchResults > button\{[\s\S]*?color:#102838!important/],
  ['guest name forced dark and opaque',/#host-stand #bcGuestSearchResults > button strong\{[\s\S]*?color:#102838!important;[\s\S]*?opacity:1!important/],
  ['guest metadata remains readable',/#host-stand #bcGuestSearchResults > button span\{[\s\S]*?color:#526b7c!important;[\s\S]*?opacity:1!important/],
  ['keyboard focus remains visible',/#host-stand #bcGuestSearchResults > button:hover,[\s\S]*?#host-stand #bcGuestSearchResults > button:focus-visible\{[\s\S]*?border-color:#2b8da6!important/],
  ['dark search input readability preserved',/#host-stand \.bc-host-search input\{[\s\S]*?color:#f7fbfd!important/],
  ['live search source preserved',/\.bc-guest-results>button strong\{color:#102838\}/]
];
const failed=checks.filter(([,re])=>!re.test(css)).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,repair:'V100.2.6 Guest Search Result Contrast',baselineVersion:'100.0.0',checks:checks.map(([name])=>name),failed},null,2));
if(failed.length)process.exit(1);
