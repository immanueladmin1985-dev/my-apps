// 팬플룻 교실 자동 점검
// 사용법(저장소 맨 위 폴더에서): node panflute/tools/check.js [screens|practice|pitch|store|import|all]
// - 앱 폴더를 작은 웹 서버로 띄우고, 마이크 대신 원하는 음을 내는 가짜 소리를 넣어 확인함.
// - 스크린샷은 panflute/tools/out/ 에 저장함(저장소에는 올리지 않음).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out');
const PORT = 8000 + Math.floor(Math.random() * 900);
const URL = `http://localhost:${PORT}/panflute/`;
const what = process.argv[2] || 'all';
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  통과 ' : '  실패 ') + msg); if (!cond) fails++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

// 가짜 마이크: window.__set(주파수, 켬, 잡음 세기, 2배음 세기)로 소리를 바꿈
const FAKE_MIC = () => {
  navigator.mediaDevices.getUserMedia = async () => {
    const ac = new AudioContext(); const d = ac.createMediaStreamDestination();
    const o = ac.createOscillator(), o2 = ac.createOscillator(); const g = ac.createGain(), g2 = ac.createGain(); g.gain.value = 0; g2.gain.value = 0;
    const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const ns = ac.createBufferSource(); ns.buffer = nb; ns.loop = true; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500; const ng = ac.createGain(); ng.gain.value = 0;
    o.connect(g); o2.connect(g2); ns.connect(hp); hp.connect(ng); [g, g2, ng].forEach(x => x.connect(d)); o.start(); o2.start(); ns.start();
    window.__set = (f, on, noise = 0, h2 = 0) => { if (f) { o.frequency.value = f; o2.frequency.value = f * 2; } g.gain.setTargetAtTime(on ? 0.3 : 0, ac.currentTime, 0.005); g2.gain.value = on ? 0.3 * h2 : 0; ng.gain.value = on ? noise : 0; };
    return d.stream;
  };
  navigator.mediaDevices.enumerateDevices = async () => [{ kind: 'audioinput', deviceId: 'fake', label: '가짜 마이크', groupId: 'g' }];
};

async function newPage(b, w = 390, h = 844, errs = []) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, permissions: ['microphone'] });
  await ctx.addInitScript(FAKE_MIC);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(1200);
  await p.mouse.click(w / 2, h / 2); await p.waitForTimeout(500); // 시작 화면 넘기기
  return p;
}

async function screens(b) {
  console.log('■ 모든 화면 열기 (휴대폰·태블릿, 세로·가로)');
  for (const [w, h, tag] of [[390, 844, 'phone'], [844, 390, 'phone-land'], [820, 1180, 'tab'], [1180, 820, 'tab-land']]) {
    const errs = []; const p = await newPage(b, w, h, errs);
    const ids = await p.evaluate(() => Object.keys(SCREENS));
    let wide = [];
    for (const id of ids) {
      await p.evaluate(id => go(id, id === 'follow' || id === 'playalong' ? { id: 'twinkle' } : {}, { push: true }), id);
      await p.waitForTimeout(350);
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) wide.push(id);
      await p.screenshot({ path: path.join(OUT, `${tag}-${id}.png`) });
    }
    ok(!errs.length, `${tag}: ${ids.length}개 화면, 스크립트 오류 ${errs.length}건 ${errs.slice(0, 3).join(' | ')}`);
    ok(!wide.length, `${tag}: 옆으로 넘치는 화면 없음 ${wide.join(',')}`);
    await p.context().close();
  }
}

// 지금 목표 음(TGT.m)을 따라 불면서 연습을 끝까지 진행
async function play(b, screen, params, limit = 90000) {
  const errs = []; const p = await newPage(b, 390, 844, errs);
  await p.evaluate(([s, pr]) => go(s, pr, { push: true }), [screen, params]); await p.waitForTimeout(800);
  const start = await p.$('#dock .btn.primary'); if (start) { await start.click(); await p.waitForTimeout(300); }
  const t0 = Date.now(); let last = -1, lastK = 0, res = null;
  while (Date.now() - t0 < limit) {
    const st = await p.evaluate(() => ({ k: document.querySelectorAll('.n.ok,.n.mid,.n.miss,.n.past').length, m: TGT.m, done: !!document.querySelector('#rbar') }));
    if (st.done) { res = await p.evaluate(() => document.querySelector('#rbar').innerText.replace(/\s+/g, ' ')); break; }
    if (st.m) {
      if (st.m === last && st.k !== lastK) { await p.evaluate(() => window.__set(0, false)); await p.waitForTimeout(120); } // 같은 음이 이어지면 끊어 불기
      await p.evaluate(m => window.__set(440 * Math.pow(2, (m - 69) / 12), true), st.m); last = st.m; lastK = st.k;
    }
    await p.waitForTimeout(80);
  }
  await p.screenshot({ path: path.join(OUT, `play-${screen}.png`) });
  ok(res && !errs.length, `${screen} ${JSON.stringify(params)}: ${res ? '끝까지 진행 · ' + res.slice(0, 40) : '끝나지 않음'} ${errs.join(' | ')}`);
  await p.context().close();
}
async function practice(b) {
  console.log('■ 연습 끝까지 진행 (가짜 마이크로 목표 음을 붊)');
  await play(b, 'follow', { id: 'twinkle' });
  await play(b, 'playalong', { id: 'mary' });
  for (const s of ['scale', 'match', 'leap', 'legato', 'staccato']) await play(b, s, {});
}

async function pitch(b) {
  console.log('■ 음정 인식 정확도 (관마다, 숨소리 잡음 섞어서)');
  const p = await newPage(b);
  await p.evaluate(() => go('tuner', {}, { push: true })); await p.waitForTimeout(1200);
  const pipes = await p.evaluate(() => PIPES.slice());
  for (const [noise, h2, maxC] of [[0, 0, 5], [0.15, 0.3, 12], [0.3, 0.6, 20]]) {
    let worst = 0, octave = 0; const row = [];
    for (const m of pipes) {
      const v = await p.evaluate(([f, noise, h2]) => new Promise(r => { window.__set(f, true, noise, h2); const a = []; const un = Mic.sub(fr => a.push(fr.voiced ? fr.mf : 0)); setTimeout(() => { un(); window.__set(f, false); r(a.slice(-15).filter(x => x)); }, 700); }), [440 * Math.pow(2, (m - 69) / 12), noise, h2]);
      await p.waitForTimeout(120);
      if (!v.length) { row.push(`${m}:없음`); continue; }
      const c = (v.sort((a, b) => a - b)[v.length >> 1] - m) * 100;
      if (Math.abs(c) > 600) octave++; else worst = Math.max(worst, Math.abs(c));
      row.push(`${m}:${c.toFixed(0)}`);
    }
    ok(!octave && worst <= maxC, `잡음 ${noise}·배음 ${h2}: 옥타브 오류 ${octave}건, 가장 큰 차이 ${worst.toFixed(0)}센트 (기준 ${maxC}) [${row.join(' ')}]`);
  }
  await p.context().close();
}

async function store(b) {
  console.log('■ 설정 저장 (앱을 두 곳에 열어 둔 경우)');
  const ctx = await b.newContext();
  const open = async () => { const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(600); return p; };
  const outs = p => p.evaluate(() => (JSON.parse(localStorage.getItem('nanjang_panflute_v1') || '{}').settings || {}).outs.map(o => o.lat));
  const A = await open(), B = await open();
  await B.evaluate(() => curOut());
  await A.evaluate(() => { const o = curOut(); o.lat = 0.21; S().latency = o.lat; saveDB(); });
  await B.evaluate(() => setPref('x', 1));
  ok((await outs(B))[0] === 0.21, '한 창에서 잰 소리 지연을 다른 창이 덮어쓰지 않음');
  await A.evaluate(() => { S().outs[0].lat = 0.18; saveDB(); });
  await B.evaluate(() => { S().outs[1].lat = 0.3; saveDB(); });
  const v = await outs(B); ok(v[0] === 0.18 && v[1] === 0.3, `두 창이 서로 다른 장치를 바꿔도 둘 다 남음 (${v})`);
  const C = await open(); ok(await C.evaluate(() => Math.round(latencySec() * 1000)) === 180, '새로 연 창이 저장된 지연값을 씀');
  await ctx.close();
}

async function imports(b) {
  console.log('■ 악보 불러오기 (ABC · MusicXML)');
  const p = await newPage(b);
  const nm = n => n.rest ? 'R' + n.d : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][n.m % 12] + (Math.floor(n.m / 12) - 1) + '/' + +n.d.toFixed(3);
  const abc = await p.evaluate(() => parseABC('X:1\nT:T\nM:3/4\nL:1/8\nK:G\n|: D2 | G2 F2 AB | c4 BA |1 G4 :|2 G6 |]'));
  ok(abc[0].notes.map(nm).join(' ') === 'D4/1 G4/1 F#4/1 A4/0.5 B4/0.5 C5/2 B4/0.5 A4/0.5 G4/2 D4/1 G4/1 F#4/1 A4/0.5 B4/0.5 C5/2 B4/0.5 A4/0.5 G4/3' && abc[0].pk === 1, 'ABC: 조표, 도돌이표, 1·2번 괄호, 못갖춘마디');
  const abc2 = await p.evaluate(() => parseABC('X:1\nM:6/8\nL:1/8\nK:F\nA>B (3cde [CEG]2 =B .c- | c2\nX:2\nK:D\nf2 e2 |]'));
  ok(abc2.length === 2 && abc2[0].tsd === '6/8' && abc2[0].notes.map(nm).join(' ') === 'A4/0.75 A#4/0.25 C5/0.333 D5/0.333 E5/0.333 G4/1 B4/0.5 C5/1.5', `ABC: 부점, 셋잇단음표, 화음, 제자리표, 붙임줄, 한 파일 여러 곡 (${abc2[0].notes.map(nm).join(' ')})`);
  const xml = fs.readFileSync(path.join(__dirname, 'sample.musicxml'), 'utf8');
  const mx = await p.evaluate(t => parseMusicXML(t), xml);
  ok(mx[0].notes.map(nm).join(' ') === 'D5/1 G5/1.5 A5/0.5 E5/2 R2 G5/1.5 A5/0.5 E5/2 R2 G5/3' && mx[0].pk === 1 && mx[0].bpm === 84, 'MusicXML: 화음 윗음, 둘째 성부 빼기, 붙임줄, 도돌이표, 빠르기');
  await p.context().close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
  await wait(900);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    if (what === 'all' || what === 'screens') await screens(b);
    if (what === 'all' || what === 'practice') await practice(b);
    if (what === 'all' || what === 'pitch') await pitch(b);
    if (what === 'all' || what === 'store') await store(b);
    if (what === 'all' || what === 'import') await imports(b);
  } finally { await b.close(); srv.kill(); }
  console.log(fails ? `\n실패 ${fails}건` : '\n모두 통과');
  process.exit(fails ? 1 : 0);
})();
