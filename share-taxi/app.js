import {
  assignNearestTaxi,
  boardStatus,
  describeBoard,
  etaMinutes,
  findMatches,
  formatDistance,
  formatWon,
  nextOfferPhase,
  soloQuote,
} from './match.js';
import { OPEN_REQUESTS, PLACE_GROUPS, PLACES, PRESETS, TAXIS, requestFromPlaces } from './sample.js';

const VB = { w: 780, h: 640 };
const HAN = [
  [37.548, 126.9], [37.537, 126.93], [37.528, 126.97], [37.518, 127.02],
  [37.521, 127.06], [37.532, 127.1], [37.548, 127.15],
].map(([lat, lon]) => ({ lat, lon }));
const AREAS = [
  { name: '홍대', lat: 37.566, lon: 126.922 },
  { name: '여의도', lat: 37.521, lon: 126.93 },
  { name: '시청', lat: 37.574, lon: 126.978 },
  { name: '강남', lat: 37.507, lon: 127.045 },
  { name: '잠실', lat: 37.522, lon: 127.11 },
  { name: '서울대', lat: 37.463, lon: 126.952 },
];

const els = {
  pickup: document.getElementById('pickup'),
  dropoff: document.getElementById('dropoff'),
  depart: document.getElementById('departMin'),
  radius: document.getElementById('radiusMeters'),
  tier: document.getElementById('tier'),
  departValue: document.getElementById('departValue'),
  radiusValue: document.getElementById('radiusValue'),
  pointNote: document.getElementById('pointNote'),
  clearCustom: document.getElementById('clearCustom'),
  pickPickup: document.getElementById('pickPickup'),
  pickDropoff: document.getElementById('pickDropoff'),
  myCell: document.getElementById('myCell'),
  formError: document.getElementById('formError'),
  map: document.getElementById('map'),
  mapBanner: document.getElementById('mapBanner'),
  matchList: document.getElementById('matchList'),
  tripPanel: document.getElementById('tripPanel'),
  board: document.getElementById('board'),
  boardNote: document.getElementById('boardNote'),
  steps: document.getElementById('steps'),
};

const state = {
  presetId: 'gangnam',
  customPickup: null,
  customDropoff: null,
  pickMode: null,
  selectedId: null,
  phase: 'browse',
  bounds: null,
  board: [],
  me: null,
};

boot();

function boot() {
  fillSelects();
  applyPreset('gangnam', false);
  document.getElementById('presets').addEventListener('click', (event) => {
    const id = event.target.closest('[data-preset]')?.dataset.preset;
    if (!id) return;
    applyPreset(id, true);
  });
  els.pickup.addEventListener('change', () => {
    state.customPickup = null;
    state.presetId = null;
    resetOffer();
    refresh();
  });
  els.dropoff.addEventListener('change', () => {
    state.customDropoff = null;
    state.presetId = null;
    resetOffer();
    refresh();
  });
  els.depart.addEventListener('input', () => { resetOffer(); refresh(); });
  els.radius.addEventListener('input', () => { resetOffer(); refresh(); });
  els.tier.addEventListener('change', () => { resetOffer(); refresh(); });
  els.pickPickup.addEventListener('click', () => setPickMode('pickup'));
  els.pickDropoff.addEventListener('click', () => setPickMode('dropoff'));
  els.clearCustom.addEventListener('click', () => {
    state.customPickup = null;
    state.customDropoff = null;
    state.pickMode = null;
    resetOffer();
    refresh();
  });
  els.map.addEventListener('click', onMapClick);
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
  state.customPickup = null;
  state.customDropoff = null;
  state.pickMode = null;
  els.pickup.value = preset.pickup;
  els.dropoff.value = preset.dropoff;
  els.depart.value = '0';
  resetOffer();
  if (shouldRefresh) refresh();
}

function setPickMode(mode) {
  state.pickMode = state.pickMode === mode ? null : mode;
  refresh();
}

function resetOffer() {
  state.selectedId = null;
  state.phase = 'browse';
}

function currentMe() {
  return requestFromPlaces(
    state.customPickup || PLACES[els.pickup.value],
    state.customDropoff || PLACES[els.dropoff.value],
    Number(els.depart.value),
  );
}

function currentRules() {
  return { pickupRadiusMeters: Number(els.radius.value), tier: els.tier.value };
}

function refresh() {
  const me = currentMe();
  const rules = currentRules();
  const quote = soloQuote(me, rules);
  state.me = me;
  const short = quote.meters <= 200;
  const board = short ? [] : describeBoard(me, OPEN_REQUESTS, rules);
  const matches = short ? [] : findMatches(me, OPEN_REQUESTS, rules);
  if (state.selectedId && !matches.some((row) => row.request.id === state.selectedId)) resetOffer();
  state.board = board;
  const selected = matches.find((row) => row.request.id === state.selectedId) || null;

  document.querySelectorAll('[data-preset]').forEach((button) => {
    const on = button.dataset.preset === state.presetId;
    button.classList.toggle('on', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  els.pickPickup.classList.toggle('on', state.pickMode === 'pickup');
  els.pickDropoff.classList.toggle('on', state.pickMode === 'dropoff');
  els.map.classList.toggle('picking', Boolean(state.pickMode));
  els.clearCustom.hidden = !state.customPickup && !state.customDropoff;
  els.departValue.textContent = me.departInMin === 0 ? '지금' : `${me.departInMin}분 뒤`;
  els.radiusValue.textContent = formatDistance(rules.pickupRadiusMeters);
  els.myCell.textContent = `출발 칸 ${quote.cell}`;
  els.pointNote.textContent = pointNote(me);
  els.formError.textContent = short ? '출발과 도착이 너무 가깝습니다.' : '';
  els.formError.classList.toggle('show', short);
  els.mapBanner.hidden = !state.pickMode;
  els.mapBanner.textContent = state.pickMode === 'pickup'
    ? '지도를 눌러 출발지를 지정하세요.'
    : '지도를 눌러 도착지를 지정하세요.';

  document.getElementById('matchCount').textContent = short ? '-' : `${matches.length}명`;
  document.getElementById('nearestDest').textContent = matches[0] ? formatDistance(matches[0].pickupMeters) : '-';
  document.getElementById('soloFare').textContent = formatWon(quote.fare);
  document.getElementById('shareFare').textContent = selected ? formatWon(selected.fare.payMe) : '-';

  renderSteps(matches.length, short);
  renderMap(me, board, selected);
  renderMatches(matches, selected);
  renderTrip(me, selected);
  renderBoard(board);
}

function pointNote(me) {
  const pickup = state.customPickup ? `${me.pickup.name} (지도)` : me.pickup.name;
  const dropoff = state.customDropoff ? `${me.dropoff.name} (지도)` : me.dropoff.name;
  return `${pickup}에서 ${dropoff}까지`;
}

function renderSteps(matchCount, short) {
  let current = 3;
  if (!short && matchCount > 0 && state.phase === 'browse') current = 4;
  if (state.phase === 'proposed' || state.phase === 'waiting') current = 5;
  if (state.phase === 'expired') current = 5;
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
    els.matchList.innerHTML = '<p class="empty">이 조건에서는 출발지가 가깝고 하차가 경로 안인 요청이 없습니다. 출발 반경이나 출발 시각을 바꿔 보세요.</p>';
    return;
  }
  els.matchList.innerHTML = matches.map((row) => {
    const on = selected && selected.request.id === row.request.id;
    return `<article class="card${on ? ' on' : ''}">
      <header><strong>${esc(row.request.name)}</strong><em class="score">${row.score}점</em></header>
      <p class="route">${esc(row.request.pickup.name)} → ${esc(row.request.dropoff.name)}</p>
      <ul class="meta"><li>출발 ${formatDistance(row.pickupMeters)}</li><li>경로 이탈 ${formatDistance(row.corridorMeters)}</li><li>${row.departGapMin}분 차</li></ul>
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
    status = '<p>내 수락이 들어갔습니다. 상대 응답이 없으면 제안은 닫히고, 그 전에는 배차하지 않습니다.</p>';
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
  if (!board.length) {
    els.board.innerHTML = '';
    return;
  }
  els.board.innerHTML = board.map((row) => {
    const status = boardStatus(row);
    const hint = radiusHint(row, status);
    const action = row.eligible ? `data-select="${esc(row.request.id)}"` : `data-reject="${esc(row.request.id)}"`;
    return `<button type="button" ${action}>
      <span>${esc(row.request.name)}</span>
      <span>${esc(row.request.pickup.name)} → ${esc(row.request.dropoff.name)} · 출발 ${formatDistance(row.pickupMeters)}${hint ? ` · ${esc(hint)}` : ''}<br><span class="cell">${row.inCell ? '검색 칸' : '칸 밖'} ${esc(row.pickupCell || '')}</span></span>
      <span class="chip ${esc(status.code)}">${esc(status.label)}</span>
    </button>`;
  }).join('');
}

function radiusHint(row, status) {
  if (status.code !== 'pickup') return '';
  const needed = Math.ceil(row.pickupMeters / 100) * 100;
  if (needed > 3000) return '';
  return `반경 ${formatDistance(needed)}면 재계산`;
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
  const bits = [];
  if (!row.inCell) bits.push('출발 지오해시 이웃 칸 밖이라 후보 검색에 들어가지 않습니다.');
  bits.push(...row.rejects.slice(0, 2).map((reject) => reject.message));
  const hint = radiusHint(row, boardStatus(row));
  if (hint) bits.push(`${hint.replace('면 재계산', '')}로 넓히면 다시 계산됩니다.`);
  els.boardNote.textContent = bits.join(' ');
}

function onMapClick(event) {
  if (!state.pickMode || !state.bounds) return;
  const svg = els.map.querySelector('svg');
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * VB.w;
  const y = ((event.clientY - rect.top) / rect.height) * VB.h;
  const point = {
    name: state.pickMode === 'pickup' ? '고른 출발' : '고른 도착',
    lon: state.bounds.minLon + (x / VB.w) * (state.bounds.maxLon - state.bounds.minLon),
    lat: state.bounds.maxLat - (y / VB.h) * (state.bounds.maxLat - state.bounds.minLat),
  };
  if (point.lat < 33 || point.lat > 39 || point.lon < 124 || point.lon > 132) return;
  if (state.pickMode === 'pickup') state.customPickup = point;
  else state.customDropoff = point;
  state.pickMode = null;
  state.presetId = null;
  resetOffer();
  refresh();
}

function renderMap(me, board, selected) {
  const points = [me.pickup, me.dropoff, ...HAN, ...AREAS, ...TAXIS];
  for (const row of board) points.push(row.request.pickup, row.request.dropoff);
  const bounds = frame(points);
  state.bounds = bounds;
  const parts = [
    `<svg viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-label="서울 합승 지도">`,
    '<rect width="780" height="640" fill="#0c1119"></rect>',
    grid(bounds),
    polyline(HAN, bounds, 'fill="none" stroke="rgba(79,143,255,.28)" stroke-width="14" stroke-linecap="round"'),
  ];
  for (const row of board) {
    if (selected && row.request.id === selected.request.id) continue;
    parts.push(polyline([row.request.pickup, row.request.dropoff], bounds, 'fill="none" stroke="rgba(255,255,255,.12)" stroke-width="2"'));
  }
  if (selected) {
    parts.push(polyline([me.pickup, me.dropoff], bounds, 'fill="none" stroke="rgba(79,143,255,.45)" stroke-width="2" stroke-dasharray="6 6"'));
    parts.push(polyline([selected.request.pickup, selected.request.dropoff], bounds, 'fill="none" stroke="rgba(192,132,252,.45)" stroke-width="2" stroke-dasharray="6 6"'));
    parts.push(polyline(selected.stops, bounds, 'fill="none" stroke="#c084fc" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"'));
  } else {
    parts.push(polyline([me.pickup, me.dropoff], bounds, 'fill="none" stroke="#4f8fff" stroke-width="4" stroke-linecap="round"'));
  }
  for (const area of AREAS) {
    const pos = xy(area, bounds);
    parts.push(`<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" fill="rgba(232,236,244,.28)" font-size="13">${esc(area.name)}</text>`);
  }
  for (const row of board) {
    const color = selected && row.request.id === selected.request.id ? '#c084fc' : row.eligible ? '#34d399' : 'rgba(138,148,166,.85)';
    parts.push(dot(row.request.dropoff, bounds, color, 7));
  }
  const taxi = selected && state.phase === 'assigned' ? assignNearestTaxi(TAXIS, selected.stops[0]) : null;
  for (const cab of TAXIS) {
    const on = taxi && cab.id === taxi.id;
    parts.push(dot(cab, bounds, on ? '#fbbf24' : 'rgba(251,191,36,.45)', on ? 8 : 5));
  }
  if (taxi) {
    parts.push(polyline([taxi, selected.stops[0]], bounds, 'fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4 5"'));
  }
  if (selected) {
    const drawn = [];
    selected.stops.forEach((stop, index) => {
      const pos = xy(stop, bounds);
      const key = `${pos.x.toFixed(0)}:${pos.y.toFixed(0)}`;
      const dup = drawn.filter((item) => item === key).length;
      drawn.push(key);
      const x = pos.x + dup * 16;
      const y = pos.y - dup * 16;
      parts.push(`<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="#101820" stroke="#fff"></circle><text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="12">${index + 1}</text></g>`);
    });
  } else {
    parts.push(dot(me.pickup, bounds, '#4f8fff', 8));
    parts.push(dot(me.dropoff, bounds, '#93c5fd', 8));
  }
  const scaleA = xy({ lat: bounds.minLat + 0.015, lon: bounds.minLon + 0.012 }, bounds);
  const scaleB = xy({ lat: bounds.minLat + 0.015, lon: bounds.minLon + 0.012 + 2000 / 88000 }, bounds);
  parts.push(`<line x1="${scaleA.x.toFixed(1)}" y1="${scaleA.y.toFixed(1)}" x2="${scaleB.x.toFixed(1)}" y2="${scaleB.y.toFixed(1)}" stroke="#8a94a6" stroke-width="2"></line>`);
  parts.push(`<text x="${scaleA.x.toFixed(1)}" y="${(scaleA.y - 6).toFixed(1)}" fill="#8a94a6" font-size="11">2km</text>`);
  parts.push('</svg>');
  els.map.innerHTML = parts.join('');
}

function frame(points) {
  const bounds = { minLat: 37.45, maxLat: 37.59, minLon: 126.89, maxLon: 127.15 };
  for (const point of points) {
    if (!point) continue;
    bounds.minLat = Math.min(bounds.minLat, point.lat - 0.012);
    bounds.maxLat = Math.max(bounds.maxLat, point.lat + 0.012);
    bounds.minLon = Math.min(bounds.minLon, point.lon - 0.012);
    bounds.maxLon = Math.max(bounds.maxLon, point.lon + 0.012);
  }
  return bounds;
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

function grid(bounds) {
  const lines = [];
  for (const lon of [126.95, 127, 127.05, 127.1]) {
    if (lon <= bounds.minLon || lon >= bounds.maxLon) continue;
    const x = xy({ lat: bounds.minLat, lon }, bounds).x;
    lines.push(`<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${VB.h}" stroke="rgba(255,255,255,.05)"></line>`);
  }
  for (const lat of [37.5, 37.55]) {
    if (lat <= bounds.minLat || lat >= bounds.maxLat) continue;
    const y = xy({ lat, lon: bounds.minLon }, bounds).y;
    lines.push(`<line x1="0" y1="${y.toFixed(1)}" x2="${VB.w}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,.05)"></line>`);
  }
  return lines.join('');
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
