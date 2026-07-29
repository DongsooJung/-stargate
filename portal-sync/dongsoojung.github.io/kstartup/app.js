/**
 * K-Startup 전략 대시보드
 * - 사업공고/사업소개/콘텐츠/통계를 100건씩 조회
 * - 서버 저장 DATA_GO_KR_API_KEY 또는 시드 키 사용
 * - GitHub Pages에서는 stargate-bid-api.vercel.app 프록시 사용
 */
(function () {
  const REMOTE_PROXY_URL = 'https://stargate-bid-api.vercel.app/api/kstartup';
  const SAME_ORIGIN_PROXY_URL = '/api/kstartup';
  const IS_STATIC_HOST =
    /(^|\.)github\.io$/i.test(location.hostname) ||
    /(^|\.)stargateedu\.co\.kr$/i.test(location.hostname);
  const PROXY_URL = IS_STATIC_HOST ? REMOTE_PROXY_URL : SAME_ORIGIN_PROXY_URL;

  const OFFICIAL_BASE = 'https://apis.data.go.kr/B552735/kisedKstartupService01';
  const NIDAPI_BASE = 'https://nidapi.k-startup.go.kr/api/kisedKstartupService/v1';

  const SUPABASE_URL = 'https://inftexpcnfinglwlrvsj.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZnRleHBjbmZpbmdsd2xydnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTMyMzgsImV4cCI6MjA4ODQ4OTIzOH0.HONuULp0L3B5T0gTiwJMnowjJonJzzNHhUV_LtpDQoI';
  const STORED_SERVICE_KEY =
    'fcc95a3d84cbb220391765c9ba129573f32b5e86bfc746483e0e96a806b35c9c';
  const PAGE_SIZE = 100;
  const PCT_ENCODED = /%[0-9A-Fa-f]{2}/;
  const LOG_TABLE = 'kstartup_fetch_logs';

  const RESOURCES = {
    announcements: {
      label: '사업공고',
      table: 'kstartup_announcements',
      conflict: 'pbanc_sn',
      officialPath: 'getAnnouncementInformation01',
      nidapiPath: 'getAnnouncementInformation',
    },
    business: {
      label: '사업소개',
      table: 'kstartup_business',
      conflict: 'biz_key',
      officialPath: 'getBusinessInformation01',
      nidapiPath: 'getBusinessInformation',
    },
    contents: {
      label: '콘텐츠',
      table: 'kstartup_contents',
      conflict: 'content_key',
      officialPath: 'getContentInformation01',
      nidapiPath: 'getContentInformation',
    },
    statistics: {
      label: '통계',
      table: 'kstartup_statistics',
      conflict: 'stats_key',
      officialPath: 'getStatisticalInformation01',
      nidapiPath: 'getStatisticalInformation',
    },
  };

  const els = {
    resource: document.getElementById('resource'),
    rcrt: document.getElementById('rcrtPrgsYn'),
    region: document.getElementById('suptRegin'),
    clsfc: document.getElementById('suptBizClsfc'),
    keyword: document.getElementById('keyword'),
    loadBtn: document.getElementById('loadBtn'),
    saveBtn: document.getElementById('saveBtn'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    csvBtn: document.getElementById('csvBtn'),
    pageLabel: document.getElementById('pageLabel'),
    totalLabel: document.getElementById('totalLabel'),
    liveStatus: document.getElementById('liveStatus'),
    notice: document.getElementById('notice'),
    tbody: document.getElementById('tbody'),
    empty: document.getElementById('empty'),
    kpiCount: document.getElementById('kpiCount'),
    kpiTotal: document.getElementById('kpiTotal'),
    kpiOpen: document.getElementById('kpiOpen'),
    kpiSaved: document.getElementById('kpiSaved'),
    sourceMode: document.getElementById('sourceMode'),
    logList: document.getElementById('logList'),
    viz: document.getElementById('viz'),
    thead: document.getElementById('thead'),
    chartRegion: document.getElementById('chartRegion'),
    chartClsfc: document.getElementById('chartClsfc'),
    chartStatus: document.getElementById('chartStatus'),
    chartDaily: document.getElementById('chartDaily'),
  };

  const state = {
    resource: 'announcements',
    pageNo: 1,
    totalCount: 0,
    items: [],
    lastSaved: 0,
    loading: false,
    filterRegion: '',
    filterClsfc: '',
    charts: { region: null, clsfc: null, status: null, daily: null },
  };

  function encodeServiceKey(apiKey) {
    return PCT_ENCODED.test(apiKey) ? apiKey : encodeURIComponent(apiKey);
  }

  function setStatus(msg, kind = '') {
    els.liveStatus.textContent = msg || '';
    els.liveStatus.dataset.kind = kind;
  }

  function setNotice(msg, kind = '') {
    els.notice.textContent = msg || '';
    els.notice.dataset.kind = kind;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function decodeHtmlEntities(text) {
    return String(text || '')
      .replaceAll('&#40;', '(')
      .replaceAll('&#41;', ')')
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"');
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
    const title = decodeHtmlEntities(pick(row, 'biz_pbanc_nm', 'intg_pbanc_biz_nm'));
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
      raw: row.raw && typeof row.raw === 'object' ? row.raw : row,
      fetched_at: row.fetched_at || new Date().toISOString(),
    };
  }

  function normalizeBusiness(row, pageNo) {
    if (!row || typeof row !== 'object') return null;
    const title = decodeHtmlEntities(pick(row, 'supt_biz_titl_nm'));
    const year = pick(row, 'biz_yr');
    const category = pick(row, 'biz_category_cd');
    if (!title && !pick(row, 'biz_key') && !pick(row, 'id')) return null;
    return {
      biz_key: pick(row, 'biz_key', 'id') || hashKey([year, category, title, pick(row, 'detl_pg_url')]),
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
      raw: row.raw && typeof row.raw === 'object' ? row.raw : row,
      fetched_at: row.fetched_at || new Date().toISOString(),
    };
  }

  function normalizeContent(row, pageNo) {
    if (!row || typeof row !== 'object') return null;
    const title = pick(row, 'titl_nm');
    if (!title && !pick(row, 'content_key') && !pick(row, 'detl_pg_url')) return null;
    return {
      content_key:
        pick(row, 'content_key') ||
        hashKey([pick(row, 'clss_cd'), title, pick(row, 'fstm_reg_dt'), pick(row, 'detl_pg_url')]),
      titl_nm: title,
      clss_cd: pick(row, 'clss_cd'),
      file_nm: pick(row, 'file_nm'),
      view_cnt: asInt(row.view_cnt ?? pick(row, 'view_cnt'), 0),
      fstm_reg_dt: pick(row, 'fstm_reg_dt'),
      detl_pg_url: pick(row, 'detl_pg_url'),
      page_no: pageNo,
      raw: row.raw && typeof row.raw === 'object' ? row.raw : row,
      fetched_at: row.fetched_at || new Date().toISOString(),
    };
  }

  function normalizeStatistics(row, pageNo) {
    if (!row || typeof row !== 'object') return null;
    const title = pick(row, 'titl_nm');
    if (!title && !pick(row, 'stats_key') && !pick(row, 'file_nm')) return null;
    return {
      stats_key:
        pick(row, 'stats_key') || hashKey([title, pick(row, 'file_nm'), pick(row, 'fstm_reg_dt')]),
      titl_nm: title,
      file_nm: pick(row, 'file_nm'),
      ctnt: pick(row, 'ctnt'),
      fstm_reg_dt: pick(row, 'fstm_reg_dt'),
      last_mdfcn_dt: pick(row, 'last_mdfcn_dt'),
      detl_pg_url: pick(row, 'detl_pg_url'),
      page_no: pageNo,
      raw: row.raw && typeof row.raw === 'object' ? row.raw : row,
      fetched_at: row.fetched_at || new Date().toISOString(),
    };
  }

  function normalizeItem(row, pageNo) {
    if (state.resource === 'announcements') return normalizeAnnouncement(row, pageNo);
    if (state.resource === 'business') return normalizeBusiness(row, pageNo);
    if (state.resource === 'contents') return normalizeContent(row, pageNo);
    return normalizeStatistics(row, pageNo);
  }

  function currentFilters() {
    const filters = { resource: state.resource };
    if (state.resource === 'announcements') {
      if (els.rcrt.value) filters.rcrt_prgs_yn = els.rcrt.value;
      if (els.region.value) filters.supt_regin = els.region.value;
      if (els.clsfc.value) filters.supt_biz_clsfc = els.clsfc.value;
      if (els.keyword.value.trim()) filters.biz_pbanc_nm = els.keyword.value.trim();
    } else if (state.resource === 'business') {
      if (els.keyword.value.trim()) filters.supt_biz_titl_nm = els.keyword.value.trim();
    } else if (state.resource === 'contents') {
      if (els.keyword.value.trim()) filters.titl_nm = els.keyword.value.trim();
    } else if (els.keyword.value.trim()) {
      filters.titl_nm = els.keyword.value.trim();
    }
    return filters;
  }

  function totalPages() {
    return Math.max(1, Math.ceil((state.totalCount || 0) / PAGE_SIZE));
  }

  function updatePager() {
    const pages = totalPages();
    els.pageLabel.textContent = `${state.pageNo} / ${state.totalCount ? pages : '—'}`;
    els.totalLabel.textContent = `전체 ${state.totalCount.toLocaleString('ko-KR')}건 · 페이지당 ${PAGE_SIZE}건`;
    els.prevBtn.disabled = state.loading || state.pageNo <= 1;
    els.nextBtn.disabled = state.loading || !state.totalCount || state.pageNo >= pages;
  }

  function filteredItems() {
    const kw = String(els.keyword.value || '').trim().toLowerCase();
    return state.items.filter((row) => {
      if (state.filterRegion && row.supt_regin !== state.filterRegion) return false;
      if (state.filterClsfc && row.supt_biz_clsfc !== state.filterClsfc) return false;
      if (!kw) return true;
      const blob = Object.values(row)
        .filter((v) => typeof v === 'string')
        .join(' ')
        .toLowerCase();
      return blob.includes(kw);
    });
  }

  function countBy(items, keyFn) {
    const map = new Map();
    for (const item of items) {
      const key = keyFn(item) || '미상';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }

  function destroyCharts() {
    Object.keys(state.charts).forEach((k) => {
      if (state.charts[k]) {
        state.charts[k].destroy();
        state.charts[k] = null;
      }
    });
  }

  function renderCharts(items) {
    if (!window.Chart) return;
    destroyCharts();
    const palette = ['#14b8a6', '#38bdf8', '#f59e0b', '#a3e635', '#fb7185', '#818cf8', '#94a3b8'];

    if (state.resource === 'announcements') {
      const regions = countBy(items, (r) => r.supt_regin).slice(0, 8);
      const clsfcs = countBy(items, (r) => r.supt_biz_clsfc).slice(0, 8);
      const statuses = countBy(items, (r) => (r.rcrt_prgs_yn === 'Y' ? '모집중' : '모집마감'));
      const days = countBy(items, (r) => r.pbanc_rcpt_bgng_dt || '미상').slice(0, 12).reverse();

      state.charts.region = new Chart(els.chartRegion, {
        type: 'bar',
        data: {
          labels: regions.map(([k]) => k),
          datasets: [{ data: regions.map(([, v]) => v), backgroundColor: palette[0], borderRadius: 6 }],
        },
        options: chartOpts('지역 TOP'),
      });
      state.charts.clsfc = new Chart(els.chartClsfc, {
        type: 'bar',
        data: {
          labels: clsfcs.map(([k]) => k),
          datasets: [{ data: clsfcs.map(([, v]) => v), backgroundColor: palette[1], borderRadius: 6 }],
        },
        options: chartOpts('지원분야 TOP'),
      });
      state.charts.status = new Chart(els.chartStatus, {
        type: 'doughnut',
        data: {
          labels: statuses.map(([k]) => k),
          datasets: [{ data: statuses.map(([, v]) => v), backgroundColor: [palette[0], palette[4]] }],
        },
        options: {
          plugins: { legend: { position: 'bottom', labels: { color: '#9fb0c0' } } },
          onClick: (_e, elsClick) => {
            if (!elsClick.length) return;
            const label = statuses[elsClick[0].index][0];
            state.filterRegion = '';
            state.filterClsfc = '';
            els.rcrt.value = label === '모집중' ? 'Y' : 'N';
            renderTable(filteredItems());
          },
        },
      });
      state.charts.daily = new Chart(els.chartDaily, {
        type: 'line',
        data: {
          labels: days.map(([k]) => k),
          datasets: [
            {
              data: days.map(([, v]) => v),
              borderColor: palette[2],
              backgroundColor: 'rgba(245,158,11,.15)',
              fill: true,
              tension: 0.35,
            },
          ],
        },
        options: chartOpts('접수시작일'),
      });
    } else if (state.resource === 'business') {
      const years = countBy(items, (r) => r.biz_yr || '미상');
      const cats = countBy(items, (r) => r.biz_category_cd || '미상').slice(0, 8);
      state.charts.region = new Chart(els.chartRegion, {
        type: 'bar',
        data: {
          labels: years.map(([k]) => k),
          datasets: [{ data: years.map(([, v]) => v), backgroundColor: palette[0], borderRadius: 6 }],
        },
        options: chartOpts('사업연도'),
      });
      state.charts.clsfc = new Chart(els.chartClsfc, {
        type: 'bar',
        data: {
          labels: cats.map(([k]) => k),
          datasets: [{ data: cats.map(([, v]) => v), backgroundColor: palette[1], borderRadius: 6 }],
        },
        options: chartOpts('사업구분'),
      });
    } else if (state.resource === 'contents') {
      const clss = countBy(items, (r) => r.clss_cd || '미상');
      state.charts.region = new Chart(els.chartRegion, {
        type: 'doughnut',
        data: {
          labels: clss.map(([k]) => k),
          datasets: [{ data: clss.map(([, v]) => v), backgroundColor: palette }],
        },
        options: { plugins: { legend: { position: 'bottom', labels: { color: '#9fb0c0' } } } },
      });
      const views = [...items].sort((a, b) => (b.view_cnt || 0) - (a.view_cnt || 0)).slice(0, 8);
      state.charts.clsfc = new Chart(els.chartClsfc, {
        type: 'bar',
        data: {
          labels: views.map((r) => (r.titl_nm || '').slice(0, 12)),
          datasets: [{ data: views.map((r) => r.view_cnt || 0), backgroundColor: palette[2], borderRadius: 6 }],
        },
        options: chartOpts('조회수 TOP'),
      });
    } else {
      const files = countBy(items, (r) => (r.file_nm || '파일없음').slice(0, 18));
      state.charts.region = new Chart(els.chartRegion, {
        type: 'bar',
        data: {
          labels: files.map(([k]) => k),
          datasets: [{ data: files.map(([, v]) => v), backgroundColor: palette[0], borderRadius: 6 }],
        },
        options: chartOpts('파일유형'),
      });
    }
  }

  function chartOpts(title) {
    return {
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        title: { display: false, text: title },
      },
      scales: {
        x: { ticks: { color: '#9fb0c0' }, grid: { color: 'rgba(255,255,255,.06)' } },
        y: { ticks: { color: '#9fb0c0' }, grid: { display: false } },
      },
      onClick: (_e, elsClick, chart) => {
        if (!elsClick.length || state.resource !== 'announcements') return;
        const label = chart.data.labels[elsClick[0].index];
        if (chart.canvas === els.chartRegion) {
          state.filterRegion = state.filterRegion === label ? '' : label;
          state.filterClsfc = '';
        } else if (chart.canvas === els.chartClsfc) {
          state.filterClsfc = state.filterClsfc === label ? '' : label;
          state.filterRegion = '';
        }
        renderTable(filteredItems());
      },
    };
  }

  function renderKpis(items) {
    const open = items.filter((x) => x.rcrt_prgs_yn === 'Y').length;
    els.kpiCount.textContent = items.length.toLocaleString('ko-KR');
    els.kpiTotal.textContent = state.totalCount ? state.totalCount.toLocaleString('ko-KR') : '—';
    els.kpiOpen.textContent =
      state.resource === 'announcements' ? open.toLocaleString('ko-KR') : String(state.pageNo);
    els.kpiSaved.textContent = state.lastSaved ? state.lastSaved.toLocaleString('ko-KR') : '0';
  }

  function tableHeaders() {
    if (state.resource === 'announcements') {
      return ['#', '공고명', '지원분야', '지역', '모집', '접수기간', '기관', '상세'];
    }
    if (state.resource === 'business') {
      return ['#', '사업명', '연도', '구분', '지원대상', '예산·규모', '상세'];
    }
    if (state.resource === 'contents') {
      return ['#', '제목', '구분', '조회수', '등록일', '상세'];
    }
    return ['#', '자료명', '파일', '등록일', '수정일', '상세'];
  }

  function renderTable(items) {
    renderKpis(items);
    els.thead.innerHTML = `<tr>${tableHeaders().map((h) => `<th>${h}</th>`).join('')}</tr>`;
    if (!items.length) {
      els.tbody.innerHTML = '';
      els.empty.hidden = false;
      destroyCharts();
      return;
    }
    els.empty.hidden = true;
    const offset = (state.pageNo - 1) * PAGE_SIZE;
    if (state.resource === 'announcements') {
      els.tbody.innerHTML = items
        .map((row, idx) => {
          const link = row.detl_pg_url
            ? `<a href="${escapeHtml(row.detl_pg_url)}" target="_blank" rel="noopener">K-Startup ↗</a>`
            : '—';
          const open = row.rcrt_prgs_yn === 'Y';
          return `<tr>
            <td>${offset + idx + 1}</td>
            <td><strong>${escapeHtml(row.biz_pbanc_nm || '—')}</strong><div class="sub">${escapeHtml(row.pbanc_sn)}</div></td>
            <td>${escapeHtml(row.supt_biz_clsfc || '—')}</td>
            <td>${escapeHtml(row.supt_regin || '—')}</td>
            <td><span class="tag ${open ? 'open' : 'closed'}">${open ? '모집중' : '마감'}</span></td>
            <td>${escapeHtml(row.pbanc_rcpt_bgng_dt || '—')} ~ ${escapeHtml(row.pbanc_rcpt_end_dt || '—')}</td>
            <td>${escapeHtml(row.pbanc_ntrp_nm || row.sprv_inst || '—')}</td>
            <td>${link}</td>
          </tr>`;
        })
        .join('');
    } else if (state.resource === 'business') {
      els.tbody.innerHTML = items
        .map((row, idx) => {
          const link = row.detl_pg_url
            ? `<a href="${escapeHtml(row.detl_pg_url)}" target="_blank" rel="noopener">상세 ↗</a>`
            : '—';
          return `<tr>
            <td>${offset + idx + 1}</td>
            <td><strong>${escapeHtml(row.supt_biz_titl_nm || '—')}</strong></td>
            <td>${escapeHtml(row.biz_yr || '—')}</td>
            <td>${escapeHtml(row.biz_category_cd || '—')}</td>
            <td>${escapeHtml((row.biz_supt_trgt_info || '—').slice(0, 80))}</td>
            <td>${escapeHtml((row.biz_supt_bdgt_info || '—').slice(0, 60))}</td>
            <td>${link}</td>
          </tr>`;
        })
        .join('');
    } else if (state.resource === 'contents') {
      els.tbody.innerHTML = items
        .map((row, idx) => {
          const link = row.detl_pg_url
            ? `<a href="${escapeHtml(row.detl_pg_url)}" target="_blank" rel="noopener">읽기 ↗</a>`
            : '—';
          return `<tr>
            <td>${offset + idx + 1}</td>
            <td><strong>${escapeHtml(row.titl_nm || '—')}</strong></td>
            <td>${escapeHtml(row.clss_cd || '—')}</td>
            <td>${(row.view_cnt || 0).toLocaleString('ko-KR')}</td>
            <td>${escapeHtml(row.fstm_reg_dt || '—')}</td>
            <td>${link}</td>
          </tr>`;
        })
        .join('');
    } else {
      els.tbody.innerHTML = items
        .map((row, idx) => {
          const link = row.detl_pg_url
            ? `<a href="${escapeHtml(row.detl_pg_url)}" target="_blank" rel="noopener">보기 ↗</a>`
            : '—';
          return `<tr>
            <td>${offset + idx + 1}</td>
            <td><strong>${escapeHtml(row.titl_nm || '—')}</strong></td>
            <td>${escapeHtml(row.file_nm || '—')}</td>
            <td>${escapeHtml(row.fstm_reg_dt || '—')}</td>
            <td>${escapeHtml(row.last_mdfcn_dt || '—')}</td>
            <td>${link}</td>
          </tr>`;
        })
        .join('');
    }
    renderCharts(items);
    els.viz.classList.add('ready');
  }

  async function sbFetch(path, options = {}) {
    return fetch(`${SUPABASE_URL}${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
  }

  async function saveToSupabase(items) {
    if (!items.length) return 0;
    const meta = RESOURCES[state.resource];
    const response = await sbFetch(`/rest/v1/${meta.table}?on_conflict=${meta.conflict}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(items),
    });
    if (!response.ok) {
      throw new Error(`supabase_upsert_${response.status}: ${(await response.text()).slice(0, 180)}`);
    }
    await sbFetch(`/rest/v1/${LOG_TABLE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        resource: state.resource,
        page_no: state.pageNo,
        page_size: PAGE_SIZE,
        row_count: items.length,
        total_count: state.totalCount,
        params: currentFilters(),
        status: 'ok',
        fetched_at: new Date().toISOString(),
      }),
    });
    return items.length;
  }

  async function loadLogs() {
    try {
      const response = await sbFetch(
        `/rest/v1/${LOG_TABLE}?select=*&resource=eq.${state.resource}&order=fetched_at.desc&limit=12`,
      );
      if (!response.ok) throw new Error('log_fetch_failed');
      const rows = await response.json();
      if (!rows.length) {
        els.logList.innerHTML = '<li class="muted">아직 수집 로그가 없습니다.</li>';
        return;
      }
      els.logList.innerHTML = rows
        .map((row) => {
          const ok = row.status === 'ok';
          const when = row.fetched_at ? new Date(row.fetched_at).toLocaleString('ko-KR') : '—';
          return `<li>
            <span class="dot ${ok ? 'ok' : 'err'}"></span>
            <div>
              <div>${ok ? '성공' : '실패'} · ${row.row_count || 0}건 · p${row.page_no}</div>
              <small>${when}${row.error_message ? ` · ${escapeHtml(row.error_message)}` : ''}</small>
            </div>
          </li>`;
        })
        .join('');
    } catch (_) {
      els.logList.innerHTML =
        '<li class="muted">로그를 불러오지 못했습니다. 스키마 적용 여부를 확인하세요.</li>';
    }
  }

  async function fetchViaProxy(filters, save) {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...filters,
        pageNo: state.pageNo,
        pageSize: PAGE_SIZE,
        saveToSupabase: save,
        apiKey: STORED_SERVICE_KEY,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `proxy_http_${response.status}`);
    }
    return {
      items: (data.items || []).map((row) => normalizeItem(row, state.pageNo)).filter(Boolean),
      totalCount: data.totalCount || 0,
      saved: data.saved || 0,
      source: `proxy:${data.source || 'unknown'}`,
    };
  }

  function buildDirectUrl(base, path, filters) {
    const query = new URLSearchParams();
    query.set('page', String(state.pageNo));
    query.set('perPage', String(PAGE_SIZE));
    query.set('returnType', 'json');
    for (const [key, value] of Object.entries(filters)) {
      if (key === 'resource' || value == null || value === '') continue;
      query.set(key, String(value));
    }
    if (base === OFFICIAL_BASE) {
      const cond = new URLSearchParams();
      cond.set('page', String(state.pageNo));
      cond.set('perPage', String(PAGE_SIZE));
      cond.set('returnType', 'json');
      const ops = {
        rcrt_prgs_yn: 'EQ',
        intg_pbanc_yn: 'EQ',
        biz_yr: 'EQ',
        clss_cd: 'EQ',
        biz_category_cd: 'EQ',
        pbanc_rcpt_bgng_dt: 'GTE',
        pbanc_rcpt_end_dt: 'LTE',
      };
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'resource' || !value) continue;
        cond.set(`cond[${key}::${ops[key] || 'LIKE'}]`, String(value));
      }
      return `${base}/${path}?serviceKey=${encodeServiceKey(STORED_SERVICE_KEY)}&${cond.toString()}`;
    }
    return `${base}/${path}?serviceKey=${encodeServiceKey(STORED_SERVICE_KEY)}&${query.toString()}`;
  }

  async function fetchDirect(filters) {
    const meta = RESOURCES[state.resource];
    const attempts = [
      { source: 'nidapi', url: buildDirectUrl(NIDAPI_BASE, meta.nidapiPath, filters) },
      { source: 'official', url: buildDirectUrl(OFFICIAL_BASE, meta.officialPath, filters) },
    ];
    let lastError = null;
    for (const attempt of attempts) {
      try {
        const response = await fetch(attempt.url);
        const text = await response.text();
        if (response.status === 403 || /^forbidden$/i.test(text.trim())) {
          lastError = new Error(`403 from ${attempt.source}`);
          continue;
        }
        if (!response.ok) {
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }
        const payload = JSON.parse(text);
        const data = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload?.data?.data)
            ? payload.data.data
            : [];
        return {
          items: data.map((row) => normalizeItem(row, state.pageNo)).filter(Boolean),
          totalCount: asInt(payload.totalCount, data.length),
          source: attempt.source,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    throw lastError || new Error('direct_fetch_failed');
  }

  async function loadPage({ save = true } = {}) {
    if (state.loading) return;
    state.loading = true;
    els.loadBtn.disabled = true;
    els.saveBtn.disabled = true;
    setStatus(`${RESOURCES[state.resource].label} 100건을 불러오는 중…`);
    setNotice('');
    const filters = currentFilters();
    try {
      let result;
      try {
        result = await fetchViaProxy(filters, save);
        if (save) state.lastSaved = result.saved || result.items.length;
      } catch (proxyError) {
        result = await fetchDirect(filters);
        if (save) {
          try {
            state.lastSaved = await saveToSupabase(result.items);
          } catch (saveError) {
            state.lastSaved = 0;
            setNotice(`조회는 성공했지만 Supabase 저장 실패: ${saveError.message}`, 'warn');
          }
        }
      }
      state.items = result.items;
      state.totalCount = result.totalCount || result.items.length;
      els.sourceMode.textContent = result.source || '—';
      renderTable(filteredItems());
      updatePager();
      setStatus(`${state.items.length}건 조회 완료 (페이지 ${state.pageNo})`, 'ok');
      if (save && state.lastSaved) {
        setNotice(`Supabase에 ${state.lastSaved}건 upsert 했습니다.`, 'ok');
      }
      await loadLogs();
    } catch (error) {
      setStatus('조회 실패', 'err');
      setNotice(error.message || String(error), 'err');
    } finally {
      state.loading = false;
      els.loadBtn.disabled = false;
      els.saveBtn.disabled = false;
      updatePager();
    }
  }

  function toCsv(rows) {
    if (!rows.length) return '';
    const fields = Object.keys(rows[0]).filter((k) => k !== 'raw');
    const escape = (v) => {
      const text = v == null ? '' : String(v);
      return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    };
    return `\uFEFF${[fields.join(',')]
      .concat(rows.map((r) => fields.map((f) => escape(r[f])).join(',')))
      .join('\n')}\n`;
  }

  function downloadCsv() {
    const rows = filteredItems();
    if (!rows.length) {
      setNotice('내보낼 데이터가 없습니다.', 'warn');
      return;
    }
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kstartup-${state.resource}_p${state.pageNo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function syncResourceUi() {
    state.resource = els.resource.value || 'announcements';
    const isAnn = state.resource === 'announcements';
    els.rcrt.disabled = !isAnn;
    els.region.disabled = !isAnn;
    els.clsfc.disabled = !isAnn;
    document.getElementById('kpiOpenLabel').textContent = isAnn ? '모집중' : '페이지';
    document.getElementById('kpiOpenHint').textContent = isAnn ? '현재 페이지' : '현재 조회 페이지';
  }

  els.loadBtn.addEventListener('click', () => {
    state.pageNo = 1;
    loadPage({ save: true });
  });
  els.saveBtn.addEventListener('click', async () => {
    if (!state.items.length) {
      setNotice('먼저 데이터를 불러오세요.', 'warn');
      return;
    }
    try {
      state.lastSaved = await saveToSupabase(state.items);
      renderKpis(filteredItems());
      setNotice(`Supabase에 ${state.lastSaved}건 다시 저장했습니다.`, 'ok');
      await loadLogs();
    } catch (error) {
      setNotice(error.message, 'err');
    }
  });
  els.prevBtn.addEventListener('click', () => {
    if (state.pageNo <= 1) return;
    state.pageNo -= 1;
    loadPage({ save: true });
  });
  els.nextBtn.addEventListener('click', () => {
    if (state.pageNo >= totalPages()) return;
    state.pageNo += 1;
    loadPage({ save: true });
  });
  els.csvBtn.addEventListener('click', downloadCsv);
  els.resource.addEventListener('change', () => {
    syncResourceUi();
    state.pageNo = 1;
    state.items = [];
    state.totalCount = 0;
    state.filterRegion = '';
    state.filterClsfc = '';
    renderTable([]);
    updatePager();
    loadLogs();
  });
  els.keyword.addEventListener('input', () => {
    if (state.items.length) renderTable(filteredItems());
  });

  syncResourceUi();
  updatePager();
  loadLogs();
  setStatus('서버 저장 키로 100건씩 조회·저장할 수 있습니다.');
})();
