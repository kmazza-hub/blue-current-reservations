"use strict";

const assert=require("assert/strict");
const fs=require("fs");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const manifest=require(path.join(root,"config/certification/v100.3.100-universal-system.json"));
const directory=path.join(root,"scripts/maintenance");
const inventory=fs.readdirSync(directory).filter(name=>/^test-.*\.js$/.test(name)).sort();
const blocking=new Set(manifest.blockingTests.map(file=>path.basename(file)));

assert.equal(manifest.release,"100.3.100");
assert(inventory.length>=439,"historical test evidence must remain discoverable");
for(const file of blocking)assert(inventory.includes(file),`blocking test is missing: ${file}`);

const current=inventory.filter(file=>blocking.has(file));
const historical=inventory.filter(file=>!blocking.has(file));
assert.equal(current.length,blocking.size,"every blocking test must be classified exactly once");
assert.equal(current.length+historical.length,inventory.length,"every test must be classified");
assert.equal(manifest.historicalEvidencePolicy.classification,"NON_BLOCKING_RELEASE_SNAPSHOT");
assert.equal(manifest.historicalEvidencePolicy.mustRemainDiscoverable,true);
assert.equal(manifest.historicalEvidencePolicy.mustNotOverrideCurrentBehavior,true);

console.log(`V100.3.100 test classification passed: ${current.length} current blocking tests, ${historical.length} preserved historical snapshots.`);
