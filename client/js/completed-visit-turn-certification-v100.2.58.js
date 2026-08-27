(() => {
  "use strict";
  const VERSION = "100.2.58";
  const GUEST_KEY = "bcHostGuestRegistryV100_2_43";
  const TURN_KEY = "blueCurrent.service.completedTurns.v100";
  const normalize = (value) => String(value || "").trim().replace(/\s+/g, " ");
  const guestKey = (value) => normalize(value).toLowerCase();
  const tableNumber = (table) => String(table?.dataset?.table || "").trim();
  const stateOf = (table) => ["available","reserved","seated","cleaning"].find((state) => table?.classList?.contains(state)) || "unknown";
  const readJson = (key) => { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch (_) { return []; } };
  const writeJson = (key, rows, limit = 200) => { try { localStorage.setItem(key, JSON.stringify(rows.slice(-limit))); return true; } catch (_) { return false; } };

  function rememberCompletedVisit(detail = {}) {
    const guest = normalize(detail.guest);
    const tableId = normalize(detail.tableId || detail.table);
    if (!guest || !tableId) return { ok:false, reason:"missing-guest-or-table" };
    const completedAt = Number(detail.completedAt || Date.now());
    const partySize = Number(detail.partySize || 0);
    const records = readJson(GUEST_KEY);
    const key = guestKey(guest);
    const index = records.findIndex((record) => guestKey(record?.name) === key);
    const previous = index >= 0 ? records[index] : { name:guest, visits:[] };
    const visits = Array.isArray(previous.visits) ? previous.visits.slice(-11) : [];
    const completionId = `service-complete|${tableId}|${completedAt}`;
    if (!visits.some((visit) => visit?.completionId === completionId)) {
      visits.push({
        at:completedAt,
        detail:`Completed service · Table ${tableId}${partySize ? ` · Party of ${partySize}` : ""}`,
        note:"Service lifecycle completed and table entered cleaning.",
        source:"completed-service",
        completionId,
        tableId,
        partySize
      });
    }
    const next = { ...previous, name:guest, lastSeenAt:completedAt, source:"history", visits };
    if (index >= 0) records.splice(index,1);
    records.push(next);
    if (!writeJson(GUEST_KEY, records)) return { ok:false, reason:"guest-memory-write-failed" };

    const turns = readJson(TURN_KEY);
    if (!turns.some((turn) => turn?.completionId === completionId)) {
      turns.push({ completionId, guest, tableId, partySize, completedAt, cleaningAt:Date.now(), openedAt:null, status:"cleaning" });
      writeJson(TURN_KEY, turns, 100);
    }
    window.dispatchEvent(new CustomEvent("bc:guest-completed-visit-recorded", { detail:{ guest, tableId, partySize, completedAt, completionId } }));
    return { ok:true, guest, tableId, completionId };
  }

  function certifyOpen(table) {
    const tableId = tableNumber(table);
    if (!tableId) return false;
    const turns = readJson(TURN_KEY);
    let changed = false;
    let completed = null;
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      const turn = turns[i];
      if (String(turn?.tableId || "") !== tableId || turn?.status !== "cleaning") continue;
      completed = { ...turn, status:"open", openedAt:Date.now() };
      turns[i] = completed;
      changed = true;
      break;
    }
    delete table.dataset.bcPartySize;
    if (!changed) return false;
    writeJson(TURN_KEY, turns, 100);
    window.dispatchEvent(new CustomEvent("bc:table-turn-completed", { detail:completed }));
    return true;
  }

  function boot() {
    const map = document.getElementById("hostFloorMap");
    if (!map || map.dataset.bcCompletedVisitTurnV100258 === "true") return;
    map.dataset.bcCompletedVisitTurnV100258 = "true";
    const previousState = new WeakMap();
    [...map.querySelectorAll(".host-table")].forEach((table) => previousState.set(table, stateOf(table)));
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        const table = record.target?.closest?.(".host-table") || record.target;
        if (!table?.classList?.contains("host-table")) return;
        const before = previousState.get(table) || "unknown";
        const after = stateOf(table);
        previousState.set(table, after);
        if (before === "cleaning" && after === "available") certifyOpen(table);
      });
    });
    observer.observe(map, { subtree:true, attributes:true, attributeFilter:["class"] });
    window.addEventListener("bc:service-party-completed", (event) => rememberCompletedVisit(event.detail || {}));
    window.BlueCurrentCompletedVisitTurnCertification = { version:VERSION, rememberCompletedVisit, certifyOpen, getTurns:() => readJson(TURN_KEY).slice() };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
