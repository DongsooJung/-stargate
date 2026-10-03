const EARTH_RADIUS_M = 6371000;
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** 서울 중형택시 거리요금. 2023-02-01 기준(기본 1.6km, 이후 131m). 시간요금은 제외. */
export const TAXI = {
  baseMeters: 1600,
  metersPerStep: 131,
  roadFactor: 1.35,
  tiers: {
    day: { baseWon: 4800, stepWon: 100, label: '주간' },
    night20: { baseWon: 5800, stepWon: 120, label: '심야 20% (22–23시·02–04시)' },
    night40: { baseWon: 6700, stepWon: 140, label: '심야 40% (23–02시)' },
  },
};

export const DEFAULT_RULES = {
  destRadiusMeters: 1500,
  maxInVehicleDetour: 0.45,
  maxPoolDetour: 0.4,
  maxDepartGapMin: 10,
  minSavingsRatio: 0.1,
  geohashPrecision: 5,
  neighborRings: 1,
  tier: 'day',
  weights: {
    dest: 0.4,
    inVehicle: 0.25,
    pool: 0.15,
    time: 0.1,
    bearing: 0.1,
  },
};

export function haversineMeters(a, b) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearingDegrees(a, b) {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function angleDiff(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function encodeGeohash(lat, lon, precision = 6) {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let even = true;

  while (hash.length < precision) {
    if (even) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        ch = (ch << 1) + 1;
        lonMin = mid;
      } else {
        ch <<= 1;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch = (ch << 1) + 1;
        latMin = mid;
      } else {
        ch <<= 1;
        latMax = mid;
      }
    }
    even = !even;
    bit += 1;
    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

export function decodeGeohash(hash) {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let even = true;

  for (const char of String(hash)) {
    const idx = BASE32.indexOf(char);
    if (idx < 0) throw new Error('잘못된 지오해시입니다.');
    for (let mask = 16; mask > 0; mask >>= 1) {
      if (even) {
        const mid = (lonMin + lonMax) / 2;
        if (idx & mask) lonMin = mid;
        else lonMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (idx & mask) latMin = mid;
        else latMax = mid;
      }
      even = !even;
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lon: (lonMin + lonMax) / 2,
    latErr: (latMax - latMin) / 2,
    lonErr: (lonMax - lonMin) / 2,
  };
}

export function geohashNeighbors(hash) {
  const decoded = decodeGeohash(hash);
  const found = [];
  const seen = new Set();
  for (const dy of [-1, 0, 1]) {
    for (const dx of [-1, 0, 1]) {
      if (dx === 0 && dy === 0) continue;
      let cell = null;
      for (const scale of [1, 1.02, 0.98, 1.1]) {
        const next = encodeGeohash(
          decoded.lat + dy * decoded.latErr * 2 * scale,
          decoded.lon + dx * decoded.lonErr * 2 * scale,
          hash.length,
        );
        if (next !== hash) {
          cell = next;
          break;
        }
      }
      if (cell && !seen.has(cell)) {
        seen.add(cell);
        found.push(cell);
      }
    }
  }
  return found;
}

export function geohashDisk(hash, rings = 1) {
  let cells = new Set([hash]);
  for (let ring = 0; ring < rings; ring += 1) {
    const next = new Set(cells);
    for (const cell of cells) {
      for (const neighbor of geohashNeighbors(cell)) next.add(neighbor);
    }
    cells = next;
  }
  return [...cells];
}

export function buildDropoffIndex(requests, precision = 5) {
  const index = new Map();
  for (const request of requests) {
    if (!request || !request.dropoff || !request.id) continue;
    const cell = encodeGeohash(request.dropoff.lat, request.dropoff.lon, precision);
    const bucket = index.get(cell) || [];
    bucket.push(request.id);
    index.set(cell, bucket);
  }
  return index;
}

export function nearbyRequestIds(index, dropoff, precision = 5, rings = 1) {
  const cell = encodeGeohash(dropoff.lat, dropoff.lon, precision);
  const ids = [];
  const seen = new Set();
  for (const key of geohashDisk(cell, rings)) {
    for (const id of index.get(key) || []) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function taxiFareWon(straightMeters, options = {}) {
  const tier = TAXI.tiers[options.tier] || TAXI.tiers.day;
  const roadFactor = options.roadFactor ?? TAXI.roadFactor;
  const meters = Math.max(0, Number(straightMeters) || 0) * roadFactor;
  if (meters <= TAXI.baseMeters) return tier.baseWon;
  const steps = Math.ceil((meters - TAXI.baseMeters) / TAXI.metersPerStep);
  return tier.baseWon + steps * tier.stepWon;
}

export function etaMinutes(straightMeters, options = {}) {
  const roadFactor = options.roadFactor ?? TAXI.roadFactor;
  const speedKmh = options.speedKmh ?? 22;
  const km = (Math.max(0, straightMeters) * roadFactor) / 1000;
  return (km / speedKmh) * 60;
}

export function planSharedRoute(a, b) {
  const aPu = stopPoint(a.pickup, a.riderId, 'pickup');
  const aDo = stopPoint(a.dropoff, a.riderId, 'dropoff');
  const bPu = stopPoint(b.pickup, b.riderId, 'pickup');
  const bDo = stopPoint(b.dropoff, b.riderId, 'dropoff');
  const sequences = [
    [aPu, bPu, aDo, bDo],
    [aPu, bPu, bDo, aDo],
    [bPu, aPu, aDo, bDo],
    [bPu, aPu, bDo, aDo],
  ];
  let best = null;
  for (const stops of sequences) {
    const meters = pathMeters(stops);
    const inVehicle = {
      [a.riderId]: inVehicleMeters(stops, a.riderId),
      [b.riderId]: inVehicleMeters(stops, b.riderId),
    };
    if (!best || meters < best.meters - 0.5) best = { stops, meters, inVehicle };
  }
  return best;
}

export function explainPair(me, other, rules) {
  const cfg = resolveRules(rules);
  if (!hasPoint(me) || !hasPoint(other)) {
    return { eligible: false, request: other, rejects: [{ code: 'invalid', message: '좌표가 없습니다.' }], score: 0 };
  }
  if ((me.id && other.id && me.id === other.id) || (me.riderId && other.riderId && me.riderId === other.riderId)) {
    return { eligible: false, request: other, rejects: [{ code: 'self', message: '같은 승객입니다.' }], score: 0 };
  }

  const destMeters = haversineMeters(me.dropoff, other.dropoff);
  const pickupMeters = haversineMeters(me.pickup, other.pickup);
  const bearingGap = angleDiff(bearingDegrees(me.pickup, me.dropoff), bearingDegrees(other.pickup, other.dropoff));
  const departGapMin = Math.abs(Number(me.departInMin || 0) - Number(other.departInMin || 0));
  const soloMe = haversineMeters(me.pickup, me.dropoff);
  const soloThem = haversineMeters(other.pickup, other.dropoff);
  const plan = planSharedRoute(me, other);
  const shared = plan.meters;
  const rideMe = plan.inVehicle[me.riderId];
  const rideThem = plan.inVehicle[other.riderId];
  const detourMe = soloMe > 0 ? rideMe / soloMe - 1 : Infinity;
  const detourThem = soloThem > 0 ? rideThem / soloThem - 1 : Infinity;
  const inVehicleDetour = Math.max(detourMe, detourThem);
  const longer = Math.max(soloMe, soloThem);
  const poolDetour = longer > 0 ? shared / longer - 1 : Infinity;
  const savingsRatio = soloMe + soloThem > 0 ? (soloMe + soloThem - shared) / (soloMe + soloThem) : 0;
  const rejects = [];

  if (!(soloMe > 200) || !(soloThem > 200)) rejects.push({ code: 'invalid', message: '너무 짧은 구간입니다.' });
  if (destMeters > cfg.destRadiusMeters) {
    rejects.push({ code: 'dest', message: `도착지가 ${formatDistance(destMeters)} 떨어져 있습니다.` });
  }
  if (departGapMin > cfg.maxDepartGapMin) {
    rejects.push({ code: 'time', message: `출발 시각이 ${departGapMin}분 차이 납니다.` });
  }
  if (inVehicleDetour > cfg.maxInVehicleDetour) {
    rejects.push({ code: 'detour', message: `탑승 우회가 ${Math.round(inVehicleDetour * 100)}%입니다.` });
  }
  if (poolDetour > cfg.maxPoolDetour) {
    rejects.push({ code: 'overlap', message: `합승 경로가 긴 쪽보다 ${Math.round(poolDetour * 100)}% 깁니다.` });
  }
  if (!(savingsRatio >= cfg.minSavingsRatio)) {
    rejects.push({ code: 'overlap', message: '경로가 거의 겹치지 않습니다.' });
  }

  const tier = cfg.tier || 'day';
  const fareSoloMe = taxiFareWon(soloMe, { tier, roadFactor: cfg.roadFactor });
  const fareSoloThem = taxiFareWon(soloThem, { tier, roadFactor: cfg.roadFactor });
  const fareShared = taxiFareWon(shared, { tier, roadFactor: cfg.roadFactor });
  const split = splitFare(fareShared, fareSoloMe, fareSoloThem);
  if (!split) rejects.push({ code: 'fare', message: '합승 요금이 각자 단독보다 저렴하지 않습니다.' });

  const weights = cfg.weights;
  const score = Math.round(
    100 * (
      weights.dest * clamp01(1 - destMeters / cfg.destRadiusMeters) +
      weights.inVehicle * clamp01(1 - inVehicleDetour / cfg.maxInVehicleDetour) +
      weights.pool * clamp01(1 - poolDetour / cfg.maxPoolDetour) +
      weights.time * clamp01(1 - departGapMin / cfg.maxDepartGapMin) +
      weights.bearing * clamp01(1 - bearingGap / 180)
    ),
  );

  return {
    eligible: rejects.length === 0,
    request: other,
    rejects,
    score: rejects.length === 0 ? score : 0,
    destMeters,
    pickupMeters,
    bearingGap,
    departGapMin,
    soloMeters: { me: soloMe, them: soloThem, shared },
    detour: { me: detourMe, them: detourThem, inVehicle: inVehicleDetour, pool: poolDetour },
    savingsRatio,
    stops: plan.stops,
    dropoffCell: encodeGeohash(other.dropoff.lat, other.dropoff.lon, cfg.geohashPrecision),
    fare: {
      soloMe: fareSoloMe,
      soloThem: fareSoloThem,
      sharedTotal: fareShared,
      payMe: split ? split.payA : null,
      payThem: split ? split.payB : null,
      saveMe: split ? fareSoloMe - split.payA : null,
      saveThem: split ? fareSoloThem - split.payB : null,
    },
  };
}

export function describeBoard(me, requests, rules) {
  const cfg = resolveRules(rules);
  const index = buildDropoffIndex(requests, cfg.geohashPrecision);
  const near = new Set(nearbyRequestIds(index, me.dropoff, cfg.geohashPrecision, cfg.neighborRings));
  const rows = requests.map((request) => ({
    ...explainPair(me, request, cfg),
    inCell: near.has(request.id),
  }));
  rows.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return a.destMeters - b.destMeters;
  });
  return rows;
}

export function findMatches(me, requests, rules) {
  return describeBoard(me, requests, rules)
    .filter((row) => row.eligible && row.inCell)
    .sort((a, b) => b.score - a.score || a.destMeters - b.destMeters);
}

export function scoreBreakdown(result, rules) {
  const cfg = resolveRules(rules);
  const weights = cfg.weights;
  const parts = [
    { key: 'dest', label: '도착지', weight: weights.dest, unit: clamp01(1 - result.destMeters / cfg.destRadiusMeters) },
    { key: 'inVehicle', label: '탑승 우회', weight: weights.inVehicle, unit: clamp01(1 - result.detour.inVehicle / cfg.maxInVehicleDetour) },
    { key: 'pool', label: '경로 겹침', weight: weights.pool, unit: clamp01(1 - result.detour.pool / cfg.maxPoolDetour) },
    { key: 'time', label: '출발 시각', weight: weights.time, unit: clamp01(1 - result.departGapMin / cfg.maxDepartGapMin) },
    { key: 'bearing', label: '방향', weight: weights.bearing, unit: clamp01(1 - result.bearingGap / 180) },
  ];
  return parts.map((part) => ({ ...part, points: Math.round(100 * part.weight * part.unit) }));
}

export function soloQuote(request, rules) {
  const cfg = resolveRules(rules);
  const meters = haversineMeters(request.pickup, request.dropoff);
  return {
    meters,
    fare: taxiFareWon(meters, { tier: cfg.tier || 'day', roadFactor: cfg.roadFactor }),
    cell: encodeGeohash(request.dropoff.lat, request.dropoff.lon, cfg.geohashPrecision),
  };
}

export function assignNearestTaxi(taxis, pickup) {
  if (!Array.isArray(taxis) || !taxis.length || !pickup) return null;
  return taxis
    .map((taxi) => ({ ...taxi, meters: haversineMeters(taxi, pickup) }))
    .sort((a, b) => a.meters - b.meters)[0];
}

/** 양쪽 수락 전에는 배차하지 않는다. */
export function nextOfferPhase(phase, event) {
  if (event === 'cancel') return 'cancelled';
  if (phase === 'proposed' && event === 'accept-self') return 'waiting';
  if (phase === 'waiting' && event === 'accept-partner') return 'assigned';
  if (phase === 'waiting' && event === 'expire') return 'expired';
  return phase;
}

export function boardStatus(row) {
  if (row.eligible) return { code: 'ok', label: '합승 가능' };
  if (!row.inCell) return { code: 'cell', label: '다른 하차 칸' };
  const code = row.rejects[0] ? row.rejects[0].code : 'invalid';
  const labels = {
    dest: '도착지 반경 밖',
    time: '출발 시각 불일치',
    detour: '우회 초과',
    overlap: '경로가 덜 겹침',
    fare: '요금이 줄지 않음',
    invalid: '구간이 짧음',
    self: '본인 요청',
  };
  return { code, label: labels[code] || '조건 불일치' };
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '-';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatWon(amount) {
  if (!Number.isFinite(amount)) return '-';
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
}

function resolveRules(rules) {
  return {
    ...DEFAULT_RULES,
    ...rules,
    weights: { ...DEFAULT_RULES.weights, ...(rules && rules.weights) },
  };
}

function splitFare(total, soloA, soloB) {
  if (!(soloA > 0) || !(soloB > 0) || !(total > 0) || total >= soloA + soloB) return null;
  let payA = Math.round((total * soloA) / (soloA + soloB) / 100) * 100;
  let payB = total - payA;
  if (payA >= soloA) {
    payA = soloA - 100;
    payB = total - payA;
  }
  if (payB >= soloB) {
    payB = soloB - 100;
    payA = total - payB;
  }
  if (payA <= 0 || payB <= 0 || payA >= soloA || payB >= soloB || payA + payB !== total) return null;
  return { payA, payB };
}

function stopPoint(place, riderId, kind) {
  return { riderId, kind, name: place.name, lat: place.lat, lon: place.lon };
}

function pathMeters(stops) {
  let total = 0;
  for (let i = 1; i < stops.length; i += 1) total += haversineMeters(stops[i - 1], stops[i]);
  return total;
}

function inVehicleMeters(stops, riderId) {
  const start = stops.findIndex((stop) => stop.riderId === riderId && stop.kind === 'pickup');
  const end = stops.findIndex((stop) => stop.riderId === riderId && stop.kind === 'dropoff');
  if (start < 0 || end < 0 || end <= start) return Infinity;
  return pathMeters(stops.slice(start, end + 1));
}

function hasPoint(request) {
  return Boolean(request && request.pickup && request.dropoff && request.riderId);
}

function clamp01(value) {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
