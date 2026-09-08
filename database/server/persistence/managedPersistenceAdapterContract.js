"use strict";

const MANAGED_REQUIRED_CAPABILITIES=Object.freeze({
  transactions:true,
  atomicMultiCollectionMutation:true,
  durableWrites:true,
  concurrentMultiNodeWriters:true,
  rowLevelLocking:true,
  databaseConstraints:true,
  managedFailover:true
});

function validateManagedPersistenceAdapter(adapter){
  const missingMethods=[
    "read","list","get","create","update","transaction",
    "health","schemaVersion","applyMigration"
  ].filter(name=>typeof adapter?.[name]!=="function");

  const missingCapabilities=Object.entries(MANAGED_REQUIRED_CAPABILITIES)
    .filter(([name,required])=>required && adapter?.capabilities?.[name]!==true)
    .map(([name])=>name);

  if(missingMethods.length || missingCapabilities.length){
    const error=new Error(
      `Managed persistence adapter contract failed. `+
      `Missing methods: ${missingMethods.join(", ")||"none"}; `+
      `missing capabilities: ${missingCapabilities.join(", ")||"none"}.`
    );
    error.code="INVALID_MANAGED_PERSISTENCE_ADAPTER";
    error.missingMethods=missingMethods;
    error.missingCapabilities=missingCapabilities;
    throw error;
  }

  if(!adapter.driver || adapter.driver==="json"){
    const error=new Error("Managed persistence adapter must declare a non-JSON driver.");
    error.code="INVALID_MANAGED_PERSISTENCE_ADAPTER";
    throw error;
  }
  return adapter;
}

module.exports={MANAGED_REQUIRED_CAPABILITIES,validateManagedPersistenceAdapter};
