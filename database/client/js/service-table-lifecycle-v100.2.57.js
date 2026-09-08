(() => {
  "use strict";
  const VERSION = "100.2.57";
  const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const tableNumber = (table) => String(table?.dataset?.table || "").trim();
  const stateOf = (table) => ["available","reserved","seated","cleaning"].find((state) => table?.classList?.contains(state)) || "unknown";
  const setCount = (id, delta) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = String(Math.max(0, Number(node.textContent || 0) + delta));
  };

  function serviceIntakeFromTable(table) {
    if (!table || stateOf(table) !== "seated") return false;
    const guest = String(table.dataset.bcGuestName || "").trim();
    if (!guest) return false;
    const tableId = tableNumber(table);
    if (!tableId) return false;
    const partySize = Number(table.dataset.bcPartySize || 0);
    const handoff = window.BlueCurrentServiceHandoff;
    if (!handoff?.accept) return false;
    handoff.accept({
      guest,
      partySize,
      guestDetail: partySize ? `Party of ${partySize}` : "Seated guest",
      source: "host-table",
      tableId,
      seatedAt: Number(table.dataset.bcSeatedAt || Date.now())
    });
    return true;
  }

  function completeTable(row = {}) {
    const tableId = String(row.tableId || row.table || "").trim();
    if (!tableId) return { ok:false, reason:"missing-table-identity" };
    const map = document.getElementById("hostFloorMap");
    const table = [...(map?.querySelectorAll?.(".host-table") || [])].find((node) => tableNumber(node) === tableId);
    if (!table) return { ok:false, reason:"table-not-found", tableId };
    const before = stateOf(table);
    if (before === "cleaning") return { ok:true, status:"already-cleaning", tableId };
    if (before !== "seated") return { ok:false, reason:`table-is-${before}`, tableId };
    const expectedGuest = normalize(row.guest);
    const actualGuest = normalize(table.dataset.bcGuestName);
    if (expectedGuest && actualGuest && expectedGuest !== actualGuest) return { ok:false, reason:"guest-table-mismatch", tableId };

    table.classList.remove("seated","reserved","available","check");
    table.classList.add("cleaning");
    table.dataset.bcCleaningAt = String(Date.now());
    delete table.dataset.bcGuestName;
    delete table.dataset.bcGuestStatus;
    delete table.dataset.bcServiceStage;
    delete table.dataset.bcSeatedAt;
    const small = table.querySelector("small");
    if (small) small.textContent = "CLEANING";
    setCount("seatedCount", -1);
    setCount("cleaningCount", 1);
    setCount("hostSeated", -1);
    window.__bcHostTableTrustV100_2_22?.renderAll?.();
    window.__bcHostFloorRestorationV100_2_47?.refresh?.();
    const rec = document.getElementById("hostRecommendation");
    if (rec) rec.textContent = `Table ${tableId} needs reset · Mark open when ready`;
    window.dispatchEvent(new CustomEvent("bc:host-table-cleaning", { detail:{ tableId, guest:String(row.guest || ""), source:"service-complete" } }));
    return { ok:true, status:"cleaning", tableId };
  }

  function boot() {
    const map = document.getElementById("hostFloorMap");
    if (!map || map.dataset.bcServiceTableLifecycleV100257 === "true") return;
    map.dataset.bcServiceTableLifecycleV100257 = "true";
    const signatures = new WeakMap();
    const inspect = (table) => {
      if (!table?.classList?.contains("host-table")) return;
      const signature = `${stateOf(table)}|${table.dataset.bcGuestName || ""}|${table.dataset.bcPartySize || ""}|${table.dataset.bcSeatedAt || ""}`;
      if (signatures.get(table) === signature) return;
      signatures.set(table, signature);
      serviceIntakeFromTable(table);
    };
    [...map.querySelectorAll(".host-table")].forEach(inspect);
    const observer = new MutationObserver((records) => records.forEach((record) => inspect(record.target)));
    observer.observe(map, { subtree:true, attributes:true, attributeFilter:["class","data-bc-guest-name","data-bc-party-size","data-bc-seated-at"] });
    window.BlueCurrentServiceTableLifecycle = { version:VERSION, intake:serviceIntakeFromTable, completeTable };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
