/**
 * 서울 실시간 도시데이터 → MCP 도구 형태의 연구 대시보드 프록시
 *
 * GET /api/seoul-citydata?action=list_pois|snapshot|get_population|...
 * POST /api/seoul-citydata  { action, place, query, top, category }
 *
 * 업스트림: http://openapi.seoul.go.kr:8088/{KEY}/json/citydata|/citydata_ppltn
 * 키: SEOUL_OPEN_API_KEY, 없으면 sample (광화문·덕수궁만)
 */

const {
  TOOLS,
  filterPlaces,
  resolvePlace,
  normalizeSnapshot,
  normalizePopulation,
  rankingItem,
  sortPopulationRanking,
  sortConsumptionRanking,
  extractPopulationPayload,
  resultCode,
} = require('../seoul-city/normalize.js');
const PLACES = require('../seoul-city/places.json');

const SEOUL_BASE = 'http://openapi.seoul.go.kr:8088';
const SAMPLE_PLACE = '광화문·덕수궁';
const RANK_PANEL = [
  '광화문·덕수궁',
  '강남역',
  '홍대 관광특구',
  '명동 관광특구',
  '여의도',
  '잠실역',
  '서울역',
  '성수카페거리',
  '가로수길',
  '강남 MICE 관광특구',
  '이태원 관광특구',
  '건대입구역',
];
const CONSUMPTION_PANEL = RANK_PANEL.slice(0, 8);
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 90 * 1000;

const ALLOWED_ORIGINS = new Set([
  'https://www.stargateedu.co.kr',
  'https://stargateedu.co.kr',
  'https://dongsoojung.github.io',
  'https://stargate-homepage.vercel.app',
  'https://www.stargate11.com',
  'https://stargate11.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const cache = new Map();

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET,POST,OPTIONS');
    return res.status(405).json({ error: 'GET 또는 POST만 지원합니다.' });
  }

  try {
    const input = parseInput(req);
    const payload = await dispatch(input);
    return res.status(200).json(payload);
  } catch (error) {
    const status = error && error.status ? error.status : 400;
    return res.status(status).json({
      error: error instanceof Error ? error.message : '서울 도시데이터를 불러오지 못했습니다.',
    });
  }
};

module.exports.__test = {
  RANK_PANEL,
  SAMPLE_PLACE,
  parseAction,
  limitTop,
};

async function dispatch(input) {
  const action = parseAction(input.action);
  const keyInfo = apiKeyInfo();

  if (action === 'list_tools') {
    return { action, tools: TOOLS, source: '서울 열린데이터광장' };
  }

  if (action === 'list_pois') {
    const places = filterPlaces(PLACES, input.query);
    return { action, count: places.length, places, source: '서울 열린데이터광장' };
  }

  if (action === 'get_population_ranking') {
    return getPopulationRanking(input, keyInfo);
  }

  if (action === 'get_consumption_ranking') {
    return getConsumptionRanking(input, keyInfo);
  }

  const place = requirePlace(input.place, keyInfo);

  if (action === 'snapshot') {
    const snapshot = await loadSnapshot(place, keyInfo);
    return { action, sampleLimited: keyInfo.sample, ...snapshot };
  }

  const snapshot = await loadSnapshot(place, keyInfo);
  if (action === 'get_population') return { action, place: snapshot.place, population: snapshot.population, sampleLimited: keyInfo.sample };
  if (action === 'get_population_prediction') return { action, place: snapshot.place, prediction: snapshot.prediction, sampleLimited: keyInfo.sample };
  if (action === 'get_consumption') return { action, place: snapshot.place, consumption: snapshot.consumption, sampleLimited: keyInfo.sample };
  if (action === 'get_weather') return { action, place: snapshot.place, weather: snapshot.weather, sampleLimited: keyInfo.sample };
  if (action === 'get_air_quality') return { action, place: snapshot.place, air: snapshot.air, sampleLimited: keyInfo.sample };
  if (action === 'list_bike_stations' || action === 'get_bike_stations') {
    let bikes = snapshot.bikes;
    if (input.station) bikes = bikes.filter((row) => row.id === input.station || row.name.includes(input.station));
    return { action, place: snapshot.place, bikes, sampleLimited: keyInfo.sample };
  }
  if (action === 'list_subway_stations' || action === 'get_subway_stations') {
    return { action, place: snapshot.place, subway: snapshot.subway, sampleLimited: keyInfo.sample };
  }
  if (action === 'list_parking_lots' || action === 'get_parking_status') {
    let parking = snapshot.parking;
    if (input.lot) parking = parking.filter((row) => row.id === input.lot || row.name.includes(input.lot));
    return { action, place: snapshot.place, parking, sampleLimited: keyInfo.sample };
  }

  throw Object.assign(new Error('지원하지 않는 action입니다.'), { status: 400 });
}

async function getPopulationRanking(input, keyInfo) {
  const top = limitTop(input.top, 12);
  const names = rankingTargets(input.category, RANK_PANEL, keyInfo);
  const rows = [];
  const results = await mapPool(names, 4, async (name) => {
    const place = resolvePlace(PLACES, name);
    const payload = await fetchSeoul('citydata_ppltn', name, keyInfo.key);
    const population = normalizePopulation(extractPopulationPayload(payload));
    return rankingItem(population, place);
  });
  results.forEach((item) => {
    if (item) rows.push(item);
  });
  return {
    action: 'get_population_ranking',
    sampleLimited: keyInfo.sample,
    count: Math.min(top, rows.length),
    ranking: sortPopulationRanking(rows).slice(0, top),
    source: '서울 열린데이터광장',
  };
}

async function getConsumptionRanking(input, keyInfo) {
  const top = limitTop(input.top, 8);
  const names = rankingTargets(input.category, CONSUMPTION_PANEL, keyInfo);
  const rows = [];
  const results = await mapPool(names, 3, async (name) => {
    const place = resolvePlace(PLACES, name);
    const snapshot = await loadSnapshot(place || { name, category: '' }, keyInfo);
    if (!snapshot.consumption) return null;
    return {
      name: snapshot.place,
      category: snapshot.category,
      level: snapshot.consumption.level,
      paymentCount: snapshot.consumption.paymentCount,
      amountMin: snapshot.consumption.amountMin,
      amountMax: snapshot.consumption.amountMax,
    };
  });
  results.forEach((item) => {
    if (item) rows.push(item);
  });
  return {
    action: 'get_consumption_ranking',
    sampleLimited: keyInfo.sample,
    count: Math.min(top, rows.length),
    ranking: sortConsumptionRanking(rows).slice(0, top),
    source: '서울 열린데이터광장',
  };
}

async function loadSnapshot(place, keyInfo) {
  const cacheKey = 'snapshot:' + place.name + ':' + (keyInfo.sample ? 'sample' : 'key');
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.value;
  const payload = await fetchSeoul('citydata', place.name, keyInfo.key);
  const snapshot = normalizeSnapshot(payload, place);
  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: snapshot });
  return snapshot;
}

async function fetchSeoul(service, placeName, key) {
  const cacheKey = service + ':' + placeName + ':' + key;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.value;

  const url =
    SEOUL_BASE +
    '/' +
    encodeURIComponent(key) +
    '/json/' +
    service +
    '/1/5/' +
    encodeURIComponent(placeName);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let upstream;
  try {
    upstream = await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw Object.assign(new Error('서울 열린데이터 응답 시간이 초과되었습니다.'), { status: 504 });
    }
    throw Object.assign(new Error('서울 열린데이터에 연결하지 못했습니다.'), { status: 503 });
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) {
    throw Object.assign(new Error('서울 열린데이터 조회에 실패했습니다.'), { status: 502 });
  }

  const payload = await upstream.json();
  const code = resultCode(payload);
  if (code && code !== 'INFO-000') {
    const message =
      (payload.RESULT && (payload.RESULT['RESULT.MESSAGE'] || payload.RESULT.MESSAGE)) ||
      '서울 열린데이터가 장소를 반환하지 않았습니다.';
    throw Object.assign(new Error(String(message)), { status: 502 });
  }
  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: payload });
  return payload;
}

function rankingTargets(category, panel, keyInfo) {
  if (keyInfo.sample) return [SAMPLE_PLACE];
  const filtered = category
    ? PLACES.filter((p) => p.category === category).map((p) => p.name).slice(0, 12)
    : panel.slice();
  return filtered.length ? filtered : [SAMPLE_PLACE];
}

function requirePlace(query, keyInfo) {
  const requested = String(query || '').trim() || SAMPLE_PLACE;
  if (keyInfo.sample) {
    return resolvePlace(PLACES, SAMPLE_PLACE);
  }
  const place = resolvePlace(PLACES, requested);
  if (!place) {
    throw Object.assign(new Error('알 수 없는 장소입니다. list_pois로 장소명을 확인하세요.'), { status: 404 });
  }
  return place;
}

function apiKeyInfo() {
  const envKey = String(process.env.SEOUL_OPEN_API_KEY || '').trim();
  if (envKey && envKey.toLowerCase() !== 'sample') return { key: envKey, sample: false };
  return { key: 'sample', sample: true };
}

function parseInput(req) {
  const url = new URL(req.url, 'http://localhost');
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  return {
    action: url.searchParams.get('action') || body.action || 'snapshot',
    place: url.searchParams.get('place') || body.place || '',
    query: url.searchParams.get('query') || body.query || '',
    category: url.searchParams.get('category') || body.category || '',
    top: url.searchParams.get('top') || body.top,
    station: url.searchParams.get('station') || body.station || '',
    lot: url.searchParams.get('lot') || body.lot || '',
  };
}

function parseAction(value) {
  const action = String(value || 'snapshot').trim();
  return action || 'snapshot';
}

function limitTop(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(20, Math.max(1, Math.round(n)));
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return {};
  }
}

async function mapPool(items, concurrency, worker) {
  const results = [];
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = items[index++];
      try {
        results.push(await worker(current));
      } catch (_) {
        results.push(null);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function setCors(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader(
    'access-control-allow-origin',
    ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.stargateedu.co.kr'
  );
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('vary', 'origin');
}
