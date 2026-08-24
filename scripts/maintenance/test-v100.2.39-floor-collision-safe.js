"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const css=fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const coords={
  main:{1:[14,24],3:[38,24],4:[62,24],9:[82,24],2:[14,43],5:[38,43],7:[62,43],6:[82,43],10:[14,62],11:[38,62],12:[62,62],13:[82,62],15:[14,81],17:[38,81],19:[62,81],21:[82,81]},
  waterfront:{8:[15,31],16:[39,31],24:[63,31],26:[84,31],28:[15,54],14:[39,54],30:[63,54],32:[84,54],34:[15,77],36:[39,77],38:[63,77],40:[84,77]},
  private:{18:[18,43],20:[40,43],22:[62,43],42:[83,43],44:[18,70],46:[40,70],48:[62,70],50:[83,70]}
};
const checks=[];
checks.push(["V100.2.39 marker installed",css.includes("V100.2.39 — Collision-Safe Premium Floor Layout")]);
checks.push(["V100.2.38 remains beneath collision polish",css.includes("V100.2.38 — Centered Table Detail + Floor Collision Polish")]);
for(const [zone,map] of Object.entries(coords)){
  for(const [num,[x,y]] of Object.entries(map)){
    const compact=css.replace(/\s+/g,"");
    const needle=`.host-table[data-table="${num}"]{--x:${x}%!important;--y:${y}%!important;}`;
    checks.push([`${zone} table ${num} owns expected slot`,compact.includes(needle)]);
  }
  const pts=Object.entries(map);
  let min=Infinity,pair="";
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
    const [a,[ax,ay]]=pts[i],[b,[bx,by]]=pts[j];
    const dx=Math.abs(ax-bx),dy=Math.abs(ay-by);
    const metric=Math.sqrt(dx*dx+dy*dy);
    if(metric<min){min=metric;pair=`${a}/${b}`;}
  }
  checks.push([`${zone} has safe minimum slot separation (${pair}: ${min.toFixed(1)}%)`,min>=18]);
}
checks.push(["selected scale reduced",/\.host-table\.selected[\s\S]*scale\(1\.04\)/.test(css)]);
checks.push(["eight-top width bounded",/bc-top-8-v100-2-37[\s\S]*--bc-table-w:92px !important/.test(css)]);
const failed=checks.filter(([,ok])=>!ok).map(([n])=>n);
console.log(JSON.stringify({ok:!failed.length,version:"100.2.39",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if(failed.length)process.exit(1);
