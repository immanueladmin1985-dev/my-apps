/* 교회 기도 — 입력 · 내 기록 · 현황 · 기도제목 · 특별기도(기간별 기도 대상·기도표) · 공지 */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ko = (a, b) => a.localeCompare(b, 'ko');

  /* ---------- 저장 (localStorage, 모두 try/catch) ---------- */
  const CFG_KEY = 'church-prayer-cfg', DEV_KEY = 'church-prayer-device';
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const C = Object.assign({ server: '', font: 17, autoFS: true, installDismissed: false, hideNotices: [], tab: 'input', pending: [], state: null, sort: 'recent' }, load(CFG_KEY, {}));
  // 내 컴퓨터(localhost)에서 시험할 때는 진짜 서버를 쓰지 않음 (?s= 로 시험 서버를 줌)
  if (window.CHURCH_PRAYER_SERVER && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) C.server = window.CHURCH_PRAYER_SERVER;
  const saveCfg = () => save(CFG_KEY, C);

  // 기기 번호·열쇠: localStorage 가 지워져도 IndexedDB 에서 되살림
  function idb(fn) {
    return new Promise(res => {
      try {
        const r = indexedDB.open('church-prayer', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => { try { fn(r.result.transaction('kv', 'readwrite').objectStore('kv'), res); } catch (e) { res(null); } };
        r.onerror = () => res(null);
      } catch (e) { res(null); }
    });
  }
  const kvGet = k => idb((st, res) => { const q = st.get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); });
  const kvSet = (k, v) => idb((st, res) => { st.put(v, k); res(true); });
  const rnd = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join(''); };
  let device = load(DEV_KEY, null);
  async function ensureDevice() {
    if (!device || !device.id) device = await kvGet('device');
    if (!device || !device.id) device = { id: rnd(24), key: rnd(32) };
    save(DEV_KEY, device); kvSet('device', device);
  }
  async function resetDevice() { device = { id: rnd(24), key: rnd(32) }; save(DEV_KEY, device); await kvSet('device', device); }
  function deviceDesc() {
    const ua = navigator.userAgent;
    const os = /iPhone|iPad|iPod/.test(ua) ? '아이폰/아이패드' : /Android/.test(ua) ? '안드로이드' : /Windows/.test(ua) ? '윈도우' : /Mac/.test(ua) ? '맥' : '기타';
    const br = /SamsungBrowser/.test(ua) ? '삼성 인터넷' : /KAKAOTALK/i.test(ua) ? '카카오톡' : /NAVER/.test(ua) ? '네이버' : /Edg\//.test(ua) ? '엣지' : /CriOS|Chrome\//.test(ua) ? '크롬' : /Safari/.test(ua) ? '사파리' : '브라우저';
    return os + ' · ' + br;
  }

  /* ---------- 서버 ---------- */
  let S = C.state || null;   // 마지막으로 받은 자료 (바로 그리기용)
  let online = true, busy = 0;
  // 기다려야 하는 요청은 화면 전체에 로딩 창을 띄우고 그동안 다른 버튼을 막음 (여러 번 누르지 않게)
  const WAIT_MSG = { setName: '이름을 저장하고 있어요', save: '기도 시간을 저장하고 있어요', prayer: '기도제목을 올리고 있어요', comment: '댓글을 올리고 있어요', master: '확인하고 있어요', reimport: '설문지 기록을 옮기고 있어요', setLogo: '로고를 저장하고 있어요', devices: '기기 목록을 불러오고 있어요', pick: '기도할 사람을 저장하고 있어요', target: '기도 대상을 저장하고 있어요', delTarget: '지우고 있어요', targets: '여러 명을 넣고 있어요', camp: '특별기도를 저장하고 있어요', delCamp: '지우고 있어요', event: '일정을 저장하고 있어요', delEvent: '지우고 있어요', att: '예배 인원을 저장하고 있어요', setRole: '권한을 바꾸고 있어요', teachers: '교사 명단을 저장하고 있어요', person: '명단을 저장하고 있어요', people: '여러 명을 넣고 있어요', delPerson: '지우고 있어요', visit: '심방 기록을 저장하고 있어요', delVisit: '지우고 있어요', importSheet: '구글 시트에서 출석부를 가져오고 있어요 (1분 안팎)', bulkPerson: '한꺼번에 바꾸고 있어요', approve: '승인하고 있어요', cancelClaim: '취소하고 있어요' };
  let waitN = 0, waitTimer = 0;
  function showWait(msg) {
    waitN++;
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => {   // 아주 빨리 끝나면 깜빡이지 않게 조금 있다가 띄움
      let w = $('#wait');
      if (!w) { w = document.createElement('div'); w.id = 'wait'; w.className = 'wait'; document.body.appendChild(w); }
      w.innerHTML = `<div class="wait-card"><div class="wait-ic">🙏</div><div class="spin"></div><p>${esc(msg)}…</p><p class="small muted">잠시만 기다려 주세요</p></div>`;
      w.classList.add('show');
    }, 150);
  }
  function hideWait() {
    waitN = Math.max(0, waitN - 1);
    if (waitN) return;
    clearTimeout(waitTimer);
    const w = $('#wait'); if (w) w.classList.remove('show');
  }
  async function api(action, extra) {
    const msg = WAIT_MSG[action] || (['load', 'logo', 'react', 'photos', 'spCheck', 'join', 'marks'].includes(action) ? '' : '잠시만요');
    if (!msg) return apiRaw(action, extra);
    showWait(msg);
    try { return await apiRaw(action, extra); } finally { hideWait(); }
  }
  async function apiRaw(action, extra) {
    if (!C.server) throw new Error('서버 주소가 아직 없어요');
    await ensureDevice();
    const body = JSON.stringify(Object.assign({ action, dev: device.id, key: device.key, desc: deviceDesc() }, extra || {}));
    let r, ctl = window.AbortController ? new AbortController() : null;
    const tm = ctl ? setTimeout(() => ctl.abort(), action === 'importSheet' ? 330000 : 30000) : 0;
    busy++; paintBusy();
    try { r = await fetch(C.server, { method: 'POST', body, redirect: 'follow', signal: ctl ? ctl.signal : undefined }); }
    catch (e) { online = false; throw new Error('인터넷 연결을 확인해 주세요'); }
    finally { clearTimeout(tm); busy--; paintBusy(); }
    let d; try { d = await r.json(); } catch (e) { online = false; throw new Error('서버 응답이 이상해요'); }
    online = true;
    if (!d.ok && d.error === 'key') { await resetDevice(); S = null; C.state = null; saveCfg(); throw new Error('기기 정보가 바뀌어 이름을 다시 골라 주세요'); }
    if (!d.ok) { const e = new Error(d.error === 'exists' ? '이미 있는 이름이에요' : (d.error || '실패했어요')); e.server = true; e.data = d; throw e; }
    if (d.names) { S = d; C.state = d; if (d.church) C.church = d.church; saveCfg(); checkLogo(); }
    return d;
  }
  async function refresh(quiet) {
    try { await flush(); await api('load'); }
    catch (e) { if (!quiet) toast(e.message); }
    render();
  }
  // 인터넷이 안 될 때 저장한 것은 모아 두었다가 다시 보냄
  async function flush() {
    while (C.pending.length) {
      const p = C.pending[0];
      try { await api('save', p); }
      catch (e) { if (e.server) { toast('보내지 못한 기록: ' + e.message); } else throw e; }
      C.pending.shift(); saveCfg();
    }
  }

  /* ---------- 날짜·시간 ---------- */
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const today = () => ymd(new Date());
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const wd = s => WD[parse(s).getDay()];
  const md = s => { const d = parse(s); return (d.getMonth() + 1) + '월 ' + d.getDate() + '일'; };
  const hmText = min => { min = Math.round(min || 0); const h = Math.floor(min / 60), m = min % 60; return !min ? '0시간' : h ? h + '시간' + (m ? ' ' + m + '분' : '') : m + '분'; };
  // 표 칸: 1시간 미만은 "30분", 그 이상은 시간(소수 한 자리) — 예전 시트와 같게
  const cellText = min => !min ? '' : min < 60 ? Math.round(min) + '분' : String(Math.round(min / 6) / 10);
  const myName = () => (S && S.me && S.me.name) || '';
  const isMaster = () => !!(S && S.me && S.me.role === '마스터');
  const isTeacher = () => !!(S && S.me && (S.me.role === '마스터' || S.me.role === '교사'));   // 교사: 기도 대상·일정·예배 인원
  const appTitle = () => '임마누엘교회 기도';
  const isStaff = () => !!(S && S.me && (S.me.role === '마스터' || S.me.role === '공지' || S.me.role === '담임목사'));   // 공지 권한(담임목사님 등)
  const dataOf = n => (S && S.data && S.data[n]) || {};
  const totalOf = n => Object.values(dataOf(n)).reduce((a, b) => a + b, 0);

  /* ---------- 아이콘 ---------- */
  const ICON = {
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    fsOn: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    fsOff: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
    reload: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
  };

  /* ---------- 창(모달) ---------- */
  let modalResolve = null;
  function modal(html, buttons, onOpen) {
    const dlg = $('#dlg'), inn = $('#dlgIn');
    if (modalResolve) { modalResolve(undefined); modalResolve = null; }
    inn.innerHTML = html + (buttons && buttons.length ? '<div class="acts">' + buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('') + '</div>' : '');
    return new Promise(res => {
      modalResolve = res;
      $$('.acts button', inn).forEach(b => b.onclick = () => { const bt = buttons[+b.dataset.i]; if (bt.check && !bt.check()) return; close(bt.val); });
      if (onOpen) onOpen(inn, close);
      try { if (!dlg.open) dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
    });
    function close(v) { const r = modalResolve; modalResolve = null; try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); } if (r) r(v); }
  }
  $('#dlg').addEventListener('cancel', e => { e.preventDefault(); const r = modalResolve; modalResolve = null; $('#dlg').close(); if (r) r(undefined); });
  const confirmBox = (title, msg, ok, cls) => modal(`<h3>${esc(title)}</h3><p class="msg">${msg}</p>`, [{ label: '취소', val: false }, { label: ok || '확인', val: true, cls: cls || 'pri' }]);
  let tt;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }
  function paintBusy() { const b = $('#tReload'); if (b) b.style.opacity = busy ? '.4' : ''; }

  /* ---------- 화면 ---------- */
  let view = C.tab || 'input';
  let form = { date: today(), h: 0, m: 0, who: '' };
  let tableEnd = null;   // 현황 표의 마지막 날짜 (null = 오늘)
  let editPrayer = false, prayerQuery = '';

  function applyFont() { document.documentElement.style.setProperty('--fs', (C.font || 17) + 'px'); applyTheme(); }
  // 화면 밝기: 'light'(기본, 밝게) · 'dark'(어둡게) · 'auto'(휴대폰 설정 따라감)
  const TABS = [['input', '✍️', '입력'], ['mine', '📅', '내 기록'], ['table', '📊', '현황'], ['prayer', '🙏', '기도제목']];
  function isDark() { const t = C.theme || 'light'; return t === 'dark' || (t === 'auto' && mq('(prefers-color-scheme: dark)')); }
  function applyTheme() {
    const dark = isDark();
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $$('meta[name=theme-color]').forEach(m => { m.removeAttribute('media'); m.setAttribute('content', dark ? '#0d1f1d' : '#0f8f7e'); });
  }
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if ((C.theme || 'light') === 'auto') { applyTheme(); render(); } }); } catch (e) {}

  function render() {
    applyFont();
    const app = $('#app');
    if (!C.server) { app.innerHTML = noServerHtml(); bindNoServer(); return; }
    if (!S) { app.innerHTML = `<div class="welcome">${brandHtml()}<p class="lead">자료를 불러오는 중…</p><div id="loadErr"></div></div>`; return; }
    if (S.me && S.me.claim) { renderClaimWait(); return; }
    if (!myName()) { renderWelcome(); return; }
    document.title = appTitle();
    if (isRosterUser() && !mode) { renderLauncher(); paintInstall(); paintClaims(); return; }
    if (mode === 'att' && isRosterUser()) { renderAttend(); paintInstall(); paintBusy(); paintClaims(); return; }
    const y = window.scrollY;
    const nc = view !== 'prayer' ? newComments() : 0;
    const tabs = TABS.concat(hasSpecial() ? [['special', '🔥', '특별기도']] : []);
    if (view === 'special' && !hasSpecial()) view = 'input';
    document.title = appTitle();
    app.innerHTML = `<header><div class="top">
        <h1 class="htitle">${headerBrand()}</h1>
        ${isRosterUser() ? '<button class="icon" id="tMode" aria-label="출석부로 가기">✅</button>' : ''}
        <button class="icon" id="tTheme" aria-label="밝게·어둡게">${isDark() ? ICON.sun : ICON.moon}</button>
        <button class="icon" id="tFS" aria-label="전체화면">${ICON.fsOn}</button>
        <button class="icon" id="tSet" aria-label="설정">${ICON.gear}</button></div></header>
      <nav class="tabs" style="grid-template-columns:repeat(${tabs.length},1fr)">${tabs.map(([v, ic, l]) => `<button data-v="${v}" class="t-${v}"><span class="ti">${ic}</span><span class="tl">${l}</span>${v === 'prayer' && nc ? `<span class="badge">${nc}</span>` : ''}</button>`).join('')}</nav>
      <main id="main"></main>`;
    $$('.tabs button').forEach(b => { b.classList.toggle('on', b.dataset.v === view); b.onclick = () => go(b.dataset.v); });
    $('#tTheme').onclick = () => { C.theme = isDark() ? 'light' : 'dark'; saveCfg(); applyTheme(); render(); };
    $('#tSet').onclick = settings;
    $('#tFS').onclick = () => FS.toggle();
    const tm = $('#tMode'); if (tm) tm.onclick = () => { mode = 'att'; render(); window.scrollTo(0, 0); };
    const m = $('#main');
    if (view === 'table') (C.stView === 'grid' ? renderTable : renderList)(m); else if (view === 'prayer') renderPrayer(m); else if (view === 'mine') renderMine(m); else if (view === 'special') renderSpecial(m); else renderInput(m);
    paintInstall(); paintBusy(); paintClaims();
    if (view !== 'table') window.scrollTo(0, y);
  }
  function go(v) { view = v; C.tab = v; saveCfg(); editPrayer = false; render(); window.scrollTo(0, 0); }

  function topBanners(noInstall) {
    let h = '';
    if (!online || C.pending.length) h += `<div class="offline">${C.pending.length ? `📶 보내지 못한 기록 ${C.pending.length}개 — 인터넷이 연결되면 자동으로 보내요.` : '📶 인터넷 연결이 안 돼서 저장해 둔 자료를 보여 드려요.'}</div>`;
    if (!noInstall) h += `<div class="banner hidden" id="banner"><span>📲 앱 설치</span>
      <button class="btn pri sm" id="bInst">바로 설치</button><button class="btn sm" id="bFs">전체화면</button><button class="btn ghost sm" id="bNo">다음에</button></div>`;
    return h;
  }
  function bindBanners() {
    const i = $('#bInst'); if (i) i.onclick = installSheet;
    const f = $('#bFs'); if (f) f.onclick = () => FS.toggle();
    const n = $('#bNo'); if (n) n.onclick = () => { C.installDismissed = true; saveCfg(); paintInstall(); };
  }

  /* ----- 입력 ----- */
  function savedFor(who, date) { return dataOf(who)[date] || 0; }
  function setFormDate(d) {
    form.date = d; form.for = (form.who || myName()) + '|' + d;
    const v = savedFor(form.who || myName(), d);
    form.h = Math.floor(v / 60); form.m = v % 60;
  }
  function renderInput(m) {
    const me = myName(), who = form.who || me, t = today();
    if (form.date > t) form.date = t;
    if (form.for !== who + '|' + form.date) setFormDate(form.date);   // 저장된 시간을 칸에 채움
    const saved = savedFor(who, form.date);
    const hOpts = Array.from({ length: 24 }, (_, i) => `<option value="${i}"${i === form.h ? ' selected' : ''}>${i}</option>`).join('');
    const mOpts = Array.from({ length: 60 }, (_, i) => `<option value="${i}"${i === form.m ? ' selected' : ''}>${i}</option>`).join('');
    const quick = [[30, '30분'], [60, '1시간'], [90, '1시간 30분'], [120, '2시간'], [180, '3시간'], [240, '4시간']];
    const cur = form.h * 60 + form.m;
    const nt = S.notices && S.notices[0];
    const nameSel = isMaster()
      ? `<select id="fWho">${[me].concat((S.names || []).filter(n => n !== me).sort(ko)).map(n => `<option value="${esc(n)}"${n === who ? ' selected' : ''}>${esc(n)} 님${n === me ? ' (나)' : ''}</option>`).join('')}</select>`
      : '';
    const d0 = dataOf(who), wk0 = addDays(t, -((parse(t).getDay() + 6) % 7));
    let wsum = 0; Object.keys(d0).forEach(k => { if (k >= wk0 && k <= t) wsum += d0[k]; });
    m.innerHTML = topBanners() +
      (nt ? `<button class="notice one" id="nCard">📢 <span>${esc(nt.text.replace(/\n/g, ' '))}</span></button>` : '') +
      `<div class="card inputcard">
        <div class="hello">${nameSel || `<span>🙏 <b>${esc(me)}</b> 성도님</span><button class="linkbtn" id="fRename">이름 고치기</button>`}</div>
        <div class="field"><label>📆 기도한 날짜</label>
          <div class="datebar"><button class="btn" id="dPrev" aria-label="하루 전">◀</button><input type="date" id="fDate" value="${form.date}" max="${t}"><button class="btn" id="dNext" aria-label="하루 뒤"${form.date >= t ? ' disabled' : ''}>▶</button></div>
          <div class="chips">${[[t, '오늘'], [addDays(t, -1), '어제'], [addDays(t, -2), '그제']].map(([d, l]) => `<button data-d="${d}" class="${d === form.date ? 'on' : ''}">${l}</button>`).join('')}
            <span class="small muted" style="align-self:center;margin-left:4px">${md(form.date)} (${wd(form.date)})</span></div></div>
        <div class="field"><label>⏱️ 기도 시간</label>
          <div class="time"><select id="fH" aria-label="시간">${hOpts}</select><span>시간</span><select id="fM" aria-label="분">${mOpts}</select><span>분</span></div>
          <div class="chips qchips">${quick.map(([v, l]) => `<button data-q="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        ${saved ? `<div class="saved">✅ <b>${hmText(saved)}</b> 저장됨 · 다시 저장하면 바뀌어요</div>` : ''}
        <button class="btn pri big" id="fSave">${saved ? '고쳐서 저장' : '저장하기'}</button>
        <button class="weekline" id="fMine">이번 주 <b>${hmText(wsum)}</b> · 내 기록 보기 ›</button>
      </div>`;
    bindBanners();
    const nc = $('#nCard'); if (nc) nc.onclick = () => showNotices(true);
    const rn = $('#fRename'); if (rn) rn.onclick = renameSelf;
    const fw = $('#fWho'); if (fw) fw.onchange = () => { form.who = fw.value === me ? '' : fw.value; setFormDate(form.date); render(); };
    $('#fDate').onchange = e => { const v = e.target.value; if (!v) return; setFormDate(v > t ? t : v); render(); };
    $('#dPrev').onclick = () => { setFormDate(addDays(form.date, -1)); render(); };
    $('#dNext').onclick = () => { if (form.date < t) { setFormDate(addDays(form.date, 1)); render(); } };
    $$('[data-d]', m).forEach(b => b.onclick = () => { setFormDate(b.dataset.d); render(); });
    $('#fH').onchange = e => { form.h = +e.target.value; paintQuick(); };
    $('#fM').onchange = e => { form.m = +e.target.value; paintQuick(); };
    $$('[data-q]', m).forEach(b => b.onclick = () => { const v = +b.dataset.q; form.h = Math.floor(v / 60); form.m = v % 60; $('#fH').value = form.h; $('#fM').value = form.m; paintQuick(); });
    $('#fSave').onclick = doSave;
    $('#fMine').onclick = () => go('mine');
  }
  function paintQuick() { const cur = form.h * 60 + form.m; $$('[data-q]').forEach(b => b.classList.toggle('on', +b.dataset.q === cur)); }
  /* ----- 내 기록 (달력) ----- */
  let calMonth = null;   // 'YYYY-MM'
  function renderMine(m) {
    const who = form.who || myName(), d = dataOf(who), t = today();
    const mon = calMonth || t.slice(0, 7), first = parse(mon + '-01'), y = first.getFullYear(), mo = first.getMonth();
    const days = new Date(y, mo + 1, 0).getDate(), lead = first.getDay();
    const weekStart = addDays(t, -((parse(t).getDay() + 6) % 7));
    let w = 0, ms = 0, cnt = 0;
    Object.keys(d).forEach(k => { if (k >= weekStart && k <= t) w += d[k]; if (k.slice(0, 7) === mon) { ms += d[k]; cnt++; } });
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div class="cd empty"></div>');
    for (let i = 1; i <= days; i++) {
      const day = mon + '-' + pad(i), v = d[day] || 0, k = (lead + i - 1) % 7, fut = day > t;
      cells.push(`<button class="cd l${lv(v)}${day === t ? ' today' : ''}${k === 0 ? ' sun' : k === 6 ? ' sat' : ''}" data-day="${day}"${fut ? ' disabled' : ''}>
        <span class="dn">${i}</span>${v ? `<span class="dv"><b>${v < 60 ? v : Math.round(v / 6) / 10}</b><small>${v < 60 ? '분' : '시간'}</small></span>` : ''}</button>`);
    }
    const prevM = ymd(new Date(y, mo - 1, 1)).slice(0, 7), nextM = ymd(new Date(y, mo + 1, 1)).slice(0, 7);
    m.innerHTML = topBanners(true) + `
      <div class="stat mystat"><div class="s1"><span>이번 주</span><b>${hmText(w)}</b></div><div class="s2"><span>${mo + 1}월</span><b>${hmText(ms)}</b></div><div class="s3"><span>전체</span><b>${hmText(totalOf(who))}</b></div></div>
      <div class="card calcard">
        <div class="calbar"><button class="btn sm" id="cPrev">◀</button><b>${y}년 ${mo + 1}월${who !== myName() ? ` · ${esc(who)} 님` : ''}</b><button class="btn sm" id="cNext"${nextM > t.slice(0, 7) ? ' disabled' : ''}>▶</button></div>
        <div class="calhead">${WD.map((x, i) => `<span class="${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${x}</span>`).join('')}</div>
        <div class="calgrid">${cells.join('')}</div>
        <p class="small muted calnote">${cnt}일 기도 · 날짜를 누르면 그 날 기록을 넣거나 고쳐요</p>
      </div>`;
    bindBanners();
    $('#cPrev').onclick = () => { calMonth = prevM; render(); };
    $('#cNext').onclick = () => { calMonth = nextM >= t.slice(0, 7) ? null : nextM; render(); };
    $$('[data-day]', m).forEach(b => b.onclick = () => { setFormDate(b.dataset.day); go('input'); });
  }
  async function doSave() {
    const who = form.who || myName(), min = form.h * 60 + form.m, saved = savedFor(who, form.date);
    if (!min && !saved) { toast('기도 시간을 골라 주세요'); return; }
    if (!min && !(await confirmBox('기록 지우기', `${md(form.date)} 기록(${hmText(saved)})을 지울까요?`, '지우기', 'pri'))) return;
    const p = { date: form.date, min };
    if (who !== myName()) p.name = who;
    // 먼저 화면에 반영
    S.data = S.data || {}; S.data[who] = S.data[who] || {};
    if (min) S.data[who][form.date] = min; else delete S.data[who][form.date];
    const btn = $('#fSave'); if (btn) { btn.disabled = true; btn.textContent = '저장하는 중…'; }
    try { await flush(); await api('save', p); toast(`저장했어요 · ${md(form.date)} ${min ? hmText(min) : '지움'}`); }
    catch (e) {
      if (e.server) toast(e.message);
      else { C.pending.push(p); C.state = S; saveCfg(); toast('인터넷이 안 돼서 나중에 보낼게요'); }
    }
    render();
  }

  /* ----- 현황 ----- */
  const PERIODS = [['week', '이번 주'], ['month', '이번 달'], ['prev', '지난달'], ['d30', '최근 30일'], ['all', '전체']];
  function periodRange(p) {
    const t = today();
    if (p === 'week') return [addDays(t, -((parse(t).getDay() + 6) % 7)), t];
    if (p === 'prev') { const d = parse(t.slice(0, 8) + '01'); d.setDate(0); const e = ymd(d); return [e.slice(0, 8) + '01', e]; }
    if (p === 'd30') return [addDays(t, -29), t];
    if (p === 'all') return ['0000-00-00', t];
    return [t.slice(0, 8) + '01', t];
  }
  function sumRange(n, s, e) { const d = dataOf(n); let a = 0, c = 0; for (const k in d) if (k >= s && k <= e) { a += d[k]; c++; } return [a, c]; }
  function sortPeople(list, tot) {
    if (C.stSort === 'time') return list.map(n => [n, tot(n)]).sort((a, b) => b[1] - a[1] || ko(a[0], b[0])).map(x => x[0]);
    return list.sort(ko);
  }
  function statusBar(isList) {
    return `<div class="stbar">
      <div class="seg">${[['list', '한눈에'], ['grid', '날짜별']].map(([v, l]) => `<button data-sv="${v}" class="${(C.stView || 'list') === v ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="seg">${[['name', '가나다순'], ['time', '시간순']].map(([v, l]) => `<button data-ss="${v}" class="${(C.stSort || 'name') === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      ${isList ? `<div class="chips pchips">${PERIODS.map(([v, l]) => `<button data-sp="${v}" class="${(C.stPeriod || 'month') === v ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}`;
  }
  function bindStatusBar() {
    $$('[data-sv]').forEach(b => b.onclick = () => { C.stView = b.dataset.sv; saveCfg(); render(); });
    $$('[data-ss]').forEach(b => b.onclick = () => { C.stSort = b.dataset.ss; saveCfg(); render(); });
    $$('[data-sp]').forEach(b => b.onclick = () => { C.stPeriod = b.dataset.sp; saveCfg(); render(); });
  }
  const lv = min => !min ? 0 : min < 60 ? 1 : min < 120 ? 2 : min < 240 ? 3 : 4;
  function renderList(m) {
    const me = myName(), t = today(), per = C.stPeriod || 'month', [s, e] = periodRange(per);
    const strip = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));
    const byN = {};
    (S.names || []).forEach(n => { const [tot, cnt] = sumRange(n, s, e); byN[n] = { tot, cnt }; });
    const people = sortPeople(Object.keys(byN).filter(n => byN[n].tot > 0), n => byN[n].tot);   // 기도 시간이 0인 분은 보이지 않음
    const max = Math.max(1, ...people.map(n => byN[n].tot));
    const all = people.reduce((a, n) => a + byN[n].tot, 0), active = people.filter(n => byN[n].tot).length;
    const todayCnt = (S.names || []).filter(n => dataOf(n)[t]).length;
    let rank = 0, prev = -1;
    if (!people.length) { m.innerHTML = topBanners(true) + statusBar(true) + '<p class="muted" style="text-align:center;padding:30px 0">이 기간에 기도 기록이 없어요</p>'; bindBanners(); bindStatusBar(); return; }
    const rowsHtml = people.map((n, i) => {
      const r = byN[n]; if (r.tot !== prev) { rank = i + 1; prev = r.tot; }
      const d = dataOf(n);
      const medal = C.stSort === 'time' && r.tot ? (rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank) : '';
      return `<button class="prow${n === me ? ' me' : ''}${r.tot ? '' : ' zero'}" data-person="${esc(n)}">
        ${C.stSort === 'time' ? `<span class="rk">${medal}</span>` : ''}
        <span class="pn">${esc(n)}<small> ${esc(titleOf(n) || '님')}</small></span>
        <span class="pb"><span class="bar"><i style="width:${Math.round(r.tot / max * 100)}%"></i></span>
          <span class="strip">${strip.map(day => `<i class="l${lv(d[day])}${day === t ? ' td' : ''}"></i>`).join('')}</span></span>
        <span class="pt"><b>${r.tot ? hmText(r.tot) : '—'}</b>${r.cnt ? `<small>${r.cnt}일</small>` : ''}</span></button>`;
    }).join('');
    const pl = (PERIODS.find(p => p[0] === per) || ['', ''])[1];
    m.innerHTML = topBanners(true) + statusBar(true) + `
      <div class="stat sumcards"><div><span class="small muted">${pl} 모두</span><b>${hmText(all)}</b></div>
        <div><span class="small muted">기도한 분</span><b>${active}명</b></div><div><span class="small muted">오늘 기도</span><b>${todayCnt}명</b></div></div>
      <div class="plist">${rowsHtml}</div>
      <p class="small muted">막대: ${pl} 기도 시간 · 작은 칸: 최근 2주(진할수록 오래, 테두리 칸이 오늘) · 이름을 누르면 자세히 보여요</p>`;
    bindBanners(); bindStatusBar();
    $$('[data-person]', m).forEach(b => b.onclick = () => personSheet(b.dataset.person));
  }
  function personSheet(n) {
    const d = dataOf(n), t = today(), p = (S.prayers || []).find(x => x.name === n);
    const days = Array.from({ length: 30 }, (_, i) => addDays(t, -i));
    const [w] = sumRange(n, ...periodRange('week')), [mo] = sumRange(n, ...periodRange('month'));
    modal(`<h3>${dispName(n)}${groupChip(n)}</h3>
      <div class="stat"><div><span class="small muted">이번 주</span><b>${hmText(w)}</b></div><div><span class="small muted">이번 달</span><b>${hmText(mo)}</b></div><div><span class="small muted">전체</span><b>${hmText(totalOf(n))}</b></div></div>
      ${p ? `<p class="sect">🙏 기도제목</p><div class="notice">${esc(p.text)}</div>` : ''}
      <p class="sect">최근 30일</p>
      ${isMaster() ? `<button class="btn sm" id="psInfo" style="margin-top:10px">직책·소속 고치기 (마스터)</button>` : ''}
      <ul class="mylist">${days.filter(day => d[day]).map(day => { const k = parse(day).getDay(); return `<li><span class="${k === 0 ? 'sun' : k === 6 ? 'sat' : ''}">${md(day)} (${WD[k]})</span><b>${hmText(d[day])}</b></li>`; }).join('') || '<li class="muted">최근 30일 기록이 없어요</li>'}</ul>`,
      [{ label: '닫기', val: true, cls: 'pri' }], (inn, close) => { const b = $('#psInfo', inn); if (b) b.onclick = () => { close(true); infoEdit(n); }; });
  }

  /* ----- 날짜별 표 ----- */

  function renderTable(m) {
    const t = today(), end = tableEnd || t, start = addDays(end, -39), me = myName();
    const days = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    const winTot = n => days.reduce((a, d) => a + (dataOf(n)[d] || 0), 0);
    const people = sortPeople((S.names || []).filter(n => winTot(n) > 0), winTot);   // 이 기간 기도 시간이 0인 분은 보이지 않음
    const head1 = days.map((d, i) => { const first = i === 0 || d.slice(5, 7) !== days[i - 1].slice(5, 7); return `<th class="mon ${cls(d)}">${first ? (+d.slice(5, 7)) + '월' : ''}</th>`; }).join('');
    const head2 = days.map(d => `<th class="${cls(d)}${d === t ? ' today' : ''}">${+d.slice(8)}</th>`).join('');
    const head3 = days.map(d => `<th class="${cls(d)}">${wd(d)}</th>`).join('');
    const sumDay = {};
    const body = people.map(n => {
      const d = dataOf(n);
      return `<tr class="${n === me ? 'me' : ''}"><th class="c1">${esc(n)}<span class="t"> ${esc(titleOf(n) || '님')}</span></th><td class="c2">${hmText(totalOf(n))}</td>${days.map(day => { if (d[day]) sumDay[day] = (sumDay[day] || 0) + d[day]; return `<td class="${cls(day)}">${cellText(d[day])}</td>`; }).join('')}</tr>`;
    }).join('');
    const all = people.reduce((a, n) => a + totalOf(n), 0);
    const foot = `<tr><th class="c1">모두</th><td class="c2">${hmText(all)}</td>${days.map(d => `<td class="${cls(d)}">${sumDay[d] ? Math.round(sumDay[d] / 60) : ''}</td>`).join('')}</tr>`;
    m.innerHTML = topBanners(true) + statusBar(false) + `<div class="tablebar"><button class="btn sm" id="tPrev">◀ 이전</button><div class="range">${md(start)} ~ ${md(end)}</div><button class="btn sm" id="tNext"${end >= t ? ' disabled' : ''}>다음 ▶</button></div>
      <div class="tablewrap" id="tw"><table class="grid"><thead>
        <tr><th class="c1">이름</th><th class="c2">합계</th>${head1}</tr>
        <tr><th class="c1"></th><th class="c2"></th>${head2}</tr>
        <tr><th class="c1"></th><th class="c2"></th>${head3}</tr></thead>
        <tbody>${body}${foot}</tbody></table></div>
      <p class="small muted">가나다순 · 합계는 전체 기간 · 칸의 숫자는 시간(1시간 미만은 분) · 맨 아래 ‘모두’는 그날 모두 합친 시간 · 내 줄은 노란색</p>`;
    bindBanners(); bindStatusBar();
    $('#tPrev').onclick = () => { tableEnd = addDays(end, -40); render(); };
    $('#tNext').onclick = () => { const n = addDays(end, 40); tableEnd = n >= t ? null : n; render(); };
    const tw = $('#tw'); if (tw && !tableEnd) tw.scrollLeft = tw.scrollWidth;
    // 내 줄이 보이게
    const mine = $('tr.me', tw); if (mine && tw) { const top = mine.offsetTop - 100; if (top > tw.clientHeight / 2) tw.scrollTop = top; }
  }
  function cls(d) { const k = parse(d).getDay(); return k === 6 ? 'wsat' : k === 0 ? 'wsun' : ''; }

  /* ----- 기도제목 ----- */
  function renderPrayer(m) {
    const me = myName(), list = (S.prayers || []).slice();
    const mine = list.find(p => p.name === me);
    if (C.sort === 'name') list.sort((a, b) => ko(a.name, b.name)); else list.sort((a, b) => b.at - a.at);
    const q = prayerQuery.trim();
    const shown = list.filter(p => !q || p.name.includes(q) || p.text.includes(q));
    const myCard = editPrayer || !mine
      ? `<div class="card"><h2>내 기도제목</h2><textarea id="pText" placeholder="함께 기도할 제목을 적어 주세요.\n성도님마다 하나씩 올라가고, 다시 저장하면 바뀌어요.">${esc(mine ? mine.text : '')}</textarea>
          <div class="row" style="margin-top:10px;justify-content:flex-end">${mine ? '<button class="btn danger" id="pDel">지우기</button><button class="btn" id="pCancel">취소</button>' : ''}<button class="btn pri" id="pSave">올리기</button></div></div>`
      : postHtml(mine, true);
    const newCnt = newComments();
    if (newCnt) { openCmt.add(me); setTimeout(() => { C.seenCmt = Date.now(); saveCfg(); }, 0); }
    m.innerHTML = topBanners(true) + myCard +
      `<div class="row search"><input type="text" id="pQ" placeholder="이름이나 내용으로 찾기" value="${esc(prayerQuery)}" style="flex:1">
        <button class="btn sm" id="pSort">${C.sort === 'name' ? '가나다순' : '최근순'}</button></div>
      <p class="small muted" style="margin:0 0 8px">기도제목 ${list.length}개</p>
      <div id="pList">${shown.filter(p => p.name !== me).map(postHtml).join('') || '<p class="muted">아직 올라온 기도제목이 없어요.</p>'}</div>`;
    bindBanners();
    const ed = $('#pEdit'); if (ed) ed.onclick = () => { editPrayer = true; render(); const ta = $('#pText'); if (ta) ta.focus(); };
    const cc = $('#pCancel'); if (cc) cc.onclick = () => { editPrayer = false; render(); };
    const sv = $('#pSave'); if (sv) sv.onclick = async () => {
      const text = $('#pText').value.trim(); if (!text) { toast('기도제목을 적어 주세요'); return; }
      sv.disabled = true; try { await api('prayer', { text }); editPrayer = false; toast('기도제목을 올렸어요'); } catch (e) { toast(e.message); } render();
    };
    const dl = $('#pDel'); if (dl) dl.onclick = async () => {
      if (!(await confirmBox('기도제목 지우기', '내 기도제목을 지울까요?', '지우기'))) return;
      try { await api('prayer', { text: '' }); editPrayer = false; toast('지웠어요'); } catch (e) { toast(e.message); } render();
    };
    const pq = $('#pQ'); pq.oninput = () => { prayerQuery = pq.value; const l = $('#pList'); const qq = pq.value.trim();
      l.innerHTML = list.filter(p => p.name !== me && (!qq || p.name.includes(qq) || p.text.includes(qq))).map(postHtml).join('') || '<p class="muted">찾는 기도제목이 없어요.</p>'; bindPosts(); };
    $('#pSort').onclick = () => { C.sort = C.sort === 'name' ? 'recent' : 'name'; saveCfg(); render(); };
    bindPosts();
  }
  const REACTS = [['heart', '❤️', '사랑해요'], ['like', '👍', '좋아요'], ['smile', '😄', '웃음'], ['pray', '🙏', '기도할게요']];
  const openCmt = new Set();
  const commentsOf = n => (S.comments || []).filter(c => c.to === n).sort((a, b) => a.at - b.at);
  function newComments() {
    const me = myName(), seen = C.seenCmt || 0;
    return (S && S.comments || []).filter(c => c.to === me && c.by !== me && c.at > seen).length;
  }
  const when = at => { const d = new Date(at), t = today(), k = ymd(d); return (k === t ? '오늘' : md(k)) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  function postHtml(p, isMine) {
    const me = myName(), rs = (S.reacts || {})[p.name] || {}, cs = commentsOf(p.name), open = openCmt.has(p.name) || (isMine && newComments() > 0);
    const seen = C.seenCmt || 0;
    const who = REACTS.map(([k, e]) => (rs[k] || []).length ? e + ' ' + (rs[k] || []).map(esc).join(', ') : '').filter(Boolean).join('  ·  ');
    return `<div class="post${isMine ? ' mine' : ''}" data-post="${esc(p.name)}">
      <div class="who"><b>${dispName(p.name)}${groupChip(p.name)}${isMine ? ' <span class="small muted">(나)</span>' : ''}</b><span class="small muted">${md(ymd(new Date(p.at)))}${!isMine && isMaster() ? ` <button class="btn ghost sm" data-pm="${esc(p.name)}">관리</button>` : ''}</span></div>
      <div class="txt">${esc(p.text)}</div>
      <div class="reacts">${REACTS.map(([k, e, l]) => { const arr = rs[k] || []; return `<button class="rx${arr.includes(me) ? ' on' : ''}" data-rx="${k}" data-to="${esc(p.name)}" aria-label="${l}" title="${l}"><span>${e}</span>${arr.length ? `<b>${arr.length}</b>` : ''}</button>`; }).join('')}
        <button class="rx cm${open ? ' on' : ''}" data-cm="${esc(p.name)}">💬 댓글${cs.length ? ` <b>${cs.length}</b>` : ''}</button>
        ${isMine ? '<button class="btn sm" id="pEdit" style="margin-left:auto">고치기</button>' : ''}</div>
      ${open ? `<div class="cmts">
        ${who ? `<p class="small muted rxwho">${who}</p>` : ''}
        ${cs.map(c => `<div class="cmt${isMine && c.by !== me && c.at > seen ? ' new' : ''}"><div class="ch"><b>${esc(c.by)} 님</b><span class="small muted">${when(c.at)}</span>
          ${c.by === me || isMine || isStaff() ? `<button class="btn ghost sm" data-cd="${esc(c.id)}">지우기</button>` : ''}</div><div class="txt">${esc(c.text)}</div></div>`).join('') || '<p class="small muted" style="margin:4px 0">첫 댓글을 남겨 주세요.</p>'}
        <div class="cin"><textarea rows="1" placeholder="댓글 달기" data-ci="${esc(p.name)}" maxlength="500"></textarea><button class="btn pri sm" data-cs="${esc(p.name)}">올리기</button></div>
      </div>` : ''}
    </div>`;
  }
  function bindPosts() {
    $$('[data-rx]').forEach(b => b.onclick = async () => {
      const to = b.dataset.to, kind = b.dataset.rx, me = myName();
      // 먼저 화면에 반영
      S.reacts = S.reacts || {}; const o = S.reacts[to] = S.reacts[to] || {}; const arr = o[kind] = o[kind] || [];
      const i = arr.indexOf(me); if (i >= 0) arr.splice(i, 1); else arr.push(me);
      rerenderPost(to);
      try { await api('react', { to, kind }); } catch (e) { toast(e.message); }
      rerenderPost(to);
    });
    $$('[data-cm]').forEach(b => b.onclick = () => {
      const n = b.dataset.cm; if (openCmt.has(n)) openCmt.delete(n); else openCmt.add(n);
      rerenderPost(n);
      if (openCmt.has(n)) { const ta = $(`[data-ci="${CSS.escape(n)}"]`); if (ta) ta.focus(); }
    });
    $$('[data-cs]').forEach(b => b.onclick = async () => {
      const to = b.dataset.cs, ta = $(`[data-ci="${CSS.escape(to)}"]`), text = ta ? ta.value.trim() : '';
      if (!text) { toast('댓글 내용을 적어 주세요'); return; }
      b.disabled = true;
      try { await api('comment', { to, text }); openCmt.add(to); if (ta) ta.value = ''; toast('댓글을 달았어요'); } catch (e) { toast(e.message); b.disabled = false; return; }
      rerenderPost(to);
    });
    $$('[data-ci]').forEach(ta => ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; });
    $$('[data-cd]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('댓글 지우기', '이 댓글을 지울까요?', '지우기'))) return;
      const c = (S.comments || []).find(x => x.id === b.dataset.cd);
      try { await api('delComment', { id: b.dataset.cd }); toast('지웠어요'); } catch (e) { toast(e.message); }
      if (c) rerenderPost(c.to);
    });
    const ed = $('#pEdit'); if (ed) ed.onclick = () => { editPrayer = true; render(); const ta = $('#pText'); if (ta) ta.focus(); };
    bindManage();
  }
  // 글 하나만 다시 그림 (쓰던 댓글·스크롤 위치 유지)
  function rerenderPost(n) {
    const el = $(`[data-post="${CSS.escape(n)}"]`); if (!el) { render(); return; }
    const p = (S.prayers || []).find(x => x.name === n); if (!p) { render(); return; }
    const ta = $('[data-ci]', el), draft = ta ? ta.value : '';
    const tmp = document.createElement('div'); tmp.innerHTML = postHtml(p, n === myName()); el.replaceWith(tmp.firstElementChild);
    const nta = $(`[data-ci="${CSS.escape(n)}"]`); if (nta && draft) nta.value = draft;
    bindPosts();
  }
  function bindManage() {
    $$('[data-pm]').forEach(b => b.onclick = async () => {
      const name = b.dataset.pm, p = (S.prayers || []).find(x => x.name === name); if (!p) return;
      let text = p.text;
      const v = await modal(`<h3>${esc(name)} 님 기도제목 (마스터)</h3><textarea id="mP">${esc(p.text)}</textarea>`,
        [{ label: '지우기', val: 'del', cls: 'danger' }, { label: '취소', val: false }, { label: '저장', val: 'save', cls: 'pri' }],
        inn => { $('#mP', inn).oninput = e => text = e.target.value; });
      if (!v) return;
      if (v === 'del' && !(await confirmBox('기도제목 지우기', `${esc(name)} 성도님의 기도제목을 지울까요?`, '지우기'))) return;
      try { await api('prayer', { name, text: v === 'del' ? '' : text }); toast('바꿨어요'); } catch (e) { toast(e.message); }
      render();
    });
  }

  /* ----- 특별기도 (기간마다: 기도 대상 고르기 · 기도표 · 일정 · 예배 인원) ----- */
  const GRADES = ['중1', '중2', '중3', '고1', '고2', '고3', '예비청년', '청년1년차', '청년2~4년차', '청년5~6년차', '청년7~11년차', '청년12~15년차', '청년16년차~'];
  // 부서: 중·고 → 학생부, '청년'·'년차' → 청년부, 그 밖 → 기타
  const divOf = g => /^(중|고)\s*\d/.test(g || '') ? '학생부' : /청년|년차/.test(g || '') ? '청년부' : '기타';
  const SPS = () => (S && S.sp) || { camps: [], targets: [], picks: {}, log: {}, events: [], att: {} };
  const hasSpecial = () => SPS().camps.length > 0 || isMaster();
  const gradeIdx = g => { const i = GRADES.indexOf(g); return i < 0 ? 99 : i; };
  const dayDiff = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const dotDate = s => s.slice(0, 4) + '.' + (+s.slice(5, 7)) + '.' + (+s.slice(8));
  let spState = { who: '', div: '', grade: '', tEnd: null, tView: 'grid', showHow: false };
  function campsSorted() { return SPS().camps.slice().sort((a, b) => b.start.localeCompare(a.start)); }
  // 고른 특별기도 → 진행 중 → 앞으로 할 것 → 가장 최근 것
  function curCamp() {
    const cs = campsSorted(), t = today();
    return cs.find(c => c.id === C.spCamp) || cs.find(c => c.start <= t && t <= c.end) || cs.slice().reverse().find(c => c.start > t) || cs[0] || null;
  }
  const campTargets = c => SPS().targets.filter(x => x.camp === c.id).sort((a, b) => DEPTS.indexOf(a.dept) - DEPTS.indexOf(b.dept) || (a.gk - b.gk) || ko(a.name, b.name));
  // 목표 인원: 출석부(대상 부서 출석 인원 합) — 선생님이 직접 넣은 날은 그 숫자
  function goalSeries(c) {
    const man = SPS().att[c.id] || {}, cnt = (S && S.cnt) || {}, out = {}, t = today();
    Object.keys(c.scope || {}).forEach(d => Object.keys(cnt[d] || {}).forEach(day => { if (day < c.start || day > t) return; const o = out[day] = out[day] || { n: 0, note: '출석부', auto: true }; o.n += cnt[d][day]; }));
    Object.keys(man).forEach(day => { out[day] = Object.assign({}, man[day]); });
    return out;
  }
  const picksOf = (c, n) => ((SPS().picks[c.id] || {})[n] || []).filter(id => SPS().targets.some(x => x.id === id));
  function pickersOf(c, tid) { const o = SPS().picks[c.id] || {}; return Object.keys(o).filter(n => o[n].includes(tid)).sort(ko); }
  const logOf = (c, n) => ((SPS().log[c.id] || {})[n] || {});
  const spWho = () => (isMaster() && spState.who) || myName();
  const tName = id => (SPS().targets.find(x => x.id === id) || {}).name || '';

  /* 사진: 서버에서 한 번 받아 이 기기(IndexedDB)에 저장 */
  const photoMem = {}, photoBusy = new Set(), photoMiss = new Set();
  const hue = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  function photoHtml(x, size) {
    const m = photoMem[x.id], has = m && m.data && m.v === x.pv;
    return `<span class="ph ${size || ''}" data-ph="${esc(x.id)}" style="--h:${hue(x.name)}">${has ? `<img src="${m.data}" alt="">` : `<span>${esc(String(x.name || '?').slice(-2))}</span>`}</span>`;
  }
  function paintPhotos() {
    $$('[data-ph]').forEach(el => {
      const m = photoMem[el.dataset.ph], x = SPS().targets.find(y => y.id === el.dataset.ph);
      if (m && x && m.v === x.pv && m.data && !el.querySelector('img')) el.innerHTML = `<img src="${m.data}" alt="">`;
    });
  }
  async function loadPhotos(list) {
    const need = []; let got = false;
    for (const x of list) {
      if (!x.pv || photoBusy.has(x.id) || photoMiss.has(x.id + x.pv)) continue;
      const m = photoMem[x.id]; if (m && m.v === x.pv) continue;
      const c = await kvGet('ph:' + x.id);
      if (c && c.v === x.pv) { photoMem[x.id] = c; got = true; continue; }
      need.push(x);
    }
    if (got) paintPhotos();
    for (let i = 0; i < need.length; i += 20) {
      const part = need.slice(i, i + 20), ids = part.map(x => x.id);
      ids.forEach(id => photoBusy.add(id));
      try {
        const d = await api('photos', { ids }), ps = d.photos || {};
        part.forEach(x => { const p = ps[x.id]; if (p) { photoMem[x.id] = p; kvSet('ph:' + x.id, p); } if (!p || p.v !== x.pv) photoMiss.add(x.id + x.pv); });
        paintPhotos();
      } catch (e) {} finally { ids.forEach(id => photoBusy.delete(id)); }
    }
  }
  // 얼굴 사진: 가운데(조금 위쪽)를 정사각형으로 잘라 작게 줄임 (시트 칸 하나에 들어가게)
  function facePhoto(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = () => rej(new Error('사진을 읽지 못했어요'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => rej(new Error('사진 파일이 아니에요'));
        img.onload = () => {
          let size = 240, q = 0.82, d = '';
          for (let k = 0; k < 8; k++) {
            const s = Math.min(img.width, img.height), sx = (img.width - s) / 2, sy = (img.height - s) * 0.3;
            const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
            const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.drawImage(img, sx, sy, s, s, 0, 0, size, size);
            d = cv.toDataURL('image/jpeg', q);
            if (d.length <= 45000) break;
            if (q > 0.5) q -= 0.12; else size = Math.round(size * 0.8);
          }
          if (d.length > 45000) rej(new Error('사진이 너무 커요')); else res(d);
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function renderSpecial(m) {
    const c = curCamp();
    if (!c) {
      m.innerHTML = topBanners(true) + `<div class="card"><h2>🔥 특별기도</h2><p class="muted">지금 진행 중인 특별기도가 없어요.</p>${isMaster() ? '<button class="btn pri" id="spNew">특별기도 만들기</button>' : ''}</div>`;
      bindBanners(); const b = $('#spNew'); if (b) b.onclick = () => campEdit(null); return;
    }
    const sub = C.spSub || 'mine';
    m.innerHTML = topBanners(true) + campHead(c) +
      `<div class="seg spseg">${[['mine', '🙏', '내 기도'], ['pick', '👆', '고르기'], ['table', '📋', '기도표'], ['info', '📅', '일정·인원']].map(([v, ic, l]) => `<button data-sps="${v}" class="${sub === v ? 'on' : ''}"><span>${ic}</span>${l}</button>`).join('')}</div><div id="spBody"></div>`;
    bindBanners();
    $$('[data-sps]', m).forEach(b => b.onclick = () => { C.spSub = b.dataset.sps; saveCfg(); render(); });
    const sel = $('#spCamp'); if (sel) sel.onchange = () => { C.spCamp = sel.value; saveCfg(); spState.tEnd = null; render(); };
    const hw = $('#spHow'); if (hw) hw.onclick = () => { spState.showHow = !spState.showHow; render(); };
    const ce = $('#spEditCamp'); if (ce) ce.onclick = () => campEdit(c);
    ({ mine: spMine, pick: spPick, table: spTable, info: spInfo }[sub] || spMine)($('#spBody'), c);
    loadPhotos(campTargets(c));
  }
  function campHead(c) {
    const cs = campsSorted(), t = today(), att = goalSeries(c), days = Object.keys(att).sort();
    const lastN = days.length ? att[days[days.length - 1]].n : 0, maxN = days.reduce((a, d) => Math.max(a, att[d].n), 0);
    const passed = dayDiff(c.start, t) + 1;
    const status = t < c.start ? `시작까지 D-${dayDiff(t, c.start)}` : t > c.end ? '끝났어요' : `${passed}일째 · 끝까지 ${dayDiff(t, c.end)}일`;
    const pct = c.goalN ? Math.min(100, Math.round(lastN / c.goalN * 100)) : 0;
    return `<div class="card sphead">
      ${cs.length > 1 ? `<select id="spCamp" class="spsel" aria-label="특별기도 고르기">${cs.map(x => `<option value="${esc(x.id)}"${x.id === c.id ? ' selected' : ''}>${esc(x.title)} (${dotDate(x.start)}~)</option>`).join('')}</select>` : ''}
      <div class="sptitle"><h2>🔥 ${esc(c.title)}</h2>${isMaster() ? '<button class="linkbtn" id="spEditCamp">고치기</button>' : ''}</div>
      <p class="small muted spdate">${dotDate(c.start)} ~ ${dotDate(c.end)} · <b>${status}</b></p>
      ${c.goalN ? `<div class="goal"><div class="goalt"><span>🎯 ${esc(c.goal || '목표')}</span><b>${lastN} / ${c.goalN}명</b></div>
        <div class="bar big"><i style="width:${pct}%"></i></div>
        <span class="small muted">${days.length ? `최근 예배 ${md(days[days.length - 1])} 기준${maxN > lastN ? ` · 가장 많았던 날 ${maxN}명` : ''}` : '출석부에 출석을 넣으면 인원이 저절로 나와요'}</span></div>` : (c.goal ? `<p class="goalp">🎯 ${esc(c.goal)}</p>` : '')}
      ${c.how ? `<button class="howbtn" id="spHow">${spState.showHow ? '기도 방법 접기 ▲' : '📢 기도 방법 보기 ▼'}</button>${spState.showHow ? `<div class="notice how">${esc(c.how)}</div>` : ''}` : ''}
    </div>`;
  }
  function whoSelect(who) {
    if (!isMaster()) return '';
    const me = myName();
    return `<div class="row spwho"><span class="small muted">누구의 기도 (마스터)</span><select id="spWho">${[me].concat((S.names || []).filter(n => n !== me).sort(ko)).map(n => `<option value="${esc(n)}"${n === who ? ' selected' : ''}>${esc(n)}${n === me ? ' (나)' : ''}</option>`).join('')}</select></div>`;
  }
  function bindWho(el) { const w = $('#spWho', el); if (w) w.onchange = () => { spState.who = w.value === myName() ? '' : w.value; render(); }; }

  /* 내 기도: 오늘 기도했어요 + 내가 기도할 사람 */
  function spMine(el, c) {
    const t = today(), me = myName(), who = spWho(), all = campTargets(c);
    const my = picksOf(c, who).map(id => all.find(x => x.id === id)).filter(Boolean);
    const lg = logOf(c, who), inRange = t >= c.start && t <= c.end, done = !!lg[t], cnt = Object.keys(lg).length;
    let streak = 0; for (let d = done ? t : addDays(t, -1); lg[d]; d = addDays(d, -1)) streak++;
    el.innerHTML = whoSelect(who) +
      (inRange ? `<button class="btn big todaybtn${done ? ' done' : ''}" id="spToday">${done ? '✅ 오늘 기도했어요' : `🙏 오늘 ${my.length ? '이 ' + my.length + '명을 위해 ' : ''}기도했어요`}</button>
        <p class="small muted center">${done ? '잘못 눌렀으면 한 번 더 누르면 지워져요 · ' : ''}${cnt}일 기도${streak > 1 ? ` · ${streak}일 연속 🔥` : ''}</p>` : `<p class="small muted center">${t < c.start ? md(c.start) + '부터 시작해요' : '끝난 특별기도예요'} · ${cnt}일 기도</p>`) +
      `<div class="card"><h2>${who === me ? '내가' : esc(who) + ' 님이'} 기도할 사람 <span class="small muted">(${my.length}/${c.picks}명)</span></h2>
        <div class="mypicks">${my.map(x => myPickHtml(c, x, who, t <= c.end)).join('')}
        ${t <= c.end ? Array.from({ length: Math.max(0, c.picks - my.length) }, () => '<button class="slot" data-gopick>＋ <span>기도할 사람 고르기</span></button>').join('') : ''}</div>
        ${!my.length && t > c.end ? '<p class="muted small">고른 사람이 없어요</p>' : ''}
      </div>`;
    bindWho(el);
    const tb = $('#spToday', el); if (tb) tb.onclick = () => toggleSp(c, who, t);
    $$('[data-gopick]', el).forEach(b => b.onclick = () => { C.spSub = 'pick'; saveCfg(); render(); window.scrollTo(0, 0); });
    $$('[data-unpick]', el).forEach(b => b.onclick = () => doPick(c, b.dataset.unpick, false));
  }
  function myPickHtml(c, x, who, canEdit) {
    const others = pickersOf(c, x.id).filter(n => n !== who);
    return `<div class="mp">${photoHtml(x, 'lg')}<div class="mpi"><b>${esc(x.name)}</b>${x.grade ? ` <span class="tag">${esc(x.grade)}</span>` : ''}
      ${x.note ? `<p class="small mpn">${esc(x.note)}</p>` : ''}
      <p class="small muted">${others.length ? '함께 기도하는 분: ' + others.map(esc).join(', ') : '아직 나만 기도하고 있어요'}</p></div>
      ${canEdit ? `<button class="btn ghost sm" data-unpick="${esc(x.id)}">빼기</button>` : ''}</div>`;
  }
  async function doPick(c, tid, on) {
    const who = spWho();
    if (on && picksOf(c, who).length >= c.picks) { toast(`${c.picks}명까지 고를 수 있어요. 먼저 한 명을 빼 주세요`); return; }
    if (!on && !(await confirmBox('기도 대상 빼기', `<b>${esc(tName(tid))}</b>을(를) 기도할 사람에서 뺄까요?`, '빼기'))) return;
    const p = { camp: c.id, target: tid, on }; if (who !== myName()) p.name = who;
    try {
      await api('pick', p);
      const n = picksOf(c, who).length;
      toast(on ? `${tName(tid)} — 기도할게요 🙏${n < c.picks ? ` (${c.picks - n}명 더 고를 수 있어요)` : ''}` : '뺐어요');
    } catch (e) { toast(e.message); }
    render();
  }
  async function toggleSp(c, who, d) {
    const L = SPS().log, cl = L[c.id] = L[c.id] || {}, o = cl[who] = cl[who] || {}, on = !o[d];
    if (on) o[d] = 1; else delete o[d];
    render();
    const p = { camp: c.id, date: d, on }; if (who !== myName()) p.name = who;
    try { await api('spCheck', p); toast(on ? `${md(d)} 기도를 기록했어요 🙏` : `${md(d)} 기록을 지웠어요`); }
    catch (e) { toast(e.message); if (on) delete o[d]; else o[d] = 1; }
    render();
  }

  /* 고르기: 사진 카드 */
  function spPick(el, c) {
    const who = spWho(), mine = picksOf(c, who), all = campTargets(c), ended = today() > c.end;
    const dv = x => x.dept || divOf(x.grade), divs = DEPTS.filter(d => all.some(x => dv(x) === d));
    if (spState.div && !divs.includes(spState.div)) spState.div = '';
    const inDiv = all.filter(x => !spState.div || dv(x) === spState.div);
    const gk = {}; inDiv.forEach(x => { const g = x.grade || '학년 없음'; gk[g] = Math.min(gk[g] == null ? 999 : gk[g], x.gk == null ? 999 : x.gk); });
    const grades = Object.keys(gk).sort((a, b) => gk[a] - gk[b] || ko(a, b));
    if (spState.grade && !grades.includes(spState.grade)) spState.grade = '';
    let list = inDiv.filter(x => !spState.grade || (x.grade || '학년 없음') === spState.grade);
    const srt = C.spSort || 'few';
    if (srt === 'few') list = list.slice().sort((a, b) => pickersOf(c, a.id).length - pickersOf(c, b.id).length);
    else if (srt === 'name') list = list.slice().sort((a, b) => ko(a.name, b.name));
    const none = all.filter(x => !pickersOf(c, x.id).length).length;
    el.innerHTML = whoSelect(who) +
      `<p class="pickinfo">${ended ? '끝난 특별기도예요.' : `<b>${mine.length} / ${c.picks}명</b> 골랐어요 · 사진을 누르면 고르거나 빼요`}${none ? `<br><span class="small">🙋 아직 기도해 주는 분이 없는 사람 <b>${none}명</b></span>` : ''}</p>
      ${isRosterUser() ? '<button class="btn addt" id="tRoster">📋 기도 대상(학생·청년)은 출석부 명단에서 넣고 고쳐요 →</button>' : ''}
      ${all.length ? `${divs.length > 1 ? `<div class="seg divseg"><button data-dv="" class="${!spState.div ? 'on' : ''}">전체 ${all.length}</button>${divs.map(d => `<button data-dv="${d}" class="${spState.div === d ? 'on' : ''}">${d} ${all.filter(x => dv(x) === d).length}</button>`).join('')}</div>` : ''}
      ${grades.length > 1 ? `<div class="gchips"><button data-gr="" class="${!spState.grade ? 'on' : ''}">전체</button>${grades.map(g => `<button data-gr="${esc(g)}" class="${spState.grade === g ? 'on' : ''}">${esc(g.replace(/^청년(?=\d)/, ''))}<small>${inDiv.filter(x => (x.grade || '학년 없음') === g).length}</small></button>`).join('')}</div>` : ''}
      <div class="seg sortseg">${[['few', '기도자 적은 순'], ['grade', '학년순'], ['name', '이름순']].map(([v, l]) => `<button data-sso="${v}" class="${srt === v ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}
      <div class="tgrid">${list.map(x => {
        const ps = pickersOf(c, x.id), on = mine.includes(x.id);
        return `<div class="tc${on ? ' on' : ''}${ps.length ? '' : ' lonely'}">
          <button class="tcb" data-tpick="${esc(x.id)}"${ended ? ' disabled' : ''} aria-pressed="${on}">${photoHtml(x)}${on ? '<span class="tick">✓</span>' : ''}
            <b class="tn">${esc(x.name)}</b>${x.grade ? `<span class="tag">${esc(x.grade)}</span>` : ''}
            <span class="pc">🙏 ${ps.length}명</span>
            <span class="pw">${ps.length ? ps.map(esc).join(', ') : '기도해 줄 분을 기다려요'}</span></button>
          ${personOf(x.id) ? `<button class="tedit" data-tedit="${esc(x.id)}">✏️ 사진·정보</button>` : ''}</div>`;
      }).join('') || `<p class="muted">아직 기도 대상이 없어요.${isRosterUser() ? ' 출석부 명단에 넣으면 여기 나와요.' : ' 선생님이 곧 올려 주실 거예요.'}</p>`}</div>`;
    bindWho(el);
    const tr = $('#tRoster', el); if (tr) tr.onclick = () => { const d = myDepts().find(x => (c.scope || {})[x]); if (d) C.attDept = d; mode = 'att'; saveCfg(); render(); window.scrollTo(0, 0); };
    $$('[data-dv]', el).forEach(b => b.onclick = () => { spState.div = b.dataset.dv; spState.grade = ''; render(); });
    $$('[data-gr]', el).forEach(b => b.onclick = () => { spState.grade = b.dataset.gr; render(); });
    $$('[data-sso]', el).forEach(b => b.onclick = () => { C.spSort = b.dataset.sso; saveCfg(); render(); });
    $$('[data-tpick]', el).forEach(b => b.onclick = () => doPick(c, b.dataset.tpick, !mine.includes(b.dataset.tpick)));
    $$('[data-tedit]', el).forEach(b => b.onclick = () => personCard(b.dataset.tedit));
  }

  /* 기도표 */
  function spTable(el, c) {
    const v = spState.tView;
    el.innerHTML = `<div class="seg sortseg">${[['grid', '날짜별 기도표'], ['byT', '사람별 기도자'], ['byM', '성도별 선택']].map(([k, l]) => `<button data-stv="${k}" class="${v === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="stBody"></div>`;
    $$('[data-stv]', el).forEach(b => b.onclick = () => { spState.tView = b.dataset.stv; render(); });
    const body = $('#stBody', el);
    if (v === 'byT') spByTarget(body, c); else if (v === 'byM') spByMember(body, c); else spGrid(body, c);
  }
  function spPeople(c) {
    const set = new Set(Object.keys(SPS().picks[c.id] || {}).filter(n => picksOf(c, n).length).concat(Object.keys(SPS().log[c.id] || {}).filter(n => Object.keys(logOf(c, n)).length)));
    if (myName()) set.add(myName());
    return [...set].sort(ko);
  }
  function spGrid(el, c) {
    const t = today();
    if (t < c.start) { el.innerHTML = `<p class="muted">${md(c.start)}부터 기록할 수 있어요.</p>`; return; }
    const last = t < c.end ? t : c.end, end = spState.tEnd && spState.tEnd < last ? spState.tEnd : last;
    let start = addDays(end, -27); if (start < c.start) start = c.start;
    const days = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    const me = myName(), ppl = spPeople(c), sum = {};
    const head1 = days.map((d, i) => `<th class="mon ${cls(d)}">${i === 0 || d.slice(8) === '01' ? (+d.slice(5, 7)) + '월' : ''}</th>`).join('');
    const head2 = days.map(d => `<th class="${cls(d)}${d === t ? ' today' : ''}">${+d.slice(8)}</th>`).join('');
    const head3 = days.map(d => `<th class="${cls(d)}">${wd(d)}</th>`).join('');
    const body = ppl.map(n => {
      const lg = logOf(c, n), tot = Object.keys(lg).length, can = n === me || isMaster();
      return `<tr class="${n === me ? 'me' : ''}"><th class="c1">${esc(n)}</th><td class="c2">${tot}일</td>${days.map(d => { if (lg[d]) sum[d] = (sum[d] || 0) + 1; return `<td class="${cls(d)}${can ? ' tap' : ''}"${can ? ` data-spc="${esc(n)}|${d}"` : ''}>${lg[d] ? '✅' : ''}</td>`; }).join('')}</tr>`;
    }).join('');
    const foot = `<tr><th class="c1">모두</th><td class="c2">${ppl.filter(n => Object.keys(logOf(c, n)).length).length}명</td>${days.map(d => `<td class="${cls(d)}">${sum[d] || ''}</td>`).join('')}</tr>`;
    el.innerHTML = `<div class="tablebar"><button class="btn sm" id="sgPrev"${start <= c.start ? ' disabled' : ''}>◀ 이전</button><div class="range">${md(start)} ~ ${md(end)}</div><button class="btn sm" id="sgNext"${end >= last ? ' disabled' : ''}>다음 ▶</button></div>
      <div class="tablewrap" id="sgw"><table class="grid"><thead><tr><th class="c1">이름</th><th class="c2">기도한 날</th>${head1}</tr><tr><th class="c1"></th><th class="c2"></th>${head2}</tr><tr><th class="c1"></th><th class="c2"></th>${head3}</tr></thead><tbody>${body}${foot}</tbody></table></div>
      <p class="small muted">✅ 그날 기도함 · 내 줄(노란색)의 칸을 누르면 기록하거나 지워요 · 맨 아래 숫자는 그날 기도한 사람 수 · 매일 기도 기록과는 따로예요</p>`;
    $('#sgPrev', el).onclick = () => { spState.tEnd = addDays(start, -1); render(); };
    $('#sgNext', el).onclick = () => { const n = addDays(end, 28); spState.tEnd = n >= last ? null : n; render(); };
    $$('[data-spc]', el).forEach(td => td.onclick = () => { const i = td.dataset.spc.lastIndexOf('|'); toggleSp(c, td.dataset.spc.slice(0, i), td.dataset.spc.slice(i + 1)); });
    const w = $('#sgw', el); if (w && !spState.tEnd) w.scrollLeft = w.scrollWidth;
  }
  function spByTarget(el, c) {
    const list = campTargets(c), me = myName();
    el.innerHTML = `<div class="plist">${list.map(x => {
      const ps = pickersOf(c, x.id);
      return `<div class="trow${ps.includes(me) ? ' me' : ''}">${photoHtml(x, 'sm')}<div class="tri"><b>${esc(x.name)}</b>${x.grade ? ` <span class="tag">${esc(x.grade)}</span>` : ''}<br><span class="small${ps.length ? '' : ' err'}">${ps.length ? ps.map(n => n === me ? `<b>${esc(n)}(나)</b>` : esc(n)).join(', ') : '아직 기도해 주는 분이 없어요'}</span></div><b class="trc">${ps.length}명</b></div>`;
    }).join('') || '<p class="muted" style="padding:12px">기도 대상이 없어요</p>'}</div>`;
  }
  function spByMember(el, c) {
    const o = SPS().picks[c.id] || {}, me = myName();
    const ppl = Object.keys(o).filter(n => picksOf(c, n).length).sort(ko);
    const rest = (S.names || []).filter(n => !picksOf(c, n).length).sort(ko);
    el.innerHTML = `<p class="small muted">${ppl.length}명이 골랐어요</p><div class="plist">${ppl.map(n => `<div class="trow${n === me ? ' me' : ''}"><div class="tri"><b>${esc(n)}</b><br><span class="small">${picksOf(c, n).map(id => esc(tName(id))).join(', ')}</span></div><b class="trc">${picksOf(c, n).length}/${c.picks}</b></div>`).join('') || '<p class="muted" style="padding:12px">아직 고른 분이 없어요</p>'}</div>
      ${rest.length ? `<p class="sect">아직 고르지 않은 분 (${rest.length}명)</p><p class="small muted">${rest.map(esc).join(', ')}</p>` : ''}`;
  }

  /* 일정 · 예배 인원 */
  function spInfo(el, c) {
    const me = myName(), t = today();
    const evs = SPS().events.filter(e => e.camp === c.id).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    const att = goalSeries(c), days = Object.keys(att).sort().reverse();
    const max = Math.max(c.goalN || 0, 1, ...days.map(d => att[d].n));
    el.innerHTML = `<div class="card"><div class="cardh"><h2>📅 일정</h2>${isTeacher() ? '<button class="linkbtn" id="evAdd">＋ 일정 넣기</button>' : ''}</div>
      ${evs.map(e => {
        const go = e.going.includes(me), past = e.date && e.date < t;
        return `<div class="ev"><div class="evd">${e.date ? `<b>${md(e.date)}</b><span>${wd(e.date)}요일</span>` : '<b>날짜</b><span>추후 공지</span>'}</div>
          <div class="evi"><b>${esc(e.title)}</b><div><button class="linkbtn" data-evw="${esc(e.id)}">함께하는 분 ${e.going.length}명</button>${isTeacher() ? ` <button class="linkbtn" data-eved="${esc(e.id)}">고치기</button>` : ''}</div></div>
          <button class="btn sm${go ? ' pri' : ''}" data-join="${esc(e.id)}"${past ? ' disabled' : ''}>${go ? '✓ 참석' : '참석할게요'}</button></div>`;
      }).join('') || '<p class="muted small">아직 일정이 없어요</p>'}</div>
      <div class="card"><div class="cardh"><h2>👥 예배 인원</h2>${isTeacher() ? '<button class="linkbtn" id="atAdd">＋ 인원 넣기</button>' : ''}</div>
        ${days.length ? `<div class="attl">${days.map(d => `<button class="attr"${isTeacher() ? ` data-ated="${d}"` : ' disabled'}><span class="ad">${md(d)} (${wd(d)})</span><span class="bar"><i style="width:${Math.round(att[d].n / max * 100)}%"></i></span><b>${att[d].n}명</b>${att[d].note ? `<small>${esc(att[d].note)}</small>` : ''}</button>`).join('')}</div>` : '<p class="muted small">아직 넣은 예배 인원이 없어요</p>'}
        ${c.goalN ? `<p class="small muted">🎯 목표 ${c.goalN}명</p>` : ''}</div>`;
    const ea = $('#evAdd', el); if (ea) ea.onclick = () => eventEdit(c, null);
    $$('[data-eved]', el).forEach(b => b.onclick = () => eventEdit(c, evs.find(e => e.id === b.dataset.eved)));
    $$('[data-evw]', el).forEach(b => b.onclick = () => { const e = evs.find(x => x.id === b.dataset.evw); modal(`<h3>${esc(e.title)}</h3><p class="msg">${e.going.length ? e.going.slice().sort(ko).map(esc).join(', ') : '아직 참석을 누른 분이 없어요'}</p>`, [{ label: '닫기', val: true, cls: 'pri' }]); });
    $$('[data-join]', el).forEach(b => b.onclick = async () => {
      const e = evs.find(x => x.id === b.dataset.join), on = !e.going.includes(me);
      if (on) e.going.push(me); else e.going.splice(e.going.indexOf(me), 1);
      render();
      try { await api('join', { event: e.id, on }); toast(on ? '참석으로 표시했어요' : '참석을 지웠어요'); } catch (er) { toast(er.message); }
      render();
    });
    const aa = $('#atAdd', el); if (aa) aa.onclick = () => attEdit(c, t);
    $$('[data-ated]', el).forEach(b => b.onclick = () => attEdit(c, b.dataset.ated));
  }

  /* 편집 창: 기도 대상 · 특별기도 · 일정 · 예배 인원 */
  async function campEdit(c) {
    const t = today(), scope = JSON.parse(JSON.stringify((c && c.scope) || {}));
    const v = await modal(`<h3>${c ? '특별기도 고치기' : '새 특별기도 만들기'}</h3>
      <div class="field"><label for="cT">제목</label><input type="text" id="cT" maxlength="60" value="${esc(c ? c.title : '')}" placeholder="예: 학생부·청년부 겨울 대확장"></div>
      <div class="field"><label>기간</label><div class="row" style="flex-wrap:nowrap"><input type="date" id="cS" value="${c ? c.start : t}"><span>~</span><input type="date" id="cE" value="${c ? c.end : addDays(t, 30)}"></div></div>
      <div class="field"><label for="cP">한 사람이 고를 기도 대상 수</label><select id="cP">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option value="${n}"${(c ? c.picks : 3) === n ? ' selected' : ''}>${n}명</option>`).join('')}</select></div>
      <div class="field"><label for="cG">목표</label><input type="text" id="cG" maxlength="300" value="${esc(c ? c.goal : '')}" placeholder="예: 학생부·청년부 예배 인원 50명 이상"></div>
      <div class="field"><label for="cN">목표 인원 <span class="small muted">(숫자 · 없으면 0)</span></label><input type="number" id="cN" min="0" max="9999" inputmode="numeric" value="${c ? c.goalN : 0}"></div>
      <div class="field"><label for="cH">기도 방법 (광고 내용)</label><textarea id="cH" maxlength="2000" placeholder="① …\n② …">${esc(c ? c.how : '')}</textarea></div>
      <div class="field"><label>기도 대상 <span class="small muted">(출석부 명단에서 이 부서·학년인 분이 나와요)</span></label><div id="scB"></div></div>`,
      (c ? [{ label: '지우기', val: 'del', cls: 'danger' }] : []).concat([{ label: '취소', val: false }, { label: '저장', val: 'save', cls: 'pri' }]),
      inn => {
        const box = $('#scB', inn);
        const paint = () => {
          box.innerHTML = DEPTS.map(d => { const v = scope[d], ch = gradeChoices(d);
            return `<div class="scrow${v ? ' on' : ''}"><label class="chk row"><input type="checkbox" data-sd="${d}"${v ? ' checked' : ''}> <b>${d}</b></label>
              ${v && ch.length ? `<div class="chips gpick"><button data-sa="${d}" class="${v === '*' ? 'on' : ''}">전체</button>${ch.map(g => `<button data-sg="${d}|${g}" class="${v !== '*' && v.includes(g) ? 'on' : ''}">${g}</button>`).join('')}</div>` : ''}</div>`; }).join('');
          $$('[data-sd]', box).forEach(x => x.onchange = () => { if (x.checked) scope[x.dataset.sd] = '*'; else delete scope[x.dataset.sd]; paint(); });
          $$('[data-sa]', box).forEach(x => x.onclick = () => { scope[x.dataset.sa] = '*'; paint(); });
          $$('[data-sg]', box).forEach(x => x.onclick = () => { const [d, g] = x.dataset.sg.split('|'); let v = scope[d] === '*' ? [] : (scope[d] || []).slice(); v = v.includes(g) ? v.filter(y => y !== g) : v.concat(g); scope[d] = v.length ? v : '*'; paint(); });
        };
        paint();
      });
    if (!v) return;
    const g = id => { const e = $('#' + id); return e ? e.value.trim() : ''; };
    const p = { title: g('cT'), start: g('cS'), end: g('cE'), picks: +g('cP'), goal: g('cG'), goalN: +g('cN') || 0, how: $('#cH').value, scope };
    try {
      if (v === 'del') {
        if (!(await confirmBox('특별기도 지우기', `<b>${esc(c.title)}</b>을(를) 지울까요?\n앱에서 보이지 않게 돼요(시트에는 남아 있어요).`, '지우기'))) return;
        await api('delCamp', { id: c.id }); C.spCamp = ''; saveCfg(); toast('지웠어요');
      } else {
        if (c) p.id = c.id;
        const d = await api('camp', p);
        if (!c) { C.spCamp = d.savedId; C.spSub = 'pick'; saveCfg(); view = 'special'; C.tab = 'special'; }
        toast('저장했어요');
      }
    } catch (e) { toast(e.message); }
    render();
  }
  async function campList() {
    const cs = campsSorted();
    const v = await modal(`<h3>🔥 특별기도 관리</h3><p class="msg small">특별기도 기간마다 기도 대상·기도표·일정·예배 인원을 따로 관리해요.\n매일 기도 기록과는 섞이지 않아요.</p>
      <ul class="list">${cs.map(x => `<li><div><b>${esc(x.title)}</b><br><span class="small muted">${dotDate(x.start)} ~ ${dotDate(x.end)} · 1인 ${x.picks}명${x.goalN ? ' · 목표 ' + x.goalN + '명' : ''}</span></div><button class="btn sm" data-ce="${esc(x.id)}">고치기</button></li>`).join('') || '<li class="muted">아직 없어요</li>'}</ul>`,
      [{ label: '닫기', val: false }, { label: '＋ 새 특별기도', val: 'new', cls: 'pri' }], (inn, close) => $$('[data-ce]', inn).forEach(b => b.onclick = () => close(b.dataset.ce)));
    if (!v) return;
    await campEdit(v === 'new' ? null : cs.find(x => x.id === v));
  }
  async function eventEdit(c, e) {
    const v = await modal(`<h3>${e ? '일정 고치기' : '일정 넣기'}</h3>
      <div class="field"><label for="eT">일정 이름</label><input type="text" id="eT" maxlength="60" value="${esc(e ? e.title : '')}" placeholder="예: 겨울수련회 · 학생부 헌신예배"></div>
      <div class="field"><label for="eD">날짜 <span class="small muted">(모르면 비워 두세요 = 추후 공지)</span></label><input type="date" id="eD" value="${e ? e.date : ''}"></div>`,
      (e ? [{ label: '지우기', val: 'del', cls: 'danger' }] : []).concat([{ label: '취소', val: false }, { label: '저장', val: 'save', cls: 'pri' }]));
    if (!v) return;
    const title = $('#eT').value.trim(), date = $('#eD').value;
    try {
      if (v === 'del') { if (!(await confirmBox('일정 지우기', `<b>${esc(e.title)}</b>을(를) 지울까요?`, '지우기'))) return; await api('delEvent', { id: e.id }); toast('지웠어요'); }
      else { await api('event', { camp: c.id, id: e ? e.id : '', title, date }); toast('저장했어요'); }
    } catch (er) { toast(er.message); }
    render();
  }
  async function attEdit(c, d) {
    const a = (SPS().att[c.id] || {})[d];
    const v = await modal(`<h3>👥 예배 인원</h3>
      <div class="field"><label for="aD">날짜</label><input type="date" id="aD" value="${d}" max="${today()}"></div>
      <div class="field"><label for="aN">학생부·청년부 예배 인원</label><input type="number" id="aN" min="0" max="9999" inputmode="numeric" value="${a ? a.n : ''}" placeholder="예: 32"></div>
      <div class="field"><label for="aM">메모 <span class="small muted">(예: 새친구 3명)</span></label><input type="text" id="aM" maxlength="60" value="${esc(a ? a.note : '')}"></div>`,
      (a ? [{ label: '지우기', val: 'del', cls: 'danger' }] : []).concat([{ label: '취소', val: false }, { label: '저장', val: 'save', cls: 'pri' }]));
    if (!v) return;
    const date = $('#aD').value, n = $('#aN').value.trim(), note = $('#aM').value.trim();
    if (v === 'save' && n === '') { toast('인원을 넣어 주세요'); return attEdit(c, date || d); }
    try { await api('att', { camp: c.id, date: v === 'del' ? d : date, n: v === 'del' ? '' : n, note }); toast(v === 'del' ? '지웠어요' : '저장했어요'); } catch (er) { toast(er.message); }
    render();
  }

  /* ----- 출석부 (교사·마스터·담임목사): 명단 · 출석 · 심방 ----- */
  let mode = null;   // null: (교사면) 고르는 화면 · 'pray' · 'att'
  const DEPTS = ['유치부', '주일학교', '학생부', '청년부', '1남선교회', '2남선교회', '3남선교회', '4남선교회', '1여선교회', '2여선교회', '3여선교회', '4여선교회'];
  const SCHOOL = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
  const SPECIAL = ['군복무', '유학·타지', '쉬는 중', '전출'];
  const myDepts = () => (S && S.me && S.me.depts) || [];
  const isRosterUser = () => myDepts().length > 0;
  const yearNow = () => +today().slice(0, 4);
  const ageY = (birth, adj) => birth ? yearNow() - +birth + (+adj || 0) : null;
  function labelFor(dept, y, manual) {
    if (y == null) return manual || '';
    if (dept === '청년부') { if (y === 18) return '예비청년'; if (y >= 19) return (y - 18) + '년차'; }
    if (y >= 7 && y <= 18) return SCHOOL[y - 7];
    return (y + 1) + '세';
  }
  // 출석부 칸(구분): 청년부는 예비청년·1년차·2~5년차·6~10년차·11~14년차·15년차 이상, 선교회는 한 칸, 그 밖은 학년(나이)마다
  function sectionOf(m) {
    const y = m.y;
    if (y == null) return { name: m.grade || '학년 미정', k: 900 };
    if (/선교회/.test(m.dept)) return { name: '전체', k: 0 };
    if (m.dept === '청년부' && y >= 18) {
      const G = [[18, 18, '예비청년'], [19, 19, '1년차'], [20, 23, '2~5년차'], [24, 28, '6~10년차'], [29, 32, '11~14년차'], [33, 999, '15년차 이상']];
      const g = G.find(x => y >= x[0] && y <= x[1]); return { name: g[2], k: g[0] };
    }
    return { name: labelFor(m.dept, y, m.grade), k: y };
  }
  // 이 부서에서 고를 수 있는 학년(나이) 버튼 (여러 명 넣기 · 특별기도 대상)
  function gradeChoices(dept) {
    if (dept === '유치부') return ['4세', '5세', '6세', '7세'];
    if (dept === '주일학교') return SCHOOL.slice(0, 6);
    if (dept === '학생부') return SCHOOL.slice(6);
    if (dept === '청년부') return ['예비청년'].concat(Array.from({ length: 15 }, (_, i) => (i + 1) + '년차'));
    return [];
  }
  // 학년(나이) 이름 → 태어난 해
  function birthFromLabel(dept, l) {
    const Y = yearNow(); let y = null, m;
    if (SCHOOL.includes(l)) y = SCHOOL.indexOf(l) + 7;
    else if (l === '예비청년') y = 18;
    else if ((m = l.match(/^(\d+)년차$/))) y = 18 + +m[1];
    else if ((m = l.match(/^(\d+)세$/))) y = +m[1] - 1;
    return y == null ? '' : Y - y;
  }
  // 교사: 맡은 부서에서만 '교사' 칸, 다른 부서 명단에서는 숨김
  const tdOf = n => ((S && S.tdepts) || {})[n];
  const isTeacherIn = m => m.status === '교사' || !!(tdOf(m.name) && tdOf(m.name).includes(m.dept));
  const hiddenHere = m => m.status !== '교사' && !!tdOf(m.name) && !tdOf(m.name).includes(m.dept);
  const rosterOf = d => (S.roster || []).filter(m => m.dept === d && !hiddenHere(m));
  const personOf = id => (S.roster || []).find(m => m.id === id);
  const visitsOf = id => (S.visits || []).filter(v => v.pid === id).sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);
  const telOf = p => String(p || '').replace(/[^\d+]/g, '');

  /* 출석 자료: { 날짜: Set(ID) } — 서버 자료 + 아직 안 보낸 표시 */
  let attCache = { s: null, by: {} };
  function attOf(dept) {
    if (attCache.s !== S) attCache = { s: S, by: {} };
    if (attCache.by[dept]) return attCache.by[dept];
    const r = (S.ratt || {})[dept] || { ids: [], d: {} }, o = {};
    Object.keys(r.d).forEach(day => { o[day] = new Set(r.d[day] ? r.d[day].split(',').map(x => r.ids[parseInt(x, 36)]).filter(Boolean) : []); });
    (C.attQ || []).forEach(q => { const p = personOf(q.id); if (!p || p.dept !== dept) return; const st = o[q.date] = o[q.date] || new Set(); if (q.on) st.add(q.id); else st.delete(q.id); });
    return (attCache.by[dept] = o);
  }
  // 사람별: 최근 1년 출석률, 마지막 출석일
  function attStats(dept) {
    const o = attOf(dept), t = today(), from = addDays(t, -364);
    const days = Object.keys(o).filter(d => o[d].size && d >= from && d <= t).sort();
    const res = {};
    rosterOf(dept).forEach(m => {
      let n = 0, last = '', den = 0;
      days.forEach(d => { if (m.reg && d < m.reg) return; den++; if (o[d].has(m.id)) n++; });
      Object.keys(o).forEach(d => { if (o[d].has(m.id) && d > last) last = d; });
      res[m.id] = { n, den, rate: den ? n / den : 0, last };
    });
    return res;
  }
  const attSent = new Set(); let attTimer = 0, attBusy = false;
  function markAtt(id, date, on) {
    C.attQ = (C.attQ || []).filter(q => !(q.id === id && q.date === date)); C.attQ.push({ id, date, on }); saveCfg();
    const p = personOf(id), st = attOf(p.dept); const set = st[date] = st[date] || new Set(); if (on) set.add(id); else set.delete(id);
    clearTimeout(attTimer); attTimer = setTimeout(flushAtt, 1200);
  }
  async function flushAtt() {
    if (attBusy || !(C.attQ || []).length) return;
    attBusy = true; paintAttSave();
    const list = C.attQ.slice();
    try {
      await api('marks', { list });
      C.attQ = C.attQ.filter(q => !list.includes(q)); saveCfg();
    } catch (e) { if (e.server) { toast(e.message); C.attQ = C.attQ.filter(q => !list.includes(q)); saveCfg(); } }
    finally { attBusy = false; paintAttSave(); }
    if ((C.attQ || []).length) { clearTimeout(attTimer); attTimer = setTimeout(flushAtt, 5000); }
  }
  function paintAttSave() { const el = $('#attSave'); if (!el) return; const n = (C.attQ || []).length; el.textContent = n ? (attBusy ? '저장하는 중…' : `보낼 표시 ${n}개`) : '✓ 저장됨'; el.classList.toggle('pending', !!n); }

  /* 고르는 화면: 기도 / 출석부 */
  function renderLauncher() {
    const app = $('#app');
    app.innerHTML = `<div class="welcome launcher">${brandHtml()}
      <p class="lead">${dispName(myName())}, 어디로 갈까요?</p>
      <button class="lcard" id="goPray"><span class="li">🙏</span><b>기도</b><small>매일 기도 · 특별기도</small></button>
      <button class="lcard att" id="goAtt"><span class="li">✅</span><b>출석부</b><small>${esc(myDepts().length > 4 ? '모든 부서' : myDepts().join(' · '))}</small></button>
    </div>`;
    $('#goPray').onclick = () => { mode = 'pray'; render(); showNotices(false); };
    $('#goAtt').onclick = () => { mode = 'att'; render(); };
  }
  function curDept() {
    const ds = myDepts();
    if (ds.includes(C.attDept)) return C.attDept;
    return ds.find(d => rosterOf(d).length) || ds[0];
  }
  const lastSunday = () => { const t = today(); return addDays(t, -parse(t).getDay()); };
  let attDate = null, attQuery = '', showLong = false, editMode = false, attSel = new Set();
  // 편집: 고른 사람들의 구분·부서를 한꺼번에 바꾸거나 지움
  async function bulkEdit(dept, kind) {
    const ids = [...attSel]; if (!ids.length) { toast('먼저 사람을 눌러 골라 주세요'); return; }
    const names = ids.map(id => (personOf(id) || {}).name).filter(Boolean), head = `<p class="small muted">${names.slice(0, 12).map(esc).join(', ')}${names.length > 12 ? ` 외 ${names.length - 12}명` : ''}</p>`;
    let p = { ids };
    if (kind === 'status') {
      const v = await modal(`<h3>${ids.length}명 — 구분 바꾸기</h3>${head}<div class="chips">${[['', '학년대로 (구분 없음)'], ['교사', '교사']].concat(SPECIAL.map(x => [x, x])).map(([k, l]) => `<button data-bs="${k}">${l}</button>`).join('')}</div>`, [{ label: '취소', val: false }], (inn, close) => $$('[data-bs]', inn).forEach(b => b.onclick = () => close({ v: b.dataset.bs })));
      if (!v) return; p.status = v.v;
    } else if (kind === 'dept') {
      const ds = myDepts().filter(d => d !== dept); if (!ds.length) { toast('옮길 수 있는 다른 부서가 없어요'); return; }
      const v = await modal(`<h3>${ids.length}명 — 부서 옮기기</h3>${head}<div class="chips">${ds.map(d => `<button data-bd="${d}">${d}</button>`).join('')}</div><p class="small muted">출석 기록은 그대로 따라가요.</p>`, [{ label: '취소', val: false }], (inn, close) => $$('[data-bd]', inn).forEach(b => b.onclick = () => close({ v: b.dataset.bd })));
      if (!v) return; p.dept = v.v;
    } else {
      if (!(await confirmBox('명단에서 지우기', `${ids.length}명을 명단에서 지울까요?\n${names.slice(0, 12).map(esc).join(', ')}\n안 나오는 분은 지우지 말고 두면 장기결석으로 내려가요.`, '지우기'))) return; p.del = true;
    }
    try { const d = await api('bulkPerson', p); toast(`${d.changed}명을 바꿨어요`); attSel = new Set(); } catch (e) { toast(e.message); }
    render();
  }

  function renderAttend() {
    const app = $('#app'), dept = curDept(), t = today();
    if (!attDate || attDate > t) attDate = lastSunday();
    const ds = myDepts(), people = rosterOf(dept), st = attStats(dept), o = attOf(dept), present = o[attDate] || new Set();
    const q = attQuery.replace(/\s+/g, '');
    const y0 = window.scrollY;
    // 칸 나누기: 학년(구분)별 · 교사 · 따로 보기 · 장기결석
    const isT = isTeacherIn, normal = [], teachers = [], special = [], long = [], recentLimit = addDays(t, -30), longLimit = addDays(t, -365);
    people.forEach(m => {
      const s = st[m.id];
      if (isT(m)) teachers.push(m);
      else if (SPECIAL.includes(m.status)) special.push(m);
      else if (s.last ? s.last < longLimit : (m.reg && m.reg < longLimit)) long.push(m);
      else normal.push(m);
    });
    const secs = {};
    normal.forEach(m => { const sc = sectionOf(m); (secs[sc.name] = secs[sc.name] || { k: sc.k, list: [] }).list.push(m); });
    const order = (a, b) => { const sa = st[a.id], sb = st[b.id], ra = sa.last >= recentLimit, rb = sb.last >= recentLimit;
      if (ra !== rb) return ra ? -1 : 1; if (ra) return ko(a.name, b.name); return sb.rate - sa.rate || ko(a.name, b.name); };
    const byName = (a, b) => ko(a.name, b.name);
    const groups = Object.keys(secs).sort((a, b) => secs[a].k - secs[b].k || ko(a, b)).map(n => ({ key: n, title: n, list: secs[n].list.sort(order) }));
    if (teachers.length) groups.push({ key: '교사', title: '교사', list: teachers.sort(byName) });
    if (special.length) groups.push({ key: '따로', title: '따로 보기', list: special.sort(byName), sub: '군복무·유학 등' });
    if (long.length) groups.push({ key: '장기', title: '장기결석', list: long.sort(byName), sub: '1년 넘게 안 나옴', long: true });
    C.attSec = C.attSec || {};
    let sel = C.attSec[dept];
    if (sel !== '전체' && !groups.some(g => g.key === sel)) sel = groups.length ? groups[0].key : '전체';
    const showAll = sel === '전체' || !!q;
    const recent = Object.keys(o).filter(d => o[d].size && d < attDate).sort().slice(-8);
    const row = m => {
      const s = st[m.id], on = editMode ? attSel.has(m.id) : present.has(m.id), hide = q && !m.name.includes(q);
      return `<div class="arow${on ? ' on' : ''}${hide ? ' hidden' : ''}"><button class="atap" data-at="${esc(m.id)}">${photoHtml(m, 'xs')}<span class="an"><b>${esc(m.name)}</b><small>${isT(m) ? '교사' : esc(m.label || '')}${m.y != null && m.dept !== '유치부' && !/세$/.test(m.label) ? ` · ${m.y + 1}세` : ''}</small></span><span class="adots8" title="최근 ${recent.length}번">${recent.map(d => `<i class="${o[d].has(m.id) ? 'on' : ''}"></i>`).join('')}</span><span class="amark${editMode ? ' box' : ''}">${on ? '✓' : ''}</span></button>
        <button class="ainfo" data-pi="${esc(m.id)}"><span class="rate r${s.den ? Math.min(4, Math.floor(s.rate * 5)) : 0}">${s.den ? Math.round(s.rate * 100) + '%' : '-'}</span>›</button></div>`;
    };
    const pc = list => list.filter(m => present.has(m.id)).length;
    const secHtml = g => {
      const folded = g.long && showAll && !showLong && !q;
      return `<div class="asec${g.long ? ' long' : ''}" data-sec="${esc(g.key)}">${g.long && showAll ? `<button class="ash" id="aLong">` : '<div class="ash">'}<b>${esc(g.title)}${g.sub ? ` <small>(${g.sub})</small>` : ''}</b><span>${pc(g.list)} / ${g.list.length}${g.long && showAll ? (folded ? ' ▼' : ' ▲') : ''}</span>${g.long && showAll ? '</button>' : '</div>'}${folded ? '' : g.list.map(row).join('')}</div>`;
    };
    const total = people.filter(m => present.has(m.id)).length;
    app.innerHTML = `<header><div class="top">
        <h1 class="htitle"><span>✅ 출석부</span></h1>
        <button class="icon" id="tMode" aria-label="기도로 가기">🙏</button>
        <button class="icon" id="tTheme" aria-label="밝게·어둡게">${isDark() ? ICON.sun : ICON.moon}</button>
        <button class="icon" id="tSet" aria-label="설정">${ICON.gear}</button></div></header>
      <main id="main" class="attmain">
        ${ds.length > 4 ? `<select id="aDept" class="deptsel" aria-label="부서">${ds.map(d => `<option value="${d}"${d === dept ? ' selected' : ''}>${d}${rosterOf(d).length ? ` (${rosterOf(d).length}명)` : ''}</option>`).join('')}</select>`
          : ds.length > 1 ? `<div class="gchips deptchips">${ds.map(d => `<button data-dp="${d}" class="${d === dept ? 'on' : ''}">${d}<small>${rosterOf(d).length || ''}</small></button>`).join('')}</div>` : ''}
        <div class="atools top">
          <button class="btn sm pri" id="aAdd">＋ 한 명</button><button class="btn sm pri" id="aBulk">📋 여러 명</button>
          <button class="btn sm${editMode ? ' pri' : ''}" id="aEdit">✏️ ${editMode ? '편집 끝' : '편집'}</button><button class="btn sm" id="aStat">📊 주별</button>
          ${isMaster() ? '<button class="btn sm" id="aImp">📥 시트 가져오기</button>' : ''}
        </div>
        <div class="attbar card">
          <div class="datebar"><button class="btn" id="aPrev" aria-label="한 주 전">◀</button><input type="date" id="aDate" value="${attDate}" max="${t}"><button class="btn" id="aNext" aria-label="한 주 뒤"${attDate >= t ? ' disabled' : ''}>▶</button></div>
          <div class="attsum"><span><b>${esc(dept)}</b> ${md(attDate)} (${wd(attDate)}) 출석 <b class="big">${total}</b>명 / ${people.length}명</span><span id="attSave" class="attsave"></span></div>
          <input type="text" id="aQ" placeholder="🔍 이름 찾기 (모든 구분에서)" value="${esc(attQuery)}">
        </div>
        ${people.length ? `<div class="gchips sectabs"><button data-sc="전체" class="${sel === '전체' ? 'on' : ''}">전체<small>${total}/${people.length}</small></button>${groups.map(g => `<button data-sc="${esc(g.key)}" class="${sel === g.key ? 'on' : ''}${g.long ? ' dim' : ''}">${esc(g.title)}<small>${pc(g.list)}/${g.list.length}</small></button>`).join('')}</div>`
          : `<div class="card"><p>아직 ${esc(dept)} 명단이 없어요.</p><p class="small muted">${isMaster() ? '위의 [📥 시트 가져오기]로 지금까지의 출석부를 한 번에 넣거나, ' : ''}[＋ 한 명] · [📋 여러 명]으로 넣어 주세요.</p></div>`}
        ${editMode ? '<p class="small ahelp editnote">✏️ 편집: 사람을 눌러 여러 명 고른 뒤 아래에서 구분(교사 등)·부서를 바꾸거나 지워요</p>' : '<p class="small muted ahelp">이름을 누르면 출석 ✓ · 작은 칸은 지난 8번 출석 · 오른쪽 %를 누르면 연락처·심방</p>'}
        ${groups.filter(g => showAll || g.key === sel).map(secHtml).join('')}
      </main>
      ${editMode ? `<div class="editbar"><span id="eCnt">${attSel.size}명 선택</span><button class="btn sm" id="eAll">이 칸 모두</button><button class="btn sm pri" id="eSet">구분</button><button class="btn sm pri" id="eMove">부서</button><button class="btn sm danger" id="eDel">지우기</button></div>` : ''}`;
    paintAttSave();
    $('#tMode').onclick = () => { mode = 'pray'; render(); window.scrollTo(0, 0); };
    $('#tTheme').onclick = () => { C.theme = isDark() ? 'light' : 'dark'; saveCfg(); applyTheme(); render(); };
    $('#tSet').onclick = settings;
    $$('[data-dp]').forEach(b => b.onclick = () => { C.attDept = b.dataset.dp; saveCfg(); attQuery = ''; showLong = false; render(); window.scrollTo(0, 0); });
    const adp = $('#aDept'); if (adp) adp.onchange = () => { attSel = new Set(); C.attDept = adp.value; saveCfg(); attQuery = ''; showLong = false; render(); window.scrollTo(0, 0); };
    $('#aDate').onchange = e => { const v = e.target.value; if (v) { attDate = v > t ? t : v; render(); } };
    $('#aPrev').onclick = () => { attDate = addDays(attDate, -7); render(); };
    $('#aNext').onclick = () => { const n = addDays(attDate, 7); attDate = n > t ? t : n; render(); };
    const aq = $('#aQ'); aq.oninput = () => { const had = !!attQuery.trim(); attQuery = aq.value; const v = attQuery.replace(/\s+/g, '');
      if (had !== !!v || (v && !showAll)) { const pos = aq.selectionStart; render(); const n = $('#aQ'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } return; }
      $$('.arow').forEach(r => { const n = r.querySelector('.an b').textContent; r.classList.toggle('hidden', !!v && !n.includes(v)); }); };
    $$('[data-sc]').forEach(b => b.onclick = () => { C.attSec = C.attSec || {}; C.attSec[dept] = b.dataset.sc; saveCfg(); attQuery = ''; render(); const tb = $('.sectabs'); if (tb) window.scrollTo(0, tb.getBoundingClientRect().top + window.scrollY - 8); });
    $$('[data-at]').forEach(b => b.onclick = () => {
      if (editMode) { const id = b.dataset.at, on = !attSel.has(id); if (on) attSel.add(id); else attSel.delete(id); b.closest('.arow').classList.toggle('on', on); b.querySelector('.amark').textContent = on ? '✓' : ''; const c = $('#eCnt'); if (c) c.textContent = `${attSel.size}명 선택`; return; }
      const id = b.dataset.at, on = !(attOf(dept)[attDate] || new Set()).has(id);
      markAtt(id, attDate, on);
      const r = b.closest('.arow'); r.classList.toggle('on', on); b.querySelector('.amark').textContent = on ? '✓' : '';
      const cnt = (attOf(dept)[attDate] || new Set()).size; const big = $('.attsum .big'); if (big) big.textContent = cnt;
      const now = attOf(dept)[attDate] || new Set();
      $$('.asec').forEach(sec => { const sp = sec.querySelector('.ash span'); if (!sp || sec.classList.contains('long')) return; const ids = $$('[data-at]', sec).map(x => x.dataset.at); sp.textContent = `${ids.filter(i => now.has(i)).length} / ${ids.length}`; });
      const g = groups.find(x => x.list.some(m => m.id === id)); const tb = g && $(`[data-sc="${CSS.escape(g.key)}"] small`); if (tb) tb.textContent = `${pc(g.list)}/${g.list.length}`;
      const ta = $('[data-sc="전체"] small'); if (ta) ta.textContent = `${cnt}/${people.length}`;
      paintAttSave();
    });
    $$('[data-pi]').forEach(b => b.onclick = () => personCard(b.dataset.pi));
    const al = $('#aLong'); if (al) al.onclick = () => { showLong = !showLong; render(); };
    $('#aAdd').onclick = () => personEdit(null, dept);
    $('#aBulk').onclick = () => peopleBulk(dept);
    const ai = $('#aImp'); if (ai) ai.onclick = () => importSheetDlg(dept);
    $('#aEdit').onclick = () => { editMode = !editMode; attSel = new Set(); render(); };
    if (editMode) {
      $('#eAll').onclick = () => { $$('.arow:not(.hidden) [data-at]').forEach(b => { attSel.add(b.dataset.at); b.closest('.arow').classList.add('on'); b.querySelector('.amark').textContent = '✓'; }); $('#eCnt').textContent = `${attSel.size}명 선택`; };
      $('#eSet').onclick = () => bulkEdit(dept, 'status');
      $('#eMove').onclick = () => bulkEdit(dept, 'dept');
      $('#eDel').onclick = () => bulkEdit(dept, 'del');
    }
    $('#aStat').onclick = () => attStatDlg(dept);
    loadPhotos(people.filter(m => m.pv));
    window.scrollTo(0, y0);
  }

  /* 한 사람: 연락처 · 학교 · 비고 · 심방 · 출석 */
  async function personCard(id) {
    const m = personOf(id); if (!m) return;
    const o = attOf(m.dept), st = attStats(m.dept)[id] || {}, vs = visitsOf(id);
    const days = Object.keys(o).filter(d => o[d].size && d >= addDays(today(), -364)).sort().slice(-12);
    const ph = (num, who) => num ? `<div class="crow"><span>${who}</span><b>${esc(num)}</b><a class="btn sm pri" href="tel:${telOf(num)}">📞 전화</a><a class="btn sm" href="sms:${telOf(num)}">💬 문자</a></div>` : '';
    const v = await modal(`<div class="pcard">${photoHtml(m, 'lg')}<div><h3>${esc(m.name)} <span class="tag">${isTeacherIn(m) ? '교사' : esc(m.label || '학년 미정')}</span></h3>
        <p class="small muted">${esc(m.dept)}${m.birth ? ` · ${m.birth}년생 (${m.y + 1}세)` : ''}${m.status ? ` · ${esc(m.status)}` : ''}</p>
        <p class="small">출석률 <b>${st.den ? Math.round(st.rate * 100) + '%' : '-'}</b> (최근 1년 ${st.n || 0}/${st.den || 0}) · 마지막 출석 ${st.last ? md(st.last) : '없음'}</p></div></div>
      <div class="adots">${days.map(d => `<span class="${o[d].has(id) ? 'on' : ''}" title="${d}">${+d.slice(5, 7)}/${+d.slice(8)}</span>`).join('')}</div>
      ${ph(m.phone, '연락처')}${ph(m.phone2, '보호자')}
      ${m.school ? `<div class="crow"><span>학교</span><b>${esc(m.school)}</b></div>` : ''}
      ${m.note ? `<p class="sect">비고</p><div class="notice">${esc(m.note)}</div>` : ''}
      ${m.memo ? `<p class="sect">기도 메모 <span class="small">(특별기도에 보여요)</span></p><div class="notice">${esc(m.memo)}</div>` : ''}
      <p class="sect">심방 기록 (${vs.length}) <button class="linkbtn" id="vAdd" style="float:right">＋ 심방 기록</button></p>
      ${vs.map(x => `<button class="visit" data-vi="${esc(x.id)}"><span><b>${md(x.date)}</b> ${x.date.slice(0, 4)}</span><span class="vt">${esc(x.text)}</span><small>${esc(x.by)}</small></button>`).join('') || '<p class="small muted">아직 심방 기록이 없어요</p>'}`,
      [{ label: '고치기', val: 'edit' }, { label: '닫기', val: false, cls: 'pri' }],
      (inn, close) => {
        $('#vAdd', inn).onclick = () => close('visit');
        $$('[data-vi]', inn).forEach(b => b.onclick = () => close('v:' + b.dataset.vi));
      });
    if (v === 'edit') return personEdit(m, m.dept);
    if (v === 'visit') return visitEdit(m, null);
    if (v && v.startsWith('v:')) return visitEdit(m, vs.find(x => x.id === v.slice(2)));
  }
  async function visitEdit(m, x) {
    const v = await modal(`<h3>${esc(m.name)} — 심방 ${x ? '고치기' : '기록'}</h3>
      <div class="field"><label for="vD">날짜</label><input type="date" id="vD" value="${x ? x.date : today()}" max="${today()}"></div>
      <div class="field"><label for="vT">내용</label><textarea id="vT" placeholder="만난 곳, 나눈 이야기, 기도 제목…">${esc(x ? x.text : '')}</textarea></div>`,
      (x ? [{ label: '지우기', val: 'del', cls: 'danger' }] : []).concat([{ label: '취소', val: false }, { label: '저장', val: 'save', cls: 'pri', check: () => { if (!$('#vT').value.trim()) { toast('내용을 적어 주세요'); return false; } return true; } }]),
      inn => setTimeout(() => { try { $('#vT', inn).focus(); } catch (e) {} }, 80));
    if (!v) return personCard(m.id);
    const date = $('#vD').value, text = $('#vT').value;
    try {
      if (v === 'del') { if (!(await confirmBox('심방 기록 지우기', '이 기록을 지울까요?', '지우기'))) return personCard(m.id); await api('delVisit', { id: x.id }); toast('지웠어요'); }
      else { await api('visit', { pid: m.id, id: x ? x.id : '', date, text }); toast('심방 기록을 저장했어요'); }
    } catch (e) { toast(e.message); }
    render(); personCard(m.id);
  }
  async function personEdit(m, dept) {
    let photo = null;
    const cur = () => photo != null ? photo : (m && photoMem[m.id] && photoMem[m.id].v === m.pv && photoMem[m.id].data) || '';
    const preview = (b, a, g) => { const y = ageY(b, a); return y == null ? (g ? `학년(직접): ${g}` : '태어난 해를 넣으면 학년이 저절로 나와요') : `${yearNow()}년: <b>${labelFor(dept, y, g)}</b> (${y + 1}세) · 해가 바뀌면 저절로 올라가요`; };
    const v = await modal(`<h3>${m ? esc(m.name) + ' 고치기' : esc(dept) + ' — 한 명 넣기'}</h3>
      <div class="tphoto"><div id="tpv" class="ph xl" style="--h:${hue(m ? m.name : '')}">${cur() ? `<img src="${cur()}" alt="">` : '<span>사진</span>'}</div>
        <div class="tpb"><label class="btn sm pri">📷 사진 고르기<input type="file" id="tpf" accept="image/*" hidden></label>${m && m.pv ? '<button class="btn sm ghost" id="tpd">사진 지우기</button>' : ''}</div></div>
      <div class="field"><label for="eN">이름</label><input type="text" id="eN" maxlength="12" value="${esc(m ? m.name : '')}"></div>
      <div class="field"><label for="eB">태어난 해</label><div class="row" style="flex-wrap:nowrap"><input type="number" id="eB" inputmode="numeric" min="1900" max="${yearNow()}" placeholder="예: 2010" value="${m ? m.birth : ''}">
        <select id="eA" style="max-width:9em;font-size:1em"><option value="0">조정 없음</option><option value="-1"${m && m.adj === -1 ? ' selected' : ''}>한 학년 아래</option><option value="1"${m && m.adj === 1 ? ' selected' : ''}>한 학년 위</option></select></div>
        ${gradeChoices(dept).length ? `<div class="chips gpick">${gradeChoices(dept).map(g => `<button data-gl="${g}">${g}</button>`).join('')}</div>` : ''}
        <p class="small muted" id="eP" style="margin:6px 0 0">${preview(m && m.birth, m && m.adj, m && m.grade)}</p></div>
      <div class="field"><label for="eG">학년(직접) <span class="small muted">(태어난 해를 모를 때만)</span></label><input type="text" id="eG" maxlength="12" value="${esc(m ? m.grade : '')}"></div>
      <div class="field"><label for="eS">학교·직장</label><input type="text" id="eS" maxlength="30" value="${esc(m ? m.school : '')}"></div>
      <div class="field"><label for="eP1">연락처</label><input type="tel" id="eP1" maxlength="20" value="${esc(m ? m.phone : '')}" placeholder="010-0000-0000"></div>
      <div class="field"><label for="eP2">보호자 연락처</label><input type="tel" id="eP2" maxlength="20" value="${esc(m ? m.phone2 : '')}"></div>
      <div class="field"><label for="eT">비고 <span class="small muted">(교사만 봐요)</span></label><textarea id="eT" style="min-height:80px">${esc(m ? m.note : '')}</textarea></div>
      <div class="field"><label for="eM">기도 메모 <span class="small muted">(특별기도 카드에 모두에게 보여요)</span></label><textarea id="eM" maxlength="200" style="min-height:60px">${esc(m ? m.memo : '')}</textarea></div>
      <div class="field"><label for="eSt">구분 <span class="small muted">(교사 칸 · 따로 보기)</span></label><select id="eSt" style="font-size:1em"><option value="">학년대로</option>${['교사'].concat(SPECIAL).map(x => `<option${m && m.status === x ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
      ${!m && myDepts().length > 1 ? '' : ''}`,
      (m ? [{ label: '지우기', val: 'del', cls: 'danger' }] : []).concat([{ label: '취소', val: false }, { label: '저장', val: 'save', cls: 'pri', check: () => { if (!$('#eN').value.trim()) { toast('이름을 넣어 주세요'); return false; } return true; } }]),
      inn => {
        const b = $('#eB', inn), a = $('#eA', inn), g = $('#eG', inn), p = $('#eP', inn), paint = () => { p.innerHTML = preview(b.value, a.value, g.value.trim()); };
        b.oninput = paint; a.onchange = paint; g.oninput = paint;
        $$('[data-gl]', inn).forEach(x => x.onclick = () => { b.value = birthFromLabel(dept, x.dataset.gl); a.value = '0'; paint(); });
        $('#tpf', inn).onchange = async e => { const f = e.target.files && e.target.files[0]; if (!f) return; try { photo = await facePhoto(f); $('#tpv', inn).innerHTML = `<img src="${photo}" alt="">`; } catch (er) { toast(er.message); } };
        const pd = $('#tpd', inn); if (pd) pd.onclick = () => { photo = ''; $('#tpv', inn).innerHTML = '<span>사진</span>'; };
        if (!m) setTimeout(() => { try { $('#eN', inn).focus(); } catch (e) {} }, 80);
      });
    if (!v) { if (m) personCard(m.id); return; }
    const g = id => $('#' + id).value;
    const p = { dept, name: g('eN'), birth: g('eB'), adj: +g('eA'), grade: g('eG'), school: g('eS'), phone: g('eP1'), phone2: g('eP2'), note: g('eT'), memo: g('eM'), status: g('eSt') };
    try {
      if (v === 'del') {
        if (!(await confirmBox('명단에서 지우기', `<b>${esc(m.name)}</b>을(를) 명단에서 지울까요?\n출석 기록도 함께 보이지 않게 돼요. 안 나오는 분은 지우지 말고 그냥 두면 장기결석으로 내려가요.`, '지우기'))) return;
        await api('delPerson', { id: m.id }); toast('지웠어요'); render(); return;
      }
      if (m) p.id = m.id; if (photo != null) p.photo = photo;
      const d = await api('person', p);
      if (photo) { const nm = personOf(d.savedId); if (nm) { photoMem[nm.id] = { v: nm.pv, data: photo }; kvSet('ph:' + nm.id, photoMem[nm.id]); } }
      toast(m ? '고쳤어요' : `${p.name} — 넣었어요`);
      render();
      if (m) personCard(m.id); else if (await confirmBox('한 명 더', '한 명 더 넣을까요?', '더 넣기')) personEdit(null, dept);
    } catch (e) { toast(e.message); render(); }
  }
  // 여러 명: '임동현(19)' · '홍길동 2010' · 그냥 이름 (학년 버튼을 고르면 모두 그 학년)
  function parsePeople(t, dept, label) {
    const Y = yearNow(), out = [], seen = new Set();
    String(t || '').split(/[\n\t,;]+/).forEach(line => {
      const s = line.replace(/　/g, ' ').trim(); if (!s) return;
      let m = s.match(/^([가-힣A-Za-z][가-힣A-Za-z\s]{0,8}?)\s*(?:\(\s*(\d{1,2})\s*\)|\s(\d{4}))?\s*$/); if (!m) return;
      const name = m[1].replace(/\s+/g, ''); if (name.length < 2 || /^(이름|합계|주차|출석률|반출석률|예비청년)$/.test(name)) return;
      const birth = m[2] ? Y - +m[2] + 1 : m[3] ? +m[3] : (label ? birthFromLabel(dept, label) : '');
      const k = name + '|' + birth; if (seen.has(k)) return; seen.add(k);
      out.push({ name, birth, grade: !birth && label ? label : '' });
    });
    return out;
  }
  async function peopleBulk(dept) {
    let label = '', text = '';
    const v = await modal(`<h3>📋 ${esc(dept)} — 여러 명 한번에</h3>
      <p class="msg small">한 줄에 한 명씩 붙여 넣으세요. 구글 시트 출석부에서 이름 칸을 쭉 복사해도 돼요.\n‘임동현(19)’처럼 나이(한국 나이)가 있으면 태어난 해를 알아서 넣고, ‘홍길동 2010’처럼 태어난 해를 적어도 돼요. 이미 있는 분은 건너뛰어요.</p>
      ${gradeChoices(dept).length ? `<div class="field"><label>나이가 안 적힌 분의 학년 <span class="small muted">(고르면 모두 그 학년)</span></label><div class="chips gpick">${gradeChoices(dept).map(g => `<button data-bl="${g}">${g}</button>`).join('')}</div></div>` : ''}
      <div class="field"><textarea id="bT" placeholder="임동현(19)\n윤환희(19)\n홍길동 2010" style="min-height:160px"></textarea><p class="small muted" id="bC" style="margin:6px 0 0">0명</p></div>`,
      [{ label: '취소', val: false }, { label: '넣기', val: true, cls: 'pri', check: () => { if (!parsePeople(text, dept, label).length) { toast('이름을 붙여 넣어 주세요'); return false; } return true; } }],
      inn => {
        const have = new Set(rosterOf(dept).map(m => m.name));
        const c = $('#bC', inn), paint = () => { const ps = parsePeople(text, dept, label), dup = ps.filter(x => have.has(x.name)).length; c.innerHTML = ps.length ? `<b>${ps.length - dup}명</b> 넣어요${dup ? ` · 이미 있는 ${dup}명은 건너뜀` : ''}<br>` + ps.slice(0, 30).map(x => have.has(x.name) ? `<s class="muted">${esc(x.name)}</s>` : esc(x.name) + (x.birth ? `<small>(${labelFor(dept, yearNow() - x.birth, '')})</small>` : '')).join(', ') + (ps.length > 30 ? ' …' : '') : '0명'; };
        $$('[data-bl]', inn).forEach(b => b.onclick = () => { label = label === b.dataset.bl ? '' : b.dataset.bl; $$('[data-bl]', inn).forEach(x => x.classList.toggle('on', x.dataset.bl === label)); paint(); });
        $('#bT', inn).oninput = e => { text = e.target.value; paint(); };
      });
    if (!v) return;
    try { const d = await api('people', { dept, list: parsePeople(text, dept, label) }); toast(`${d.added}명을 넣었어요`); } catch (e) { toast(e.message); }
    render();
  }
  async function importSheetDlg(dept) {
    let url = C.attUrl && C.attUrl[dept] || '';
    const v = await modal(`<h3>📥 ${esc(dept)} — 구글 시트에서 가져오기</h3>
      <p class="msg small">지금까지 쓰던 출석부 구글 시트의 주소를 붙여 넣으세요.\n‘26.11’, ‘26.10’처럼 달마다 있는 시트를 모두 읽어서 <b>명단(이름·나이)</b>과 <b>출석(○)</b>을 넣어요.\n· 이미 있는 분은 이름(과 나이)으로 찾아 출석만 더해요.\n· 여러 번 해도 겹치지 않아요(예전에 가져온 것은 새로 바꿔요). 앱에서 직접 누른 출석은 그대로 둬요.\n· 시간이 조금(1분 안팎) 걸릴 수 있어요.</p>
      <div class="field"><label for="iU">시트 주소</label><input type="text" id="iU" value="${esc(url)}" placeholder="https://docs.google.com/spreadsheets/d/…"></div>`,
      [{ label: '취소', val: false }, { label: '가져오기', val: true, cls: 'pri', check: () => /docs\.google\.com\/spreadsheets\/d\//.test($('#iU').value) || (toast('구글 시트 주소를 넣어 주세요'), false) }]);
    if (!v) return;
    url = $('#iU').value.trim(); C.attUrl = Object.assign({}, C.attUrl, { [dept]: url }); saveCfg();
    try {
      const d = await api('importSheet', { dept, url }), r = d.imported || {};
      modal(`<h3>가져왔어요</h3><p class="msg">시트 ${r.sheets}개를 읽었어요.\n새로 넣은 분 <b>${r.added}명</b>, 이미 있던 분 ${r.matched}명\n출석 표시 <b>${r.marks}개</b></p><p class="small muted">나이가 시트와 다르게 나온 분은 그 분을 눌러 [고치기]에서 ‘한 학년 아래/위’로 맞추면 돼요.</p>`, [{ label: '확인', val: true, cls: 'pri' }]);
    } catch (e) { toast(e.message); }
    render();
  }
  function attStatDlg(dept) {
    const o = attOf(dept), days = Object.keys(o).filter(d => o[d].size).sort().slice(-16).reverse(), max = Math.max(1, ...days.map(d => o[d].size));
    modal(`<h3>📊 ${esc(dept)} 주별 출석 인원</h3><div class="attl">${days.map(d => `<div class="attr"><span class="ad">${md(d)} (${wd(d)})</span><span class="bar"><i style="width:${Math.round(o[d].size / max * 100)}%"></i></span><b>${o[d].size}명</b></div>`).join('') || '<p class="muted small">아직 출석 기록이 없어요</p>'}</div>`, [{ label: '닫기', val: true, cls: 'pri' }]);
  }
  window.addEventListener('online', () => flushAtt());

  /* ----- 공지 ----- */
  async function showNotices(all) {
    const list = (S && S.notices || []).filter(n => all || !C.hideNotices.includes(n.id));
    if (!list.length) return;
    const v = await modal(`<h3>📢 공지</h3>${list.map(n => `<div class="notice">${esc(n.text)}<small>${md(ymd(new Date(n.at)))}${n.by ? ' · ' + esc(n.by) : ''}</small></div>`).join('')}`,
      all ? [{ label: '닫기', val: true, cls: 'pri' }] : [{ label: '다시 보지 않기', val: 'hide' }, { label: '확인', val: true, cls: 'pri' }]);
    if (v === 'hide') { list.forEach(n => { if (!C.hideNotices.includes(n.id)) C.hideNotices.push(n.id); }); saveCfg(); }
  }

  /* ----- 이름 고르기 ----- */
  // 이름 직접 적기 (다른 사람 이름 목록은 보여 주지 않음)
  function nameInput(inn, value, okLabel, onOk, church, title) {
    inn.innerHTML = `<div class="field"><label for="nIn">이름 <span class="small muted">(성함만)</span></label>
      <input type="text" id="nIn" placeholder="예: 홍길동" maxlength="12" autocomplete="name" value="${esc(value || '')}"></div>
      <div class="field"><label for="nTi">직책 <span class="small muted">(예: 집사, 권사, 장로 · 없으면 비워 두세요)</span></label>
      <input type="text" id="nTi" placeholder="직접 적어 주세요" maxlength="10" value="${esc(title || '')}"></div>
      <div class="field" style="margin:0"><label for="nCh">소속</label>
      <select id="nCh"><option value="">고르지 않음</option>${GROUPS.map(g => `<option${g === church ? ' selected' : ''}>${g}</option>`).join('')}</select></div>
      <button class="btn pri big" id="nOk" style="margin-top:14px">${esc(okLabel)}</button>`;
    const i = $('#nIn', inn), ch = $('#nCh', inn), ti = $('#nTi', inn);
    let going = false;   // 처리하는 동안 다시 눌러도 무시
    const go = async () => {
      if (going) return;
      const v = i.value.replace(/\s+/g, '').replace(/님$/, ''); if (v.length < 2) { toast('이름을 두 글자 이상 적어 주세요'); i.focus(); return; }
      going = true; const b = $('#nOk', inn); if (b) b.disabled = true;
      try { await onOk(v, ch.value, ti.value.replace(/\s+/g, '')); } finally { going = false; if (b && document.body.contains(b)) b.disabled = false; }
    };
    $('#nOk', inn).onclick = go;
    const enter = e => { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); if (e.target === i) ti.focus(); else go(); } };
    i.onkeydown = enter; ti.onkeydown = enter;
    setTimeout(() => { try { i.focus(); } catch (e) {} }, 80);
  }
  function renderWelcome() {
    const app = $('#app');
    app.innerHTML = `<div class="welcome">${brandHtml()}
      <p class="lead">처음 한 번만 이름을 적어 주세요.<br>이 기기에 저장되어 다음부터는 바로 들어가요.</p><div class="card" id="pick"></div></div>`;
    nameInput($('#pick'), '', '시작하기', async (n, church, title) => {
      if (!(await confirmBox('이름 확인', `<b>${esc(n)} ${esc(title || '성도님')}</b>${church ? ` (${esc(church)})` : ''}이 맞으세요?
이 이름이 이 기기에 저장돼요.`, '네, 맞아요'))) return;
      const r = await setNameFlow(n, church, title);
      if (r === 'ok' || r === 'new') { toast(myName() + ' 님, 환영합니다'); view = 'input'; render(); if (isRosterUser()) return; if (!C.tourDone) startTour(0); else showNotices(false); } else render();
    });
  }
  const GROUPS = ['유치부', '주일학교', '학생부', '청년부', '1남선교회', '2남선교회', '3남선교회', '4남선교회', '1여선교회', '2여선교회', '3여선교회', '4여선교회'];
  // 이름 정하기: 이미 있는 이름이면 본인(폰 바꿈 → 마스터 승인)인지 동명이인인지 물어봄
  async function setNameFlow(n, church, title) {
    try { await api('setName', { name: n, church, title }); return 'ok'; }
    catch (e) {
      if (!(e.data && e.data.error === 'exists')) { toast(e.message); return 'err'; }
      const x = e.data.exist || {}, info = [x.title, x.church].filter(Boolean).join(' · ');
      const v = await modal(`<h3>이미 ‘${esc(n)}’ 님이 계세요</h3>
        <div class="notice" style="text-align:center;font-size:1.1em"><b>${esc(n)}</b>${info ? ` ${esc(info)}` : ''}</div>
        <p class="msg">이 분이 본인이세요?\n· <b>네, 저예요</b>: 폰을 바꿨거나 앱을 다시 깔았을 때예요. 마스터가 확인하고 승인하면 예전 기록 그대로 쓸 수 있어요.\n· <b>아니에요</b>: 이름만 같은 다른 분이에요. 직책·소속을 붙여 따로 들어가요.</p>`,
        [{ label: '취소', val: false }, { label: '아니에요, 동명이인이에요', val: 'new' }, { label: '네, 저예요', val: 'claim', cls: 'pri' }]);
      if (!v) return 'cancel';
      if (v === 'new' && !church && !title) { await modal('<h3>직책이나 소속을 넣어 주세요</h3><p class="msg">이름이 같은 분과 구분하려고 해요.\n직책(예: 집사)이나 소속(예: 2남선교회)을 넣고 다시 눌러 주세요.</p>', [{ label: '알겠어요', val: true, cls: 'pri' }]); return 'cancel'; }
      try { await api('setName', { name: n, church, title, mode: v }); } catch (e2) { toast(e2.message); return 'err'; }
      return v;
    }
  }
  function renderClaimWait() {
    $('#app').innerHTML = `<div class="welcome">${brandHtml()}<div class="card claimwait"><h2>⏳ 마스터 승인을 기다려요</h2>
      <p>‘<b>${esc(S.me.claim)}</b>’ 님으로 들어가려고 해요.<br>마스터가 확인하고 승인하면 바로 열려요.</p>
      <button class="btn pri big" id="cwR">승인됐는지 확인</button><button class="btn ghost" id="cwC" style="margin-top:8px;width:100%">취소하고 이름 다시 넣기</button></div></div>`;
    $('#cwR').onclick = async () => { await refresh(); if (S.me && S.me.claim) toast('아직 승인 전이에요'); };
    $('#cwC').onclick = async () => { try { await api('cancelClaim'); } catch (e) { toast(e.message); } render(); };
  }
  // 마스터: 폰 바꿈 승인 알림
  function paintClaims() {
    let b = $('#claimBadge'); const n = isMaster() ? (S.claims || []).length : 0;
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('button'); b.id = 'claimBadge'; b.className = 'claimbadge'; document.body.appendChild(b); }
    b.textContent = `📱 승인 기다림 ${n}`; b.onclick = claimsMenu;
  }
  async function claimsMenu() {
    const cl = S.claims || [];
    const act = await modal(`<h3>📱 폰 바꿈 승인</h3><p class="msg small">이미 있는 이름으로 새 기기가 들어오려고 해요. 본인이 맞는지 확인하고 승인해 주세요.\n승인하면 그 기기가 그 분의 기록·기도제목을 그대로 써요. 모르는 기기면 거절하세요.</p>
      <ul class="list">${cl.map(c => `<li><div><b>${esc(c.name)}</b> ${esc([c.title, c.church].filter(Boolean).join(' · '))}<br><span class="small muted">새 기기: ${esc(c.desc || '')} · ${c.at ? when(c.at) : ''}</span></div><span class="rbtns"><button class="btn sm danger" data-cn="${esc(c.id)}">거절</button><button class="btn sm pri" data-cy="${esc(c.id)}">승인</button></span></li>`).join('') || '<li class="muted">기다리는 기기가 없어요</li>'}</ul>`,
      [{ label: '닫기', val: false, cls: 'pri' }], (inn, close) => { $$('[data-cy]', inn).forEach(b => b.onclick = () => close({ id: b.dataset.cy, yes: true })); $$('[data-cn]', inn).forEach(b => b.onclick = () => close({ id: b.dataset.cn, yes: false })); });
    if (!act) return;
    try { await api('approve', { target: act.id, yes: act.yes }); toast(act.yes ? '승인했어요' : '거절했어요'); } catch (e) { toast(e.message); }
    render(); if ((S.claims || []).length) claimsMenu();
  }
  const churchOf = n => (S && S.churches && S.churches[n]) || '';
  const titleOf = n => (S && S.titles && S.titles[n]) || '';
  const dispName = n => esc(n) + ' ' + esc(titleOf(n) || '님');   // 홍길동 집사 · 이름만 있으면 홍길동 님
  const groupChip = n => churchOf(n) ? ` <span class="church">${esc(churchOf(n))}</span>` : '';
  // 마스터: 다른 분의 직책·소속 고치기
  async function infoEdit(n) {
    const v = await modal(`<h3>${esc(n)} — 직책·소속</h3>
      <div class="field"><label for="iTi">직책</label><input type="text" id="iTi" maxlength="10" value="${esc(titleOf(n))}" placeholder="예: 집사"></div>
      <div class="field"><label for="iCh">소속</label><select id="iCh"><option value="">고르지 않음</option>${GROUPS.map(g => `<option${g === churchOf(n) ? ' selected' : ''}>${g}</option>`).join('')}</select></div>`,
      [{ label: '취소', val: false }, { label: '저장', val: true, cls: 'pri' }]);
    if (!v) return;
    try { await api('setInfo', { name: n, title: $('#iTi').value.replace(/\s+/g, ''), church: $('#iCh').value }); toast('고쳤어요'); } catch (e) { toast(e.message); }
    render();
  }

  /* ----- 로고 (마스터가 올림) ----- */
  const LOGO_KEY = 'church-prayer-logo';
  let logo = load(LOGO_KEY, { v: '', data: '', opts: {} }), logoBusy = false;
  const logoOpt = () => (S && S.logo) || logo.opts || {};
  function brandHtml() {
    const o = logoOpt();
    if (o.welcome && logo.data) return `<img class="brandimg" src="${logo.data}" alt="교회">${o.title !== false ? '<h1>' + esc(appTitle()) + '</h1>' : ''}`;
    return '<img class="logo" src="icon-192.png" alt=""><h1>' + esc(appTitle()) + '</h1>';
  }
  function headerBrand() {
    const o = logoOpt();
    if (o.header && logo.data) return `<img class="hlogo ${o.size || 'm'}" src="${logo.data}" alt="교회">${o.title !== false ? '<span>' + esc(appTitle()) + '</span>' : ''}`;
    return '<span>' + esc(appTitle()) + '</span>';
  }
  // 서버의 로고 판 번호가 바뀌면 그림을 새로 받아 이 기기에 저장
  async function checkLogo() {
    const o = (S && S.logo) || {};
    if (!o.v) { if (logo.data) { logo = { v: '', data: '', opts: o }; save(LOGO_KEY, logo); setTimeout(render, 0); } return; }
    logo.opts = o;
    if (logo.v === o.v || logoBusy) { save(LOGO_KEY, logo); return; }
    logoBusy = true;
    try { const d = await api('logo'); logo = { v: (d.logo || {}).v || o.v, data: d.data || '', opts: d.logo || o }; save(LOGO_KEY, logo); render(); }
    catch (e) {} finally { logoBusy = false; }
  }
  function shrinkImage(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = () => rej(new Error('그림을 읽지 못했어요'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => rej(new Error('그림 파일이 아니에요'));
        img.onload = () => {
          const k = Math.min(1, 600 / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h);
          let d = cv.toDataURL('image/png');
          if (d.length > 600000) d = cv.toDataURL('image/webp', 0.9);
          if (d.length > 600000 || !/^data:image\/(png|webp)/.test(d)) d = cv.toDataURL('image/jpeg', 0.85);
          res(d);
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  async function logoMenu() {
    const o = Object.assign({ header: true, welcome: true, title: true, size: 'm' }, logoOpt().v ? logoOpt() : {});
    let data = null;   // null = 그림은 그대로
    const prev = () => data != null ? data : logo.data;
    const act = await modal(`<h3>로고</h3>
      <div class="logoprev" id="lp">${prev() ? `<img src="${prev()}" alt="">` : '<span class="muted small">아직 로고가 없어요</span>'}</div>
      <label class="btn sm pri" style="display:inline-flex;align-items:center;margin:8px 0">사진에서 로고 고르기<input type="file" id="lf" accept="image/*" hidden></label>
      <p class="small muted" style="margin:0 0 6px">배경이 투명한 PNG면 가장 깔끔해요.</p>
      <p class="sect">보이는 곳</p>
      <label class="row small chk"><input type="checkbox" id="lH"${o.header ? ' checked' : ''}> 맨 위 머리줄(제목 자리)</label>
      <label class="row small chk"><input type="checkbox" id="lW"${o.welcome ? ' checked' : ''}> 처음 이름 넣는 화면에 크게</label>
      <label class="row small chk"><input type="checkbox" id="lT"${o.title !== false ? ' checked' : ''}> 로고 옆에 ‘${esc(appTitle())}’ 글자도 보이기</label>
      <p class="sect">머리줄 로고 크기</p>
      <div class="chips" id="lS">${[['s', '작게'], ['m', '보통'], ['l', '크게']].map(([v, l]) => `<button data-ls="${v}" class="${o.size === v ? 'on' : ''}">${l}</button>`).join('')}</div>`,
      [{ label: '로고 지우기', val: 'del', cls: 'danger' }, { label: '취소', val: false }, { label: '저장', val: 'save', cls: 'pri' }],
      inn => {
        $('#lf', inn).onchange = async e => {
          const f = e.target.files && e.target.files[0]; if (!f) return;
          try { data = await shrinkImage(f); $('#lp', inn).innerHTML = `<img src="${data}" alt="">`; } catch (er) { toast(er.message); }
        };
        $$('[data-ls]', inn).forEach(b => b.onclick = () => { o.size = b.dataset.ls; $$('[data-ls]', inn).forEach(x => x.classList.toggle('on', x === b)); });
        ['lH', 'lW', 'lT'].forEach(id => $('#' + id, inn).onchange = e => { o[{ lH: 'header', lW: 'welcome', lT: 'title' }[id]] = e.target.checked; });
      });
    if (!act) { masterMenu(); return; }
    try {
      if (act === 'del') { if (!(await confirmBox('로고 지우기', '로고를 지울까요?', '지우기'))) { logoMenu(); return; } await api('setLogo', { data: '' }); toast('로고를 지웠어요'); }
      else {
        if (!prev()) { toast('먼저 사진에서 로고를 골라 주세요'); logoMenu(); return; }
        const p = { opts: { header: o.header, welcome: o.welcome, title: o.title, size: o.size } };
        if (data != null) p.data = data;
        await api('setLogo', p);
        if (data != null) { logo = { v: S.logo.v, data, opts: S.logo }; save(LOGO_KEY, logo); }
        toast('로고를 저장했어요');
      }
    } catch (e) { toast(e.message); }
    render(); masterMenu();
  }
  async function renameSelf() {
    const old = myName(), oldCh = churchOf(old), oldTi = titleOf(old);
    let picked = null, pickedCh = '', pickedTi = '';
    await modal(`<h3>이름·직책·소속 고치기</h3><p class="msg small">틀린 곳을 바르게 고쳐 주세요.
이름을 바꾸면 이 기기에서 입력한 기록과 기도제목도 새 이름으로 옮겨져요.</p><div id="rp"></div>`, [{ label: '닫기', val: false }],
      (inn, close) => nameInput($('#rp', inn), old, '고치기', (n, c, t) => { picked = n; pickedCh = c; pickedTi = t; close(true); }, oldCh, oldTi));
    if (!picked || (picked === old && pickedCh === oldCh && pickedTi === oldTi)) return;
    if (picked !== old && !(await confirmBox('이름 바꾸기', `<b>${esc(old)}</b> → <b>${esc(picked)}</b> 님로 바꿀까요?`, '바꾸기'))) return;
    const r = await setNameFlow(picked, pickedCh, pickedTi); if (r === 'ok' || r === 'new') { form.who = ''; toast('고쳤어요'); }
    render();
  }

  /* ----- 사용법 안내 (실제 버튼을 짚어 줌) ----- */
  const TOUR = [
    { v: 'input', sel: null, title: '환영합니다! 🙏', text: '처음 오셨군요.\n사용법을 30초만 알려 드릴게요.\n아래 <b>[다음]</b>을 누르세요.' },
    { v: 'input', sel: '.datebar', title: '① 기도한 날짜', text: '<b>오늘</b>로 되어 있어요.\n어제 기도한 것은 아래 <b>[어제]</b>를 누르면 돼요.' },
    { v: 'input', sel: '.time', title: '② 기도한 시간', text: '왼쪽 칸을 눌러 <b>시간</b>,\n오른쪽 칸을 눌러 <b>분</b>을 고르세요.\n(예: 1시간 30분)' },
    { v: 'input', sel: '[data-q]', parent: true, title: '빠르게 고르기', text: '자주 쓰는 시간은\n이 버튼을 한 번만 눌러도 돼요.' },
    { v: 'input', sel: '#fSave', title: '③ 저장', text: '다 고르셨으면 <b>[저장]</b>을 누르면 끝!\n잘못 넣었으면 다시 고르고 저장하면\n<b>마지막에 넣은 것</b>으로 바뀌어요.' },
    { v: 'input', sel: '[data-v="mine"]', title: '내 기록', text: '내가 기도한 날을 <b>달력</b>으로 볼 수 있어요.\n달력에서 날짜를 누르면\n그 날 기록을 넣거나 고칠 수 있어요.' },
    { v: 'input', sel: '[data-v="table"]', title: '현황', text: '여기를 누르면 성도님들이\n얼마나 기도했는지 볼 수 있어요.' },
    { v: 'input', sel: '[data-v="prayer"]', title: '기도제목', text: '내 기도제목을 올리고,\n다른 성도님 기도제목에 🙏 ❤️ 를 누르거나\n댓글을 달 수 있어요.' },
    { v: 'input', sel: '[data-v="special"]', needSp: true, title: '특별기도 🔥', text: '특별기도 기간에는 여기서\n<b>기도할 사람</b>을 고르고,\n매일 <b>[오늘 기도했어요]</b>를 눌러 주세요.' },
    { v: 'input', sel: '#tTheme', title: '밝게 · 어둡게', text: '화면이 너무 밝거나 어두우면\n이 버튼을 누르세요. ☀️ ↔ 🌙' },
    { v: 'input', sel: '#tSet', title: '설정', text: '<b>글자를 크게</b> 하거나 <b>이름을 고칠</b> 때,\n이 사용법을 <b>다시 볼</b> 때 누르세요.' },
    { v: 'input', sel: null, install: true, title: '마지막! 앱 설치 📲', text: '휴대폰에 앱을 설치하면\n다음부터 <b>카카오톡 없이</b>\n홈 화면의 <b>임마누엘기도</b> 아이콘만 누르면 열려요.' }
  ];
  function startTour(i) {
    i = i || 0;
    let steps = TOUR.filter(s => (!s.install || !isStandalone()) && (!s.needSp || hasSpecial()));
    const s = steps[i]; if (!s) { endTour(); return; }
    if (view !== s.v) { view = s.v; render(); }
    if (modalResolve) { try { $('#dlg').close(); } catch (e) {} modalResolve = null; }
    let el = s.sel ? $(s.sel) : null; if (el && s.parent) el = el.parentElement;
    let ov = $('#tour'); if (!ov) { ov = document.createElement('div'); ov.id = 'tour'; ov.className = 'tour'; document.body.appendChild(ov); }
    const last = i === steps.length - 1;
    ov.innerHTML = `<div class="tour-hole${el ? '' : ' none'}"></div><div class="tour-card">
      <div class="tour-step">${i + 1} / ${steps.length}</div><h3>${s.title}</h3><p>${s.text.replace(/\n/g, '<br>')}</p>
      <div class="tour-acts">${i ? '<button class="btn" data-t="prev">이전</button>' : '<button class="btn ghost" data-t="skip">건너뛰기</button>'}
        ${s.install ? `<button class="btn" data-t="end">나중에</button><button class="btn pri" data-t="install">📲 지금 설치하기</button>` : `<button class="btn pri" data-t="next">${last ? '시작하기' : '다음 ▶'}</button>`}</div></div>`;
    const place = () => {
      const hole = $('.tour-hole', ov), card = $('.tour-card', ov), vh = window.innerHeight;
      if (!el) { card.style.top = Math.max(16, (vh - card.offsetHeight) / 2) + 'px'; return; }
      const r = el.getBoundingClientRect(), pad = 6;
      Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      const below = r.bottom + 14, above = r.top - 14 - card.offsetHeight;
      card.style.top = (below + card.offsetHeight < vh - 8 || above < 8 ? Math.min(below, vh - card.offsetHeight - 8) : above) + 'px';
    };
    if (el) { const r = el.getBoundingClientRect(); if (r.top < 90 || r.bottom > window.innerHeight - 220) window.scrollBy(0, r.top - Math.max(100, window.innerHeight / 2 - r.height)); }
    requestAnimationFrame(() => requestAnimationFrame(place));
    ov.onclick = e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      const t = b.dataset.t;
      if (t === 'next') startTour(i + 1);
      else if (t === 'prev') startTour(i - 1);
      else if (t === 'install') { endTour(); installSheet(); }
      else endTour();
    };
    window.onresize = () => { if ($('#tour')) place(); };
  }
  function endTour() {
    const ov = $('#tour'); if (ov) ov.remove();
    window.onresize = null;
    C.tourDone = true; saveCfg();
    window.scrollTo(0, 0);
    if (S && S.notices && S.notices.length) showNotices(false);
  }

  /* ----- 설정 ----- */
  function settings() {
    const sa = isStandalone();
    modal(`<h3>설정</h3>
      <div class="field"><label>내 이름·직책·소속</label><div class="namebox"><b>${dispName(myName())}${groupChip(myName())}</b><button class="btn sm" id="sName">고치기</button></div></div>
      <div class="field"><label>글자 크기</label><div class="chips">${[[16, '작게'], [17, '보통'], [19, '크게'], [21, '아주 크게']].map(([v, l]) => `<button data-f="${v}" class="${C.font === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="field"><label>화면 밝기</label><div class="chips">${[['light', '☀️ 밝게'], ['dark', '🌙 어둡게'], ['auto', '📱 휴대폰 설정대로']].map(([v, l]) => `<button data-th="${v}" class="${(C.theme || 'light') === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="field"><label>화면</label><div class="row">
        <button class="btn sm${FS.supported() ? '' : ' hidden'}" id="sFS">${FS.on() ? '전체화면 끄기' : '전체화면'}</button>
        <label class="row small" style="gap:6px"><input type="checkbox" id="sAuto"${C.autoFS ? ' checked' : ''}> 자동 전체화면</label>
        <button class="btn sm${sa ? ' hidden' : ''}" id="sInst">홈 화면에 설치하기</button></div></div>
      <div class="field"><label>공지·공유</label><div class="row">
        <button class="btn sm pri" id="sTour">사용법 다시 보기</button><button class="btn sm" id="sReload">새로 고침</button><button class="btn sm" id="sNotice">공지 보기</button><button class="btn sm" id="sShare">앱 주소 보내기</button></div></div>
      <div class="field"><label>관리</label><div class="row">
        ${isMaster() ? '<button class="btn sm pri" id="sMaster">마스터 메뉴</button>' : isStaff() ? '<button class="btn sm pri" id="sStaff">공지 올리기·내리기</button><button class="btn sm" id="sMaster">마스터로 들어가기</button>' : '<button class="btn sm" id="sMaster">마스터로 들어가기</button>'}</div></div>
      <p class="small muted">기기: ${esc(deviceDesc())}${C.pending.length ? ' · 보낼 기록 ' + C.pending.length + '개' : ''}</p>`,
      [{ label: '닫기', val: true, cls: 'pri' }], (inn, close) => {
        $('#sName', inn).onclick = () => { close(); renameSelf(); };
        $$('[data-f]', inn).forEach(b => b.onclick = () => { C.font = +b.dataset.f; saveCfg(); applyFont(); $$('[data-f]', inn).forEach(x => x.classList.toggle('on', x === b)); render(); });
        $('#sFS', inn).onclick = () => { close(); FS.toggle(); };
        $('#sAuto', inn).onchange = e => { C.autoFS = e.target.checked; saveCfg(); };
        $('#sInst', inn).onclick = () => { close(); installSheet(); };
        $('#sTour', inn).onclick = () => { close(); startTour(0); };
        $('#sReload', inn).onclick = () => { close(); refresh(); toast('새 자료를 받았어요'); };
        $$('[data-th]', inn).forEach(b => b.onclick = () => { C.theme = b.dataset.th; saveCfg(); applyTheme(); $$('[data-th]', inn).forEach(x => x.classList.toggle('on', x === b)); render(); });
        $('#sNotice', inn).onclick = () => { close(); if (S.notices && S.notices.length) showNotices(true); else toast('지금 올라온 공지가 없어요'); };
        $('#sShare', inn).onclick = () => { close(); shareApp(); };
        $('#sMaster', inn).onclick = () => { close(); isMaster() ? masterMenu() : masterLogin(); };
        const st = $('#sStaff', inn); if (st) st.onclick = () => { close(); noticeMenu(); };
      });
  }
  async function shareApp() {
    const url = location.origin + location.pathname;
    try { if (navigator.share) { await navigator.share({ title: appTitle(), text: '기도시간 입력', url }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(url); toast('주소를 복사했어요. 카톡방에 붙여 넣으세요'); } catch (e) { modal(`<h3>앱 주소</h3><p class="msg">${esc(url)}</p>`, [{ label: '닫기', val: true, cls: 'pri' }]); }
  }

  /* ----- 마스터 ----- */
  async function masterLogin() {
    let pw = '';
    const v = await modal(`<h3>마스터로 들어가기</h3><p class="msg small">구글 시트 '설정' 탭 B3 칸의 마스터 암호를 넣어 주세요.\n한 번 들어가면 이 기기는 계속 마스터예요.</p><input type="password" id="mpw" autocomplete="off">`,
      [{ label: '취소', val: false }, { label: '들어가기', val: true, cls: 'pri' }], inn => { const i = $('#mpw', inn); i.oninput = () => pw = i.value; setTimeout(() => i.focus(), 50); });
    if (!v || !pw) return;
    try { await api('master', { mpass: pw }); toast('마스터가 되었어요'); render(); masterMenu(); } catch (e) { toast(e.message); }
  }
  function noticeHtml() {
    const notices = S.notices || [];
    return `<p class="sect">공지 올리기 <span class="small">(앱을 열 때 모두에게 보여요)</span></p>
      <textarea id="mN" placeholder="공지 내용"></textarea>
      <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn pri sm" id="mNPost">공지 올리기</button></div>
      ${notices.length ? `<ul class="list">${notices.map(n => `<li><div>${esc(n.text)}<br><span class="small muted">${md(ymd(new Date(n.at)))}${n.by ? ' · ' + esc(n.by) : ''}</span></div><button class="btn sm danger" data-nd="${esc(n.id)}">내리기</button></li>`).join('')}</ul>` : '<p class="small muted">올라간 공지가 없어요.</p>'}`;
  }
  function bindNotice(inn, close) {
    $('#mNPost', inn).onclick = () => { const t = $('#mN', inn).value.trim(); if (!t) { toast('공지 내용을 넣어 주세요'); return; } close({ a: 'notice', text: t }); };
    $$('[data-nd]', inn).forEach(b => b.onclick = () => close({ a: 'delNotice', id: b.dataset.nd }));
  }
  async function doNotice(act) {
    if (act.a === 'notice') { await api('notice', { text: act.text }); toast('공지를 올렸어요'); return true; }
    if (act.a === 'delNotice') { if (await confirmBox('공지 내리기', '이 공지를 내릴까요?', '내리기')) { await api('delNotice', { id: act.id }); toast('공지를 내렸어요'); } return true; }
    return false;
  }
  // 공지 권한(담임목사님 등): 공지만
  async function noticeMenu() {
    const act = await modal(`<h3>📢 공지 관리</h3>${noticeHtml()}`, [{ label: '닫기', val: false, cls: 'pri' }], bindNotice);
    if (!act) return;
    try { await doNotice(act); } catch (e) { toast(e.message); }
    render(); noticeMenu();
  }
  // 권한 주기: 이름을 넣은 기기 목록
  async function roleMenu() {
    let d; try { d = await api('devices'); } catch (e) { toast(e.message); return; }
    const me = myName(), devs = (d.devices || []).sort((a, b) => ko(a.name, b.name));
    const roleTxt = r => r === '마스터' ? '<span class="tag m">마스터</span>' : r === '공지' ? '<span class="tag">공지 권한</span>' : r === '교사' ? '<span class="tag">교사</span>' : r === '담임목사' ? '<span class="tag m">담임목사</span>' : '';
    const tagOf = v => v.role ? roleTxt(v.role) : v.listed ? '<span class="tag">교사(명단)</span>' : '';
    const act = await modal(`<h3>권한 주기</h3>
      <p class="msg small"><b>교사</b>는 [교사 명단]에 ‘성함 부서’로 넣으면 저절로 돼요.\n<b>담임목사</b>: 모든 부서 출석부(연락처·심방 포함)를 보고, 공지를 올리고 내려요.\n<b>공지</b>: 담임목사님처럼 공지를 올리고 내려요.\n성도님이 먼저 앱에 이름을 넣고 들어오셔야 목록에 나와요. 기기마다 따로 드려요.</p>
      <input type="text" id="rq" placeholder="이름으로 찾기" style="margin-bottom:8px">
      <ul class="list" id="rl">${devs.map(v => `<li data-n="${esc(v.name)}"><div><b>${esc(v.name)}</b> ${tagOf(v)}<br><span class="small muted">${esc(v.desc || '')}${v.last ? ' · ' + when(v.last) : ''}</span></div>
        ${v.role === '마스터' ? '' : v.role ? `<button class="btn sm danger" data-role="" data-t="${esc(v.id)}">권한 빼기</button>` : `<span class="rbtns"><button class="btn sm pri" data-role="담임목사" data-t="${esc(v.id)}">담임목사</button><button class="btn sm" data-role="공지" data-t="${esc(v.id)}">공지</button></span>`}</li>`).join('') || '<li class="muted">이름을 넣은 기기가 없어요</li>'}</ul>`,
      [{ label: '닫기', val: false, cls: 'pri' }], (inn, close) => {
        $('#rq', inn).oninput = e => { const q = e.target.value.replace(/\s/g, ''); $$('#rl li[data-n]', inn).forEach(li => li.classList.toggle('hidden', !!q && !li.dataset.n.includes(q))); };
        $$('[data-t]', inn).forEach(b => b.onclick = () => close({ target: b.dataset.t, role: b.dataset.role, name: b.closest('li').dataset.n }));
      });
    if (!act) { masterMenu(); return; }
    if (!(await confirmBox('권한 바꾸기', act.role === '담임목사' ? `<b>${esc(act.name)}</b> 님 기기에 담임목사 권한을 드릴까요?\n모든 부서 출석부(연락처·심방 포함)를 보고, 공지를 올리고 내릴 수 있어요.` : act.role ? `<b>${esc(act.name)}</b> 님 기기에 공지 권한을 드릴까요?\n공지를 올리고 내릴 수 있고, 댓글도 지울 수 있어요.` : `<b>${esc(act.name)}</b> 님 기기의 권한을 뺄까요?`, '바꾸기'))) { roleMenu(); return; }
    try { await api('setRole', { target: act.target, role: act.role }); toast('권한을 바꿨어요'); } catch (e) { toast(e.message); }
    roleMenu();
  }
  // 교사 명단: 이 이름으로 들어온 기기는 자동으로 교사 권한
  async function teacherMenu() {
    const tl = (S.teachers || []).map(x => typeof x === 'string' ? { name: x, depts: [] } : x).sort((a, b) => ko(a.name, b.name)), list = tl.map(x => x.name), names = S.names || [];
    let text = tl.map(x => [x.name].concat(x.depts || [], x.role === '임원' ? ['임원'] : []).join(' ')).join('\n');
    const v = await modal(`<h3>👩‍🏫 교사·임원 명단 (출석부 권한)</h3>
      <p class="msg small">한 줄에 한 분씩 <b>성함 부서</b>로 적어 주세요. (예: 김하나 학생부)\n두 부서를 맡으면 이어서 적어요. (예: 이두리 청년부 학생부)\n교사가 아니지만 출석을 맡는 분(청년부 임원 등)은 끝에 <b>임원</b>을 붙여요. (예: 박하늘 청년부 임원)\n이 이름으로 앱에 들어오시면 <b>자동으로 그 부서 출석부</b>(연락처·심방 포함)를 보고 쓸 수 있어요. 교사는 출석부의 ‘교사’ 칸으로 가고 특별기도 대상에서 빠져요. 임원은 그대로 학년 칸에 있어요.\n부서: ${DEPTS.join(', ')}</p>
      <textarea id="tl" placeholder="예:\n김하나 학생부\n이두리 청년부\n박하늘 청년부 임원" style="min-height:160px">${esc(text)}</textarea>
      ${list.length ? `<p class="sect">지금 명단 (${list.length}명)</p><p class="small">${tl.map(x => (names.includes(x.name) ? `<b>${esc(x.name)}</b> ✓` : `<span class="muted">${esc(x.name)} (아직 안 들어옴)</span>`) + ` <small>${x.depts && x.depts.length ? esc(x.depts.join('·')) : '<span class="err">부서 없음</span>'}${x.role === '임원' ? ' · 임원' : ''}</small>`).join('<br>')}</p>` : ''}`,
      [{ label: '취소', val: false }, { label: '저장', val: true, cls: 'pri' }], inn => { $('#tl', inn).oninput = e => text = e.target.value; });
    if (!v) { masterMenu(); return; }
    const arr = text.split(/\n+/).map(line => {
      const parts = line.trim().split(/[\s,·/]+/).filter(Boolean); if (!parts.length) return null;
      const role = parts.some(p => /^(임원|관리)$/.test(p)) ? '임원' : '교사', rest = parts.filter(p => !DEPTS.includes(p) && !/^(임원|관리|교사)$/.test(p));
      const depts = parts.filter(p => DEPTS.includes(p)), raw = rest.join(''), nm0 = raw.replace(/(선생님|님)$/, ''), nm = nm0.length >= 2 ? nm0 : raw;
      return nm.length >= 2 ? { name: nm, depts, role } : null;
    }).filter(Boolean);
    try { await api('teachers', { list: arr }); toast(`명단을 저장했어요 (${arr.length}명)`); } catch (e) { toast(e.message); }
    render(); masterMenu();
  }
  async function masterMenu() {
    const names = (S.names || []).slice().sort(ko);
    const act = await modal(`<h3>마스터 메뉴</h3>
      ${noticeHtml()}
      <p class="sect">권한</p>
      <div class="row">${(S.claims || []).length ? `<button class="btn sm pri" id="mClaim">📱 폰 바꿈 승인 (${S.claims.length})</button>` : ''}<button class="btn sm pri" id="mCamp">🔥 특별기도 관리</button><button class="btn sm pri" id="mTeach">👩‍🏫 교사·임원 명단</button><button class="btn sm pri" id="mRole">권한 주기 (교사·담임목사님)</button><button class="btn sm pri" id="mLogo">로고 넣기·바꾸기</button></div>
      <p class="sect">이름 고치기·합치기 <span class="small">(잘못 적힌 이름의 기록을 모두 옮김)</span></p>
      <div class="row"><select id="mFrom" style="flex:1 1 140px">${names.map(n => `<option>${esc(n)}</option>`).join('')}</select><span>→</span>
        <input type="text" id="mTo" list="mNames" placeholder="바른 이름" style="flex:1 1 140px"><datalist id="mNames">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
        <button class="btn sm pri" id="mRen">바꾸기</button></div>
      <p class="sect">그 밖에</p>
      <div class="row"><button class="btn sm" id="mImp">설문지 응답 다시 옮기기</button><button class="btn sm" id="mSrv">서버 주소</button><button class="btn sm danger" id="mOut">이 기기 마스터 끝내기</button></div>
      <p class="small muted">다른 성도님 기록은 [입력] 탭의 이름 칸에서 골라 넣을 수 있어요.</p>`,
      [{ label: '닫기', val: false, cls: 'pri' }], (inn, close) => {
        bindNotice(inn, close);
        $('#mRole', inn).onclick = () => close({ a: 'role' });
        $('#mCamp', inn).onclick = () => close({ a: 'camps' });
        const mc = $('#mClaim', inn); if (mc) mc.onclick = () => close({ a: 'claims' });
        $('#mTeach', inn).onclick = () => close({ a: 'teachers' });
        $('#mLogo', inn).onclick = () => close({ a: 'logo' });
        $('#mRen', inn).onclick = () => { const from = $('#mFrom', inn).value, to = $('#mTo', inn).value.replace(/\s+/g, ''); if (to.length < 2) { toast('바른 이름을 넣어 주세요'); return; } close({ a: 'rename', from, to }); };
        $('#mImp', inn).onclick = () => close({ a: 'reimport' });
        $('#mSrv', inn).onclick = () => close({ a: 'server' });
        $('#mOut', inn).onclick = () => close({ a: 'unmaster' });
      });
    if (!act) return;
    try {
      if (await doNotice(act)) { /* 공지 */ }
      else if (act.a === 'role') { await roleMenu(); return; }
      else if (act.a === 'camps') { await campList(); return; }
      else if (act.a === 'claims') { await claimsMenu(); return; }
      else if (act.a === 'teachers') { await teacherMenu(); return; }
      else if (act.a === 'logo') { await logoMenu(); return; }
      else if (act.a === 'rename') {
        const merge = names.includes(act.to);
        if (await confirmBox(merge ? '이름 합치기' : '이름 고치기', `<b>${esc(act.from)}</b>의 모든 기록을 <b>${esc(act.to)}</b>(으)로 ${merge ? '합칠까요?\n같은 날짜에 둘 다 기록이 있으면 나중에 저장한 것이 남아요.' : '옮길까요?'}`, '바꾸기')) { await api('rename', { from: act.from, to: act.to }); toast('바꿨어요'); }
      }
      else if (act.a === 'reimport') { const d = await api('reimport'); toast(`설문지 기록 ${d.imported}건을 옮겼어요`); }
      else if (act.a === 'server') { await serverDialog(); return; }
      else if (act.a === 'unmaster') { if (await confirmBox('마스터 끝내기', '이 기기를 일반 기기로 바꿀까요?', '끝내기')) { await api('unmaster'); form.who = ''; toast('일반 기기가 되었어요'); } }
    } catch (e) { toast(e.message); }
    render();
    if (isMaster() && act.a !== 'unmaster') masterMenu();
  }
  async function serverDialog() {
    let v = C.server;
    const ok = await modal(`<h3>서버 주소</h3><p class="msg small">Apps Script 웹 앱 주소(https://script.google.com/macros/s/…/exec)</p><input type="text" id="sv" value="${esc(C.server)}">`,
      [{ label: '취소', val: false }, { label: '저장', val: true, cls: 'pri' }], inn => { $('#sv', inn).oninput = e => v = e.target.value.trim(); });
    if (!ok) return;
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(v)) { toast('주소가 /exec 로 끝나야 해요'); return; }
    C.server = v; S = null; C.state = null; saveCfg(); render(); refresh();
  }
  function noServerHtml() {
    return `<div class="welcome">${brandHtml()}
      <p class="lead">아직 구글 시트 서버가 연결되지 않았어요.<br>관리자가 서버 주소를 넣으면 쓸 수 있어요.</p>
      <div class="card"><div class="field"><label>서버 주소 (관리자용)</label><input type="text" id="sv0" placeholder="https://script.google.com/macros/s/…/exec"></div>
      <button class="btn pri big" id="sv0ok">연결하기</button></div></div>`;
  }
  function bindNoServer() {
    $('#sv0ok').onclick = () => { const v = $('#sv0').value.trim(); if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(v)) { toast('주소가 /exec 로 끝나야 해요'); return; } C.server = v; saveCfg(); boot(); };
  }

  /* ---------- 카카오톡 안 브라우저 → 기본 브라우저로 ---------- */
  const UA = navigator.userAgent;
  const IN_KAKAO = /KAKAOTALK/i.test(UA), IN_APP = IN_KAKAO || /NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp|BAND\//i.test(UA);
  const IS_ANDROID = /Android/i.test(UA), IS_IOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function openExternal() {
    const url = location.origin + location.pathname + location.search;
    if (IN_KAKAO) { location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url); return; }
    if (IS_ANDROID) { location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end'; return; }
    modal(`<h3>${IS_IOS ? '사파리' : '크롬'}로 열기</h3><p class="msg">오른쪽 아래(또는 위)의 <b>⋯</b> 메뉴에서 <b>${IS_IOS ? 'Safari로 열기' : '다른 브라우저로 열기'}</b>를 눌러 주세요.</p>`, [{ label: '알겠어요', val: true, cls: 'pri' }]);
  }
  function kickedHtml() {
    const br = IS_IOS ? '사파리' : '크롬';
    return `<div class="welcome" style="text-align:center">${brandHtml()}
      <p><b>${br}(기본 브라우저)</b>로 여는 중이에요…</p>
      <p class="small muted">카카오톡 안에서 열면 이름이 기억되지 않을 수 있어서 기본 브라우저로 열어요.</p>
      <button class="btn pri big" id="kkOpen">${br}로 열기</button>
      <p class="small muted">열리지 않으면 오른쪽 위 <b>⋮</b>(아이폰은 아래 <b>⋯</b>) 메뉴에서 <b>다른 브라우저로 열기</b>를 눌러 주세요.</p>
      <button class="btn ghost sm" id="kkStay">그냥 카카오톡에서 쓰기</button></div>`;
  }

  /* ---------- 홈 화면 설치 · 전체화면 ---------- */
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const mq = q => window.matchMedia && window.matchMedia(q).matches;
  const firstStandalone = mq('(display-mode: standalone)') || mq('(display-mode: fullscreen)') || navigator.standalone === true;
  function isStandalone() {
    if (navigator.standalone === true) return true;
    if (document.fullscreenElement || document.webkitFullscreenElement) return firstStandalone;
    return mq('(display-mode: standalone)') || mq('(display-mode: fullscreen)');
  }
  const FS = {
    userExit: false,
    supported() { const d = document.documentElement; return !inFrame && !!(d.requestFullscreen || d.webkitRequestFullscreen) && !IS_IOS; },
    on() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
    enter() { const d = document.documentElement; try { const r = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : (d.webkitRequestFullscreen && d.webkitRequestFullscreen()); if (r && r.catch) r.catch(() => {}); } catch (e) {} },
    exit() { try { const r = document.exitFullscreen ? document.exitFullscreen() : (document.webkitExitFullscreen && document.webkitExitFullscreen()); if (r && r.catch) r.catch(() => {}); } catch (e) {} },
    toggle() { if (!FS.supported()) { installSheet(); return; } if (FS.on()) { FS.userExit = true; FS.exit(); } else { FS.userExit = false; FS.enter(); } }
  };
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; paintInstall(); });
  window.addEventListener('appinstalled', () => { installEvt = null; C.installDismissed = true; saveCfg(); paintInstall(); toast('홈 화면에 설치했어요'); });
  function paintInstall() {
    const sa = isStandalone();
    const b = $('#banner'); if (b) b.classList.toggle('hidden', sa || inFrame || C.installDismissed || IN_APP);
    const f = $('#bFs'); if (f) f.classList.toggle('hidden', !FS.supported());
    const t = $('#tFS'); if (t) { t.classList.toggle('hidden', !FS.supported() || (sa && !FS.on())); t.innerHTML = FS.on() ? ICON.fsOff : ICON.fsOn; t.setAttribute('aria-label', FS.on() ? '전체화면 끝내기' : '전체화면'); }
  }
  // 설치: 안드로이드(크롬·삼성 인터넷)는 휴대폰의 설치 창을 바로 띄움. 아이폰은 막혀 있어서 누를 곳을 화살표로 짚어 줌
  function promptInstall() {
    const ev = installEvt; installEvt = null;
    try {
      ev.prompt();
      ev.userChoice.then(r => { if (r && r.outcome === 'accepted') { C.installDismissed = true; saveCfg(); toast('설치하고 있어요. 잠시 뒤 홈 화면에 ‘임마누엘기도’ 아이콘이 생겨요'); } paintInstall(); }).catch(() => {});
    } catch (e) { installGuide(); }
  }
  async function installSheet() {
    if (isStandalone()) { toast('이미 설치된 앱으로 열려 있어요'); return; }
    if (installEvt) { promptInstall(); return; }   // 한 번에 설치 창
    if (IN_APP) { openExternal(); return; }        // 카톡 안이면 크롬·사파리로 먼저
    if (IS_IOS) { iosGuide(); return; }
    // 안드로이드: 설치 준비 신호가 조금 늦게 올 수 있어 잠깐 기다렸다가, 오면 [설치하기] 한 번 더 누르게 함
    const v = await modal(`<h3>📲 앱 설치</h3><div class="instwait"><div class="spin"></div><p class="msg" id="iwMsg">설치 준비 중이에요…</p></div>`,
      [{ label: '닫기', val: false }, { label: '설치하기', val: 'go', cls: 'pri big', check: () => !!installEvt }],
      (inn, close) => {
        const btn = $$('.acts button', inn)[1]; btn.disabled = true;
        let n = 0;
        const t = setInterval(() => {
          if (!document.body.contains(btn)) { clearInterval(t); return; }
          if (installEvt) { clearInterval(t); btn.disabled = false; $('#iwMsg', inn).innerHTML = '준비됐어요! 아래 <b>[설치하기]</b>를 누르고,\n뜨는 창에서 <b>[설치]</b>를 누르세요.'; $('.spin', inn).classList.add('hidden'); return; }
          if (++n > 12) { clearInterval(t); close('guide'); }
        }, 400);
      });
    if (v === 'go' && installEvt) promptInstall();
    else if (v === 'guide') installGuide();
  }
  // 설치 창을 띄울 수 없을 때(이미 설치됐거나 오래된 브라우저 등): 메뉴 위치를 그림으로
  function installGuide() {
    const samsung = /SamsungBrowser/i.test(UA), desktop = !/Android|Mobi/i.test(UA);
    const step = (n, html) => `<div class="istep"><span class="inum">${n}</span><div>${html}</div></div>`;
    let how;
    if (samsung) how = step(1, `화면 <b>맨 아래 오른쪽 ☰</b>(줄 세 개)를 누르세요`) + step(2, `<b>＋ 현재 페이지 추가</b>를 누르세요`) + step(3, `<b>홈 화면</b>을 누르세요`);
    else if (desktop) how = step(1, `주소창 오른쪽의 <b>설치 아이콘(⊕ 모니터 모양)</b>을 누르세요`) + step(2, `<b>설치</b>를 누르세요`);
    else how = step(1, `화면 <b>맨 위 오른쪽 ⋮</b>(점 세 개)를 누르세요`) + step(2, `<b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 누르세요`) + step(3, `<b>설치</b>(또는 <b>추가</b>)를 누르세요`);
    modal(`<h3>📲 앱 설치</h3>
      <p class="msg small muted">이미 설치하셨다면 휴대폰 홈 화면에서 <b>임마누엘기도</b> 아이콘을 찾아보세요.</p>
      ${!desktop && !samsung ? '<div class="arrow-tr">⋮ 여기<br>⬆</div>' : ''}${how}`, [{ label: '알겠어요', val: true, cls: 'pri big' }]);
  }
  // 아이폰·아이패드: 사파리 공유 버튼 → 홈 화면에 추가
  function iosGuide() {
    const safari = !/CriOS|FxiOS|EdgiOS|KAKAOTALK|NAVER/i.test(UA), ipad = /iPad/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const share = '<svg class="ishare" viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
    const step = (n, html) => `<div class="istep"><span class="inum">${n}</span><div>${html}</div></div>`;
    const where = !safari ? '화면의 <b>공유 버튼</b>' : ipad ? '화면 <b>맨 위 오른쪽</b>의 공유 버튼' : '화면 <b>맨 아래 가운데</b>의 공유 버튼';
    modal(`<h3>📲 아이폰에 설치하기</h3>
      <p class="msg small muted">아이폰은 애플이 자동 설치를 막아 두어서, 아래처럼 세 번만 눌러 주세요.</p>
      ${step(1, `${where} ${share} 을 누르세요`)}
      ${step(2, `아래로 내려서 <b>홈 화면에 추가</b> <span class="kbd">⊞</span> 를 누르세요`)}
      ${step(3, `오른쪽 위 <b>추가</b>를 누르면 끝!`)}
      <p class="msg small muted">설치한 아이콘으로 처음 열면 이름을 한 번 더 적어 주세요.</p>`,
      [{ label: '알겠어요', val: true, cls: 'pri big' }]).then(() => {
        if (!safari || ipad) return;
        // 화면 아래 공유 버튼 쪽을 가리키는 화살표
        const a = document.createElement('div'); a.className = 'ios-arrow'; a.innerHTML = '여기 공유 버튼을 누르세요<br><span>⬇</span>';
        a.onclick = () => a.remove(); document.body.appendChild(a); setTimeout(() => a.remove(), 12000);
      });
  }
  document.addEventListener('click', e => {
    if (!C.autoFS || FS.userExit || FS.on() || !FS.supported() || isStandalone()) return;
    if (e.target.closest && e.target.closest('#tFS,#banner,dialog,input,textarea,select,.tour,.ios-arrow')) return;
    FS.enter();
  }, true);
  const onFs = () => paintInstall();
  document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
  if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  // Artifact 등으로 게시하면 head 태그가 body 로 들어가므로 다시 head 로 옮김
  document.querySelectorAll('body > link[rel=manifest], body > link[rel=icon], body > link[rel=apple-touch-icon], body > meta[name]').forEach(el => document.head.appendChild(el));

  // 다시 화면으로 돌아오면(다른 앱 갔다 오면) 새 자료를 받음
  let lastLoad = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && S && myName() && !modalResolve && Date.now() - lastLoad > 60000) { lastLoad = Date.now(); refresh(true); }
  });
  window.addEventListener('online', () => { if (S && myName()) refresh(true); });

  /* ---------- 시작 ---------- */
  async function boot() {
    // ?s=서버주소 로 열면 저장 (시험용)
    const m = location.search.match(/[?&]s=([^&#]+)/);
    if (m) { const srv = decodeURIComponent(m[1]); if (/^https?:\/\//.test(srv)) { if (srv !== C.server) { C.server = srv; S = null; C.state = null; } saveCfg(); } history.replaceState(null, '', location.pathname); }
    await ensureDevice();
    render();
    if (!C.server) return;
    lastLoad = Date.now();
    try { await flush(); await api('load'); }
    catch (e) { const el = $('#loadErr'); if (el) el.innerHTML = `<p class="err">${esc(e.message)}</p><button class="btn pri" id="retry">다시 시도</button>`; const r = $('#retry'); if (r) r.onclick = boot; else toast(e.message); return; }
    render();
    if (myName() && !isRosterUser()) { if (!C.tourDone) { view = 'input'; render(); startTour(0); } else showNotices(false); }
  }

  const STAY_KEY = 'church-prayer-stay-inapp';
  let stay = false; try { stay = sessionStorage.getItem(STAY_KEY) === '1'; } catch (e) {}
  if (IN_APP && !stay && (IN_KAKAO || IS_ANDROID)) {
    $('#app').innerHTML = kickedHtml();
    $('#kkOpen').onclick = openExternal;
    $('#kkStay').onclick = () => { try { sessionStorage.setItem(STAY_KEY, '1'); } catch (e) {} boot(); };
    setTimeout(openExternal, 300);
  } else boot();
  window.__pr = { get S() { return S; }, C, render };
})();
