/* 30인 운동본부 기도시간 — 입력 · 현황 · 기도제목 · 공지 */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ko = (a, b) => a.localeCompare(b, 'ko');

  /* ---------- 저장 (localStorage, 모두 try/catch) ---------- */
  const CFG_KEY = 'prayer-cfg', DEV_KEY = 'prayer-device';
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const C = Object.assign({ server: '', font: 17, autoFS: true, installDismissed: false, hideNotices: [], tab: 'input', pending: [], state: null, sort: 'recent' }, load(CFG_KEY, {}));
  if (window.PRAYER_SERVER) C.server = window.PRAYER_SERVER;
  const saveCfg = () => save(CFG_KEY, C);

  // 기기 번호·열쇠: localStorage 가 지워져도 IndexedDB 에서 되살림
  function idb(fn) {
    return new Promise(res => {
      try {
        const r = indexedDB.open('prayer', 1);
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
  async function api(action, extra) {
    if (!C.server) throw new Error('서버 주소가 아직 없어요');
    await ensureDevice();
    const body = JSON.stringify(Object.assign({ action, dev: device.id, key: device.key, desc: deviceDesc() }, extra || {}));
    let r, ctl = window.AbortController ? new AbortController() : null;
    const tm = ctl ? setTimeout(() => ctl.abort(), 30000) : 0;
    busy++; paintBusy();
    try { r = await fetch(C.server, { method: 'POST', body, redirect: 'follow', signal: ctl ? ctl.signal : undefined }); }
    catch (e) { online = false; throw new Error('인터넷 연결을 확인해 주세요'); }
    finally { clearTimeout(tm); busy--; paintBusy(); }
    let d; try { d = await r.json(); } catch (e) { online = false; throw new Error('서버 응답이 이상해요'); }
    online = true;
    if (!d.ok && d.error === 'key') { await resetDevice(); S = null; C.state = null; saveCfg(); throw new Error('기기 정보가 바뀌어 이름을 다시 골라 주세요'); }
    if (!d.ok) { const e = new Error(d.error || '실패했어요'); e.server = true; throw e; }
    if (d.names) { S = d; C.state = d; saveCfg(); }
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
  const dataOf = n => (S && S.data && S.data[n]) || {};
  const totalOf = n => Object.values(dataOf(n)).reduce((a, b) => a + b, 0);

  /* ---------- 아이콘 ---------- */
  const ICON = {
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    fsOn: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    fsOff: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
    reload: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>'
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

  function applyFont() { document.documentElement.style.setProperty('--fs', (C.font || 17) + 'px'); }

  function render() {
    applyFont();
    const app = $('#app');
    if (!C.server) { app.innerHTML = noServerHtml(); bindNoServer(); return; }
    if (!S) { app.innerHTML = `<div class="welcome"><img class="logo" src="icon-192.png" alt=""><h1>30인 운동본부 기도</h1><p class="lead">자료를 불러오는 중…</p><div id="loadErr"></div></div>`; return; }
    if (!myName()) { renderWelcome(); return; }
    const y = window.scrollY;
    app.innerHTML = `<header><div class="top">
        <h1>30인 운동본부 기도</h1>
        <button class="icon" id="tReload" aria-label="새로 고침">${ICON.reload}</button>
        <button class="icon" id="tFS" aria-label="전체화면">${ICON.fsOn}</button>
        <button class="icon" id="tSet" aria-label="설정">${ICON.gear}</button></div>
      <nav class="tabs"><button data-v="input">입력</button><button data-v="table">현황</button><button data-v="prayer">기도제목</button></nav></header>
      <main id="main"></main>`;
    $$('.tabs button').forEach(b => { b.classList.toggle('on', b.dataset.v === view); b.onclick = () => go(b.dataset.v); });
    $('#tSet').onclick = settings;
    $('#tReload').onclick = () => refresh();
    $('#tFS').onclick = () => FS.toggle();
    const m = $('#main');
    if (view === 'table') (C.stView === 'grid' ? renderTable : renderList)(m); else if (view === 'prayer') renderPrayer(m); else renderInput(m);
    paintInstall(); paintBusy();
    if (view !== 'table') window.scrollTo(0, y);
  }
  function go(v) { view = v; C.tab = v; saveCfg(); editPrayer = false; render(); window.scrollTo(0, 0); }

  function topBanners(noInstall) {
    let h = '';
    if (!online || C.pending.length) h += `<div class="offline">${C.pending.length ? `📶 보내지 못한 기록 ${C.pending.length}개 — 인터넷이 연결되면 자동으로 보내요.` : '📶 인터넷 연결이 안 돼서 저장해 둔 자료를 보여 드려요.'}</div>`;
    if (!noInstall) h += `<div class="banner hidden" id="banner"><span>📲 홈 화면에 설치하면 다음부터 아이콘으로 바로 열려요.</span>
      <button class="btn pri sm" id="bInst">설치하기</button><button class="btn sm" id="bFs">전체화면</button><button class="btn ghost sm" id="bNo">다음에</button></div>`;
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
    form.date = d;
    const v = savedFor(form.who || myName(), d);
    form.h = Math.floor(v / 60); form.m = v % 60;
  }
  function renderInput(m) {
    const me = myName(), who = form.who || me, t = today();
    if (form.date > t) form.date = t;
    const saved = savedFor(who, form.date);
    const hOpts = Array.from({ length: 24 }, (_, i) => `<option value="${i}"${i === form.h ? ' selected' : ''}>${i}</option>`).join('');
    const mOpts = Array.from({ length: 60 }, (_, i) => `<option value="${i}"${i === form.m ? ' selected' : ''}>${i}</option>`).join('');
    const quick = [[30, '30분'], [60, '1시간'], [90, '1시간 30분'], [120, '2시간'], [180, '3시간'], [240, '4시간']];
    const cur = form.h * 60 + form.m;
    const nt = S.notices && S.notices[0];
    const nameSel = isMaster()
      ? `<select id="fWho">${[me].concat((S.names || []).filter(n => n !== me).sort(ko)).map(n => `<option value="${esc(n)}"${n === who ? ' selected' : ''}>${esc(n)} 목사${n === me ? ' (나)' : ''}</option>`).join('')}</select>`
      : '';
    m.innerHTML = topBanners() +
      (nt ? `<div class="notice" id="nCard">📢 ${esc(nt.text.length > 120 ? nt.text.slice(0, 120) + '…' : nt.text)}<small>${md(ymd(new Date(nt.at)))} 공지${S.notices.length > 1 ? ` · 공지 ${S.notices.length}개 모두 보기` : ''}</small></div>` : '') +
      `<div class="card">
        <div class="field"><label>이름</label>
          ${nameSel || `<div class="namebox"><b>${esc(me)} 목사</b><button class="btn sm" id="fRename">이름 고치기</button></div>`}
          ${nameSel ? '<p class="small muted" style="margin:6px 0 0">마스터는 다른 목사님 기록도 넣을 수 있어요.</p>' : ''}</div>
        <div class="field"><label>기도한 날짜 <span class="small muted">(기본 오늘)</span></label>
          <div class="datebar"><button class="btn" id="dPrev" aria-label="하루 전">◀</button><input type="date" id="fDate" value="${form.date}" max="${t}"><button class="btn" id="dNext" aria-label="하루 뒤"${form.date >= t ? ' disabled' : ''}>▶</button></div>
          <div class="chips">${[[t, '오늘'], [addDays(t, -1), '어제'], [addDays(t, -2), '그제']].map(([d, l]) => `<button data-d="${d}" class="${d === form.date ? 'on' : ''}">${l}</button>`).join('')}
            <span class="small muted" style="align-self:center;margin-left:4px">${md(form.date)} (${wd(form.date)})</span></div></div>
        <div class="field"><label>기도 시간</label>
          <div class="time"><select id="fH" aria-label="시간">${hOpts}</select><span>시간</span><select id="fM" aria-label="분">${mOpts}</select><span>분</span></div>
          <div class="chips">${quick.map(([v, l]) => `<button data-q="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div>
          ${saved ? `<div class="saved">이 날짜에 저장된 기도: <b>${hmText(saved)}</b><br><span class="small">다시 저장하면 마지막에 넣은 시간으로 바뀌어요.</span></div>` : ''}</div>
        <button class="btn pri big" id="fSave">${saved ? '고쳐서 저장' : '저장'}</button>
      </div>` + myRecords(who);
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
    $$('[data-day]', m).forEach(li => li.onclick = () => { setFormDate(li.dataset.day); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }
  function paintQuick() { const cur = form.h * 60 + form.m; $$('[data-q]').forEach(b => b.classList.toggle('on', +b.dataset.q === cur)); }
  function myRecords(who) {
    const d = dataOf(who), t = today(), wk = parse(t).getDay();
    const weekStart = addDays(t, -((wk + 6) % 7)), monthStart = t.slice(0, 8) + '01';
    let w = 0, mo = 0; Object.keys(d).forEach(k => { if (k >= weekStart && k <= t) w += d[k]; if (k >= monthStart && k <= t) mo += d[k]; });
    const days = Array.from({ length: 14 }, (_, i) => addDays(t, -i));
    return `<div class="card"><h2>${who === myName() ? '내' : esc(who) + ' 목사'} 기도 기록</h2>
      <div class="stat"><div><span class="small muted">이번 주</span><b>${hmText(w)}</b></div><div><span class="small muted">이번 달</span><b>${hmText(mo)}</b></div><div><span class="small muted">전체</span><b>${hmText(totalOf(who))}</b></div></div>
      <ul class="mylist" style="margin-top:10px">${days.map(day => { const k = parse(day).getDay(); return `<li data-day="${day}"><span class="${k === 0 ? 'sun' : k === 6 ? 'sat' : ''}">${md(day)} (${WD[k]})</span><b>${d[day] ? hmText(d[day]) : '<span class="muted">—</span>'}</b></li>`; }).join('')}</ul>
      <p class="small muted" style="margin:8px 0 0">날짜를 누르면 그 날짜 기록을 고칠 수 있어요.</p></div>`;
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
    const people = sortPeople(Object.keys(byN), n => byN[n].tot);
    const max = Math.max(1, ...people.map(n => byN[n].tot));
    const all = people.reduce((a, n) => a + byN[n].tot, 0), active = people.filter(n => byN[n].tot).length;
    const todayCnt = people.filter(n => dataOf(n)[t]).length;
    let rank = 0, prev = -1;
    const rowsHtml = people.map((n, i) => {
      const r = byN[n]; if (r.tot !== prev) { rank = i + 1; prev = r.tot; }
      const d = dataOf(n);
      const medal = C.stSort === 'time' && r.tot ? (rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank) : '';
      return `<button class="prow${n === me ? ' me' : ''}${r.tot ? '' : ' zero'}" data-person="${esc(n)}">
        ${C.stSort === 'time' ? `<span class="rk">${medal}</span>` : ''}
        <span class="pn">${esc(n)}<small> 목사</small></span>
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
    modal(`<h3>${esc(n)} 목사</h3>
      <div class="stat"><div><span class="small muted">이번 주</span><b>${hmText(w)}</b></div><div><span class="small muted">이번 달</span><b>${hmText(mo)}</b></div><div><span class="small muted">전체</span><b>${hmText(totalOf(n))}</b></div></div>
      ${p ? `<p class="sect">🙏 기도제목</p><div class="notice">${esc(p.text)}</div>` : ''}
      <p class="sect">최근 30일</p>
      <ul class="mylist">${days.filter(day => d[day]).map(day => { const k = parse(day).getDay(); return `<li><span class="${k === 0 ? 'sun' : k === 6 ? 'sat' : ''}">${md(day)} (${WD[k]})</span><b>${hmText(d[day])}</b></li>`; }).join('') || '<li class="muted">최근 30일 기록이 없어요</li>'}</ul>`,
      [{ label: '닫기', val: true, cls: 'pri' }]);
  }

  /* ----- 날짜별 표 ----- */

  function renderTable(m) {
    const t = today(), end = tableEnd || t, start = addDays(end, -39), me = myName();
    const days = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    const winTot = n => days.reduce((a, d) => a + (dataOf(n)[d] || 0), 0);
    const people = sortPeople((S.names || []).slice(), winTot);
    const head1 = days.map((d, i) => { const first = i === 0 || d.slice(5, 7) !== days[i - 1].slice(5, 7); return `<th class="mon ${cls(d)}">${first ? (+d.slice(5, 7)) + '월' : ''}</th>`; }).join('');
    const head2 = days.map(d => `<th class="${cls(d)}${d === t ? ' today' : ''}">${+d.slice(8)}</th>`).join('');
    const head3 = days.map(d => `<th class="${cls(d)}">${wd(d)}</th>`).join('');
    const sumDay = {};
    const body = people.map(n => {
      const d = dataOf(n);
      return `<tr class="${n === me ? 'me' : ''}"><th class="c1">${esc(n)}<span class="t"> 목사</span></th><td class="c2">${hmText(totalOf(n))}</td>${days.map(day => { if (d[day]) sumDay[day] = (sumDay[day] || 0) + d[day]; return `<td class="${cls(day)}">${cellText(d[day])}</td>`; }).join('')}</tr>`;
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
      ? `<div class="card"><h2>내 기도제목</h2><textarea id="pText" placeholder="함께 기도할 제목을 적어 주세요.\n목사님마다 하나씩 올라가고, 다시 저장하면 바뀌어요.">${esc(mine ? mine.text : '')}</textarea>
          <div class="row" style="margin-top:10px;justify-content:flex-end">${mine ? '<button class="btn danger" id="pDel">지우기</button><button class="btn" id="pCancel">취소</button>' : ''}<button class="btn pri" id="pSave">올리기</button></div></div>`
      : `<div class="post mine"><div class="who"><b>${esc(me)} 목사 <span class="small muted">(나)</span></b><span class="small muted">${md(ymd(new Date(mine.at)))}</span></div><div class="txt">${esc(mine.text)}</div>
          <div class="row" style="margin-top:8px;justify-content:flex-end"><button class="btn sm" id="pEdit">고치기</button></div></div>`;
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
  function postHtml(p) {
    return `<div class="post"><div class="who"><b>${esc(p.name)} 목사</b><span class="small muted">${md(ymd(new Date(p.at)))}${isMaster() ? ` <button class="btn ghost sm" data-pm="${esc(p.name)}">관리</button>` : ''}</span></div><div class="txt">${esc(p.text)}</div></div>`;
  }
  function bindPosts() {
    $$('[data-pm]').forEach(b => b.onclick = async () => {
      const name = b.dataset.pm, p = (S.prayers || []).find(x => x.name === name); if (!p) return;
      let text = p.text;
      const v = await modal(`<h3>${esc(name)} 목사 기도제목 (마스터)</h3><textarea id="mP">${esc(p.text)}</textarea>`,
        [{ label: '지우기', val: 'del', cls: 'danger' }, { label: '취소', val: false }, { label: '저장', val: 'save', cls: 'pri' }],
        inn => { $('#mP', inn).oninput = e => text = e.target.value; });
      if (!v) return;
      if (v === 'del' && !(await confirmBox('기도제목 지우기', `${esc(name)} 목사님의 기도제목을 지울까요?`, '지우기'))) return;
      try { await api('prayer', { name, text: v === 'del' ? '' : text }); toast('바꿨어요'); } catch (e) { toast(e.message); }
      render();
    });
  }

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
  function nameInput(inn, value, okLabel, onOk) {
    inn.innerHTML = `<div class="field" style="margin:0"><label for="nIn">이름 <span class="small muted">(‘목사’는 빼고 성함만)</span></label>
      <div class="row"><input type="text" id="nIn" placeholder="예: 홍길동" maxlength="12" autocomplete="name" value="${esc(value || '')}" style="flex:1"><span>목사</span></div></div>
      <button class="btn pri big" id="nOk" style="margin-top:14px">${esc(okLabel)}</button>`;
    const i = $('#nIn', inn);
    const go = () => { const v = i.value.replace(/s+/g, '').replace(/목사(님)?$/, ''); if (v.length < 2) { toast('이름을 두 글자 이상 적어 주세요'); i.focus(); return; } onOk(v); };
    $('#nOk', inn).onclick = go;
    i.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); go(); } };
    setTimeout(() => { try { i.focus(); } catch (e) {} }, 80);
  }
  function renderWelcome() {
    const app = $('#app');
    app.innerHTML = `<div class="welcome"><img class="logo" src="icon-192.png" alt=""><h1>30인 운동본부 기도</h1>
      <p class="lead">처음 한 번만 이름을 적어 주세요.<br>이 기기에 저장되어 다음부터는 바로 들어가요.</p><div class="card" id="pick"></div></div>`;
    nameInput($('#pick'), '', '시작하기', async n => {
      if (!(await confirmBox('이름 확인', `<b>${esc(n)} 목사님</b>이 맞으세요?
이 이름이 이 기기에 저장돼요.`, '네, 맞아요'))) return;
      try { await api('setName', { name: n }); toast(n + ' 목사님, 환영합니다'); render(); showNotices(false); } catch (e) { toast(e.message); }
    });
  }
  async function renameSelf() {
    const old = myName();
    let picked = null;
    await modal(`<h3>이름 고치기</h3><p class="msg small">이름이 틀렸으면 바르게 고쳐 주세요.
이 기기에서 입력한 기록과 기도제목도 새 이름으로 옮겨져요.</p><div id="rp"></div>`, [{ label: '닫기', val: false }],
      (inn, close) => nameInput($('#rp', inn), old, '고치기', n => { picked = n; close(true); }));
    if (!picked || picked === old) return;
    if (!(await confirmBox('이름 바꾸기', `<b>${esc(old)}</b> → <b>${esc(picked)}</b> 목사로 바꿀까요?`, '바꾸기'))) return;
    try { await api('setName', { name: picked }); form.who = ''; toast('이름을 바꿨어요'); } catch (e) { toast(e.message); }
    render();
  }

  /* ----- 설정 ----- */
  function settings() {
    const sa = isStandalone();
    modal(`<h3>설정</h3>
      <div class="field"><label>내 이름</label><div class="namebox"><b>${esc(myName())} 목사</b><button class="btn sm" id="sName">이름 고치기</button></div></div>
      <div class="field"><label>글자 크기</label><div class="chips">${[[16, '작게'], [17, '보통'], [19, '크게'], [21, '아주 크게']].map(([v, l]) => `<button data-f="${v}" class="${C.font === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="field"><label>화면</label><div class="row">
        <button class="btn sm${FS.supported() ? '' : ' hidden'}" id="sFS">${FS.on() ? '전체화면 끄기' : '전체화면'}</button>
        <label class="row small" style="gap:6px"><input type="checkbox" id="sAuto"${C.autoFS ? ' checked' : ''}> 자동 전체화면</label>
        <button class="btn sm${sa ? ' hidden' : ''}" id="sInst">홈 화면에 설치하기</button></div></div>
      <div class="field"><label>공지·공유</label><div class="row">
        <button class="btn sm" id="sNotice">공지 보기</button><button class="btn sm" id="sShare">앱 주소 보내기</button></div></div>
      <div class="field"><label>관리</label><div class="row">
        ${isMaster() ? '<button class="btn sm pri" id="sMaster">마스터 메뉴</button>' : '<button class="btn sm" id="sMaster">마스터로 들어가기</button>'}</div></div>
      <p class="small muted">기기: ${esc(deviceDesc())}${C.pending.length ? ' · 보낼 기록 ' + C.pending.length + '개' : ''}</p>`,
      [{ label: '닫기', val: true, cls: 'pri' }], (inn, close) => {
        $('#sName', inn).onclick = () => { close(); renameSelf(); };
        $$('[data-f]', inn).forEach(b => b.onclick = () => { C.font = +b.dataset.f; saveCfg(); applyFont(); $$('[data-f]', inn).forEach(x => x.classList.toggle('on', x === b)); render(); });
        $('#sFS', inn).onclick = () => { close(); FS.toggle(); };
        $('#sAuto', inn).onchange = e => { C.autoFS = e.target.checked; saveCfg(); };
        $('#sInst', inn).onclick = () => { close(); installSheet(); };
        $('#sNotice', inn).onclick = () => { close(); if (S.notices && S.notices.length) showNotices(true); else toast('지금 올라온 공지가 없어요'); };
        $('#sShare', inn).onclick = () => { close(); shareApp(); };
        $('#sMaster', inn).onclick = () => { close(); isMaster() ? masterMenu() : masterLogin(); };
      });
  }
  async function shareApp() {
    const url = location.origin + location.pathname;
    try { if (navigator.share) { await navigator.share({ title: '30인 운동본부 기도', text: '기도시간 입력', url }); return; } } catch (e) { return; }
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
  async function masterMenu() {
    const notices = S.notices || [];
    const names = (S.names || []).slice().sort(ko);
    const act = await modal(`<h3>마스터 메뉴</h3>
      <p class="sect">공지 올리기 <span class="small">(앱을 열 때 모두에게 보여요)</span></p>
      <textarea id="mN" placeholder="공지 내용"></textarea>
      <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn pri sm" id="mNPost">공지 올리기</button></div>
      ${notices.length ? `<ul class="list">${notices.map(n => `<li><div>${esc(n.text)}<br><span class="small muted">${md(ymd(new Date(n.at)))}</span></div><button class="btn sm danger" data-nd="${esc(n.id)}">내리기</button></li>`).join('')}</ul>` : '<p class="small muted">올라간 공지가 없어요.</p>'}
      <p class="sect">이름 고치기·합치기 <span class="small">(잘못 적힌 이름의 기록을 모두 옮김)</span></p>
      <div class="row"><select id="mFrom" style="flex:1 1 140px">${names.map(n => `<option>${esc(n)}</option>`).join('')}</select><span>→</span>
        <input type="text" id="mTo" list="mNames" placeholder="바른 이름" style="flex:1 1 140px"><datalist id="mNames">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
        <button class="btn sm pri" id="mRen">바꾸기</button></div>
      <p class="sect">그 밖에</p>
      <div class="row"><button class="btn sm" id="mImp">설문지 응답 다시 옮기기</button><button class="btn sm" id="mSrv">서버 주소</button><button class="btn sm danger" id="mOut">이 기기 마스터 끝내기</button></div>
      <p class="small muted">다른 목사님 기록은 [입력] 탭의 이름 칸에서 골라 넣을 수 있어요.</p>`,
      [{ label: '닫기', val: false, cls: 'pri' }], (inn, close) => {
        $('#mNPost', inn).onclick = () => { const t = $('#mN', inn).value.trim(); if (!t) { toast('공지 내용을 넣어 주세요'); return; } close({ a: 'notice', text: t }); };
        $$('[data-nd]', inn).forEach(b => b.onclick = () => close({ a: 'delNotice', id: b.dataset.nd }));
        $('#mRen', inn).onclick = () => { const from = $('#mFrom', inn).value, to = $('#mTo', inn).value.replace(/\s+/g, ''); if (to.length < 2) { toast('바른 이름을 넣어 주세요'); return; } close({ a: 'rename', from, to }); };
        $('#mImp', inn).onclick = () => close({ a: 'reimport' });
        $('#mSrv', inn).onclick = () => close({ a: 'server' });
        $('#mOut', inn).onclick = () => close({ a: 'unmaster' });
      });
    if (!act) return;
    try {
      if (act.a === 'notice') { await api('notice', { text: act.text }); toast('공지를 올렸어요'); }
      else if (act.a === 'delNotice') { if (await confirmBox('공지 내리기', '이 공지를 내릴까요?', '내리기')) { await api('delNotice', { id: act.id }); toast('공지를 내렸어요'); } }
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
    return `<div class="welcome"><img class="logo" src="icon-192.png" alt=""><h1>30인 운동본부 기도</h1>
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
    return `<div class="welcome" style="text-align:center"><img class="logo" src="icon-192.png" alt=""><h1>30인 운동본부 기도</h1>
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
  function installSheet() {
    if (isStandalone()) { toast('이미 홈 화면 앱으로 실행 중이에요'); return; }
    if (installEvt) {
      const ev = installEvt; installEvt = null;
      try { ev.prompt(); ev.userChoice.then(r => { if (r && r.outcome === 'accepted') { C.installDismissed = true; saveCfg(); } paintInstall(); }).catch(() => {}); } catch (e) {}
      return;
    }
    const samsung = /SamsungBrowser/i.test(UA), mobile = /Android|Mobi/i.test(UA) || IS_IOS;
    const kbd = t => `<span class="kbd">${t}</span>`;
    let how;
    if (IN_APP) how = `<ol><li>${kbd('⋮')} 메뉴를 누르세요</li><li><b>다른 브라우저로 열기</b>(크롬·사파리)를 누르세요</li><li>열린 화면에서 다시 <b>설치하기</b>를 누르세요</li></ol>`;
    else if (IS_IOS) how = `<ol><li>사파리 아래쪽 ${kbd('공유 ⬆')} 단추를 누르세요</li><li>메뉴를 올려 <b>홈 화면에 추가</b>를 누르세요</li><li>오른쪽 위 <b>추가</b>를 누르세요</li></ol>`;
    else if (samsung) how = `<ol><li>아래 ${kbd('≡')} 메뉴를 누르세요</li><li><b>현재 페이지 추가</b> → <b>홈 화면</b>을 누르세요</li></ol>`;
    else if (mobile) how = `<ol><li>오른쪽 위 ${kbd('⋮')} 메뉴를 누르세요</li><li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누르세요</li><li>뜨는 창에서 <b>설치</b>를 누르세요</li></ol>`;
    else how = `<ol><li>크롬·엣지 주소창 오른쪽의 ${kbd('설치 ⊕')} 아이콘을 누르세요</li><li>없으면 ${kbd('⋮')} 메뉴 → <b>앱 설치</b>를 누르세요</li></ol>`;
    modal(`<h3>홈 화면에 설치하기</h3><p class="msg">설치하면 카카오톡을 거치지 않고 아이콘으로 바로 열려요.</p>${how}`, [{ label: '알겠어요', val: true, cls: 'pri' }]);
  }
  document.addEventListener('click', e => {
    if (!C.autoFS || FS.userExit || FS.on() || !FS.supported() || isStandalone()) return;
    if (e.target.closest && e.target.closest('#tFS,#banner,dialog,input,textarea,select')) return;
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
    if (myName()) showNotices(false);
  }

  const STAY_KEY = 'prayer-stay-inapp';
  let stay = false; try { stay = sessionStorage.getItem(STAY_KEY) === '1'; } catch (e) {}
  if (IN_APP && !stay && (IN_KAKAO || IS_ANDROID)) {
    $('#app').innerHTML = kickedHtml();
    $('#kkOpen').onclick = openExternal;
    $('#kkStay').onclick = () => { try { sessionStorage.setItem(STAY_KEY, '1'); } catch (e) {} boot(); };
    setTimeout(openExternal, 300);
  } else boot();
  window.__pr = { get S() { return S; }, C, render };
})();
