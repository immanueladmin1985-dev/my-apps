/* 반주 반복기: 영상은 소리 없이 화면만 보여 주고, 소리는 Web Audio 로 미리 예약해서 끊김 없이 넘긴다 */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  // Artifact 로 게시하면 head 태그가 body 로 들어가므로 다시 head 로
  document.querySelectorAll('body link[rel=manifest],body link[rel=icon],body link[rel=apple-touch-icon],body meta[name$=capable],body meta[name=apple-mobile-web-app-title],body meta[name=theme-color]').forEach(el => document.head.appendChild(el));

  /* ---------- 저장 ---------- */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const ui = Object.assign({ autoFS: true, installDismissed: false, vol: 1, autoClose: true }, LS.get('hl.ui', {}));
  const saveUi = () => LS.set('hl.ui', ui);

  // 반주 영상은 이 기기의 IndexedDB 에만 저장
  const DB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((ok, no) => {
        let r; try { r = indexedDB.open('hymn-loop', 1); } catch (e) { no(e); return; }
        r.onupgradeneeded = () => r.result.createObjectStore('songs', { keyPath: 'id' });
        r.onsuccess = () => { this.db = r.result; ok(this.db); };
        r.onerror = () => no(r.error);
      });
    },
    tx(mode, fn) {
      return this.open().then(db => new Promise((ok, no) => {
        const t = db.transaction('songs', mode), st = t.objectStore('songs'), q = fn(st);
        t.oncomplete = () => ok(q && q.result); t.onerror = () => no(t.error); t.onabort = () => no(t.error);
      }));
    },
    all() { return this.tx('readonly', s => s.getAll()); },
    get(id) { return this.tx('readonly', s => s.get(id)); },
    put(rec) { return this.tx('readwrite', s => s.put(rec)); },
    del(id) { return this.tx('readwrite', s => s.delete(id)); }
  };

  /* ---------- 공통 ---------- */
  const fmt = (t, dec) => {
    t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = t - m * 60;
    const n = dec === true ? 1 : (dec || 0);
    return m + ':' + (n ? s.toFixed(n).padStart(3 + n, '0') : String(Math.floor(s)).padStart(2, '0'));
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let tt;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2800); }
  function modal(html, btns) {
    const d = $('#dlg'); $('#dlgBody').innerHTML = html; const b = $('#dlgBtns'); b.innerHTML = '';
    return new Promise(res => {
      btns.forEach(x => { const e = document.createElement('button'); e.textContent = x.label; if (x.cls) e.className = x.cls; e.onclick = () => { d.close(); res(x.val); }; b.appendChild(e); });
      d.onclose = () => res(undefined);
      try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
    });
  }

  /* ---------- 소리 재생 ---------- */
  const XF = 0.03;              // 넘어갈 때 겹치는 시간(초) — 딸깍 소리 방지
  const A = { ctx: null, master: null, buf: null, vs: [], playing: false, pausedAt: 0, loop: true,
    passes: 0, schedWraps: 0, limit: 0, cBase: 0, deadline: 0, timerFired: false };
  // B: 절 경계 [1절 시작, 2절 시작, …, 마지막 절 끝(=후주 시작)] / sel: 'all' 또는 고른 절 번호(0부터)
  const song = { id: null, name: '', B: [], sel: 'all', auto: null };
  const K = () => song.B.length - 1;

  function ensureCtx() {
    if (!A.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      A.ctx = new C(); A.master = A.ctx.createGain(); A.master.gain.value = ui.vol; A.master.connect(A.ctx.destination);
    }
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} // 아이폰 무음 스위치에도 소리 나게
    return A.ctx;
  }
  function voice(off, when, fade) {
    const s = A.ctx.createBufferSource(); s.buffer = A.buf;
    const g = A.ctx.createGain(); s.connect(g); g.connect(A.master);
    if (fade) { g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(1, when + XF); }
    off = Math.max(0, off); s.start(when, off);
    return { s, g, t0: when, off, cut: Infinity };
  }
  function kill(v) { try { v.s.stop(); } catch (e) {} try { v.s.disconnect(); v.g.disconnect(); } catch (e) {} }
  function stopAll() { A.vs.forEach(kill); A.vs = []; }
  // 스피커·블루투스로 실제 소리가 나오기까지 걸리는 시간
  const lat = () => A.ctx ? Math.max(0, (A.ctx.outputLatency || 0) + (A.ctx.baseLatency || 0)) : 0;
  function posAt(t) {
    if (!A.playing || !A.vs.length) return A.pausedAt;
    let v = A.vs[0]; for (const x of A.vs) if (x.t0 <= t) v = x;
    return Math.max(0, Math.min(A.buf.duration, v.off + (t - v.t0)));
  }
  const pos = () => A.playing ? posAt(A.ctx.currentTime) : A.pausedAt;
  // 귀에 들리는 위치 — 재생바와 영상은 이걸로 맞춘다
  const heard = () => A.playing ? posAt(A.ctx.currentTime - lat()) : A.pausedAt;
  function verseAt(p) { const B = song.B, k = K(); if (k < 1) return 0; if (p < B[0]) return -1; for (let i = 0; i < k; i++) if (p < B[i + 1]) return i; return k; }

  function order() { const k = Math.max(0, K()); return song.sel === 'all' || !song.sel.length ? [...Array(k).keys()] : song.sel.slice().sort((a, b) => a - b); }
  // 경계 m(전주 끝이면 0, m절 끝이면 m)에 닿았을 때 이어 갈 곳(절 번호, K()면 후주)
  function target(m) {
    const k = K(), L = order();
    if (m === 0) return { to: L[0] };
    if (!A.loop) return { to: k };
    const nx = L.find(j => j >= m);
    if (nx != null) return { to: nx };
    if (A.limit && A.schedWraps - A.cBase >= A.limit - 1) return { to: k };   // 정한 횟수를 다 돌면 후주로
    return { to: L[0], wrap: true };
  }
  // 앞으로 넘어갈 곳을 몇 개 미리 예약(화면이 꺼져 타이머가 느려져도 정확히 넘어가게)
  function extend() {
    if (!A.playing || K() < 1) return;
    const now = A.ctx.currentTime, B = song.B, k = K();
    while (A.vs.length < 4) {
      const last = A.vs[A.vs.length - 1];
      if (!last || last.cut !== Infinity) break;
      let nx = null;
      for (let m = 0; m <= k; m++) {
        if (B[m] <= last.off + 0.05) continue;
        const t = target(m);
        if (t.to === m) { if (m === k) break; continue; }   // 그대로 이어지면 넘길 필요 없음
        nx = Object.assign({ m }, t); break;
      }
      if (!nx) break;
      const when = last.t0 + (B[nx.m] - last.off) - XF / 2;
      if (when < now + 0.02) break;
      last.g.gain.setValueAtTime(1, when); last.g.gain.linearRampToValueAtTime(0, when + XF); last.cut = when + XF;
      const v = voice(B[nx.to] - XF / 2, when, true);
      if (nx.wrap) { v.wrap = true; A.schedWraps++; }
      A.vs.push(v);
    }
  }
  // 설정이 바뀌면 지금 나오는 소리는 그대로 두고, 앞으로의 예약만 다시 짠다
  function resched() {
    if (!A.playing) { paint(); return; }
    const now = A.ctx.currentTime; let i = 0;
    for (let j = 0; j < A.vs.length; j++) if (A.vs[j].t0 <= now) i = j;
    const keep = A.vs[i];
    A.vs.splice(i + 1).forEach(kill);
    if (keep.cut !== Infinity && now < keep.cut - XF) { keep.g.gain.cancelScheduledValues(Math.max(now, keep.t0 + XF) + 0.001); keep.cut = Infinity; }
    A.schedWraps = A.passes + A.vs.filter(v => v.wrap && !v.counted).length;
    extend(); paint();
  }
  function play(from) {
    if (!A.buf) return;
    ensureCtx(); if (A.ctx.resume) A.ctx.resume().catch(() => {});
    let off = from == null ? A.pausedAt : from; if (off >= A.buf.duration - 0.2) off = 0;
    stopAll(); A.playing = true; A.schedWraps = A.passes;
    A.vs.push(voice(off, A.ctx.currentTime + 0.05, true));
    extend(); syncVideo(true); wake(true); paint();
  }
  function pause() { A.pausedAt = heard(); stopAll(); A.playing = false; syncVideo(false); wake(false); paint(); }
  function seek(t) { t = Math.max(0, Math.min(A.buf ? A.buf.duration - 0.1 : 0, t)); if (A.playing) play(t); else { A.pausedAt = t; try { vid.currentTime = t; } catch (e) {} paint(); } }
  function setLoop(on) { A.loop = on; resched(); }
  function tick() {
    if (A.deadline && Date.now() >= A.deadline) {
      A.deadline = 0; A.timerFired = true;
      if (A.playing) { A.loop = false; resched(); toast('타이머가 다 됐어요. 이번 절이 끝나면 후주로 마쳐요'); }
      else finishApp();
    }
    paintEndInfo();
    if (A.playing || PR.v) syncVideo(false);   // 화면 그리기가 멈춘 창(뒤에 숨은 창)에서도 영상이 따라가게
    if (!A.playing) return;
    const now = A.ctx.currentTime;
    for (const v of A.vs) if (v.wrap && !v.counted && v.t0 <= now) { v.counted = true; A.passes++; }
    while (A.vs.length > 1 && A.vs[0].cut < now - 0.05) kill(A.vs.shift());
    extend();
    if (A.vs.length === 1 && A.vs[0].cut === Infinity && posAt(now - lat()) >= A.buf.duration - 0.03) ended();
  }
  setInterval(tick, 50);
  function ended() {
    const auto = A.timerFired || (A.limit && A.loop && A.passes - A.cBase >= A.limit - 1);
    stopAll(); A.playing = false; A.pausedAt = 0; vid.pause(); wake(false);
    A.loop = true; A.passes = 0; A.timerFired = false;
    if (auto) A.limit = 0;
    paint();
    if (auto) finishApp(); else toast('끝났어요');
  }
  // 예약대로 마치면 앱 닫기(설치한 앱 창은 닫히고, 닫을 수 없는 곳은 안내만)
  function finishApp() {
    if (!ui.autoClose) { toast('예약한 대로 마쳤어요'); return; }
    if (FS.on()) FS.exit();
    $('#endOv').classList.remove('hidden'); $('#endMsg').textContent = '앱을 닫는 중이에요…';
    setTimeout(() => {
      if ($('#endOv').classList.contains('hidden')) return;
      try { window.close(); } catch (e) {}
      setTimeout(() => { $('#endMsg').textContent = '여기서는 앱을 저절로 닫을 수 없어요. 직접 닫아 주세요.'; }, 600);
    }, 2000);
  }
  $('#endStay').onclick = () => $('#endOv').classList.add('hidden');

  /* ---------- 영상 맞추기 ---------- */
  const vid = $('#vid');
  const PR = { win: null, v: null };   // 다른 모니터에 띄운 창
  function syncEl(el, force) {
    if (!el || !el.src || el.readyState < 1) return;
    const t = heard(), now = performance.now();
    if (A.playing) { if (el.paused) { const p = el.play(); if (p && p.catch) p.catch(() => {}); } }
    else if (!el.paused) el.pause();
    if ((force || Math.abs(el.currentTime - t) > (A.playing ? 0.3 : 0.05)) && now - (el._ls || 0) > 600) { el._ls = now; try { el.currentTime = t; } catch (e) {} }
  }
  // 이 창의 영상과 다른 모니터에 띄운 영상을 소리에 맞춘다
  function syncVideo(force) { syncEl(vid, force); if (PR.v) syncEl(PR.v, force); }

  /* ---------- 화면 ---------- */
  const pc = t => (A.buf ? t / A.buf.duration * 100 : 0) + '%';
  function renderSegs() {
    const d = A.buf ? A.buf.duration : 0, B = song.B, k = K();
    if (!d || k < 1) { $('#segs').innerHTML = ''; $('#barTicks').innerHTML = ''; $('#vselBox').classList.add('hidden'); return; }
    const L = order(), name = i => k === 1 && song.auto && song.auto.mode === 'none' ? '반복 구간' : (i + 1) + '절';
    let h = B[0] > 0.5 ? `<div class="seg" data-i="-1" style="left:0;width:${pc(B[0])}" title="전주">전주</div>` : '';
    for (let i = 0; i < k; i++) h += `<div class="seg verse${L.includes(i) ? '' : ' off'}" data-i="${i}" style="left:${pc(B[i])};width:${pc(B[i + 1] - B[i])}" title="${name(i)}부터 재생">${name(i)}</div>`;
    if (d - B[k] > 0.5) h += `<div class="seg" data-i="${k}" style="left:${pc(B[k])};width:${pc(d - B[k])}" title="후주">후주</div>`;
    $('#segs').innerHTML = h;
    $('#barTicks').innerHTML = B.map(t => `<div class="tick" style="left:${pc(t)}"></div>`).join('');
    $('#barLoop').style.left = pc(B[0]); $('#barLoop').style.width = pc(B[k] - B[0]);
    // 카세트 버튼: 전체 / 1절 / 2절 …
    $('#vselBox').classList.toggle('hidden', k < 2);
    $('#vsel').innerHTML = `<button data-v="all" class="${song.sel === 'all' ? 'on' : ''}">전체</button>` +
      [...Array(k).keys()].map(i => `<button data-v="${i}" class="${song.sel !== 'all' && song.sel.includes(i) ? 'on' : ''}">${i + 1}절</button>`).join('');
  }
  let lastCur = null;
  function paint() {
    const d = A.buf ? A.buf.duration : 0, p = heard(), k = K();
    if (d) $('#barHead').style.left = pc(p);
    $('#tNow').textContent = fmt(p); $('#tDur').textContent = fmt(d);
    const cv = verseAt(p);
    let st = '';
    if (A.buf && k >= 1) {
      if (cv < 0) st = '전주';
      else if (cv >= k) st = '후주';
      else st = (k > 1 ? (cv + 1) + '절 · ' : '') + (A.loop ? '🔁 ' + (A.limit ? (A.passes - A.cBase + 1) + '/' + A.limit : A.passes + 1) + '번째' : '마치고 후주로');
    }
    $('#tState').textContent = st;
    if (cv !== lastCur) { lastCur = cv; document.querySelectorAll('#segs .seg').forEach(s => s.classList.toggle('cur', +s.dataset.i === cv)); }
    $('#bPlay').textContent = A.playing ? '⏸' : '▶';
    const bl = $('#bLoop'); bl.classList.toggle('on', A.loop); bl.querySelector('small').textContent = A.loop ? '반복 중' : '반복 꺼짐';
    const f = $('#bFinish'); f.classList.toggle('done', !A.loop);
    f.textContent = A.loop ? '이번 절 끝나면 후주로 마치기' : (cv < k ? '후주로 마치는 중 · 누르면 다시 반복' : '다시 반복하기');
    if (k >= 1) { $('#vS').textContent = fmt(song.B[0], 2); $('#vE').textContent = fmt(song.B[k], 2); }
  }
  (function frame() { if (A.playing) { syncVideo(false); paint(); } else if (PR.v) syncVideo(false); requestAnimationFrame(frame); })();

  /* ---------- 마치기 예약 (타이머 · 반복 횟수 중 하나만) ---------- */
  $('#tmH').innerHTML = [...Array(6).keys()].map(h => `<option value="${h}">${h}</option>`).join('');
  $('#tmM').innerHTML = [...Array(60).keys()].map(m => `<option value="${m}">${String(m).padStart(2, '0')}</option>`).join('');
  $('#tmM').value = String(ui.tmM != null ? ui.tmM : 30); $('#tmH').value = String(ui.tmH || 0);
  $('#cnN').value = ui.cnN || 3;
  function showTab(t) {
    $('#tabTm').classList.toggle('on', t === 'tm'); $('#tabCn').classList.toggle('on', t === 'cn');
    $('#paneTm').classList.toggle('hidden', t !== 'tm'); $('#paneCn').classList.toggle('hidden', t !== 'cn');
  }
  $('#tabTm').onclick = () => showTab('tm'); $('#tabCn').onclick = () => showTab('cn');
  function setTimer(min) {
    A.deadline = min ? Date.now() + min * 60000 : 0; A.timerFired = false;
    if (min && A.limit) { A.limit = 0; resched(); }     // 둘 중 하나만
    paintEndInfo();
  }
  function setCount(n) {
    A.limit = n; A.cBase = A.passes;                     // 지금 돌고 있는 것이 1번째
    if (n) A.deadline = 0;
    resched(); paintEndInfo();
  }
  $('#tmGo').onclick = () => {
    const h = +$('#tmH').value, m = +$('#tmM').value, min = h * 60 + m;
    if (!min) { toast('시간을 정해 주세요'); return; }
    ui.tmH = h; ui.tmM = m; saveUi(); setTimer(min);
    toast(`${h ? h + '시간 ' : ''}${m ? m + '분 ' : ''}뒤에 후주로 마쳐요`);
  };
  const cnVal = d => { const v = Math.max(1, Math.min(999, Math.round(+$('#cnN').value || 1) + d)); $('#cnN').value = v; return v; };
  $('#cnMinus').onclick = () => cnVal(-1); $('#cnPlus').onclick = () => cnVal(1);
  $('#cnGo').onclick = () => { const n = cnVal(0); ui.cnN = n; saveUi(); setCount(n); toast(`${n}번 돌고 후주로 마쳐요`); };
  $('#autoClose').checked = ui.autoClose;
  $('#autoClose').onchange = e => { ui.autoClose = e.target.checked; saveUi(); paintEndInfo(); };
  $('#endCancel').onclick = () => { setTimer(0); setCount(0); toast('마치기 예약을 취소했어요'); };
  function paintEndInfo() {
    const on = A.deadline || A.limit, el = $('#endInfo');
    el.classList.toggle('hidden', !on); if (!on) return;
    let t;
    if (A.deadline) {
      const r = Math.max(0, Math.ceil((A.deadline - Date.now()) / 1000)), h = Math.floor(r / 3600);
      t = '⏰ ' + (h ? h + ':' + String(Math.floor(r % 3600 / 60)).padStart(2, '0') + ':' + String(r % 60).padStart(2, '0') : fmt(r)) + ' 남음';
    } else {
      const left = Math.max(0, A.limit - (A.passes - A.cBase + 1));
      t = '🔢 ' + Math.min(A.limit, A.passes - A.cBase + 1) + '/' + A.limit + '번째 · ' + (left ? '남은 ' + left + '번' : '이번이 마지막');
    }
    t += ui.autoClose ? ' → 후주 뒤 앱 닫기' : ' → 후주로 마침';
    const s = el.firstChild; if (s.textContent !== t) s.textContent = t;
  }

  /* ---------- 가사 화면에 맞추기 ----------
     소리는 되풀이되는 구간 안 어디서 넘겨도 똑같이 이어지지만, 영상(가사)은 절이 바뀔 때 화면이 넘어간다.
     1절→2절에서 화면이 크게 바뀌는 때를 찾아, 넘어가는 곳을 모두 그만큼 뒤로 옮긴다. */
  async function alignToVideo(r, url) {
    const B = r.bounds;
    if (r.mode !== 'verses' || !B || B.length < 3 || !r.runEnd) return 0;
    const maxD = r.runEnd - B[B.length - 1] - 0.3; if (maxD < 1) return 0;
    const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = url;
    try { await new Promise((ok, no) => { v.onloadeddata = ok; v.onerror = no; setTimeout(no, 8000); }); } catch (e) { return 0; }
    if (!v.videoWidth) return 0;
    const c = document.createElement('canvas'); c.width = 48; c.height = 27; const x = c.getContext('2d', { willReadFrequently: true });
    const grab = async t => {
      v.currentTime = t; await new Promise(ok => { v.onseeked = ok; setTimeout(ok, 1500); });
      x.drawImage(v, 0, 0, 48, 27); const d = x.getImageData(0, 0, 48, 27).data, g = new Float32Array(48 * 27);
      for (let i = 0; i < g.length; i++) g[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3; return g;
    };
    const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
    const T0 = B[1] - 0.5, n = Math.ceil((maxD + 0.5) / 0.25), ds = [];
    let prev = await grab(T0);
    for (let i = 1; i <= n; i++) { const t = T0 + i * 0.25, g = await grab(t); ds.push({ t, d: diff(g, prev) }); prev = g; }
    const med = ds.map(o => o.d).sort((a, b) => a - b)[ds.length >> 1], best = ds.reduce((a, b) => b.d > a.d ? b : a, ds[0]);
    if (!best || best.d < 6 || best.d < med * 4) return 0;      // 화면이 넘어가지 않는 영상(그림 한 장 등)
    let flip = best.t, a = await grab(best.t - 0.25);           // 0.05초 단위로 정확히
    for (let t = best.t - 0.2; t <= best.t + 1e-6; t += 0.05) { const g = await grab(t); if (diff(g, a) > best.d * 0.5) { flip = t; break; } a = g; }
    v.removeAttribute('src'); v.load();
    return Math.max(0, Math.min(maxD, flip - B[1]));
  }

  /* ---------- 파형으로 넘어가는 곳 맞추기 ----------
     위: 끝(여기서 넘어감) 주변, 아래: 시작(여기로 옴) 주변을 같은 시간 눈금으로 마주 보게 그린다.
     박자(뾰족한 곳)가 위아래로 같은 자리에 오면 자연스럽게 이어진다. 재생과 상관없이 맞출 수 있다. */
  const WIN = 3;   // 가운데 선 앞뒤 3초
  let wv = null;   // { env: 1/1000초마다 소리 크기, on: 박자, pe, po }
  function waveData() {
    if (wv && wv.buf === A.buf) return wv;
    const b = A.buf, sr = b.sampleRate, f = Math.round(sr / 1000), n = Math.floor(b.length / f), env = new Float32Array(n), chs = [];
    for (let c = 0; c < b.numberOfChannels; c++) chs.push(b.getChannelData(c));
    for (let i = 0; i < n; i++) { let m = 0; for (const d of chs) for (let j = i * f, e = j + f; j < e; j++) { const v = d[j] < 0 ? -d[j] : d[j]; if (v > m) m = v; } env[i] = m; }
    // 박자 그림용: 1/100초 소리 세기가 바로 앞 0.1초 평균보다 커지는 만큼(작은 떨림은 제곱으로 줄임)
    const m10 = Math.floor(n / 10), e10 = new Float32Array(m10), on = new Float32Array(n);
    for (let i = 0; i < m10; i++) { let q = 0; for (const d of chs) for (let j = i * 10 * f, e = j + 10 * f; j < e; j += 4) q += d[j] * d[j]; e10[i] = Math.sqrt(q); }
    for (let i = 10; i < m10; i++) { let p = 0; for (let j = i - 10; j < i; j++) p += e10[j]; const r = Math.max(0, e10[i] - p / 10 * 1.15); for (let j = i * 10; j < i * 10 + 10; j++) on[j] = r; }
    const q = (arr, p) => { const t = Array.from(arr.filter((_, i) => i % 7 === 0)).sort((x, y) => x - y); return t[Math.floor(t.length * p)] || 1; };
    wv = { buf: b, env, on, beat: window.HymnAnalyze.onsets(b), pe: q(env, 0.99), po: q(on, 0.995) };
    return wv;
  }
  function drawWave() {
    const cv = $('#wave'); if (!A.buf || K() < 1 || !$('#adj').open) return;
    const w = cv.clientWidth | 0, H = 150; if (!w) return;
    const dpr = window.devicePixelRatio || 1; cv.width = w * dpr; cv.height = H * dpr;
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, H);
    const W = waveData(), mid = H / 2, h = mid - 16;
    const strip = (c, dir, col, spike) => {
      for (let px = 0; px < w; px++) {
        const a = Math.floor((c - WIN + px / w * 2 * WIN) * 1000), b = Math.ceil((c - WIN + (px + 1) / w * 2 * WIN) * 1000);
        let m = 0, o = 0;
        for (let i = Math.max(0, a); i < Math.min(W.env.length, b); i++) { if (W.env[i] > m) m = W.env[i]; if (W.on[i] > o) o = W.on[i]; }
        const he = Math.min(1, m / W.pe) * h * 0.5, ho = Math.pow(Math.min(1, o / W.po), 1.6) * h;
        x.fillStyle = col + '33'; x.fillRect(px, dir < 0 ? mid - he : mid, 1, he);
        x.fillStyle = spike; x.fillRect(px, dir < 0 ? mid - ho : mid, 1, ho);
      }
    };
    strip(song.B[K()], -1, '#8f76ff', '#c9bbff');
    strip(song.B[0], 1, '#ff9f43', '#ffd29c');
    x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, mid, w, 1);
    for (let s = -WIN; s <= WIN + 1e-6; s += 0.5) { const px = Math.round((s + WIN) / (2 * WIN) * w); x.fillRect(px, mid - (s % 1 ? 3 : 6), 1, s % 1 ? 6 : 12); }
    x.fillStyle = '#ff4d4d'; x.fillRect(Math.round(w / 2) - 1, 0, 2, H);
  }
  // 파형을 손가락으로 끌어 옮기기: 위쪽은 끝, 아래쪽은 시작
  (function () {
    const cv = $('#wave'); let drag = null;
    cv.addEventListener('pointerdown', e => {
      if (!A.buf || K() < 1) return; const r = cv.getBoundingClientRect();
      drag = { idx: e.clientY - r.top < r.height / 2 ? K() : 0, x: e.clientX, v: song.B[e.clientY - r.top < r.height / 2 ? K() : 0], w: r.width };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', e => {
      if (!drag) return;
      const v = drag.v - (e.clientX - drag.x) / drag.w * 2 * WIN;   // 파형을 오른쪽으로 끌면 넘어가는 곳이 앞으로
      if (setPoint(drag.idx, v, true)) drawWave();
    });
    const end = () => { if (!drag) return; drag = null; pointChanged(); };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  })();
  function setPoint(idx, v, quiet) {
    const B = song.B, k = K();
    v = Math.round(Math.max(0, Math.min(A.buf.duration - 0.1, v)) * 1000) / 1000;
    if (idx === 0 && v > B[1] - 2) { if (!quiet) toast('시작은 다음 절보다 2초 이상 앞이어야 해요'); return false; }
    if (idx === k && v < B[k - 1] + 2) { if (!quiet) toast('끝은 마지막 절 시작보다 2초 이상 뒤여야 해요'); return false; }
    B[idx] = v; $('#vS').textContent = fmt(B[0], 2); $('#vE').textContent = fmt(B[k], 2); return true;
  }
  function pointChanged() { saveSong(); renderSegs(); lastCur = null; resched(); drawWave(); }
  $('#adj').addEventListener('toggle', () => setTimeout(drawWave, 0));
  window.addEventListener('resize', () => drawWave());
  $('#bSnap').onclick = () => {
    if (!A.buf || K() < 1) return;
    const W = waveData(), S = song.B[0], E = song.B[K()];
    const L = window.HymnAnalyze.localLag(W.beat, S - WIN, 2 * WIN, E - S, 0.4);
    if (setPoint(0, E - L)) { pointChanged(); toast(`시작을 ${(E - L - S >= 0 ? '+' : '') + (E - L - S).toFixed(2)}초 옮겨 박자를 맞췄어요`); }
  };

  function showHome() {
    if (A.playing) pause(); stopAll(); A.buf = null; closePresent();
    if (vid.src) { try { URL.revokeObjectURL(vid.src); } catch (e) {} vid.removeAttribute('src'); vid.load(); }
    $('#player').classList.add('hidden'); $('#home').classList.remove('hidden'); $('#hBack').classList.add('hidden');
    renderLib(); paintInstall();
  }
  function renderLib() {
    DB.all().then(list => {
      list = (list || []).sort((a, b) => (b.used || b.added) - (a.used || a.added));
      $('#libTitle').classList.toggle('hidden', !list.length);
      $('#lib').innerHTML = list.map(r => `<li><div class="nm" data-id="${esc(r.id)}">${esc(r.name.replace(/\.[^.]+$/, ''))}<small>${(r.size / 1048576).toFixed(1)}MB${LS.get('hl.song.' + r.id) ? ' · 구간 저장됨' : ''}</small></div><button class="del" data-del="${esc(r.id)}" aria-label="지우기">✕</button></li>`).join('');
    }).catch(() => { $('#libTitle').classList.add('hidden'); });
  }
  $('#lib').addEventListener('click', e => {
    const n = e.target.closest('[data-id]'), d = e.target.closest('[data-del]');
    if (n) DB.get(n.dataset.id).then(r => { if (r) { r.used = Date.now(); DB.put(r).catch(() => {}); openSong(r.blob, r.id, r.name); } }).catch(() => toast('불러오지 못했어요'));
    if (d) {
      const id = d.dataset.del, name = d.parentNode.querySelector('.nm').firstChild.textContent;
      modal(`<h3>반주 지우기</h3><p class="msg">"${esc(name)}"을(를) 이 기기에서 지울까요?</p>`, [{ label: '취소', val: false }, { label: '지우기', val: true, cls: 'pri' }])
        .then(ok => { if (ok) DB.del(id).then(() => { LS.del('hl.song.' + id); renderLib(); toast('지웠어요'); }); });
    }
  });

  /* ---------- 반주 열기 ---------- */
  function saveSong() { if (song.id) LS.set('hl.song.' + song.id, { B: song.B, v: 2 }); }
  function autoBounds(r, dur) {
    const B = r.mode === 'none' ? [r.info.musicStart, r.info.musicEnd] : (r.bounds || [r.loopStart, r.loopEnd]).slice();
    B[B.length - 1] = Math.max(B[0] + 2, Math.min(dur - 0.1, B[B.length - 1]));   // 못 찾으면 곡 전체 반복
    return B;
  }
  function autoText() {
    const r = song.auto; if (!r) return '';
    if (r.mode === 'none') return '같은 반주가 되풀이되는 곳을 찾지 못해서 지금은 곡 전체를 반복해요(1절만 있는 반주에서 그럴 수 있어요).\n재생하면서 1절이 시작될 때 시작의 "지금 위치", 후주가 시작될 때 끝의 "지금 위치"를 누르면 돼요. 한 번 정하면 기억해요.';
    const intro = r.introEnd != null ? r.introEnd : r.loopStart;
    return `자동 인식: 전주 ${fmt(intro, 1)}까지 · 한 절 ${r.period.toFixed(1)}초` + (r.verses > 1 ? ` × ${r.verses}절` : '') + ` · 후주 ${fmt(r.loopEnd, 1)}부터` + (r.videoShift ? `
넘어가는 곳을 가사 화면이 바뀌는 때에 맞췄어요(${r.videoShift.toFixed(1)}초 뒤로).` : '') +
      `\n끝에서 시작으로 넘어가는 소리가 어색하면 0.1초씩 맞춰 보세요.`;
  }
  async function openSong(blob, id, name) {
    song.id = id; song.name = name; song.sel = 'all'; song.B = [];
    $('#home').classList.add('hidden'); $('#player').classList.remove('hidden'); $('#hBack').classList.remove('hidden');
    $('#songName').textContent = name.replace(/\.[^.]+$/, ''); paintInstall();
    $('#busy').classList.remove('hidden'); $('#busyMsg').textContent = '소리 불러오는 중…';
    A.buf = null; A.pausedAt = 0; A.loop = true; A.passes = 0; A.limit = 0; stopAll(); A.playing = false;
    A.cBase = 0; renderSegs(); paintEndInfo();
    song.blob = blob; vid.src = URL.createObjectURL(blob);
    if (PR.v) PR.v.src = vid.src;
    try {
      const ab = await blob.arrayBuffer();
      ensureCtx();
      const buf = await new Promise((ok, no) => { const p = A.ctx.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); });
      if (song.id !== id) return;
      $('#busyMsg').textContent = '전주·후주 찾는 중…';
      await new Promise(r => setTimeout(r, 30));
      A.buf = buf;
      const r = window.HymnAnalyze.analyze(buf);
      $('#busyMsg').textContent = '가사 화면 맞추는 중…';
      const dv = await alignToVideo(r, vid.src);
      if (song.id !== id) return;
      if (dv > 0) { r.videoShift = dv; r.bounds = r.bounds.map(t => t + dv); r.introEnd = r.bounds[0]; r.loopStart += dv; r.loopEnd += dv; }
      song.auto = r; song.B = autoBounds(r, buf.duration);
      const saved0 = LS.get('hl.song.' + id), saved = saved0 && saved0.v === 2 ? saved0 : null;
      if (saved && saved.v === 2 && saved.B && saved.B.length === song.B.length) song.B = saved.B.slice();   // 예전 방식으로 저장한 구간은 버림
      $('#autoInfo').textContent = autoText();
      if (r.mode === 'none' && !saved) { $('#adj').open = true; toast('반복 구간을 자동으로 찾지 못했어요. 직접 정해 주세요'); }
      else toast(saved ? '저장해 둔 반복 구간으로 준비했어요' : '전주와 후주를 찾았어요. ▶을 누르세요');
    } catch (e) {
      $('#busy').classList.add('hidden');
      modal('<h3>소리를 읽지 못했어요</h3><p class="msg">이 파일의 소리 형식은 이 브라우저에서 열 수 없어요. mp4(AAC) 영상이나 mp3 파일로 다시 해 보세요.</p>', [{ label: '알겠어요', val: 1, cls: 'pri' }]).then(showHome);
      return;
    }
    $('#busy').classList.add('hidden');
    lastCur = null; renderSegs(); paint(); drawWave(); renderSave(); paintPresent();
  }
  function pickFile(f) {
    if (!f) return;
    const id = f.name + '|' + f.size;
    DB.put({ id, name: f.name, size: f.size, added: Date.now(), used: Date.now(), blob: f }).catch(() => toast('기기에 저장하지는 못했어요(공간 부족). 지금은 재생할 수 있어요'));
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    openSong(f, id, f.name);
  }
  $('#file').onchange = e => { pickFile(e.target.files[0]); e.target.value = ''; };
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => pickFile(e.dataTransfer.files[0]));

  /* ---------- 조작 ---------- */
  $('#bPlay').onclick = () => { if (!A.buf) return; A.playing ? pause() : play(); };
  $('#bRestart').onclick = () => { if (!A.buf) return; A.loop = true; A.passes = 0; A.cBase = 0; A.timerFired = false; play(0); };
  $('#bLoop').onclick = () => setLoop(!A.loop);
  $('#bFinish').onclick = () => {
    if (!A.loop) { setLoop(true); toast('다시 계속 반복해요'); }
    else { setLoop(false); toast('이번 절이 끝나면 후주로 마쳐요'); }
  };
  $('#hBack').onclick = showHome;
  const bar = $('#bar');
  bar.addEventListener('pointerdown', e => { if (!A.buf) return; const r = bar.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * A.buf.duration); });
  // 절 이름을 누르면 그 절 처음으로
  $('#segs').addEventListener('click', e => {
    const s = e.target.closest('.seg'); if (!s || !A.buf) return;
    const i = +s.dataset.i; seek(i < 0 ? 0 : song.B[i]); if (!A.playing) play();
  });
  // 카세트 버튼: 전체를 누르면 나머지는 올라오고, 절 버튼은 하나씩 눌렀다 뺐다
  $('#vsel').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.v === 'all') song.sel = 'all';
    else {
      const i = +b.dataset.v; let s = song.sel === 'all' ? [] : song.sel.slice();
      s = s.includes(i) ? s.filter(x => x !== i) : s.concat(i);
      song.sel = s.length && s.length < K() ? s : 'all';
    }
    renderSegs(); lastCur = null; resched();
    toast(song.sel === 'all' ? '모든 절을 차례로 재생해요' : order().map(i => i + 1).join('·') + '절만 재생해요');
  });
  document.querySelectorAll('.nudge button').forEach(b => b.onclick = () => {
    if (!A.buf || K() < 1) return;
    const idx = b.dataset.p === 'S' ? 0 : K();
    const v = b.hasAttribute('data-now') ? heard() : song.B[idx] + parseFloat(b.dataset.d);
    if (setPoint(idx, v)) pointChanged();
  });
  $('#bPreview').onclick = () => { if (!A.buf || K() < 1) return; A.loop = true; play(Math.max(0, song.B[K()] - 4)); toast('끝 4초 전부터 들어 봐요'); };
  $('#bReauto').onclick = () => { if (!A.buf || !song.auto) return; LS.del('hl.song.' + song.id); song.B = autoBounds(song.auto, A.buf.duration); $('#autoInfo').textContent = autoText(); renderSegs(); lastCur = null; resched(); drawWave(); toast('자동으로 찾은 구간으로 되돌렸어요'); };
  $('#vol').value = ui.vol;
  $('#vol').oninput = e => { ui.vol = +e.target.value; saveUi(); if (A.master) A.master.gain.value = ui.vol; };
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,dialog')) return;
    if (e.code === 'Space' && A.buf) { e.preventDefault(); A.playing ? pause() : play(); }
  });

  /* ---------- 다른 모니터에 띄우기 (PPT 발표자 보기처럼) ----------
     고른 모니터에 영상만 있는 창을 따로 띄우고, 이 창에서 조작한다. 띄운 창의 영상은 소리 없이 이 창의 소리에 맞춰 따라간다. */
  const PRESENT_HTML = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>반주 반복기 · 화면</title><style>' +
    'html,body{margin:0;height:100%;background:#000;overflow:hidden}video{width:100%;height:100%;object-fit:contain;display:block}' +
    '#hint{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:rgba(0,0,0,.75);color:#fff;font:20px system-ui,"Malgun Gothic",sans-serif;padding:14px 22px;border-radius:14px;transition:opacity .6s;white-space:nowrap}' +
    'body.idle{cursor:none}body.idle #hint{opacity:0}</style></head><body><video playsinline muted></video>' +
    '<div id="hint">화면을 두 번 누르면 전체화면 · 조작은 원래 창에서 해요</div></body></html>';
  const isDesktop = () => !/Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  async function presentPick() {
    if (PR.win && !PR.win.closed) { closePresent(); return; }
    if (!A.buf) { toast('먼저 반주를 열어 주세요'); return; }
    let screens = null, cur = null;
    if ('getScreenDetails' in window) { try { const d = await window.getScreenDetails(); screens = d.screens; cur = d.currentScreen; } catch (e) {} }
    if (screens && screens.length > 1) {
      const btns = screens.map((s, i) => ({ label: `${s.label || '모니터 ' + (i + 1)}${s.isPrimary ? ' (주 모니터)' : ''}${s === cur ? ' · 지금 화면' : ''} · ${s.width}×${s.height}`, val: i, cls: s === cur ? '' : 'pri' }));
      const pick = await modal('<h3>어느 모니터에 띄울까요?</h3><p class="msg">고른 모니터에 영상만 크게 띄우고, 이 창에서 조작해요.</p>', btns.concat([{ label: '취소', val: -1 }]));
      if (pick == null || pick < 0) return;
      openPresent(screens[pick]);
    } else {
      // 권한을 묻느라 누른 효과가 사라졌을 수 있어, 한 번 더 눌러서 창을 연다(팝업 차단 방지)
      const ok = await modal(`<h3>영상 화면 띄우기</h3><p class="msg">${screens ? '연결된 모니터가 하나만 보여요.' : '이 브라우저는 모니터를 고를 수 없어요.'} 새 창을 띄우면, 그 창을 원하는 모니터로 끌어 놓고 두 번 누르세요(전체화면).</p>`, [{ label: '취소', val: false }, { label: '창 띄우기', val: true, cls: 'pri' }]);
      if (ok) openPresent(null, screens ? 'one' : 'noapi');
    }
  }
  function openPresent(s, why) {
    const f = s ? `popup,fullscreen,left=${s.left},top=${s.top},width=${s.width},height=${s.height}` : 'popup,width=960,height=560';
    let w = null; try { w = window.open('', 'hl-present', f); } catch (e) {}
    if (!w) { modal('<h3>창을 열지 못했어요</h3><p class="msg">브라우저가 새 창(팝업)을 막았어요. 주소창 오른쪽의 팝업 차단 표시를 눌러 "항상 허용"으로 바꾼 뒤 다시 눌러 주세요.</p>', [{ label: '알겠어요', val: 1, cls: 'pri' }]); return; }
    const doc = w.document; doc.open(); doc.write(PRESENT_HTML); doc.close();
    if (s) { try { w.moveTo(s.left, s.top); w.resizeTo(s.width, s.height); } catch (e) {} }
    const v = doc.querySelector('video'); v.muted = true; v.src = vid.src;
    PR.win = w; PR.v = v;
    const fs = () => { const d = doc.documentElement; if (doc.fullscreenElement) doc.exitFullscreen().catch(() => {}); else { const r = d.requestFullscreen(s ? { screen: s, navigationUI: 'hide' } : { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); } };
    doc.addEventListener('dblclick', fs);
    let idle; const wake2 = () => { doc.body.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(() => doc.body.classList.add('idle'), 3000); };
    doc.addEventListener('mousemove', wake2); wake2();
    w.addEventListener('keydown', e => { if (e.code === 'Space' && A.buf) { e.preventDefault(); A.playing ? pause() : play(); } });
    // 창이 열리자마자 전체화면 시도(되는 브라우저만). 안 되면 두 번 누르기 안내
    try { const r = doc.documentElement.requestFullscreen(s ? { screen: s } : undefined); if (r && r.catch) r.catch(() => {}); } catch (e) {}
    v.addEventListener('loadedmetadata', () => syncVideo(true));
    paintPresent();
    if (why === 'one') toast('모니터가 하나만 보여요. 창을 원하는 모니터로 끌어 놓고 두 번 누르면 전체화면이에요');
    else if (why === 'noapi') toast('띄운 창을 원하는 모니터로 끌어 놓고, 두 번 누르면 전체화면이에요');
    else toast('고른 모니터에 띄웠어요. 전체화면이 아니면 그 화면을 두 번 누르세요');
    try { window.focus(); } catch (e) {}
  }
  function closePresent() { try { if (PR.win && !PR.win.closed) PR.win.close(); } catch (e) {} PR.win = null; PR.v = null; paintPresent(); }
  function paintPresent() {
    const on = !!(PR.win && !PR.win.closed), b = $('#bPresent');
    b.classList.toggle('hidden', !isDesktop()); b.classList.toggle('on', on);
    b.textContent = on ? '🖥 띄운 화면 닫기' : '🖥 다른 모니터에 띄우기';
  }
  $('#bPresent').onclick = presentPick;
  setInterval(() => { if (PR.win && PR.win.closed) { PR.win = null; PR.v = null; paintPresent(); } }, 1000);
  window.addEventListener('pagehide', () => { try { if (PR.win) PR.win.close(); } catch (e) {} });

  /* ---------- 저장하기 ----------
     🎬 mp4: 고른 부분(전주·절·후주)을 정한 번만큼 이어 붙인 영상 파일. TV·USB·휴대폰 어디서나 그냥 재생된다.
     ♾ 무한 반복 파일: 영상과 반복 구간을 html 파일 하나에 담아, 열고 ▶ 한 번 누르면 끝없이 반복된다. */
  const SV = { tab: 'mp4', verses: null, job: null };
  const svOrder = () => SV.verses && SV.verses.length ? SV.verses.slice().sort((a, b) => a - b) : [...Array(Math.max(0, K())).keys()];
  const svRep = () => Math.max(1, Math.min(99, Math.round(+$('#svRep').value || 1)));
  function planSegs(rep) {
    const B = song.B, k = K(), d = A.buf.duration, out = [];
    if ($('#svIntro').checked && B[0] > 0.05) out.push([0, B[0]]);
    for (let r = 0; r < rep; r++) for (const j of svOrder()) out.push([B[j], B[j + 1]]);
    if ($('#svOutro').checked && d - B[k] > 0.05) out.push([B[k], d]);
    const m = []; for (const g of out) { const p = m[m.length - 1]; if (p && Math.abs(p[1] - g[0]) < 1e-9) p[1] = g[1]; else m.push(g.slice()); }
    return m;
  }
  function renderSave() {
    if (!A.buf || K() < 1) return;
    const k = K(), mp4 = SV.tab === 'mp4';
    if (SV.verses && SV.verses.some(i => i >= k)) SV.verses = null;
    $('#tabMp4').classList.toggle('on', mp4); $('#tabHtml').classList.toggle('on', !mp4);
    $('#svVerses').innerHTML = [...Array(k).keys()].map(i => `<button data-i="${i}" class="${svOrder().includes(i) ? 'on' : ''}">${k === 1 ? '반복 구간' : (i + 1) + '절'}</button>`).join('');
    $('#svRepRow').classList.toggle('hidden', !mp4);
    $('#svIntroL').textContent = mp4 ? '전주 넣기' : '처음 한 번 전주부터';
    $('#svOutroL').textContent = mp4 ? '후주 넣기' : '마칠 때 후주까지';
    const len = planSegs(mp4 ? svRep() : 1).reduce((s, g) => s + g[1] - g[0], 0);
    $('#svSum').textContent = mp4
      ? `만들 영상 길이 ${fmt(len)} · 크기 약 ${Math.max(1, Math.round(len * (vid.videoWidth ? 0.4 : 0.17) / 8))}MB. 크롬·엣지에서 만들 수 있어요(길이만큼 시간이 조금 걸려요).`
      : `파일 하나(약 ${Math.max(1, Math.round(song.blob.size * 1.37 / 1048576))}MB)만 USB·카카오톡 등으로 옮기면, 인터넷 없이 아무 컴퓨터에서나 열고 ▶을 한 번 누르면 고른 절이 끝없이 반복돼요. 마칠 때는 "마치기"를 누르면 돼요.`;
    $('#svGo').textContent = mp4 ? '🎬 mp4 만들기' : '♾ 무한 반복 파일 만들기';
  }
  $('#tabMp4').onclick = () => { SV.tab = 'mp4'; renderSave(); };
  $('#tabHtml').onclick = () => { SV.tab = 'html'; renderSave(); };
  $('#svVerses').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const i = +b.dataset.i;
    let s = svOrder(); s = s.includes(i) ? s.filter(x => x !== i) : s.concat(i);
    if (!s.length) { toast('한 절은 넣어야 해요'); return; }
    SV.verses = s.length === K() ? null : s; renderSave();
  });
  $('#svRepM').onclick = () => { $('#svRep').value = Math.max(1, svRep() - 1); renderSave(); };
  $('#svRepP').onclick = () => { $('#svRep').value = Math.min(99, svRep() + 1); renderSave(); };
  ['svRep', 'svIntro', 'svOutro'].forEach(id => $('#' + id).addEventListener('input', renderSave));
  $('#saveSet').addEventListener('toggle', renderSave);
  function setJob(msg, frac) {
    const on = msg != null; $('#svProg').classList.toggle('hidden', !on); $('#svGo').disabled = on;
    if (on) { $('#svProg span').textContent = msg; $('#svProg i').style.width = Math.round((frac || 0) * 100) + '%'; }
  }
  $('#svCancel').onclick = () => { if (SV.job) SV.job.cancel = true; };
  $('#svGo').onclick = () => { if (!A.buf || SV.job) return; (SV.tab === 'mp4' ? makeMp4 : makeLoopFile)(); };
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }
  const baseName = () => song.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_');
  function loadMB() {
    if (window.Mediabunny) return Promise.resolve();
    return new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'vendor/mediabunny.min.js'; s.onload = ok; s.onerror = () => no(new Error('라이브러리를 불러오지 못했어요')); document.head.appendChild(s); });
  }
  // 소리: 1초씩 잘라 넣고, 이어 붙인 곳은 0.012초 동안 앞 소리에서 새 소리로 부드럽게 바꾼다
  async function addAudio(asrc, a, b, prevEnd, job) {
    const buf = A.buf, sr = buf.sampleRate, ch = buf.numberOfChannels, src = [];
    for (let c = 0; c < ch; c++) src.push(buf.getChannelData(c));
    const s0 = Math.round(a * sr), s1 = Math.round(b * sr), XFn = Math.round(0.012 * sr), p0 = prevEnd != null ? Math.round(prevEnd * sr) : -1;
    for (let st = s0; st < s1; st += sr) {
      if (job.cancel) throw new Error('cancel');
      const n = Math.min(sr, s1 - st), ab = new AudioBuffer({ length: n, numberOfChannels: ch, sampleRate: sr });
      for (let c = 0; c < ch; c++) {
        const o = ab.getChannelData(c), d = src[c]; o.set(d.subarray(st, st + n));
        if (p0 >= 0) for (let i = 0; i < n && st - s0 + i < XFn; i++) { const r = st - s0 + i, w = r / XFn, q = p0 + r; o[i] = o[i] * w + (q < d.length ? d[q] : 0) * (1 - w); }
      }
      await asrc.add(ab);
    }
  }
  async function makeMp4() {
    const hasV = !!vid.videoWidth, ext = hasV ? 'mp4' : 'm4a', rep = svRep(), segs = planSegs(rep);
    const fname = `${baseName()} (${svOrder().length === K() ? '' : svOrder().map(i => i + 1).join('·') + '절 '}${rep}번 반복).${ext}`;
    const total = segs.reduce((s, g) => s + g[1] - g[0], 0);
    let handle = null, writable = null, output = null;
    // 크롬·엣지는 저장할 곳을 먼저 고르고 곧바로 파일에 써서, 긴 영상도 메모리를 적게 쓴다
    if (window.showSaveFilePicker) {
      try { handle = await window.showSaveFilePicker({ suggestedName: fname, types: [{ description: hasV ? 'MP4 영상' : 'M4A 소리', accept: { [hasV ? 'video/mp4' : 'audio/mp4']: ['.' + ext] } }] }); }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const job = SV.job = { cancel: false };
    setJob('준비하는 중…', 0);
    try {
      await loadMB(); const MB = window.Mediabunny;
      const input = new MB.Input({ source: new MB.BlobSource(song.blob), formats: MB.ALL_FORMATS });
      const vt = hasV ? await input.getPrimaryVideoTrack() : null;
      const vcodec = vt ? await MB.getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width: vt.displayWidth, height: vt.displayHeight }) : null;
      const acodec = await MB.getFirstEncodableAudioCodec(['aac', 'opus'], { numberOfChannels: A.buf.numberOfChannels, sampleRate: A.buf.sampleRate });
      if ((vt && !vcodec) || !acodec) throw new Error('이 브라우저에서는 영상을 만들 수 없어요. PC의 크롬이나 엣지에서 해 주세요.');
      if (handle) writable = await handle.createWritable();
      const target = writable ? new MB.StreamTarget(writable) : new MB.BufferTarget();
      output = new MB.Output({ format: new MB.Mp4OutputFormat({ fastStart: writable ? false : 'in-memory' }), target });
      const vsrc = vt ? new MB.VideoSampleSource({ codec: vcodec, bitrate: MB.QUALITY_MEDIUM, keyFrameInterval: 2 }) : null;
      if (vsrc) output.addVideoTrack(vsrc);
      const asrc = new MB.AudioBufferSource({ codec: acodec, bitrate: 160000 });
      output.addAudioTrack(asrc);
      await output.start();
      const sink = vt ? new MB.VideoSampleSink(vt) : null;
      let outT = 0;
      for (let i = 0; i < segs.length; i++) {
        const [a, b] = segs[i];
        if (sink) {
          let last = -1;
          for await (const s of sink.samples(a, b)) {
            if (job.cancel) { s.close(); throw new Error('cancel'); }
            const ts = outT + Math.max(0, s.timestamp - a);
            if (s.timestamp >= b || ts <= last + 1e-4) { s.close(); continue; }
            s.setTimestamp(ts); last = ts;
            await vsrc.add(s); s.close();
            setJob(`만드는 중… ${fmt(ts)} / ${fmt(total)}`, ts / total);
          }
        }
        await addAudio(asrc, a, b, i > 0 ? segs[i - 1][1] : null, job);
        outT += b - a;
        setJob(`만드는 중… ${fmt(outT)} / ${fmt(total)}`, outT / total);
      }
      setJob('마무리하는 중…', 1);
      await output.finalize();
      if (!writable) download(new Blob([target.buffer], { type: hasV ? 'video/mp4' : 'audio/mp4' }), fname);
      toast(writable ? `"${handle.name}"으로 저장했어요` : '다 만들었어요. 받은 파일(다운로드)에 있어요');
    } catch (e) {
      try { if (output) await output.cancel(); } catch (x) {}
      try { if (writable) await writable.abort(); } catch (x) {}
      if (e && e.message === 'cancel') toast('만들기를 취소했어요');
      else modal(`<h3>영상을 만들지 못했어요</h3><p class="msg">${esc((e && e.message) || e)}</p>`, [{ label: '알겠어요', val: 1, cls: 'pri' }]);
    } finally { SV.job = null; setJob(null); }
  }
  async function makeLoopFile() {
    const job = SV.job = { cancel: false };
    setJob('파일 만드는 중…', 0.3);
    try {
      const data = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsDataURL(song.blob); });
      if (job.cancel) throw new Error('cancel');
      const cfg = { name: baseName(), B: song.B, order: svOrder(), intro: $('#svIntro').checked, outro: $('#svOutro').checked, vol: ui.vol };
      const html = window.HymnLoopFile(cfg, data);
      download(new Blob([html], { type: 'text/html' }), `${cfg.name} (무한 반복).html`);
      toast('다 만들었어요. 받은 파일(다운로드)에 있어요');
    } catch (e) {
      if (e && e.message === 'cancel') toast('만들기를 취소했어요');
      else modal(`<h3>파일을 만들지 못했어요</h3><p class="msg">${esc((e && e.message) || e)}</p>`, [{ label: '알겠어요', val: 1, cls: 'pri' }]);
    } finally { SV.job = null; setJob(null); }
  }

  /* ---------- 화면 꺼짐 막기 ---------- */
  let lock = null;
  function wake(on) {
    if (on) { if (!lock && navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { lock = l; l.addEventListener('release', () => { lock = null; }); }).catch(() => {}); }
    else if (lock) { lock.release().catch(() => {}); lock = null; }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && A.playing) wake(true); });

  /* ---------- 홈 화면 설치 · 전체화면 ---------- */
  // 크롬은 브라우저 전체화면(Fullscreen API)도 display-mode: fullscreen 으로 알려 주므로, 처음 열렸을 때 값으로 판단
  const BOOT_STANDALONE = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: minimal-ui)').matches || navigator.standalone === true;
  function isStandalone() {
    if (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) return true;
    if (document.fullscreenElement || document.webkitFullscreenElement) return BOOT_STANDALONE;
    return BOOT_STANDALONE || matchMedia('(display-mode: fullscreen)').matches;
  }
  let inFrame = false; try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
  const SVG = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const ICON = {
    fsOn: SVG('M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'), fsOff: SVG('M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'), inst: SVG('M12 4v11M7 10l5 5 5-5M5 20h14'),
    set: SVG('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'),
    back: SVG('M15 18l-6-6 6-6')
  };
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
  window.addEventListener('appinstalled', () => { installEvt = null; ui.installDismissed = true; saveUi(); paintInstall(); toast('홈 화면에 설치했어요'); });
  function paintInstall() {
    const sa = isStandalone(), home = !$('#home').classList.contains('hidden');
    $('#banner').classList.toggle('hidden', sa || inFrame || ui.installDismissed || !home);
    $('#bFs').classList.toggle('hidden', !FS.supported());
    $('#hInst').classList.toggle('hidden', sa); $('#homeInst').classList.toggle('hidden', sa);
    const h = $('#hFS'); h.classList.toggle('hidden', sa); h.innerHTML = FS.on() ? ICON.fsOff : ICON.fsOn;
    h.setAttribute('aria-label', FS.on() ? '전체화면 끝내기' : '전체화면'); h.title = h.getAttribute('aria-label');
  }
  function installSheet() {
    if (isStandalone()) { toast('이미 홈 화면 앱으로 실행 중이에요'); return; }
    if (installEvt) {   // 바로 설치 창 띄우기
      const ev = installEvt; installEvt = null;
      try { ev.prompt(); ev.userChoice.then(r => { if (r && r.outcome === 'accepted') { ui.installDismissed = true; saveUi(); } paintInstall(); }).catch(() => {}); } catch (e) {}
      return;
    }
    const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const samsung = /SamsungBrowser/i.test(ua), inapp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(ua), mobile = /Android|Mobi/i.test(ua) || ios;
    const kbd = t => `<span class="kbd">${t}</span>`;
    let how;
    if (location.protocol === 'file:') how = '<p class="msg">지금은 파일로 열려 있어서 설치할 수 없어요. 아래 주소로 열어 주세요.\n<b>immanueladmin1985-dev.github.io/my-apps/hymn-loop/</b></p>';
    else if (inapp) how = `<ol><li>${kbd('⋮')} 메뉴를 누르세요</li><li><b>다른 브라우저로 열기</b>(크롬·사파리)를 누르세요</li><li>열린 화면에서 다시 <b>설치하기</b>를 누르세요</li></ol>`;
    else if (ios) how = `<ol><li>사파리의 ${kbd('공유 ⬆')} 단추를 누르세요</li><li>메뉴를 올려 <b>홈 화면에 추가</b>를 누르세요</li><li>오른쪽 위 <b>추가</b>를 누르세요</li></ol>`;
    else if (samsung) how = `<ol><li>아래 ${kbd('≡')} 메뉴를 누르세요</li><li><b>현재 페이지 추가</b> → <b>홈 화면</b>을 누르세요</li></ol>`;
    else if (mobile) how = `<ol><li>오른쪽 위 ${kbd('⋮')} 메뉴를 누르세요</li><li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누르세요</li><li>뜨는 창에서 <b>설치</b>를 누르세요</li></ol>`;
    else how = `<ol><li>크롬·엣지 주소창 오른쪽의 ${kbd('설치 ⊕')} 아이콘을 누르세요</li><li>없으면 ${kbd('⋮')} 메뉴 → <b>앱 설치</b>(또는 <b>앱</b> → <b>이 사이트를 앱으로 설치</b>)를 누르세요</li></ol>`;
    modal(`<h3>홈 화면에 설치하기</h3><p class="msg">설치하면 아이콘으로 바로 열리고, 주소창 없이 화면을 넓게 쓸 수 있어요. 인터넷이 안 되는 곳에서도 열려요.</p>${how}`, [{ label: '알겠어요', val: true, cls: 'pri' }]);
  }
  function settings() {
    const fsOk = FS.supported(), sa = isStandalone();
    modal(`<h3>설정</h3>
      ${fsOk ? `<label class="set"><span>자동 전체화면<br><small class="note">화면을 처음 누르면 전체화면으로</small></span><input id="sAutoFS" type="checkbox" ${ui.autoFS ? 'checked' : ''}></label>
      <div class="set"><span>전체화면</span><button id="sFS">${FS.on() ? '전체화면 끝내기' : '전체화면 켜기'}</button></div>` : ''}
      ${sa ? '' : '<div class="set"><span>홈 화면 앱</span><button id="sInst">홈 화면에 설치하기</button></div>'}
      <p class="note">쓰는 법: 반주를 열고 ▶을 누르면 전주 → 1절 → … → 마지막 절이 끝나기 직전에 다시 1절로 넘어가 계속 반복해요. 마칠 때는 "후주로 마치기"를 누르면 그 절이 끝나고 후주가 나와요.</p>`,
    [{ label: '닫기', val: 1, cls: 'pri' }]);
    const a = $('#sAutoFS'); if (a) a.onchange = () => { ui.autoFS = a.checked; saveUi(); };
    const f = $('#sFS'); if (f) f.onclick = () => { $('#dlg').close(); FS.toggle(); };
    const i = $('#sInst'); if (i) i.onclick = () => { $('#dlg').close(); setTimeout(installSheet, 50); };
  }
  $('#hFS').onclick = FS.toggle; $('#hInst').onclick = installSheet; $('#homeInst').onclick = installSheet;
  $('#hInst').innerHTML = ICON.inst; $('#hSet').innerHTML = ICON.set; $('#hSet').onclick = settings; $('#hBack').innerHTML = ICON.back;
  $('#bInst').onclick = installSheet; $('#bFs').onclick = FS.toggle;
  $('#bLater').onclick = () => { ui.installDismissed = true; saveUi(); paintInstall(); toast('위쪽 ⬇ 단추나 설정에서 언제든 설치할 수 있어요'); };
  // 자동 전체화면: 화면을 처음 누를 때 (버튼으로 직접 끈 뒤에는 다시 켜지 않음)
  document.addEventListener('click', e => {
    if (!ui.autoFS || FS.userExit || FS.on() || !FS.supported()) return;
    if (e.target.closest && e.target.closest('#hFS,#hInst,#banner,dialog,#homeInst,#drop')) return;
    FS.enter();
  }, true);
  const onFs = () => paintInstall();
  document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
  if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

  paintInstall(); renderLib(); paint();
  window.__hl = { A, song, pos, heard, play, pause, setLoop, pickFile, setTimer, setCount, resched }; // 점검용
})();
