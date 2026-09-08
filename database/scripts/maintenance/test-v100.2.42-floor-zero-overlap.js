"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const css=fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const compact=css.replace(/\s+/g,"");
const coords={
  main:{1:[13,24],3:[38,24],4:[63,24],9:[87,24],2:[13,44],5:[38,44],7:[63,44],6:[87,44],10:[13,64],11:[38,64],12:[63,64],13:[87,64],15:[13,84],17:[38,84],19:[63,84],21:[87,84]},
  waterfront:{8:[13,31],16:[38,31],24:[63,31],26:[87,31],28:[13,56],14:[38,56],30:[63,56],32:[87,56],34:[13,81],36:[38,81],38:[63,81],40:[87,81]},
  private:{18:[12,42],20:[37,42],22:[63,42],42:[88,42],44:[12,72],46:[37,72],48:[63,72],50:[88,72]}
};
const checks=[];
checks.push(["V100.2.42 marker installed",css.includes("V100.2.42 — Zero-Overlap Restaurant Floor Spacing")]);
checks.push(["direct positioning overrides legacy variables",compact.includes('.host-table[data-table="1"]{left:13%!important;top:24%!important;}')]);
for(const [zone,map] of Object.entries(coords)){
  for(const [num,[x,y]] of Object.entries(map)){
    const needle=`.host-table[data-table="${num}"]{left:${x}%!important;top:${y}%!important;}`;
    checks.push([`${zone} table ${num} has fixed slot`,compact.includes(needle)]);
  }
  const pts=Object.entries(map);
  let minX=Infinity,minY=Infinity;
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
    const [,[ax,ay]]=pts[i],[,[bx,by]]=pts[j];
    if(ay===by) minX=Math.min(minX,Math.abs(ax-bx));
    if(ax===bx) minY=Math.min(minY,Math.abs(ay-by));
  }
  checks.push([`${zone} horizontal slot spacing >= 24%`,minX>=24]);
  checks.push([`${zone} vertical slot spacing >= 20%`,minY>=20]);
}
checks.push(["selected table scale cannot crowd neighbors",/\.host-table\.selected[\s\S]*scale\(1\.02\)/.test(css)]);
checks.push(["eight-top footprint bounded",/bc-top-8-v100-2-37[\s\S]*--bc-table-w:90px !important/.test(css)]);
const failed=checks.filter(([,ok])=>!ok).map(([n])=>n);
console.log(JSON.stringify({ok:!failed.length,version:"100.2.42",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if(failed.length)process.exit(1);
