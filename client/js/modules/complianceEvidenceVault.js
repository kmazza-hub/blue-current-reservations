(() => {
  "use strict";

  const KEYS = {
    certificates:"blueCurrent.autonomyAssuranceCertification.v34.1.10",
    renewals:"blueCurrent.certificationRenewalMonitor.v34.1.11",
    outcomes:"blueCurrent.autonomyOutcomeVerifier.v34.1.4",
    incidents:"blueCurrent.autonomyIncidentResponseCenter.v34.1.8",
    recovery:"blueCurrent.autonomyRecoveryRequalification.v34.1.9",
    rollouts:"blueCurrent.autonomyRolloutManager.v34.1.6",
    guardrails:"blueCurrent.aiBrainAutonomyGuardrails.v34.1.3",
    governor:"blueCurrent.autonomyPerformanceGovernor.v34.1.5",
    storage:"blueCurrent.complianceEvidenceVault.v34.1.12"
  };

  const byId = id => document.getElementById(id);

  const state = {
    records:[],
    history:[],
    selectedId:null,
    domainFilter:"all",
    typeFilter:"all",
    package:null
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    return `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(",")}}`;
  }

  function hashString(text) {
    let hash = 2166136261;
    for (let index=0; index<text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash,16777619);
    }
    return `FNV1A-${(hash >>> 0).toString(16).padStart(8,"0").toUpperCase()}`;
  }

  function inferDomain(item) {
    const explicit = item.domain || item.locationDomain;
    if (explicit) return explicit;
    const text = `${item.title || ""} ${item.detail || ""} ${item.note || ""}`.toLowerCase();
    if (/kitchen|ticket|expo|station/.test(text)) return "Kitchen";
    if (/staff|labor|workforce|coverage/.test(text)) return "Staffing";
    if (/floor|table|section|seating/.test(text)) return "Floor";
    if (/demand|reservation|pacing|arrival/.test(text)) return "Demand";
    if (/recovery|commitment|accountability|overdue/.test(text)) return "Executive recovery";
    return "Portfolio";
  }

  function sourceModule(type) {
    return {
      certificate:"autonomyAssuranceCertification",
      renewal:"certificationRenewalMonitor",
      outcome:"autonomyOutcomeVerifier",
      incident:"autonomyIncidentResponseCenter",
      recovery:"autonomyRecoveryRequalification",
      rollout:"autonomyRolloutManager",
      policy:"aiBrainAutonomyGuardrails"
    }[type] || "restaurantAiBrainV341";
  }

  function recordFrom(type,item,index) {
    const payload = JSON.parse(JSON.stringify(item));
    const timestamp =
      item.updatedAt || item.recordedAt || item.createdAt || item.issuedAt ||
      item.detectedAt || item.resolvedAt || new Date().toISOString();
    const id = `${type}_${item.id || item.domain || index}`;
    return {
      id,
      type,
      domain:inferDomain(item),
      title:item.title || item.action || item.name || `${type} record`,
      detail:item.detail || item.note || item.status || "Governance evidence record.",
      timestamp,
      payload,
      hash:hashString(stableStringify(payload)),
      integrity:"unverified",
      source:sourceModule(type)
    };
  }

  function buildRecords() {
    const certificateState = read(KEYS.certificates);
    const renewalState = read(KEYS.renewals);
    const outcomeState = read(KEYS.outcomes);
    const incidentState = read(KEYS.incidents);
    const recoveryState = read(KEYS.recovery);
    const rolloutState = read(KEYS.rollouts);
    const guardrailState = read(KEYS.guardrails);
    const governorState = read(KEYS.governor);
    const stored = read(KEYS.storage);
    const verifiedHashes = new Set(
      Array.isArray(stored.verifiedHashes) ? stored.verifiedHashes : []
    );

    const collections = [
      ["certificate",Array.isArray(certificateState.certificates) ? certificateState.certificates : []],
      ["renewal",Array.isArray(renewalState.decisions) ? renewalState.decisions : []],
      ["outcome",Array.isArray(outcomeState.history) ? outcomeState.history : []],
      ["incident",Array.isArray(incidentState.incidents) ? incidentState.incidents : []],
      ["recovery",Array.isArray(recoveryState.plans) ? recoveryState.plans : []],
      ["rollout",Array.isArray(rolloutState.rollouts) ? rolloutState.rollouts : []],
      ["policy",[
        guardrailState.policy ? {
          id:"guardrail_policy",
          title:"Autonomy guardrail policy",
          detail:"Saved autonomy execution thresholds and requirements.",
          domain:"Portfolio",
          updatedAt:guardrailState.updatedAt,
          ...guardrailState.policy
        } : null,
        {
          id:"performance_governor",
          title:"Autonomy performance governor",
          detail:"Saved governor status, emergency-stop state, and suspended domains.",
          domain:"Portfolio",
          updatedAt:governorState.updatedAt,
          emergencyStop:governorState.emergencyStop,
          suspendedDomains:governorState.suspendedDomains
        }
      ].filter(Boolean)]
    ];

    state.records = collections.flatMap(([type,items]) =>
      items.map((item,index) => recordFrom(type,item,index))
    ).map(record => ({
      ...record,
      integrity:verifiedHashes.has(record.hash) ? "verified" : "unverified"
    })).sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp));

    if (state.selectedId && !state.records.some(record => record.id === state.selectedId)) {
      state.selectedId = null;
    }
  }

  function save() {
    const stored = read(KEYS.storage);
    localStorage.setItem(KEYS.storage,JSON.stringify({
      ...stored,
      selectedId:state.selectedId,
      domainFilter:state.domainFilter,
      typeFilter:state.typeFilter,
      history:state.history.slice(-100),
      package:state.package,
      updatedAt:new Date().toISOString()
    }));
  }

  function load() {
    const stored = read(KEYS.storage);
    state.selectedId = stored.selectedId || null;
    state.domainFilter = stored.domainFilter || "all";
    state.typeFilter = stored.typeFilter || "all";
    state.history = Array.isArray(stored.history) ? stored.history : [];
    state.package = stored.package || null;
  }

  function addHistory(action,detail) {
    state.history.push({
      id:`vault_event_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      action,
      detail,
      createdAt:new Date().toISOString()
    });
    save();
  }

  function selected() {
    return state.records.find(record => record.id === state.selectedId) || null;
  }

  function filteredRecords() {
    return state.records.filter(record =>
      (state.domainFilter === "all" || record.domain === state.domainFilter) &&
      (state.typeFilter === "all" || record.type === state.typeFilter)
    );
  }

  function gaps() {
    const domains = ["Kitchen","Staffing","Floor","Demand","Executive recovery"];
    const gaps = [];

    domains.forEach(domain => {
      const domainRecords = state.records.filter(record => record.domain === domain);
      const required = ["certificate","outcome","rollout"];
      required.forEach(type => {
        if (!domainRecords.some(record => record.type === type)) {
          gaps.push({
            severity:type === "certificate" ? "high" : "medium",
            title:`Missing ${type} evidence for ${domain}`,
            detail:`Audit readiness requires at least one ${type} record for ${domain}.`
          });
        }
      });

      const incidents = domainRecords.filter(record => record.type === "incident");
      if (incidents.length && !domainRecords.some(record => record.type === "recovery")) {
        gaps.push({
          severity:"high",
          title:`Missing recovery evidence for ${domain}`,
          detail:"Incident records exist without a corresponding recovery or requalification record."
        });
      }
    });

    if (!state.records.some(record => record.type === "policy")) {
      gaps.push({
        severity:"high",
        title:"Missing autonomy policy evidence",
        detail:"The vault requires a saved guardrail or governor policy record."
      });
    }

    return gaps;
  }

  function renderRecords() {
    const root = byId("complianceEvidenceVaultRecordList");
    root.replaceChildren();
    const records = filteredRecords();

    if (!records.length) {
      const empty = document.createElement("div");
      empty.className = "compliance-evidence-vault-empty";
      empty.textContent = "No evidence records match the selected filters.";
      root.append(empty);
      return;
    }

    records.forEach((record,index) => {
      const card = document.createElement("article");
      card.className = "compliance-evidence-vault-record";
      card.dataset.integrity = record.integrity;
      card.classList.toggle("is-selected",record.id === state.selectedId);
      card.innerHTML =
        "<span class='compliance-evidence-vault-rank'></span>" +
        "<div class='compliance-evidence-vault-copy'><strong></strong><span></span></div>" +
        "<span class='compliance-evidence-vault-badge'></span>";

      card.querySelector(".compliance-evidence-vault-rank").textContent = String(index+1);
      card.querySelector(".compliance-evidence-vault-copy strong").textContent = record.title;
      card.querySelector(".compliance-evidence-vault-copy span").textContent =
        `${record.domain} · ${record.type} · ${new Date(record.timestamp).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}`;
      card.querySelector(".compliance-evidence-vault-badge").textContent = record.integrity;

      card.addEventListener("click",() => {
        state.selectedId = record.id;
        save();
        render();
      });
      root.append(card);
    });
  }

  function renderInspector() {
    const record = selected();
    ["complianceEvidenceVaultVerify","complianceEvidenceVaultOpenSource"]
      .forEach(id => byId(id).disabled = !record);

    if (!record) {
      byId("complianceEvidenceVaultSelectedTitle").textContent = "Choose a record";
      byId("complianceEvidenceVaultSelectedDetail").textContent =
        "Select an evidence record to review its source, domain, timestamp, integrity hash, and supporting metadata.";
      return;
    }

    byId("complianceEvidenceVaultSelectedTitle").textContent = record.title;
    byId("complianceEvidenceVaultSelectedDetail").textContent = record.detail;
    byId("complianceEvidenceVaultSelectedType").textContent =
      record.type.charAt(0).toUpperCase()+record.type.slice(1);
    byId("complianceEvidenceVaultSelectedDomain").textContent = record.domain;
    byId("complianceEvidenceVaultSelectedTime").textContent =
      new Date(record.timestamp).toLocaleString();
    byId("complianceEvidenceVaultSelectedIntegrity").textContent =
      `${record.integrity} · ${record.hash}`;
  }

  function verifySelected() {
    const record = selected();
    if (!record) return;

    const calculated = hashString(stableStringify(record.payload));
    if (calculated !== record.hash) {
      byId("complianceEvidenceVaultStatus").textContent =
        "Integrity verification failed.";
      return;
    }

    const stored = read(KEYS.storage);
    const verifiedHashes = new Set(
      Array.isArray(stored.verifiedHashes) ? stored.verifiedHashes : []
    );
    verifiedHashes.add(record.hash);

    localStorage.setItem(KEYS.storage,JSON.stringify({
      ...stored,
      verifiedHashes:[...verifiedHashes],
      selectedId:state.selectedId,
      domainFilter:state.domainFilter,
      typeFilter:state.typeFilter,
      history:state.history,
      package:state.package,
      updatedAt:new Date().toISOString()
    }));

    record.integrity = "verified";
    addHistory("Evidence verified",`${record.title} passed integrity verification.`);
    render();
    byId("complianceEvidenceVaultStatus").textContent =
      "Evidence integrity verified.";
  }

  function renderGaps() {
    const root = byId("complianceEvidenceVaultGapList");
    root.replaceChildren();
    const items = gaps();

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "compliance-evidence-vault-empty";
      empty.textContent = "No material evidence gaps were detected.";
      root.append(empty);
    } else {
      items.forEach(entry => {
        const item = document.createElement("article");
        item.className = "compliance-evidence-vault-gap-item";
        item.dataset.severity = entry.severity;
        item.innerHTML = "<div><strong></strong><span></span></div><b></b>";
        item.querySelector("strong").textContent = entry.title;
        item.querySelector("span").textContent = entry.detail;
        item.querySelector("b").textContent = entry.severity;
        root.append(item);
      });
    }

    byId("complianceEvidenceVaultGapCount").textContent =
      `${items.length} gap${items.length === 1 ? "" : "s"}`;
  }

  function metrics() {
    const gapItems = gaps();
    const domains = new Set(
      state.records
        .map(record => record.domain)
        .filter(domain => domain && domain !== "Portfolio")
    );
    const verified = state.records.filter(record => record.integrity === "verified").length;
    const coverage = state.records.length
      ? Math.round((state.records.length-gapItems.length)/state.records.length*100)
      : 0;
    const integrity = state.records.length
      ? Math.round(verified/state.records.length*100)
      : 0;
    const readiness = Math.max(0,Math.min(100,
      Math.round(coverage*.6 + integrity*.4)
    ));

    return {gapItems,domains,verified,coverage,integrity,readiness};
  }

  function renderKPIs() {
    const data = metrics();

    byId("complianceEvidenceVaultRecordCount").textContent =
      String(state.records.length);
    byId("complianceEvidenceVaultDomainCount").textContent =
      String(data.domains.size);
    byId("complianceEvidenceVaultVerifiedCount").textContent =
      String(data.verified);
    byId("complianceEvidenceVaultMissingCount").textContent =
      String(data.gapItems.length);
    byId("complianceEvidenceVaultReadiness").textContent =
      `${data.readiness}%`;
    byId("complianceEvidenceVaultScore").textContent =
      String(data.readiness);
    byId("complianceEvidenceVaultLabel").textContent =
      data.readiness >= 90 ? "Audit-ready evidence set" :
      data.readiness >= 70 ? "Evidence review required" :
      state.records.length ? "Material evidence gaps remain" : "Awaiting evidence";
    byId("complianceEvidenceVaultScoreCard").dataset.tone =
      data.readiness >= 90 ? "stable" :
      data.readiness >= 70 ? "watch" : "risk";
  }

  function generatePackage() {
    const data = metrics();
    const certificateState = read(KEYS.certificates);
    const renewalState = read(KEYS.renewals);

    state.package = {
      packageId:`audit_package_${Date.now()}`,
      generatedAt:new Date().toISOString(),
      version:"34.1.12",
      summary:{
        evidenceRecords:state.records.length,
        verifiedRecords:data.verified,
        domainsCovered:data.domains.size,
        evidenceGaps:data.gapItems.length,
        auditReadiness:data.readiness
      },
      certificates:Array.isArray(certificateState.certificates)
        ? certificateState.certificates
        : [],
      renewalDecisions:Array.isArray(renewalState.decisions)
        ? renewalState.decisions
        : [],
      evidence:state.records.map(record => ({
        id:record.id,
        type:record.type,
        domain:record.domain,
        title:record.title,
        timestamp:record.timestamp,
        hash:record.hash,
        integrity:record.integrity,
        payload:record.payload
      })),
      gaps:data.gapItems
    };

    save();
    addHistory(
      "Audit package generated",
      `${state.package.summary.evidenceRecords} records · ${state.package.summary.auditReadiness}% readiness.`
    );

    byId("complianceEvidenceVaultExportTitle").textContent =
      `Audit package ${state.package.packageId}`;
    byId("complianceEvidenceVaultExportDetail").textContent =
      `${state.package.summary.evidenceRecords} indexed records, ${state.package.summary.verifiedRecords} integrity-verified records, and ${state.package.summary.evidenceGaps} evidence gaps.`;
    byId("complianceEvidenceVaultCopy").disabled = false;
    byId("complianceEvidenceVaultDownload").disabled = false;
    byId("complianceEvidenceVaultStatus").textContent =
      "Audit package generated.";
    renderHistory();
  }

  function packageText() {
    if (!state.package) return "";
    return [
      "Blue Current Compliance Evidence Vault",
      `Package: ${state.package.packageId}`,
      `Generated: ${state.package.generatedAt}`,
      `Version: ${state.package.version}`,
      `Evidence records: ${state.package.summary.evidenceRecords}`,
      `Verified records: ${state.package.summary.verifiedRecords}`,
      `Domains covered: ${state.package.summary.domainsCovered}`,
      `Evidence gaps: ${state.package.summary.evidenceGaps}`,
      `Audit readiness: ${state.package.summary.auditReadiness}%`,
      "",
      "Evidence index:",
      ...state.package.evidence.map((record,index) =>
        `${index+1}. ${record.domain} · ${record.type} · ${record.title} · ${record.integrity} · ${record.hash}`
      ),
      "",
      "Evidence gaps:",
      ...(state.package.gaps.length
        ? state.package.gaps.map((gap,index) => `${index+1}. ${gap.title}: ${gap.detail}`)
        : ["None"])
    ].join("\n");
  }

  function copyPackage() {
    if (!state.package) return;
    navigator.clipboard?.writeText(packageText()).then(() => {
      byId("complianceEvidenceVaultStatus").textContent =
        "Audit package copied.";
    }).catch(() => {
      byId("complianceEvidenceVaultStatus").textContent =
        "Copy unavailable in this browser.";
    });
  }

  function downloadPackage() {
    if (!state.package) return;
    const blob = new Blob(
      [JSON.stringify(state.package,null,2)],
      {type:"application/json"}
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${state.package.packageId}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    byId("complianceEvidenceVaultStatus").textContent =
      "Audit package downloaded.";
  }

  function renderHistory() {
    const root = byId("complianceEvidenceVaultHistoryList");
    root.replaceChildren();

    if (!state.history.length) {
      const empty = document.createElement("div");
      empty.className = "compliance-evidence-vault-empty";
      empty.textContent = "Vault activity will appear here.";
      root.append(empty);
      return;
    }

    state.history.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "compliance-evidence-vault-history-item";
      item.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      item.querySelector("strong").textContent = entry.action;
      item.querySelector("span").textContent = entry.detail;
      item.querySelector("time").textContent =
        new Date(entry.createdAt).toLocaleTimeString([], {
          hour:"numeric",
          minute:"2-digit"
        });
      root.append(item);
    });
  }

  function renderExport() {
    if (!state.package) {
      byId("complianceEvidenceVaultExportTitle").textContent =
        "Audit package not generated";
      byId("complianceEvidenceVaultExportDetail").textContent =
        "Generate a complete governance package with indexed evidence, integrity hashes, gaps, and certification status.";
      byId("complianceEvidenceVaultCopy").disabled = true;
      byId("complianceEvidenceVaultDownload").disabled = true;
      return;
    }

    byId("complianceEvidenceVaultExportTitle").textContent =
      `Audit package ${state.package.packageId}`;
    byId("complianceEvidenceVaultExportDetail").textContent =
      `${state.package.summary.evidenceRecords} indexed records, ${state.package.summary.verifiedRecords} verified, ${state.package.summary.evidenceGaps} gaps, ${state.package.summary.auditReadiness}% readiness.`;
    byId("complianceEvidenceVaultCopy").disabled = false;
    byId("complianceEvidenceVaultDownload").disabled = false;
  }

  function render() {
    buildRecords();
    renderKPIs();
    renderRecords();
    renderInspector();
    renderGaps();
    renderExport();
    renderHistory();
    byId("complianceEvidenceVaultUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{
        hour:"numeric",
        minute:"2-digit"
      }).format(new Date())}.`;
  }

  function init() {
    if (!byId("complianceEvidenceVault")) return;

    load();
    byId("complianceEvidenceVaultDomainFilter").value = state.domainFilter;
    byId("complianceEvidenceVaultTypeFilter").value = state.typeFilter;

    byId("complianceEvidenceVaultDomainFilter")?.addEventListener("change",event => {
      state.domainFilter = event.target.value;
      save();
      renderRecords();
    });
    byId("complianceEvidenceVaultTypeFilter")?.addEventListener("change",event => {
      state.typeFilter = event.target.value;
      save();
      renderRecords();
    });
    byId("complianceEvidenceVaultVerify")?.addEventListener("click",verifySelected);
    byId("complianceEvidenceVaultOpenSource")?.addEventListener("click",() => {
      const record = selected();
      byId(record?.source)?.scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
    });
    byId("complianceEvidenceVaultGenerate")?.addEventListener("click",generatePackage);
    byId("complianceEvidenceVaultCopy")?.addEventListener("click",copyPackage);
    byId("complianceEvidenceVaultDownload")?.addEventListener("click",downloadPackage);
    byId("complianceEvidenceVaultClearHistory")?.addEventListener("click",() => {
      state.history = [];
      save();
      renderHistory();
    });

    [
      "bluecurrent:autonomy-certification-issued",
      "bluecurrent:autonomy-certification-renewed",
      "bluecurrent:autonomy-certificate-suspended",
      "bluecurrent:autonomy-outcome-verified",
      "bluecurrent:autonomy-incident-resolved",
      "bluecurrent:autonomy-reinstated",
      "bluecurrent:autonomy-governor-policy-applied"
    ].forEach(name => window.addEventListener(name,render));

    window.addEventListener("storage",event => {
      if (Object.values(KEYS).includes(event.key)) {
        load();
        render();
      }
    });

    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();