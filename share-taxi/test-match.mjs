import assert from 'node:assert/strict';
import {
  angleDiff,
  assignNearestTaxi,
  bearingDegrees,
  boardStatus,
  buildDropoffIndex,
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

const gangnam = requestFromPlaces(PLACES.gangnam, PLACES.snu, 0);
const gangnamMatches = findMatches(gangnam, OPEN_REQUESTS);
assert.deepEqual(gangnamMatches.map((row) => row.request.id), ['bora', 'junho']);
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
assert.equal(boardStatus(gangnamBoard.find((row) => row.request.id === 'kai')).code, 'time');
assert.equal(boardStatus(gangnamBoard.find((row) => row.request.id === 'sua')).code, 'dest');
assert.equal(boardStatus(gangnamBoard.find((row) => row.request.id === 'haeun')).code, 'cell');
assert.equal(gangnamBoard.find((row) => row.request.id === 'kai').inCell, true);
assert.ok(gangnamBoard.findIndex((row) => row.eligible) < gangnamBoard.findIndex((row) => !row.eligible));

const hongdae = requestFromPlaces(PLACES.hongdae, PLACES.sinchon, 0);
assert.deepEqual(findMatches(hongdae, OPEN_REQUESTS).map((row) => row.request.id), ['haeun', 'doyun']);
const seoyeonWide = explainPair(hongdae, OPEN_REQUESTS.find((row) => row.id === 'seoyeon'), { destRadiusMeters: 2000 });
assert.equal(seoyeonWide.eligible, true);
assert.equal(explainPair(hongdae, OPEN_REQUESTS.find((row) => row.id === 'seoyeon')).eligible, false);

assert.deepEqual(findMatches(requestFromPlaces(PLACES.jamsil, PLACES.garak, 0), OPEN_REQUESTS).map((row) => row.request.id), ['jihun', 'yerin']);
assert.deepEqual(findMatches(requestFromPlaces(PLACES.yeouido, PLACES.gongdeok, 0), OPEN_REQUESTS).map((row) => row.request.id), ['siwoo', 'nagyung']);

const side = {
  id: 'side',
  riderId: 'side',
  name: '옆',
  departInMin: 0,
  pickup: { name: '북', lat: 37.56, lon: 127.04 },
  dropoff: { name: '북동', lat: 37.508, lon: 127.052 },
};
const eastTrip = {
  id: 'me',
  riderId: 'me',
  name: '나',
  departInMin: 0,
  pickup: { name: '서', lat: 37.5, lon: 126.95 },
  dropoff: { name: '동', lat: 37.5, lon: 127.05 },
};
const sidePair = explainPair(eastTrip, side);
assert.ok(sidePair.destMeters < 1500);
assert.equal(sidePair.eligible, false);
assert.ok(sidePair.rejects.some((reject) => reject.code === 'detour' || reject.code === 'overlap'));

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
