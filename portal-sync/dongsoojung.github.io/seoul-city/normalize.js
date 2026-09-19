/**
 * 서울 실시간 도시데이터(citydata / citydata_ppltn) 응답 정규화.
 * Node(Vercel 프록시)와 브라우저 대시보드가 같이 쓴다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SeoulCityNormalize = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CONGEST_ORDER = { 여유: 0, 보통: 1, '약간 붐빔': 2, 붐빔: 3 };
  const AGE_KEYS = [
    ['0', '10세 미만'],
    ['10', '10대'],
    ['20', '20대'],
    ['30', '30대'],
    ['40', '40대'],
    ['50', '50대'],
    ['60', '60대'],
    ['70', '70대+'],
  ];

  function asNumber(value) {
    if (value == null || value === '') return null;
    const n = Number(String(value).replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function asText(value) {
    if (value == null) return '';
    return String(value).trim();
  }

  function first(value) {
    if (Array.isArray(value)) return value[0] || null;
    if (value && typeof value === 'object') return value;
    return null;
  }

  function asList(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return [value];
    return [];
  }

  function congestRank(level) {
    return CONGEST_ORDER[asText(level)] ?? -1;
  }

  function normalizePopulation(raw) {
    const row = first(raw);
    if (!row) return null;
    const ages = AGE_KEYS.map(([key, label]) => ({
      key,
      label,
      rate: asNumber(row['PPLTN_RATE_' + key]),
    }));
    const forecast = asList(row.FCST_PPLTN).map((item) => ({
      time: asText(item.FCST_TIME),
      congestion: asText(item.FCST_CONGEST_LVL),
      min: asNumber(item.FCST_PPLTN_MIN),
      max: asNumber(item.FCST_PPLTN_MAX),
    }));
    return {
      name: asText(row.AREA_NM),
      code: asText(row.AREA_CD),
      congestion: asText(row.AREA_CONGEST_LVL),
      congestionRank: congestRank(row.AREA_CONGEST_LVL),
      message: asText(row.AREA_CONGEST_MSG),
      min: asNumber(row.AREA_PPLTN_MIN),
      max: asNumber(row.AREA_PPLTN_MAX),
      maleRate: asNumber(row.MALE_PPLTN_RATE),
      femaleRate: asNumber(row.FEMALE_PPLTN_RATE),
      residentRate: asNumber(row.RESNT_PPLTN_RATE),
      nonResidentRate: asNumber(row.NON_RESNT_PPLTN_RATE),
      observedAt: asText(row.PPLTN_TIME),
      ages,
      forecast,
    };
  }

  function normalizeWeather(raw) {
    const row = first(raw);
    if (!row) return null;
    return {
      observedAt: asText(row.WEATHER_TIME),
      temperature: asNumber(row.TEMP),
      maxTemperature: asNumber(row.MAX_TEMP),
      minTemperature: asNumber(row.MIN_TEMP),
      humidity: asNumber(row.HUMIDITY),
      windSpeed: asNumber(row.WIND_SPD),
      windDirection: asText(row.WIND_DIRCT),
      precipitation: asText(row.PRECIPITATION),
      precipitationType: asText(row.PRECPT_TYPE),
      precipitationMessage: asText(row.PCP_MSG),
      sunrise: asText(row.SUNRISE),
      sunset: asText(row.SUNSET),
      uvIndex: asText(row.UV_INDEX),
      uvLevel: asNumber(row.UV_INDEX_LVL),
      uvMessage: asText(row.UV_MSG),
    };
  }

  function normalizeAir(raw) {
    const row = first(raw);
    if (!row) return null;
    return {
      index: asText(row.AIR_IDX),
      value: asNumber(row.AIR_IDX_MVL),
      main: asText(row.AIR_IDX_MAIN),
      message: asText(row.AIR_MSG),
      pm10: asNumber(row.PM10),
      pm10Index: asText(row.PM10_INDEX),
      pm25: asNumber(row.PM25),
      pm25Index: asText(row.PM25_INDEX),
    };
  }

  function normalizeConsumption(raw) {
    const row = first(raw);
    if (!row) return null;
    const categories = asList(row.CMRCL_RSB).map((item) => ({
      large: asText(item.RSB_LRG_CTGR),
      mid: asText(item.RSB_MID_CTGR),
      level: asText(item.RSB_PAYMENT_LVL),
      count: asNumber(item.RSB_SH_PAYMENT_CNT),
      amountMin: asNumber(item.RSB_SH_PAYMENT_AMT_MIN),
      amountMax: asNumber(item.RSB_SH_PAYMENT_AMT_MAX),
      stores: asNumber(item.RSB_MCT_CNT),
    }));
    return {
      level: asText(row.AREA_CMRCL_LVL),
      paymentCount: asNumber(row.AREA_SH_PAYMENT_CNT),
      amountMin: asNumber(row.AREA_SH_PAYMENT_AMT_MIN),
      amountMax: asNumber(row.AREA_SH_PAYMENT_AMT_MAX),
      maleRate: asNumber(row.CMRCL_MALE_RATE),
      femaleRate: asNumber(row.CMRCL_FEMALE_RATE),
      observedAt: asText(row.CMRCL_TIME),
      categories,
    };
  }

  function normalizeTraffic(raw) {
    const row = first(raw);
    if (!row) return null;
    const avg = first(row.AVG_ROAD_DATA) || row.AVG_ROAD_DATA || {};
    const links = asList(row.ROAD_TRAFFIC_STTS).slice(0, 12).map((item) => ({
      name: asText(item.ROAD_NM),
      from: asText(item.START_ND_NM),
      to: asText(item.END_ND_NM),
      speed: asNumber(item.SPD),
      index: asText(item.IDX),
    }));
    return {
      index: asText(avg.ROAD_TRAFFIC_IDX || row.ROAD_TRAFFIC_IDX),
      speed: asNumber(avg.ROAD_TRAFFIC_SPD || row.ROAD_TRAFFIC_SPD),
      message: asText(avg.ROAD_MSG || row.ROAD_MSG),
      observedAt: asText(avg.ROAD_TRAFFIC_TIME || row.ROAD_TRAFFIC_TIME),
      links,
    };
  }

  function normalizeBikes(raw) {
    return asList(raw).map((item) => ({
      id: asText(item.SBIKE_SPOT_ID),
      name: asText(item.SBIKE_SPOT_NM),
      parked: asNumber(item.SBIKE_PARKING_CNT),
      racks: asNumber(item.SBIKE_RACK_CNT),
      shared: asNumber(item.SBIKE_SHARED),
      lon: asNumber(item.SBIKE_X),
      lat: asNumber(item.SBIKE_Y),
    }));
  }

  function normalizeParking(raw) {
    return asList(raw).map((item) => {
      const capacity = asNumber(item.CPCTY);
      const current = asNumber(item.CUR_PRK_CNT);
      return {
        id: asText(item.PRK_CD),
        name: asText(item.PRK_NM),
        type: asText(item.PRK_TYPE),
        capacity,
        current,
        available:
          capacity != null && current != null ? Math.max(0, capacity - current) : null,
        live: asText(item.CUR_PRK_YN) === 'Y',
        pay: asText(item.PAY_YN) === 'Y',
        address: asText(item.ROAD_ADDR || item.ADDRESS),
        lon: asNumber(item.LNG),
        lat: asNumber(item.LAT),
      };
    });
  }

  function normalizeSubway(raw) {
    return asList(raw).map((item) => ({
      name: asText(item.SUB_STN_NM),
      line: asText(item.SUB_STN_LINE),
      address: asText(item.SUB_STN_RADDR),
      lon: asNumber(item.SUB_STN_X),
      lat: asNumber(item.SUB_STN_Y),
      arrivals: asList(item.SUB_DETAIL)
        .slice(0, 6)
        .map((detail) => ({
          line: asText(detail.SUB_LINE),
          direction: asText(detail.SUB_DIR),
          terminal: asText(detail.SUB_TERMINAL),
          message: asText(detail.SUB_ARMG1),
          status: asText(detail.SUB_ARVINFO),
        })),
    }));
  }

  function centroid(points) {
    const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    if (!valid.length) return null;
    return {
      lat: valid.reduce((sum, p) => sum + p.lat, 0) / valid.length,
      lon: valid.reduce((sum, p) => sum + p.lon, 0) / valid.length,
    };
  }

  function extractCitydata(payload) {
    if (!payload || typeof payload !== 'object') return {};
    return payload.CITYDATA || payload.citydata || payload;
  }

  function extractPopulationPayload(payload) {
    if (!payload || typeof payload !== 'object') return null;
    return (
      payload['SeoulRtd.citydata_ppltn'] ||
      payload.citydata_ppltn ||
      extractCitydata(payload).LIVE_PPLTN_STTS ||
      payload
    );
  }

  function resultCode(payload) {
    const result = payload && payload.RESULT;
    return asText(result && (result['RESULT.CODE'] || result.CODE));
  }

  function normalizeSnapshot(payload, placeMeta) {
    const city = extractCitydata(payload);
    const population = normalizePopulation(city.LIVE_PPLTN_STTS || extractPopulationPayload(payload));
    const weatherSource = city.WEATHER_STTS;
    const bikes = normalizeBikes(city.SBIKE_STTS);
    const parking = normalizeParking(city.PRK_STTS);
    const subway = normalizeSubway(city.SUB_STTS);
    return {
      place: (placeMeta && placeMeta.name) || (population && population.name) || '',
      category: (placeMeta && placeMeta.category) || '',
      code: (population && population.code) || '',
      population,
      prediction: population ? population.forecast : [],
      consumption: normalizeConsumption(city.LIVE_CMRCL_STTS),
      weather: normalizeWeather(weatherSource),
      air: normalizeAir(weatherSource),
      traffic: normalizeTraffic(city.ROAD_TRAFFIC_STTS),
      bikes,
      parking,
      subway,
      center: centroid([...bikes, ...parking, ...subway]),
      source: '서울 열린데이터광장',
    };
  }

  function rankingItem(population, placeMeta) {
    if (!population) return null;
    return {
      name: population.name || (placeMeta && placeMeta.name) || '',
      category: (placeMeta && placeMeta.category) || '',
      congestion: population.congestion,
      congestionRank: population.congestionRank,
      min: population.min,
      max: population.max,
      observedAt: population.observedAt,
    };
  }

  function sortPopulationRanking(items) {
    return items.slice().sort((a, b) => {
      if (b.congestionRank !== a.congestionRank) return b.congestionRank - a.congestionRank;
      return (b.max || 0) - (a.max || 0);
    });
  }

  function sortConsumptionRanking(items) {
    return items.slice().sort((a, b) => (b.amountMax || b.paymentCount || 0) - (a.amountMax || a.paymentCount || 0));
  }

  function resolvePlace(places, query) {
    const q = asText(query);
    if (!q) return null;
    const exact = places.find((p) => p.name === q || p.code === q);
    if (exact) return exact;
    const lower = q.toLowerCase();
    return (
      places.find((p) => p.name.includes(q) || (p.category && p.category.includes(q))) ||
      places.find((p) => p.name.toLowerCase().includes(lower)) ||
      null
    );
  }

  function filterPlaces(places, query) {
    const q = asText(query);
    if (!q) return places.slice();
    return places.filter(
      (p) => p.name.includes(q) || (p.category && p.category.includes(q)) || (p.code && p.code.includes(q))
    );
  }

  const TOOLS = [
    { name: 'list_pois', description: '실시간 도시데이터가 제공되는 서울 주요 장소를 검색합니다.' },
    { name: 'get_population_ranking', description: '장소별 실시간 인구·혼잡 순위를 반환합니다.' },
    { name: 'get_population', description: '한 장소의 실시간 인구·연령·상주/비상주 비율을 조회합니다.' },
    { name: 'get_population_prediction', description: '한 장소의 시간대별 인구 예측을 조회합니다.' },
    { name: 'get_consumption_ranking', description: '실시간 상권(결제) 활황 순위를 반환합니다.' },
    { name: 'get_consumption', description: '한 장소의 상권 결제 건수·업종 분포를 조회합니다.' },
    { name: 'get_weather', description: '한 장소의 기온·습도·강수·자외선 현황을 조회합니다.' },
    { name: 'get_air_quality', description: '한 장소의 대기질·미세먼지 현황을 조회합니다.' },
    { name: 'list_bike_stations', description: '장소 주변 따릉이 대여소 목록을 반환합니다.' },
    { name: 'get_bike_stations', description: '따릉이 대여소의 거치·잔여 대수 현황을 조회합니다.' },
    { name: 'list_subway_stations', description: '장소 주변 지하철역 목록을 반환합니다.' },
    { name: 'get_subway_stations', description: '지하철 실시간 도착 정보를 조회합니다.' },
    { name: 'list_parking_lots', description: '장소 주변 주차장 목록을 반환합니다.' },
    { name: 'get_parking_status', description: '주차장 실시간 주차 현황을 조회합니다.' },
    { name: 'snapshot', description: '한 장소의 인구·상권·날씨·교통 섹션을 한 번에 조회합니다.' },
  ];

  return {
    AGE_KEYS,
    CONGEST_ORDER,
    TOOLS,
    asNumber,
    asText,
    first,
    asList,
    congestRank,
    normalizePopulation,
    normalizeWeather,
    normalizeAir,
    normalizeConsumption,
    normalizeTraffic,
    normalizeBikes,
    normalizeParking,
    normalizeSubway,
    normalizeSnapshot,
    rankingItem,
    sortPopulationRanking,
    sortConsumptionRanking,
    resolvePlace,
    filterPlaces,
    extractCitydata,
    extractPopulationPayload,
    resultCode,
  };
});
