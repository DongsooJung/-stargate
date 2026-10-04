import assert from 'node:assert/strict';
import {
  angleDiff,
  assignNearestTaxi,
  bearingDegrees,
  boardStatus,
  buildDropoffIndex,
  buildPickupIndex,
  distanceToSegmentMeters,
  decodeGeohash,
  describeBoard,
  encodeGeohash,
  explainPair,
  findMatches,
  geohashNeighbors,
  haversineMeters,
  nearbyRequestIds,
  nextOfferPhase,
  planSharedRoute,
  taxiFareWon,
} from './match.js';
import { OPEN_REQUESTS, PLACES, TAXIS, requestFromPlaces } from './sample.js';

assert.equal(haversineMeters(PLACES.gangnam, PLACES.gangnam), 0);
const east = bearingDegrees({ lat: 37.5, lon: 127 }, { lat: 37.5, lon: 127.02 });
assert.ok(Math.abs(angleDiff(east, 90)) < 1);
assert.equal(angleDiff(350, 10), 20);

assert.equal(encodeGeohash(57.64911, 10.40744, 11), 'u4pruydqqvj');
const decoded = decodeGeohash(encodeGeohash(37.4979, 127.0276, 6));
assert.ok(Math.abs(decoded.lat - 37.4979) <= decoded.latErr + 1e-6);
assert.ok(Math.abs(decoded.lon - 127.0276) <= decoded.lonErr + 1e-6);
const seoulCell = encodeGeohash(37.5665, 126.978, 5);
const neighbors = geohashNeighbors(seoulCell);
assert.equal(neighbors.length, 8);
assert.ok(!neighbors.includes(seoulCell));

const origin = { id: 'o', dropoff: { lat: 37.5, lon: 127 } };
const near = { id: 'n', dropoff: { lat: 37.508, lon: 127.004 } };
const far = { id: 'f', dropoff: { lat: 37.8, lon: 127.3 } };
const ids = nearbyRequestIds(buildDropoffIndex([origin, near, far], 5), origin.dropoff, 5, 1);
assert.ok(ids.includes('n'));
assert.ok(!ids.includes('f'));

assert.equal(taxiFareWon(1600, { roadFactor: 1 }), 4800);
assert.equal(taxiFareWon(1600 + 131, { roadFactor: 1 }), 4900);
assert.equal(taxiFareWon(1600 + 131.1, { roadFactor: 1 }), 5000);
assert.equal(taxiFareWon(0, { roadFactor: 1, tier: 'night20' }), 5800);
assert.equal(taxiFareWon(0, { roadFactor: 1, tier: 'night40' }), 6700);
assert.ok(taxiFareWon(8000) > taxiFareWon(3000));
const onLine = distanceToSegmentMeters(
  { lat: 37.5, lon: 127 },
  { lat: 37.5, lon: 126.9 },
  { lat: 37.5, lon: 127.1 },
);
assert.ok(onLine.meters < 30);
assert.ok(Math.abs(onLine.along - 0.5) < 0.05);
const offLine = distanceToSegmentMeters(
  { lat: 37.55, lon: 127 },
  { lat: 37.5, lon: 126.9 },
  { lat: 37.5, lon: 127.1 },
);
assert.ok(offLine.meters > 5000);

const gangnam = requestFromPlaces(PLACES.gangnam, PLACES.snu, 0);
const gangnamMatches = findMatches(gangnam, OPEN_REQUESTS);
assert.deepEqual(gangnamMatches.map((row) => row.request.id), ['junho', 'bora', 'sua']);
const sua = gangnamMatches.find((row) => row.request.id === 'sua');
assert.ok(sua.destMeters > 2000);
assert.ok(sua.corridorMeters <= 1300);
assert.ok(gangnamMatches[0].score >= gangnamMatches[1].score);
for (const row of gangnamMatches) {
  assert.equal(row.fare.payMe + row.fare.payThem, row.fare.sharedTotal);
  assert.ok(row.fare.payMe < row.fare.soloMe);
  assert.ok(row.fare.payThem < row.fare.soloThem);
  assert.ok(row.score > 0 && row.score <= 100);
  assertPickupBeforeDrop(row.stops);
}

const gangnamBoard = describeBoard(gangnam, OPEN_REQUESTS);
assert.equal(boardStatus(gangnamBoard.find((row) => row.request.id === 'bora')).code, 'ok');
assert.equal(boardStatus(gangnamBoard.find((row) => row.request.id === 'sua')).code, 'ok');
assert.equal(boardStatus(gangnamBoard.find((row) => row.request.id === 'kai')).code, 'time');
assert.equal(boardStatus(gangnamBoard.find((row) => row.request.id === 'taehyun')).code, 'route');
assert.equal(boardStatus(gangnamBoard.find((row) => row.request.id === 'haeun')).code, 'cell');
const taehyunWide = explainPair(gangnam, OPEN_REQUESTS.find((row) => row.id === 'taehyun'), { pickupRadiusMeters: 3000 });
assert.equal(taehyunWide.eligible, false);
assert.ok(taehyunWide.rejects.some((reject) => reject.code === 'route'));
assert.equal(gangnamBoard.find((row) => row.request.id === 'kai').inCell, true);
assert.ok(gangnamBoard.findIndex((row) => row.eligible) < gangnamBoard.findIndex((row) => !row.eligible));

const hongdae = requestFromPlaces(PLACES.hongdae, PLACES.sinchon, 0);
assert.deepEqual(findMatches(hongdae, OPEN_REQUESTS).map((row) => row.request.id), ['haeun', 'doyun', 'seoyeon']);
const seoyeonTight = explainPair(hongdae, OPEN_REQUESTS.find((row) => row.id === 'seoyeon'), { pickupRadiusMeters: 1000 });
assert.equal(seoyeonTight.eligible, false);
assert.ok(seoyeonTight.rejects.some((reject) => reject.code === 'pickup'));

assert.deepEqual(findMatches(requestFromPlaces(PLACES.jamsil, PLACES.garak, 0), OPEN_REQUESTS).map((row) => row.request.id), ['jihun', 'yerin']);
assert.deepEqual(findMatches(requestFromPlaces(PLACES.yeouido, PLACES.gongdeok, 0), OPEN_REQUESTS).map((row) => row.request.id), ['siwoo', 'nagyung']);

const eastTrip = {
  id: 'me',
  riderId: 'me',
  name: '나',
  departInMin: 0,
  pickup: { name: '서', lat: 37.5, lon: 126.95 },
  dropoff: { name: '동', lat: 37.5, lon: 127.05 },
};
const midpoint = {
  id: 'mid',
  riderId: 'mid',
  name: '중간',
  departInMin: 0,
  pickup: { name: '근처', lat: 37.503, lon: 126.955 },
  dropoff: { name: '중간하차', lat: 37.501, lon: 127 },
};
const midpointPair = explainPair(eastTrip, midpoint);
assert.equal(midpointPair.eligible, true);
assert.ok(midpointPair.destMeters > 2000);
assert.ok(midpointPair.corridorMeters < 1300);
const offRoute = {
  id: 'off',
  riderId: 'off',
  name: '밖',
  departInMin: 0,
  pickup: { name: '근처', lat: 37.503, lon: 126.955 },
  dropoff: { name: '북쪽', lat: 37.56, lon: 127 },
};
const offPair = explainPair(eastTrip, offRoute);
assert.equal(offPair.eligible, false);
assert.ok(offPair.rejects.some((reject) => reject.code === 'route'));
const pickupIds = nearbyRequestIds(buildPickupIndex([
  { id: 'near', pickup: { lat: 37.501, lon: 127.001 } },
  { id: 'far', pickup: { lat: 37.8, lon: 127.3 } },
], 5), { lat: 37.5, lon: 127 }, 5, 1);
assert.ok(pickupIds.includes('near'));
assert.ok(!pickupIds.includes('far'));

const late = { ...OPEN_REQUESTS[0], departInMin: 40 };
assert.ok(explainPair(gangnam, late).rejects.some((reject) => reject.code === 'time'));
assert.ok(explainPair(gangnam, { ...gangnam, id: 'other' }).rejects.some((reject) => reject.code === 'self'));

assert.equal(assignNearestTaxi(TAXIS, PLACES.gangnam).id, 't12');
assert.equal(nextOfferPhase('proposed', 'accept-self'), 'waiting');
assert.equal(nextOfferPhase('waiting', 'accept-partner'), 'assigned');
assert.equal(nextOfferPhase('waiting', 'expire'), 'expired');
assert.equal(nextOfferPhase('proposed', 'accept-partner'), 'proposed');
assert.equal(nextOfferPhase('assigned', 'cancel'), 'cancelled');

const sameRoute = planSharedRoute(gangnam, OPEN_REQUESTS.find((row) => row.id === 'bora'));
assert.ok(sameRoute.meters > 0);
assertPickupBeforeDrop(sameRoute.stops);

function assertPickupBeforeDrop(stops) {
  const seenDrop = new Set();
  for (const stop of stops) {
    if (stop.kind === 'dropoff') seenDrop.add(stop.riderId);
    if (stop.kind === 'pickup') assert.equal(seenDrop.has(stop.riderId), false);
  }
  assert.equal(stops.filter((stop) => stop.kind === 'pickup').length, 2);
}

console.log('ok');
