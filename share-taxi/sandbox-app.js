import {
  assignNearestTaxi,
  boardStatus,
  describeBoard,
  etaMinutes,
  findMatches,
  formatDistance,
  formatWon,
  nextOfferPhase,
  SANDBOX_RULES,
  soloQuote,
} from './match.js';
import { PLACE_GROUPS, PLACES, PRESETS, TAXIS, requestFromPlaces } from './sample.js';
import { buildSandboxRequests } from './sandbox.js';

const VB = { w: 780, h: 640 };

const els = {
  pickup: document.getElementById('pickup'),
  dropoff: document.getElementById('dropoff'),
  depart: document.getElementById('departMin'),
  tier: document.getElementById('tier'),
  departValue: document.getElementById('departValue'),
  formError: document.getElementById('formError'),
  map: document.getElementById('map'),
  matchList: document.getElementById('matchList'),
  tripPanel: document.getElementById('tripPanel'),
  board: document.getElementById('board'),
  boardNote: document.getElementById('boardNote'),
  steps: document.getElementById('steps'),
  pointNote: document.getElementById('pointNote'),
};

const state = {
  presetId: 'gangnam',
  selectedId: null,
  phase: 'browse',
  board: [],
};

boot();

function boot() {
  fillSelects();
  applyPreset('gangnam', false);
  document.getElementById('presets').addEventListener('click', (event) => {
    const id = event.target.closest('[data-preset]')?.dataset.preset;
    if (id) applyPreset(id, true);
  });
  els.pickup.addEventListener('change', () => {
    state.presetId = null;
    resetOffer();
    refresh();
  });
  els.dropoff.addEventListener('change', () => {
    state.presetId = null;
    resetOffer();
    refresh();
  });
  els.depart.addEventListener('input', () => { resetOffer(); refresh(); });
  els.tier.addEventListener('change', () => { resetOffer(); refresh(); });
  document.getElementById('results').addEventListener('click', onResultClick);
  els.board.addEventListener('click', onBoardClick);
  refresh();
}

function fillSelects() {
  const html = PLACE_GROUPS.map((group) => {
    const options = group.ids.map((id) => `<option value="${id}">${esc(PLACES[id].name)}</option>`).join('');
    return `<optgroup label="${esc(group.label)}">${options}</optgroup>`;
  }).join('');
  els.pickup.innerHTML = html;
  els.dropoff.innerHTML = html;
}

function applyPreset(id, shouldRefresh) {
  const preset = PRESETS.find((item) => item.id === id);
  state.presetId = id;
  els.pickup.value = preset.pickup;
  els.dropoff.value = preset.dropoff;
  els.depart.value = '0';
  resetOffer();
  if (shouldRefresh) refresh();
}

function resetOffer() {
  state.selectedId = null;
  state.phase = 'browse';
}

function currentMe() {
  return requestFromPlaces(PLACES[els.pickup.value], PLACES[els.dropoff.value], Number(els.depart.value));
}

function currentRules() {
  return { ...SANDBOX_RULES, tier: els.tier.value };
}

function refresh() {
  const me = currentMe();
  const rules = currentRules();
  const quote = soloQuote(me, rules);
  const short = quote.meters <= 200;
  const requests = short ? [] : buildSandboxRequests(me);
  const board = short ? [] : describeBoard(me, requests, rules);
  const matches = short ? [] : findMatches(me, requests, rules);
  if (state.selectedId && !matches.some((row) => row.request.id === state.selectedId)) resetOffer();
  state.board = board;
  const selected = matches.find((row) => row.request.id === state.selectedId) || null;
  const onLine = requests.filter((row) => row.onRoute).length;

  document.querySelectorAll('[data-preset]').forEach((button) => {
    const on = button.dataset.preset === state.presetId;
    button.classList.toggle('on', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  els.departValue.textContent = me.departInMin === 0 ? '지금' : `${me.departInMin}분 뒤`;
  els.pointNote.textContent = `${me.pickup.name}에서 ${me.dropoff.name}까지. 선 위 하차 ${onLine}명. 출발을 20분 뒤로 두면 윤아만 남습니다.`;
  els.formError.textContent = short ? '출발과 도착이 너무 가깝습니다. 하차를 올릴 경로 선이 없습니다.' : '';
  els.formError.classList.toggle('show', short);

  document.getElementById('matchCount').textContent = short ? '-' : `${matches.length}명`;
  document.getElementById('nearestPickup').textContent = matches[0] ? formatDistance(matches[0].pickupMeters) : '-';
  document.getElementById('onLineCount').textContent = short ? '-' : `${onLine}명`;
  document.getElementById('shareFare').textContent = selected ? formatWon(selected.fare.payMe) : '-';

  renderSteps(matches.length, short);
  renderMap(me, board, selected, short);
  renderMatches(matches, selected);
  renderTrip(me, selected);
  renderBoard(board);
}

function renderSteps(matchCount, short) {
  let current = short ? 1 : 3;
  if (!short && matchCount > 0 && state.phase === 'browse') current = 4;
  if (state.phase === 'proposed' || state.phase === 'waiting' || state.phase === 'expired') current = 5;
  if (state.phase === 'assigned') current = 6;
  els.steps.querySelectorAll('li').forEach((item) => {
    const step = Number(item.dataset.step);
    item.classList.toggle('is-now', step === current);
    item.classList.toggle('is-done', step < current);
    item.classList.toggle('is-bad', state.phase === 'expired' && step === 5);
  });
}

function renderMatches(matches, selected) {
  if (!matches.length) {
    els.matchList.innerHTML = '<p class="empty">500m 안에서 경로 선 위에 내리는 사람이 없습니다. 출발 시각을 지금으로 두면 민재, 하린, 우진이 남습니다.</p>';
    return;
  }
  els.matchList.innerHTML = matches.map((row) => {
    const on = selected && selected.request.id === row.request.id;
    return `<article class="card${on ? ' on' : ''}">
      <header><strong>${esc(row.request.name)}</strong><em class="score">${row.score}점</em></header>
      <p class="route">${esc(row.request.dropoff.name)}</p>
      <ul class="meta"><li>출발 ${formatDistance(row.pickupMeters)}</li><li>선 이탈 ${formatDistance(row.corridorMeters)}</li><li>${row.departGapMin}분 차</li></ul>
      <div><strong>${formatWon(row.fare.payMe)}</strong><span class="solo">${formatWon(row.fare.soloMe)}</span> <span class="save">${formatWon(row.fare.saveMe)} 절약</span></div>
      <button type="button" data-select="${esc(row.request.id)}">${esc(particle(row.request.name))} 합승 선택</button>
    </article>`;
  }).join('');
}

function renderTrip(me, selected) {
  if (!selected || state.phase === 'browse') {
    els.tripPanel.innerHTML = '<p class="empty">후보를 골라도 상대가 수락하기 전에는 택시가 배차되지 않습니다.</p>';
    return;
  }
  const stops = selected.stops.map((stop, index) => {
    const who = stop.riderId === me.riderId ? '나' : selected.request.name;
    const verb = stop.kind === 'pickup' ? '승차' : '하차';
    return `<li><b>${index + 1}</b>${verb} · ${esc(who)} · ${esc(stop.name)}</li>`;
  }).join('');
  const fare = selected.fare;
  const table = `<table>
    <tr><th></th><th>단독</th><th>합승</th><th>절약</th></tr>
    <tr><td>나</td><td>${formatWon(fare.soloMe)}</td><td>${formatWon(fare.payMe)}</td><td>${formatWon(fare.saveMe)}</td></tr>
    <tr><td>${esc(selected.request.name)}</td><td>${formatWon(fare.soloThem)}</td><td>${formatWon(fare.payThem)}</td><td>${formatWon(fare.saveThem)}</td></tr>
    <tr><td>택시</td><td>${formatWon(fare.soloMe + fare.soloThem)}</td><td>${formatWon(fare.sharedTotal)}</td><td>${formatWon(fare.saveMe + fare.saveThem)}</td></tr>
  </table>`;
  let status = '';
  let actions = '';
  if (state.phase === 'proposed') {
    status = '<p>제안만 열린 상태입니다. 내가 수락한 뒤 상대도 수락해야 차가 움직입니다.</p>';
    actions = '<button type="button" id="acceptSelf" data-action="accept-self">내가 수락</button>';
  } else if (state.phase === 'waiting') {
    status = '<p>내 수락이 들어갔습니다. 상대가 수락하기 전에는 배차하지 않습니다.</p>';
    actions = `<button type="button" id="partnerAccept" data-action="accept-partner">상대 수락</button>
      <button type="button" id="expireOffer" class="secondary" data-action="expire">응답 시간 초과</button>`;
  } else if (state.phase === 'expired') {
    status = '<p>응답 시간이 지나 제안이 닫혔습니다. 다른 후보를 고를 수 있습니다.</p>';
    actions = '<button type="button" class="secondary" data-action="reset">다시 고르기</button>';
  } else if (state.phase === 'assigned') {
    const taxi = assignNearestTaxi(TAXIS, selected.stops[0]);
    const eta = Math.max(1, Math.round(etaMinutes(taxi.meters)));
    status = `<p class="driver">배차 완료 · ${esc(taxi.label)} · 첫 승차지까지 ${formatDistance(taxi.meters)} · 약 ${eta}분</p>`;
    actions = '<button type="button" id="cancelOffer" class="secondary" data-action="cancel">합승 취소</button>';
  }
  els.tripPanel.innerHTML = `<h2>${esc(particle(selected.request.name))}의 합승</h2>${status}<ol class="timeline">${stops}</ol>${table}${actions}`;
}

function renderBoard(board) {
  els.board.innerHTML = board.map((row) => {
    const status = boardStatus(row);
    const action = row.eligible ? `data-select="${esc(row.request.id)}"` : `data-reject="${esc(row.request.id)}"`;
    return `<button type="button" ${action}>
      <span>${esc(row.request.name)}</span>
      <span>출발 ${formatDistance(row.pickupMeters)} · 선 이탈 ${formatDistance(row.corridorMeters)} · ${row.request.departInMin}분</span>
      <span class="chip ${esc(status.code)}">${esc(status.label)}</span>
    </button>`;
  }).join('');
}

function onResultClick(event) {
  const selectId = event.target.closest('[data-select]')?.dataset.select;
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (selectId) {
    state.selectedId = selectId;
    state.phase = 'proposed';
    refresh();
    els.tripPanel.scrollIntoView({ block: 'nearest' });
    return;
  }
  if (!action) return;
  if (action === 'reset') {
    resetOffer();
    refresh();
    return;
  }
  state.phase = nextOfferPhase(state.phase, action);
  if (state.phase === 'cancelled') resetOffer();
  refresh();
}

function onBoardClick(event) {
  const selectId = event.target.closest('[data-select]')?.dataset.select;
  const rejectId = event.target.closest('[data-reject]')?.dataset.reject;
  if (selectId) {
    state.selectedId = selectId;
    state.phase = 'proposed';
    refresh();
    els.tripPanel.scrollIntoView({ block: 'nearest' });
    return;
  }
  if (!rejectId) return;
  const row = state.board.find((item) => item.request.id === rejectId);
  if (!row) return;
  els.boardNote.textContent = row.rejects.slice(0, 2).map((reject) => reject.message).join(' ');
}

function renderMap(me, board, selected, short) {
  if (short) {
    els.map.innerHTML = '';
    return;
  }
  const points = [me.pickup, me.dropoff];
  for (const row of board) points.push(row.request.pickup, row.request.dropoff);
  const bounds = frame(points);
  const parts = [
    `<svg viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-label="경로 선 위 하차 샌드박스 지도">`,
    '<rect width="780" height="640" fill="#0c1119"></rect>',
    ring(me.pickup, 500, bounds),
    polyline([me.pickup, me.dropoff], bounds, 'fill="none" stroke="#4f8fff" stroke-width="5" stroke-linecap="round"'),
  ];
  for (const row of board) {
    if (row.request.onRoute) continue;
    parts.push(polyline(
      [row.request.pickup, row.request.dropoff],
      bounds,
      'fill="none" stroke="#ff8a73" stroke-width="1.5" stroke-dasharray="4 4"',
    ));
  }
  if (selected) {
    parts.push(polyline(selected.stops, bounds, 'fill="none" stroke="#c084fc" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"'));
  }
  board.forEach((row, index) => {
    const color = selected && row.request.id === selected.request.id ? '#c084fc' : row.eligible ? '#34d399' : '#ff8a73';
    parts.push(dot(row.request.dropoff, bounds, '#0c1119', 8));
    parts.push(dot(row.request.dropoff, bounds, color, 5));
    parts.push(dot(row.request.pickup, bounds, color, 5));
    const pos = xy(row.request.dropoff, bounds);
    const above = index % 2 === 0;
    const labelY = above ? pos.y - 12 : pos.y + 18;
    parts.push(`<text x="${pos.x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" fill="${color}" font-size="13">${esc(row.request.name)}</text>`);
  });
  const taxi = selected && state.phase === 'assigned' ? assignNearestTaxi(TAXIS, selected.stops[0]) : null;
  for (const cab of TAXIS) {
    const on = taxi && cab.id === taxi.id;
    if (!inside(cab, bounds) && !on) continue;
    parts.push(dot(cab, bounds, on ? '#fbbf24' : 'rgba(251,191,36,.7)', on ? 8 : 5));
  }
  if (taxi) parts.push(polyline([taxi, selected.stops[0]], bounds, 'fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4 5"'));
  const start = xy(me.pickup, bounds);
  const end = xy(me.dropoff, bounds);
  parts.push(dot(me.pickup, bounds, '#4f8fff', 8));
  parts.push(dot(me.dropoff, bounds, '#93c5fd', 8));
  parts.push(`<text x="${(start.x + 10).toFixed(1)}" y="${(start.y + 16).toFixed(1)}" fill="#9ec2ff" font-size="13">${esc(me.pickup.name)}</text>`);
  parts.push(`<text x="${(end.x + 10).toFixed(1)}" y="${(end.y + 16).toFixed(1)}" fill="#dbeafe" font-size="13">${esc(me.dropoff.name)}</text>`);
  const scale = scaleLine(bounds);
  parts.push(scale);
  parts.push('</svg>');
  els.map.innerHTML = parts.join('');
}

function frame(points) {
  const bounds = {
    minLat: Math.min(...points.map((point) => point.lat)),
    maxLat: Math.max(...points.map((point) => point.lat)),
    minLon: Math.min(...points.map((point) => point.lon)),
    maxLon: Math.max(...points.map((point) => point.lon)),
  };
  const latPad = Math.max(0.0035, (bounds.maxLat - bounds.minLat) * 0.16);
  const lonPad = Math.max(0.0035, (bounds.maxLon - bounds.minLon) * 0.16);
  bounds.minLat -= latPad;
  bounds.maxLat += latPad;
  bounds.minLon -= lonPad;
  bounds.maxLon += lonPad;
  return bounds;
}

function inside(point, bounds) {
  return point.lat >= bounds.minLat && point.lat <= bounds.maxLat && point.lon >= bounds.minLon && point.lon <= bounds.maxLon;
}

function xy(point, bounds) {
  return {
    x: ((point.lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * VB.w,
    y: ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * VB.h,
  };
}

function polyline(points, bounds, attrs) {
  const values = points.map((point) => {
    const pos = xy(point, bounds);
    return `${pos.x.toFixed(1)},${pos.y.toFixed(1)}`;
  }).join(' ');
  return `<polyline points="${values}" ${attrs}></polyline>`;
}

function dot(point, bounds, color, radius) {
  const pos = xy(point, bounds);
  return `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="${radius}" fill="${color}"></circle>`;
}

function ring(center, meters, bounds) {
  const pts = [];
  for (let i = 0; i <= 64; i += 1) {
    const deg = (i / 64) * Math.PI * 2;
    const lat = center.lat + (Math.cos(deg) * meters) / 111320;
    const lon = center.lon + (Math.sin(deg) * meters) / (111320 * Math.cos(center.lat * Math.PI / 180));
    const pos = xy({ lat, lon }, bounds);
    pts.push(`${pos.x.toFixed(1)},${pos.y.toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="rgba(79,143,255,.08)" stroke="rgba(147,197,253,.8)" stroke-width="1.5" stroke-dasharray="5 4"></polygon>`;
}

function scaleLine(bounds) {
  const lat = bounds.minLat + (bounds.maxLat - bounds.minLat) * 0.08;
  const lon = bounds.minLon + (bounds.maxLon - bounds.minLon) * 0.08;
  const endLon = lon + 500 / (111320 * Math.cos(lat * Math.PI / 180));
  const a = xy({ lat, lon }, bounds);
  const b = xy({ lat, lon: endLon }, bounds);
  return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#8a94a6" stroke-width="3"></line>
    <text x="${a.x.toFixed(1)}" y="${(a.y - 8).toFixed(1)}" fill="#8a94a6" font-size="12">500m</text>`;
}

function particle(name) {
  const code = name.charCodeAt(name.length - 1);
  const batchim = (code - 0xac00) % 28 !== 0;
  return `${name}${batchim ? '과' : '와'}`;
}

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
