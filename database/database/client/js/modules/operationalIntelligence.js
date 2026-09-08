/** Blue Current Operational Intelligence V15.3 */
function createOperationalIntelligenceModule(eventBus, appState) {
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const trackedEvents = [];

  function evaluate(state) {
    const occupancy = Number(state.occupancyPercent || 0);
    const satisfaction = Number(state.guestSatisfaction || 0);
    const activeGuest = state.activeGuest || {};
    const recommendations = [];
    let score = 100;

    if (occupancy >= 96) {
      score -= 18;
      recommendations.push({severity:'critical', title:'Protect the next seating window', detail:'Pause discretionary walk-ins and hold flexible inventory for confirmed guests.'});
    } else if (occupancy >= 90) {
      score -= 10;
      recommendations.push({severity:'warning', title:'Open flexible capacity', detail:'Prepare patio or overflow seating before the next arrival wave.'});
    } else if (occupancy >= 82) {
      score -= 4;
      recommendations.push({severity:'warning', title:'Watch capacity pressure', detail:'Review upcoming arrivals and table turn timing.'});
    }

    if ((activeGuest.tier || '').toLowerCase().includes('premier')) {
      recommendations.push({severity:'info', title:'Premier guest readiness', detail:`Notify the manager and synchronize ${activeGuest.guestName || 'the guest'}’s preferences with the host team.`});
    }
    if ((activeGuest.preferences || []).some(item => /birthday|anniversary|celebration/i.test(item))) {
      recommendations.push({severity:'warning', title:'Verify celebration notes', detail:'Confirm the occasion detail and service touchpoint before arrival.'});
    }
    if (satisfaction && satisfaction < 4.5) {
      score -= 8;
      recommendations.push({severity:'warning', title:'Guest sentiment needs attention', detail:'Review recent service recovery events and manager touchpoints.'});
    }
    if (state.serviceStatus !== 'live') score = Math.min(score, 96);
    score = Math.max(55, Math.min(100, Math.round(score)));

    const label = score >= 94 ? 'Excellent' : score >= 85 ? 'Healthy' : score >= 72 ? 'Watch' : 'Intervention required';
    return {score, label, recommendations: recommendations.slice(0, 4)};
  }

  function render(state) {
    const result = evaluate(state);
    if (byId('missionHealthScore')) byId('missionHealthScore').textContent = result.score;
    if (byId('missionHealthLabel')) byId('missionHealthLabel').textContent = result.label;
    if (byId('missionHealthBar')) byId('missionHealthBar').style.width = `${result.score}%`;
    if (byId('missionRecommendationCount')) byId('missionRecommendationCount').textContent = result.recommendations.length;
    if (byId('missionRecommendationList')) {
      byId('missionRecommendationList').innerHTML = result.recommendations.length
        ? result.recommendations.map(item => `<article class="mission-recommendation ${escapeHtml(item.severity)}"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></article>`).join('')
        : '<p class="mission-no-recommendations">No intervention required.</p>';
    }
    const healthText = result.score >= 85 ? 'All systems operational' : 'Operational attention advised';
    if (byId('missionPlatformHealthText')) byId('missionPlatformHealthText').textContent = healthText;
    if (byId('developerStateView')) byId('developerStateView').textContent = JSON.stringify(state, null, 2);
    eventBus.emit('intelligence:evaluated', result);
  }

  function recordEvent(name, payload) {
    trackedEvents.unshift({name, at:new Date().toLocaleTimeString(), payload});
    trackedEvents.splice(18);
    const feed = byId('developerEventFeed');
    if (feed) feed.innerHTML = trackedEvents.map(item => `<div class="developer-event">${escapeHtml(item.name)}<time>${escapeHtml(item.at)}</time></div>`).join('');
  }

  const originalEmit = eventBus.emit.bind(eventBus);
  eventBus.emit = function(name, payload) {
    if (name !== 'intelligence:evaluated') recordEvent(name, payload);
    return originalEmit(name, payload);
  };

  const overlay = byId('developerOverlay');
  const setOverlay = open => { overlay?.classList.toggle('is-open', open); overlay?.setAttribute('aria-hidden', String(!open)); };
  byId('missionDeveloperToggle')?.addEventListener('click', () => setOverlay(!overlay?.classList.contains('is-open')));
  byId('developerOverlayClose')?.addEventListener('click', () => setOverlay(false));
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'd') setOverlay(!overlay?.classList.contains('is-open'));
    if (event.key === 'Escape') setOverlay(false);
  });

  const unsubs = [
    eventBus.on('state:updated', ({state}) => render(state)),
    eventBus.on('state:reset', ({state}) => render(state))
  ];
  render(appState.getState());
  console.info('Blue Current Operational Intelligence V15.3 active');
  return {destroy(){unsubs.forEach(fn => fn?.()); eventBus.emit = originalEmit;}};
}
window.createBlueCurrentOperationalIntelligenceModule = createOperationalIntelligenceModule;
