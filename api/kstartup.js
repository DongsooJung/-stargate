/**
 * 창업진흥원 K-Startup 조회서비스 → Supabase 프록시
 *
 * GET  /api/kstartup            최근 저장·로그
 * POST /api/kstartup            100건 조회 후 upsert
 * GET  /api/kstartup?action=collect  동일 (cron/수동 수집)
 *
 * dataset: 15125364
 * 공식: https://apis.data.go.kr/B552735/kisedKstartupService01
 * 폴백: https://nidapi.k-startup.go.kr/api/kisedKstartupService/v1
 */

const SUPABASE_FALLBACK_URL = 'https://inftexpcnfinglwlrvsj.supabase.co';
const SUPABASE_FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZnRleHBjbmZpbmdsd2xydnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTMyMzgsImV4cCI6MjA4ODQ4OTIzOH0.HONuULp0L3B5T0gTiwJMnowjJonJzzNHhUV_LtpDQoI';
const STORED_SERVICE_KEY =
  'fcc95a3d84cbb220391765c9ba129573f32b5e86bfc746483e0e96a806b35c9c';

const OFFICIAL_BASE = 'https://apis.data.go.kr/B552735/kisedKstartupService01';
const NIDAPI_BASE = 'https://nidapi.k-startup.go.kr/api/kisedKstartupService/v1';
const PAGE_SIZE = 100;
const PCT_ENCODED = /%[0-9A-Fa-f]{2}/;
const LOG_TABLE = 'kstartup_fetch_logs';

const RESOURCES = {
  announcements: {
    table: 'kstartup_announcements',
    conflict: 'pbanc_sn',
    officialPath: 'getAnnouncementInformation01',
    nidapiPath: 'getAnnouncementInformation',
    filterFields: [
      'intg_pbanc_yn',
      'intg_pbanc_biz_nm',
      'biz_pbanc_nm',
      'supt_biz_clsfc',
      'aply_trgt_ctnt',
      'supt_regin',
      'pbanc_rcpt_bgng_dt',
      'pbanc_rcpt_end_dt',
      'aply_trgt',
      'biz_enyy',
      'biz_trgt_age',
      'prfn_matr',
      'rcrt_prgs_yn',
    ],
    condOps: {
      intg_pbanc_yn: 'EQ',
      intg_pbanc_biz_nm: 'LIKE',
      biz_pbanc_nm: 'LIKE',
      supt_biz_clsfc: 'LIKE',
      aply_trgt_ctnt: 'LIKE',
      supt_regin: 'LIKE',
      pbanc_rcpt_bgng_dt: 'GTE',
      pbanc_rcpt_end_dt: 'LTE',
      aply_trgt: 'LIKE',
      biz_enyy: 'LIKE',
      biz_trgt_age: 'LIKE',
      prfn_matr: 'LIKE',
      rcrt_prgs_yn: 'EQ',
    },
  },
  business: {
    table: 'kstartup_business',
    conflict: 'biz_key',
    officialPath: 'getBusinessInformation01',
    nidapiPath: 'getBusinessInformation',
    filterFields: ['biz_category_cd', 'supt_biz_titl_nm', 'biz_yr'],
    condOps: {
      biz_category_cd: 'EQ',
      supt_biz_titl_nm: 'LIKE',
      biz_yr: 'EQ',
    },
  },
  contents: {
    table: 'kstartup_contents',
    conflict: 'content_key',
    officialPath: 'getContentInformation01',
    nidapiPath: 'getContentInformation',
    filterFields: ['clss_cd', 'titl_nm'],
    condOps: {
      clss_cd: 'EQ',
      titl_nm: 'LIKE',
    },
  },
  statistics: {
    table: 'kstartup_statistics',
    conflict: 'stats_key',
    officialPath: 'getStatisticalInformation01',
    nidapiPath: 'getStatisticalInformation',
    filterFields: ['titl_nm', 'file_nm'],
    condOps: {
      titl_nm: 'LIKE',
      file_nm: 'LIKE',
    },
  },
};

const ALLOWED_ORIGINS = new Set([
  'https://www.stargateedu.co.kr',
  'https://stargateedu.co.kr',
  'https://dongsoojung.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

function setCors(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader(
    'access-control-allow-origin',
    ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.stargateedu.co.kr',
  );
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('vary', 'origin');
}

function supabaseConfig() {
  const key = String(
    process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      SUPABASE_FALLBACK_KEY ||
      '',
  ).trim();
  if (!key) return null;
  return {
    url: String(process.env.SUPABASE_URL || SUPABASE_FALLBACK_URL)
      .trim()
      .replace(/\/$/, ''),
    key,
  };
}

function encodeServiceKey(apiKey) {
  return PCT_ENCODED.test(apiKey) ? apiKey : encodeURIComponent(apiKey);
}

function resolveServiceKey(bodyKey) {
  const key = String(
    process.env.DATA_GO_KR_API_KEY || bodyKey || STORED_SERVICE_KEY || '',
  ).trim();
  if (!key) {
    throw new Error(
      'DATA_GO_KR_API_KEY가 서버에 없습니다. Vercel 환경변수 또는 요청 apiKey를 확인하세요.',
    );
  }
  return key;
}

function pick(row, ...keys) {
  for (const key of keys) {
    if (row?.[key] != null && String(row[key]).trim() !== '') return String(row[key]).trim();
  }
  return '';
}

function asInt(value, fallback = 0) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replaceAll('&#40;', '(')
    .replaceAll('&#41;', ')')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function hashKey(parts) {
  const raw = parts.map((p) => String(p || '').trim()).join('|');
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `h${(h >>> 0).toString(16)}`;
}

function normalizeAnnouncement(row, pageNo) {
  if (!row || typeof row !== 'object') return null;
  const pbancSn = pick(row, 'pbanc_sn', 'pbancSn', 'id');
  const title = decodeHtmlEntities(pick(row, 'biz_pbanc_nm', 'bizPbancNm', 'intg_pbanc_biz_nm'));
  if (!pbancSn && !title) return null;
  return {
    pbanc_sn: pbancSn || hashKey([title, pick(row, 'pbanc_rcpt_bgng_dt'), pick(row, 'pbanc_ntrp_nm')]),
    biz_pbanc_nm: title,
    intg_pbanc_biz_nm: decodeHtmlEntities(pick(row, 'intg_pbanc_biz_nm')),
    intg_pbanc_yn: pick(row, 'intg_pbanc_yn'),
    rcrt_prgs_yn: pick(row, 'rcrt_prgs_yn') || 'Y',
    supt_biz_clsfc: pick(row, 'supt_biz_clsfc'),
    supt_regin: pick(row, 'supt_regin'),
    aply_trgt: pick(row, 'aply_trgt'),
    aply_trgt_ctnt: pick(row, 'aply_trgt_ctnt'),
    biz_enyy: pick(row, 'biz_enyy'),
    biz_trgt_age: pick(row, 'biz_trgt_age'),
    prfn_matr: pick(row, 'prfn_matr'),
    pbanc_ctnt: pick(row, 'pbanc_ctnt'),
    pbanc_rcpt_bgng_dt: pick(row, 'pbanc_rcpt_bgng_dt'),
    pbanc_rcpt_end_dt: pick(row, 'pbanc_rcpt_end_dt'),
    pbanc_ntrp_nm: pick(row, 'pbanc_ntrp_nm'),
    sprv_inst: pick(row, 'sprv_inst'),
    biz_prch_dprt_nm: pick(row, 'biz_prch_dprt_nm'),
    prch_cnpl_no: pick(row, 'prch_cnpl_no'),
    biz_gdnc_url: pick(row, 'biz_gdnc_url'),
    biz_aply_url: pick(row, 'biz_aply_url'),
    detl_pg_url: pick(row, 'detl_pg_url'),
    aply_excl_trgt_ctnt: pick(row, 'aply_excl_trgt_ctnt'),
    page_no: pageNo,
    raw: row,
    fetched_at: new Date().toISOString(),
  };
}

function normalizeBusiness(row, pageNo) {
  if (!row || typeof row !== 'object') return null;
  const title = decodeHtmlEntities(pick(row, 'supt_biz_titl_nm'));
  const year = pick(row, 'biz_yr');
  const category = pick(row, 'biz_category_cd');
  if (!title && !pick(row, 'id')) return null;
  const bizKey =
    pick(row, 'id') ||
    hashKey([year, category, title, pick(row, 'detl_pg_url')]);
  return {
    biz_key: bizKey,
    biz_yr: year,
    biz_category_cd: category,
    supt_biz_titl_nm: title,
    biz_supt_trgt_info: pick(row, 'biz_supt_trgt_info'),
    biz_supt_bdgt_info: pick(row, 'biz_supt_bdgt_info'),
    biz_supt_ctnt: pick(row, 'biz_supt_ctnt'),
    supt_biz_chrct: pick(row, 'supt_biz_chrct'),
    supt_biz_intrd_info: pick(row, 'supt_biz_intrd_info'),
    detl_pg_url: pick(row, 'detl_pg_url'),
    page_no: pageNo,
    raw: row,
    fetched_at: new Date().toISOString(),
  };
}

function normalizeContent(row, pageNo) {
  if (!row || typeof row !== 'object') return null;
  const title = pick(row, 'titl_nm');
  if (!title && !pick(row, 'detl_pg_url')) return null;
  const contentKey = hashKey([
    pick(row, 'clss_cd'),
    title,
    pick(row, 'fstm_reg_dt'),
    pick(row, 'detl_pg_url'),
  ]);
  return {
    content_key: contentKey,
    titl_nm: title,
    clss_cd: pick(row, 'clss_cd'),
    file_nm: pick(row, 'file_nm'),
    view_cnt: asInt(pick(row, 'view_cnt'), 0),
    fstm_reg_dt: pick(row, 'fstm_reg_dt'),
    detl_pg_url: pick(row, 'detl_pg_url'),
    page_no: pageNo,
    raw: row,
    fetched_at: new Date().toISOString(),
  };
}

function normalizeStatistics(row, pageNo) {
  if (!row || typeof row !== 'object') return null;
  const title = pick(row, 'titl_nm');
  if (!title && !pick(row, 'file_nm')) return null;
  const statsKey = hashKey([title, pick(row, 'file_nm'), pick(row, 'fstm_reg_dt')]);
  return {
    stats_key: statsKey,
    titl_nm: title,
    file_nm: pick(row, 'file_nm'),
    ctnt: pick(row, 'ctnt'),
    fstm_reg_dt: pick(row, 'fstm_reg_dt'),
    last_mdfcn_dt: pick(row, 'last_mdfcn_dt'),
    detl_pg_url: pick(row, 'detl_pg_url'),
    page_no: pageNo,
    raw: row,
    fetched_at: new Date().toISOString(),
  };
}

function normalizeItem(resource, row, pageNo) {
  if (resource === 'announcements') return normalizeAnnouncement(row, pageNo);
  if (resource === 'business') return normalizeBusiness(row, pageNo);
  if (resource === 'contents') return normalizeContent(row, pageNo);
  if (resource === 'statistics') return normalizeStatistics(row, pageNo);
  return null;
}

function buildQueryParams(resource, body, pageNo, pageSize) {
  const cfg = RESOURCES[resource];
  const params = {
    page: String(pageNo),
    perPage: String(pageSize),
    returnType: 'json',
  };
  for (const field of cfg.filterFields) {
    const value = body?.[field];
    if (value == null || String(value).trim() === '') continue;
    params[field] = String(value).trim();
  }
  return params;
}

function buildOfficialUrl(resource, params, apiKey) {
  const cfg = RESOURCES[resource];
  const query = new URLSearchParams();
  query.set('page', params.page);
  query.set('perPage', params.perPage);
  query.set('returnType', params.returnType || 'json');
  for (const field of cfg.filterFields) {
    if (!params[field]) continue;
    const op = cfg.condOps[field] || 'LIKE';
    query.set(`cond[${field}::${op}]`, params[field]);
  }
  const keyPart = `serviceKey=${encodeServiceKey(apiKey)}`;
  return `${OFFICIAL_BASE}/${cfg.officialPath}?${keyPart}&${query.toString()}`;
}

function buildNidapiUrl(resource, params, apiKey) {
  const cfg = RESOURCES[resource];
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value == null || value === '') continue;
    query.set(key, String(value));
  }
  query.set('serviceKey', apiKey);
  return `${NIDAPI_BASE}/${cfg.nidapiPath}?${query.toString()}`;
}

function extractItems(payload) {
  if (!payload) return { items: [], totalCount: 0 };
  if (Array.isArray(payload?.data)) {
    return {
      items: payload.data,
      totalCount: asInt(payload.totalCount, payload.data.length),
      currentCount: asInt(payload.currentCount, payload.data.length),
    };
  }
  if (Array.isArray(payload?.data?.data)) {
    return {
      items: payload.data.data,
      totalCount: asInt(payload.totalCount, payload.data.data.length),
      currentCount: asInt(payload.currentCount, payload.data.data.length),
    };
  }
  const body = payload?.response?.body || payload?.body || payload;
  let raw = body?.items ?? body?.item ?? body?.data ?? [];
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) raw = raw.item ?? [raw];
  if (!Array.isArray(raw)) raw = [];
  return {
    items: raw,
    totalCount: asInt(body?.totalCount ?? payload?.totalCount, raw.length),
    currentCount: raw.length,
  };
}

async function fetchUpstream(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, text/xml, */*',
      'User-Agent': 'stargate-kstartup/1.0',
    },
  });
  const text = await response.text();
  return { response, text };
}

function parsePayload(text) {
  const stripped = String(text || '').trim();
  if (!stripped) throw new Error('빈 응답을 받았습니다.');
  if (/^forbidden$/i.test(stripped)) {
    throw new Error(
      'K-Startup API 403 Forbidden. 「창업진흥원_K-Startup 조회서비스」(15125364) 활용신청·승인 여부를 확인하세요.',
    );
  }
  if (stripped.startsWith('<')) {
    const code = (stripped.match(/<(?:returnReasonCode|resultCode|resultCode)>([^<]+)</i) || [])[1] || '';
    const msg = (stripped.match(/<(?:returnAuthMsg|resultMsg|errMsg)>([^<]+)</i) || [])[1] || code;
    if (code && !['00', '000', '0'].includes(code.trim())) {
      throw new Error(`[${code}] ${msg}`);
    }
    throw new Error(`XML 응답은 지원하지 않습니다. returnType=json 으로 요청하세요. (${msg || stripped.slice(0, 120)})`);
  }
  try {
    return JSON.parse(stripped);
  } catch (error) {
    throw new Error(`응답 파싱 실패: ${error.message}. 원문: ${stripped.slice(0, 180)}`);
  }
}

async function fetchKstartupPage({ resource, apiKey, pageNo, pageSize, filters }) {
  const params = buildQueryParams(resource, filters, pageNo, pageSize);
  const attempts = [
    { source: 'official', url: buildOfficialUrl(resource, params, apiKey) },
    { source: 'nidapi', url: buildNidapiUrl(resource, params, apiKey) },
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const { response, text } = await fetchUpstream(attempt.url);
      if (response.status === 403 || /^forbidden$/i.test(text.trim())) {
        lastError = new Error(`403 from ${attempt.source}`);
        continue;
      }
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} from ${attempt.source}: ${text.slice(0, 160)}`);
        continue;
      }
      const payload = parsePayload(text);
      const extracted = extractItems(payload);
      const normalized = extracted.items
        .map((row) => normalizeItem(resource, row, pageNo))
        .filter(Boolean);
      return {
        items: normalized,
        totalCount: extracted.totalCount || normalized.length,
        params,
        source: attempt.source,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError || new Error('K-Startup upstream 호출 실패');
}

async function upsertRows(config, resource, rows) {
  if (!rows.length) return { saved: 0 };
  const cfg = RESOURCES[resource];
  const response = await fetch(
    `${config.url}/rest/v1/${cfg.table}?on_conflict=${cfg.conflict}`,
    {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`supabase_upsert_${response.status}: ${detail.slice(0, 240)}`);
  }
  return { saved: rows.length };
}

async function insertLog(config, row) {
  if (!config) return null;
  const response = await fetch(`${config.url}/rest/v1/${LOG_TABLE}`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

async function listSaved(config, resource, limit = 100) {
  if (!config) return [];
  const table = RESOURCES[resource]?.table;
  if (!table) return [];
  const response = await fetch(
    `${config.url}/rest/v1/${table}?select=*&order=fetched_at.desc&limit=${limit}`,
    {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: 'application/json',
      },
    },
  );
  if (!response.ok) return [];
  return response.json();
}

async function listLogs(config, limit = 20, resource = '') {
  if (!config) return [];
  const filter = resource ? `&resource=eq.${encodeURIComponent(resource)}` : '';
  const response = await fetch(
    `${config.url}/rest/v1/${LOG_TABLE}?select=*&order=fetched_at.desc&limit=${limit}${filter}`,
    {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: 'application/json',
      },
    },
  );
  if (!response.ok) return [];
  return response.json();
}

function resolveResource(value) {
  const key = String(value || 'announcements').trim();
  if (!RESOURCES[key]) {
    throw new Error(`지원하지 않는 resource: ${key}`);
  }
  return key;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const config = supabaseConfig();
    const wantsCollect =
      req.method === 'GET' && String(req.query?.action || '') === 'collect';

    if (req.method === 'GET' && !wantsCollect) {
      const resource = resolveResource(req.query?.resource || 'announcements');
      return res.status(200).json({
        ok: true,
        pageSize: PAGE_SIZE,
        resource,
        api: 'kisedKstartupService01',
        dataset: '15125364',
        supabaseConfigured: Boolean(config),
        dataGoKrConfigured: Boolean(
          (process.env.DATA_GO_KR_API_KEY || STORED_SERVICE_KEY || '').trim(),
        ),
        saved: await listSaved(config, resource, Number(req.query?.limit) || 100),
        logs: await listLogs(config, Number(req.query?.logLimit) || 20, resource),
      });
    }

    if (req.method !== 'POST' && !wantsCollect) {
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    let body = wantsCollect ? req.query || {} : req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (_) {
        body = {};
      }
    }

    const resource = resolveResource(body.resource || req.query?.resource);
    const pageNo = Math.max(1, Number(body.pageNo) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(body.pageSize) || PAGE_SIZE));
    const saveToSupabase = body.saveToSupabase !== false;
    const apiKey = resolveServiceKey(body.apiKey);

    const result = await fetchKstartupPage({
      resource,
      apiKey,
      pageNo,
      pageSize,
      filters: body,
    });

    let saved = 0;
    let log = null;
    if (saveToSupabase) {
      if (!config) throw new Error('SUPABASE_SERVICE_KEY(또는 ANON_KEY)가 없습니다.');
      saved = (await upsertRows(config, resource, result.items)).saved;
      log = await insertLog(config, {
        resource,
        page_no: pageNo,
        page_size: pageSize,
        row_count: result.items.length,
        total_count: result.totalCount,
        params: result.params,
        status: 'ok',
        fetched_at: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      ok: true,
      resource,
      pageNo,
      pageSize,
      rowCount: result.items.length,
      totalCount: result.totalCount,
      source: result.source,
      savedToSupabase: Boolean(saveToSupabase && config),
      saved,
      logId: log?.id || null,
      params: result.params,
      items: result.items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'kstartup_fetch_failed';
    const config = supabaseConfig();
    if (config) {
      try {
        await insertLog(config, {
          resource: String(req.body?.resource || req.query?.resource || 'announcements'),
          page_no: Number(req.body?.pageNo) || 1,
          page_size: Number(req.body?.pageSize) || PAGE_SIZE,
          row_count: 0,
          total_count: 0,
          params: req.body || {},
          status: 'error',
          error_message: message.slice(0, 500),
          fetched_at: new Date().toISOString(),
        });
      } catch (_) {
        /* ignore */
      }
    }
    return res.status(502).json({ ok: false, error: message });
  }
}

export const __test = {
  normalizeAnnouncement,
  normalizeBusiness,
  normalizeContent,
  normalizeStatistics,
  buildOfficialUrl,
  buildNidapiUrl,
  extractItems,
  encodeServiceKey,
  PAGE_SIZE,
  RESOURCES,
};
