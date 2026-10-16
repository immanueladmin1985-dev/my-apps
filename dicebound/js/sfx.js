/* 효과음: 소리 파일 없이 Web Audio 로 그 자리에서 합성한다.
 * DB.sfx.play(이름). 설정의 "효과음"(G.settings.sound)을 끄면 아무 소리도 내지 않는다.
 * 휴대폰 브라우저는 사용자가 화면을 누르기 전에는 소리를 막으므로, 첫 터치 때 AudioContext 를 만든다. */
(function (root) {
  'use strict';
  const DB = root.DB;
  let ctx = null, master = null, noiseBuf = null;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // 타격음에 쓰는 흰 잡음 0.5초
      noiseBuf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.5), ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }
  ['pointerdown', 'keydown'].forEach(t => root.addEventListener && root.addEventListener(t, () => { if (on()) ensure(); }, { capture: true, passive: true }));
  const on = () => !(DB.game && DB.game.settings && DB.game.settings.sound === false);

  // 음 하나: 주파수(끝 주파수로 미끄러짐), 길이, 파형, 크기, 시작 지연
  function tone(f0, f1, dur, type, vol, delay) {
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // 잡음: 필터 주파수, 길이, 크기, 시작 지연, 필터 종류
  function noise(freq, dur, vol, delay, kind) {
    const t = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = kind || 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9;
    g.gain.setValueAtTime(vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  const SOUNDS = {
    click() { tone(900, 700, 0.05, 'triangle', 0.08); },
    pick() { tone(660, 990, 0.08, 'triangle', 0.15); },
    // 주사위 굴림: 짧은 딸깍 소리 여러 번
    roll() { for (let i = 0; i < 6; i++) noise(2200 + Math.random() * 1800, 0.035, 0.22 - i * 0.025, i * 0.045 + Math.random() * 0.02, 'highpass'); },
    hit() { noise(900, 0.16, 0.5); tone(160, 60, 0.18, 'sine', 0.45); },
    crit() { noise(700, 0.28, 0.6); tone(120, 40, 0.3, 'sine', 0.55); tone(1400, 900, 0.25, 'square', 0.06, 0.02); },
    hurt() { noise(500, 0.2, 0.45, 0, 'lowpass'); tone(110, 55, 0.22, 'sawtooth', 0.18); },
    block() { tone(1300, 1250, 0.18, 'square', 0.07); tone(1950, 1900, 0.14, 'sine', 0.08, 0.01); },
    heal() { [523, 659, 784].forEach((f, i) => tone(f, f * 1.01, 0.22, 'sine', 0.14, i * 0.07)); },
    coin() { tone(1320, 1320, 0.07, 'square', 0.07); tone(1760, 1760, 0.16, 'square', 0.07, 0.07); },
    open() { noise(300, 0.25, 0.25, 0, 'lowpass'); [392, 523, 659, 784].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.12, 0.12 + i * 0.06)); },
    upgrade() { tone(220, 220, 0.08, 'square', 0.12); noise(3000, 0.08, 0.2, 0, 'highpass'); [659, 880, 1175].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.12, 0.12 + i * 0.07)); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.16, i * 0.11)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.35, 'sawtooth', 0.09, i * 0.16)); },
    rage() { tone(90, 45, 0.9, 'sawtooth', 0.25); noise(200, 0.8, 0.3, 0, 'lowpass'); tone(180, 90, 0.7, 'square', 0.06, 0.1); },
    revive() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.02, 0.3, 'sine', 0.13, i * 0.07)); },
    potion() { tone(400, 900, 0.18, 'sine', 0.15); noise(1500, 0.12, 0.12, 0.05); },
    secret() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.25, 'triangle', 0.13, i * 0.09)); }
  };

  DB.sfx = {
    play(name) {
      if (!on() || !SOUNDS[name]) return;
      if (!ensure() || !noiseBuf) return;
      try { SOUNDS[name](); } catch (e) { /* 소리는 실패해도 게임은 계속한다 */ }
    },
    names: Object.keys(SOUNDS)
  };
})(typeof window !== 'undefined' ? window : globalThis);
