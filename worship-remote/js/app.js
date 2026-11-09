'use strict';
/* 예배 리모컨 — 예배 준비 도우미(PC 프로그램)를 핸드폰으로 조작
   PC와 직접 잇지 않고 Firebase Realtime Database를 우편함처럼 거칩니다 (교회 와이파이·LTE 어디서나).
   wsr/{방}: req/{나} 연결 요청 · allow/{나} PC가 허락함 · pc 켜짐 · state 상태 · pages 장 목록 · thumb 지금 화면 · cmd 명령 · res/{나} 결과
   방 이름은 PC 프로그램의 QR에만 들어 있고, 처음에는 PC에서 [허락]을 눌러야 씁니다. */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'worshipRemote';
const S = Object.assign({ room: '', name: '', tab: 'show', autoFS: true, installDismissed: false }, (() => { try{ return JSON.parse(localStorage.getItem(KEY) || '{}'); }catch(e){ return {}; } })());
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} };
const code4 = uid => { let h = 0; for (const c of String(uid)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return String(h % 10000).padStart(4, '0'); };   // PC 창에도 같은 번호가 보임
const V = { screen: 'boot', uid: '', db: null, pc: null, st: null, pages: [], thumb: null, offs: [], wait: {}, yt: { list: null, loading: false, err: '' }, vmt: { list: null, loading: false, err: '' }, noteAt: 0, req: null, err: '' };

/* ---------- 주소의 방 이름 (#r=…) ---------- */
(() => {
  const m = /[#&]r=([A-Za-z0-9]{20,64})/.exec(location.hash);
  if (m){ if (m[1] !== S.room){ S.room = m[1]; save(); } try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){} }
})();

/* ---------- Firebase ---------- */
function loadScript(src){ return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('load')); document.head.appendChild(s); }); }
async function fb(){
  if (V.db) return V.db;
  if (!window.firebase || !firebase.database) for (const f of ['app', 'auth', 'database']) await loadScript(`vendor/firebase-${f}-compat.js`);
  const app = firebase.apps.find(a => a.name === 'wr') || firebase.initializeApp(window.FIREBASE_CONFIG, 'wr');
  const auth = app.auth();
  if (!auth.currentUser) await new Promise(ok => { const off = auth.onAuthStateChanged(() => { off(); ok(); }); });   // 저장된 로그인부터 기다림
  if (!auth.currentUser) await auth.signInAnonymously();
  V.uid = auth.currentUser.uid; V.db = app.database();
  return V.db;
}
const P = s => `wsr/${S.room}/${s}`;
const TS = () => firebase.database.ServerValue.TIMESTAMP;
function listen(path, ev, cb, onErr){ const r = V.db.ref(path); const f = r.on(ev, s => cb(s), e => { if (onErr) onErr(e); }); V.offs.push(() => r.off(ev, f)); }
function stopAll(){ V.offs.forEach(f => { try{ f(); }catch(e){} }); V.offs = []; }

async function boot(){
  stopAll();
  if (!S.room){ V.screen = 'need'; return render(); }
  if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.apiKey){ V.screen = 'err'; V.err = '설정이 비어 있습니다.'; return render(); }
  V.screen = 'boot'; render();
  try{ await fb(); }catch(e){ V.screen = 'err'; V.err = /admin-restricted|operation-not-allowed/.test(e.code || '') ? 'Firebase 익명 로그인이 꺼져 있습니다.' : '인터넷에 연결하지 못했습니다.'; render(); setTimeout(boot, 8000); return; }
  // 허락받았는지
  listen(P('allow/' + V.uid), 'value', s => {
    const ok = !!s.val();
    if (ok && V.screen !== 'main') startMain();
    else if (!ok && V.screen === 'main'){ stopAll(); V.screen = 'pair'; V.req = null; toast('PC에서 이 핸드폰 연결을 뺐습니다. 다시 요청해 주세요.', 'warn'); boot(); }
    else if (!ok && V.screen !== 'pair' && V.screen !== 'main'){ V.screen = 'pair'; render(); }
  }, () => { V.screen = 'err'; V.err = 'Firebase 규칙이 막고 있습니다.'; render(); });
  listen(P('req/' + V.uid), 'value', s => { const was = V.req; V.req = s.val(); if (was && !V.req && V.screen === 'pair') toast('요청이 끝났습니다. 허락되지 않았으면 다시 요청해 주세요.', 'info'); if (V.screen === 'pair') render(); });
}
async function askJoin(){
  const name = ($('#nm') && $('#nm').value.trim()) || S.name || guessName();
  S.name = name.slice(0, 40); save();
  try{ await V.db.ref(P('req/' + V.uid)).set({ name: S.name, t: TS() }); toast('PC에 연결 요청을 보냈습니다. PC 화면에서 [허락]을 눌러 주세요.', 'ok'); }
  catch(e){ toast('요청하지 못했습니다. PC의 주소가 바뀌었을 수 있습니다. PC 프로그램 [핸드폰]의 QR을 다시 찍어 주세요.', 'err'); }
}
function guessName(){ const ua = navigator.userAgent; return /iPhone/.test(ua) ? '아이폰' : /iPad/.test(ua) ? '아이패드' : /SM-|Samsung/i.test(ua) ? '갤럭시' : /Android/.test(ua) ? '안드로이드 핸드폰' : '핸드폰'; }

function startMain(){
  V.screen = 'main'; render();
  listen(P('pc'), 'value', s => { V.pc = s.val(); paintPc(); });
  listen(P('state'), 'value', s => {
    const v = s.val(); let st = null; try{ st = v ? JSON.parse(v.j) : null; }catch(e){}
    const first = !V.st; V.st = st;
    if (st && st.notes){ if (first) V.noteAt = Math.max(0, ...st.notes.map(n => n.at)); else for (const n of st.notes) if (n.at > V.noteAt){ V.noteAt = n.at; toast('PC: ' + n.t, n.k); } }
    render();
  });
  listen(P('pages'), 'value', s => { const v = s.val(); try{ V.pages = v ? JSON.parse(v.j) : []; }catch(e){ V.pages = []; } if (S.tab === 'show') render(); });
  listen(P('thumb'), 'value', s => { V.thumb = s.val(); const im = $('#thImg'); if (im && V.thumb && V.thumb.d) im.src = V.thumb.d; else if (S.tab === 'show') render(); });
  listen(P('res/' + V.uid), 'child_added', s => {
    const v = s.val(), w = V.wait[s.key]; V.db.ref(P('res/' + V.uid + '/' + s.key)).remove().catch(() => {});
    if (!w) return; delete V.wait[s.key]; clearTimeout(w.tm);
    let m = ''; try{ m = JSON.parse(v.m); }catch(e){}
    v.ok ? w.ok(m) : w.no(new Error(m || '하지 못했습니다.'));
  });
  wake();
  if (S.tab === 'yt' && !V.yt.list) ytLoad();
}

/* ---------- 명령 보내기 ---------- */
function send(c, a, ms){
  if (!V.pc || !V.pc.on) return Promise.reject(new Error('PC 프로그램이 꺼져 있거나 인터넷에 연결되어 있지 않습니다.'));
  const ref = V.db.ref(P('cmd')).push(), id = ref.key;
  return new Promise((ok, no) => {
    V.wait[id] = { ok, no, tm: setTimeout(() => { delete V.wait[id]; no(new Error('PC가 답하지 않습니다. PC 프로그램이 켜져 있는지 확인해 주세요.')); }, ms || 15000) };
    ref.set({ by: V.uid, c, a: JSON.stringify(a || {}), t: TS() }).catch(e => { clearTimeout(V.wait[id] && V.wait[id].tm); delete V.wait[id]; no(new Error('보내지 못했습니다: ' + e.message)); });
  });
}
async function act(c, a, o = {}){
  try{
    if (navigator.vibrate) try{ navigator.vibrate(12); }catch(e){}
    const r = await send(c, a, o.ms);
    if (typeof r === 'string' && r && !o.quiet) toast(r, 'ok');
    return r;
  }catch(e){ toast(e.message, 'err'); throw e; }
}

/* ---------- 화면 그리기 ---------- */
const TABS = { show: '화면 넘기기', yt: '유튜브', setup: '예배 세팅', up: '영상' };
function paintPc(){
  const box = $('#pcSt'); box.classList.toggle('hidden', V.screen !== 'main');
  const on = !!(V.pc && V.pc.on); $('#pcDot').className = 'dot ' + (on ? 'on' : 'off'); $('#pcTxt').textContent = on ? 'PC 켜짐' : 'PC 꺼짐';
}
function render(){
  paintPc();
  $('#tabs').classList.toggle('hidden', V.screen !== 'main');
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  const m = $('#main');
  if (V.screen === 'boot'){ m.innerHTML = '<div class="pair"><p class="dim">연결하는 중…</p></div>'; return; }
  if (V.screen === 'err'){ m.innerHTML = `<div class="pair"><h2>연결하지 못했습니다</h2><p class="dim">${esc(V.err)}</p><button class="btn pri" data-x="retry">다시 해 보기</button></div>`; return; }
  if (V.screen === 'need'){ m.innerHTML = `<div class="pair"><h2>PC와 연결하기</h2><p class="dim">PC의 <b>예배 준비 도우미</b> 왼쪽 아래 <b>[핸드폰]</b> 단추를 누르고<br>[켜기]를 누른 뒤 나오는 <b>QR 코드를 핸드폰 카메라로 찍어</b> 주세요.</p></div>`; return; }
  if (V.screen === 'pair'){
    m.innerHTML = V.req
      ? `<div class="pair"><h2>PC의 허락을 기다리는 중</h2><p class="dim">PC 화면에 뜬 창에서 이 번호를 확인하고 <b>[허락]</b>을 눌러 주세요.</p><div class="code">${code4(V.uid)}</div><p class="dim">PC 창이 안 보이면 프로그램이 트레이에 숨어 있을 수 있습니다.</p><button class="btn" data-x="join">요청 다시 보내기</button></div>`
      : `<div class="pair"><h2>이 핸드폰 연결하기</h2><p class="dim">PC에 보일 이 핸드폰 이름</p><input type="text" id="nm" maxlength="40" value="${esc(S.name || guessName())}"><button class="btn pri wide" data-x="join">PC에 연결 요청</button><p class="dim" style="margin-top:16px">확인 번호: <b>${code4(V.uid)}</b></p></div>`;
    return;
  }
  const st = V.st;
  if (!st){ m.innerHTML = `<div class="pair"><p class="dim">${V.pc && V.pc.on ? 'PC 상태를 받는 중…' : 'PC 프로그램이 꺼져 있습니다.<br>PC에서 예배 준비 도우미를 켜면 여기에 바로 나타납니다.'}</p></div>`; return; }
  const off = !(V.pc && V.pc.on) ? `<div class="card" style="border-color:#7f1d1d"><b style="color:#fca5a5">PC 프로그램이 꺼져 있습니다</b><div class="dim">아래는 마지막으로 받은 상태입니다. PC에서 프로그램을 켜면 다시 조작할 수 있습니다.</div></div>` : '';
  const top = S.tab === 'show' ? (m.querySelector('.pl') || {}).scrollTop : null;
  m.innerHTML = off + ({ show: showHtml, yt: ytHtml, setup: setupHtml, up: vmHtml }[S.tab] || showHtml)(st);
  const pl = m.querySelector('.pl');
  if (pl){ if (top != null && V.plKeep) pl.scrollTop = top; else { const c = pl.querySelector('.cur'); if (c) pl.scrollTop = c.offsetTop - pl.clientHeight / 2; } V.plKeep = false; }
}
function showHtml(st){
  const s = st.show;
  if (!s.showing){
    return `<div class="card"><h2>지금 띄우는 화면이 없습니다</h2><p class="dim">예배 PPT를 TV에 띄우면 여기에서 넘길 수 있습니다.</p>
      ${s.canStart ? '<button class="btn pri wide" data-c="showStart" data-ms="60000">이번 주 예배 PPT 띄우기</button>' : '<p class="dim">PC에 이번 주 예배 순서가 아직 없습니다.</p>'}</div>`;
  }
  const th = V.thumb && V.thumb.d ? `<img id="thImg" src="${V.thumb.d}" alt="">` : '<img id="thImg" alt="">';
  let sec = null;
  const list = (V.pages || []).map((p, i) => { const h = p[1] && p[1] !== sec ? `<div class="sh">${esc(sec = p[1])}</div>` : ''; return `${h}<button data-go="${i}" class="${i === s.idx ? 'cur' : ''}"><small>${i + 1}</small><span>${esc(p[0])}</span></button>`; }).join('');
  return `<div class="card">
      <div class="thumb">${th}${s.black ? '<span class="blk">검은 화면</span>' : ''}</div>
      <div class="now"><div class="sec">${esc(s.sec || s.title)}</div><b>${esc(s.cur)}</b> <span class="pos">${s.idx + 1} / ${s.n}</span></div>
      <div class="nx">다음: <b>${esc(s.next || '끝')}</b>${s.nsec && s.nsec !== s.sec ? ` <span class="dim">(${esc(s.nsec)})</span>` : ''}</div>
      <div class="big"><button class="btn" data-c="prev">◀ 이전</button><button class="btn pri" data-c="next">다음 ▶</button></div>
      <div class="grid4">
        <button class="btn ${s.black ? 'on' : ''}" data-c="black"><b>■</b>검은 화면</button>
        <button class="btn" data-c="next" data-a='{"skip":1}' title="자막을 건너뛰고 다음 장"><b>⇣</b>다음 장</button>
        ${st.show.on ? `<button class="btn ${s.rep === 1 ? 'on' : ''}" data-c="rep" ${s.song || s.rep === 1 ? '' : 'disabled'}><b>↻</b>곡 반복</button>
        <button class="btn ${s.rep === 2 ? 'on' : ''}" data-c="rep" data-a='{"cho":1}' ${s.song || s.rep === 2 ? '' : 'disabled'}><b>↺</b>후렴 반복</button>` : '<span></span><span></span>'}
      </div>
      ${st.show.on && s.obs ? `<div class="sw" style="margin-top:6px"><span class="t">OBS 자막 숨기기</span><button class="tg ${s.mute ? 'on' : ''}" data-c="mute" aria-label="OBS 자막 숨기기"></button></div>` : ''}
    </div>
    ${list ? `<div class="card"><h2>장으로 바로 가기</h2><div class="pl">${list}</div></div>` : ''}
    ${st.show.on ? '<div class="card"><button class="btn wide" data-c="showClose" data-arm="띄우기를 끝낼까요? 한 번 더 누르세요">띄우기 끝내기</button></div>' : ''}`;
}
function ytHtml(st){
  const Y = V.yt, L = Y.list;
  const when = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }); };
  const rows = L ? L.map(x => `<div class="li"><div class="t"><b>${esc(x.title)}</b><small>${x.live ? '<span class="live">● 라이브 중</span>' : esc(when(x.at)) + ' 예정'}</small></div>
      ${x.live ? `<button class="btn sm red" data-c="ytEnd" data-a='${esc(JSON.stringify({ id: x.id }))}' data-ms="90000" data-arm="한 번 더 누르면 끝냄" data-yt="1">라이브 끝내기</button>` : `<button class="btn sm pri" data-c="ytGo" data-a='${esc(JSON.stringify({ id: x.id }))}' data-ms="120000" data-ask="'${esc(x.title)}' 방송을 지금 라이브로 시작할까요?\nOBS에서 [방송 시작]이 켜져 있어야 합니다." data-yt="1">라이브 시작</button>`}</div>`).join('') || '<div class="dim">오늘 예정된 방송이나 라이브 중인 방송이 없습니다.</div>' : '';
  return `<div class="card"><h2>오늘 유튜브 방송<span style="flex:1"></span><button class="btn sm" data-x="ytLoad">${Y.loading ? '불러오는 중…' : '새로 고침'}</button></h2>
      ${Y.err ? `<div class="dim" style="color:#fca5a5">${esc(Y.err)}</div>` : ''}${L ? rows : Y.loading ? '<div class="dim">불러오는 중…</div>' : ''}</div>
    <div class="card"><h2>설정</h2>
      <div class="sw"><span class="t">예약 시각이 되면 라이브 저절로 시작<br><small class="dim">PC 프로그램이 켜져 있어야 합니다</small></span><button class="tg ${st.yt.autoLive ? 'on' : ''}" data-c="ytAuto" data-a='{"on":${!st.yt.autoLive}}'></button></div>
      <div class="dim">라이브를 끝내면 ${st.yt.cmtAfter ? '기도제목 댓글을 달고' : ''}${st.yt.pin ? ' PC 크롬에서 고정합니다' : ''}${!st.yt.cmtAfter && !st.yt.pin ? '아무것도 더 하지 않습니다' : ''}. (PC [유튜브] 탭 설정을 따름)</div></div>`;
}
function setupHtml(st){
  const U = st.setup, nx = U.next;
  const whenTxt = t => { const d = new Date(t); return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' }); };
  return `<div class="card"><h2>프로그램 한 번에 켜기</h2>
      ${U.groups.length ? U.groups.map(g => `<div class="li"><div class="t"><b>${esc(g.name)}</b><small>${g.n}개 항목${g.id === U.cur ? ' · 지금 고른 묶음' : ''}</small></div><button class="btn sm pri" data-c="suRun" data-a='${esc(JSON.stringify({ id: g.id }))}' data-ask="'${esc(g.name)}' 묶음을 켤까요?\nPC에서 프로그램들이 켜지고 모니터마다 자리를 잡습니다." ${U.busy ? 'disabled' : ''}>켜기</button></div>`).join('') : '<div class="dim">PC [예배 세팅]에 만든 묶음이 없습니다.</div>'}
      ${U.busy || U.log.length ? `<div class="log">${U.busy ? '<div>⏳ 켜는 중…</div>' : ''}${U.log.map(([k, t]) => `<div class="${esc(k)}">${esc(t)}</div>`).join('')}</div>` : ''}</div>
    <div class="card"><h2>Zoom</h2><div class="grid2"><button class="btn" data-c="zoom" data-a='{"op":"start"}' data-ms="60000" data-ask="Zoom 새 회의를 열까요?">새 회의 열기</button><button class="btn" data-c="zoom" data-a='{"op":"secure"}' data-ms="60000">참가자 권한 끄기</button></div></div>
    ${nx ? `<div class="card"><h2>다음 예약</h2><div><b>${esc(nx.name)}</b> · ${esc(whenTxt(nx.at))}</div><div class="dim">${esc(nx.what || '')}</div></div>` : ''}`;
}
function autoHtml(st){
  const A = st.vm; if (!A) return '';
  const ic = { wait: '○', run: '⏳', ok: '✅', skip: '⏭', err: '⚠️' };
  const T = V.vmt;
  if (A.busy){
    return `<div class="card"><h2>쇼츠 알아서 만드는 중</h2><div class="dim">${esc(A.title)}</div>
      <div class="steps">${A.steps.map(s => `<div class="step ${esc(s.state)}"><span>${ic[s.state] || '○'}</span><div><b>${esc(s.label)}</b>${s.note ? `<small>${esc(s.note)}</small>` : ''}</div></div>`).join('')}</div>
      ${A.results && A.results.length ? `<div class="dim" style="margin-top:8px">지금까지 ${A.results.length}/${A.n}<br>${A.results.map(r => `${r.ok ? '✅' : '⚠️'} ${esc(r.label)} — ${esc(r.note)}`).join('<br>')}</div>` : ''}
      <button class="btn wide" style="margin-top:12px" data-c="vmStop" ${A.stop ? 'disabled' : ''}>${A.stop ? '이 예배까지 하고 멈춥니다' : '이 예배까지만 하고 멈추기'}</button></div>`;
  }
  const last = A.last && A.last.res && A.last.res.length ? `<div class="dim" style="margin-top:10px">지난 자동 작업 (${esc(new Date(A.last.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }))})<br>${A.last.res.map(r => `${r.ok ? '✅' : '⚠️'} ${esc(r.label)}${r.ok ? '' : ' — ' + esc(r.note)}`).join('<br>')}</div>` : '';
  const done = A.results && A.results.length ? `<div class="dim" style="margin-top:10px">방금 한 일<br>${A.results.map(r => `${r.ok ? '✅' : '⚠️'} ${esc(r.label)} — ${esc(r.note)}`).join('<br>')}</div>` : '';
  let body;
  if (T.loading) body = '<div class="dim">쇼츠를 아직 다 못 만든 예배를 찾는 중… (라이브 목록을 읽느라 30초쯤 걸릴 수 있습니다)</div>';
  else if (T.err) body = `<div class="dim" style="color:#fca5a5">${esc(T.err)}</div>`;
  else if (!T.list) body = '<button class="btn pri wide" data-x="vmLoad">할 일 남은 예배 불러오기</button>';
  else if (!T.list.length) body = '<div class="dim">쇼츠를 만들 예배가 없습니다. 다 만들어 올렸습니다.</div>';
  else body = `${T.list.length > 1 ? `<button class="btn pri wide" data-c="vmAuto" data-a='{"key":"all"}' data-ms="60000" data-ask="남은 예배 ${T.list.length}개를 오래된 것부터 차례로 할까요?\n영상·자막 받기 → 클로드로 장면 고르기 → 쇼츠 자르기 → 유튜브 예약 올리기까지 PC가 알아서 합니다.">남은 예배 ${T.list.length}개 모두 차례로</button>` : ''}
      ${T.list.map(t => `<div class="li"><div class="t"><b>${esc(t.label)}</b></div><button class="btn sm" data-c="vmAuto" data-a='${esc(JSON.stringify({ key: t.key }))}' data-ms="60000" data-ask="'${esc(t.label)}' 쇼츠를 처음부터 끝까지 알아서 할까요?">시작</button></div>`).join('')}`;
  return `<div class="card"><h2>쇼츠 처음부터 끝까지 알아서<span style="flex:1"></span>${T.list && !T.loading ? '<button class="btn sm" data-x="vmLoad">새로 고침</button>' : ''}</h2>
    <div class="dim" style="margin-bottom:10px">영상·자막 받기 → 클로드로 장면 고르기 → 세로 쇼츠 만들기 → 유튜브 예약 올리기. 이미 한 단계는 건너뜁니다. PC에서 클로드 창은 숨긴 채로 하고, 유튜브 올리기는 OBS가 꺼진 뒤 저절로 합니다.</div>
    ${body}${done}${last}</div>`;
}
function upHtml(st){
  const L = st.up || [];
  const lab = { uploading: '올리는 중', queued: '기다리는 중', paused: '멈춤', error: '오류', done: '다 올림' };
  const when = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : ' · 공개 ' + d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' }); };
  const paused = L.filter(j => j.st === 'paused' || j.st === 'error').length, dn = L.filter(j => j.st === 'done').length;
  const NOW = '지금 올릴까요?\n방송 중이라면 올리는 동안 방송이 끊길 수 있습니다.';
  const btns = j => {
    const id = esc(JSON.stringify({ id: j.id }));
    const b = [];
    if (j.st === 'paused' || j.st === 'error') b.push(`<button class="btn sm pri" data-c="upResume" data-a='${id}' data-ask="${esc(NOW)}">지금 올리기</button>`);
    if (j.st === 'uploading' || j.st === 'queued') b.push(`<button class="btn sm" data-c="upPause" data-a='${id}'>멈춤</button>`);
    if (j.st !== 'done') b.push(`<button class="btn sm" data-c="upRemove" data-a='${id}' data-arm="한 번 더">빼기</button>`);
    if (j.url) b.push(`<a class="btn sm" href="${esc(j.url)}" target="_blank" rel="noopener">보기</a>`);
    return b.length ? `<div class="row">${b.join('')}</div>` : '';
  };
  return `<div class="card"><h2>유튜브 영상 올리기</h2>
    ${paused > 1 || dn ? `<div class="row" style="margin-bottom:6px">${paused > 1 ? `<button class="btn sm pri" data-c="upResume" data-ask="${esc('멈춘 ' + paused + '개를 모두 ' + NOW)}">멈춘 ${paused}개 모두 지금 올리기</button>` : ''}${dn ? `<button class="btn sm" data-c="upClear">다 올린 것 지우기</button>` : ''}</div>` : ''}
    ${L.length ? L.map(j => `<div class="li col"><div class="t"><b>${esc(j.title)}</b><small>${esc(lab[j.st] || j.st)}${j.st === 'uploading' || j.st === 'paused' ? ' ' + j.pct + '%' : ''}${esc(when(j.at))}</small>${j.msg && j.st !== 'done' ? `<div class="dim">${esc(j.msg)}</div>` : ''}${j.st !== 'done' ? `<div class="bar"><i style="width:${j.pct}%"></i></div>` : ''}</div>${btns(j)}</div>`).join('') : '<div class="dim">올리는 영상이 없습니다.</div>'}</div>`;
}
function vmHtml(st){ return autoHtml(st) + upHtml(st); }
async function vmLoad(){
  V.vmt.loading = true; V.vmt.err = ''; render();
  try{ V.vmt.list = await send('vmTargets', {}, 90000); }catch(e){ V.vmt.err = e.message; }
  V.vmt.loading = false; if (S.tab === 'up') render();
}

/* ---------- 누르기 ---------- */
async function ytLoad(){
  V.yt.loading = true; V.yt.err = ''; render();
  try{ V.yt.list = await send('ytList', {}, 30000); }catch(e){ V.yt.err = e.message; }
  V.yt.loading = false; if (S.tab === 'yt') render();
}
$('#main').addEventListener('click', async e => {
  const x = e.target.closest('[data-x]');
  if (x){ const k = x.dataset.x; if (k === 'retry') boot(); else if (k === 'join') askJoin(); else if (k === 'ytLoad') ytLoad(); else if (k === 'vmLoad') vmLoad(); return; }
  const g = e.target.closest('[data-go]'); if (g){ V.plKeep = true; act('go', { i: +g.dataset.go }).catch(() => {}); return; }
  const b = e.target.closest('[data-c]'); if (!b || b.disabled) return;
  if (b.dataset.arm && !b.classList.contains('arm')){ const t = b.textContent; b.classList.add('arm'); b.textContent = b.dataset.arm; setTimeout(() => { if (b.isConnected){ b.classList.remove('arm'); b.textContent = t; } }, 4000); return; }
  if (b.dataset.ask && !(await modal(`<p class="msg">${esc(b.dataset.ask)}</p>`, [{ label: '취소', val: false }, { label: '예', val: true, cls: 'pri' }]))) return;
  let a = {}; try{ a = JSON.parse(b.dataset.a || '{}'); }catch(err){}
  const quick = ['next', 'prev', 'go', 'black', 'rep', 'mute'].includes(b.dataset.c);
  const label = b.innerHTML; if (!quick){ b.disabled = true; b.textContent = '하는 중…'; }
  try{ await act(b.dataset.c, a, { ms: +b.dataset.ms || undefined, quiet: quick }); if (b.dataset.yt) setTimeout(ytLoad, 1500); if (b.dataset.c === 'vmAuto') V.vmt.list = null; }catch(err){}
  if (!quick && b.isConnected){ b.disabled = false; b.innerHTML = label; }
});
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; save(); render(); window.scrollTo(0, 0); if (S.tab === 'yt' && !V.yt.list && !V.yt.loading) ytLoad(); });
// 볼륨 단추·키보드(블루투스 리모컨)로도 넘김
document.addEventListener('keydown', e => {
  if (V.screen !== 'main' || S.tab !== 'show' || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)){ e.preventDefault(); act('next').catch(() => {}); }
  else if (['ArrowLeft', 'PageUp'].includes(e.key)){ e.preventDefault(); act('prev').catch(() => {}); }
});

/* ---------- 알림 · 창 ---------- */
function toast(m, k){
  const d = document.createElement('div'); d.className = k || 'info'; d.textContent = m; $('#toast').appendChild(d);
  setTimeout(() => d.remove(), k === 'err' ? 6000 : 3200);
  while ($('#toast').children.length > 3) $('#toast').firstChild.remove();
}
function modal(html, btns){
  return new Promise(res => {
    $('#modalBox').innerHTML = html + `<div class="btns">${btns.map((b, i) => `<button class="btn sm ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div>`;
    $('#modal').classList.remove('hidden');
    const done = v => { $('#modal').classList.add('hidden'); $('#modal').onclick = null; res(v); };
    $('#modal').onclick = e => { const b = e.target.closest('[data-i]'); if (b) done(btns[+b.dataset.i].val); else if (e.target.id === 'modal') done(btns[0].val); };
  });
}
function settings(){
  const sa = isStandalone();
  modal(`<h3>설정</h3>
    <div class="sw"><span class="t">자동 전체화면<br><small class="dim">화면을 처음 누르면 전체화면으로</small></span><button class="tg ${S.autoFS ? 'on' : ''}" id="sAutoFS"></button></div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
      <button class="btn sm ${FS.supported() ? '' : 'hidden'}" id="sFS">${FS.on() ? '전체화면 끝내기' : '전체화면 켜기'}</button>
      <button class="btn sm ${sa ? 'hidden' : ''}" id="sInst">홈 화면에 설치하기</button>
      ${S.room ? '<button class="btn sm" id="sUnpair">이 핸드폰 연결 끊기</button>' : ''}
    </div>
    <p class="dim" style="margin-top:12px">이 핸드폰 확인 번호: ${V.uid ? code4(V.uid) : '-'}</p>`, [{ label: '닫기', val: true, cls: 'pri' }]);
  $('#sAutoFS').onclick = e => { S.autoFS = !S.autoFS; save(); e.currentTarget.classList.toggle('on', S.autoFS); };
  $('#sFS').onclick = () => { FS.toggle(); $('#modal').classList.add('hidden'); };
  $('#sInst').onclick = () => { $('#modal').classList.add('hidden'); installSheet(); };
  const u = $('#sUnpair'); if (u) u.onclick = async () => {
    if (u.dataset.arm !== '1'){ u.dataset.arm = '1'; u.textContent = '한 번 더 누르면 끊음 (QR을 다시 찍어야 함)'; return; }
    $('#modal').classList.add('hidden'); stopAll(); S.room = ''; save(); V.st = null; V.screen = 'need'; render();
  };
}
$('#hSet').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
$('#hSet').onclick = settings;

/* ---------- 화면 꺼짐 막기 ---------- */
let WL = null;
async function wake(){ try{ if (V.screen === 'main' && 'wakeLock' in navigator && !WL && document.visibilityState === 'visible'){ WL = await navigator.wakeLock.request('screen'); WL.addEventListener('release', () => { WL = null; }); } }catch(e){} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake(); });

/* ---------- 홈 화면 설치 · 전체화면 ---------- */
// 크롬은 브라우저 전체화면(Fullscreen API)도 display-mode: fullscreen 으로 알려 주므로, 처음 열렸을 때 값으로 판단
const BOOT_STANDALONE = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: minimal-ui)').matches || navigator.standalone === true;
function isStandalone(){
  if (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) return true;
  if (document.fullscreenElement || document.webkitFullscreenElement) return BOOT_STANDALONE;
  return BOOT_STANDALONE || matchMedia('(display-mode: fullscreen)').matches;
}
let inFrame = false; try{ inFrame = window.self !== window.top; }catch(e){ inFrame = true; }
const SVG = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const ICON = { fsOn: SVG('M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'), fsOff: SVG('M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'), inst: SVG('M12 4v11M7 10l5 5 5-5M5 20h14') };
const FS = {
  userExit: false,
  supported: () => { const d = document.documentElement; return !!(d.requestFullscreen || d.webkitRequestFullscreen) && !isStandalone() && !inFrame; },
  on: () => !!(document.fullscreenElement || document.webkitFullscreenElement),
  enter(){ const d = document.documentElement; try{ const r = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : (d.webkitRequestFullscreen && d.webkitRequestFullscreen()); if (r && r.catch) r.catch(() => {}); }catch(e){} },
  exit(){ try{ const r = document.exitFullscreen ? document.exitFullscreen() : (document.webkitExitFullscreen && document.webkitExitFullscreen()); if (r && r.catch) r.catch(() => {}); }catch(e){} },
  toggle(){ if (!FS.supported()){ installSheet(); return; } if (FS.on()){ FS.userExit = true; FS.exit(); } else { FS.userExit = false; FS.enter(); } }
};
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; paintInstall(); });
window.addEventListener('appinstalled', () => { installEvt = null; S.installDismissed = true; save(); paintInstall(); toast('홈 화면에 설치했습니다', 'ok'); });
function paintInstall(){
  const sa = isStandalone();
  $('#banner').classList.toggle('hidden', sa || inFrame || S.installDismissed);
  $('#bFs').classList.toggle('hidden', !FS.supported());
  $('#hInst').classList.toggle('hidden', sa); $('#hInst').innerHTML = ICON.inst;
  const h = $('#hFS'); h.classList.toggle('hidden', sa); h.innerHTML = FS.on() ? ICON.fsOff : ICON.fsOn;
  h.setAttribute('aria-label', FS.on() ? '전체화면 끝내기' : '전체화면'); h.title = h.getAttribute('aria-label');
}
function installSheet(){
  if (isStandalone()){ toast('이미 홈 화면 앱으로 실행 중입니다'); return; }
  if (installEvt){ const ev = installEvt; installEvt = null; try{ ev.prompt(); ev.userChoice.then(r => { if (r && r.outcome === 'accepted'){ S.installDismissed = true; save(); } paintInstall(); }).catch(() => {}); }catch(e){} return; }
  const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const samsung = /SamsungBrowser/i.test(ua), inapp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(ua), mobile = /Android|Mobi/i.test(ua) || ios;
  const kbd = t => `<span class="kbd">${t}</span>`;
  let how;
  if (inapp) how = `<ol><li>${kbd('⋮')} 메뉴를 누르세요</li><li><b>다른 브라우저로 열기</b>(크롬·사파리)를 누르세요</li><li>열린 화면에서 다시 <b>설치하기</b>를 누르세요</li></ol>`;
  else if (ios) how = `<ol><li>사파리의 ${kbd('공유 ⬆')} 단추를 누르세요</li><li>메뉴를 올려 <b>홈 화면에 추가</b>를 누르세요</li><li>오른쪽 위 <b>추가</b>를 누르세요</li></ol>`;
  else if (samsung) how = `<ol><li>아래 ${kbd('≡')} 메뉴를 누르세요</li><li><b>현재 페이지 추가</b> → <b>홈 화면</b>을 누르세요</li></ol>`;
  else if (mobile) how = `<ol><li>오른쪽 위 ${kbd('⋮')} 메뉴를 누르세요</li><li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누르세요</li><li>뜨는 창에서 <b>설치</b>를 누르세요</li></ol>`;
  else how = `<ol><li>크롬·엣지 주소창 오른쪽의 ${kbd('설치 ⊕')} 아이콘을 누르세요</li><li>없으면 ${kbd('⋮')} 메뉴 → <b>앱 설치</b>를 누르세요</li></ol>`;
  modal(`<h3>홈 화면에 설치하기</h3><p class="msg">설치하면 아이콘으로 바로 열리고, 주소창 없이 화면을 넓게 쓸 수 있습니다.</p>${how}`, [{ label: '알겠어요', val: true, cls: 'pri' }]);
}
$('#hFS').onclick = FS.toggle; $('#hInst').onclick = installSheet;
$('#bInst').onclick = installSheet; $('#bFs').onclick = FS.toggle;
$('#bLater').onclick = () => { S.installDismissed = true; save(); paintInstall(); toast('설정에서 언제든 설치할 수 있습니다'); };
document.addEventListener('click', e => {   // 자동 전체화면: 화면을 처음 누를 때 (버튼으로 직접 끈 뒤에는 다시 켜지 않음)
  if (!S.autoFS || FS.userExit || FS.on() || !FS.supported()) return;
  if (e.target.closest && e.target.closest('#hFS,#hInst,#banner,#modal,#hSet')) return;
  FS.enter();
}, true);
const onFs = () => paintInstall();
document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

paintInstall();
boot();
