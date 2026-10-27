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
  const ui = Object.assign({ autoFS: true, installDismissed: false, vol: 1 }, LS.get('hl.ui', {}));
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
    return m + ':' + (dec ? s.toFixed(1).padStart(4, '0') : String(Math.floor(s)).padStart(2, '0'));
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
  const A = { ctx: null, master: null, buf: null, vs: [], playing: false, pausedAt: 0, loop: true, passes: 0 };
  const song = { id: null, name: '', S: 0, E: 0, auto: null };

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
  const loopOk = () => song.E - song.S >= 2;
  // 앞으로 넘어갈 곳 2번까지 미리 예약(화면이 꺼져 타이머가 느려져도 정확히 넘어가게)
  function extend() {
    if (!A.playing || !A.loop || !loopOk()) return;
    const now = A.ctx.currentTime;
    while (A.vs.length < 3) {
      const last = A.vs[A.vs.length - 1];
      if (!last || last.cut !== Infinity || last.off >= song.E) break;
      const when = last.t0 + (song.E - last.off) - XF / 2;
      if (when < now + 0.02) break;
      last.g.gain.setValueAtTime(1, when); last.g.gain.linearRampToValueAtTime(0, when + XF); last.cut = when + XF;
      A.vs.push(voice(song.S - XF / 2, when, true));
    }
  }
  function curIdx() { const now = A.ctx.currentTime; let i = 0; for (let k = 0; k < A.vs.length; k++) if (A.vs[k].t0 <= now) i = k; return i; }
  function pos() {
    if (!A.playing || !A.vs.length) return A.pausedAt;
    const v = A.vs[curIdx()]; return Math.min(A.buf.duration, v.off + Math.max(0, A.ctx.currentTime - v.t0));
  }
  function play(from) {
    if (!A.buf) return;
    ensureCtx(); if (A.ctx.resume) A.ctx.resume().catch(() => {});
    let off = from == null ? A.pausedAt : from; if (off >= A.buf.duration - 0.2) off = 0;
    stopAll(); A.playing = true;
    A.vs.push(voice(off, A.ctx.currentTime + 0.05, true));
    extend(); syncVideo(true); wake(true); paint();
  }
  function pause() { A.pausedAt = pos(); stopAll(); A.playing = false; vid.pause(); wake(false); paint(); }
  function seek(t) { t = Math.max(0, Math.min(A.buf ? A.buf.duration - 0.1 : 0, t)); if (A.playing) play(t); else { A.pausedAt = t; try { vid.currentTime = t; } catch (e) {} paint(); } }
  function setLoop(on) {
    A.loop = on;
    if (A.playing) {
      if (on) extend();
      else {
        const now = A.ctx.currentTime; let i = curIdx(); const c = A.vs[i];
        if (c.cut !== Infinity && now >= c.cut - XF) i++; // 이미 넘어가는 중이면 그다음부터 끊는다
        const keep = A.vs[i];
        A.vs.splice(i + 1).forEach(kill);
        if (keep && keep.cut !== Infinity) { keep.g.gain.cancelScheduledValues(0); keep.g.gain.setValueAtTime(1, Math.max(now, keep.t0 + XF)); keep.cut = Infinity; }
      }
    }
    paint();
  }
  // 구간을 바꾸면 예약한 것을 다시 짠다
  function rescheduled() { saveSong(); if (A.playing) play(pos()); else paint(); }
  function tick() {
    if (A.playing) {
      const now = A.ctx.currentTime;
      while (A.vs.length > 1 && A.vs[0].cut < now - 0.05) { kill(A.vs.shift()); A.passes++; }
      extend();
      if (A.vs.length === 1 && A.vs[0].cut === Infinity && pos() >= A.buf.duration - 0.03) {
        stopAll(); A.playing = false; A.pausedAt = 0; A.loop = true; A.passes = 0; vid.pause(); wake(false);
        paint(); toast('끝났어요');
      }
    }
  }
  setInterval(tick, 50);

  /* ---------- 영상 맞추기 ---------- */
  const vid = $('#vid'); let lastSeek = 0;
  function syncVideo(force) {
    if (!vid.src || vid.readyState < 1) return;
    const t = pos();
    if (A.playing) {
      if (vid.paused) { const p = vid.play(); if (p && p.catch) p.catch(() => {}); }
      const now = performance.now();
      if ((force || Math.abs(vid.currentTime - t) > 0.3) && now - lastSeek > 600) { lastSeek = now; try { vid.currentTime = t; } catch (e) {} }
    } else if (!vid.paused) vid.pause();
  }

  /* ---------- 화면 ---------- */
  function paint() {
    const d = A.buf ? A.buf.duration : 0, p = pos();
    if (d) {
      $('#barHead').style.left = (p / d * 100) + '%';
      $('#barLoop').style.left = (song.S / d * 100) + '%';
      $('#barLoop').style.width = (Math.max(0, song.E - song.S) / d * 100) + '%';
    }
    $('#tNow').textContent = fmt(p); $('#tDur').textContent = fmt(d);
    let st = '';
    if (A.buf) {
      if (p < song.S) st = '전주';
      else if (p >= song.E || !A.loop) st = p >= song.E ? '후주' : '마치는 중 → 후주';
      else st = '🔁 ' + (A.passes + 1) + '번째';
    }
    $('#tState').textContent = st;
    $('#bPlay').textContent = A.playing ? '⏸' : '▶';
    const bl = $('#bLoop'); bl.classList.toggle('on', A.loop); bl.querySelector('small').textContent = A.loop ? '반복 중' : '반복 꺼짐';
    const f = $('#bFinish'); f.classList.toggle('done', !A.loop);
    f.textContent = A.loop ? '이번 절 끝나면 후주로 마치기' : (p < song.E ? '후주로 마치는 중 · 누르면 다시 반복' : '다시 반복하기');
    $('#vS').textContent = fmt(song.S, 1); $('#vE').textContent = fmt(song.E, 1);
  }
  (function frame() { if (A.playing) { syncVideo(false); paint(); } requestAnimationFrame(frame); })();

  function showHome() {
    if (A.playing) pause(); stopAll(); A.buf = null;
    if (vid.src) { try { URL.revokeObjectURL(vid.src); } catch (e) {} vid.removeAttribute('src'); vid.load(); }
    $('#player').classList.add('hidden'); $('#home').classList.remove('hidden'); $('#hBack').classList.add('hidden');
    $('#hTitle').textContent = '🎵 반주 반복기';
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
  function saveSong() { if (song.id) LS.set('hl.song.' + song.id, { S: song.S, E: song.E }); }
  function applyAuto(r, dur) {
    song.auto = r;
    if (r.mode === 'none') { song.S = r.info.musicStart; song.E = Math.max(song.S + 2, Math.min(dur - 0.1, r.info.musicEnd)); } // 못 찾으면 곡 전체 반복
    else { song.S = r.loopStart; song.E = Math.min(r.loopEnd, dur - 0.1); }
  }
  function autoText() {
    const r = song.auto; if (!r) return '';
    if (r.mode === 'none') return '같은 반주가 되풀이되는 곳을 찾지 못해서 지금은 곡 전체를 반복해요(1절만 있는 반주에서 그럴 수 있어요).\n재생하면서 1절이 시작될 때 시작의 "지금 위치", 후주가 시작될 때 끝의 "지금 위치"를 누르면 돼요. 한 번 정하면 기억해요.';
    const intro = r.introEnd != null ? r.introEnd : r.loopStart;
    return `자동 인식: 전주 ${fmt(intro, 1)}까지 · 한 절 ${r.period.toFixed(1)}초` + (r.verses > 1 ? ` × ${r.verses}절` : '') + ` · 후주 ${fmt(r.loopEnd, 1)}부터` +
      `\n끝에서 시작으로 넘어가는 소리가 어색하면 0.1초씩 맞춰 보세요.`;
  }
  async function openSong(blob, id, name) {
    song.id = id; song.name = name;
    $('#home').classList.add('hidden'); $('#player').classList.remove('hidden'); $('#hBack').classList.remove('hidden');
    $('#songName').textContent = name.replace(/\.[^.]+$/, ''); paintInstall();
    $('#busy').classList.remove('hidden'); $('#busyMsg').textContent = '소리 불러오는 중…';
    A.buf = null; A.pausedAt = 0; A.loop = true; A.passes = 0; stopAll(); A.playing = false;
    vid.src = URL.createObjectURL(blob);
    try {
      const ab = await blob.arrayBuffer();
      ensureCtx();
      const buf = await new Promise((ok, no) => { const p = A.ctx.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); });
      if (song.id !== id) return;
      $('#busyMsg').textContent = '전주·후주 찾는 중…';
      await new Promise(r => setTimeout(r, 30));
      A.buf = buf;
      const r = window.HymnAnalyze.analyze(buf);
      applyAuto(r, buf.duration);
      const saved = LS.get('hl.song.' + id);
      if (saved && saved.E > saved.S) { song.S = saved.S; song.E = saved.E; }
      $('#autoInfo').textContent = autoText();
      if (r.mode === 'none' && !saved) { $('#adj').open = true; toast('반복 구간을 자동으로 찾지 못했어요. 직접 정해 주세요'); }
      else toast(saved ? '저장해 둔 반복 구간으로 준비했어요' : '전주와 후주를 찾았어요. ▶을 누르세요');
    } catch (e) {
      $('#busy').classList.add('hidden');
      modal('<h3>소리를 읽지 못했어요</h3><p class="msg">이 파일의 소리 형식은 이 브라우저에서 열 수 없어요. mp4(AAC) 영상이나 mp3 파일로 다시 해 보세요.</p>', [{ label: '알겠어요', val: 1, cls: 'pri' }]).then(showHome);
      return;
    }
    $('#busy').classList.add('hidden');
    paint();
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
  $('#bRestart').onclick = () => { if (!A.buf) return; A.loop = true; A.passes = 0; play(0); };
  $('#bLoop').onclick = () => setLoop(!A.loop);
  $('#bFinish').onclick = () => {
    if (!A.loop) { setLoop(true); toast('다시 계속 반복해요'); }
    else { setLoop(false); toast('이번 절이 끝나면 후주로 마쳐요'); }
  };
  $('#hBack').onclick = showHome;
  const bar = $('#bar');
  const barSeek = e => { if (!A.buf) return; const r = bar.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * A.buf.duration); };
  bar.addEventListener('pointerdown', e => { bar.setPointerCapture(e.pointerId); barSeek(e); });
  document.querySelectorAll('.nudge button').forEach(b => b.onclick = () => {
    if (!A.buf) return; const k = b.dataset.p, d = A.buf.duration;
    let v = b.hasAttribute('data-now') ? pos() : song[k] + parseFloat(b.dataset.d);
    v = Math.max(0, Math.min(d - 0.1, v));
    if (k === 'S' && v > song.E - 2) { toast('시작은 끝보다 2초 이상 앞이어야 해요'); return; }
    if (k === 'E' && v < song.S + 2) { toast('끝은 시작보다 2초 이상 뒤여야 해요'); return; }
    song[k] = v; rescheduled();
  });
  $('#bPreview').onclick = () => { if (!A.buf) return; A.loop = true; play(Math.max(0, song.E - 4)); toast('끝 4초 전부터 들어 봐요'); };
  $('#bReauto').onclick = () => { if (!A.buf || !song.auto) return; LS.del('hl.song.' + song.id); applyAuto(song.auto, A.buf.duration); $('#autoInfo').textContent = autoText(); rescheduled(); toast('자동으로 찾은 구간으로 되돌렸어요'); };
  $('#vol').value = ui.vol;
  $('#vol').oninput = e => { ui.vol = +e.target.value; saveUi(); if (A.master) A.master.gain.value = ui.vol; };
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,dialog')) return;
    if (e.code === 'Space' && A.buf) { e.preventDefault(); A.playing ? pause() : play(); }
  });

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
  window.__hl = { A, song, pos, play, pause, setLoop, pickFile }; // 점검용
})();
