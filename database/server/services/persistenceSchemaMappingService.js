"use strict";

const crypto=require("crypto");

function scalarType(value){
  if(value===null || value===undefined) return "nullable";
  if(typeof value==="boolean") return "boolean";
  if(typeof value==="number") return Number.isInteger(value) ? "integer" : "decimal";
  if(typeof value==="string"){
    if(/^\d{4}-\d{2}-\d{2}T/.test(value)) return "timestamp";
    return "text";
  }
  if(Array.isArray(value)) return "json-array";
  if(typeof value==="object") return "json-object";
  return "text";
}

function snake(value){
  return String(value).replace(/([a-z0-9])([A-Z])/g,"$1_$2").replace(/[^a-zA-Z0-9]+/g,"_").toLowerCase();
}

class PersistenceSchemaMappingService {
  constructor(persistence){ this.persistence=persistence; }

  _hash(value){
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
  }

  _inferColumns(records){
    const fields=new Map();
    for(const record of records.slice(0,250)){
      if(!record || typeof record!=="object" || Array.isArray(record)) continue;
      for(const [key,value] of Object.entries(record)){
        const entry=fields.get(key) || {types:new Set(),nullable:false,present:0};
        entry.present+=1;
        if(value===null || value===undefined) entry.nullable=true;
        else entry.types.add(scalarType(value));
        fields.set(key,entry);
      }
    }
    return [...fields.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([name,entry])=>({
      sourceField:name,
      column:snake(name),
      types:[...entry.types].sort(),
      nullable:entry.nullable || entry.present<records.length,
      presentIn:entry.present
    }));
  }

  _foreignKeys(storeNames, columns){
    const storeSet=new Set(storeNames.map(name=>name.toLowerCase()));
    const mappings=[];
    for(const column of columns){
      const field=column.sourceField;
      if(!/Id$/.test(field) || field==="id") continue;
      const stem=field.slice(0,-2).toLowerCase();
      const candidates=[stem,`${stem}s`,stem.endsWith("y")?`${stem.slice(0,-1)}ies`:null].filter(Boolean);
      const target=candidates.find(candidate=>storeSet.has(candidate));
      if(target){
        mappings.push({
          sourceField:field,
          column:column.column,
          referencesStore:target,
          referencesColumn:"id",
          enforcement:"planned"
        });
      }
    }
    return mappings;
  }

  async build(){
    const state=await this.persistence.read();
    const storeNames=Object.keys(state).filter(name=>Array.isArray(state[name]));
    const tables=[];

    for(const name of storeNames.sort()){
      const records=state[name];
      const columns=this._inferColumns(records);
      const hasId=columns.some(c=>c.sourceField==="id");
      const indexes=[];
      if(hasId) indexes.push({columns:["id"],unique:true,reason:"entity identity"});
      for(const c of columns){
        if(c.sourceField==="organizationId") indexes.push({columns:["organization_id"],unique:false,reason:"tenant isolation"});
        if(c.sourceField==="locationId") indexes.push({columns:["location_id"],unique:false,reason:"location scope"});
        if(c.sourceField==="createdAt") indexes.push({columns:["created_at"],unique:false,reason:"time ordered operations"});
        if(c.sourceField==="updatedAt") indexes.push({columns:["updated_at"],unique:false,reason:"change tracking"});
      }

      const foreignKeys=this._foreignKeys(storeNames,columns);
      const table={
        sourceStore:name,
        table:snake(name),
        recordCount:records.length,
        primaryKey:hasId?["id"]:[],
        columns,
        indexes,
        foreignKeys,
        sourceHash:this._hash(records)
      };
      table.mappingHash=this._hash(table);
      tables.push(table);
    }

    const documents=Object.entries(state)
      .filter(([,value])=>value && typeof value==="object" && !Array.isArray(value))
      .map(([name,value])=>({
        sourceStore:name,
        table:`document_${snake(name)}`,
        strategy:"single-row-json-document",
        topLevelKeys:Object.keys(value).sort(),
        sourceHash:this._hash(value)
      }));

    return {
      version:"71.50.0",
      generatedAt:new Date().toISOString(),
      sourceDriver:this.persistence.driver,
      targetClass:"managed-transactional-relational",
      exampleTarget:"PostgreSQL",
      tables,
      documents,
      totals:{
        entityTables:tables.length,
        documentTables:documents.length,
        sourceRecords:tables.reduce((sum,t)=>sum+t.recordCount,0),
        plannedForeignKeys:tables.reduce((sum,t)=>sum+t.foreignKeys.length,0),
        plannedIndexes:tables.reduce((sum,t)=>sum+t.indexes.length,0)
      },
      mappingHash:this._hash({tables,documents})
    };
  }
}
module.exports=PersistenceSchemaMappingService;
