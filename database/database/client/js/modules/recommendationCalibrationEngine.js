(function(){"use strict";
class BlueCurrentRecommendationCalibrationEngine{
 constructor({eventBus}){this.eventBus=eventBus;this.outcomeKey="bluecurrent:operations-outcomes";}
 read(){try{return JSON.parse(localStorage.getItem(this.outcomeKey)||"[]");}catch{return [];}}
 snapshot(){const rows=this.read();const modeled=rows.reduce((s,x)=>s+(Number(x.modeledImpact)||0),0);const measured=rows.reduce((s,x)=>s+(Number(x.measuredImpact)||0),0);const variance=measured-modeled;const ratio=modeled?measured/modeled:0;const bias=modeled?Math.round((variance/modeled)*100):0;const accuracy=modeled?Math.max(0,Math.min(100,Math.round((1-Math.min(1,Math.abs(variance)/Math.max(1,Math.abs(modeled))))*100))):0;const adjustment=rows.length<3?"Collect more outcomes":ratio>1.15?"Increase modeled upside":ratio<.85?"Reduce modeled upside":"Maintain current calibration";return{rows:rows.slice().reverse(),count:rows.length,modeled,measured,variance,bias,accuracy,adjustment,status:rows.length<3?"learning":accuracy>=80?"calibrated":accuracy>=60?"watch":"recalibrate"};}
}
window.BlueCurrentRecommendationCalibrationEngine=BlueCurrentRecommendationCalibrationEngine;})();