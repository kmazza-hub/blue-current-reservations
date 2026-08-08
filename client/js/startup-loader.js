(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const fullStartup = params.get("full") === "1";
  const requestedPacks = new Set((params.get("pack") || "").split(",").map(v => v.trim()).filter(Boolean));
  const appSource = `js/app-v15.1.3.js?v=44.17.0`;
  const deferred = [...document.querySelectorAll('script[type="text/bluecurrent-deferred"][data-src]')];
  const startedAt = performance.now();
  const storageKey = "bluecurrent:last-good-startup";
  const failureKey = "bluecurrent:startup-failures";

  const PACK_RULES = {
    operations: /(reservationYield|kitchenThroughput|guestRecovery|laborDeployment|serviceQuality|inventoryWaste|menuMix|dailyProfitPlan|vendorPurchase|demandPrepForecast|profitCloseout|supplierVariance|prepExecution|teamCollaboration|operationalKnowledge|shiftCloseout|shiftIntelligence|executiveDecisionFeed|operationsCopilot)/i,
    intelligence: /(digitalTwinVisualization|executiveMorningBrief|intelligenceGraph|predictiveOverlay|restaurantReplay|explainableDecision|profitScenario|smartAlertRouter|restaurantPerformance|outcomeIntelligence|marginIntelligence|costVariance|predictiveService|aiOrchestration|operationalDigitalTwin|portfolioIntelligence|performanceLearning)/i,
    enterprise: /(crossLocationPulse|enterpriseOperations|weeklyProfitReview|executiveBriefing|portfolioPerformance|pilotRelease|pilotOperations|pilotReview|deploymentReadiness|postLaunchValue|expansionBenchmark|performanceGovernance|enterpriseValuePlan|pilotOnboarding|pilotLaunch|pilotEvidence|accessReadiness|releaseCertification)/i,
    aip: /(aipToolRegistry|aipAgentRuntime|aipPromptOrchestrator|aipGovernance|aipMissionControl|aipApprovalQueue|aipContextGraph|aipMemoryVault|aipScenarioLab|aipAgentBuilder|aipEvaluation|aipRunbookCompiler|aipPromptLibrary|aipDeploymentControl|aipObservability|aipKnowledgeSource|aipModelRouting|aipSafetyTest|aipImprovementBacklog|aipPromptExperiment|aipLearningReleaseGate|aipCommandConsole|aipExecutionPlan|aipOutcomeReview|aipPolicyComposer|aipToolGateway|aipRunScheduler|aipPolicyEnforcement|aipExecutionQueue|aipAutonomyBoundary|hospitalityOntology|decisionObject|causalDecisionTrace|operationalMemory|decisionHorizonForecast|executiveReasoningBrief|portfolioReasoning|decisionLeverage|portfolioCoordinationPlan|adaptiveStrategy|decisionTradeoff|executiveWorkspace|predictiveOptimization|agentNegotiation|v41ProductionReadiness)/i,
    integrations: /(integrationControl|signalQuality|pilotTelemetry|dataContract|connectorSync|reconciliation|connectorConfiguration|dataIntakeSandbox|pilotSignalBridge|canonicalMapping|ingestionQueue|sourcePromotion|trustedDataset|dataLineage|pilotSyncRehearsal)/i,
    live: /(liveConnectorRuntime|canonicalEventGateway|liveSourceHealth|eventContractRegistry|eventRecovery|liveOperationsBridge|sourceAdapterRegistry|deliveryAssurance|ingestionObservability|sourceCheckpoint|replayWindow|reasoningFeedGate|streamReconciliation|connectorBackpressure|liveTwinSync|liveProvenance|sourceCutover|liveEvidenceCertification|locationSourceBinding|liveCoverageMatrix|enterpriseLiveReadiness|locationCutover|portfolioLiveTelemetry|enterprisePilotCutover|pilotSession|pilotSignalValidation|mvpReadiness|pilotSlo|pilotSupport|mvpGoLive)/i
  };

  function inferPack(src) {
    for (const [pack, pattern] of Object.entries(PACK_RULES)) if (pattern.test(src)) return pack;
    return "platform";
  }

  function centerIdFromSource(src) {
    const file = src.split("/").pop()?.split("?")[0] || "";
    return file.endsWith("Center.js") ? file.replace(/\.js$/, "") : null;
  }

  const manifest = {};
  deferred.forEach((placeholder) => {
    const src = placeholder.dataset.src;
    const explicitPack = placeholder.hasAttribute("data-pack");
    const pack = placeholder.dataset.pack || inferPack(src);
    placeholder.dataset.pack = pack;
    placeholder.dataset.packExplicit = explicitPack ? "true" : "false";
    const centerId = placeholder.dataset.center || centerIdFromSource(src);
    if (centerId) placeholder.dataset.center = centerId;
    manifest[pack] ||= { pack, scripts: [], centers: [] };
    manifest[pack].scripts.push(src);
    if (centerId) manifest[pack].centers.push(centerId);
  });

  const mode = fullStartup ? "full" : requestedPacks.size ? "progressive" : "focused";
  document.documentElement.dataset.assetMode = mode;
  window.BlueCurrentAssetMode = mode;
  window.BlueCurrentRequestedPacks = [...requestedPacks];
  window.BlueCurrentFeaturePacks = manifest;
  window.BlueCurrentActivatedCenters = new Set(
    fullStartup
      ? Object.values(manifest).flatMap(group => group.centers)
      : [...requestedPacks].flatMap(pack => manifest[pack]?.centers || [])
  );

  const guard = {
    mode,
    requestedPacks: [...requestedPacks],
    startedAt: Date.now(),
    failures: Number(sessionStorage.getItem(failureKey) || 0),
    lastGood: localStorage.getItem(storageKey) || "focused",
    status: "starting"
  };
  window.BlueCurrentBootGuard = guard;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.body.appendChild(script);
    });
  }

  function showFailure(message) {
    if (document.querySelector(".startup-failure-banner")) return;
    const banner = document.createElement("div");
    banner.className = "startup-failure-banner";
    banner.setAttribute("role", "alert");
    banner.innerHTML = `<strong>Blue Current could not finish loading.</strong><span>${message}</span><button type="button" data-action="focused">Retry focused startup</button><button type="button" data-action="last">Use last good profile</button>`;
    banner.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      if (!action) return;
      const next = new URL(window.location.href);
      next.search = "";
      if (action === "last" && guard.lastGood !== "focused") {
        if (guard.lastGood === "full") next.searchParams.set("full", "1");
        else next.searchParams.set("pack", guard.lastGood.replace("progressive:", ""));
      }
      window.location.assign(next.toString());
    });
    document.body.prepend(banner);
  }

  function selectedPlaceholders() {
    if (fullStartup) return deferred;
    if (!requestedPacks.size) return [];
    // Feature packs now load only scripts explicitly assigned to that pack.
    // Legacy inferred scripts remain available through full mode and future on-demand loading.
    const selected = deferred.filter(item => item.dataset.packExplicit === "true" && requestedPacks.has(item.dataset.pack));
    // V39.6 — preserve the minimal Operations slice even when older HTML metadata is cached.
    if (requestedPacks.has("aip")) {
      const requiredAip = /(?:aipToolRegistry|aipAgentRuntime|aipPromptOrchestrator|aipGovernance|aipMissionControl|aipApprovalQueue|aipContextGraph|aipMemoryVault|aipScenarioLab|aipImprovementBacklog|aipPromptExperiment|aipLearningReleaseGate|aipCommandConsole|aipExecutionPlan|aipOutcomeReview|aipPolicyComposer|aipToolGateway|aipRunScheduler|aipPolicyEnforcement|aipExecutionQueue|aipAutonomyBoundary|hospitalityOntology|decisionObject|causalDecisionTrace|operationalMemory|decisionHorizonForecast|executiveReasoningBrief|portfolioReasoning|decisionLeverage|portfolioCoordinationPlan|adaptiveStrategy|decisionTradeoff|executiveWorkspace|predictiveOptimization|agentNegotiation|v41ProductionReadiness)(?:Engine|Center)\.js/i;
      deferred.forEach(item => { if (requiredAip.test(item.dataset.src) && !selected.includes(item)) selected.push(item); });
    }
    if (requestedPacks.has("operations")) {
      const required = /(?:serviceExceptionQueue|escalationControl|recoveryVerification|openingReadiness|shiftCheckpoint|dailyValueReport|recommendationCalibration|operationsLearningReview|nextShiftPlan|decisionExecutionLedger|outcomeCapture|shiftCloseBrief|priorityFocus|actionOwnership|shiftHandoffSnapshot|operationsWorkspace|shiftIntelligence|executiveDecisionFeed|operationsCopilot)(?:Engine|Center)\.js/i;
      deferred.forEach(item => { if (required.test(item.dataset.src) && !selected.includes(item)) selected.push(item); });
    }
    return selected;
  }

  function applyCenterVisibility(selected) {
    const active = new Set(selected.map(item => item.dataset.center).filter(Boolean));
    document.querySelectorAll("[id$='Center'], [id$='center']").forEach((center) => {
      if (!center.id) return;
      const isEssential = [
        "unifiedCommandCenter", "guidedShiftCenter", "operatorCopilotCenter",
        "roleExperienceCenter", "commandActionInboxCenter", "shiftProfitPulseCenter",
        "featurePackLoaderCenter", "bootRecoveryCenter"
      ].includes(center.id);
      const shouldShow = fullStartup || isEssential || active.has(center.id);
      if (!shouldShow) {
        center.hidden = true;
        center.setAttribute("aria-hidden", "true");
        center.setAttribute("inert", "");
      } else {
        center.hidden = false;
        center.removeAttribute("aria-hidden");
        center.removeAttribute("inert");
      }
    });
  }

  function loadScriptWithTimeout(src, timeoutMs = 5000) {
    return Promise.race([
      loadScript(src),
      new Promise((_, reject) => window.setTimeout(() => reject(new Error(`Timed out loading ${src}`)), timeoutMs))
    ]);
  }

  const watchdog = window.setTimeout(() => {
    if (guard.status === "complete") return;
    guard.status = "timeout";
    guard.failures += 1;
    sessionStorage.setItem(failureKey, String(guard.failures));
    window.dispatchEvent(new CustomEvent("bluecurrent:boot-timeout", { detail: { ...guard } }));
    showFailure("Startup exceeded the 12-second performance budget.");
  }, 12000);

  async function boot() {
    try {
      const selected = selectedPlaceholders();
      applyCenterVisibility(selected);
      for (let index = 0; index < selected.length; index += 1) {
        await loadScriptWithTimeout(selected[index].dataset.src);
        if ((index + 1) % 2 === 0) await new Promise(resolve => window.setTimeout(resolve, 0));
      }
      await loadScriptWithTimeout(appSource, 8000);

      // V38.5.4 — bounded authentication and workspace handoff.
      const coordinator = window.BlueCurrentAuthSession;
      const readiness = coordinator?.whenReady
        ? await Promise.race([
            coordinator.whenReady(),
            new Promise(resolve => window.setTimeout(() => resolve(coordinator.snapshot?.() || { authenticated: false }), 4000))
          ])
        : coordinator?.snapshot?.() || { authenticated: false };
      const overlay = document.getElementById("authOverlay");
      const accountSection = document.getElementById("auth-organizations");
      if (readiness?.authenticated) {
        overlay?.classList.remove("open");
        overlay?.setAttribute("aria-hidden", "true");
        document.body.classList.remove("auth-locked");
        if (accountSection) {
          accountSection.hidden = true;
          accountSection.setAttribute("aria-hidden", "true");
          accountSection.setAttribute("inert", "");
        }
      } else if (overlay) {
        if (accountSection) accountSection.hidden = true;
        overlay.classList.add("open");
        overlay.removeAttribute("aria-hidden");
        document.body.classList.add("auth-locked");
        document.getElementById("authEmail")?.focus?.();
      }

      window.clearTimeout(watchdog);
      const duration = Math.round(performance.now() - startedAt);
      guard.status = "complete";
      guard.durationMs = duration;
      guard.loadedDeferredScripts = selected.length;
      guard.totalDeferredScripts = deferred.length;
      const profile = fullStartup ? "full" : requestedPacks.size ? `progressive:${[...requestedPacks].sort().join(",")}` : "focused";
      localStorage.setItem(storageKey, profile);
      sessionStorage.setItem(failureKey, "0");
      document.documentElement.dataset.bootComplete = "true";
      window.BlueCurrentBootReport = {
        status: "complete", mode, profile, durationMs: duration,
        requestedPacks: [...requestedPacks],
        loadedScripts: selected.map(item => item.dataset.src),
        deferredScripts: deferred.length - selected.length
      };
      window.dispatchEvent(new CustomEvent("bluecurrent:boot-complete", {
        detail: { mode, profile, durationMs: duration, loadedDeferredScripts: selected.length, deferredScripts: deferred.length, requestedPacks: [...requestedPacks] }
      }));
      const summary = document.getElementById("startupDiagnosticsSummary");
      const dot = document.getElementById("startupDiagnosticsDot");
      if (summary) summary.textContent = `V44.17.0 ready · ${duration}ms`;
      if (dot) dot.className = "ok";
      // Local development can be held open by optional third-party assets. Once the
      // application is ready, stop those nonessential pending resource loads.
      if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
        window.setTimeout(() => {
          if (document.readyState !== "complete") window.stop();
        }, 1500);
      }
      console.info(`Blue Current ${mode} assets loaded in ${duration}ms; ${selected.length} secondary scripts activated, ${deferred.length - selected.length} deferred.`);
    } catch (error) {
      window.clearTimeout(watchdog);
      guard.status = "failed";
      guard.failures += 1;
      sessionStorage.setItem(failureKey, String(guard.failures));
      document.documentElement.dataset.bootFailed = "true";
      console.error("Blue Current startup loader failed", error);
      showFailure(error.message);
      window.dispatchEvent(new CustomEvent("bluecurrent:boot-failed", { detail: { message: error.message, ...guard } }));
    }
  }

  document.addEventListener("click", (event) => {
    const fullTrigger = event.target.closest("#unifiedCommandViewToggle, #roleExperienceShowAll, [data-workspace='full']");
    if (!fullTrigger || fullStartup) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = new URL(window.location.href);
    next.search = "";
    next.searchParams.set("full", "1");
    window.location.assign(next.toString());
  }, true);

  boot();
})();
