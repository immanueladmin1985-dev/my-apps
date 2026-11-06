/* 전도현황 앱 화면 */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = Store, C = S.cfg;
  const D = new Proxy({}, { get: (_, k) => S.data[k] });   // 사용법 둘러보기 때 연습 자료로 바뀌어도 따라감
  const alive = d => d && d.deleted !== '1';

  const STATUS = ['대상', '특별', '교인', '장결', '거부', '부재', '교회', '성당', '이사', '기타'];
  const STATUS_LABEL = { 대상: '대상', 특별: '특별대상', 교인: '교인', 장결: '장기결석', 거부: '거부', 부재: '부재', 교회: '다른 교회', 성당: '성당', 이사: '이사', 기타: '기타' };
  const RES = [['만남', '만나서 전달'], ['문앞', '문앞에 두고 옴'], ['부재', '부재'], ['거부', '거부']];
  const RES_LABEL = { 만남: '만남', 문앞: '문앞', 부재: '부재', 거부: '거부', 이사: '이사' };
  const RES_FULL = { 만남: '만나서 전달', 문앞: '문앞에 두고 옴', 부재: '부재', 거부: '거부', 이사: '이사' };
  const GIFT_PRESET = ['꽃', '화분', '달력', '갈비', '김', '계란', '떡', '과자', '초청장', '선물세트'];
  const EVENT_PRESET = ['부활절', '어버이날', '창립기념일', '맥추감사절', '추석', '추수감사절', '성탄절', '설'];
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const sCol = s => `var(--s-${STATUS.includes(s) ? s : '기타'})`;
  const rCol = r => `var(--r-${RES_LABEL[r] ? r : '만남'})`;
  const sTag = s => `<span class="tag" style="background:${sCol(s)}">${esc(STATUS_LABEL[s] || s)}</span>`;
  const rTag = r => `<span class="tag" style="background:${rCol(r)}">${esc(RES_LABEL[r] || r)}</span>`;

  /* ---------- 날짜 ---------- */
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => ymd(new Date());
  function dShort(s) { const m = String(s || '').match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/); return m ? (m[1].slice(2) + '.' + +m[2] + (m[3] ? '.' + +m[3] : '')) : ''; }
  function dLong(s) {
    const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return dShort(s);
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return `${m[1]}.${+m[2]}.${+m[3]}(${WD[d.getDay()]})`;
  }
  const timeStr = t => { const d = new Date(+t || t); return isNaN(d) ? '' : `${d.getMonth() + 1}.${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  /* ---------- 색인 ---------- */
  let IX = { ver: -1 };
  const floorOf = ho => Math.floor(+ho / 100);
  function ix() {
    if (IX.ver === S.ver) return IX;
    const dongs = [...D.dongs.values()].filter(alive).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const unitsByDong = new Map(), roundsByDong = new Map(), visitsByUnit = new Map(), roundById = new Map();
    dongs.forEach(d => { unitsByDong.set(d.id, []); roundsByDong.set(d.id, []); });
    D.units.forEach(u => { if (!alive(u)) return; if (!unitsByDong.has(u.dong)) unitsByDong.set(u.dong, []); unitsByDong.get(u.dong).push(u); });
    unitsByDong.forEach(l => l.sort((a, b) => floorOf(b.ho) - floorOf(a.ho) || (+a.ho % 100) - (+b.ho % 100) || String(a.id).localeCompare(String(b.id))));
    D.rounds.forEach(r => { if (!alive(r)) return; roundById.set(r.id, r); if (!roundsByDong.has(r.dong)) roundsByDong.set(r.dong, []); roundsByDong.get(r.dong).push(r); });
    roundsByDong.forEach(l => l.sort((a, b) => a.no - b.no));
    const statsByRound = new Map();
    D.visits.forEach(v => { if (!alive(v)) return; if (!visitsByUnit.has(v.unit)) visitsByUnit.set(v.unit, []); visitsByUnit.get(v.unit).push(v); bumpStat(statsByRound, v, 1); });
    visitsByUnit.forEach(l => l.sort(cmpVisit));
    // 이름 목록(로그인 때 고르기 쉽게)
    const names = new Set();
    dongs.forEach(d => String(d.managers || '').split(/\s+/).forEach(n => n.length >= 2 && names.add(n)));
    D.visits.forEach(v => v.by && names.add(v.by));
    IX = { ver: S.ver, dongs, unitsByDong, roundsByDong, visitsByUnit, roundById, statsByRound, names: [...names].sort() };
    return IX;
  }
  const cmpVisit = (a, b) => b.no - a.no || (+b.updatedAt || 0) - (+a.updatedAt || 0);
  function bumpStat(map, v, n) {
    const k = v.dong + '-' + v.no; let c = map.get(k);
    if (!c) map.set(k, c = {});
    c[v.res] = (c[v.res] || 0) + n;
    if (c[v.res] <= 0) delete c[v.res];
  }
  // 한 건만 바뀌었으면 색인 전체를 다시 만들지 않고 그 부분만 고침
  function patchIx({ t, rec, before }) {
    if (IX.ver !== S.ver - 1) return;
    if (t === 'visits') {
      let l = IX.visitsByUnit.get(rec.unit);
      if (!l) IX.visitsByUnit.set(rec.unit, l = []);
      const i = l.findIndex(v => v.id === rec.id);
      if (i >= 0) l.splice(i, 1);
      if (before && alive(before)) bumpStat(IX.statsByRound, before, -1);
      if (alive(rec)) { l.push(rec); l.sort(cmpVisit); bumpStat(IX.statsByRound, rec, 1); }
      IX.ver = S.ver;
    } else if (t === 'units' && alive(rec)) {
      const l = IX.unitsByDong.get(rec.dong) || [], i = l.findIndex(u => u.id === rec.id);
      if (i >= 0) { l[i] = rec; IX.ver = S.ver; }
    }
  }
  const isMine = d => C.name && String(d.managers || '').split(/\s+/).some(n => n && (n === C.name || C.name.indexOf(n) >= 0 || n.indexOf(C.name) >= 0));
  const roundOf = v => ix().roundById.get(v.dong + '-' + v.no);
  const giftOf = r => r ? (r.gift || r.event || '') : '';
  function roundLabel(r) { return r ? ([r.date ? dShort(r.date) : '', giftOf(r)].filter(Boolean).join(' · ') || (r.text || '날짜 없음').slice(0, 20)) : ''; }
  function visitLine(v) { const r = roundOf(v); return `${v.no}차 ${r && r.date ? dShort(r.date) + ' ' : ''}${giftOf(r) ? giftOf(r) + ' ' : ''}[${RES_LABEL[v.res] || v.res}] ${v.text || ''}`.trim(); }
  function visitHtml(v) {
    const r = roundOf(v);
    return `<em>${r && r.date ? dShort(r.date) : v.no + '차'}</em> ${esc(giftOf(r))} <span style="color:${rCol(v.res)};font-weight:800">${esc(RES_LABEL[v.res] || v.res)}</span> ${esc(v.res === '부재' && v.text === '부재' ? '' : v.text)}`;
  }
  const unitName = u => `${u.dong}동 ${u.ho}호`;
  const firstLine = s => String(s || '').split('\n')[0].slice(0, 60);
  const activeCampaign = () => { for (const c of D.campaigns.values()) if (alive(c) && c.active === '1') return c; return null; };
  // '지난 전도에 이어 쓰기'를 고른 경우(그날 하루만)
  function overrideRound(dong) { const id = C.activeDay === today() && C.active && C.active[dong]; const r = id && D.rounds.get(id); return alive(r) ? r : null; }
  // 지금 기록이 들어갈 묶음: 오늘 것(이번 전도가 정해져 있으면 그 전도의 오늘 것). 없으면 첫 집을 저장할 때 만듦
  function activeRound(dong) {
    const o = overrideRound(dong); if (o) return o;
    const t = today(), c = activeCampaign(), l = (ix().roundsByDong.get(dong) || []).filter(r => r.date === t);
    return (c ? l.filter(r => r.campaign === c.id) : l).pop() || null;
  }

  /* ---------- 화면 이동 ---------- */
  let view = { name: 'home' };
  const scrolls = {};
  const vkey = v => v.name + ':' + (v.dong || v.id || v.q || '');
  function go(v) {
    scrolls[vkey(view)] = window.scrollY;
    if (v.name === 'log') logRows = null;
    if (v.name === 'devices') { devList = null; devErr = ''; }
    view = v; history.pushState({ v }, '');
    render(); window.scrollTo(0, 0);
  }
  let skipPop = false;
  window.addEventListener('popstate', e => {
    // 집 창을 단추로 닫으며 되돌린 것이면 화면은 그대로 둠(다시 그리면 목록이 맨 위로 올라감)
    if (skipPop) { skipPop = false; return; }
    const st = e.state || {};
    if (sheetOpen() && !st.sheet) { closeSheet(true); if (st.v && vkey(st.v) === vkey(view)) return; }
    if (st.sheet) return;
    view = st.v || { name: 'home' };
    render(); window.scrollTo(0, scrolls[vkey(view)] || 0);
  });

  /* ---------- 공통 그리기 ---------- */
  const SVG = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const ICON = {
    back: SVG('M15 18l-6-6 6-6'), set: SVG('M4 6h16M4 12h16M4 18h16'), fsOn: SVG('M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'),
    fsOff: SVG('M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'), close: SVG('M6 6l12 12M18 6L6 18'), font: SVG('M4 20l5-14h2l5 14M6.5 14h7M17 10h4M19 8v4')
  };
  function syncPill() {
    if (S.sandboxed) return `<span class="sync">연습 중</span>`;
    if (!S.online()) return `<span class="sync" title="구글 시트와 연결되지 않아 이 기기에만 저장돼요">이 기기에만</span>`;
    const st = S.state, n = S.outbox.length;
    if (st.busy) return `<span class="sync">⟳ 맞추는 중</span>`;
    if (n) return `<span class="sync bad" title="인터넷이 되면 자동으로 보내요">못 보낸 기록 ${n}</span>`;
    if (st.error) return `<span class="sync bad">연결 안 됨</span>`;
    return `<span class="sync ok">✓ 저장됨</span>`;
  }
  function top(title, back) {
    return `<header class="top" id="top">
      ${back ? `<button class="ibtn" id="tBack" aria-label="뒤로">${ICON.back}</button>` : ''}
      <h1>${esc(title)}</h1><span id="pill">${syncPill()}</span>
      <button class="ibtn" id="tFont" aria-label="글자 크기">${ICON.font}</button>
      <button class="ibtn ${FS.supported() ? '' : 'hidden'}" id="tFS" aria-label="전체화면">${FS.on() ? ICON.fsOff : ICON.fsOn}</button>
      ${view.name !== 'settings' ? `<button class="ibtn" id="tSet" aria-label="설정">${ICON.set}</button>` : ''}
    </header>`;
  }
  function bindTop() {
    const b = $('#tBack'); if (b) b.onclick = () => history.back();
    const s = $('#tSet'); if (s) s.onclick = () => go({ name: 'settings' });
    $('#tFS').onclick = FS.toggle;
    $('#tFont').onclick = () => { C.font = ((C.font || 0) + 1) % 3; S.saveCfg(); applyFont(); toast(['글자 보통', '글자 크게', '글자 아주 크게'][C.font]); };
  }
  // 글자 크기와 밝게·어둡게
  function applyFont() {
    const h = document.documentElement;
    h.className = C.font ? 'fs-' + C.font : '';
    if (C.theme === 'auto') h.removeAttribute('data-theme'); else h.setAttribute('data-theme', C.theme === 'dark' ? 'dark' : 'light');
    const dark = C.theme === 'dark' || (C.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelectorAll('meta[name=theme-color]').forEach(m => { m.removeAttribute('media'); m.setAttribute('content', dark ? '#111413' : '#f3f4f2'); });
  }
  window.addEventListener('scroll', () => { const t = $('#top'); if (t) t.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });

  function render() {
    applyFont();
    const app = $('#app');
    const gate = authGate();
    if (gate) { app.innerHTML = gate.html; gate.bind(); bindInapp(); wake(false); return; }
    const V = VIEWS[view.name] || VIEWS.home;
    const r = V();
    app.innerHTML = top(r.title, view.name !== 'home') + `<main id="main">${r.html}</main>`;
    bindTop(); r.bind && r.bind();
    paintInstall();
    wake(view.name === 'dong');
  }
  let rq = 0;
  // 글자를 쓰는 중에는 화면을 다시 그리지 않음(쓰던 글이 사라지지 않게) → 다 쓰고 나서 그림
  const typing = () => { const a = document.activeElement; return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#main')); };
  function redrawKeepScroll() { const y = window.scrollY; render(); window.scrollTo(0, y); }
  S.on((why, info) => {
    if (why === 'sync') { const p = $('#pill'); if (p) p.innerHTML = syncPill(); const w = $('#waitBar'); if (w) w.outerHTML = waitBar(); bindWaitBar(); return; }
    if (why === 'auth') { closeSheet(true); render(); return; }
    if (why === 'put') { patchIx(info); return; }   // 내가 고친 것은 그 자리에서 다시 그림
    cancelAnimationFrame(rq); rq = requestAnimationFrame(() => { if (sheetOpen() || typing()) pendingRender = true; else redrawKeepScroll(); });
  });
  document.addEventListener('focusout', () => setTimeout(() => { if (pendingRender && !sheetOpen() && !typing()) { pendingRender = false; redrawKeepScroll(); } }, 200));
  let pendingRender = false;

  // 무거운 도구는 쓸 때만 읽음(앱을 열 때마다 읽으면 시작이 느려짐)
  const libs = {};
  function loadLib(src) {
    return libs[src] || (libs[src] = new Promise((res, rej) => {
      const el = document.createElement('script'); el.src = src; el.onload = res;
      el.onerror = () => { delete libs[src]; rej(new Error('도구를 읽지 못했어요. 인터넷을 확인해 주세요')); };
      document.head.appendChild(el);
    }));
  }
  const needXlsx = () => loadLib('vendor/xlsx.full.min.js');

  /* ---------- 초대 링크 · 카카오톡 안 브라우저 ---------- */
  // 서버 주소는 ?s= 로 붙임(#s= 는 '다른 브라우저로 열기' 때 빠지는 경우가 있음)
  const appBase = () => location.origin + location.pathname;
  const joinLink = () => appBase() + (C.server ? '?s=' + encodeURIComponent(C.server) : '');
  const UA = navigator.userAgent;
  const IN_KAKAO = /KAKAOTALK/i.test(UA), IN_APP = IN_KAKAO || /NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp/i.test(UA);
  const IS_ANDROID = /Android/i.test(UA), IS_IOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // 카카오톡 등 앱 안의 브라우저는 크롬과 저장 공간이 따로라서, 여기서 승인받으면 크롬에서 다시 승인받아야 함
  function inappBar() {
    if (!IN_APP) return '';
    return `<div class="banner warnb inapp"><span>📌 지금 <b>${IN_KAKAO ? '카카오톡' : '앱'} 안</b>에서 열려 있어요. 홈 화면에 설치하려면 <b>${IS_IOS ? '사파리' : '크롬'}</b>로 열어 주세요.${C.status === '승인' ? '<br><small>(크롬에서는 승인을 한 번 더 받아야 해요)</small>' : ''}</span><button class="btn pri" id="openExt">${IS_IOS ? '사파리' : '크롬'}로 열기</button></div>`;
  }
  function bindInapp() { const b = $('#openExt'); if (b) b.onclick = openExternal; }
  function openExternal() {
    const url = joinLink();
    if (IN_KAKAO) { location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url); return; }
    if (IS_ANDROID) { location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end'; return; }
    modal(`<h3>${IS_IOS ? '사파리' : '크롬'}로 열기</h3><p class="msg">오른쪽 아래(또는 위)의 <b>⋯</b> 메뉴에서 <b>${IS_IOS ? 'Safari로 열기' : '다른 브라우저로 열기'}</b>를 눌러 주세요.</p>`, [{ label: '알겠어요', val: true, cls: 'pri' }]);
  }
  async function showJoinQR() {
    const url = joinLink();
    try { await loadLib('vendor/qrcode.js'); } catch (e) { toast(e.message); return; }
    let svg = '';
    try { const q = qrcode(0, 'M'); q.addData(url); q.make(); svg = q.createSvgTag({ cellSize: 6, margin: 3, scalable: true }); } catch (e) { svg = '<p class="err">QR을 만들지 못했어요</p>'; }
    modal(`<h3>📷 초대 QR</h3><div class="qr">${svg}</div>
      <p class="msg">새 휴대폰의 <b>카메라</b>로 이 QR을 비추고, 뜨는 주소를 누르세요.
카카오톡을 거치지 않고 바로 <b>크롬·삼성 인터넷·사파리</b>로 열려서 홈 화면 설치까지 한 번에 돼요.
열리면 이름을 넣고 <b>승인 요청</b> → 여기 <b>기기 승인</b>에서 승인해 주세요.</p>`,
      [{ label: '닫기', val: true, cls: 'pri' }]);
  }

  /* ---------- 로그인 (기기 승인) ---------- */
  // 구글 시트와 연결되어 있으면 이 기기가 승인되어야 열림. 연결 전(이 기기에만 저장)에는 이름만 넣음
  let pollTimer = null;
  function authGate() {
    clearInterval(pollTimer); pollTimer = null;
    if (S.sandboxed) return null;
    if (!C.server) return C.name ? null : { html: localLoginHtml(), bind: bindLocalLogin };
    if (C.status === '승인' && C.name) return null;
    if (C.status === '대기') return { html: waitHtml(), bind: bindWait };
    return { html: joinHtml(), bind: bindJoin };
  }
  const loginShell = inner => `<div class="login"><div class="card">
      ${inappBar()}<img src="icon-192.png" alt=""><h1>전도현황</h1>${inner}</div></div>`;
  function localLoginHtml() {
    return loginShell(`<form id="lg" autocomplete="off" class="set">
      <p>이름을 넣고 들어가세요.</p>
      <label class="field"><span>내 이름</span><input id="lgName" value="${esc(C.name)}" placeholder="예: 홍길동"></label>
      <div class="err" id="lgErr"></div>
      <button class="btn pri big" type="submit">들어가기</button>
      <p class="small">아직 구글 시트와 연결되지 않아 이 기기에만 저장돼요.<br>관리자는 들어간 뒤 설정에서 연결할 수 있어요.</p></form>`);
  }
  function bindLocalLogin() {
    $('#lg').onsubmit = e => {
      e.preventDefault();
      const name = $('#lgName').value.trim().replace(/\s+/g, '');
      if (name.length < 2) { $('#lgErr').textContent = '이름을 두 글자 이상 넣어 주세요.'; return; }
      C.name = name; S.saveCfg(); render(); offerTutorial();
    };
  }
  function joinHtml() {
    const why = { 거절: '이 휴대폰의 요청은 관리자가 거절했어요. 다시 요청할 수 있어요.', 끊김: '이 휴대폰은 관리자가 사용을 끊었어요. 다시 요청할 수 있어요.', 열쇠: '기기 정보가 맞지 않아요. 아래에서 다시 요청해 주세요.' }[C.status] || '';
    return loginShell(`<form id="jn" autocomplete="off" class="set">
      <p>처음 쓰는 휴대폰이에요.<br>이름을 넣고 <b>승인 요청</b>을 보내 주세요.<br>관리자가 승인하면 바로 열려요.</p>
      ${why ? `<p class="err">${why}</p>` : ''}
      <label class="field"><span>내 이름</span><input id="jnName" value="${esc(C.name)}" placeholder="예: 홍길동"></label>
      <div class="err" id="jnErr"></div>
      <button class="btn pri big" type="submit">승인 요청 보내기</button>
      <button class="btn ghost" type="button" id="jnMaster">관리자(마스터)로 들어가기</button></form>`);
  }
  function bindJoin() {
    $('#jn').onsubmit = async e => {
      e.preventDefault();
      const name = $('#jnName').value.trim().replace(/\s+/g, ''), err = $('#jnErr');
      if (name.length < 2) { err.textContent = '이름을 두 글자 이상 넣어 주세요.'; return; }
      err.textContent = '보내는 중…';
      try {
        if (C.status === '열쇠') { localStorage.removeItem('evangelism-device'); }
        await S.call('join', { name, desc: await S.deviceDesc() }, 30000);
        C.name = name; S.saveCfg(); render();
      } catch (x) {
        if (x.code === 'key') { err.textContent = '기기 정보가 맞지 않아요. 관리자에게 알려 주세요.'; return; }
        err.textContent = x.message;
      }
    };
    $('#jnMaster').onclick = masterLogin;
  }
  function waitHtml() {
    return loginShell(`<div class="set" style="text-align:center">
      <p><b>${esc(C.name)}</b> 님, 승인을 기다리는 중이에요.</p>
      <div class="code">${esc(C.code || '----')}</div>
      <p>관리자에게 이 <b>확인 번호</b>를 보여 주세요.<br>관리자가 승인하면 저절로 열려요.</p>
      <p class="small muted" id="wtDesc"></p>
      <div class="err" id="wtErr"></div>
      <button class="btn" id="wtCheck">지금 확인하기</button>
      <div class="line" style="justify-content:center"><button class="btn ghost sm" id="wtName">이름 다시 쓰기</button><button class="btn ghost sm" id="wtMaster">관리자(마스터)로 들어가기</button></div></div>`);
  }
  function bindWait() {
    S.deviceDesc().then(d => { const el = $('#wtDesc'); if (el) el.textContent = '이 기기: ' + d; });
    const check = async (manual) => {
      try {
        await S.call('hello', {}, 25000);
        if (C.status === '승인') { clearInterval(pollTimer); toast('승인됐어요! 기록을 받는 중이에요'); C.since = 0; S.saveCfg(); render(); await S.fullReload(); offerTutorial(); }
      } catch (x) {
        if (S.authFail(x)) { if (C.status !== '대기') render(); else if (manual) $('#wtErr').textContent = '아직 승인 전이에요.'; return; }
        if (manual) $('#wtErr').textContent = x.message;
      }
    };
    $('#wtCheck').onclick = () => check(true);
    $('#wtName').onclick = () => { C.status = ''; S.saveCfg(); render(); };
    $('#wtMaster').onclick = masterLogin;
    pollTimer = setInterval(() => { if (document.visibilityState === 'visible') check(false); }, 6000);
  }
  // 마스터 암호로 들어가기: 이 기기가 마스터로 저장됨(휴대폰을 바꿨을 때도 이렇게)
  async function masterLogin() {
    const ok = await modal(`<h3>관리자(마스터)로 들어가기</h3>
      <p class="msg">구글 시트 <b>설정</b> 탭 B3 칸의 마스터 암호를 넣으세요.\n이 기기가 마스터 기기로 저장되어 다음부터는 저절로 마스터로 열려요.</p>
      <label class="field"><span>이름</span><input id="mNm" value="${esc(C.name)}" placeholder="예: 홍길동"></label>
      <label class="field"><span>마스터 암호</span><input id="mPw" type="password"></label>`,
      [{ label: '취소', val: false }, { label: '들어가기', val: true, cls: 'pri' }]);
    if (!ok) return false;
    const name = $('#mNm').value.trim().replace(/\s+/g, ''), mpass = $('#mPw').value.trim();
    if (name.length < 2) { toast('이름을 두 글자 이상 넣어 주세요'); return false; }
    toast('확인하는 중…');
    try {
      await S.call('master', { name, mpass, desc: await S.deviceDesc() }, 30000);
      toast('마스터로 들어왔어요'); C.since = 0; S.saveCfg(); render(); await S.fullReload(); render();
      return true;
    } catch (x) {
      if (['mpass', 'locked'].includes(x.code)) toast(x.message); else connectHelp(x.code, C.server);
      return false;
    }
  }
  const isMaster = () => S.online() && C.role === '마스터';

  /* ---------- 첫 화면 ---------- */
  function dongCard(d, ctx) {
    const n = dongCounts(d.id, ctx), rs = ix().roundsByDong.get(d.id) || [], last = rs[rs.length - 1];
    const pct = n.go ? Math.round(n.done / n.go * 100) : 0;
    return `<button class="dong" data-dong="${esc(d.id)}">
      <span class="dl"><span class="nm">${esc(d.id)}동${isMine(d) ? ' <span class="mine">내 담당</span>' : ''}</span>
        <span class="mgr">${esc(d.managers || '담당자 없음')}</span>
        ${ctx.c ? `<span class="prog"><i style="width:${pct}%"></i></span>` : `<span class="mgr">${last ? '마지막 ' + esc(roundLabel(last)) : '아직 기록 없음'}</span>`}</span>
      <span class="dr">${ctx.c ? '남은 집' : '갈 집'}<b>${ctx.c ? n.left : n.go}</b></span>
    </button>`;
  }
  const VIEWS = {};
  VIEWS.home = () => {
    const X = ix();
    const groups = {};
    X.dongs.forEach(d => { const k = d.complex || String(d.id)[0]; (groups[k] = groups[k] || []).push(d); });
    const keys = Object.keys(groups).sort();
    keys.forEach(k => groups[k].sort((a, b) => (isMine(b) - isMine(a)) || String(a.id).localeCompare(String(b.id))));
    const empty = !X.dongs.length;
    // 단지 탭: 고른 것이 없으면 내 담당 동이 있는 단지부터
    const tab = keys.includes(C.homeTab) ? C.homeTab : (keys.find(k => groups[k].some(isMine)) || keys[0]);
    const cnt = k => groups[k].reduce((a, d) => a + (X.unitsByDong.get(d.id) || []).length, 0);
    const hc = activeCampaign(), hctx = { c: hc, ar: null, over: false };
    const html = `
      <div class="banner hidden" id="banner"><img src="icon-192.png" alt=""><span>홈 화면에 설치하면 아이콘으로 바로 열 수 있어요.</span>
        <button class="btn pri" id="bInst">설치하기</button><button class="btn" id="bFs">전체화면</button><button class="btn ghost" id="bLater">다음에</button></div>
      ${inappBar()}${waitBar()}
      <p class="hello"><b>${esc(C.name)}</b> 님, 반가워요 🙂 <button class="link" id="hTut">▶ 사용법 보기</button></p>
      ${hc ? `<div class="campbar">📣 이번 전도: <b>${esc([hc.title, hc.gift].filter(Boolean).join(' '))}</b></div>` : ''}
      <form class="searchbox" id="sf"><input id="sq" type="search" placeholder="🔍 호수·이름·전화·내용 찾기 (예: 1807)" enterkeyhint="search"></form>
      <div class="quick">
        <button id="qCare"><i>⭐</i>챙길 집</button>
        <button id="qSim"><i>🙏</i>심방대상</button>
        <button id="qList"><i>📋</i>구분별 보기</button>
        <button id="qRep"><i>🖨</i>목록·인쇄</button>
      </div>
      ${isMaster() || !C.server ? '<button class="btn dashbtn" id="qDash">📊 현황판 · 이번 전도 정하기</button>' : ''}
      ${empty ? `<div class="empty">아직 자료가 없어요.<br>관리자가 <b>설정 → 관리자 → 원래 엑셀 불러오기</b>로<br>1단지·2단지 엑셀 파일을 넣어 주세요.<br><br><button class="btn pri" id="goSet">설정 열기</button></div>` : ''}
      ${keys.length > 1 ? `<div class="ctabs" role="tablist">${keys.map(k => `<button role="tab" data-tab="${esc(k)}" class="${k === tab ? 'on' : ''}" aria-selected="${k === tab}">${esc(k)}단지<small>${groups[k].length}개 동 · ${cnt(k)}세대</small></button>`).join('')}</div>`
        : keys.map(k => `<h2 class="sec">${esc(k)}단지 <small>${groups[k].length}개 동 · ${cnt(k)}세대</small></h2>`).join('')}
      ${tab ? `<div class="dongs">${groups[tab].map(d => dongCard(d, hctx)).join('')}</div>` : ''}
      <div style="margin-top:1.4rem;text-align:center"><button class="btn ghost" id="hInst2">📲 홈 화면에 설치하기</button></div>`;
    return {
      title: '전도현황', html, bind() {
        document.querySelectorAll('.dong').forEach(b => b.onclick = () => go({ name: 'dong', dong: b.dataset.dong }));
        document.querySelectorAll('.ctabs [data-tab]').forEach(b => b.onclick = () => { C.homeTab = b.dataset.tab; S.saveCfg(); redrawKeepScroll(); });
        $('#sf').onsubmit = e => { e.preventDefault(); const q = $('#sq').value.trim(); if (q) go({ name: 'search', q }); };
        $('#qList').onclick = () => go({ name: 'list' });
        $('#qSim').onclick = () => go({ name: 'simbang' });
        $('#qCare').onclick = () => go({ name: 'care' });
        const qd = $('#qDash'); if (qd) qd.onclick = () => go({ name: 'dash' });
        $('#qRep').onclick = () => go({ name: 'report' });
        $('#hTut').onclick = () => startTutorial();
        bindWaitBar(); bindInapp();
        const gs = $('#goSet'); if (gs) gs.onclick = () => go({ name: 'settings' });
        $('#bInst').onclick = installSheet; $('#bFs').onclick = FS.toggle; $('#hInst2').onclick = installSheet;
        $('#bLater').onclick = () => { C.installDismissed = true; S.saveCfg(); paintInstall(); toast('맨 아래나 설정에서 언제든 설치할 수 있어요'); };
      }
    };
  };

  // 마스터에게: 승인을 기다리는 기기가 있으면 첫 화면 위에 알림
  function waitBar() {
    const a = isMaster() && C.waiting ? `<div class="banner warnb"><span>📱 승인을 기다리는 휴대폰이 <b>${C.waiting}대</b> 있어요.</span><button class="btn pri" id="wbGo">승인하러 가기</button></div>` : '';
    return `<div id="waitBar">${a}${serverBar()}</div>`;
  }
  function bindWaitBar() { const b = $('#wbGo'); if (b) b.onclick = () => go({ name: 'devices' }); bindServerBar(); }
  // 서버 코드가 예전 판이면 마스터에게 알림
  function serverBar() {
    return isMaster() && C.serverVer && C.serverVer < 3 ? '<div class="banner warnb"><span>⚙️ 새 기능을 쓰려면 <b>서버 코드를 새로 바꿔</b> 주세요.</span><button class="btn pri" id="srvBtn">바꾸는 방법</button></div>' : '';
  }
  function bindServerBar() { const b = $('#srvBtn'); if (b) b.onclick = howToConnect; }

  /* ---------- 동 화면 ---------- */
  const DONG_FILTER = {};
  const GO_STATUS = ['대상', '특별', '교인', '장결', '부재', '기타'];   // 찾아갈 집 (다른 교회·성당·이사·거부는 기본으로 접어 둠)
  const isGo = u => GO_STATUS.includes(u.status);
  // 지금 기록하는 기준: 이번 전도(마스터가 정함) 또는 오늘
  function workCtx(dong) { return { c: activeCampaign(), ar: activeRound(dong), over: !!overrideRound(dong) }; }
  function doneVisit(vs, ctx) {
    if (ctx.over) return vs.find(v => v.no === ctx.ar.no);
    const t = today();
    return vs.find(v => { const r = roundOf(v); return r && (ctx.c ? r.campaign === ctx.c.id : r.date === t); });
  }
  function dongCounts(dong, ctx) {
    const X = ix(); let go = 0, done = 0, gave = 0;
    (X.unitsByDong.get(dong) || []).forEach(u => {
      const d = doneVisit(X.visitsByUnit.get(u.id) || [], ctx);
      if (isGo(u)) { go++; if (d) done++; }
      if (d && (d.res === '만남' || d.res === '문앞')) gave++;
    });
    return { go, done, left: Math.max(0, go - done), gave };
  }
  function unitCard(u, ctx) {
    const vs = ix().visitsByUnit.get(u.id) || [];
    const cur = doneVisit(vs, ctx);
    const past = (cur ? vs.filter(v => v !== cur) : vs).slice(0, 2);
    return `<button class="unit ${cur ? 'done' : ''}" data-u="${esc(u.id)}" style="border-left-color:${sCol(u.status)}">
      <span class="l"><b>${esc(u.ho)}</b>${sTag(u.status)}${u.simbang === '1' ? '<span class="sim">🙏 심방</span>' : ''}</span>
      <span class="r">${u.memo ? `<span class="who">${esc(firstLine(u.memo))}</span>` : ''}
      ${u.tip ? `<span class="tipline">💡 ${esc(u.tip)}</span>` : ''}${u.todo ? `<span class="todoline">📌 ${esc(u.todo)}</span>` : ''}
      ${cur ? `<span class="now">✓ 다녀옴: ${esc(RES_FULL[cur.res] || cur.res)}${cur.text && cur.text !== (RES_FULL[cur.res] || cur.res) ? ' · ' + esc(cur.text) : ''}</span>` : ''}
      ${past.map(v => `<span class="ln">${visitHtml(v)}</span>`).join('') || (cur ? '' : '<span class="none">기록 없음</span>')}</span>
    </button>`;
  }
  function roundStats(r) {
    const c = ix().statsByRound.get(r.dong + '-' + r.no) || {}, keys = Object.keys(c);
    return keys.length ? keys.map(k => `${RES_LABEL[k] || k} ${c[k]}`).join(' · ') : '기록 없음';
  }
  function roundRow(r) {
    return `<div class="rd"><span class="tx"><b>${esc(r.date ? dLong(r.date) : (r.text || '날짜 없음').slice(0, 24))}</b> ${esc(giftOf(r))}${r.gift && r.event && r.event !== r.gift ? ' <span class="muted">· ' + esc(r.event) + '</span>' : ''}
      <br><span class="small">${esc(roundStats(r))}</span>${r.people ? ` <span class="muted small">· ${esc(r.people)}</span>` : ''}</span></div>`;
  }
  function barSmall(dong, ctx) {
    const n = dongCounts(dong, ctx);
    return !ctx.c && !ctx.ar ? `남은 집 ${n.left}곳 · 첫 집을 누르면 선물을 물어봐요` : `남은 집 ${n.left}곳 · ${n.done}집 다녀옴`;
  }
  function todayBar(dong, ctx) {
    const title = ctx.over ? `${dShort(ctx.ar.date)} ${giftOf(ctx.ar)} 기록 이어 쓰는 중` : ctx.c ? `📣 이번 전도: ${[ctx.c.title, ctx.c.gift].filter(Boolean).join(' ')}` : ctx.ar ? `오늘 전도: ${giftOf(ctx.ar)}` : '오늘 전도';
    return `<div class="active"><span class="t">${esc(title)}<small id="barSmall">${esc(barSmall(dong, ctx))}</small></span>
      ${ctx.over ? '<button id="endR">끝내기</button>' : ctx.ar && !ctx.c ? '<button id="editR">선물 바꾸기</button>' : ''}</div>`;
  }
  VIEWS.dong = () => {
    const X = ix(), dong = view.dong, d = D.dongs.get(dong) || { id: dong, managers: '' };
    const us = X.unitsByDong.get(dong) || [], rs = X.roundsByDong.get(dong) || [];
    const ctx = workCtx(dong);
    const f = DONG_FILTER[dong] || '갈집';
    const c = {}; us.forEach(u => c[u.status] = (c[u.status] || 0) + 1);
    const n = dongCounts(dong, ctx);
    const list = us.filter(u => f === '전체' ? true : f === '갈집' ? isGo(u) : f === '남은집' ? (isGo(u) && !doneVisit(X.visitsByUnit.get(u.id) || [], ctx)) : f === '심방' ? (u.simbang === '1' || u.status === '특별') : u.status === f);
    let html = todayBar(dong, ctx);
    const fl = ['갈집', '남은집', '전체', '심방', ...STATUS.filter(s => c[s])];
    const flLabel = s => s === '갈집' ? `갈 집 <small>${n.go}</small>` : s === '남은집' ? `남은 집 <small>${n.left}</small>` : s === '전체' ? `전체 <small>${us.length}</small>` : s === '심방' ? '🙏 심방' : `<i class="dot" style="background:${sCol(s)}"></i>${STATUS_LABEL[s]} <small>${c[s]}</small>`;
    html += `<div class="chips scroll" style="margin:.2rem 0 .2rem">${fl.map(s => `<button class="chip ${s === f ? 'on' : ''}" data-f="${s}">${flLabel(s)}</button>`).join('')}</div>`;
    let lastFloor = null, body = '';
    list.forEach(u => {
      const fl2 = floorOf(u.ho);
      if (fl2 !== lastFloor) { if (lastFloor !== null) body += '</div>'; body += `<div class="floor">${fl2}층</div><div class="units">`; lastFloor = fl2; }
      body += unitCard(u, ctx);
    });
    if (lastFloor !== null) body += '</div>';
    html += body || `<div class="empty">${f === '남은집' ? '모두 다녀오셨어요. 수고하셨어요! 🎉' : '해당하는 집이 없어요.'}</div>`;
    html += `<details class="card noprint" style="margin-top:1.2rem" id="dPast"><summary><b>이 동의 지난 전도</b> <span class="muted small">담당 ${esc(d.managers || '-')} · ${rs.length}번</span></summary>
        <div class="rounds dpast">${rs.slice(-2).reverse().map(roundRow).join('') || '<p class="muted">아직 없어요.</p>'}</div>
        ${rs.length > 2 ? '<button class="btn ghost sm" id="allR">모두 보기</button>' : ''}</details>
      <div class="noprint dacts">
      <button class="btn ghost" id="dShare">📤 오늘 결과 보내기</button><button class="btn ghost" id="dPrint">🖨 이 동 목록·인쇄</button><button class="btn ghost" id="dXls">📥 엑셀</button></div>`;
    return {
      title: dong + '동', html, bind() {
        document.querySelectorAll('.unit').forEach(b => b.onclick = () => openUnit(b.dataset.u));
        document.querySelectorAll('.chip[data-f]').forEach(b => b.onclick = () => { DONG_FILTER[dong] = b.dataset.f; redrawKeepScroll(); });
        const a = $('#allR'); if (a) a.onclick = () => go({ name: 'rounds', dong });
        const e = $('#endR'); if (e) e.onclick = () => { delete C.active[dong]; S.saveCfg(); render(); toast('이어 쓰기를 마쳤어요'); };
        const er = $('#editR'); if (er) er.onclick = () => editRound(ctx.ar);
        $('#dXls').onclick = () => exportAll([dong]);
        $('#dShare').onclick = () => shareToday([dong]);
        $('#dPrint').onclick = () => { REP.dongs = [dong]; saveRep(); go({ name: 'report' }); };
      }
    };
  };

  VIEWS.rounds = () => {
    const dong = view.dong, rs = (ix().roundsByDong.get(dong) || []).slice().reverse();
    return {
      title: dong + '동 지난 전도', html: `<div class="card rounds">${rs.map(r => `<button class="rdb" data-r="${esc(r.id)}" style="display:block;width:100%;text-align:left">${roundRow(r)}</button>`).join('') || '<p class="muted">아직 없어요.</p>'}</div>`,
      bind() { document.querySelectorAll('.rdb').forEach(b => b.onclick = () => go({ name: 'round', id: b.dataset.r })); }
    };
  };
  VIEWS.round = () => {
    const r = D.rounds.get(view.id);
    if (!alive(r)) return { title: '지난 전도', html: '<div class="empty">지워진 기록이에요.</div>' };
    const vs = [...D.visits.values()].filter(v => alive(v) && v.dong === r.dong && v.no === r.no).sort((a, b) => +b.unit.split('-')[1] - +a.unit.split('-')[1]);
    const html = `<div class="card">${roundRow(r)}${r.text ? `<p class="small muted" style="margin-top:.4rem">${esc(r.text)}</p>` : ''}
      <div style="display:flex;gap:.5rem;margin-top:.6rem;flex-wrap:wrap"><button class="btn sm ghost" id="rEdit">고치기</button>
      <button class="btn sm ghost" id="rUse">이 전도에 기록 이어 쓰기</button></div></div>
      <h2 class="sec">다녀온 집 <small>${vs.length}집</small></h2>
      <div class="list">${vs.map(v => { const u = D.units.get(v.unit) || { ho: v.unit, status: '기타' }; return `<button class="row" data-u="${esc(v.unit)}" style="border-left-color:${sCol(u.status)}"><span class="h"><b>${esc(u.ho)}호</b>${sTag(u.status)}${rTag(v.res)}</span><span class="ln">${esc(v.text)}</span></button>`; }).join('')}</div>`;
    return {
      title: `${r.dong}동 ${dShort(r.date) || '지난 전도'}`, html, bind() {
        document.querySelectorAll('.row').forEach(b => b.onclick = () => openUnit(b.dataset.u));
        $('#rEdit').onclick = () => editRound(r);
        $('#rUse').onclick = () => { C.active[r.dong] = r.id; C.activeDay = today(); S.saveCfg(); go({ name: 'dong', dong: r.dong }); };
      }
    };
  };

  /* ---------- 전도 기록 묶음 (날짜·선물) ---------- */
  function knownGifts(dong) {
    const set = new Set();
    (ix().roundsByDong.get(dong) || []).slice(-12).reverse().forEach(r => r.gift && set.add(r.gift));
    GIFT_PRESET.forEach(g => set.add(g));
    return [...set].slice(0, 12);
  }
  function roundForm(r, dong) {
    return `<label class="field"><span>날짜</span><input type="date" id="rfDate" value="${esc(r.date || today())}"></label>
      <div class="field"><span>무엇으로 전도했나요? (선물)</span><div class="chips" id="rfGifts">${knownGifts(dong).map(g => `<button type="button" class="chip ${g === r.gift ? 'on' : ''}" data-v="${esc(g)}">${esc(g)}</button>`).join('')}</div>
        <input id="rfGift" value="${esc(r.gift || '')}" placeholder="직접 쓰기 (예: 부활절 꽃)"></div>
      <div class="field"><span>행사 (없으면 비워 두세요)</span><div class="chips" id="rfEvents">${EVENT_PRESET.map(g => `<button type="button" class="chip ${g === r.event ? 'on' : ''}" data-v="${esc(g)}">${esc(g)}</button>`).join('')}</div>
        <input id="rfEvent" value="${esc(r.event || '')}" placeholder="예: 성탄절"></div>
      <label class="field"><span>함께 간 사람</span><input id="rfPeople" value="${esc(r.people != null ? r.people : C.name)}" placeholder="예: 홍길동, 김영희"></label>`;
  }
  function bindRoundForm() {
    [['#rfGifts', '#rfGift'], ['#rfEvents', '#rfEvent']].forEach(([box, inp]) => {
      document.querySelectorAll(box + ' .chip').forEach(b => b.onclick = () => {
        const on = !b.classList.contains('on');
        document.querySelectorAll(box + ' .chip').forEach(x => x.classList.remove('on'));
        if (on) b.classList.add('on');
        $(inp).value = on ? b.dataset.v : '';
      });
    });
  }
  const readRoundForm = () => ({ date: $('#rfDate').value || today(), gift: $('#rfGift').value.trim(), event: $('#rfEvent').value.trim(), people: $('#rfPeople').value.trim().replace(/\s*,\s*|\s+/g, ', ') });
  function autoText(r) { return `${dShort(r.date)}.${WD[new Date(r.date + 'T00:00').getDay()] || ''} ${r.gift || ''}${r.people ? ' (' + r.people + ')' : ''}`.replace(/\s+/g, ' ').trim(); }
  function nextNo(dong) { let m = 0; (ix().roundsByDong.get(dong) || []).forEach(r => { if (r.no > m) m = r.no; }); D.visits.forEach(v => { if (v.dong === dong && v.no > m) m = v.no; }); return m + 1; }
  function newRound(dong, f) { const no = nextNo(dong); return S.put('rounds', Object.assign({ id: dong + '-' + no, dong, no }, f, { text: autoText(f) })); }

  // 기록할 묶음을 찾음: 오늘 이미 있으면 그것, 이번 전도가 있으면 저절로 만듦, 없으면 선물을 한 번 물어봄
  async function ensureRound(dong) {
    const ar = activeRound(dong);
    if (ar) return ar;
    S.scheduleSync(0);
    const c = activeCampaign();
    if (c) return newRound(dong, { date: today(), gift: c.gift || '', event: c.title || '', people: C.name, campaign: c.id });
    const v = await modal(`<h3>오늘 무엇으로 전도하세요?</h3><p class="msg">하나만 고르면 오늘 ${esc(dong)}동 기록에 계속 쓰여요.</p>
      <div class="chips bigchips">${knownGifts(dong).map(g => `<button type="button" class="chip" data-g="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      <input id="agGift" placeholder="직접 쓰기">`,
      [{ label: '취소', val: false }, { label: '확인', val: 'typed', cls: 'pri' }],
      root => root.querySelectorAll('[data-g]').forEach(b => b.onclick = () => closeModal('g:' + b.dataset.g)));
    if (!v) return null;
    const gift = v === 'typed' ? $('#agGift').value.trim() : v.slice(2);
    if (!gift) { toast('선물을 골라 주세요'); return null; }
    return newRound(dong, { date: today(), gift, event: '', people: C.name, campaign: '' });
  }
  // 지난 날짜로 쓰고 싶을 때
  async function makeRoundByHand(dong) {
    const ok = await modal(`<h3>다른 날 전도 기록 만들기</h3>${roundForm({}, dong)}`, [{ label: '취소', val: false }, { label: '만들기', val: true, cls: 'pri' }], bindRoundForm);
    if (!ok) return null;
    const f = readRoundForm();
    if (!f.gift && !f.event) { toast('무엇으로 전도했는지 골라 주세요'); return null; }
    return newRound(dong, Object.assign(f, { campaign: '' }));
  }
  async function editRound(r) {
    const vcount = (ix().statsByRound.get(r.dong + '-' + r.no) ? Object.values(ix().statsByRound.get(r.dong + '-' + r.no)).reduce((a, b) => a + b, 0) : 0);
    const v = await modal(`<h3>${esc(r.dong)}동 전도 고치기</h3>${roundForm(r, r.dong)}`,
      [...(vcount ? [] : [{ label: '지우기', val: 'del', cls: 'warn' }]), { label: '취소', val: false }, { label: '저장', val: true, cls: 'pri' }], bindRoundForm);
    if (v === 'del') { S.del('rounds', r.id); if (C.active[r.dong] === r.id) { delete C.active[r.dong]; S.saveCfg(); } render(); toast('지웠어요'); return; }
    if (!v) return;
    const f = readRoundForm();
    S.put('rounds', Object.assign({ id: r.id }, f, { text: r.by ? autoText(f) : r.text }));
    render(); toast('고쳤어요');
  }

  /* ---------- 한 집 (아래에서 올라오는 창) ---------- */
  // 자주 쓰는 말: 누르면 메모에 들어가고, 알아둘 점·할 일·심방대상도 함께 표시됨
  const PHRASES = [
    { t: '고맙다고 받으심' }, { t: '예배 권함' },
    { t: '예배 오겠다고 함', todo: '예배 오겠다고 하심 — 주일 전에 연락' }, { t: '교회 다녀 본 적 있음' },
    { t: '건강이 안 좋으심', sim: 1 }, { t: '다시 가 보기', todo: '다시 가 보기' },
    { t: '저녁에만 계심', tip: '저녁에만 계심' }, { t: '낮에만 계심', tip: '낮에만 계심' }
  ];
  const PHONE_RE = /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g;
  const phonesOf = u => [...new Set(String((u.memo || '') + ' ' + (u.tip || '') + ' ' + (u.todo || '')).match(PHONE_RE) || [])];
  const addPart = (s, p) => { s = s || ''; return s.indexOf(p) >= 0 ? s : (s ? s + ' · ' : '') + p; };
  const delPart = (s, p) => String(s || '').split(' · ').filter(x => x !== p).join(' · ');

  let sheetUnit = null, sheetRound = null, sheetAll = false;
  const sheetOpen = () => !!$('#sheet');
  function openUnit(id) {
    sheetUnit = id; sheetRound = null; sheetAll = false;
    const nx = $('.unit.next'); if (nx) nx.classList.remove('next');
    history.pushState({ v: view, sheet: id }, '');
    drawSheet();
  }
  // 쓰던 메모가 있으면 닫을 때 함께 저장
  function commitMemo() {
    const t = $('#eText'); if (!t) return;
    const v = D.visits.get(t.dataset.vid), val = t.value.trim();
    if (v && alive(v) && val && val !== v.text) S.put('visits', { id: v.id, text: val });
  }
  function closeSheet(fromPop) {
    commitMemo();
    const el = $('#sheet'); if (el) el.remove();
    document.body.style.overflow = '';
    if (!fromPop && history.state && history.state.sheet) { skipPop = true; history.back(); }
    if (pendingRender) { pendingRender = false; redrawKeepScroll(); }
  }
  function sheetCur(u) {
    const vs = ix().visitsByUnit.get(u.id) || [];
    if (sheetRound) return vs.find(v => v.no === sheetRound.no);
    return doneVisit(vs, workCtx(u.dong));
  }
  function drawSheet() {
    const u = D.units.get(sheetUnit); if (!u) return;
    const vs = ix().visitsByUnit.get(u.id) || [];
    const ctx = workCtx(u.dong), r = sheetRound || ctx.ar, cur = sheetCur(u);
    const label = sheetRound ? roundLabel(sheetRound) : ctx.c ? `이번 전도 · ${[ctx.c.title, ctx.c.gift].filter(Boolean).join(' ')}` : r ? `오늘 · ${giftOf(r)}` : '오늘';
    const defText = cur ? (RES_FULL[cur.res] || cur.res) : '';
    const memoVal = cur && cur.text !== defText ? cur.text : '';
    const phones = phonesOf(u);
    const showMemo = cur && (cur.res === '만남' || memoVal);
    const html = `<div class="sheet" id="sheet"><div class="pane" role="dialog" aria-label="${esc(unitName(u))}">
      <div class="sh"><h3>${esc(unitName(u))}</h3>${sTag(u.status)}<button class="ibtn" id="shClose" aria-label="닫기">${ICON.close}</button></div>
      <div class="sb">
        ${u.memo ? `<div class="whoBox">${esc(firstLine(u.memo))}</div>` : ''}
        ${u.tip ? `<div class="tipBox">💡 ${esc(u.tip)}</div>` : ''}
        ${u.todo ? `<div class="todoBox"><span>📌 ${esc(u.todo)}</span><button class="btn sm" id="todoDone">✓ 했어요</button></div>` : ''}
        ${phones.length ? `<div class="calls">${phones.map(p => `<a class="btn call" href="tel:${esc(p.replace(/\D/g, ''))}">📞 ${esc(p)}</a>`).join('')}</div>` : ''}
        <div class="box" id="entry"><h4>${cur ? '✓ 기록했어요. 바꾸려면 다시 누르세요' : '어떻게 되었나요? 누르면 바로 저장돼요'} <small>${esc(label)}</small></h4>
          <div class="resbtns">${RES.map(([k, l]) => `<button data-res="${k}" class="${cur && cur.res === k ? 'on' : ''}" style="${cur && cur.res === k ? 'background:' + rCol(k) : ''}">${l}</button>`).join('')}</div>
          ${showMemo ? `<div class="field"><span>있었던 일 (안 써도 돼요)</span>
            <div class="chips qps">${PHRASES.map((p, i) => `<button type="button" class="chip ${memoVal.indexOf(p.t) >= 0 ? 'on' : ''}" data-qp="${i}">${esc(p.t)}</button>`).join('')}</div>
            <textarea id="eText" data-vid="${esc(cur.id)}" rows="2" placeholder="직접 쓰기 (키보드의 🎤 마이크를 누르면 말로도 돼요)">${esc(memoVal)}</textarea></div>
            <button class="btn pri big" id="eDone">완료</button>` : ''}
          <div class="line" style="justify-content:space-between">${cur ? '<button class="btn ghost sm" id="eDel">이 기록 지우기</button>' : '<span></span>'}<button class="link" id="eOther">다른 날 기록으로 쓰기</button></div>
        </div>
        <div class="box"><h4>💡 알아둘 점 · 📌 다음에 할 일 <small>찾아갈 때 보여요</small></h4>
          <button class="btn ghost sm" id="shNote" style="align-self:flex-start">${u.tip || u.todo ? '고치기' : '적어 두기'}</button></div>
        <details class="box"><summary><b>구분 바꾸기</b> <span class="muted small">지금: ${esc(STATUS_LABEL[u.status] || u.status)}</span></summary>
          <div class="stbtns" style="margin-top:.6rem">${STATUS.map(s => `<button data-st="${s}" class="${u.status === s ? 'on' : ''}" style="${u.status === s ? 'background:' + sCol(s) : ''}">${STATUS_LABEL[s]}</button>`).join('')}</div>
          <label class="toggle" style="margin-top:.6rem"><input type="checkbox" id="shSim" ${u.simbang === '1' ? 'checked' : ''}> 🙏 심방대상으로 표시</label>
        </details>
        <div class="box"><h4>기본 메모 <small>이름·연락처·가족</small></h4>
          <div class="memoTxt">${u.memo ? esc(u.memo) : '<span class="muted">없음</span>'}</div>
          <button class="btn ghost sm" id="shMemo" style="align-self:flex-start">메모 고치기</button></div>
        <div class="box"><h4>지난 기록 <small>${vs.length}번 · 최근 것이 위</small></h4>
          <div class="hist">${vs.slice(0, sheetAll ? vs.length : 5).map(v => { const rr = roundOf(v); return `<button class="it" data-v="${esc(v.id)}">
            <span class="m"><b>${rr && rr.date ? esc(dLong(rr.date)) : v.no + '차'}</b> ${esc(giftOf(rr))} ${rTag(v.res)}<span style="margin-left:auto" class="small">${v.by ? esc(v.by) : '엑셀'}</span></span>
            <span class="t">${esc(v.text)}</span></button>`; }).join('') || '<p class="muted">아직 기록이 없어요.</p>'}</div>${!sheetAll && vs.length > 5 ? `<button class="btn ghost" id="shMore">지난 기록 ${vs.length - 5}개 더 보기</button>` : ''}</div>
        ${u.marks ? `<p class="small muted">옛 엑셀 선물 표시: ${esc(u.marks)}</p>` : ''}
        ${u.by ? `<p class="small muted">마지막으로 고친 사람: ${esc(u.by)}</p>` : ''}
      </div></div></div>`;
    const old = $('#sheet'); const keep = old ? old.querySelector('.sb').scrollTop : 0; if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', html);
    document.body.style.overflow = 'hidden';
    const sh = $('#sheet'); sh.querySelector('.sb').scrollTop = keep;
    sh.onclick = e => { if (e.target === sh) closeSheet(); };
    $('#shClose').onclick = () => { closeSheet(); afterPut(u.id); };
    const more = $('#shMore'); if (more) more.onclick = () => { sheetAll = true; drawSheet(); };
    sh.querySelectorAll('[data-res]').forEach(b => b.onclick = () => quickSave(u, b.dataset.res));
    sh.querySelectorAll('[data-qp]').forEach(b => b.onclick = () => togglePhrase(u, b));
    const dn = $('#eDone'); if (dn) dn.onclick = () => finishHouse(u);
    const dl = $('#eDel');
    if (dl) dl.onclick = async () => {
      const c0 = sheetCur(u);
      if (c0 && await modal('<h3>이 기록을 지울까요?</h3><p class="msg">설정의 ‘고친 기록’에서 되살릴 수 있어요.</p>', [{ label: '취소', val: false }, { label: '지우기', val: true, cls: 'warn' }])) {
        const t = $('#eText'); if (t) t.remove();
        S.del('visits', c0.id); drawSheet(); afterPut(); toast('지웠어요');
      }
    };
    $('#eOther').onclick = () => chooseRound(u);
    const td = $('#todoDone'); if (td) td.onclick = () => { S.put('units', { id: u.id, todo: '' }); drawSheet(); afterPut(); toast('할 일을 지웠어요'); };
    $('#shNote').onclick = async () => {
      const ok = await modal(`<h3>${esc(unitName(u))}</h3>
        <label class="field"><span>💡 알아둘 점 (예: 저녁에만 계심, 개 있음)</span><textarea id="nTip" rows="2">${esc(u.tip || '')}</textarea></label>
        <label class="field"><span>📌 다음에 할 일 (예: 12월에 예배 권하기)</span><textarea id="nTodo" rows="2">${esc(u.todo || '')}</textarea></label>`, [{ label: '취소', val: false }, { label: '저장', val: true, cls: 'pri' }]);
      if (!ok) return;
      S.put('units', { id: u.id, tip: $('#nTip').value.trim(), todo: $('#nTodo').value.trim() }); drawSheet(); afterPut(); toast('저장했어요');
    };
    sh.querySelectorAll('[data-st]').forEach(b => b.onclick = () => {
      if (b.dataset.st === u.status) return;
      S.put('units', { id: u.id, status: b.dataset.st }); drawSheet(); afterPut(); toast(`구분을 ‘${STATUS_LABEL[b.dataset.st]}’(으)로 바꿨어요`);
    });
    $('#shSim').onchange = e => { S.put('units', { id: u.id, simbang: e.target.checked ? '1' : '' }); afterPut(); toast(e.target.checked ? '심방대상으로 표시했어요' : '심방대상에서 뺐어요'); };
    $('#shMemo').onclick = async () => {
      const ok = await modal(`<h3>${esc(unitName(u))} 기본 메모</h3><textarea id="mTxt" rows="6" placeholder="이름, 연락처, 가족, 특이사항">${esc(u.memo)}</textarea>`, [{ label: '취소', val: false }, { label: '저장', val: true, cls: 'pri' }]);
      if (!ok) return;
      S.put('units', { id: u.id, memo: $('#mTxt').value.trim() }); drawSheet(); afterPut(); toast('메모를 저장했어요');
    };
    sh.querySelectorAll('.hist .it').forEach(b => b.onclick = () => editVisit(D.visits.get(b.dataset.v)));
  }
  // 결과 단추: 누르면 바로 저장. 만남은 있었던 일을 쓸 수 있게 창을 두고, 나머지는 닫고 다음 집으로
  async function quickSave(u, res) {
    commitMemo();
    const r = sheetRound || await ensureRound(u.dong);
    if (!r || !$('#sheet')) return;
    const id = u.id + '-r' + r.no, before = D.visits.get(id), prev = before && alive(before) ? Object.assign({}, before) : null;
    const keepText = prev && prev.text !== (RES_FULL[prev.res] || prev.res) ? prev.text : '';
    S.put('visits', { id, unit: u.id, dong: u.dong, no: r.no, res, text: keepText || RES_FULL[res] || res, deleted: '' });
    if (r.date === today() && !String(r.people || '').split(/,\s*/).includes(C.name)) S.put('rounds', { id: r.id, people: [r.people, C.name].filter(Boolean).join(', ') });
    const undo = () => {
      if (prev) { const p = Object.assign({}, prev); delete p.updatedAt; delete p.by; S.put('visits', p); } else S.del('visits', id);
      afterPut(u.id); toast('되돌렸어요');
    };
    if (res === '만남') { drawSheet(); afterPut(); toastUndo(`${u.ho}호 저장했어요`, undo); return; }
    if ($('#eText')) $('#eText').remove();
    finishHouse(u); toastUndo(`${u.ho}호 ${RES_LABEL[res] || res} 저장했어요`, undo);
  }
  function togglePhrase(u, b) {
    const p = PHRASES[+b.dataset.qp], t = $('#eText'), on = !b.classList.contains('on');
    b.classList.toggle('on', on);
    t.value = on ? addPart(t.value.trim(), p.t) : delPart(t.value.trim(), p.t);
    const cur = D.units.get(u.id), ch = {};
    if (p.todo) ch.todo = on ? addPart(cur.todo, p.todo) : delPart(cur.todo, p.todo);
    if (p.tip) ch.tip = on ? addPart(cur.tip, p.tip) : delPart(cur.tip, p.tip);
    if (p.sim) ch.simbang = on ? '1' : cur.simbang;
    if (Object.keys(ch).length) { S.put('units', Object.assign({ id: u.id }, ch)); if (on) toast(p.todo ? '📌 할 일에 넣었어요' : p.tip ? '💡 알아둘 점에 넣었어요' : '🙏 심방대상으로 표시했어요'); }
  }
  // 한 집을 마치고 목록으로: 그 집 칸을 바꾸고 다음 갈 집을 표시
  function finishHouse(u) { closeSheet(); afterPut(u.id); markNext(u.id); }
  function markNext(uid) {
    if (view.name !== 'dong') return;
    const cards = [...document.querySelectorAll('.unit')], i = cards.findIndex(c => c.dataset.u === uid);
    const free = c => !c.classList.contains('done');
    const nx = cards.slice(i + 1).find(free) || cards.find(free);
    document.querySelectorAll('.unit.next').forEach(c => c.classList.remove('next'));
    if (nx) { nx.classList.add('next'); try { nx.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} }
  }
  // 집 하나를 저장한 뒤: 동 화면이면 그 집 칸만 바꿈(전체를 다시 그리지 않아 빠르고 자리도 그대로)
  function afterPut(uid) {
    if (sheetOpen()) { pendingRender = true; return; }
    if (view.name !== 'dong') { if (view.name !== 'report') redrawKeepScroll(); return; }
    const f = DONG_FILTER[view.dong] || '갈집';
    const el = uid && f !== '남은집' ? document.querySelector(`.unit[data-u="${uid}"]`) : null;
    const u = uid && D.units.get(uid), ctx = workCtx(view.dong);
    if (!el || !u || (f === '갈집' && !isGo(u)) || (STATUS.includes(f) && u.status !== f)) { redrawKeepScroll(); return; }
    el.outerHTML = unitCard(u, ctx);
    const nu = document.querySelector(`.unit[data-u="${uid}"]`); if (nu) nu.onclick = () => openUnit(uid);
    const bar = $('.active');
    if (bar) { bar.outerHTML = todayBar(view.dong, ctx); const e = $('#endR'); if (e) e.onclick = () => { delete C.active[view.dong]; S.saveCfg(); render(); }; const er = $('#editR'); if (er) er.onclick = () => editRound(ctx.ar); }
    const counts = dongCounts(view.dong, ctx);
    document.querySelectorAll('.chip[data-f]').forEach(c => {
      const sm = c.querySelector('small'); if (!sm) return;
      if (c.dataset.f === '갈집') sm.textContent = counts.go; else if (c.dataset.f === '남은집') sm.textContent = counts.left;
    });
  }

  async function chooseRound(u) {
    const rs = (ix().roundsByDong.get(u.dong) || []).slice(-6).reverse();
    const v = await modal(`<h3>어느 날 기록인가요?</h3>
      <div class="list">${rs.map(r => `<button class="row" data-pick="${esc(r.id)}"><span class="h"><b>${esc(roundLabel(r))}</b></span>${r.people ? `<span class="small muted">함께: ${esc(r.people)}</span>` : ''}</button>`).join('')}</div>`,
      [{ label: '취소', val: false }, { label: '날짜 직접 넣기', val: 'new', cls: 'pri' }],
      root => root.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => closeModal('pick:' + b.dataset.pick)));
    if (v === 'new') { const r = await makeRoundByHand(u.dong); if (r) { sheetRound = r; drawSheet(); } return; }
    if (typeof v === 'string' && v.startsWith('pick:')) { sheetRound = D.rounds.get(v.slice(5)); drawSheet(); }
  }
  async function editVisit(v) {
    if (!v) return;
    const r = roundOf(v);
    let res = v.res;
    const ok = await modal(`<h3>기록 고치기</h3><p class="small muted">${esc(roundLabel(r))} · ${v.by ? esc(v.by) + ' 씀' : '엑셀에서 옮김'}</p>
      <div class="resbtns">${[...RES, ['이사', '이사']].map(([k, l]) => `<button data-res="${k}" class="${res === k ? 'on' : ''}" style="${res === k ? 'background:' + rCol(k) : ''}">${l}</button>`).join('')}</div>
      <textarea id="vTxt" rows="5">${esc(v.text)}</textarea>`,
      [{ label: '지우기', val: 'del', cls: 'warn' }, { label: '취소', val: false }, { label: '저장', val: true, cls: 'pri' }],
      root => root.querySelectorAll('[data-res]').forEach(b => b.onclick = () => {
        res = b.dataset.res; root.querySelectorAll('[data-res]').forEach(x => { x.classList.toggle('on', x === b); x.style.background = x === b ? rCol(x.dataset.res) : ''; });
      }));
    if (ok === 'del') { S.del('visits', v.id); toast('지웠어요. 고친 기록에서 되살릴 수 있어요'); }
    else if (ok) { S.put('visits', { id: v.id, res, text: $('#vTxt').value.trim() }); toast('고쳤어요'); }
    else return;
    drawSheet(); afterPut();
  }

  /* ---------- 챙길 집 ---------- */
  // 기록에서 저절로 뽑는 목록: 할 일 있는 집, 오겠다고 한 집, 계속 부재인 집, 계속 거부하는 집
  const CARE = { mine: true, limit: { todo: 30, promise: 30, absent: 30, refuse: 30 } };
  const PROMISE_RE = /(예배|교회|주일).{0,14}(오겠|온다|오신다|오신대|나오겠|나온다|나오신|가겠|가보겠|오기로)|오겠다고|오기로\s?(함|하심)/;
  function runOf(vs, res) { let n = 0; for (const v of vs) { if (v.res === res) n++; else break; } return n; }
  function careLists() {
    const X = ix(), out = { todo: [], promise: [], absent: [], refuse: [] };
    const year = new Date(Date.now() - 365 * 864e5), yStr = ymd(year);
    const mine = X.dongs.filter(isMine);
    const useMine = CARE.mine && mine.length && !LIST.complex && !LIST.dong;
    X.dongs.forEach(d => {
      if (useMine && !isMine(d)) return;
      if (LIST.complex && String(d.complex) !== LIST.complex) return;
      if (LIST.dong && d.id !== LIST.dong) return;
      (X.unitsByDong.get(d.id) || []).forEach(u => {
        const vs = X.visitsByUnit.get(u.id) || [];
        if (u.todo) out.todo.push({ u, why: '📌 ' + u.todo });
        const r0 = vs[0] && roundOf(vs[0]);
        if (vs[0] && PROMISE_RE.test(vs[0].text) && r0 && r0.date >= yStr && !['교회', '성당', '이사'].includes(u.status)) out.promise.push({ u, why: `🙋 ${dShort(r0.date)}: ${vs[0].text}` });
        const a = runOf(vs, '부재');
        if (a >= 3 && isGo(u)) out.absent.push({ u, n: a, why: `🌙 ${a}번 계속 부재 — 다른 시간대에 가 보세요${u.tip ? ' (' + u.tip + ')' : ''}` });
        const f = runOf(vs, '거부');
        if (f >= 2 && !['거부', '교회', '성당', '이사'].includes(u.status)) out.refuse.push({ u, n: f, why: `✋ ${f}번 계속 거부` });
      });
    });
    out.absent.sort((a, b) => b.n - a.n); out.refuse.sort((a, b) => b.n - a.n);
    return { out, useMine, hasMine: !!mine.length };
  }
  VIEWS.care = () => {
    const { out, useMine, hasMine } = careLists();
    const rowOf = (x, act) => `<div class="carerow"><button class="row" data-u="${esc(x.u.id)}" style="border-left-color:${sCol(x.u.status)}"><span class="h"><b>${esc(unitName(x.u))}</b>${sTag(x.u.status)}</span>
      ${x.u.memo ? `<span class="memo">${esc(firstLine(x.u.memo))}</span>` : ''}<span class="ln why">${esc(x.why)}</span></button>${act ? act(x) : ''}</div>`;
    const sec = (key, title, hint, act) => {
      const list = out[key], lim = CARE.limit[key];
      return `<h2 class="sec">${title} <small>${list.length}집</small></h2><p class="muted small hintp">${hint}</p>
        <div class="list">${list.slice(0, lim).map(x => rowOf(x, act)).join('') || '<p class="muted small">없어요.</p>'}</div>
        ${list.length > lim ? `<div style="text-align:center;margin-top:.5rem"><button class="btn ghost sm" data-more="${key}">${list.length - lim}집 더 보기</button></div>` : ''}`;
    };
    const html = `<div class="filters">${scopeSelect()}
      ${hasMine && !LIST.complex && !LIST.dong ? `<label class="toggle"><input type="checkbox" id="cMine" ${CARE.mine ? 'checked' : ''}> 내 담당 동만 보기</label>` : ''}</div>
      ${sec('todo', '📌 할 일이 있는 집', '집 창에서 ‘다음에 할 일’을 적거나, 자주 쓰는 말을 누르면 여기에 나와요.')}
      ${sec('promise', '🙋 오겠다고 한 집', '최근 1년 안에 예배 오겠다고 기록된 집이에요. 연락해 보세요.')}
      ${sec('absent', '🌙 계속 부재인 집', '3번 넘게 계속 안 계신 집이에요. 저녁이나 주말에 가 보세요.')}
      ${sec('refuse', '✋ 계속 거부하는 집', '2번 넘게 계속 거절한 집이에요. 구분을 ‘거부’로 바꾸면 갈 집에서 빠져요.', x => `<button class="btn sm ghost" data-refuse="${esc(x.u.id)}">구분을 ‘거부’로 바꾸기</button>`)}`;
    return {
      title: '챙길 집', html, bind() {
        bindScope(); bindRows();
        const m = $('#cMine'); if (m) m.onchange = e => { CARE.mine = e.target.checked; redrawKeepScroll(); };
        document.querySelectorAll('[data-more]').forEach(b => b.onclick = () => { CARE.limit[b.dataset.more] += 100; redrawKeepScroll(); });
        document.querySelectorAll('[data-refuse]').forEach(b => b.onclick = () => { S.put('units', { id: b.dataset.refuse, status: '거부' }); redrawKeepScroll(); toast('구분을 거부로 바꿨어요'); });
      }
    };
  };

  /* ---------- 오늘 결과 보내기 ---------- */
  // 카톡방 등에 보낼 요약. 주민 이름·호수는 넣지 않고 숫자만 넣음
  function todaySummary(dongs) {
    const X = ix(), t = today(), lines = [], sum = {};
    X.dongs.forEach(d => {
      if (dongs && !dongs.includes(d.id)) return;
      const c = {}; let n = 0, gift = '';
      (X.roundsByDong.get(d.id) || []).filter(r => r.date === t).forEach(r => {
        gift = gift || giftOf(r);
        const st = X.statsByRound.get(d.id + '-' + r.no) || {};
        Object.keys(st).forEach(k => { c[k] = (c[k] || 0) + st[k]; sum[k] = (sum[k] || 0) + st[k]; n += st[k]; });
      });
      if (n) lines.push(`${d.id}동${gift ? '(' + gift + ')' : ''} ${n}집: ${Object.keys(c).map(k => (RES_LABEL[k] || k) + ' ' + c[k]).join(', ')}`);
    });
    if (!lines.length) return '';
    const total = Object.values(sum).reduce((a, b) => a + b, 0);
    return `[전도현황] ${dLong(t)}\n${lines.join('\n')}${lines.length > 1 ? `\n합계 ${total}집: ${Object.keys(sum).map(k => (RES_LABEL[k] || k) + ' ' + sum[k]).join(', ')}` : ''}`;
  }
  async function shareToday(dongs) {
    const text = todaySummary(dongs);
    if (!text) { toast('오늘 기록이 아직 없어요'); return; }
    const v = await modal(`<h3>오늘 결과 보내기</h3><p class="msg sharebox">${esc(text)}</p><p class="small muted">주민 이름과 호수는 들어가지 않아요.</p>`,
      [{ label: '닫기', val: false }, { label: '복사', val: 'copy' }, ...(navigator.share ? [{ label: '📤 보내기', val: 'share', cls: 'pri' }] : [])]);
    if (v === 'share') { try { await navigator.share({ text }); } catch (e) {} }
    if (v === 'copy') { try { await navigator.clipboard.writeText(text); toast('복사했어요. 카톡방에 붙여 넣으세요'); } catch (e) { toast('복사하지 못했어요'); } }
  }

  /* ---------- 현황판 (마스터) ---------- */
  function needNewServer() {
    if (!S.online() || (C.serverVer || 0) >= 3) return false;
    modal('<h3>서버 코드를 바꿔 주세요</h3><p class="msg">이 기능은 새 서버 코드가 있어야 저장돼요.\n설정 → 관리자 → <b>연결 방법 보기 → 서버 코드 복사</b>로 붙여 넣고, <b>setup ▶ 실행</b> 뒤 <b>배포 관리 → ✏️ → 버전: 새 버전 → 배포</b>를 해 주세요.</p>', [{ label: '알겠어요', val: true, cls: 'pri' }]);
    return true;
  }
  async function setCampaign() {
    if (needNewServer()) return;
    const cur = activeCampaign() || {};
    const chips = (id, list, val) => `<div class="chips" id="${id}">${list.map(g => `<button type="button" class="chip ${g === val ? 'on' : ''}" data-v="${esc(g)}">${esc(g)}</button>`).join('')}</div>`;
    const ok = await modal(`<h3>이번 전도 정하기</h3><p class="msg">정해 두면 집사님·권사님은 선물을 고르지 않아도 돼요.\n안 정하면 각자 그날 선물을 직접 넣어요.</p>
      <div class="field"><span>행사</span>${chips('cmE', EVENT_PRESET, cur.title)}<input id="cmTitle" value="${esc(cur.title || '')}" placeholder="예: 성탄절"></div>
      <div class="field"><span>선물</span>${chips('cmG', GIFT_PRESET, cur.gift)}<input id="cmGift" value="${esc(cur.gift || '')}" placeholder="예: 달력"></div>`,
      [{ label: '취소', val: false }, { label: '저장', val: true, cls: 'pri' }],
      root => [['#cmE', '#cmTitle'], ['#cmG', '#cmGift']].forEach(([box, inp]) => root.querySelectorAll(box + ' .chip').forEach(b => b.onclick = () => {
        const on = !b.classList.contains('on'); root.querySelectorAll(box + ' .chip').forEach(x => x.classList.remove('on')); if (on) b.classList.add('on'); root.querySelector(inp).value = on ? b.dataset.v : '';
      })));
    if (!ok) return;
    const title = $('#cmTitle').value.trim(), gift = $('#cmGift').value.trim();
    if (!title && !gift) { toast('행사나 선물을 넣어 주세요'); return; }
    if (cur.id && cur.title === title) { S.put('campaigns', { id: cur.id, title, gift }); }
    else {
      if (cur.id) S.put('campaigns', { id: cur.id, active: '' });
      S.put('campaigns', { id: 'c' + Date.now(), title, gift, active: '1', start: today() });
    }
    render(); toast('이번 전도를 정했어요');
  }
  async function endCampaign() {
    const c = activeCampaign(); if (!c) return;
    if (await modal(`<h3>‘${esc([c.title, c.gift].filter(Boolean).join(' '))}’ 전도를 끝낼까요?</h3><p class="msg">기록은 그대로 남아요. 끝내면 다시 각자 그날 선물을 직접 넣어요.</p>`, [{ label: '취소', val: false }, { label: '끝내기', val: true, cls: 'pri' }])) {
      S.put('campaigns', { id: c.id, active: '' }); render(); toast('이번 전도를 끝냈어요');
    }
  }
  VIEWS.dash = () => {
    const X = ix(), c = activeCampaign(), t = today();
    const ctx = { c, ar: null, over: false };
    let tGo = 0, tDone = 0, tGave = 0;
    const days = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Math.floor((new Date(t + 'T00:00') - new Date(+m[1], +m[2] - 1, +m[3])) / 864e5) : null; };
    const rows = X.dongs.map(d => {
      const n = dongCounts(d.id, ctx), rs = (X.roundsByDong.get(d.id) || []).filter(r => r.date && r.date.length === 10), last = rs[rs.length - 1];
      tGo += n.go; tDone += n.done; tGave += n.gave;
      const ago = last ? days(last.date) : null, pct = n.go ? Math.round(n.done / n.go * 100) : 0;
      return `<tr data-dong="${esc(d.id)}"><td><b>${esc(d.id)}</b></td><td class="muted mgrc">${esc(d.managers || '-')}</td><td class="num">${n.go}</td>
        ${c ? `<td class="progc"><span class="prog"><i style="width:${pct}%"></i></span><span class="small">${n.done}집 (${pct}%)</span></td><td class="num">${n.gave}</td>` : ''}
        <td class="lastc ${ago != null && ago > 60 ? 'late' : ''}">${last ? esc(dShort(last.date)) + (ago != null ? `<br><span class="small">${ago === 0 ? '오늘' : ago + '일 전'}</span>` : '') : '-'}</td></tr>`;
    }).join('');
    const since = Date.now() - 30 * 864e5, who = {};
    D.visits.forEach(v => { if (alive(v) && v.by && +v.updatedAt > since) who[v.by] = (who[v.by] || 0) + 1; });
    const people = Object.keys(who).sort((a, b) => who[b] - who[a]);
    const camp = c ? `<div class="campnow"><b>📣 ${esc([c.title, c.gift].filter(Boolean).join(' '))}</b> <span class="muted small">${esc(dShort(c.start))} 시작</span></div>
        <div class="big3"><div><b>${tGo}</b><span>필요한 선물<br><small>(갈 집 수)</small></span></div><div><b>${tGave}</b><span>전달함</span></div><div><b>${Math.max(0, tGo - tGave)}</b><span>더 필요</span></div></div>
        <span class="prog big"><i style="width:${tGo ? Math.round(tDone / tGo * 100) : 0}%"></i></span><p class="small muted">갈 집 ${tGo}곳 중 ${tDone}곳 다녀옴</p>
        <div class="line"><button class="btn sm" id="dcSet">바꾸기</button><button class="btn sm ghost" id="dcEnd">전도 끝내기</button></div>`
      : `<p>지금은 정해 둔 전도가 없어서 각자 그날 선물을 직접 넣어요.<br><span class="small muted">정해 두면 선물을 고르지 않아도 되고, 동별 진행률과 필요한 선물 수가 나와요.</span></p><button class="btn pri" id="dcSet">📣 이번 전도 정하기</button>`;
    const html = `${serverBar()}<div class="card set"><h2 class="sec" style="margin:0">이번 전도</h2>${camp}</div>
      <h2 class="sec">동별 현황 <small>동을 누르면 열려요</small></h2>
      <div class="tw"><table class="rep dasht"><thead><tr><th>동</th><th class="mgrc">담당</th><th>갈 집</th>${c ? '<th>진행</th><th>전달</th>' : ''}<th>마지막 전도</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="card set" style="margin-top:1rem"><h2 class="sec" style="margin:0">최근 30일 기록한 분</h2>
        ${people.length ? `<div class="scs">${people.map(n => `<span class="sc" style="--c:var(--accent)">${esc(n)} <b>${who[n]}</b></span>`).join('')}</div>` : '<p>아직 앱에서 쓴 기록이 없어요.</p>'}</div>
      <div class="card set" style="margin-top:1rem"><h2 class="sec" style="margin:0">오늘 결과·백업</h2>
        <div class="line"><button class="btn sm" id="dcShare">📤 오늘 결과 보내기</button><button class="btn sm" id="dcBak">💾 지금 백업</button><button class="btn sm ghost" id="dcDev">📱 기기 승인·관리</button></div>
        <p class="small muted">백업은 매주 월요일 새벽에 저절로 ‘전도현황 백업’ 폴더에 만들어져요(최근 8개).${C.lastBackup ? ` 마지막 백업: ${esc(timeStr(C.lastBackup))}` : ''}</p></div>`;
    return {
      title: '현황판', html, bind() {
        bindServerBar();
        $('#dcSet').onclick = setCampaign;
        const e = $('#dcEnd'); if (e) e.onclick = endCampaign;
        document.querySelectorAll('.dasht tr[data-dong]').forEach(tr => tr.onclick = () => go({ name: 'dong', dong: tr.dataset.dong }));
        $('#dcShare').onclick = () => shareToday();
        $('#dcDev').onclick = () => go({ name: 'devices' });
        $('#dcBak').onclick = async () => {
          if (needNewServer()) return;
          if (!S.online()) { toast('구글 시트와 연결되어 있지 않아요'); return; }
          toast('백업하는 중… (1분쯤 걸려요)');
          try { const j = await S.call('backup', {}, 180000); C.lastBackup = Date.now(); S.saveCfg(); redrawKeepScroll(); toast('백업했어요: ' + j.name); }
          catch (x) { toast('백업하지 못했어요: ' + x.message); }
        };
      }
    };
  };

  /* ---------- 구분별 보기 · 심방대상 · 찾기 · 최근 기록 ---------- */
  const LIST = { complex: '', dong: '', status: '대상', limit: 150 };
  function unitRow(u, extra) {
    const vs = ix().visitsByUnit.get(u.id) || [];
    return `<button class="row" data-u="${esc(u.id)}" style="border-left-color:${sCol(u.status)}">
      <span class="h"><b>${esc(unitName(u))}</b>${u.simbang === '1' ? '🙏' : ''}${sTag(u.status)}</span>
      ${u.memo ? `<span class="memo">${esc(u.memo)}</span>` : ''}
      ${extra || vs.slice(0, 2).map(v => `<span class="ln">${visitHtml(v)}</span>`).join('') || '<span class="ln muted">기록 없음</span>'}
    </button>`;
  }
  const bindRows = () => document.querySelectorAll('.row[data-u]').forEach(b => b.onclick = () => openUnit(b.dataset.u));
  function scopeUnits(complex, dong) {
    const X = ix(); let out = [];
    X.dongs.forEach(d => { if (complex && String(d.complex) !== complex) return; if (dong && d.id !== dong) return; out = out.concat(X.unitsByDong.get(d.id) || []); });
    return out;
  }
  function scopeSelect() {
    const X = ix(), cs = [...new Set(X.dongs.map(d => String(d.complex)))].sort();
    return `<div class="two"><select id="lC"><option value="">모든 단지</option>${cs.map(c => `<option value="${c}" ${LIST.complex === c ? 'selected' : ''}>${c}단지</option>`).join('')}</select>
      <select id="lD"><option value="">모든 동</option>${X.dongs.filter(d => !LIST.complex || String(d.complex) === LIST.complex).map(d => `<option value="${esc(d.id)}" ${LIST.dong === d.id ? 'selected' : ''}>${esc(d.id)}동</option>`).join('')}</select></div>`;
  }
  function bindScope() {
    $('#lC').onchange = e => { LIST.complex = e.target.value; LIST.dong = ''; LIST.limit = 150; render(); };
    $('#lD').onchange = e => { LIST.dong = e.target.value; LIST.limit = 150; render(); };
  }
  VIEWS.list = () => {
    const us = scopeUnits(LIST.complex, LIST.dong);
    const c = {}; us.forEach(u => c[u.status] = (c[u.status] || 0) + 1);
    const list = us.filter(u => u.status === LIST.status);
    const html = `<div class="filters">${scopeSelect()}
      <div class="chips">${STATUS.filter(s => c[s] || s === LIST.status).map(s => `<button class="chip ${s === LIST.status ? 'on' : ''}" data-s="${s}"><i class="dot" style="background:${sCol(s)}"></i>${STATUS_LABEL[s]} <small>${c[s] || 0}</small></button>`).join('')}</div></div>
      <h2 class="sec">${STATUS_LABEL[LIST.status]} <small>${list.length}세대</small><button class="btn sm ghost" id="lX" style="margin-left:auto">📥 이 목록 엑셀</button></h2>
      <div class="list">${list.slice(0, LIST.limit).map(u => unitRow(u)).join('') || '<div class="empty">해당하는 집이 없어요.</div>'}</div>
      ${list.length > LIST.limit ? '<div style="text-align:center;margin-top:1rem"><button class="btn" id="lMore">더 보기</button></div>' : ''}`;
    return {
      title: '구분별 보기', html, bind() {
        bindScope(); bindRows();
        document.querySelectorAll('.chip[data-s]').forEach(b => b.onclick = () => { LIST.status = b.dataset.s; LIST.limit = 150; render(); });
        const m = $('#lMore'); if (m) m.onclick = () => { LIST.limit += 300; const y = window.scrollY; render(); window.scrollTo(0, y); };
        $('#lX').onclick = () => exportList(list, STATUS_LABEL[LIST.status]);
      }
    };
  };
  VIEWS.simbang = () => {
    const X = ix();
    const wantSp = C.simSpecial !== false;
    let html = `<div class="filters">${scopeSelect()}<label class="toggle"><input type="checkbox" id="spT" ${wantSp ? 'checked' : ''}> 구분이 ‘특별대상’인 집도 함께 보기</label></div>`;
    let n = 0;
    X.dongs.forEach(d => {
      if (LIST.complex && String(d.complex) !== LIST.complex) return; if (LIST.dong && d.id !== LIST.dong) return;
      const us = (X.unitsByDong.get(d.id) || []).filter(u => u.simbang === '1' || (wantSp && u.status === '특별'));
      if (!us.length) return; n += us.length;
      html += `<h2 class="sec">${esc(d.id)}동 <small>담당 ${esc(d.managers || '-')} · ${us.length}세대</small></h2><div class="list">${us.map(u => unitRow(u)).join('')}</div>`;
    });
    if (!n) html += '<div class="empty">심방대상이 없어요.<br>집을 누르고 ‘🙏 심방대상으로 표시’를 켜세요.</div>';
    return { title: '심방대상', html, bind() { bindScope(); bindRows(); $('#spT').onchange = e => { C.simSpecial = e.target.checked; S.saveCfg(); render(); }; } };
  };
  VIEWS.search = () => {
    const q = view.q, X = ix();
    const ql = q.toLowerCase().replace(/\s+/g, ' ').trim();
    const qd = ql.replace(/[^\d]/g, '');
    const mm = ql.match(/^(\d{3})\s*동?\s*[- ]?\s*(\d{3,4})\s*호?$/);
    const hit = (s) => { const i = String(s || '').toLowerCase().indexOf(ql); return i; };
    const snip = (s, i) => { const a = Math.max(0, i - 25), t = String(s); return (a ? '…' : '') + esc(t.slice(a, i)) + '<mark>' + esc(t.slice(i, i + ql.length)) + '</mark>' + esc(t.slice(i + ql.length, i + ql.length + 60)) + '…'; };
    const out = [];
    X.dongs.forEach(d => (X.unitsByDong.get(d.id) || []).forEach(u => {
      if (mm) { if (d.id === mm[1] && u.ho === mm[2]) out.push([u, '']); return; }
      if (qd && qd === ql.replace(/\s/g, '') && (u.ho === qd || (d.id + u.ho) === qd)) { out.push([u, '']); return; }
      let i = hit(u.memo); if (i >= 0) { out.push([u, `<span class="ln">📝 ${snip(u.memo, i)}</span>`]); return; }
      const vs = X.visitsByUnit.get(u.id) || [];
      for (const v of vs) { i = hit(v.text); if (i >= 0) { out.push([u, `<span class="ln"><em>${esc(dShort((roundOf(v) || {}).date) || v.no + '차')}</em> ${snip(v.text, i)}</span>`]); return; } }
    }));
    const html = `<form class="searchbox" id="sf"><input id="sq" type="search" value="${esc(q)}" enterkeyhint="search"></form>
      <h2 class="sec">‘${esc(q)}’ 찾은 결과 <small>${out.length}세대</small></h2>
      <div class="list">${out.slice(0, 200).map(([u, ex]) => unitRow(u, ex)).join('') || '<div class="empty">찾지 못했어요.<br>호수는 숫자만(예: 1807), 동과 함께는 “101 1807”처럼 넣어 보세요.</div>'}</div>`;
    return { title: '찾기', html, bind() { bindRows(); $('#sf').onsubmit = e => { e.preventDefault(); const nq = $('#sq').value.trim(); if (nq) { view.q = nq; history.replaceState({ v: view }, ''); render(); } }; } };
  };
  VIEWS.recent = () => {
    const vs = [...D.visits.values()].filter(v => alive(v) && v.by).sort((a, b) => (+b.updatedAt || 0) - (+a.updatedAt || 0)).slice(0, 100);
    const html = `<p class="muted small" style="margin:.3rem .2rem .7rem">앱에서 쓴 기록이 최근 것부터 나와요.</p><div class="list">${vs.map(v => {
      const u = D.units.get(v.unit) || { dong: v.dong, ho: v.unit, status: '기타' };
      return `<button class="row" data-u="${esc(v.unit)}" style="border-left-color:${sCol(u.status)}"><span class="h"><b>${esc(unitName(u))}</b>${rTag(v.res)}<span class="small muted" style="margin-left:auto">${esc(v.by)} · ${esc(timeStr(v.updatedAt))}</span></span><span class="ln">${visitHtml(v)}</span></button>`;
    }).join('') || '<div class="empty">아직 앱에서 쓴 기록이 없어요.</div>'}</div>`;
    return { title: '최근 기록', html, bind: bindRows };
  };

  /* ---------- 엑셀 받기 ---------- */
  const EXF = { visitLine, statusLabel: s => STATUS_LABEL[s] || s, resLabel: r => RES_LABEL[r] || r };
  async function exportAll(dongs) {
    if (!ix().dongs.length) { toast('아직 자료가 없어요'); return; }
    try {
      toast('엑셀을 만드는 중…');
      await needXlsx();
      const one = Array.isArray(dongs) ? dongs : null;
      Export.download(ix(), EXF, { dongs: one, today: today(), filename: `전도현황${one ? '_' + one.join('_') + '동' : ''}_${today()}.xlsx` });
      toast('엑셀 파일을 받았어요');
    } catch (e) { toast('엑셀을 만들지 못했어요'); console.error(e); }
  }
  async function exportList(list, label) {
    try { await needXlsx(); } catch (e) { toast(e.message); return; }
    const rows = [['동', '호수', '구분', '심방대상', '기본 메모', '최근 기록 1', '최근 기록 2']];
    list.forEach(u => { const vs = ix().visitsByUnit.get(u.id) || []; rows.push([u.dong, u.ho, STATUS_LABEL[u.status], u.simbang === '1' ? 'O' : '', u.memo, vs[0] ? visitLine(vs[0]) : '', vs[1] ? visitLine(vs[1]) : '']); });
    const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [6, 7, 9, 7, 40, 45, 45].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 30));
    XLSX.writeFile(wb, `전도현황_${label}_${today()}.xlsx`); toast('엑셀 파일을 받았어요');
  }

  /* ---------- 설정 ---------- */
  let adminOpen = false;
  VIEWS.settings = () => {
    const sa = isStandalone();
    const st = S.state;
    const chips = (list, cur, attr) => `<div class="chips">${list.map(([v, l]) => `<button class="chip ${cur === v ? 'on' : ''}" ${attr}="${v}">${l}</button>`).join('')}</div>`;
    let admin;
    if (isMaster()) admin = masterHtml();
    else if (!C.server) admin = adminOpen ? localAdminHtml() : `<p>엑셀 불러오기, 구글 시트 연결은 관리자만 해요.</p><button class="btn sm" id="sAdmin">관리자 메뉴 열기</button>`;
    else admin = `<p>기기 승인, 엑셀 불러오기, 담당자 고치기는 관리자(마스터)만 할 수 있어요.</p><button class="btn sm" id="sMaster">관리자(마스터)로 들어가기</button>`;
    const html = `<div class="set">
      <div class="card set"><h2 class="sec" style="margin:0">내 정보</h2>
        <div class="line"><span>이름: ${esc(C.name)}${isMaster() ? ' <span class="tag" style="background:var(--accent)">마스터</span>' : ''}</span>${C.server ? '' : '<button class="btn sm" id="sName">이름 바꾸기</button>'}</div>
        ${C.server ? `<p>이 기기: <span id="sDesc">…</span>${C.code ? ` · 확인 번호 ${esc(C.code)}` : ''}<br>이름을 바꾸려면 관리자에게 말씀해 주세요.</p>` : ''}
      </div>
      <div class="card set"><h2 class="sec" style="margin:0">화면</h2>
        <div class="line"><span>화면 색</span>${chips([['light', '☀️ 밝게'], ['dark', '🌙 어둡게'], ['auto', '기기 설정대로']], C.theme || 'light', 'data-theme-set')}</div>
        <div class="line"><span>글자 크기</span>${chips([[0, '보통'], [1, '크게'], [2, '아주 크게']], C.font || 0, 'data-font')}</div>
        <div class="line ${FS.supported() ? '' : 'hidden'}"><span>전체화면</span><button class="btn sm" id="sFS">${FS.on() ? '전체화면 끝내기' : '전체화면 켜기'}</button></div>
        <label class="toggle ${FS.supported() ? '' : 'hidden'}"><input type="checkbox" id="sAuto" ${C.autoFS ? 'checked' : ''}> 자동 전체화면 (화면을 처음 누르면 전체화면)</label>
        <div class="line ${sa ? 'hidden' : ''}"><span>홈 화면에 설치</span><button class="btn sm pri" id="sInst">홈 화면에 설치하기</button></div>
        ${sa ? '<p>지금 홈 화면 앱으로 실행 중이에요.</p>' : ''}
        <div class="line"><span>사용법</span><button class="btn sm" id="sTut">▶ 사용법 둘러보기</button></div>
      </div>
      <div class="card set"><h2 class="sec" style="margin:0">자료</h2>
        <p>${S.online() ? `구글 시트와 연결됨 · ${st.lastOk ? '마지막으로 맞춘 때 ' + timeStr(st.lastOk) : '아직 맞추지 않음'}${S.outbox.length ? ` · <b style="color:var(--warn)">못 보낸 기록 ${S.outbox.length}개</b>` : ''}${st.error ? '<br>연결 문제: ' + esc(st.error) : ''}` : '구글 시트와 연결되지 않아 이 기기에만 저장돼요.'}</p>
        <div class="line">${S.online() ? '<button class="btn sm" id="sSync">지금 맞추기</button>' : ''}<button class="btn sm" id="sRecent">🕘 최근 기록</button><button class="btn sm" id="sRep">📄 목록 뽑기·인쇄</button><button class="btn sm" id="sXls">📥 전체 엑셀 받기</button><button class="btn sm" id="sLog">🕘 고친 기록 보기</button></div>
      </div>
      <div class="card set"><h2 class="sec" style="margin:0">관리자 <small>교회 담당자만</small></h2>${admin}</div>
      <p class="small muted" style="text-align:center">전도현황 · 자료는 교회 구글 시트에만 저장되고 이 앱 주소에는 남지 않아요.</p>
    </div>`;
    return { title: '설정', html, bind: bindSettings };
  };
  const connectHtml = () => `
      <div class="field"><span>구글 시트 연결 주소 (Apps Script 웹 앱 주소)</span><input id="aSrv" value="${esc(C.server)}" placeholder="https://script.google.com/macros/s/…/exec"></div>
      <div class="line"><button class="btn sm pri" id="aSave">연결하고 마스터로 들어가기</button><button class="btn sm" id="aHow">연결 방법 보기</button></div>`;
  const toolsHtml = () => {
    const X = ix();
    return `<hr class="hr">
      <div class="field"><span>원래 엑셀 불러오기 (1단지·2단지 최신 파일을 함께 고르세요)</span>
        <input type="file" id="aFile" accept=".xlsx,.xls" multiple></div>
      <hr class="hr">
      <div class="field"><span>동별 담당자</span>${X.dongs.map(d => `<div class="line"><span style="flex:0 0 4rem">${esc(d.id)}동</span><input data-mgr="${esc(d.id)}" value="${esc(d.managers || '')}" style="flex:1"></div>`).join('') || '<p>자료를 불러오면 나와요.</p>'}
        ${X.dongs.length ? '<button class="btn sm" id="aMgr" style="align-self:flex-start">담당자 저장</button>' : ''}</div>
      <hr class="hr">
      <div class="line">${S.online() ? '<button class="btn sm" id="aReload">구글 시트에서 처음부터 다시 받기</button>' : ''}<button class="btn sm warn" id="aWipe">이 기기 자료 지우기</button></div>`;
  };
  function localAdminHtml() { return '<button class="btn pri" id="aDash">📊 현황판 · 이번 전도 정하기</button>' + connectHtml() + toolsHtml(); }
  function masterHtml() {
    const join = joinLink();
    return `<button class="btn pri" id="aDash">📊 현황판 · 이번 전도 정하기</button><button class="btn pri" id="aDev">📱 기기 승인·관리${C.waiting ? ` <span class="badge">${C.waiting}</span>` : ''}</button>
      <div class="field"><span>초대 링크 — 새 휴대폰에서 이 링크를 열고 이름을 넣어 승인 요청을 보내면, 여기 ‘기기 승인’에서 승인해 주세요.</span><input id="aJoin" readonly value="${esc(join)}">
        <div class="line"><button class="btn sm pri" id="aQR">📷 초대 QR 보기</button><button class="btn sm" id="aCopy">링크 복사</button><button class="btn sm" id="aHow">연결 방법 보기</button><button class="btn sm" id="aOff">이 기기 연결 끊기</button></div></div>
      ${toolsHtml()}`;
  }
  function bindSettings() {
    const on = (id, f) => { const el = $(id); if (el) el.onclick = f; };
    if ($('#sDesc')) S.deviceDesc().then(d => { const el = $('#sDesc'); if (el) el.textContent = d; });
    on('#sName', async () => {
      const ok = await modal(`<h3>이름 바꾸기</h3><input id="nNm" value="${esc(C.name)}">`, [{ label: '취소', val: false }, { label: '저장', val: true, cls: 'pri' }]);
      if (ok) { const n = $('#nNm').value.trim().replace(/\s+/g, ''); if (n.length >= 2) { C.name = n; S.saveCfg(); render(); toast('이름을 바꿨어요'); } }
    });
    document.querySelectorAll('[data-font]').forEach(b => b.onclick = () => { C.font = +b.dataset.font; S.saveCfg(); render(); });
    document.querySelectorAll('[data-theme-set]').forEach(b => b.onclick = () => { C.theme = b.dataset.themeSet; S.saveCfg(); render(); });
    on('#sFS', () => FS.toggle());
    const au = $('#sAuto'); if (au) au.onchange = e => { C.autoFS = e.target.checked; S.saveCfg(); };
    on('#sInst', installSheet);
    on('#sTut', () => startTutorial());
    on('#sSync', async () => { await S.sync(); render(); toast(S.state.error ? '연결하지 못했어요: ' + S.state.error : '최신 기록으로 맞췄어요'); });
    on('#sRep', () => go({ name: 'report' }));
    on('#sRecent', () => go({ name: 'recent' }));
    on('#aDash', () => go({ name: 'dash' }));
    on('#sXls', () => exportAll());
    on('#sLog', () => go({ name: 'log' }));
    on('#sAdmin', () => { adminOpen = true; render(); });
    on('#sMaster', async () => { if (await masterLogin()) render(); });
    on('#aDev', () => go({ name: 'devices' }));
    on('#aCopy', () => copyText($('#aJoin').value));
    on('#aQR', showJoinQR);
    on('#aHow', howToConnect);
    on('#aOff', async () => {
      if (await modal('<h3>이 기기의 연결을 끊을까요?</h3><p class="msg">이 기기에서만 끊겨요. 구글 시트의 자료와 다른 휴대폰은 그대로예요.\n다시 연결하려면 마스터 암호가 필요해요.</p>', [{ label: '취소', val: false }, { label: '끊기', val: true, cls: 'warn' }])) {
        C.server = ''; C.status = ''; C.role = ''; S.saveCfg(); render();
      }
    });
    on('#aSave', async () => {
      const n = normServer($('#aSrv').value);
      if (n.err) { connectHelp(n.err, n.url); return; }
      if (!n.url) { toast('구글 시트 연결 주소를 넣어 주세요'); return; }
      const old = { server: C.server, status: C.status, role: C.role };
      C.server = n.url; C.status = ''; S.saveCfg();
      if (!(await masterLogin())) { Object.assign(C, old); S.saveCfg(); render(); }
    });
    const f = $('#aFile'); if (f) f.onchange = e => importFiles([...e.target.files]);
    on('#aMgr', () => {
      let n = 0;
      document.querySelectorAll('[data-mgr]').forEach(i => { const d = D.dongs.get(i.dataset.mgr); const v = i.value.trim(); if (d && (d.managers || '') !== v) { S.put('dongs', { id: d.id, managers: v }); n++; } });
      toast(n ? `담당자 ${n}곳을 저장했어요` : '바뀐 것이 없어요'); render();
    });
    on('#aReload', async () => { if (S.outbox.length) toast('못 보낸 기록이 있어서 먼저 보내요'); await S.sync(); await S.fullReload(); render(); toast('다시 받았어요'); });
    on('#aWipe', async () => {
      if (!(await modal('<h3>이 기기의 자료를 지울까요?</h3><p class="msg">이 휴대폰에 저장된 자료만 지워요.' + (S.online() ? '\n구글 시트의 자료는 그대로 있어서 다시 받을 수 있어요.' : '\n<b>구글 시트와 연결되어 있지 않아 되살릴 수 없어요.</b>') + '</p>', [{ label: '취소', val: false }, { label: '지우기', val: true, cls: 'warn' }]))) return;
      S.replaceAll({}); C.since = 0; C.active = {}; S.saveCfg(); render(); toast('지웠어요');
    });
  }

  /* ---------- 기기 승인·관리 (마스터) ---------- */
  let devList = null, devErr = '';
  async function loadDevices() {
    try { const j = await S.call('devices', {}, 30000); devList = j.devices; devErr = ''; C.waiting = devList.filter(d => d.status === '대기').length; S.saveCfg(); }
    catch (e) { devErr = e.message; }
    if (view.name === 'devices') render();
  }
  function devRow(d) {
    const me = S.device && d.id === S.device.id;
    const st = { 대기: 'var(--s-대상)', 승인: 'var(--accent)', 거절: 'var(--warn)', 끊김: 'var(--s-부재)' }[d.status] || 'var(--s-기타)';
    const btns = d.status === '대기'
      ? `<button class="btn sm pri" data-ap="${esc(d.id)}">승인</button><button class="btn sm ghost" data-rj="${esc(d.id)}">거절</button>`
      : d.status === '승인'
        ? (me ? '<span class="small muted">지금 쓰는 기기</span>' : `<button class="btn sm ghost" data-rn="${esc(d.id)}">이름</button><button class="btn sm ghost" data-rl="${esc(d.id)}">${d.role === '마스터' ? '일반으로' : '마스터로'}</button><button class="btn sm ghost" data-rv="${esc(d.id)}">끊기</button>`)
        : `<button class="btn sm ghost" data-ap="${esc(d.id)}">다시 승인</button>`;
    return `<div class="devit"><div class="tx"><b>${esc(d.name)}</b> <span class="tag" style="background:${st}">${esc(d.status)}</span>${d.role === '마스터' ? ' <span class="tag" style="background:var(--s-특별)">마스터</span>' : ''}
      <br><span class="small muted">${esc(d.desc || '')}</span>
      <br><span class="small muted">확인 번호 <b>${esc(d.code || '-')}</b> · 요청 ${esc(timeStr(d.requested))}${d.lastSeen ? ' · 마지막 접속 ' + esc(timeStr(d.lastSeen)) : ''}${d.approvedBy ? ' · 승인 ' + esc(d.approvedBy) : ''}</span></div>
      <div class="line">${btns}</div></div>`;
  }
  VIEWS.devices = () => {
    if (!isMaster()) return { title: '기기 관리', html: '<div class="empty">관리자(마스터)만 볼 수 있어요.</div>' };
    if (devList === null && !devErr) loadDevices();
    const L = devList || [];
    const wait = L.filter(d => d.status === '대기'), use = L.filter(d => d.status === '승인'), old = L.filter(d => d.status !== '대기' && d.status !== '승인');
    const html = `<p class="muted small" style="margin:.3rem .2rem .7rem">새 휴대폰에서 이름을 넣고 승인 요청을 보내면 여기에 나와요. 그 휴대폰 화면의 <b>확인 번호</b>와 같은지 보고 승인하세요.</p>
      <div class="line" style="margin-bottom:.6rem"><button class="btn sm" id="dvRe">새로 보기</button></div>
      ${devErr ? `<p class="err">${esc(devErr)}</p>` : ''}${devList === null && !devErr ? '<p class="muted">불러오는 중…</p>' : ''}
      <h2 class="sec">승인을 기다리는 기기 <small>${wait.length}</small></h2><div class="card">${wait.map(devRow).join('') || '<p class="muted">없어요.</p>'}</div>
      <h2 class="sec">쓰고 있는 기기 <small>${use.length}</small></h2><div class="card">${use.map(devRow).join('') || '<p class="muted">없어요.</p>'}</div>
      ${old.length ? `<h2 class="sec">거절·끊긴 기기 <small>${old.length}</small></h2><div class="card">${old.map(devRow).join('')}</div>` : ''}`;
    return {
      title: '기기 승인·관리', html, bind() {
        $('#dvRe').onclick = () => { devList = null; render(); };
        const act = async (action, extra, msg) => {
          try { const j = await S.call(action, extra, 30000); devList = j.devices; C.waiting = devList.filter(d => d.status === '대기').length; S.saveCfg(); render(); toast(msg); }
          catch (e) { toast(e.message); }
        };
        const find = id => L.find(d => d.id === id);
        document.querySelectorAll('[data-ap]').forEach(b => b.onclick = async () => {
          const d = find(b.dataset.ap);
          const same = use.filter(x => x.name === d.name && x.id !== d.id && x.role !== '마스터');
          const ok = await modal(`<h3>이 기기를 승인할까요?</h3>
            <p class="msg">${esc(d.desc || '')}\n확인 번호 <b>${esc(d.code || '-')}</b> — 그 휴대폰 화면의 번호와 같은지 확인하세요.</p>
            <label class="field"><span>이름 (바꿀 수 있어요)</span><input id="apNm" value="${esc(d.name)}"></label>
            ${same.length ? `<label class="toggle"><input type="checkbox" id="apRep" checked> 같은 이름의 예전 기기 ${same.length}대는 끊기 (휴대폰을 바꾼 경우)</label>` : ''}`,
            [{ label: '취소', val: false }, { label: '승인', val: true, cls: 'pri' }]);
          if (!ok) return;
          act('approve', { target: d.id, name: $('#apNm').value.trim(), replace: !!($('#apRep') && $('#apRep').checked) }, `${d.name} 님 기기를 승인했어요`);
        });
        document.querySelectorAll('[data-rj]').forEach(b => b.onclick = () => act('reject', { target: b.dataset.rj }, '거절했어요'));
        document.querySelectorAll('[data-rv]').forEach(b => b.onclick = async () => {
          const d = find(b.dataset.rv);
          if (await modal(`<h3>${esc(d.name)} 님 기기를 끊을까요?</h3><p class="msg">${esc(d.desc || '')}\n이 기기에서는 더 이상 기록을 보거나 쓸 수 없어요. 다시 승인할 수 있어요.</p>`, [{ label: '취소', val: false }, { label: '끊기', val: true, cls: 'warn' }])) act('revoke', { target: d.id }, '끊었어요');
        });
        document.querySelectorAll('[data-rn]').forEach(b => b.onclick = async () => {
          const d = find(b.dataset.rn);
          if (await modal(`<h3>이름 바꾸기</h3><input id="rnNm" value="${esc(d.name)}">`, [{ label: '취소', val: false }, { label: '저장', val: true, cls: 'pri' }])) act('rename', { target: d.id, name: $('#rnNm').value.trim() }, '이름을 바꿨어요');
        });
        document.querySelectorAll('[data-rl]').forEach(b => b.onclick = async () => {
          const d = find(b.dataset.rl), to = d.role === '마스터' ? '일반' : '마스터';
          if (await modal(`<h3>${esc(d.name)} 님을 ${to === '마스터' ? '마스터로' : '일반으로'} 바꿀까요?</h3><p class="msg">${to === '마스터' ? '마스터는 기기 승인, 엑셀 불러오기, 담당자 고치기를 할 수 있어요.' : '일반은 기록 보기·쓰기만 할 수 있어요.'}</p>`, [{ label: '취소', val: false }, { label: '바꾸기', val: true, cls: 'pri' }])) act('role', { target: d.id, role: to }, '바꿨어요');
        });
      }
    };
  };
  function copyText(t) {
    const done = () => toast('복사했어요. 카카오톡 등에 붙여 넣으세요');
    try { navigator.clipboard.writeText(t).then(done, () => fallback()); } catch (e) { fallback(); }
    function fallback() { const i = $('#aJoin'); if (i) { i.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('길게 눌러 복사해 주세요'); } } }
  }
  // 붙여 넣은 주소 정리: 앞뒤 공백, 배포 ID만 넣은 경우, /dev·편집 화면 주소 등
  function normServer(raw) {
    let s = String(raw || '').trim().replace(/\s+/g, '').replace(/[?#].*$/, '');
    if (!s) return { url: '' };
    if (/^AKfy[\w-]{20,}$/.test(s)) s = 'https://script.google.com/macros/s/' + s + '/exec';
    if (/^script\.google\.com/.test(s)) s = 'https://' + s;
    if (/\/home\/projects\/|\/d\/[\w-]+\/edit/.test(s)) return { err: 'editurl', url: s };
    if (/docs\.google\.com\/spreadsheets/.test(s)) return { err: 'sheeturl', url: s };
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(s)) return { err: 'badurl', url: s };
    if (/\/dev$/.test(s)) return { err: 'devurl', url: s };
    if (/\/macros\/(a\/[^/]+\/)?s\/[\w-]+$/.test(s)) s += '/exec';
    return { url: s };
  }
  function connectHelp(code, url) {
    const T = {
      editurl: ['편집 화면 주소예요', '붙여 넣은 주소는 Apps Script <b>편집 화면</b> 주소예요.\n<b>배포 → 배포 관리</b>에서 ‘웹 앱’ 아래의 <b>URL</b>(…/exec 로 끝남)을 복사해 주세요.'],
      sheeturl: ['구글 시트 주소예요', '붙여 넣은 주소는 <b>구글 시트</b> 주소예요.\n시트의 <b>확장 프로그램 → Apps Script → 배포 → 배포 관리</b>에서 ‘웹 앱’ <b>URL</b>(…/exec 로 끝남)을 복사해 주세요.'],
      badurl: ['주소가 달라요', '주소는 <b>https://script.google.com/macros/s/…/exec</b> 모양이어야 해요.'],
      devurl: ['테스트용 주소예요', '…/dev 로 끝나는 주소는 만든 사람만 쓸 수 있어요.\n<b>배포 → 새 배포 → 웹 앱</b>으로 배포해서 나온 <b>…/exec</b> 주소를 넣어 주세요.'],
      pass: ['서버 코드가 예전 판이에요', 'Apps Script 코드가 예전 판이에요. 설정 → 관리자 → <b>연결 방법 보기 → 서버 코드 복사</b>로 새 코드를 붙여 넣고, <b>setup ▶ 실행</b> 뒤 <b>배포 관리 → ✏️ → 버전: 새 버전 → 배포</b>를 해 주세요.'],
      device: ['서버 코드가 예전 판이거나 승인 전이에요', '새 서버 코드로 바꿨는지 확인해 주세요.\n(연결 방법 보기 → 서버 코드 복사 → setup 실행 → 새 버전으로 배포)'],
      setup: ['setup 을 실행하지 않았어요', 'Apps Script 위쪽 함수 목록에서 <b>setup</b> 을 고르고 <b>▶ 실행</b>을 누른 뒤 권한을 허용해 주세요.\n그다음 <b>배포 → 배포 관리 → ✏️ → 버전: 새 버전 → 배포</b>를 해 주세요.'],
      notjson: ['구글이 로그인 화면을 보냈어요', '웹 앱 배포 설정이 맞지 않아요. <b>배포 → 배포 관리 → ✏️(수정)</b>에서\n• 다음 사용자 인증 정보로 실행: <b>나</b>\n• 액세스 권한이 있는 사용자: <b>모든 사용자</b> (‘Google 계정이 있는 모든 사용자’가 아님)\n로 바꾸고 <b>버전: 새 버전 → 배포</b>를 눌러 주세요.'],
      net: ['구글 시트 주소에 닿지 못했어요', '대부분 아래 둘 중 하나예요.\n① 배포 설정: <b>배포 → 배포 관리 → ✏️</b>에서 실행: <b>나</b>, 액세스: <b>모든 사용자</b> → <b>버전: 새 버전 → 배포</b>\n② 주소가 틀림: ‘웹 앱’ <b>URL</b>(…/exec)을 다시 복사\n\n아래 <b>주소 열어 보기</b>를 눌러 새 창에 “전도현황 서버가 작동 중입니다”가 나오면 주소와 배포는 맞는 거예요. 구글 로그인 화면이나 “찾을 수 없음”이 나오면 ①·②를 확인해 주세요.'],
      offline: ['인터넷이 끊겼어요', '인터넷 연결을 확인한 뒤 다시 눌러 주세요.']
    };
    const t = T[code] || ['연결하지 못했어요', '알 수 없는 문제예요: ' + esc(code || '') + '\n주소와 배포 설정을 확인해 주세요.'];
    modal(`<h3>${t[0]}</h3><p class="msg">${t[1]}</p>${url ? `<p class="small muted" style="word-break:break-all">${esc(url)}</p>` : ''}`,
      [...(url && /^https:\/\/script\.google/.test(url) ? [{ label: '주소 열어 보기', val: 'open' }] : []), { label: '알겠어요', val: true, cls: 'pri' }])
      .then(v => { if (v === 'open') window.open(url, '_blank', 'noopener'); });
  }
  function howToConnect() {
    modal(`<h3>구글 시트 연결 방법</h3>
      <ol class="steps">
        <li>교회 구글 계정으로 <b>sheets.new</b> 를 열어 새 시트를 만들고 이름을 ‘전도현황’으로 바꿉니다.</li>
        <li>메뉴 <b>확장 프로그램 → Apps Script</b> 를 누릅니다.</li>
        <li>원래 있던 글을 모두 지우고, 아래 <b>서버 코드 복사</b>로 복사한 코드를 붙여 넣은 뒤 💾 저장합니다.</li>
        <li>위쪽 함수 목록에서 <code>setup</code> 을 고르고 <b>▶ 실행</b> → 권한 검토 → 계정 선택 → <b>고급 → 이동 → 허용</b>.</li>
        <li>시트로 돌아가 <b>설정</b> 탭의 <b>B3(마스터 암호)</b>를 원하는 값으로 바꿉니다. (암호는 바꾸면 바로 적용돼요)</li>
        <li>Apps Script에서 <b>배포 → 새 배포 → 유형(⚙): 웹 앱</b>, 다음 사용자 인증 정보로 실행: <b>나</b>, 액세스 권한이 있는 사용자: <b>모든 사용자</b>(‘Google 계정이 있는 모든 사용자’ 아님) → 배포. 코드를 고친 뒤에는 <b>배포 관리 → ✏️ → 버전: 새 버전</b>으로 다시 배포해야 바뀌어요.</li>
        <li>나온 <b>웹 앱 URL</b>(…/exec 로 끝남. 브라우저로 열면 “전도현황 서버가 작동 중입니다”가 나와야 해요)을 복사해 이 화면의 ‘구글 시트 연결 주소’에 넣고 <b>연결하고 마스터로 들어가기</b> → 마스터 암호를 넣습니다. 이 기기가 마스터 기기가 돼요.</li>
        <li><b>원래 엑셀 불러오기</b>로 1단지·2단지 최신 파일을 넣습니다.</li>
        <li>집사님·권사님 휴대폰에서 <b>초대 링크</b>를 열고 이름을 넣어 승인 요청 → 내 휴대폰의 <b>기기 승인</b>에서 확인 번호를 보고 승인하면 끝!</li>
      </ol>`, [{ label: '서버 코드 복사', val: 'copy' }, { label: '닫기', val: true, cls: 'pri' }]).then(async v => {
      if (v !== 'copy') return;
      try { const t = await (await fetch('server/Code.gs?v=' + Date.now(), { cache: 'no-store' })).text(); await navigator.clipboard.writeText(t); toast('새 서버 코드를 복사했어요'); }
      catch (e) { toast('복사하지 못했어요. 다시 눌러 주세요'); }
    });
  }

  /* ---------- 원래 엑셀 불러오기 ---------- */
  async function importFiles(files) {
    if (!files.length) return;
    toast('엑셀을 읽는 중…');
    const all = { dongs: [], rounds: [], units: [], visits: [] }, warn = [], got = {};
    try {
      await needXlsx();
      for (const f of files) {
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
        const r = EvParse.parseWorkbook(XLSX, wb);
        if (!r.dongs.length) { warn.push(`${f.name}: 동 시트를 찾지 못했어요`); continue; }
        r.dongs.forEach(d => {
          if (got[d.dong]) { warn.push(`${d.dong}동이 두 파일에 있어서 ‘${f.name}’ 것을 썼어요`); ['rounds', 'units', 'visits'].forEach(t => all[t] = all[t].filter(x => x.dong !== d.dong)); all.dongs = all.dongs.filter(x => x.id !== d.dong); }
          got[d.dong] = f.name;
        });
        all.dongs.push(...r.dongs.map(d => ({ id: d.dong, complex: d.complex, managers: d.managers })));
        ['rounds', 'units', 'visits'].forEach(t => all[t].push(...r[t]));
        warn.push(...r.warn);
      }
    } catch (e) { console.error(e); modal(`<h3>엑셀을 읽지 못했어요</h3><p class="msg">${esc(e.message)}</p>`, [{ label: '확인', val: true, cls: 'pri' }]); return; }
    if (!all.dongs.length) { modal(`<h3>불러올 동이 없어요</h3><p class="msg">${esc(warn.join('\n'))}</p>`, [{ label: '확인', val: true, cls: 'pri' }]); return; }
    const byC = {}; all.dongs.forEach(d => { byC[d.complex] = byC[d.complex] || { d: 0, u: 0 }; byC[d.complex].d++; });
    all.units.forEach(u => byC[u.dong[0]] && byC[u.dong[0]].u++);
    const have = D.units.size;
    const ok = await modal(`<h3>엑셀 불러오기</h3>
      <p class="msg">${Object.keys(byC).sort().map(k => `${k}단지: ${byC[k].d}개 동, ${byC[k].u}세대`).join('\n')}\n회차 ${all.rounds.length}개, 방문 기록 ${all.visits.length}건</p>
      ${warn.length ? `<p class="small muted" style="white-space:pre-line">${esc(warn.join('\n'))}</p>` : ''}
      ${have ? `<p class="msg" style="color:var(--warn)"><b>지금 있는 자료(${have}세대)를 모두 지우고 이 엑셀로 바꿔요.</b>${S.online() ? '\n모든 분의 휴대폰에도 바뀐 자료가 보여요.' : ''}</p>` : ''}`,
      [{ label: '취소', val: false }, { label: have ? '모두 바꾸기' : '불러오기', val: true, cls: have ? 'warn' : 'pri' }]);
    if (!ok) return;
    try {
      if (S.online()) { toast('구글 시트로 보내는 중… (1~2분)'); await S.serverImport(all); }
      else S.replaceAll(all);
      C.active = {}; S.saveCfg();
      adminOpen = true; go({ name: 'home' });
      toast(`불러왔어요: ${all.units.length}세대, 기록 ${all.visits.length}건`);
    } catch (e) { console.error(e); modal(`<h3>보내지 못했어요</h3><p class="msg">${esc(e.message)}\n인터넷 연결과 관리자 암호를 확인해 주세요.</p>`, [{ label: '확인', val: true, cls: 'pri' }]); }
  }

  /* ---------- 고친 기록 (되돌리기) ---------- */
  let logRows = null, logErr = '';
  function logDesc(x) {
    let a = {}, b = {}; try { a = JSON.parse(x.after || '{}'); } catch (e) {} try { b = JSON.parse(x.before || '{}'); } catch (e) {}
    const T = x.t;
    if (x.id === '엑셀 불러오기') return `엑셀 불러오기 (${esc(x.after)})`;
    if (T === 'visits') { const u = D.units.get(a.unit || b.unit); return `${u ? esc(unitName(u)) : esc(a.unit)} 기록 ${a.deleted === '1' ? '<b style="color:var(--warn)">지움</b>' : b.id ? '고침' : '씀'}: ${esc(RES_LABEL[a.res] || a.res || '')} ${esc((a.text || '').slice(0, 40))}`; }
    if (T === 'units') { const u = D.units.get(x.id); const what = b.status !== a.status ? `구분 ${esc(STATUS_LABEL[b.status] || b.status)} → ${esc(STATUS_LABEL[a.status] || a.status)}` : b.memo !== a.memo ? '기본 메모 고침' : b.simbang !== a.simbang ? (a.simbang === '1' ? '심방대상 표시' : '심방대상 뺌') : '고침'; return `${u ? esc(unitName(u)) : esc(x.id)} ${what}`; }
    if (T === 'rounds') return `${esc(a.dong || b.dong)}동 전도 ${a.deleted === '1' ? '지움' : b.id ? '고침' : '만듦'} ${esc(a.gift || '')}`;
    if (T === 'campaigns') return `이번 전도 ${a.active === '1' ? '정함' : '끝냄'}: ${esc([a.title, a.gift].filter(Boolean).join(' '))}`;
    if (T === 'dongs') return `${esc(x.id)}동 담당자: ${esc(a.managers || '')}`;
    return esc(T + ' ' + x.id);
  }
  VIEWS.log = () => {
    if (logRows === null) {
      logRows = [];
      if (S.online()) S.call('log', { limit: 300 }).then(j => { logRows = j.rows; logErr = ''; render(); }).catch(e => { logErr = e.message; logRows = S.localLog.slice().reverse(); render(); });
      else logRows = S.localLog.slice().reverse();
    }
    const html = `<p class="muted small" style="margin:.3rem .2rem .7rem">${S.online() ? '모든 분이 고친 것이 최근 것부터 나와요.' : '이 기기에서 고친 것이 나와요.'} ‘되돌리기’를 누르면 고치기 전으로 돌아가요.${logErr ? '<br>서버 기록을 받지 못해 이 기기 기록을 보여 드려요.' : ''}</p>
      <div class="card">${logRows.length ? logRows.map((x, i) => `<div class="logit"><span class="tx"><b>${esc(x.by || '?')}</b> <span class="muted small">${esc(timeStr(x.time))}</span><br>${logDesc(x)}</span>
        ${x.id !== '엑셀 불러오기' && TABLE_OK(x.t) ? `<button class="btn sm ghost" data-undo="${i}">되돌리기</button>` : ''}</div>`).join('') : '<p class="muted">아직 고친 기록이 없어요. (불러오는 중이면 잠시 기다려 주세요)</p>'}</div>`;
    return {
      title: '고친 기록', html, bind() {
        document.querySelectorAll('[data-undo]').forEach(b => b.onclick = async () => {
          const x = logRows[+b.dataset.undo];
          if (!(await modal(`<h3>되돌릴까요?</h3><p class="msg">${logDesc(x)}\n→ 고치기 전으로 돌려요.</p>`, [{ label: '취소', val: false }, { label: '되돌리기', val: true, cls: 'pri' }]))) return;
          let before = null; try { before = x.before ? JSON.parse(x.before) : null; } catch (e) {}
          if (before) { delete before.updatedAt; delete before.by; before.deleted = before.deleted || ''; S.put(x.t, before); }
          else S.del(x.t, x.id);
          logRows = null; render(); toast('되돌렸어요');
        });
      }
    };
  };
  const TABLE_OK = t => S.TABLES.includes(t);

  /* ---------- 목록 뽑기·인쇄 ---------- */
  // 원하는 동·구분·정보만 골라 한 줄씩 표로 보여 주고, 그대로 인쇄하거나 엑셀로 받음
  const REP_DEF = { dongs: [], statuses: [], simOnly: false, lastRes: [], cols: { status: 1, sim: 1, memo: 1, tip: 1, recent: 2, last: 1, count: 1 }, sort: 'ho-desc', group: true, pageBreak: false };
  const REP = Object.assign({}, REP_DEF, C.report || {}, { cols: Object.assign({}, REP_DEF.cols, (C.report || {}).cols || {}) });
  function saveRep() { C.report = REP; S.saveCfg(); }
  const SORTS = [['ho-desc', '동·호수 (높은 층부터)'], ['ho-asc', '동·호수 (낮은 층부터)'], ['status', '구분 순서 (대상·특별대상 먼저)'], ['last-old', '오래 안 간 집 먼저'], ['last-new', '최근에 다녀온 집 먼저'], ['count', '많이 다녀온 집 먼저'], ['res', '최근 결과 (만남→부재→거부)']];
  const RES_ORDER = { 만남: 0, 문앞: 1, 부재: 2, 거부: 3, 이사: 4 };
  function lastDate(vs) { for (const v of vs) { const r = roundOf(v); if (r && r.date) return r.date; } return ''; }
  function repRows() {
    const X = ix();
    let out = [];
    X.dongs.forEach(d => {
      if (REP.dongs.length && !REP.dongs.includes(d.id)) return;
      (X.unitsByDong.get(d.id) || []).forEach(u => {
        if (REP.statuses.length && !REP.statuses.includes(u.status)) return;
        if (REP.simOnly && u.simbang !== '1' && u.status !== '특별') return;
        const vs = X.visitsByUnit.get(u.id) || [];
        if (REP.lastRes.length && !(vs[0] && REP.lastRes.includes(vs[0].res))) return;
        out.push({ u, d, vs, last: lastDate(vs) });
      });
    });
    const byHo = (a, b, dir) => String(a.d.id).localeCompare(String(b.d.id)) || dir * (floorOf(a.u.ho) - floorOf(b.u.ho)) || (+a.u.ho % 100) - (+b.u.ho % 100);
    const cmp = {
      'ho-desc': (a, b) => byHo(a, b, -1), 'ho-asc': (a, b) => byHo(a, b, 1),
      status: (a, b) => STATUS.indexOf(a.u.status) - STATUS.indexOf(b.u.status) || byHo(a, b, -1),
      'last-old': (a, b) => (a.last || '0').localeCompare(b.last || '0') || byHo(a, b, -1),
      'last-new': (a, b) => (b.last || '0').localeCompare(a.last || '0') || byHo(a, b, -1),
      count: (a, b) => b.vs.length - a.vs.length || byHo(a, b, -1),
      res: (a, b) => (a.vs[0] ? RES_ORDER[a.vs[0].res] ?? 5 : 9) - (b.vs[0] ? RES_ORDER[b.vs[0].res] ?? 5 : 9) || byHo(a, b, -1)
    }[REP.sort] || ((a, b) => byHo(a, b, -1));
    // 동별로 묶을 때는 동 순서를 먼저 지킴
    out.sort(REP.group ? (a, b) => String(a.d.id).localeCompare(String(b.d.id)) || cmp(a, b) : cmp);
    return out;
  }
  function repCols() {
    const c = REP.cols, cols = [];
    if (!REP.group) cols.push(['동', x => esc(x.d.id), 'c-dong']);
    cols.push(['호수', x => `<b>${esc(x.u.ho)}</b>`, 'c-ho']);
    if (c.status) cols.push(['구분', x => sTag(x.u.status), 'c-st']);
    if (c.sim) cols.push(['심방', x => x.u.simbang === '1' ? '🙏' : '', 'c-sim']);
    if (c.memo) cols.push(['기본 메모', x => esc(x.u.memo).replace(/\n/g, '<br>'), 'c-memo']);
    if (c.tip) cols.push(['알아둘 점·할 일', x => [x.u.tip ? '💡 ' + esc(x.u.tip) : '', x.u.todo ? '📌 ' + esc(x.u.todo) : ''].filter(Boolean).join('<br>'), 'c-tip']);
    if (c.last) cols.push(['마지막 방문', x => esc(dShort(x.last)), 'c-last']);
    if (c.count) cols.push(['횟수', x => x.vs.length || '', 'c-cnt']);
    if (c.recent) cols.push([c.recent >= 99 ? '전체 기록' : `최근 기록 ${c.recent}개`, x => x.vs.slice(0, c.recent).map(v => `<div class="rl">${visitHtml(v)}</div>`).join(''), 'c-rec']);
    return cols;
  }
  function summaryChips(units) {
    const c = {}; units.forEach(u => c[u.status] = (c[u.status] || 0) + 1);
    return STATUS.filter(s => c[s]).map(s => `<span class="sc" style="--c:${sCol(s)}">${STATUS_LABEL[s]} <b>${c[s]}</b></span>`).join('');
  }
  const REP_PREVIEW = 200;
  let repFull = false;
  window.addEventListener('afterprint', () => { if (repFull) { repFull = false; if (view.name === 'report') redrawKeepScroll(); } });
  VIEWS.report = () => {
    const X = ix(), rows = repRows(), cols = repCols();
    const chip = (on, attr, val, label) => `<button class="chip ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}</button>`;
    const colOpt = [['status', '구분'], ['sim', '심방 표시'], ['memo', '기본 메모'], ['tip', '알아둘 점·할 일'], ['last', '마지막 방문 날'], ['count', '다녀간 횟수']];
    const opts = `<details class="card noprint repopt" ${C.repOpen === false ? '' : 'open'} id="repDet"><summary><b>무엇을 뽑을지 고르기</b> <span class="muted small">(누르면 접혀요)</span></summary>
      <div class="field"><span>동 <small class="muted">(아무것도 안 고르면 모든 동)</small></span><div class="chips">${X.dongs.map(d => chip(REP.dongs.includes(d.id), 'data-rd', d.id, esc(d.id) + '동')).join('')}</div></div>
      <div class="field"><span>구분 <small class="muted">(아무것도 안 고르면 모두)</small></span><div class="chips">${STATUS.map(s => chip(REP.statuses.includes(s), 'data-rs', s, `<i class="dot" style="background:${sCol(s)}"></i>${STATUS_LABEL[s]}`)).join('')}
        <button class="chip" id="rsTarget">전도 대상만</button></div></div>
      <div class="field"><span>최근 결과 <small class="muted">(아무것도 안 고르면 모두)</small></span><div class="chips">${RES.map(([k, l]) => chip(REP.lastRes.includes(k), 'data-rr', k, l)).join('')}</div></div>
      <label class="toggle"><input type="checkbox" id="rSim" ${REP.simOnly ? 'checked' : ''}> 🙏 심방대상만</label>
      <div class="field"><span>보여 줄 정보</span><div class="chips">${colOpt.map(([k, l]) => chip(REP.cols[k], 'data-rc', k, l)).join('')}</div></div>
      <div class="field"><span>최근 기록 몇 개</span><div class="chips">${[[0, '안 보임'], [1, '1개'], [2, '2개'], [3, '3개'], [5, '5개'], [99, '전부']].map(([v, l]) => chip(REP.cols.recent === v, 'data-rn', v, l)).join('')}</div></div>
      <label class="field"><span>정렬</span><select id="rSort">${SORTS.map(([v, l]) => `<option value="${v}" ${REP.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="toggle"><input type="checkbox" id="rGroup" ${REP.group ? 'checked' : ''}> 동별로 나눠서 보기 (동마다 요약 표시)</label>
      <label class="toggle"><input type="checkbox" id="rPage" ${REP.pageBreak ? 'checked' : ''}> 인쇄할 때 동마다 새 장에</label>
      <div class="line"><button class="btn sm ghost" id="rReset">처음대로</button></div>
    </details>
    <div class="line noprint" style="margin:.7rem 0"><span class="muted"><b>${rows.length}</b>세대</span><span style="flex:1"></span><button class="btn pri" id="rPrint">🖨 인쇄</button><button class="btn" id="rXls">📥 엑셀</button></div>`;
    const thead = `<thead><tr>${cols.map(c => `<th class="${c[2]}">${c[0]}</th>`).join('')}</tr></thead>`;
    const tr = x => `<tr style="--c:${sCol(x.u.status)}">${cols.map(c => `<td class="${c[2]}">${c[1](x)}</td>`).join('')}</tr>`;
    let body = '', left = repFull ? Infinity : REP_PREVIEW;
    const take = l => { const t = l.slice(0, left); left -= t.length; return t; };
    if (REP.group) {
      const byD = new Map(); rows.forEach(x => { if (!byD.has(x.d.id)) byD.set(x.d.id, []); byD.get(x.d.id).push(x); });
      let first = true;
      byD.forEach((list, id) => {
        const shown = take(list);
        if (!shown.length) return;
        const d = D.dongs.get(id) || { managers: '' };
        const rs = X.roundsByDong.get(id) || [], last = rs[rs.length - 1];
        body += `<section class="repg ${REP.pageBreak && !first ? 'pb' : ''}"><h2 class="sec">${esc(id)}동 <small>담당 ${esc(d.managers || '-')} · ${list.length}세대${last ? ' · 최근 ' + esc(roundLabel(last)) : ''}</small></h2>
          <div class="scs">${summaryChips(list.map(x => x.u))}</div>
          <div class="tw"><table class="rep">${thead}<tbody>${shown.map(tr).join('')}</tbody></table></div></section>`;
        first = false;
      });
    } else body = `<div class="scs">${summaryChips(rows.map(x => x.u))}</div><div class="tw"><table class="rep">${thead}<tbody>${take(rows).map(tr).join('')}</tbody></table></div>`;
    const filt = [REP.dongs.length ? REP.dongs.map(x => x + '동').join(', ') : '모든 동', REP.statuses.length ? REP.statuses.map(s => STATUS_LABEL[s]).join(', ') : '', REP.simOnly ? '심방대상만' : '', REP.lastRes.length ? '최근 결과: ' + REP.lastRes.map(r => RES_LABEL[r]).join(', ') : '', (SORTS.find(s => s[0] === REP.sort) || [, ''])[1]].filter(Boolean).join(' · ');
    const html = opts + `<div class="printhead"><b>전도현황 목록</b> <span>${esc(dLong(today()))} · ${esc(filt)} · ${rows.length}세대</span></div>` + (rows.length ? body : '<div class="empty">고른 조건에 맞는 집이 없어요.</div>') + (!repFull && rows.length > REP_PREVIEW ? `<p class="noprint muted small" style="text-align:center;margin-top:1rem">화면에는 앞의 ${REP_PREVIEW}세대만 보여요. 인쇄와 엑셀에는 전체 ${rows.length}세대가 나와요.</p>` : '');
    return {
      title: '목록·인쇄', html, bind() {
        const tgl = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); };
        const re = () => { saveRep(); repFull = false; redrawKeepScroll(); };
        document.querySelectorAll('[data-rd]').forEach(b => b.onclick = () => { tgl(REP.dongs, b.dataset.rd); re(); });
        document.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => { tgl(REP.statuses, b.dataset.rs); re(); });
        document.querySelectorAll('[data-rr]').forEach(b => b.onclick = () => { tgl(REP.lastRes, b.dataset.rr); re(); });
        document.querySelectorAll('[data-rc]').forEach(b => b.onclick = () => { REP.cols[b.dataset.rc] = REP.cols[b.dataset.rc] ? 0 : 1; re(); });
        document.querySelectorAll('[data-rn]').forEach(b => b.onclick = () => { REP.cols.recent = +b.dataset.rn; re(); });
        $('#rsTarget').onclick = () => { REP.statuses = ['대상', '특별', '부재', '거부', '장결', '기타']; re(); };
        $('#rSim').onchange = e => { REP.simOnly = e.target.checked; re(); };
        $('#rGroup').onchange = e => { REP.group = e.target.checked; re(); };
        $('#rPage').onchange = e => { REP.pageBreak = e.target.checked; re(); };
        $('#rSort').onchange = e => { REP.sort = e.target.value; re(); };
        $('#rReset').onclick = () => { Object.assign(REP, JSON.parse(JSON.stringify(REP_DEF))); re(); };
        $('#repDet').ontoggle = e => { C.repOpen = e.target.open; S.saveCfg(); };
        $('#rPrint').onclick = () => {
          if (rows.length > REP_PREVIEW && !repFull) { repFull = true; redrawKeepScroll(); }
          window.print();
        };
        $('#rXls').onclick = async () => {
          try { await needXlsx(); } catch (e) { toast(e.message); return; }
          const head = cols.map(c => c[0]); if (REP.group) head.unshift('동');
          const plain = (c, x) => c[2] === 'c-st' ? STATUS_LABEL[x.u.status] : c[2] === 'c-sim' ? (x.u.simbang === '1' ? 'O' : '') : c[2] === 'c-rec' ? x.vs.slice(0, REP.cols.recent).map(visitLine).join('\n') : c[2] === 'c-memo' ? x.u.memo : c[2] === 'c-tip' ? [x.u.tip, x.u.todo].filter(Boolean).join(' / ') : c[2] === 'c-ho' ? x.u.ho : c[2] === 'c-last' ? x.last : c[2] === 'c-cnt' ? x.vs.length : c[2] === 'c-dong' ? x.d.id : '';
          const aoa = [head, ...rows.map(x => (REP.group ? [x.d.id] : []).concat(cols.map(c => plain(c, x))))];
          const ws = XLSX.utils.aoa_to_sheet(aoa);
          ws['!cols'] = head.map(h => ({ wch: /메모/.test(h) ? 36 : /기록/.test(h) ? 60 : /방문/.test(h) ? 11 : 8 }));
          const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '목록');
          XLSX.writeFile(wb, `전도현황_목록_${today()}.xlsx`); toast('엑셀 파일을 받았어요');
        };
      }
    };
  };

  /* ---------- 사용법 둘러보기 ---------- */
  // 연습 자료로 처음부터 한 번 따라 해 봄. 눌러야 할 곳만 눌리고, 아무것도 저장되지 않음
  const TUT = { on: false, i: 0, saved: null, raf: 0, focusDone: -1 };
  function demoData() {
    const dongs = [{ id: '901', complex: '연습', managers: C.name || '홍길동' }, { id: '902', complex: '연습', managers: '김영희' }];
    const people = ['70대 할머니', '50대 아저씨', '30대 엄마·초등 아들', '60대 부부', '40대 아주머니', '80대 할아버지'];
    const st = ['대상', '거부', '특별', '부재', '교회', '대상', '성당', '부재'];
    const units = [], visits = [], rounds = [];
    dongs.forEach(d => {
      rounds.push({ id: d.id + '-1', dong: d.id, no: 1, date: '2026-04-05', gift: '꽃', event: '부활절', people: '홍길동, 김영희', text: '' });
      rounds.push({ id: d.id + '-2', dong: d.id, no: 2, date: '2026-09-20', gift: '갈비', event: '추석', people: '홍길동', text: '' });
      for (let f = 3; f >= 1; f--) for (let l = 1; l <= 3; l++) {
        const ho = String(f * 100 + l), id = d.id + '-' + ho, k = (f * 3 + l) % 8;
        units.push({ id, dong: d.id, ho, seq: 0, status: st[k], simbang: k === 2 ? '1' : '', memo: people[k % people.length], marks: '' });
        visits.push({ id: id + '-r1', unit: id, dong: d.id, no: 1, res: k % 3 ? '부재' : '만남', text: k % 3 ? '부재' : '고맙다고 받으심' });
        if (k % 2) visits.push({ id: id + '-r2', unit: id, dong: d.id, no: 2, res: k === 1 ? '거부' : '만남', text: k === 1 ? '필요 없다고 하심' : '예배 권함, 웃으며 받으심' });
      }
    });
    return { dongs, rounds, units, visits, campaigns: [{ id: 'cdemo', title: '연습', gift: '꽃', active: '1', start: today() }] };
  }
  const firstUnit = () => document.querySelector('.unit');
  const TSTEPS = [
    { text: '사용법을 처음부터 한 번 보여 드릴게요.<br><b>연습용 자료</b>라서 아무것도 저장되지 않아요.<br>밝게 빛나는 곳만 눌러지고, 언제든 <b>그만하기</b>를 누르면 끝나요.', next: '시작하기' },
    { sel: '.dong[data-dong="901"]', text: '동을 누르면 그 동의 집들이 나와요.<br><b>901동</b>을 눌러 보세요.', need: () => view.name === 'dong' && view.dong === '901' },
    { sel: '.active', text: '위에 <b>이번 전도</b>와 <b>남은 집 수</b>가 보여요.<br>관리자가 정해 두면 선물을 고를 필요가 없어요. 안 정해 두었으면 첫 집에서 한 번만 물어봐요.', next: '다음' },
    { sel: () => firstUnit(), text: '갈 집만 위층부터 차례로 나와요.<br>왼쪽 색 띠와 글자가 <b>구분</b>, 오른쪽이 <b>최근 기록</b>이에요.<br>다른 교회·성당·거부 집은 접어 두었어요.', next: '다음' },
    { sel: () => firstUnit(), text: '다녀온 집을 눌러요.<br>첫 번째 집을 눌러 보세요.', need: () => sheetOpen() },
    { sel: '[data-res="만남"]', text: '결과를 <b>한 번 누르면 바로 저장</b>돼요.<br><b>만나서 전달</b>을 눌러 보세요.', need: () => !!$('#eText') },
    { sel: '[data-qp="1"]', text: '있었던 일은 <b>단추로</b> 넣을 수 있어요. 안 넣어도 돼요.<br><b>예배 권함</b>을 눌러 보세요.', need: () => { const b = $('[data-qp="1"]'); return b && b.classList.contains('on'); } },
    { sel: '#eDone', text: '<b>완료</b>를 누르세요.<br>(연습이라 진짜로 저장되지는 않아요)', need: () => !sheetOpen() },
    { sel: '.unit.done', text: '다녀온 집은 <b>초록색</b>으로 바뀌고 <b>✓ 다녀옴</b>이 나와요.', next: '다음' },
    { sel: '.unit.next', text: '<b>다음 갈 집</b>에 파란 테두리가 생겨요.<br>이 집을 눌러 보세요.', need: () => sheetOpen() },
    { sel: '[data-res="부재"]', text: '안 계시면 <b>부재</b>를 눌러요.<br>누르면 저장되고 창이 바로 닫혀서, 다음 집으로 바로 갈 수 있어요.', need: () => !sheetOpen() },
    { sel: '#tBack', text: '잘못 눌렀으면 아래에 잠깐 나오는 <b>되돌리기</b>를 누르면 돼요.<br>이제 왼쪽 위 <b>‹</b> 를 눌러 첫 화면으로 가세요.', need: () => view.name === 'home' },
    { sel: '.searchbox', text: '호수(예: 1807)나 이름·전화번호·내용으로 <b>찾을</b> 수 있어요.', next: '다음' },
    { sel: '#qCare', text: '<b>챙길 집</b>에는 할 일이 있는 집, 오겠다고 한 집, 계속 부재인 집이 저절로 모여요.', next: '다음' },
    { sel: '#tFont', text: '글자가 작으면 이 단추로 <b>글자를 크게</b> 할 수 있어요.', next: '다음' },
    { text: '다 봤어요! 👏<br>이제 진짜 기록을 써 보세요.<br>사용법은 첫 화면의 <b>▶ 사용법 보기</b>에서 다시 볼 수 있어요.', next: '마치기' }
  ];
  function startTutorial() {
    if (TUT.on) return;
    closeSheet(true); if (modalResolve) closeModal(false);
    TUT.on = true; TUT.i = 0; TUT.focusDone = -1;
    $('#dlgIn').innerHTML = '';
    TUT.saved = { view, active: C.active };
    C.active = {};
    S.sandbox(demoData());
    view = { name: 'home' }; history.pushState({ v: view }, '');
    render(); window.scrollTo(0, 0);
    document.body.insertAdjacentHTML('beforeend', '<div id="tutHole"></div><div id="tutPanel" role="dialog" aria-live="polite"></div>');
    drawTut(); loopTut();
  }
  function endTutorial() {
    if (!TUT.on) return;
    TUT.on = false; clearTimeout(TUT.raf);
    ['#tutHole', '#tutPanel'].forEach(s => { const el = $(s); if (el) el.remove(); });
    closeSheet(true); if (modalResolve) closeModal(false);
    C.active = TUT.saved.active; S.saveCfg();
    S.sandbox(null);
    C.tutorialSeen = true; S.saveCfg();
    view = { name: 'home' }; history.replaceState({ v: view }, '');
    render(); window.scrollTo(0, 0);
    toast('사용법 둘러보기를 마쳤어요');
  }
  const dlgOpen = () => $('#dlg').open;
  function tutEl(st) {
    if (!st || !st.sel) return null;
    const el = typeof st.sel === 'function' ? st.sel() : $(st.sel);
    if (el && !dlgOpen() && el.closest('#dlg')) return null;   // 닫힌 창 안의 것은 없는 것으로
    return el;
  }
  function drawTut() {
    const st = TSTEPS[TUT.i], p = $('#tutPanel'); if (!p) return;
    p.innerHTML = `<div class="tp-n">${TUT.i + 1} / ${TSTEPS.length}</div><div class="tp-t">${st.text}</div>
      <div class="tp-b"><button class="btn ghost sm" id="tpStop">그만하기</button>${st.next ? `<button class="btn pri" id="tpNext">${st.next}</button>` : '<span class="small muted">빛나는 곳을 눌러 보세요</span>'}</div>`;
    $('#tpStop').onclick = endTutorial;
    const n = $('#tpNext'); if (n) n.onclick = () => advanceTut();
    if (st.enter) setTimeout(st.enter, 50);
  }
  function advanceTut() {
    if (TUT.i >= TSTEPS.length - 1) { endTutorial(); return; }
    TUT.i++; TUT.focusDone = -1; drawTut();
  }
  function loopTut() {
    if (!TUT.on) return;
    const st = TSTEPS[TUT.i], el = tutEl(st), hole = $('#tutHole'), p = $('#tutPanel');
    if (st.need && st.need()) { advanceTut(); }
    if (el && hole) {
      if (TUT.focusDone !== TUT.i) { TUT.focusDone = TUT.i; try { const inDlg = !!el.closest('#dlg'); el.scrollIntoView(inDlg ? { block: 'nearest' } : { block: 'center', behavior: 'smooth' }); } catch (e) {} }
      // 창 안에서 가려져 있으면 창 안쪽을 굴려서 보이게
      const sc = el.closest('#dlgIn');
      if (sc) { const a = el.getBoundingClientRect(), b = sc.getBoundingClientRect(); if (a.bottom > b.bottom - 4 || a.top < b.top + 4) sc.scrollTop += a.top - b.top - (b.height - a.height) / 2; }
      const r = el.getBoundingClientRect(), pad = 6;
      Object.assign(hole.style, { display: 'block', left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
      if (p) p.classList.toggle('top', !!el.closest('#dlg') || r.top + r.height / 2 > window.innerHeight * 0.55);
    } else if (hole) { hole.style.display = 'none'; if (p) p.classList.remove('top'); }
    TUT.raf = setTimeout(loopTut, 120);   // 화면이 잠시 가려져도 멈추지 않게 타이머로 돎
  }
  // 둘러보기 중에는 빛나는 곳과 안내창만 눌림
  ['click', 'keydown', 'submit', 'change'].forEach(type => document.addEventListener(type, e => {
    if (!TUT.on) return;
    const t = e.target;
    if (t.closest && t.closest('#tutPanel')) return;
    const st = TSTEPS[TUT.i], el = tutEl(st);
    if (el && (el === t || el.contains(t))) {
      if (type === 'keydown' && !st.allowType && e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); }
      if (st.next && !st.allowType && type === 'click') { e.preventDefault(); e.stopPropagation(); }   // ‘다음’ 단계는 보기만
      return;
    }
    if (type === 'keydown' && ['Tab', 'Shift'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
  }, true));
  function offerTutorial() {
    if (C.tutorialSeen) return;
    C.tutorialSeen = true; S.saveCfg();
    setTimeout(() => modal('<h3>처음이세요?</h3><p class="msg">연습용 자료로 쓰는 법을 처음부터 한 번 보여 드릴게요.\n1~2분이면 끝나고, 아무것도 저장되지 않아요.</p>',
      [{ label: '다음에', val: false }, { label: '▶ 사용법 보기', val: true, cls: 'pri' }]).then(v => { if (v) startTutorial(); }), 400);
  }

  /* ---------- 모달 ---------- */
  let modalResolve = null;
  function modal(html, buttons, init) {
    const dlg = $('#dlg');
    if (modalResolve) { const r = modalResolve; modalResolve = null; r(false); }
    $('#dlgIn').innerHTML = html + `<div class="acts">${buttons.map((b, i) => `<button class="btn ${b.cls || 'ghost'}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div>`;
    return new Promise(res => {
      modalResolve = res;
      $('#dlgIn').querySelectorAll('.acts [data-i]').forEach(b => b.onclick = () => closeModal(buttons[+b.dataset.i].val));
      dlg.onclose = () => { if (modalResolve) { const r = modalResolve; modalResolve = null; r(false); } };
      try { if (TUT.on) dlg.show(); else dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
      dlg.classList.toggle('tut', TUT.on);
      if (init) init($('#dlgIn'));
      const f = $('#dlgIn').querySelector('input:not([type=file]):not([type=checkbox]):not([type=date]),textarea');
      if (f && !/Mobi|Android|iPhone|iPad/.test(navigator.userAgent)) f.focus();
    });
  }
  function closeModal(val) {
    const r = modalResolve; modalResolve = null;
    const dlg = $('#dlg'); try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); }
    if (r) r(val);
  }

  /* ---------- 홈 화면 설치 · 전체화면 ---------- */
  // 크롬은 브라우저 전체화면(Fullscreen API)도 display-mode: fullscreen 으로 알려 주므로, 처음 열렸을 때 값으로 판단
  const BOOT_STANDALONE = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: minimal-ui)').matches || navigator.standalone === true;
  function isStandalone() {
    if (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) return true;
    if (document.fullscreenElement || document.webkitFullscreenElement) return BOOT_STANDALONE;
    return BOOT_STANDALONE || matchMedia('(display-mode: fullscreen)').matches;
  }
  let inFrame = false; try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
  const FS = {
    userExit: false,
    supported: () => { const d = document.documentElement; return !!(d.requestFullscreen || d.webkitRequestFullscreen) && !isStandalone() && !inFrame; },
    on: () => !!(document.fullscreenElement || document.webkitFullscreenElement),
    enter() { const d = document.documentElement; try { const r = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : (d.webkitRequestFullscreen && d.webkitRequestFullscreen()); if (r && r.catch) r.catch(() => {}); } catch (e) {} },
    exit() { try { const r = document.exitFullscreen ? document.exitFullscreen() : (document.webkitExitFullscreen && document.webkitExitFullscreen()); if (r && r.catch) r.catch(() => {}); } catch (e) {} },
    toggle() {
      if (!FS.supported()) { installSheet(); return; }   // 아이폰처럼 전체화면이 막힌 곳은 설치 방법 안내
      if (FS.on()) { FS.userExit = true; FS.exit(); } else { FS.userExit = false; FS.enter(); }
    }
  };
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; paintInstall(); });
  window.addEventListener('appinstalled', () => { installEvt = null; C.installDismissed = true; S.saveCfg(); paintInstall(); toast('홈 화면에 설치했어요'); });
  function paintInstall() {
    const sa = isStandalone();
    const b = $('#banner'); if (b) b.classList.toggle('hidden', sa || inFrame || C.installDismissed);
    const f = $('#bFs'); if (f) f.classList.toggle('hidden', !FS.supported());
    const h = $('#hInst2'); if (h) h.classList.toggle('hidden', sa);
    const t = $('#tFS'); if (t) { t.classList.toggle('hidden', !FS.supported()); t.innerHTML = FS.on() ? ICON.fsOff : ICON.fsOn; t.setAttribute('aria-label', FS.on() ? '전체화면 끝내기' : '전체화면'); }
  }
  function installSheet() {
    if (isStandalone()) { toast('이미 홈 화면 앱으로 실행 중이에요'); return; }
    if (installEvt) {   // 바로 설치 창 띄우기
      const ev = installEvt; installEvt = null;
      try { ev.prompt(); ev.userChoice.then(r => { if (r && r.outcome === 'accepted') { C.installDismissed = true; S.saveCfg(); } paintInstall(); }).catch(() => {}); } catch (e) {}
      return;
    }
    const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const samsung = /SamsungBrowser/i.test(ua), inapp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(ua), mobile = /Android|Mobi/i.test(ua) || ios;
    const kbd = t => `<span class="kbd">${t}</span>`;
    let how;
    if (location.protocol === 'file:') how = '<p class="msg">지금은 파일로 열려 있어서 설치할 수 없어요. 아래 주소로 열어 주세요.\n<b>immanueladmin1985-dev.github.io/my-apps/evangelism/</b></p>';
    else if (inapp) how = `<ol><li>${kbd('⋮')} 메뉴를 누르세요</li><li><b>다른 브라우저로 열기</b>(크롬·사파리)를 누르세요</li><li>열린 화면에서 다시 <b>설치하기</b>를 누르세요</li></ol>`;
    else if (ios) how = `<ol><li>사파리의 ${kbd('공유 ⬆')} 단추를 누르세요</li><li>메뉴를 올려 <b>홈 화면에 추가</b>를 누르세요</li><li>오른쪽 위 <b>추가</b>를 누르세요</li></ol>`;
    else if (samsung) how = `<ol><li>아래 ${kbd('≡')} 메뉴를 누르세요</li><li><b>현재 페이지 추가</b> → <b>홈 화면</b>을 누르세요</li></ol>`;
    else if (mobile) how = `<ol><li>오른쪽 위 ${kbd('⋮')} 메뉴를 누르세요</li><li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누르세요</li><li>뜨는 창에서 <b>설치</b>를 누르세요</li></ol>`;
    else how = `<ol><li>크롬·엣지 주소창 오른쪽의 ${kbd('설치 ⊕')} 아이콘을 누르세요</li><li>없으면 ${kbd('⋮')} 메뉴 → <b>앱 설치</b>(또는 <b>앱</b> → <b>이 사이트를 앱으로 설치</b>)를 누르세요</li></ol>`;
    modal(`<h3>홈 화면에 설치하기</h3><p class="msg">설치하면 아이콘으로 바로 열리고, 주소창 없이 화면을 넓게 쓸 수 있어요. 인터넷이 안 되는 곳에서도 저장해 둔 기록을 볼 수 있어요.</p>${how}`, [{ label: '알겠어요', val: true, cls: 'pri' }]);
  }
  // 자동 전체화면: 화면을 처음 누를 때 (버튼으로 직접 끈 뒤에는 다시 켜지 않음)
  document.addEventListener('click', e => {
    if (!C.autoFS || FS.userExit || FS.on() || !FS.supported()) return;
    if (e.target.closest && e.target.closest('#tFS,#banner,dialog,#sFS,#sAuto,#bInst,#hInst2,#sInst,input,textarea,select')) return;
    FS.enter();
  }, true);
  const onFs = () => paintInstall();
  document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
  // 기록하는 동안 화면이 꺼지지 않게 (실패해도 조용히 넘어감)
  let wl = null, wantWake = false;
  async function wake(on) {
    wantWake = on;
    try {
      if (on && !wl && navigator.wakeLock && document.visibilityState === 'visible') { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
      else if (!on && wl) { const w = wl; wl = null; await w.release(); }
    } catch (e) { wl = null; }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { if (wantWake) wake(true); S.scheduleSync(300); }
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

  /* ---------- 기타 ---------- */
  let tt;
  function toast(m) { const t = $('#toast'); t.classList.remove('act'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }
  function toastUndo(m, undo) {
    const t = $('#toast'); t.textContent = m + ' ';
    const b = document.createElement('button'); b.textContent = '되돌리기';
    b.onclick = () => { t.classList.remove('show', 'act'); undo(); };
    t.appendChild(b); t.classList.add('show', 'act');
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show', 'act'), 6000);
  }
  window.addEventListener('online', () => S.scheduleSync(500));
  setInterval(() => { if (document.visibilityState === 'visible' && !sheetOpen() && !modalResolve) S.scheduleSync(0); }, 90000);

  // Artifact 등으로 게시하면 head 태그가 body 로 들어가므로 다시 head 로 옮김
  document.querySelectorAll('body > link[rel=manifest], body > link[rel=icon], body > link[rel=apple-touch-icon], body > meta[name]').forEach(el => document.head.appendChild(el));

  // 초대 링크(#s=주소)로 열면 연결 주소를 저장
  (function () {
    const m = location.search.match(/[?&]s=([^&#]+)/) || location.hash.match(/[#&]s=([^&]+)/);
    if (m) {
      const srv = decodeURIComponent(m[1]);
      if (/^https:\/\/script\.google(usercontent)?\.com\//.test(srv) && srv !== C.server) { C.server = srv; C.status = ''; C.role = ''; C.since = 0; S.saveCfg(); }
      history.replaceState(null, '', location.pathname);
    }
  })();

  history.replaceState({ v: view }, '');
  applyFont();
  // 카카오톡 등 앱 안 브라우저로 열리면 곧바로 기본 브라우저(크롬·삼성 인터넷·사파리)로 넘김
  // 넘어가지 않을 때를 위해 안내 화면을 남기고, '그냥 여기서 쓰기'를 고르면 이번에는 다시 넘기지 않음
  const STAY_KEY = 'evangelism-stay-inapp';
  let stayInApp = false; try { stayInApp = sessionStorage.getItem(STAY_KEY) === '1'; } catch (e) {}
  const autoOut = IN_APP && !stayInApp && (IN_KAKAO || IS_ANDROID);
  function kickedHtml() {
    const br = IS_IOS ? '사파리' : '크롬';
    return `<div class="login"><div class="card set" style="text-align:center">
      <img src="icon-192.png" alt=""><h1>전도현황</h1>
      <p><b>${br}(기본 브라우저)</b>로 여는 중이에요…</p>
      <p class="small muted">카카오톡 안에서는 홈 화면 설치가 안 되고, 크롬과 저장 공간도 따로라서 기본 브라우저로 열어요.</p>
      <button class="btn pri big" id="kkOpen">${br}로 열기</button>
      <p class="small muted">열리지 않으면 오른쪽 위 <b>⋮</b>(아이폰은 아래 <b>⋯</b>) 메뉴에서 <b>다른 브라우저로 열기</b>를 눌러 주세요.</p>
      <button class="btn ghost sm" id="kkStay">그냥 카카오톡에서 쓰기</button></div></div>`;
  }
  if (autoOut) {
    $('#app').innerHTML = kickedHtml();
    $('#kkOpen').onclick = openExternal;
    $('#kkStay').onclick = () => { try { sessionStorage.setItem(STAY_KEY, '1'); } catch (e) {} S.load().then(() => { render(); if (C.name) S.sync(); }); };
    setTimeout(openExternal, 300);
  } else S.load().then(() => { render(); if (C.name) S.sync(); });
  window.__ev = { ix, render, go: v => go(v), S };
})();
