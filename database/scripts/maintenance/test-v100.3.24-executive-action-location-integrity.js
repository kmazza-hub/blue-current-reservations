"use strict";
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8");
let passed=0,total=0;
function check(name,condition){total++;if(condition){passed++;console.log(`PASS ${total}: ${name}`)}else{console.error(`FAIL ${total}: ${name}`);process.exitCode=1}}
const recommendations=read("client/js/modules/executiveRecommendations.js"),actions=read("client/js/modules/executiveActionCenter.js"),index=read("client/index.html");
check("Portfolio locations no longer default missing identity to Marina",recommendations.includes('dataset?.locationId || ""')&&!recommendations.includes('dataset?.locationId || "loc_marina"'));
check("Locationless portfolio cards are excluded",recommendations.includes(".filter(location => location.id)"));
check("Executive creation requires verified restaurant identity",recommendations.includes("if (!recommendation.locationId)")&&recommendations.includes("Select a verified restaurant before creating an action."));
check("Executive action create uses recommendation restaurant exactly",recommendations.includes("locationId: recommendation.locationId,")&&!recommendations.includes('recommendation.locationId || "loc_marina"'));
check("Executive note update uses the same restaurant",recommendations.match(/locationId: recommendation.locationId,/g)?.length===2);
check("Rendered recommendations carry restaurant identity",recommendations.includes("card.dataset.locationId = recommendation.locationId"));
check("Local executive seeds require explicit restaurant identity",actions.includes('const locationId = card.dataset.locationId || ""')&&actions.includes("if (!title || !locationId) return"));
check("Executive action intake rejects missing restaurant identity",actions.includes("if (!action.locationId) return"));
check("Executive action intake preserves exact restaurant identity",actions.includes("locationId: action.locationId,")&&!actions.includes('action.locationId || "loc_marina"'));
check("Executive Recommendations cache key advances",index.includes("js/modules/executiveRecommendations.js?v=100.3.24"));
check("Executive Action Center cache key advances",index.includes("js/modules/executiveActionCenter.js?v=100.3.24"));
check("Portfolio behavior remains multi-location",recommendations.includes("readLocations()")&&recommendations.includes("reviewLocation(recommendation.locationId)"));
console.log(`V100.3.24 validation ${passed}/${total}`);if(passed!==total)process.exitCode=1;
