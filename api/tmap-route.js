const ROUTE_URL = 'https://apis.openapi.sk.com/tmap/routes?version=1&format=json';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }

  if (!isSameOrigin(req)) {
    return res.status(403).json({ error: '허용되지 않은 요청 출처입니다.' });
  }

  const appKey = process.env.TMAP_REST_APP_KEY;
  if (!appKey) {
    return res.status(503).json({ error: 'TMAP 서버 연동이 아직 설정되지 않았습니다.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const start = validateCoordinate(body.start, '출발지');
    const end = validateCoordinate(body.end, '도착지');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let upstream;

    try {
      upstream = await fetch(ROUTE_URL, {
        method: 'POST',
        headers: {
          appKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startX: String(start.lon),
          startY: String(start.lat),
          endX: String(end.lon),
          endY: String(end.lat),
          startName: start.name || '출발지',
          endName: end.name || '도착지',
          reqCoordType: 'WGS84GEO',
          resCoordType: 'WGS84GEO',
          searchOption: normalizeSearchOption(body.searchOption),
          trafficInfo: 'Y',
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      const upstreamText = await upstream.text();
      console.error('TMAP route error', upstream.status, upstreamText.slice(0, 300));
      return res.status(upstream.status === 401 ? 502 : 503).json({
        error: 'TMAP 경로 계산에 실패했습니다.',
        upstreamStatus: upstream.status,
      });
    }

    const data = await upstream.json();
    return res.status(200).json(normalizeRoute(data));
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return res.status(504).json({ error: 'TMAP 응답 시간이 초과되었습니다.' });
    }
    return res.status(400).json({
      error: error instanceof Error ? error.message : '잘못된 요청입니다.',
    });
  }
};

function validateCoordinate(value, label) {
  if (!value || typeof value !== 'object') throw new Error(`${label} 좌표가 없습니다.`);
  const lat = Number(value.lat);
  const lon = Number(value.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`${label} 위도·경도가 올바르지 않습니다.`);
  }
  if (lat < 33 || lat > 39 || lon < 124 || lon > 132) {
    throw new Error(`${label} 좌표가 국내 범위를 벗어났습니다.`);
  }
  return { lat, lon, name: String(value.name || '').slice(0, 80) };
}
function normalizeSearchOption(value) {
  const allowed = new Set(['0', '1', '2', '3', '4', '10', '12', '19']);
  const option = String(value ?? '0');
  return allowed.has(option) ? option : '0';
}

function normalizeRoute(data) {
  const features = Array.isArray(data && data.features) ? data.features : [];
  const summary = features.find((feature) =>
    Number.isFinite(Number(feature && feature.properties && feature.properties.totalTime))
  );
  const properties = (summary && summary.properties) || {};
  const path = [];

  features.forEach((feature) => {
    const geometry = feature && feature.geometry;
    if (!geometry || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) return;
    geometry.coordinates.forEach((coordinate) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) return;
      const lon = Number(coordinate[0]);
      const lat = Number(coordinate[1]);
      if (Number.isFinite(lon) && Number.isFinite(lat)) path.push([lon, lat]);
    });
  });

  return {
    summary: {
      totalDistanceMeters: Number(properties.totalDistance || 0),
      totalTimeSeconds: Number(properties.totalTime || 0),
      totalFareWon: Number(properties.totalFare || 0),
      taxiFareWon: Number(properties.taxiFare || 0),
    },
    path,
    featureCount: features.length,
  };
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  try {
    return new URL(origin).host.toLowerCase() === host;
  } catch (_) {
    return false;
  }
}
