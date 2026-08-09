(function(global){"use strict";
class BlueCurrentReservationGuestJourneyEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/reservation-guest-journey",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Reservation guest journey failed (${r.status})`);this.appState?.update?.({reservationGuestJourney:d});return d;}
  async start(locationId,payload={}){const r=await fetch(`/api/reservation-guest-journey/locations/${encodeURIComponent(locationId)}/start`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Guest journey start failed (${r.status})`);this.eventBus?.emit?.("reservation-guest-journey:started",structuredClone(d));return d;}
  async checkpoint(sessionId,payload={}){const r=await fetch(`/api/reservation-guest-journey/sessions/${encodeURIComponent(sessionId)}/checkpoint`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Guest journey checkpoint failed (${r.status})`);this.eventBus?.emit?.("reservation-guest-journey:checkpoint",structuredClone(d));return d;}
  async certify(locationId,payload={}){const r=await fetch(`/api/reservation-guest-journey/locations/${encodeURIComponent(locationId)}/certify`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Guest journey certification failed (${r.status})`);this.eventBus?.emit?.("reservation-guest-journey:certified",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentReservationGuestJourneyEngine;
if(global)global.BlueCurrentReservationGuestJourneyEngine=BlueCurrentReservationGuestJourneyEngine;
})(typeof window!=="undefined"?window:globalThis);