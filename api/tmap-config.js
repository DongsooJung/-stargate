module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET 요청만 지원합니다.' });
  }

  const appKey = process.env.TMAP_JS_APP_KEY;
  if (!appKey) {
    return res.status(503).json({ error: 'TMAP 지도 연동이 아직 설정되지 않았습니다.' });
  }

  return res.status(200).json({ appKey });
};
