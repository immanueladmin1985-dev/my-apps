/* "무한 반복 파일" 만들기: 영상과 반복 구간을 html 파일 하나에 담는다.
   그 파일을 열고 ▶을 한 번 누르면(브라우저가 소리를 내려면 한 번 눌러야 함) 고른 절이 끝없이 이어진다. */
(function () {
  'use strict';

  // 만들어진 파일 안에서 돌아가는 재생기. toString() 으로 파일에 그대로 들어가므로 바깥 변수를 쓰지 않는다.
  function player(CFG, DATA) {
    const XF = 0.03, $ = s => document.querySelector(s);
    const v = $('#v'), B = CFG.B, K = B.length - 1, L = CFG.order.slice().sort((a, b) => a - b);
    let ctx = null, master = null, buf = null, vs = [], playing = false, loop = true, pausedAt = 0, passes = 0, stopAt = 0, lock = null, lastSeek = 0;
    const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

    (async () => {
      try {
        const ab = await (await fetch(DATA)).arrayBuffer();
        v.src = URL.createObjectURL(new Blob([ab], { type: 'video/mp4' }));
        const C = window.AudioContext || window.webkitAudioContext; ctx = new C();
        master = ctx.createGain(); master.gain.value = CFG.vol || 1; master.connect(ctx.destination);
        buf = await new Promise((ok, no) => { const p = ctx.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); });
        $('#go').disabled = false; $('#go').textContent = '▶ 시작'; $('#sub').textContent = '누르면 전체화면으로 바뀌고 끝없이 반복돼요';
        try { v.currentTime = CFG.intro ? 0 : B[L[0]]; } catch (e) {}
      } catch (e) { $('#sub').textContent = '이 브라우저에서 열 수 없어요. 크롬이나 엣지로 열어 주세요.'; }
    })();

    const lat = () => Math.max(0, (ctx.outputLatency || 0) + (ctx.baseLatency || 0));
    function voice(off, when, fade) {
      const s = ctx.createBufferSource(); s.buffer = buf; const g = ctx.createGain(); s.connect(g); g.connect(master);
      if (fade) { g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(1, when + XF); }
      s.start(when, Math.max(0, off)); return { s, g, t0: when, off, cut: Infinity };
    }
    function kill(x) { try { x.s.stop(); } catch (e) {} try { x.s.disconnect(); x.g.disconnect(); } catch (e) {} }
    function posAt(t) { if (!playing || !vs.length) return pausedAt; let x = vs[0]; for (const y of vs) if (y.t0 <= t) x = y; return Math.max(0, Math.min(buf.duration, x.off + (t - x.t0))); }
    const heard = () => playing ? posAt(ctx.currentTime - lat()) : pausedAt;
    function target(m) {
      if (m === 0) return { to: L[0] };
      if (!loop) return { to: K };
      const nx = L.find(j => j >= m); if (nx != null) return { to: nx };
      return { to: L[0], wrap: true };
    }
    function extend() {
      if (!playing || stopAt) return;
      const now = ctx.currentTime;
      while (vs.length < 4) {
        const last = vs[vs.length - 1]; if (!last || last.cut !== Infinity) break;
        let nx = null;
        for (let m = 0; m <= K; m++) {
          if (B[m] <= last.off + 0.05) continue;
          const t = target(m);
          if (t.to === K && !CFG.outro) { nx = { m, stop: true }; break; }   // 후주 없이 마치기
          if (t.to === m) { if (m === K) break; continue; }
          nx = Object.assign({ m }, t); break;
        }
        if (!nx) break;
        const when = last.t0 + (B[nx.m] - last.off) - XF / 2; if (when < now + 0.02) break;
        if (nx.stop) { last.g.gain.setValueAtTime(1, when); last.g.gain.linearRampToValueAtTime(0, when + 0.4); last.cut = when + 0.4; stopAt = when + 0.4; break; }
        last.g.gain.setValueAtTime(1, when); last.g.gain.linearRampToValueAtTime(0, when + XF); last.cut = when + XF;
        const y = voice(B[nx.to] - XF / 2, when, true); if (nx.wrap) y.wrap = true; vs.push(y);
      }
    }
    function resched() {
      if (!playing) return paint();
      const now = ctx.currentTime; let i = 0; for (let j = 0; j < vs.length; j++) if (vs[j].t0 <= now) i = j;
      const keep = vs[i]; vs.splice(i + 1).forEach(kill); stopAt = 0;
      if (keep.cut !== Infinity && now < keep.cut - XF) { keep.g.gain.cancelScheduledValues(Math.max(now, keep.t0 + XF) + 0.001); keep.cut = Infinity; }
      extend(); paint();
    }
    function play(from) {
      if (!buf) return; if (ctx.resume) ctx.resume().catch(() => {});
      let off = from == null ? pausedAt : from; if (off >= buf.duration - 0.2) off = CFG.intro ? 0 : B[L[0]];
      vs.forEach(kill); vs = []; stopAt = 0; playing = true; vs.push(voice(off, ctx.currentTime + 0.05, true)); extend();
      wake(true); sync(true); paint();
    }
    function pause() { pausedAt = heard(); vs.forEach(kill); vs = []; playing = false; stopAt = 0; v.pause(); wake(false); paint(); }
    function finished() { vs.forEach(kill); vs = []; playing = false; pausedAt = 0; loop = true; passes = 0; stopAt = 0; v.pause(); wake(false); $('#start').classList.remove('hidden'); $('#title2').textContent = '마쳤어요'; $('#go').textContent = '▶ 다시 시작'; paint(); }
    setInterval(() => {
      if (!playing) return; const now = ctx.currentTime;
      for (const x of vs) if (x.wrap && !x.counted && x.t0 <= now) { x.counted = true; passes++; }
      while (vs.length > 1 && vs[0].cut < now - 0.05) kill(vs.shift());
      extend();
      if ((stopAt && now > stopAt + lat()) || (vs.length === 1 && vs[0].cut === Infinity && posAt(now - lat()) >= buf.duration - 0.03)) finished();
    }, 50);
    function sync(force) {
      if (!v.src || v.readyState < 1) return; const t = heard(), now = performance.now();
      if (playing) { if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } } else if (!v.paused) v.pause();
      if ((force || Math.abs(v.currentTime - t) > (playing ? 0.3 : 0.05)) && now - lastSeek > 600) { lastSeek = now; try { v.currentTime = t; } catch (e) {} }
    }
    function verseAt(p) { if (p < B[0]) return -1; for (let i = 0; i < K; i++) if (p < B[i + 1]) return i; return K; }
    function paint() {
      $('#pp').textContent = playing ? '⏸ 멈춤' : '▶ 재생';
      $('#fin').textContent = loop ? '후주로 마치기' : '다시 계속 반복';
      $('#fin').classList.toggle('on', !loop);
      if (!buf) return;
      const p = heard(), cv = verseAt(p);
      $('#st').textContent = (cv < 0 ? '전주' : cv >= K ? '후주' : (K > 1 ? (cv + 1) + '절 · ' : '') + (loop ? '🔁 ' + (passes + 1) + '번째' : '마치는 중')) + ' · ' + fmt(p);
    }
    (function frame() { if (playing) { sync(false); paint(); } requestAnimationFrame(frame); })();
    const fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
    function fsToggle() { const d = document.documentElement; try { if (fsOn()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else { const r = (d.requestFullscreen || d.webkitRequestFullscreen).call(d); if (r && r.catch) r.catch(() => {}); } } catch (e) {} }
    function wake(on) {
      if (on) { if (!lock && navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { lock = l; l.addEventListener('release', () => { lock = null; }); }).catch(() => {}); }
      else if (lock) { lock.release().catch(() => {}); lock = null; }
    }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && playing) wake(true); });
    $('#go').onclick = () => { if (!buf) return; $('#start').classList.add('hidden'); if (!fsOn()) fsToggle(); loop = true; passes = 0; play(CFG.intro ? 0 : B[L[0]]); showBar(); };
    $('#pp').onclick = () => { playing ? pause() : play(); showBar(); };
    $('#fin').onclick = () => { loop = !loop; resched(); showBar(); };
    $('#fsb').onclick = () => { fsToggle(); showBar(); };
    let hideT; function showBar() { document.body.classList.remove('idle'); clearTimeout(hideT); hideT = setTimeout(() => { if (playing) document.body.classList.add('idle'); }, 3000); }
    ['mousemove', 'touchstart', 'click'].forEach(t => document.addEventListener(t, showBar, { passive: true }));
    document.addEventListener('keydown', e => { if (!buf || !$('#start').classList.contains('hidden')) return; if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); } if (e.code === 'KeyF') fsToggle(); });
  }

  const CSS = 'html,body{margin:0;height:100%;background:#000;color:#fff;font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;overflow:hidden}' +
    'video{width:100%;height:100%;object-fit:contain;display:block}.hidden{display:none!important}' +
    '#start{position:fixed;inset:0;background:rgba(10,8,20,.82);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:20px}' +
    '#title{font-size:clamp(20px,4vw,34px);font-weight:700}#title2{font-size:18px;color:#c9bbff}#sub{color:#c8c4d6}' +
    '#go{font:inherit;font-size:clamp(22px,4vw,34px);font-weight:700;padding:18px 48px;border:0;border-radius:20px;background:#6d55e0;color:#fff;cursor:pointer}#go:disabled{opacity:.5}' +
    '#bar{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);display:flex;gap:10px;align-items:center;background:rgba(20,16,32,.85);padding:10px 14px;border-radius:16px;transition:opacity .5s;flex-wrap:wrap;justify-content:center;max-width:94vw}' +
    '#bar button{font:inherit;font-size:16px;padding:10px 16px;border-radius:12px;border:1px solid #4a4266;background:#2a2440;color:#fff;cursor:pointer}#bar button.on{background:#d9480f;border-color:#d9480f}' +
    '#st{font-size:15px;color:#c9bbff;min-width:120px;text-align:center}body.idle{cursor:none}body.idle #bar{opacity:0;pointer-events:none}#start:not(.hidden)~#bar{display:none}';

  window.HymnLoopFile = function (cfg, dataUrl) {
    const safe = s => JSON.stringify(s).replace(/</g, '\\u003c');
    const name = String(cfg.name).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + name + ' · 무한 반복</title><style>' + CSS + '</style></head><body>' +
      '<video id="v" playsinline muted preload="auto"></video>' +
      '<div id="start"><div id="title">🔁 ' + name + '</div><div id="title2">무한 반복</div><button id="go" disabled>준비 중…</button><div id="sub">잠깐만 기다려 주세요</div></div>' +
      '<div id="bar"><button id="pp">⏸ 멈춤</button><button id="fin">후주로 마치기</button><span id="st"></span><button id="fsb">⛶ 전체화면</button></div>' +
      '<script>(' + player.toString() + ')(' + safe(cfg) + ',' + safe(dataUrl) + ');<\/script></body></html>\n';
  };
})();
