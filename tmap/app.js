(function () {
  const form = document.getElementById('routeForm');
  const button = document.getElementById('routeButton');
  const errorBox = document.getElementById('errorBox');
  const mapMessage = document.getElementById('mapMessage');
  const apiStatus = document.getElementById('apiStatus');
  let map = null;
  let overlays = [];

  boot();
  form.addEventListener('submit', requestRoute);

  async function boot() {
    try {
      const response = await fetch('../api/tmap-config');
      const config = await response.json();
      if (!response.ok || !config.appKey) throw new Error(config.error || '지도 키가 없습니다.');
      await loadMapScript(config.appKey);
      map = new window.Tmapv2.Map('map', {
        center: new window.Tmapv2.LatLng(37.43, 126.88),
        width: '100%',
        height: '560px',
        zoom: 10,
        zoomControl: true,
        scrollwheel: true,
      });
      mapMessage.classList.add('hidden');
      apiStatus.textContent = 'TMAP 연결 준비';
      apiStatus.classList.remove('off');
    } catch (error) {
      mapMessage.textContent = error.message || 'TMAP 지도를 불러오지 못했습니다.';
      apiStatus.textContent = '환경변수 필요';
    }
  }

  function loadMapScript(appKey) {
    return new Promise((resolve, reject) => {
      if (window.Tmapv2) return resolve();
      const script = document.createElement('script');
      script.src = `https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${encodeURIComponent(appKey)}`;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('TMAP 지도 SDK를 불러오지 못했습니다.'));
      document.head.appendChild(script);
    });
  }

  async function requestRoute(event) {
    event.preventDefault();
    setBusy(true);
    showError('');
    const start = readPoint('start');
    const end = readPoint('end');

    try {
      const response = await fetch('../api/tmap-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start,
          end,
          searchOption: document.getElementById('searchOption').value,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '경로 계산에 실패했습니다.');
      renderMetrics(result.summary);
      renderMap(start, end, result.path || []);
      apiStatus.textContent = '실시간 분석 완료';
      apiStatus.classList.remove('off');
    } catch (error) {
      showError(error.message || '경로 계산 중 오류가 발생했습니다.');
      apiStatus.textContent = '경로 요청 실패';
      apiStatus.classList.add('off');
    } finally {
      setBusy(false);
    }
  }

  function readPoint(prefix) {
    return {
      name: document.getElementById(prefix + 'Name').value.trim(),
      lat: Number(document.getElementById(prefix + 'Lat').value),
      lon: Number(document.getElementById(prefix + 'Lon').value),
    };
  }

  function renderMetrics(summary) {
    document.getElementById('timeValue').textContent = `${Math.round((summary.totalTimeSeconds || 0) / 60).toLocaleString('ko-KR')}분`;
    document.getElementById('distanceValue').textContent = `${((summary.totalDistanceMeters || 0) / 1000).toFixed(1)}km`;
    document.getElementById('fareValue').textContent = `${Number(summary.totalFareWon || 0).toLocaleString('ko-KR')}원`;
    document.getElementById('taxiValue').textContent = `${Number(summary.taxiFareWon || 0).toLocaleString('ko-KR')}원`;
  }

  function renderMap(start, end, coordinates) {
    if (!map || !window.Tmapv2 || !coordinates.length) return;
    overlays.forEach((overlay) => overlay.setMap(null));
    const bounds = new window.Tmapv2.LatLngBounds();
    const path = coordinates.map(([lon, lat]) => {
      const point = new window.Tmapv2.LatLng(lat, lon);
      bounds.extend(point);
      return point;
    });
    const line = new window.Tmapv2.Polyline({ path, strokeColor: '#4f8fff', strokeWeight: 6, map });
    const startMarker = new window.Tmapv2.Marker({ position: new window.Tmapv2.LatLng(start.lat, start.lon), map });
    const endMarker = new window.Tmapv2.Marker({ position: new window.Tmapv2.LatLng(end.lat, end.lon), map });
    overlays = [line, startMarker, endMarker];
    map.fitBounds(bounds);
  }

  function setBusy(busy) {
    button.disabled = busy;
    button.textContent = busy ? '계산 중…' : '실시간 경로 분석';
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.toggle('show', Boolean(message));
  }
})();
