/**
 * Stargate 통합 대시보드
 * 10개 스크린 × 5초. 공개 홈이므로 수강생 성명은 마스킹한다.
 * 데모는 fetch 실패에만 남기고, 빈 성공 응답은 live-empty로 표시한다.
 */
(function () {
  const INTERVAL_MS = 5000;
  const REFRESH_MS = 45000;
  const TZ = 'Asia/Seoul';
  const TMAP_LAST_KEY = 'stargate-tmap-last';
  const SUPABASE_URL = 'https://inftexpcnfinglwlrvsj.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZnRleHBjbmZpbmdsd2xydnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTMyMzgsImV4cCI6MjA4ODQ4OTIzOH0.HONuULp0L3B5T0gTiwJMnowjJonJzzNHhUV_LtpDQoI';
  const HOURS = Array.from({ length: 14 }, (_, i) => 9 + i);
  const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
  const SUBJECT_TONE = {
    '수학 심화': 'blue',
    'KOI 알고리즘': 'violet',
    '정보올림피아드': 'teal',
    '1:1 코칭': 'amber',
    상담: 'warm',
  };
  const CAT_LABEL = {
    exam: '시험',
    school: '학교/수업',
    personal: '개인',
    work: '업무',
    holiday: '기념일',
    other: '기타',
  };
  const ATT_META = {
    present: { label: '출석', color: '#34d399' },
    late: { label: '지각', color: '#f59e0b' },
    absent: { label: '결석', color: '#ff6b4f' },
    excused: { label: '공결', color: '#38bdf8' },
    pending: { label: '미처리', color: '#545d6e' },
  };
  const TMAP_SEED = {
    start: { name: '대치동', lat: 37.494, lon: 127.057 },
    end: { name: '강남역', lat: 37.498, lon: 127.028 },
    searchOption: '0',
  };

  const stage = document.getElementById('opsStage');
  const rail = document.getElementById('opsRail');
  const clockEl = document.getElementById('opsClock');
  const indexEl = document.getElementById('opsIndex');
  const titleEl = document.getElementById('opsTitle');
  const pauseBtn = document.getElementById('opsPause');
  const prevBtn = document.getElementById('opsPrev');
  const nextBtn = document.getElementById('opsNext');
  const fullBtn = document.getElementById('opsFull');
  const kioskBtn = document.getElementById('opsKiosk');
  const progressEl = document.getElementById('opsProgress');
  const liveEl = document.getElementById('opsLive');
  const frame = document.getElementById('opsFrame');
  if (!stage || !rail) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kiosk = new URLSearchParams(location.search).get('kiosk') === '1';
  if (kiosk) document.body.classList.add('ops-kiosk');

  const state = {
    index: 0,
    paused: false,
    userPaused: false,
    timer: null,
    refreshTimer: null,
    bookings: [],
    attendance: [],
    report: null,
    ddays: [],
    announcements: [],
    tmap: null,
    source: {
      bookings: 'demo',
      attendance: 'demo',
      report: 'demo',
      dday: 'demo',
      kstartup: 'demo',
    },
  };

  const screens = [
    { id: 'command', no: '01', title: '커맨드 센터', kicker: 'COMMAND', render: renderCommand },
    { id: 'today', no: '02', title: '오늘 수업', kicker: 'TODAY', render: renderToday },
    { id: 'week', no: '03', title: '주간 예약', kicker: 'WEEK', render: renderWeek },
    { id: 'attend', no: '04', title: '출결 현황', kicker: 'ATTENDANCE', render: renderAttendance },
    { id: 'report', no: '05', title: '수업 보고서', kicker: 'REPORT', render: renderReport },
    { id: 'dday', no: '06', title: 'D-Day', kicker: 'COUNTDOWN', render: renderDday },
    { id: 'kstartup', no: '07', title: 'K-Startup', kicker: 'RADAR', render: renderKstartup },
    { id: 'tmap', no: '08', title: 'TMAP', kicker: 'MOBILITY', render: renderTmap },
    { id: 'company', no: '09', title: '사업', kicker: 'STARGATE', render: renderCompany },
    { id: 'gate', no: '10', title: '게이트', kicker: 'CONTACT', render: renderGate },
  ];

  boot();

  function boot() {
    if (kioskBtn) {
      kioskBtn.href = kiosk ? 'index.html' : '?kiosk=1';
      kioskBtn.textContent = kiosk ? '홈' : '키오스크';
    }
    seedDemo();
    buildRail();
    renderAll(false);
    show(0, false);
    tickClock();
    setInterval(tickClock, 1000);
    if (!reduceMotion) startTimer();
    else setPaused(true, false);
    bindControls();
    hydrateLive();
    state.refreshTimer = setInterval(() => {
      if (!document.hidden) hydrateLive();
    }, REFRESH_MS);
  }

  function bindControls() {
    pauseBtn?.addEventListener('click', () => setPaused(!state.paused, true));
    prevBtn?.addEventListener('click', () => step(-1, true));
    nextBtn?.addEventListener('click', () => step(1, true));
    fullBtn?.addEventListener('click', toggleFullscreen);
    rail.querySelectorAll('[data-ops-goto]').forEach((btn) => {
      btn.addEventListener('click', () => {
        show(Number(btn.dataset.opsGoto), true);
        restartTimer();
      });
    });
    document.addEventListener('keydown', (e) => {
      if (!isOpsInView() && document.fullscreenElement !== frame) return;
      if (e.key === 'ArrowRight') step(1, true);
      if (e.key === 'ArrowLeft') step(-1, true);
      if (e.key === ' ') {
        e.preventDefault();
        setPaused(!state.paused, true);
      }
    });
    let touchX = 0;
    stage.addEventListener(
      'touchstart',
      (e) => {
        touchX = e.changedTouches[0].clientX;
      },
      { passive: true }
    );
    stage.addEventListener(
      'touchend',
      (e) => {
        const dx = e.changedTouches[0].clientX - touchX;
        if (dx > 56) step(-1, true);
        if (dx < -56) step(1, true);
      },
      { passive: true }
    );
    if (!kiosk) {
      frame?.addEventListener('mouseenter', () => {
        if (!state.userPaused) setPaused(true, false);
      });
      frame?.addEventListener('mouseleave', () => {
        if (!state.userPaused && !reduceMotion) setPaused(false, false);
      });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopTimer();
      } else if (!state.userPaused && !reduceMotion) {
        startTimer();
      }
    });
  }

  function isOpsInView() {
    const el = document.getElementById('ops');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  function startTimer() {
    stopTimer();
    restartProgress();
    state.timer = setInterval(() => step(1, false), INTERVAL_MS);
  }

  function stopTimer() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    if (progressEl) progressEl.style.animationPlayState = 'paused';
  }

  function restartTimer() {
    if (state.paused || reduceMotion) {
      restartProgress();
      if (progressEl) progressEl.style.animationPlayState = 'paused';
      return;
    }
    startTimer();
  }

  function restartProgress() {
    if (!progressEl) return;
    progressEl.style.animation = 'none';
    void progressEl.offsetWidth;
    progressEl.style.animation = '';
    progressEl.style.animationDuration = INTERVAL_MS + 'ms';
    progressEl.style.animationPlayState = state.paused ? 'paused' : 'running';
  }

  function setPaused(paused, fromUser) {
    state.paused = paused;
    if (fromUser) state.userPaused = paused;
    if (paused) stopTimer();
    else startTimer();
    if (pauseBtn) {
      pauseBtn.textContent = paused ? '재생' : '일시정지';
      pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    }
  }

  function step(dir, fromUser) {
    show((state.index + dir + screens.length) % screens.length, fromUser);
    if (fromUser) restartTimer();
  }

  function show(index, announce) {
    state.index = index;
    const screen = screens[index];
    stage.querySelectorAll('.ops-screen').forEach((el, i) => {
      el.classList.toggle('is-active', i === index);
      el.setAttribute('aria-hidden', i === index ? 'false' : 'true');
    });
    rail.querySelectorAll('[data-ops-goto]').forEach((btn, i) => {
      btn.classList.toggle('is-active', i === index);
    });
    if (indexEl) indexEl.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(screens.length).padStart(2, '0');
    if (titleEl) titleEl.textContent = screen.title;
    if (announce && titleEl) titleEl.setAttribute('aria-live', 'polite');
  }

  function buildRail() {
    rail.innerHTML = screens
      .map(
        (s, i) =>
          `<button type="button" class="ops-dot" data-ops-goto="${i}" aria-label="${escapeHtml(s.no + ' ' + s.title)}"><span>${s.no}</span>${escapeHtml(s.title)}</button>`
      )
      .join('');
  }

  function renderAll(soft) {
    const existing = stage.querySelectorAll('.ops-screen');
    if (soft && existing.length === screens.length) {
      screens.forEach((s) => {
        const el = stage.querySelector('[data-screen="' + s.id + '"]');
        if (el) el.innerHTML = s.render();
      });
    } else {
      stage.innerHTML = screens
        .map((s, i) => `<article class="ops-screen" data-screen="${s.id}" aria-hidden="${i === state.index ? 'false' : 'true'}">${s.render()}</article>`)
        .join('');
    }
    updateLiveBadge();
  }

  function updateLiveBadge() {
    if (!liveEl) return;
    const connected = Object.values(state.source).filter((v) => v === 'live' || v === 'empty').length;
    liveEl.dataset.mode = connected ? 'live' : 'demo';
    liveEl.textContent = connected ? `LIVE ${connected}/5` : 'DEMO';
  }

  function tickClock() {
    if (!clockEl) return;
    const p = seoulParts(new Date());
    clockEl.textContent = `${p.year}.${pad(p.month)}.${pad(p.dayOfMonth)}  ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
  }

  function toggleFullscreen() {
    if (!frame) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else frame.requestFullscreen?.();
  }

  async function hydrateLive() {
    const now = seoulNow();
    const weekStart = startOfWeek(now);
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    const today = toYmd(now);

    const jobs = [
      applyLive('bookings', () => loadBookings(weekStart, weekEnd), (rows) => {
        state.bookings = rows || [];
      }),
      applyLive('attendance', () => loadAttendance(today), (rows) => {
        state.attendance = rows || [];
      }),
      applyLive('report', () => loadReport(today), (row) => {
        state.report = row;
      }, { emptyIfNull: true }),
      applyLive('dday', () => loadDdays(), (rows) => {
        state.ddays = rows || [];
      }),
      applyLive(
        'kstartup',
        () =>
          sbJson(
            `/rest/v1/kstartup_announcements?select=biz_pbanc_nm,supt_regin,supt_biz_clsfc,rcrt_prgs_yn,pbanc_rcpt_end_dt,pbanc_ntrp_nm,fetched_at&order=fetched_at.desc&limit=8`
          ),
        (rows) => {
          state.announcements = rows || [];
        }
      ),
      loadTmapSnapshot(),
    ];

    await Promise.allSettled(jobs);
    const keepIndex = state.index;
    renderAll(true);
    show(keepIndex, false);
  }

  async function applyLive(key, loader, assign, options = {}) {
    const rows = await loader();
    assign(rows);
    const empty = options.emptyIfNull ? rows == null : !(Array.isArray(rows) ? rows.length : rows);
    state.source[key] = empty ? 'empty' : 'live';
  }

  async function sbFetch(path, options = {}) {
    return fetch(SUPABASE_URL + path, {
      ...options,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        ...(options.headers || {}),
      },
    });
  }

  async function sbJson(path, options) {
    const res = await sbFetch(path, options);
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.message) || 'sb_' + res.status);
    return data;
  }

  async function listStorage(prefix) {
    const res = await sbFetch('/storage/v1/object/list/public-data-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000 }),
    });
    const files = await res.json().catch(() => null);
    if (!res.ok) throw new Error((files && files.message) || 'storage_list');
    return (Array.isArray(files) ? files : [])
      .map((f) => f.name)
      .filter((n) => n && n.endsWith('.json') && !String(n).startsWith('_'));
  }

  async function loadBookings(weekStart, weekEnd) {
    try {
      const rows = await sbJson(
        `/rest/v1/class_bookings?status=eq.confirmed&starts_at=gte.${weekStart.toISOString()}&starts_at=lt.${weekEnd.toISOString()}&order=starts_at.asc&select=starts_at,ends_at,student_name,subject`
      );
      return (rows || []).map(normalizeBooking);
    } catch (_) {}
    const names = await listStorage('class-bookings/');
    const picked = names.filter((name) => {
      const start = parseSlotKey(name.replace(/\.json$/, ''));
      return start && start >= weekStart && start < weekEnd;
    });
    const rows = await Promise.all(
      picked.map(async (name) => {
        try {
          const row = await sbJson('/storage/v1/object/public-data-csv/class-bookings/' + name);
          if (!row || row.status === 'cancelled') return null;
          const key = name.replace(/\.json$/, '');
          const start = parseSlotKey(row.slot_key || key);
          const end = start ? new Date(start.getTime() + 3600000) : null;
          return normalizeBooking({
            starts_at: row.starts_at || (start && start.toISOString()),
            ends_at: row.ends_at || (end && end.toISOString()),
            student_name: row.student_name || row.name || '',
            subject: row.subject || '',
          });
        } catch (_) {
          return null;
        }
      })
    );
    return rows.filter(Boolean);
  }

  async function loadAttendance(today) {
    try {
      const rows = await sbJson(
        `/rest/v1/class_attendance?report_date=eq.${today}&select=attendance,subject,starts_at,student_name`
      );
      return rows || [];
    } catch (_) {}
    const names = await listStorage('class-attendance/');
    const picked = names.filter((n) => n.startsWith(today + 'T'));
    const rows = await Promise.all(
      picked.map(async (name) => {
        try {
          const row = await sbJson('/storage/v1/object/public-data-csv/class-attendance/' + name);
          if (!row) return null;
          return {
            attendance: row.attendance || 'pending',
            subject: row.subject || '',
            starts_at: row.starts_at || '',
            student_name: row.student_name || row.name || '',
          };
        } catch (_) {
          return null;
        }
      })
    );
    return rows.filter(Boolean);
  }

  async function loadReport(today) {
    try {
      const rows = await sbJson(
        `/rest/v1/class_daily_reports?report_date=eq.${today}&select=summary,highlights,issues,next_plan,stats`
      );
      return rows?.[0] || null;
    } catch (_) {}
    try {
      return await sbJson('/storage/v1/object/public-data-csv/class-reports/' + today + '.json');
    } catch (_) {
      await listStorage('class-reports/');
      return null;
    }
  }

  async function loadDdays() {
    try {
      const rows = await sbJson(
        `/rest/v1/dday_events?status=eq.active&order=target_date.asc&select=title,target_date,category,color,pinned,memo&limit=12`
      );
      return rows || [];
    } catch (_) {}
    const names = await listStorage('dday-events/');
    const rows = await Promise.all(
      names.map(async (name) => {
        try {
          const row = await sbJson('/storage/v1/object/public-data-csv/dday-events/' + name);
          if (!row || row.status === 'deleted' || row.status === 'archived') return null;
          return {
            title: row.title || '',
            target_date: row.target_date || row.targetDate || '',
            category: row.category || 'personal',
            color: row.color || '#4f8fff',
            pinned: !!row.pinned,
            memo: row.memo || '',
          };
        } catch (_) {
          return null;
        }
      })
    );
    return rows.filter((row) => row && row.target_date);
  }

  async function loadTmapSnapshot() {
    const stored = readLastTmap();
    if (stored) {
      state.tmap = { ...stored, source: 'saved' };
      return;
    }
    try {
      const res = await fetch('/api/tmap-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TMAP_SEED),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        state.tmap = { error: data.error || 'TMAP 키 없음 · tmap/에서 설정', source: 'empty' };
        return;
      }
      state.tmap = {
        start: TMAP_SEED.start,
        end: TMAP_SEED.end,
        summary: data.summary || {},
        source: 'live',
      };
    } catch (_) {
      state.tmap = { error: 'TMAP 키 없음 · tmap/에서 설정', source: 'empty' };
    }
  }

  function readLastTmap() {
    try {
      const raw = localStorage.getItem(TMAP_LAST_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.summary) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function parseSlotKey(key) {
    const m = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], 0, 0);
  }

  function seedDemo() {
    const now = seoulNow();
    const weekStart = startOfWeek(now);
    const subjects = ['수학 심화', 'KOI 알고리즘', '정보올림피아드', '1:1 코칭', '상담'];
    const names = ['김하준', '이서연', '박도윤', '최지아', '정시우', '한예린', '윤민재'];
    const bookings = [];
    for (let d = 1; d <= 6; d += 1) {
      const count = d === 3 ? 4 : 2 + (d % 3);
      for (let i = 0; i < count; i += 1) {
        const hour = 10 + i * 2 + (d % 2);
        const start = new Date(weekStart.getTime() + d * 86400000);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        bookings.push({
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          student_name: names[(d + i) % names.length],
          subject: subjects[(d + i) % subjects.length],
        });
      }
    }
    state.bookings = bookings;
    const todayBooks = bookings.filter((b) => toYmd(new Date(b.starts_at)) === toYmd(now));
    const attKeys = ['present', 'present', 'late', 'pending'];
    state.attendance = (todayBooks.length ? todayBooks : bookings.slice(0, 4)).map((b, i) => ({
      attendance: attKeys[i % attKeys.length],
      subject: b.subject,
      starts_at: b.starts_at,
      student_name: b.student_name,
    }));
    state.report = {
      summary: '대치 수학 심화 2세션, KOI 그래프 탐색 1세션을 진행했습니다. 전반적으로 집중도가 높았고 숙제 제출률이 안정적입니다.',
      highlights: 'DFS/BFS 비교 정리 완료\n이차함수 최댓값 유형 오답 노트 작성',
      issues: '지각 1건 · 숙제 미제출 1건은 다음 세션에서 재확인',
      next_plan: '내일 KOI 그리디 워밍업, 주말 모의고사 D-Day 리마인드',
      stats: { present: 2, late: 1, absent: 0, excused: 0, pending: 1, rate: 100 },
    };
    state.ddays = [
      { title: 'KOI 1차', target_date: shiftYmd(now, 18), category: 'exam', color: '#a855f7', pinned: true, memo: '알고리즘 모의고사' },
      { title: '중간고사', target_date: shiftYmd(now, 11), category: 'school', color: '#4f8fff', pinned: true, memo: '' },
      { title: '수학 경시', target_date: shiftYmd(now, 32), category: 'exam', color: '#ff6b4f', pinned: false, memo: '' },
      { title: '학부모 상담', target_date: shiftYmd(now, 4), category: 'work', color: '#f59e0b', pinned: false, memo: '' },
    ];
    state.announcements = [
      { biz_pbanc_nm: '예비창업패키지 2026', supt_regin: '서울', supt_biz_clsfc: '창업교육', rcrt_prgs_yn: 'Y', pbanc_rcpt_end_dt: shiftYmd(now, 14), pbanc_ntrp_nm: '창업진흥원' },
      { biz_pbanc_nm: '초기창업패키지 AI 특화', supt_regin: '전국', supt_biz_clsfc: '사업화', rcrt_prgs_yn: 'Y', pbanc_rcpt_end_dt: shiftYmd(now, 21), pbanc_ntrp_nm: 'KISED' },
      { biz_pbanc_nm: '딥테크 팁스 연계', supt_regin: '전국', supt_biz_clsfc: 'R&D', rcrt_prgs_yn: 'Y', pbanc_rcpt_end_dt: shiftYmd(now, 40), pbanc_ntrp_nm: '중기부' },
      { biz_pbanc_nm: '글로벌 사우스 진출 지원', supt_regin: '서울', supt_biz_clsfc: '해외진출', rcrt_prgs_yn: 'N', pbanc_rcpt_end_dt: shiftYmd(now, -3), pbanc_ntrp_nm: 'KOTRA' },
    ];
    state.tmap = {
      start: TMAP_SEED.start,
      end: TMAP_SEED.end,
      summary: { totalTimeSeconds: 18 * 60, totalDistanceMeters: 4200, totalFareWon: 0, taxiFareWon: 8900 },
      source: 'demo',
    };
  }

  function normalizeBooking(row) {
    return {
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      student_name: row.student_name || '',
      subject: row.subject || '',
    };
  }

  function subjectCounts() {
    const groups = { 수학: 0, KOI: 0, 상담: 0, 기타: 0 };
    state.bookings.forEach((b) => {
      const s = b.subject || '';
      if (s.includes('수학')) groups.수학 += 1;
      else if (s.includes('KOI') || s.includes('정보')) groups.KOI += 1;
      else if (s.includes('상담')) groups.상담 += 1;
      else groups.기타 += 1;
    });
    return groups;
  }

  function attendanceCounts() {
    const stats = state.report && state.report.stats;
    if (stats && typeof stats === 'object' && (stats.present != null || stats.total != null)) {
      return {
        present: Number(stats.present) || 0,
        late: Number(stats.late) || 0,
        absent: Number(stats.absent) || 0,
        excused: Number(stats.excused) || 0,
        pending: Number(stats.pending) || 0,
        rate: Number(stats.rate),
      };
    }
    const counts = { present: 0, late: 0, absent: 0, excused: 0, pending: 0 };
    state.attendance.forEach((a) => {
      const key = counts[a.attendance] != null ? a.attendance : 'pending';
      counts[key] += 1;
    });
    return counts;
  }

  function renderCommand() {
    const now = seoulNow();
    const todayYmd = toYmd(now);
    const todayCount = state.bookings.filter((b) => toYmd(new Date(b.starts_at)) === todayYmd).length;
    const weekCount = state.bookings.length;
    const upcoming = upcomingDdays().length;
    const openAnn = state.announcements.filter((a) => String(a.rcrt_prgs_yn).toUpperCase() === 'Y').length;
    const next = nextBooking(now);
    const subjects = subjectCounts();
    return `
      ${head('01', 'COMMAND', '스타게이트 운영 현황', '예약 · 출결 · 보고서 · D-Day · K-Startup 소스 상태를 그대로 보여 줍니다.')}
      <div class="ops-kpi">
        ${kpi('오늘 수업', todayCount, '세션', 'blue')}
        ${kpi('이번 주 예약', weekCount, '슬롯', 'violet')}
        ${kpi('다가오는 D-Day', upcoming, '건', 'warm')}
        ${kpi('모집 중 공고', openAnn, '건', 'teal')}
      </div>
      <div class="ops-split">
        <div class="ops-panel">
          <div class="ops-panel-label">다음 세션 · 과목 집계</div>
          ${next ? `<div class="ops-next"><strong>${escapeHtml(fmtTime(next.starts_at))}–${escapeHtml(fmtTime(next.ends_at))}</strong><span class="ops-chip ${tone(next.subject)}">${escapeHtml(next.subject)}</span><p>${escapeHtml(maskName(next.student_name))}</p></div>` : `<p class="ops-empty">${emptyCopy(state.source.bookings, '오늘 남은 수업이 없습니다.')}</p>`}
          <p class="ops-note">수학 ${subjects.수학} · KOI/정보 ${subjects.KOI} · 상담 ${subjects.상담} · 기타 ${subjects.기타}</p>
        </div>
        <div class="ops-panel">
          <div class="ops-panel-label">시스템</div>
          <ul class="ops-sys">
            ${sysRow('수업 예약', state.source.bookings)}
            ${sysRow('출결', state.source.attendance)}
            ${sysRow('보고서', state.source.report)}
            ${sysRow('D-Day', state.source.dday)}
            ${sysRow('K-Startup', state.source.kstartup)}
          </ul>
        </div>
      </div>`;
  }

  function renderToday() {
    const todayYmd = toYmd(seoulNow());
    const rows = state.bookings
      .filter((b) => toYmd(new Date(b.starts_at)) === todayYmd)
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    const list = rows.length
      ? rows
          .map(
            (b) => `<li>
              <time>${escapeHtml(fmtTime(b.starts_at))}</time>
              <div>
                <strong>${escapeHtml(b.subject)}</strong>
                <span>${escapeHtml(maskName(b.student_name))}</span>
              </div>
              <em class="ops-chip ${tone(b.subject)}">${escapeHtml(DAY_LABELS[seoulParts(new Date(b.starts_at)).day])}</em>
            </li>`
          )
          .join('')
      : `<li class="ops-empty-row">${emptyCopy(state.source.bookings, '오늘 확정된 수업이 없습니다.')}</li>`;
    return `
      ${head('02', 'TODAY', '오늘의 수업 보드', '성명은 마스킹됩니다. 상세 예약은 시간표에서 확인하세요.')}
      <ol class="ops-timeline">${list}</ol>
      <a class="ops-link" href="schedule.html">주간 시간표에서 예약 →</a>`;
  }

  function renderWeek() {
    const cells = [];
    for (const hour of HOURS) {
      let row = `<div class="ops-heat-hour">${pad(hour)}</div>`;
      for (let d = 0; d < 7; d += 1) {
        const count = state.bookings.filter((b) => {
          const p = seoulParts(new Date(b.starts_at));
          return p.day === d && p.hour === hour;
        }).length;
        row += `<div class="ops-heat-cell lv${Math.min(3, count)}" title="${DAY_LABELS[d]} ${hour}:00 · ${count}건">${count ? count : ''}</div>`;
      }
      cells.push(row);
    }
    return `
      ${head('03', 'WEEK', '주간 예약 히트맵', '일–토 · 09–22시. 색이 진할수록 슬롯이 찼습니다.')}
      <div class="ops-heat">
        <div class="ops-heat-hour"></div>
        ${DAY_LABELS.map((d) => `<div class="ops-heat-dow">${d}</div>`).join('')}
        ${cells.join('')}
      </div>
      <p class="ops-note">이번 주 ${state.bookings.length}개 슬롯 · ${srcNote(state.source.bookings)}</p>`;
  }

  function renderAttendance() {
    const counts = attendanceCounts();
    const total = counts.present + counts.late + counts.absent + counts.excused + counts.pending || 1;
    const done = counts.present + counts.late + counts.excused;
    const rate = Number.isFinite(counts.rate)
      ? Math.round(counts.rate)
      : Math.round((done / total) * 100);
    let acc = 0;
    const stops = Object.entries(ATT_META)
      .map(([k]) => [k, counts[k] || 0])
      .filter(([, n]) => n)
      .map(([k, n]) => {
        const from = acc;
        acc += (n / total) * 100;
        return `${ATT_META[k].color} ${from}% ${acc}%`;
      });
    const donut = stops.length ? `conic-gradient(${stops.join(',')})` : 'conic-gradient(#1a2230 0 100%)';
    const legend = Object.entries(ATT_META)
      .map(([k, m]) => `<li><i style="background:${m.color}"></i>${m.label} <b>${counts[k] || 0}</b></li>`)
      .join('');
    const rows = state.attendance
      .slice(0, 6)
      .map(
        (a) => `<li><span>${escapeHtml(fmtTime(a.starts_at))}</span><strong>${escapeHtml(a.subject || '수업')}</strong><em class="ops-chip">${escapeHtml(ATT_META[a.attendance]?.label || '미처리')}</em></li>`
      )
      .join('');
    return `
      ${head('04', 'ATTENDANCE', '출결 현황', '당일 세션 기준. 보고서에 stats가 있으면 그 값을 우선합니다.')}
      <div class="ops-split">
        <div class="ops-donut-wrap">
          <div class="ops-donut" style="background:${donut}"><span>${state.attendance.length || counts.present || counts.late ? rate : 0}<small>%</small></span></div>
          <p>처리율</p>
        </div>
        <ul class="ops-legend">${legend}</ul>
      </div>
      <ul class="ops-mini">${rows || `<li class="ops-empty-row">${emptyCopy(state.source.attendance, '오늘 출결 데이터가 없습니다.')}</li>`}</ul>
      <a class="ops-link" href="report.html">출결 · 보고서 →</a>`;
  }

  function renderReport() {
    const r = state.report || {};
    const stats = r.stats && typeof r.stats === 'object' ? r.stats : null;
    const fields = [
      ['요약', r.summary],
      ['하이라이트', r.highlights],
      ['이슈', r.issues],
      ['다음 계획', r.next_plan],
    ];
    return `
      ${head('05', 'REPORT', '당일 수업 보고서', srcNote(state.source.report))}
      ${stats ? `<p class="ops-note">stats · 출석 ${Number(stats.present) || 0} · 지각 ${Number(stats.late) || 0} · 결석 ${Number(stats.absent) || 0} · 비율 ${Number(stats.rate) || 0}%</p>` : ''}
      <div class="ops-report">
        ${fields
          .map(
            ([label, text]) => `<div class="ops-panel"><div class="ops-panel-label">${label}</div><p>${escapeHtml(text || emptyCopy(state.source.report, '아직 작성되지 않았습니다.')).replaceAll('\n', '<br>')}</p></div>`
          )
          .join('')}
      </div>`;
  }

  function renderDday() {
    const list = displayDdays();
    const hero = list[0];
    const rest = list.slice(1, 5);
    return `
      ${head('06', 'COUNTDOWN', 'D-Day 카운트다운', '시험·수업·일정을 한 화면에.')}
      <div class="ops-split ops-dday">
        <div class="ops-hero-dday">
          ${hero ? `<div class="ops-dday-num" style="color:${escapeHtml(hero.color || '#4f8fff')}">${ddayLabel(hero.target_date)}</div><h3>${escapeHtml(hero.title)}</h3><p>${escapeHtml(hero.target_date)} · ${escapeHtml(CAT_LABEL[hero.category] || '')}</p>` : `<p class="ops-empty">${emptyCopy(state.source.dday, '등록된 D-Day가 없습니다.')}</p>`}
        </div>
        <ul class="ops-mini">
          ${rest.map((e) => `<li><b style="color:${escapeHtml(e.color || '#4f8fff')}">${ddayLabel(e.target_date)}</b><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(e.target_date)}</span></li>`).join('') || '<li class="ops-empty-row">다음 일정이 더 없습니다.</li>'}
        </ul>
      </div>
      <a class="ops-link" href="dday.html">D-Day 캘린더 →</a>`;
  }

  function renderKstartup() {
    const open = state.announcements.filter((a) => String(a.rcrt_prgs_yn).toUpperCase() === 'Y').length;
    const rows = state.announcements
      .slice(0, 5)
      .map((a) => {
        const live = String(a.rcrt_prgs_yn).toUpperCase() === 'Y';
        return `<li>
          <a href="kstartup/">
            <span class="ops-chip ${live ? 'teal' : ''}">${live ? '모집' : '마감'}</span>
            <div><strong>${escapeHtml(a.biz_pbanc_nm || '공고')}</strong><span>${escapeHtml([a.pbanc_ntrp_nm, a.supt_regin, a.supt_biz_clsfc].filter(Boolean).join(' · '))}</span></div>
            <time>${escapeHtml(a.pbanc_rcpt_end_dt || '')}</time>
          </a>
        </li>`;
      })
      .join('');
    return `
      ${head('07', 'RADAR', 'K-Startup 지원사업 레이더', `모집 중 ${open}건 · ${srcNote(state.source.kstartup)}`)}
      <ol class="ops-timeline ops-radar">${rows || `<li class="ops-empty-row">${emptyCopy(state.source.kstartup, '저장된 공고가 없습니다.')}</li>`}</ol>
      <a class="ops-link" href="kstartup/">관측소 전체 보기 →</a>`;
  }

  function renderTmap() {
    const snap = state.tmap || {};
    const summary = snap.summary || {};
    const minutes = Math.round((summary.totalTimeSeconds || 0) / 60);
    const km = ((summary.totalDistanceMeters || 0) / 1000).toFixed(1);
    const taxi = Number(summary.taxiFareWon || 0).toLocaleString('ko-KR');
    if (snap.error || snap.source === 'empty') {
      return `
        ${head('08', 'MOBILITY', 'TMAP 스냅샷', '지도 SDK는 이 화면에 올리지 않습니다.')}
        <p class="ops-empty">${escapeHtml(snap.error || 'TMAP 키 없음 · tmap/에서 설정')}</p>
        <a class="ops-link" href="tmap/">모빌리티 연구 페이지 →</a>`;
    }
    return `
      ${head('08', 'MOBILITY', 'TMAP 스냅샷', `${escapeHtml((snap.start && snap.start.name) || '출발')} → ${escapeHtml((snap.end && snap.end.name) || '도착')} · 지도는 tmap/에서만 켭니다.`)}
      <div class="ops-kpi">
        ${kpi('소요', minutes, '분', 'blue')}
        ${kpi('거리', km, 'km', 'violet')}
        ${kpi('택시', taxi, '원', 'warm')}
        ${kpi('출처', snap.source === 'saved' ? '저장' : snap.source === 'live' ? 'API' : 'DEMO', '', 'teal')}
      </div>
      <a class="ops-link" href="tmap/">실시간 경로 분석 →</a>`;
  }

  function renderCompany() {
    return `
      ${head('09', 'STARGATE', '사업 한 장', '교육 · AI · 출판을 한 스크린에 압축했습니다.')}
      <div class="ops-cards four">
        <article><h3>수학 · KOI</h3><p>대치 심화와 알고리즘 트랙.</p></article>
        <article><h3>서울 도시데이터</h3><p>실시간 인구 · 상권 · 교통. <a href="seoul-city/">연구 보드</a></p></article>
        <article><h3>출판 · 커머스</h3><p>KDP, Coupang, Cafe24.</p></article>
        <article><h3>정동수</h3><p>서울대 공대 · ㈜별의문.</p></article>
      </div>`;
  }

  function renderGate() {
    return `
      ${head('10', 'CONTACT', '다음 문을 고르세요', '상담, 예약, 관측소, 모빌리티 — 같은 게이트에서 이어집니다.')}
      <div class="ops-cards ops-gates" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
        <a href="schedule.html"><h3>예약</h3><p>주간 시간표</p></a>
        <a href="dday.html"><h3>D-Day</h3><p>카운트다운</p></a>
        <a href="report.html"><h3>출결</h3><p>당일 보고서</p></a>
        <a href="kstartup/"><h3>K-Startup</h3><p>지원사업 레이더</p></a>
        <a href="seoul-city/"><h3>서울</h3><p>실시간 도시데이터</p></a>
        <a href="tmap/"><h3>TMAP</h3><p>모빌리티 연구</p></a>
      </div>
      <p class="ops-note">서울 강남구 대치동</p>`;
  }

  function head(no, kicker, title, desc) {
    return `<header class="ops-screen-head">
      <div class="ops-kicker"><span>${no}</span>${kicker}</div>
      <h2>${title}</h2>
      <p>${desc}</p>
    </header>`;
  }

  function kpi(label, value, unit, toneName) {
    return `<div class="ops-kpi-card ${toneName}"><span>${label}</span><strong>${escapeHtml(String(value))}${unit ? `<small>${unit}</small>` : ''}</strong></div>`;
  }

  function sysRow(name, src) {
    const label = src === 'live' ? 'LIVE' : src === 'empty' ? 'EMPTY' : 'DEMO';
    return `<li><span>${name}</span><b class="ops-src ${src}">${label}</b></li>`;
  }

  function srcNote(src) {
    if (src === 'live') return '실시간 저장소';
    if (src === 'empty') return '연결됨 · 이번 구간 데이터 없음';
    return '초안 데모 데이터';
  }

  function emptyCopy(src, liveText) {
    return src === 'demo' ? '초안 데모도 아직 없습니다. ' + liveText : liveText;
  }

  function tone(subject) {
    return SUBJECT_TONE[subject] || '';
  }

  function maskName(name) {
    const s = String(name || '').trim();
    if (!s) return '수강생';
    return s[0] + '○○';
  }

  function nextBooking(now) {
    return state.bookings
      .filter((b) => new Date(b.ends_at || b.starts_at) >= now)
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];
  }

  function upcomingDdays() {
    const today = toYmd(seoulNow());
    return [...state.ddays]
      .filter((e) => e.target_date >= today)
      .sort((a, b) => (b.pinned === true) - (a.pinned === true) || String(a.target_date).localeCompare(String(b.target_date)));
  }

  function displayDdays() {
    const upcoming = upcomingDdays();
    if (upcoming.length) return upcoming;
    return [...state.ddays].sort((a, b) => String(b.target_date).localeCompare(String(a.target_date)));
  }

  function daysUntil(ymd) {
    const today = toYmd(seoulNow());
    const a = fromYmd(today).getTime();
    const b = fromYmd(ymd).getTime();
    return Math.round((b - a) / 86400000);
  }

  function ddayLabel(ymd) {
    const d = daysUntil(ymd);
    if (d === 0) return 'D-DAY';
    return d > 0 ? 'D-' + d : 'D+' + Math.abs(d);
  }

  function seoulNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  }

  function seoulParts(date) {
    const d = new Date(date.toLocaleString('en-US', { timeZone: TZ }));
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      dayOfMonth: d.getDate(),
      day: d.getDay(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      second: d.getSeconds(),
    };
  }

  function startOfWeek(date) {
    const p = seoulParts(date);
    const start = fromYmd(`${p.year}-${pad(p.month)}-${pad(p.dayOfMonth)}`);
    start.setDate(start.getDate() - p.day);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  function toYmd(date) {
    const p = seoulParts(date);
    return `${p.year}-${pad(p.month)}-${pad(p.dayOfMonth)}`;
  }

  function fromYmd(ymd) {
    const [y, m, d] = String(ymd).split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  function shiftYmd(date, days) {
    const d = new Date(fromYmd(toYmd(date)).getTime() + days * 86400000);
    return toYmd(d);
  }

  function fmtTime(iso) {
    if (!iso) return '--:--';
    const p = seoulParts(new Date(iso));
    return `${pad(p.hour)}:${pad(p.minute)}`;
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function escapeHtml(s) {
    return String(s || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }
})();
