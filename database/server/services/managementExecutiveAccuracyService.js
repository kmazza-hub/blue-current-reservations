"use strict";

class ManagementExecutiveAccuracyService {
  constructor(database,auditService,realtimeHub,executiveCommandCenterService,liveFloorServiceCertificationService){
    Object.assign(this,{database,auditService,realtimeHub,executiveCommandCenterService,liveFloorServiceCertificationService});
    this.metricDefinitions=[
      {id:"occupancy",label:"Occupancy",critical:true},
      {id:"reservations",label:"Active reservations",critical:true},
      {id:"waitlist",label:"Active waitlist",critical:true},
      {id:"activeStaff",label:"Active staff",critical:false},
      {id:"activeTickets",label:"Active kitchen tickets",critical:false},
      {id:"guestCount",label:"Guest / cover count",critical:false},
      {id:"revenue",label:"Revenue",critical:true}
    ];
  }
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}
  async certifications(organizationId){
    const db=await this.database.read();
    return (db.managementExecutiveAccuracyCertifications||[])
      .filter(x=>x.organizationId===organizationId)
      .sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));
  }
  activeReservation(r){return !["cancelled","canceled","completed"].includes(String(r.status||"").toLowerCase());}
  activeWait(w){return !["seated","cancelled","canceled"].includes(String(w.status||"").toLowerCase());}
  sourceMetrics(db,organizationId,locationId){
    const tables=(db.tables||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const reservations=(db.reservations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const waitlist=(db.waitlist||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const staff=(db.staff||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const tickets=(db.kitchenTickets||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const occupied=tables.filter(x=>["occupied","seated","dining"].includes(String(x.status||"").toLowerCase()));
    const total=tables.length;
    const activeReservations=reservations.filter(r=>this.activeReservation(r));
    const activeWait=waitlist.filter(w=>this.activeWait(w));
    const activeStaff=staff.filter(x=>x.status!=="off");
    const activeTickets=tickets.filter(x=>!["served","cancelled","canceled"].includes(String(x.status||"").toLowerCase()));
    const seatedCovers=reservations.filter(r=>["arrived","seated","completed"].includes(String(r.status||"").toLowerCase())).reduce((n,r)=>n+Number(r.partySize||0),0);
    const financialCandidates=[
      ...(db.financialSnapshots||[]),
      ...(db.locationFinancials||[]),
      ...(db.revenueSnapshots||[])
    ].filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const latestFinancial=[...financialCandidates].sort((a,b)=>new Date(b.generatedAt||b.createdAt||b.date||0)-new Date(a.generatedAt||a.createdAt||a.date||0))[0]||null;
    const revenueValue=latestFinancial?Number(latestFinancial.revenue??latestFinancial.netSales??latestFinancial.sales):null;
    return {
      occupancy:total?Math.round(occupied.length/total*100):null,
      reservations:activeReservations.length,
      waitlist:activeWait.length,
      activeStaff:activeStaff.length,
      activeTickets:activeTickets.length,
      guestCount:seatedCovers||null,
      revenue:Number.isFinite(revenueValue)?revenueValue:null,
      sources:{
        occupancy:{collection:"tables",records:tables.length},
        reservations:{collection:"reservations",records:reservations.length},
        waitlist:{collection:"waitlist",records:waitlist.length},
        activeStaff:{collection:"staff",records:staff.length},
        activeTickets:{collection:"kitchenTickets",records:tickets.length},
        guestCount:{collection:"reservations.partySize",records:reservations.length},
        revenue:latestFinancial?{collection:"financialSnapshots/locationFinancials/revenueSnapshots",records:financialCandidates.length,recordId:latestFinancial.id||null}:null
      }
    };
  }
  compare(metric,authoritative,displayed,source){
    if(authoritative===null||authoritative===undefined){
      return {metric,status:"UNVERIFIED",authoritative:null,displayed,source,delta:null,reason:"No authoritative source record is available for this metric."};
    }
    const a=Number(authoritative),d=Number(displayed);
    if(!Number.isFinite(d)){
      return {metric,status:"MISSING_DISPLAY_VALUE",authoritative:a,displayed,source,delta:null,reason:"Executive surface did not return a numeric value."};
    }
    const delta=d-a;
    return {metric,status:delta===0?"MATCH":"DISCREPANCY",authoritative:a,displayed:d,source,delta,reason:delta===0?"Executive value matches authoritative source.":"Executive value does not match authoritative source."};
  }
  async snapshot(organizationId,allowedLocationIds){
    const [db,executive,floor,certs]=await Promise.all([
      this.database.read(),
      this.executiveCommandCenterService.snapshot(organizationId),
      this.liveFloorServiceCertificationService.snapshot(organizationId,allowedLocationIds),
      this.certifications(organizationId)
    ]);
    const executiveMap=new Map((executive.locations||[]).map(x=>[x.locationId,x]));
    const floorMap=new Map((floor.locations||[]).map(x=>[x.locationId,x]));
    const locations=(db.locations||[]).filter(x=>x.organizationId===organizationId&&this.allowed(x.id,allowedLocationIds)).map(loc=>{
      const source=this.sourceMetrics(db,organizationId,loc.id);
      const shown=executiveMap.get(loc.id)||{};
      const comparisons=[
        this.compare("occupancy",source.occupancy,shown.occupancy,source.sources.occupancy),
        this.compare("reservations",source.reservations,shown.reservations,source.sources.reservations),
        this.compare("waitlist",source.waitlist,shown.waitlist,source.sources.waitlist),
        this.compare("activeStaff",source.activeStaff,shown.activeStaff,source.sources.activeStaff),
        this.compare("activeTickets",source.activeTickets,shown.activeTickets,source.sources.activeTickets),
        this.compare("guestCount",source.guestCount,shown.guestCount,source.sources.guestCount),
        this.compare("revenue",source.revenue,shown.revenue,source.sources.revenue)
      ];
      const criticalIds=new Set(this.metricDefinitions.filter(x=>x.critical).map(x=>x.id));
      const criticalIssues=comparisons.filter(x=>criticalIds.has(x.metric)&&x.status!=="MATCH");
      const discrepancies=comparisons.filter(x=>x.status==="DISCREPANCY");
      const unverified=comparisons.filter(x=>x.status==="UNVERIFIED");
      return {
        locationId:loc.id,locationName:loc.name||loc.displayName||loc.id,
        displayedExecutive:shown,
        authoritative:source,
        comparisons,
        matched:comparisons.filter(x=>x.status==="MATCH").length,
        discrepancies:discrepancies.length,
        unverified:unverified.length,
        criticalIssues,
        floorCertificationState:floorMap.get(loc.id)?.floorServiceState||null,
        trustState:criticalIssues.length?"EXECUTIVE_DATA_NOT_TRUSTED":comparisons.every(x=>x.status==="MATCH")?"EXECUTIVE_DATA_RECONCILED":"EXECUTIVE_DATA_PARTIALLY_VERIFIED"
      };
    });

    const comparisons=locations.flatMap(x=>x.comparisons);
    const criticalIssues=locations.flatMap(x=>x.criticalIssues.map(issue=>({locationId:x.locationId,locationName:x.locationName,...issue})));
    const latest=certs[0]||null;
    const portfolioDisplayed=executive.portfolio||{};
    const authoritativeLocations=locations;
    const authoritativePortfolio={
      occupancy:(()=>{const vals=authoritativeLocations.map(x=>x.authoritative.occupancy).filter(Number.isFinite);return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;})(),
      reservations:authoritativeLocations.reduce((n,x)=>n+x.authoritative.reservations,0),
      waitlist:authoritativeLocations.reduce((n,x)=>n+x.authoritative.waitlist,0),
      activeStaff:authoritativeLocations.reduce((n,x)=>n+x.authoritative.activeStaff,0),
      activeTickets:authoritativeLocations.reduce((n,x)=>n+x.authoritative.activeTickets,0),
      guestCount:(()=>{const vals=authoritativeLocations.map(x=>x.authoritative.guestCount).filter(Number.isFinite);return vals.length?vals.reduce((a,b)=>a+b,0):null;})(),
      revenue:(()=>{const vals=authoritativeLocations.map(x=>x.authoritative.revenue);return vals.length&&vals.every(Number.isFinite)?vals.reduce((a,b)=>a+b,0):null;})()
    };
    const portfolioComparisons=[
      this.compare("occupancy",authoritativePortfolio.occupancy,portfolioDisplayed.occupancy,{rollup:"location authoritative occupancy"}),
      this.compare("guestCount",authoritativePortfolio.guestCount,portfolioDisplayed.guestCount,{rollup:"location authoritative covers"}),
      this.compare("revenue",authoritativePortfolio.revenue,portfolioDisplayed.revenue,{rollup:"authoritative financial source"})
    ];
    const portfolioCritical=portfolioComparisons.filter(x=>["occupancy","revenue"].includes(x.metric)&&x.status!=="MATCH");
    const allCritical=[...criticalIssues,...portfolioCritical.map(x=>({locationId:"portfolio",locationName:"Portfolio",...x}))];

    return {
      version:"51.45.0",generatedAt:this.now(),
      status:allCritical.length===0?(latest?.status==="MANAGEMENT_EXECUTIVE_ACCURACY_CERTIFIED"?"management-executive-accuracy-certified":"management-executive-accuracy-ready-for-certification"):"management-executive-accuracy-blocked",
      headline:`${comparisons.filter(x=>x.status==="MATCH").length}/${comparisons.length} location metric comparisons match authoritative data; ${allCritical.length} critical trust issue(s) remain.`,
      metricDefinitions:this.metricDefinitions,
      locations,
      portfolio:{displayed:portfolioDisplayed,authoritative:authoritativePortfolio,comparisons:portfolioComparisons},
      totals:{
        comparisons:comparisons.length,
        matched:comparisons.filter(x=>x.status==="MATCH").length,
        discrepancies:comparisons.filter(x=>x.status==="DISCREPANCY").length,
        unverified:comparisons.filter(x=>x.status==="UNVERIFIED").length,
        criticalIssues:allCritical.length
      },
      criticalIssues:allCritical,
      certification:latest,
      provenance:{
        authoritativeCollections:["tables","reservations","waitlist","staff","kitchenTickets"],
        financialSourceRequiredForRevenue:true,
        modeledOrDeterministicValuesNeverCountAsAuthoritative:true
      },
      policy:{
        sourceTracingRequired:true,
        discrepanciesBlockCriticalTrust:true,
        unverifiedRevenueBlocksCertification:true,
        staleOrMissingSourceMustRemainVisible:true,
        humanCertificationRequired:true,
        noSyntheticExecutivePass:true,
        noAutomaticMetricCorrection:true,
        noAutomaticFinancialInference:true,
        autonomousProductionChanges:false
      }
    };
  }
  async certify(organizationId,allowedLocationIds,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    if(snap.criticalIssues.length)throw new Error("Critical executive-data trust issues must be resolved before certification.");
    const evidence=String(input.evidence||"").trim().slice(0,3000);
    const note=String(input.note||"").trim().slice(0,1800);
    if(!evidence)throw new Error("Human executive-accuracy evidence is required.");
    if(!note)throw new Error("Human executive-accuracy certification note is required.");
    const record={
      id:`mea_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,status:"MANAGEMENT_EXECUTIVE_ACCURACY_CERTIFIED",
      certifiedAt:this.now(),certifiedBy:actor,evidence,note,
      totalComparisons:snap.totals.comparisons,matched:snap.totals.matched,
      discrepancyCount:snap.totals.discrepancies,unverifiedCount:snap.totals.unverified,
      criticalIssues:0,
      metricCorrectionPerformedByCertification:false,
      financialInferencePerformedByCertification:false,
      autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.managementExecutiveAccuracyCertifications||=[];db.managementExecutiveAccuracyCertifications.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:"V51 management/executive accuracy certified for pilot",category:"pilot_executive_accuracy"});
    this.realtimeHub.publish("management-executive-accuracy:certified",{organizationId,id:record.id});
    return record;
  }
}
module.exports=ManagementExecutiveAccuracyService;
