'use strict';
/* 쇼츠 만들기 — 핸드폰 영상을 핸드폰 안에서 교회 쇼츠 모양(PC 예배 준비 도우미의 브루 템플릿)으로 만들어 저장
   PC와 파일을 주고받지 않음 (용량 걱정 없음). 영상을 실제 길이만큼 재생하면서 1080×1920 캔버스에 그려 녹화합니다.
   모양: 진청 배경 #004d65 · 위 띠 0~271(검정 50%) 잘난체 제목 · 영상 271~1442 · 오른쪽 위 교회 이름 · 아래 띠 1442~1920(검정 50%) 마루부리 설교자 */
const Shorts = (() => {
  const W = 1080, H = 1920, TOP = 271, FOOT = 1442, BG = '#004d65', MAXLEN = 180;
  const KEY = 'worshipRemote.shorts';
  const O = Object.assign({ church: '대한예수교장로회\n임마누엘교회', foot: '설교 : 홍사현 담임목사', zoom: 1, px: 0.5, py: 0.4 }, (() => { try{ return JSON.parse(localStorage.getItem(KEY) || '{}'); }catch(e){ return {}; } })());
  const save = () => { try{ localStorage.setItem(KEY, JSON.stringify({ church: O.church, foot: O.foot, zoom: O.zoom, px: O.px, py: O.py })); }catch(e){} };
  const X = { file: null, url: '', dur: 0, a: 0, b: 0, title: '', busy: false, out: null, stop: false };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tm = s => { s = Math.max(0, s || 0); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };

  /* ---------- 글꼴 (PC와 같은 것: 공개 배포처에서 읽음. 못 읽으면 기본 굵은 글꼴) ---------- */
  let fontsP = null;
  function fonts(){
    if (fontsP) return fontsP;
    const L = [['WRJalnan', 'https://cdn.jsdelivr.net/npm/@noonnu/yg-jalnan@0.1.0/fonts/yg-jalnan-normal.woff'], ['WRMaru', 'https://cdn.jsdelivr.net/npm/@kfonts/maruburi-otf@0.1.0/src/MaruBuri-Bold.otf'], ['WRPretendard', 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf']];
    fontsP = Promise.all(L.map(([n, u]) => new FontFace(n, `url(${u})`).load().then(f => { document.fonts.add(f); return true; }).catch(() => false)));
    return fontsP;
  }
  const F = { title: '"WRJalnan", "Black Han Sans", sans-serif', church: '"WRPretendard", sans-serif', foot: '"WRMaru", serif' };

  /* ---------- 그리기 ---------- */
  function wrap(g, text, maxW){
    const out = [];
    for (const para of String(text || '').split('\n')){
      const words = para.split(/\s+/).filter(Boolean); let line = '';
      for (const w of words){ const t = line ? line + ' ' + w : w; if (g.measureText(t).width <= maxW || !line) line = t; else { out.push(line); line = w; } }
      if (line) out.push(line);
    }
    return out;
  }
  function fitTitle(g, text){   // 위 띠(271px) 안에 두 줄까지: 82px부터 54px까지 줄여 봄
    for (let sz = 82; sz >= 54; sz -= 2){ g.font = `${sz}px ${F.title}`; const L = wrap(g, text, 960); if (L.length <= 2 && L.every(l => g.measureText(l).width <= 980)) return { sz, L }; }
    g.font = `54px ${F.title}`; return { sz: 54, L: wrap(g, text, 960).slice(0, 3) };
  }
  function outlined(g, text, x, y, lw){ if (lw){ g.lineWidth = lw; g.lineJoin = 'round'; g.strokeStyle = '#000'; g.strokeText(text, x, y); } g.fillText(text, x, y); }
  function draw(g, v, opt){
    g.fillStyle = BG; g.fillRect(0, 0, W, H);
    // 영상: 271~1442 칸을 꽉 채우게(cover) · 확대 · 위치
    if (v && v.videoWidth){
      const bw = W, bh = FOOT - TOP, s = Math.max(bw / v.videoWidth, bh / v.videoHeight) * opt.zoom;
      const dw = v.videoWidth * s, dh = v.videoHeight * s;
      g.save(); g.beginPath(); g.rect(0, TOP, bw, bh); g.clip();
      g.drawImage(v, (bw - dw) * opt.px, TOP + (bh - dh) * opt.py, dw, dh); g.restore();
    }
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, W, TOP); g.fillRect(0, FOOT, W, H - FOOT);
    g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#fff';
    // 제목 (위 띠 가운데)
    if (opt.title){
      const t = fitTitle(g, opt.title), lh = t.sz * 1.18, total = lh * t.L.length;
      g.font = `${t.sz}px ${F.title}`; let y = Math.max(20, (TOP - total) / 2 + 4);
      for (const l of t.L){ outlined(g, l, W / 2, y, 12); y += lh; }
    }
    // 교회 이름 (오른쪽 위, 영상 위)
    const ch = String(opt.church || '').split('\n').map(s => s.trim()).filter(Boolean);
    let y = TOP + 11;
    ch.forEach((l, i) => { const sz = ch.length > 1 && i === ch.length - 1 ? 52 : 38; g.font = `bold ${sz}px ${F.church}`; outlined(g, l, 946, y, 6); y += sz * 1.22; });
    // 아래 줄 (설교자)
    const ft = String(opt.foot || '').split('\n').map(s => s.trim()).filter(Boolean);
    g.fillStyle = '#e6e6e6'; y = FOOT + 28;
    ft.forEach(l => { g.font = `78px ${F.foot}`; outlined(g, l, W / 2, y, 0); y += 78 * 1.25; });
  }

  /* ---------- 화면 ---------- */
  function html(){
    return `<div id="sh-root">
      <div class="card"><h2>쇼츠 만들기</h2>
        <div class="dim">핸드폰 영상을 골라 제목을 쓰면 PC 쇼츠와 같은 모양(세로, 위에 제목, 아래 설교자)으로 만들어 핸드폰에 저장합니다. PC 없이 됩니다. 쇼츠는 3분까지입니다.</div>
        <label class="btn pri wide" style="margin-top:12px"><input type="file" accept="video/*" id="sh-file" hidden>${X.file ? '다른 영상 고르기' : '영상 고르기'}</label>
      </div>
      <div id="sh-edit" class="${X.file ? '' : 'hidden'}">
        <div class="card">
          <canvas id="sh-cv" width="${W}" height="${H}" class="sh-cv"></canvas>
          <video id="sh-v" playsinline muted preload="auto" class="hidden"></video>
          <div class="row" style="margin-top:10px;align-items:center"><button class="btn sm" id="sh-play">▶ 미리 보기</button><span class="dim" id="sh-pos"></span></div>
        </div>
        <div class="card"><h2>구간 <span class="dim" id="sh-len"></span></h2>
          <label class="sh-l">시작 <b id="sh-at">0:00</b><input type="range" id="sh-a" min="0" step="0.1"></label>
          <label class="sh-l">끝 <b id="sh-bt">0:00</b><input type="range" id="sh-b" min="0" step="0.1"></label>
        </div>
        <div class="card"><h2>글</h2>
          <label class="sh-l">제목 (위 띠, 두 줄까지 저절로 줄여 맞춤)<input type="text" id="sh-title" maxlength="60" value="${esc(X.title)}" placeholder="예: 기도는 대화입니다"></label>
          <label class="sh-l">교회 이름 (오른쪽 위 · 줄바꿈 가능)<textarea id="sh-church" rows="2">${esc(O.church)}</textarea></label>
          <label class="sh-l">아래 줄<textarea id="sh-foot" rows="1">${esc(O.foot)}</textarea></label>
        </div>
        <div class="card"><h2>영상 자리</h2>
          <label class="sh-l">확대 <input type="range" id="sh-zoom" min="1" max="2.5" step="0.05" value="${O.zoom}"></label>
          <label class="sh-l">좌우 <input type="range" id="sh-px" min="0" max="1" step="0.01" value="${O.px}"></label>
          <label class="sh-l">위아래 <input type="range" id="sh-py" min="0" max="1" step="0.01" value="${O.py}"></label>
        </div>
        <div class="card">
          <button class="btn pri wide" id="sh-go">쇼츠 만들기</button>
          <div id="sh-prog" class="hidden"><div class="bar" style="margin-top:12px"><i id="sh-bar" style="width:0%"></i></div><div class="dim" id="sh-ptxt" style="margin-top:6px"></div><button class="btn sm" id="sh-stop" style="margin-top:8px">그만두기</button></div>
          <div id="sh-done" class="hidden" style="margin-top:12px"></div>
          <div class="dim" style="margin-top:10px">만드는 동안 영상 길이만큼 걸립니다. 화면을 켜 둔 채 이 화면에 머물러 주세요 (다른 앱으로 가면 멈춥니다).</div>
        </div>
      </div>
    </div>`;
  }
  let toastFn = m => alert(m);
  function mount(root, toast){
    toastFn = toast || toastFn;
    const $ = s => root.querySelector(s);
    const v = $('#sh-v'), cv = $('#sh-cv'), g = cv.getContext('2d');
    const opt = () => ({ title: X.title, church: O.church, foot: O.foot, zoom: +O.zoom, px: +O.px, py: +O.py });
    const paint = () => { if (!X.busy) draw(g, v, opt()); };
    fonts().then(paint);
    const seekPaint = t => { v.currentTime = Math.max(0, Math.min(X.dur, t)); };
    v.addEventListener('seeked', paint); v.addEventListener('loadeddata', paint);
    const ui = () => {
      const a = $('#sh-a'), b = $('#sh-b');
      a.max = b.max = X.dur.toFixed(1); a.value = X.a; b.value = X.b;
      $('#sh-at').textContent = tm(X.a); $('#sh-bt').textContent = tm(X.b);
      const L = X.b - X.a; $('#sh-len').textContent = `${tm(L)}${L > MAXLEN ? ' · 3분이 넘어 쇼츠가 안 됩니다' : ''}`;
      $('#sh-len').style.color = L > MAXLEN ? '#fca5a5' : '';
    };
    const load = file => {
      if (X.url) URL.revokeObjectURL(X.url);
      X.file = file; X.url = URL.createObjectURL(file); X.out = null;
      if (!X.title) X.title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60);
      root.innerHTML = html(); mount(root, toastFn);
    };
    $('#sh-file').onchange = e => { const f = e.target.files && e.target.files[0]; if (f) load(f); };
    if (!X.file) return;
    v.src = X.url;
    v.addEventListener('loadedmetadata', async () => {
      if (!isFinite(v.duration)){   // 길이 정보가 없는 영상: 끝으로 한 번 가 봐서 길이를 알아냄
        await new Promise(ok => { const f = () => { if (isFinite(v.duration)){ v.removeEventListener('durationchange', f); ok(); } }; v.addEventListener('durationchange', f); v.currentTime = 1e9; setTimeout(ok, 4000); });
      }
      X.dur = isFinite(v.duration) ? v.duration : 0;
      if (!(X.b > X.a) || X.b > X.dur){ X.a = 0; X.b = Math.min(X.dur, MAXLEN); }
      ui(); seekPaint(X.a + 0.05);
    }, { once: true });
    $('#sh-a').oninput = e => { X.a = Math.min(+e.target.value, X.b - 0.5); ui(); seekPaint(X.a); };
    $('#sh-b').oninput = e => { X.b = Math.max(+e.target.value, X.a + 0.5); ui(); seekPaint(X.b); };
    $('#sh-title').oninput = e => { X.title = e.target.value; paint(); };
    $('#sh-church').oninput = e => { O.church = e.target.value; save(); paint(); };
    $('#sh-foot').oninput = e => { O.foot = e.target.value; save(); paint(); };
    ['zoom', 'px', 'py'].forEach(k => { $('#sh-' + k).oninput = e => { O[k] = +e.target.value; save(); paint(); }; });
    // 미리 보기: 소리 없이 구간을 재생하며 그림
    let raf = 0;
    $('#sh-play').onclick = () => {
      if (!v.paused){ v.pause(); cancelAnimationFrame(raf); $('#sh-play').textContent = '▶ 미리 보기'; return; }
      if (v.currentTime < X.a || v.currentTime >= X.b) v.currentTime = X.a;
      v.play().catch(() => {}); $('#sh-play').textContent = '⏸ 멈춤';
      const loop = () => { paint(); $('#sh-pos').textContent = tm(v.currentTime - X.a) + ' / ' + tm(X.b - X.a); if (v.currentTime >= X.b){ v.pause(); $('#sh-play').textContent = '▶ 미리 보기'; return; } if (!v.paused) raf = requestAnimationFrame(loop); };
      loop();
    };
    $('#sh-go').onclick = () => make(root);
    if (X.out) showDone(root);
  }

  /* ---------- 만들기: 재생하며 캔버스에 그리고 녹화 ---------- */
  function pickType(){
    const C = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return C.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
  }
  async function make(root){
    const $ = s => root.querySelector(s);
    if (X.busy) return;
    if (!X.title.trim()) return toastFn('제목을 써 주세요.', 'warn');
    if (X.b - X.a > MAXLEN) return toastFn('구간이 3분을 넘습니다. 끝을 앞으로 당겨 주세요.', 'warn');
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return toastFn('이 브라우저에서는 영상을 만들 수 없습니다. 크롬으로 열어 주세요.', 'err');
    const type = pickType(); if (!type) return toastFn('이 브라우저에서는 영상을 저장할 수 없습니다. 크롬으로 열어 주세요.', 'err');
    await fonts();
    X.busy = true; X.stop = false; X.out = null;
    const pv = $('#sh-v'); pv.pause();
    $('#sh-go').disabled = true; $('#sh-prog').classList.remove('hidden'); $('#sh-done').classList.add('hidden');
    let wake = null; try{ wake = await navigator.wakeLock.request('screen'); }catch(e){}
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const v = document.createElement('video'); v.src = X.url; v.playsInline = true; v.preload = 'auto';
    const shown = $('#sh-cv').getContext('2d');
    let actx = null, rec = null;
    try{
      await new Promise((ok, no) => { v.onloadedmetadata = ok; v.onerror = () => no(new Error('영상을 읽지 못했습니다.')); });
      // 소리: 스피커로 내보내지 않고 녹화로만
      const tracks = [...cv.captureStream(30).getVideoTracks()];
      try{
        actx = new (window.AudioContext || window.webkitAudioContext)();
        const src = actx.createMediaElementSource(v), dst = actx.createMediaStreamDestination(); src.connect(dst);
        tracks.push(...dst.stream.getAudioTracks());
      }catch(e){ console.warn('소리', e); }
      v.currentTime = X.a; await new Promise(ok => { v.onseeked = ok; });
      draw(g, v, { title: X.title, church: O.church, foot: O.foot, zoom: +O.zoom, px: +O.px, py: +O.py });
      const chunks = [];
      rec = new MediaRecorder(new MediaStream(tracks), { mimeType: type, videoBitsPerSecond: 8e6, audioBitsPerSecond: 160e3 });
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      const stopped = new Promise(ok => { rec.onstop = ok; });
      if (actx && actx.state === 'suspended') await actx.resume().catch(() => {});
      rec.start(1000);
      await v.play();
      const o = { title: X.title, church: O.church, foot: O.foot, zoom: +O.zoom, px: +O.px, py: +O.py }, len = X.b - X.a;
      await new Promise(done => {
        let fin = false;
        const end = () => { if (fin) return; fin = true; clearInterval(iv); done(); };
        v.onended = end;
        const iv = setInterval(() => { if (X.stop || v.ended || v.currentTime >= X.b) end(); }, 200);   // 끝나면 새 프레임 신호가 오지 않으므로 따로 살핌
        const step = () => {
          if (fin) return;
          draw(g, v, o);
          shown.drawImage(cv, 0, 0);
          const t = v.currentTime - X.a, pct = Math.min(100, t / len * 100);
          $('#sh-bar').style.width = pct.toFixed(1) + '%'; $('#sh-ptxt').textContent = `만드는 중 ${tm(t)} / ${tm(len)}`;
          if (X.stop || v.ended || v.currentTime >= X.b) return end();
          if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(step); else requestAnimationFrame(step);
        };
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(step); else requestAnimationFrame(step);
        v.onpause = () => { if (!X.stop && !v.ended && v.currentTime < X.b - 0.2) setTimeout(() => v.play().catch(() => {}), 100); };   // 잠깐 멈추면 다시
      });
      v.onpause = null; v.pause(); rec.stop(); await stopped;
      if (X.stop) throw new Error('그만뒀습니다.');
      const mt = type.split(';')[0], ext = mt === 'video/mp4' ? 'mp4' : 'webm';
      const name = X.title.trim().replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 60) + '.' + ext;
      X.out = new File(chunks, name, { type: mt });
      showDone(root);
      toastFn('쇼츠를 만들었습니다. 저장하거나 유튜브로 보내세요.', 'ok');
    }catch(e){ toastFn(e.message || String(e), X.stop ? 'info' : 'err'); }
    finally{
      try{ if (rec && rec.state !== 'inactive') rec.stop(); }catch(e){}
      try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){}
      try{ actx && actx.close(); }catch(e){}
      try{ wake && wake.release(); }catch(e){}
      X.busy = false; const go = $('#sh-go'); if (go) go.disabled = false; const p = $('#sh-prog'); if (p) p.classList.add('hidden');
      draw(shown, pv, { title: X.title, church: O.church, foot: O.foot, zoom: +O.zoom, px: +O.px, py: +O.py });
    }
  }
  function showDone(root){
    const box = root.querySelector('#sh-done'); if (!box || !X.out) return;
    const mb = (X.out.size / 1e6).toFixed(1), canShare = navigator.canShare && navigator.canShare({ files: [X.out] });
    const url = URL.createObjectURL(X.out);
    box.classList.remove('hidden');
    box.innerHTML = `<div class="dim">${esc(X.out.name)} · ${mb}MB</div>
      <video src="${url}" controls playsinline class="sh-out"></video>
      <div class="row" style="margin-top:8px"><a class="btn pri" href="${url}" download="${esc(X.out.name)}">핸드폰에 저장</a>${canShare ? '<button class="btn" id="sh-share">유튜브 앱 등으로 보내기</button>' : ''}</div>
      <div class="dim" style="margin-top:6px">저장하면 '다운로드' 폴더(갤러리)에 들어갑니다. 유튜브 앱에서 [+] → 쇼츠 → 그 영상을 고르면 됩니다.</div>`;
    const sh = box.querySelector('#sh-share'); if (sh) sh.onclick = () => navigator.share({ files: [X.out], title: X.title }).catch(() => {});
  }
  return { html, mount, stop(){ X.stop = true; }, get busy(){ return X.busy; } };
})();
