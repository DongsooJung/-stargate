import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const N = require('./normalize.js');
const places = require('./places.json');
const api = require('../api/seoul-citydata.js');

assert.equal(places.length, 121);
assert.equal(N.filterPlaces(places, '강남').some((p) => p.name === '강남역'), true);
assert.equal(N.resolvePlace(places, '광화문').name, '광화문·덕수궁');
assert.equal(N.resolvePlace(places, '없는곳'), null);

const population = N.normalizePopulation({
  AREA_NM: '광화문·덕수궁',
  AREA_CD: 'POI009',
  AREA_CONGEST_LVL: '붐빔',
  AREA_CONGEST_MSG: '사람이 몰려 있어요',
  AREA_PPLTN_MIN: '30000',
  AREA_PPLTN_MAX: '32000',
  MALE_PPLTN_RATE: '47.3',
  FEMALE_PPLTN_RATE: '52.7',
  PPLTN_RATE_20: '23.0',
  PPLTN_RATE_30: '23.1',
  RESNT_PPLTN_RATE: '19.4',
  NON_RESNT_PPLTN_RATE: '80.6',
  PPLTN_TIME: '2026-09-19 19:30',
  FCST_PPLTN: [{ FCST_TIME: '2026-09-19 21:00', FCST_CONGEST_LVL: '여유', FCST_PPLTN_MIN: '22000', FCST_PPLTN_MAX: '24000' }],
});
assert.equal(population.congestion, '붐빔');
assert.equal(population.congestionRank, 3);
assert.equal(population.max, 32000);
assert.equal(population.forecast.length, 1);
assert.equal(population.ages.find((a) => a.key === '20').rate, 23);

const rawPopulation = {
  AREA_NM: '광화문·덕수궁',
  AREA_CD: 'POI009',
  AREA_CONGEST_LVL: '붐빔',
  AREA_CONGEST_MSG: '사람이 몰려 있어요',
  AREA_PPLTN_MIN: '30000',
  AREA_PPLTN_MAX: '32000',
  PPLTN_TIME: '2026-09-19 19:30',
  FCST_PPLTN: [],
};
const snapshot = N.normalizeSnapshot({
  CITYDATA: {
    AREA_NM: '광화문·덕수궁',
    LIVE_PPLTN_STTS: [rawPopulation],
    WEATHER_STTS: [
      {
        WEATHER_TIME: '2026-09-19 20:00',
        TEMP: '24.5',
        HUMIDITY: '58',
        PM10: '32',
        PM10_INDEX: '보통',
        PM25: '18',
        PM25_INDEX: '보통',
        AIR_IDX: '보통',
        AIR_MSG: '대기질이 보통입니다.',
      },
    ],
    LIVE_CMRCL_STTS: {
      AREA_CMRCL_LVL: '바쁜',
      AREA_SH_PAYMENT_CNT: '100',
      AREA_SH_PAYMENT_AMT_MIN: 3800000,
      AREA_SH_PAYMENT_AMT_MAX: 3900000,
      CMRCL_RSB: [{ RSB_LRG_CTGR: '음식·음료', RSB_MID_CTGR: '한식', RSB_PAYMENT_LVL: '바쁜', RSB_SH_PAYMENT_CNT: 23 }],
    },
    SBIKE_STTS: [{ SBIKE_SPOT_NM: '광화문역', SBIKE_SPOT_ID: 'ST-119', SBIKE_PARKING_CNT: '1', SBIKE_RACK_CNT: '8', SBIKE_X: 126.97, SBIKE_Y: 37.57 }],
    PRK_STTS: [{ PRK_NM: '테스트주차장', PRK_CD: '1', CPCTY: '24', CUR_PRK_CNT: '10', CUR_PRK_YN: 'Y', LNG: '126.97', LAT: '37.56' }],
    SUB_STTS: [
      {
        SUB_STN_NM: '경복궁',
        SUB_STN_LINE: '3',
        SUB_STN_X: '126.97',
        SUB_STN_Y: '37.57',
        SUB_DETAIL: [{ SUB_LINE: '3호선', SUB_DIR: '상행', SUB_TERMINAL: '구파발', SUB_ARMG1: '4분 후', SUB_ARVINFO: '운행중' }],
      },
    ],
  },
}, { name: '광화문·덕수궁', category: '고궁·문화유산' });

assert.equal(snapshot.weather.temperature, 24.5);
assert.equal(snapshot.air.pm10, 32);
assert.equal(snapshot.consumption.level, '바쁜');
assert.equal(snapshot.bikes[0].parked, 1);
assert.equal(snapshot.parking[0].available, 14);
assert.equal(snapshot.subway[0].arrivals[0].terminal, '구파발');
assert.ok(snapshot.center.lat > 37);

const ranked = N.sortPopulationRanking([
  { name: '여유존', congestionRank: 0, max: 40000 },
  { name: '붐빔존', congestionRank: 3, max: 20000 },
  { name: '더붐빔', congestionRank: 3, max: 50000 },
]);
assert.deepEqual(ranked.map((r) => r.name), ['더붐빔', '붐빔존', '여유존']);

assert.equal(N.TOOLS.some((t) => t.name === 'get_population_ranking'), true);
assert.equal(api.__test.SAMPLE_PLACE, '광화문·덕수궁');
assert.equal(api.__test.limitTop('3', 12), 3);
assert.equal(api.__test.limitTop('99', 12), 20);
assert.equal(api.__test.parseAction('get_weather'), 'get_weather');

console.log('ok');
