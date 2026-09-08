(function(){"use strict";
function createBlueCurrentRolePermissionCertificationCenterModule(eventBus,appState){
  const root=document.getElementById("rolePermissionCertification");
  if(!root||!window.BlueCurrentRolePermissionCertificationEngine)return null;
  const e=new window.BlueCurrentRolePermissionCertificationEngine({eventBus,appState}),$=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    $("rpcStatus").textContent=s.status||"—";
    $("rpcChecks").textContent=`${(s.systemChecks||[]).filter(x=>x.passed).length}/${(s.systemChecks||[]).length}`;
    $("rpcRoles").textContent=`${(s.roleMatrix||[]).filter(x=>x.passed).length}/${(s.roleMatrix||[]).length}`;
    $("rpcScopes").textContent=`${(s.membershipScope||[]).filter(x=>x.passed).length}/${(s.membershipScope||[]).length}`;
    $("rpcHeadline").textContent=s.headline||"Role permission certification unavailable.";
    $("rpcSystemChecks").innerHTML=(s.systemChecks||[]).map(x=>`<article><strong>${x.passed?"PASS":"FAIL"} · ${esc(x.label)}</strong><span>${esc(x.actual)}</span></article>`).join("");
    $("rpcRolesList").innerHTML=(s.roleMatrix||[]).map(x=>`<article><strong>${x.passed?"PASS":"FAIL"} · ${esc(x.label)}</strong><span>${esc(x.scope)} · UI ${esc(x.uiProfile)} · ${esc(x.actualPermissions.join(", "))}</span>${x.mismatches?.length?`<p>Mismatches: ${x.mismatches.map(m=>`${esc(m.permission)} expected ${esc(m.expected)} got ${esc(m.actual)}`).join(" · ")}</p>`:""}</article>`).join("");
    $("rpcMemberships").innerHTML=(s.membershipScope||[]).map(x=>`<article><strong>${x.passed?"PASS":"FAIL"} · ${esc(x.role)} · ${esc(x.userId)}</strong><span>${esc((x.locationIds||[]).join(", "))}${x.issues?.length?` · ${esc(x.issues.join(", "))}`:""}</span></article>`).join("")||"<article><strong>No memberships found.</strong></article>";
    $("rpcEnforcement").textContent=`API auth ${s.enforcement?.apiAuthenticationRequired?"ON":"OFF"} · location scope ${s.enforcement?.locationScopeRequired?"ON":"OFF"} · owner admin ${s.enforcement?.ownerAdminPermission?"ON":"OFF"} · administrator admin ${s.enforcement?.administratorAdminPermission?"ON":"OFF"}`;
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("rpcHeadline").textContent=err.message;}}
  $("rpcCertify")?.addEventListener("click",async()=>{try{await e.certify({evidence:$("rpcEvidence").value,note:$("rpcNote").value});await load();}catch(err){$("rpcHeadline").textContent=err.message;}});
  $("rpcRefresh")?.addEventListener("click",load);
  ["role-permission:certified","auth:restored","data-integrity:certified"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentRolePermissionCertificationCenterModule=createBlueCurrentRolePermissionCertificationCenterModule;
})();