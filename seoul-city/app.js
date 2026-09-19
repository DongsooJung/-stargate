(function () {
  const N = window.SeoulCityNormalize;
  const SAMPLE_PLACE = '광화문·덕수궁';
  const PROXY_URLS = [
    '../api/seoul-citydata',
    '/api/seoul-citydata',
    'https://stargate-homepage.vercel.app/api/seoul-citydata',
  ];
  const SEOUL_BASE = 'http://openapi.seoul.go.kr:8088';

  const form = document.getElementById('queryForm');
  const placeInput = document.getElementById('placeInput');
  const categorySelect = document.getElementById('categorySelect');
  const loadBtn = document.getElementById('loadBtn');
  const apiStatus = document.getElementById('apiStatus');
  const errorBox = document.getElementById('errorBox');
  const toolStrip = document.getElementById('toolStrip');
  const placeList = document.getElementById('placeList');

  let places = [];
  let map = null;
  let markers = [];
  let proxyBase = '';
  let sampleLimited = true;

  boot();
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    refresh();
  });
  categorySelect.addEventListener('change', fillPlaceList);

  async function boot() {
    renderTools(N.TOOLS.map((tool) => tool.name));
    try {
      const leafletReady = Boolean(window.L);
      if (leafletReady) {
        map = window.L.map('map').setView([37.5665, 126.978], 14);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);
      }
    } catch (_) {
      /* 지도는 보조 기능 */
    }

    try {
      const localPlaces = await fetch('places.json').then((res) => res.json());
      places = localPlaces;
      fillPlaceList();
    } catch (_) {
      places = [{ name: SAMPLE_PLACE, category: '고궁·문화유산' }];
    }

    try {
      const listed = await callApi('list_pois');
      if (listed && Array.isArray(listed.places) && listed.places.length) {
        places = listed.places;
        fillPlaceList();
      }
    } catch (_) {
      /* 로컬 places.json 유지 */
    }

    await refresh();
  }

  async function refresh() {
    setBusy(true);
    showError('');
    const place = placeInput.value.trim() || SAMPLE_PLACE;
    try {
      const [snapshot, popRank, spendRank] = await Promise.all([
        callApi('snapshot', { place }),
        callApi('get_population_ranking', { top: 8, category: categorySelect.value }),
        callApi('get_consumption_ranking', { top: 6, category: categorySelect.value }),
      ]);
      sampleLimited = Boolean(snapshot.sampleLimited || popRank.sampleLimited);
      renderSnapshot(snapshot);
      renderRank(document.getElementById('popRank'), popRank.ranking || [], (row, i) =>
        rankLine(i, row.name, row.congestion, formatRange(row.min, row.max))
      );
      renderRank(document.getElementById('spendRank'), spendRank.ranking || [], (row, i) =>
        rankLine(i, row.name, row.level, formatMoney(row.amountMax))
      );
      apiStatus.textContent = sampleLimited ? 'SAMPLE · 광화문·덕수궁' : 'LIVE · 121장소 연동';
      apiStatus.classList.toggle('off', sampleLimited);
      if (sampleLimited && snapshot.place) placeInput.value = snapshot.place;
    } catch (error) {
      showError(error.message || '서울 도시데이터를 불러오지 못했습니다.');
      apiStatus.textContent = '연동 실패';
      apiStatus.classList.add('off');
    } finally {
      setBusy(false);
    }
  }

  function renderSnapshot(data) {
    const pop = data.population || {};
    const weather = data.weather || {};
    const air = data.air || {};
    const commerce = data.consumption || {};
    const traffic = data.traffic || {};

    setText('kpiCongestion', pop.congestion || '-');
    setText('kpiPlace', data.place || '-');
    setText('kpiPeople', formatRange(pop.min, pop.max));
    setText('kpiPeopleTime', pop.observedAt || '기준 시각');
    setText('kpiTemp', formatNum(weather.temperature, '°'));
    setText('kpiHumid', weather.humidity != null ? '습도 ' + weather.humidity + '%' : '습도');
    setText('kpiAir', air.index || '-');
    setText('kpiPm', 'PM10 ' + (air.pm10 ?? '-') + ' · PM2.5 ' + (air.pm25 ?? '-'));
    setText('kpiSpend', commerce.level || '-');
    setText('kpiPay', commerce.paymentCount != null ? '결제 ' + commerce.paymentCount + '건' : '결제');
    setText('kpiRoad', traffic.index || '-');
    setText('kpiSpeed', traffic.speed != null ? traffic.speed + 'km/h' : '평균 속도');

    renderBars('ages', (pop.ages || []).filter((row) => row.rate != null), (row) => row.rate, 40, (row) => row.label);
    const forecast = (data.prediction || pop.forecast || []).slice(0, 8);
    const maxPop = Math.max(...forecast.map((row) => row.max || 0), 1);
    renderBars('forecast', forecast, (row) => row.max, maxPop, (row) => (row.time || '').slice(11, 16) || row.time);

    const commerceBox = document.getElementById('commerce');
    commerceBox.innerHTML = (commerce.categories || [])
      .slice(0, 10)
      .map((row) => '<span class="chip">' + escapeHtml(row.mid || row.large) + ' · ' + escapeHtml(row.level || '') + '</span>')
      .join('') || '<span class="chip">상권 데이터 없음</span>';

    renderSimpleList('bikes', data.bikes || [], (row) =>
      '<li><b>🚲</b><span>' + escapeHtml(row.name) + '</span><span>' + (row.parked ?? '-') + '/' + (row.racks ?? '-') + '</span></li>'
    );
    renderSimpleList('subway', flattenSubway(data.subway || []), (row) =>
      '<li><b>' + escapeHtml(row.line || '·') + '</b><span>' + escapeHtml(row.name) + ' ' + escapeHtml(row.direction) + '</span><span>' + escapeHtml(row.message || row.status || '') + '</span></li>'
    );
    renderSimpleList('parking', (data.parking || []).filter((row) => row.live).slice(0, 12), (row) =>
      '<li><b>P</b><span>' + escapeHtml(row.name) + '</span><span>' + (row.current ?? '-') + '/' + (row.capacity ?? '-') + '</span></li>'
    );

    drawMap(data);
  }

  function drawMap(data) {
    if (!map || !window.L) return;
    markers.forEach((marker) => marker.remove());
    markers = [];
    const points = [];
    (data.bikes || []).forEach((row) => {
      if (!Number.isFinite(row.lat) || !Number.isFinite(row.lon)) return;
      points.push([row.lat, row.lon]);
      markers.push(window.L.circleMarker([row.lat, row.lon], { radius: 6, color: '#4f8fff' }).addTo(map).bindPopup(row.name + '<br>잔여 ' + (row.parked ?? '-')));
    });
    (data.parking || []).forEach((row) => {
      if (!Number.isFinite(row.lat) || !Number.isFinite(row.lon)) return;
      points.push([row.lat, row.lon]);
      markers.push(window.L.circleMarker([row.lat, row.lon], { radius: 6, color: '#a855f7' }).addTo(map).bindPopup(row.name));
    });
    if (data.center) {
      map.setView([data.center.lat, data.center.lon], 15);
    } else if (points.length) {
      map.fitBounds(points, { padding: [24, 24] });
    }
  }

  function renderBars(id, rows, valueOf, max, labelOf) {
    const el = document.getElementById(id);
    if (!rows.length) {
      el.innerHTML = '<p class="note">데이터가 없습니다.</p>';
      return;
    }
    el.innerHTML = rows
      .map((row) => {
        const value = Number(valueOf(row) || 0);
        const pct = Math.max(4, Math.round((value / (max || 1)) * 100));
        return (
          '<div class="bar"><span>' +
          escapeHtml(labelOf(row) || '') +
          '</span><i><em style="width:' +
          pct +
          '%"></em></i><span>' +
          (Number.isFinite(value) ? Math.round(value) : '-') +
          '</span></div>'
        );
      })
      .join('');
  }

  function renderRank(el, rows, line) {
    el.innerHTML = rows.length ? rows.map((row, i) => line(row, i)).join('') : '<li class="note">순위 데이터가 없습니다.</li>';
  }

  function rankLine(index, name, badge, value) {
    return (
      '<li><b>' +
      String(index + 1).padStart(2, '0') +
      '</b><span>' +
      escapeHtml(name) +
      ' · ' +
      escapeHtml(badge || '') +
      '</span><span>' +
      escapeHtml(value || '') +
      '</span></li>'
    );
  }

  function renderSimpleList(id, rows, html) {
    const el = document.getElementById(id);
    el.innerHTML = rows.length ? rows.slice(0, 12).map(html).join('') : '<li class="note">데이터 없음</li>';
  }

  function flattenSubway(rows) {
    const out = [];
    rows.forEach((station) => {
      (station.arrivals || []).forEach((arrival) => {
        out.push({
          name: station.name,
          line: arrival.line || station.line,
          direction: arrival.direction,
          message: arrival.message,
          status: arrival.status,
        });
      });
    });
    return out.slice(0, 12);
  }

  function renderTools(active) {
    const on = new Set(active);
    toolStrip.innerHTML = N.TOOLS.map(
      (tool) => '<span class="tool' + (on.has(tool.name) ? ' on' : '') + '">' + tool.name + '</span>'
    ).join('');
  }

  function fillPlaceList() {
    const category = categorySelect.value;
    const filtered = category ? places.filter((p) => p.category === category) : places;
    placeList.innerHTML = filtered.map((p) => '<option value="' + escapeHtml(p.name) + '"></option>').join('');
  }

  async function callApi(action, params) {
    const query = new URLSearchParams({ action, ...(params || {}) });
    if (proxyBase) {
      return requestJson(proxyBase + '?' + query.toString());
    }
    for (const base of PROXY_URLS) {
      try {
        const data = await requestJson(base + '?' + query.toString());
        proxyBase = base;
        return data;
      } catch (_) {
        /* 다음 프록시 또는 직접 호출 */
      }
    }
    return directApi(action, params || {});
  }

  async function requestJson(url) {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '요청 실패');
    return data;
  }

  async function directApi(action, params) {
    if (action === 'list_pois') return { action, places, count: places.length, source: 'local' };
    if (action === 'list_tools') return { action, tools: N.TOOLS };
    const placeName = params.place || SAMPLE_PLACE;
    if (action === 'get_population_ranking') {
      const payload = await fetchSeoulDirect('citydata_ppltn', SAMPLE_PLACE);
      const population = N.normalizePopulation(N.extractPopulationPayload(payload));
      return { action, sampleLimited: true, ranking: [N.rankingItem(population, N.resolvePlace(places, SAMPLE_PLACE))].filter(Boolean) };
    }
    if (action === 'get_consumption_ranking') {
      const snapshot = N.normalizeSnapshot(await fetchSeoulDirect('citydata', SAMPLE_PLACE), N.resolvePlace(places, SAMPLE_PLACE));
      const commerce = snapshot.consumption;
      return {
        action,
        sampleLimited: true,
        ranking: commerce
          ? [{ name: snapshot.place, level: commerce.level, amountMax: commerce.amountMax, paymentCount: commerce.paymentCount }]
          : [],
      };
    }
    const snapshot = N.normalizeSnapshot(await fetchSeoulDirect('citydata', SAMPLE_PLACE), N.resolvePlace(places, placeName) || { name: SAMPLE_PLACE });
    snapshot.sampleLimited = true;
    if (action === 'snapshot') return snapshot;
    if (action === 'get_population') return { population: snapshot.population };
    if (action === 'get_population_prediction') return { prediction: snapshot.prediction };
    if (action === 'get_consumption') return { consumption: snapshot.consumption };
    if (action === 'get_weather') return { weather: snapshot.weather };
    if (action === 'get_air_quality') return { air: snapshot.air };
    if (action === 'list_bike_stations' || action === 'get_bike_stations') return { bikes: snapshot.bikes };
    if (action === 'list_subway_stations' || action === 'get_subway_stations') return { subway: snapshot.subway };
    if (action === 'list_parking_lots' || action === 'get_parking_status') return { parking: snapshot.parking };
    throw new Error('지원하지 않는 도구입니다.');
  }

  async function fetchSeoulDirect(service, placeName) {
    const url = SEOUL_BASE + '/sample/json/' + service + '/1/5/' + encodeURIComponent(placeName);
    const response = await fetch(url);
    if (!response.ok) throw new Error('서울 열린데이터 직접 호출에 실패했습니다.');
    return response.json();
  }

  function formatRange(min, max) {
    if (min == null && max == null) return '-';
    return formatPeople(min) + '–' + formatPeople(max);
  }

  function formatPeople(value) {
    if (value == null) return '-';
    if (value >= 10000) return (value / 10000).toFixed(1).replace(/\.0$/, '') + '만';
    return String(value);
  }

  function formatMoney(value) {
    if (value == null) return '-';
    if (value >= 10000) return Math.round(value / 10000) + '만원';
    return String(value);
  }

  function formatNum(value, suffix) {
    if (value == null) return '-';
    return value + (suffix || '');
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.toggle('show', Boolean(message));
  }

  function setBusy(busy) {
    loadBtn.disabled = busy;
    loadBtn.textContent = busy ? '불러오는 중' : '실시간 연동';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
