/* 사계절 정원: 화면·저장·설치·전체화면 */
(function () {
  'use strict';
  var G = window.Garden, T = G.TILES;
  var VERSION = '1.0';

  // 다른 곳(Artifact 등)에 게시되어 head 태그가 body로 들어간 경우 head로 옮김
  Array.prototype.forEach.call(document.querySelectorAll('body meta, body link[rel]'), function (n) { document.head.appendChild(n); });

  // 크롬은 브라우저 전체화면(Fullscreen API)일 때도 display-mode: fullscreen 이라고 하므로 처음 열렸을 때 값을 기억
  var BOOT_STANDALONE = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: minimal-ui)').matches || navigator.standalone === true;
  function isStandalone() {
    if (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) return true;
    if (document.fullscreenElement || document.webkitFullscreenElement) return BOOT_STANDALONE;
    return BOOT_STANDALONE || matchMedia('(display-mode: fullscreen)').matches;
  }
  var inFrame = false; try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }

  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return Number(n || 0).toLocaleString('ko-KR'); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fast = false;   // 자동 점검 때 애니메이션 건너뛰기
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, fast ? 0 : ms); }); };
  function today(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  // ---------- 저장 ----------
  var KEY = 'season-garden-v1';
  var P = {
    xp: 0, games: 0, total: 0, best: {}, made: {}, seen: {}, ach: {}, daily: {}, hist: [], saves: {},
    set: { sound: true, vib: true, nums: true, confirm: false, theme: 'auto', autoFS: true, wake: true },
    ui: { installDismissed: false, seenHow: false }
  };
  try {
    var raw = JSON.parse(localStorage.getItem(KEY));
    if (raw) for (var k in raw) { if (k === 'set' || k === 'ui') { for (var k2 in raw[k]) P[k][k2] = raw[k][k2]; } else P[k] = raw[k]; }
  } catch (e) {}
  var saveTimer = null;
  function saveP() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(saveP, 150); }

  // ---------- 레벨·해금 ----------
  function needXp(L) { return 3000 * (L - 1) * L / 2; }
  function levelOf(xp) { var L = 1; while (xp >= needXp(L + 1)) L++; return L; }
  var TITLES = [[1, '새내기 정원사'], [2, '꼬마 정원사'], [3, '부지런한 정원사'], [5, '꽃밭지기'], [7, '숲지기'], [10, '사계절의 정원사'], [15, '무지개 정원사'], [20, '전설의 정원사']];
  function titleOf(L) { var t = TITLES[0][1]; TITLES.forEach(function (x) { if (L >= x[0]) t = x[1]; }); return t; }
  var UNLOCKS = [
    { lv: 2, text: '벚꽃 테마', theme: 'sakura' },
    { lv: 3, text: '작은 정원(5×5)', mode: 'small' },
    { lv: 4, text: '시작할 때 장갑 +1' },
    { lv: 5, text: '넓은 정원(7×7)', mode: 'wide' },
    { lv: 6, text: '바다 테마', theme: 'sea' },
    { lv: 8, text: '시작할 때 되돌리기 +1' },
    { lv: 10, text: '노을 테마', theme: 'sunset' }
  ];
  function lv() { return levelOf(P.xp); }
  function modeLv(m) { var u = UNLOCKS.filter(function (x) { return x.mode === m; })[0]; return u ? u.lv : 1; }
  function themeLv(t) { var u = UNLOCKS.filter(function (x) { return x.theme === t; })[0]; return u ? u.lv : 1; }

  // ---------- 배지 ----------
  var ACH = [
    ['p3', '🍀', '행운의 시작', '클로버를 처음 키웠어요', function (c) { return c.made.p3; }],
    ['p4', '🌼', '첫 꽃', '들꽃을 피웠어요', function (c) { return c.made.p4; }],
    ['p5', '🌷', '튤립 정원', '튤립을 피웠어요', function (c) { return c.made.p5; }],
    ['p6', '🌻', '해를 닮은 꽃', '해바라기를 피웠어요', function (c) { return c.made.p6; }],
    ['p7', '🌳', '그늘을 만드는 나무', '큰 나무를 키웠어요', function (c) { return c.made.p7; }],
    ['p8', '🌈', '무지개가 떴어요', '무지개를 만들었어요', function (c) { return c.made.p8; }],
    ['xp8', '☁️', '하늘 정원', '무지개 셋을 모아 하늘로 보냈어요', function (c) { return c.made.xp8; }],
    ['s2', '💎', '반짝반짝', '돌 셋으로 보석을 만들었어요', function (c) { return c.made.s2; }],
    ['xs2', '👑', '왕관', '보석 셋으로 왕관을 만들었어요', function (c) { return c.made.xs2; }],
    ['w2', '⛄', '눈사람', '눈송이 셋으로 눈사람을 만들었어요', function (c) { return c.made.w2; }],
    ['xw2', '☃️', '눈사람 가족', '눈사람 셋을 모았어요', function (c) { return c.made.xw2; }],
    ['chain2', '🔗', '연달아 합치기', '한 번에 두 번 이어서 합쳤어요', function (c) { return c.g && c.g.stats.maxChain >= 2; }],
    ['chain3', '⛓️', '줄줄이 합치기', '한 번에 세 번 이어서 합쳤어요', function (c) { return c.g && c.g.stats.maxChain >= 3; }],
    ['group5', '🖐️', '다섯 손가락', '다섯 개 이상을 한꺼번에 합쳤어요', function (c) { return c.g && c.g.stats.maxGroup >= 5; }],
    ['y2', '🌸', '한 해를 보내고', '정원에서 두 번째 봄을 맞았어요', function (c) { return c.g && G.yearOf(c.g.turn) >= 2; }],
    ['y4', '🎋', '네 번째 봄', '정원에서 네 번째 봄을 맞았어요', function (c) { return c.g && G.yearOf(c.g.turn) >= 4; }],
    ['y8', '🏞️', '오래된 정원', '정원에서 여덟 번째 봄을 맞았어요', function (c) { return c.g && G.yearOf(c.g.turn) >= 8; }],
    ['harv', '🧺', '풍년', '가을 수확 한 번에 2,000점 넘게 거뒀어요', function (c) { return c.g && c.g.stats.harvestBest >= 2000; }],
    ['sc1', '⭐', '만 점 정원', '한 판에 10,000점을 넘었어요', function (c) { return c.g && c.g.score >= 10000; }],
    ['sc3', '🌟', '삼만 점 정원', '한 판에 30,000점을 넘었어요', function (c) { return c.g && c.g.score >= 30000; }],
    ['sc10', '💫', '십만 점 정원', '한 판에 100,000점을 넘었어요', function (c) { return c.g && c.g.score >= 100000; }],
    ['small', '🪴', '작은 정원의 달인', '작은 정원에서 10,000점을 넘었어요', function (c) { return c.g && c.g.mode === 'small' && c.g.score >= 10000; }],
    ['d3', '📅', '사흘 연속', '오늘의 정원을 3일 연속 가꿨어요', function () { return streak() >= 3; }],
    ['d7', '🗓️', '일주일 연속', '오늘의 정원을 7일 연속 가꿨어요', function () { return streak() >= 7; }],
    ['g10', '🧑‍🌾', '열 번째 정원', '정원을 10번 가꿨어요', function () { return P.games >= 10; }],
    ['g50', '🏡', '정원 마을', '정원을 50번 가꿨어요', function () { return P.games >= 50; }]
  ];
  function checkAch(g) {
    var ctx = { made: P.made, g: g };
    ACH.forEach(function (a) {
      if (P.ach[a[0]]) return;
      var ok = false; try { ok = !!a[4](ctx); } catch (e) {}
      if (ok) { P.ach[a[0]] = today(); queueToast('<span class="e">' + a[1] + '</span> 배지를 얻었어요: <b>' + esc(a[2]) + '</b>'); }
    });
  }
  function streak() {
    var n = 0, d = new Date();
    if (!P.daily[today(d)]) d.setDate(d.getDate() - 1);
    while (P.daily[today(d)] != null) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---------- 테마 ----------
  var mqDark = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    var t = P.set.theme, r = document.documentElement;
    if (themeLv(t) > lv()) t = 'auto';
    r.className = '';
    if (t === 'auto') { if (mqDark.matches) r.classList.add('dark'); }
    else if (t !== 'light') r.classList.add(t);
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', getComputedStyle(document.body).backgroundColor || '#f3f6ee');
    document.body.classList.toggle('nonums', !P.set.nums);
  }
  if (mqDark.addEventListener) mqDark.addEventListener('change', applyTheme);

  // ---------- 소리·진동 ----------
  var AC = null;
  function tone(freq, dur, type, vol, delay) {
    if (!P.set.sound) return;
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      var t0 = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) {}
  }
  var SFX = {
    place: function () { tone(520, 0.08, 'triangle', 0.12); },
    merge: function (tier, chain) { var b = 392 * Math.pow(1.122, tier + (chain - 1) * 2); tone(b, 0.14, 'sine', 0.16); tone(b * 1.5, 0.18, 'sine', 0.1, 0.07); },
    gone: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, 'sine', 0.12, i * 0.07); }); },
    season: function () { tone(660, 0.3, 'sine', 0.08); tone(880, 0.35, 'sine', 0.07, 0.12); },
    pick: function () { tone(300, 0.08, 'square', 0.05); },
    bad: function () { tone(180, 0.15, 'sawtooth', 0.06); },
    over: function () { [523, 440, 392, 330].forEach(function (f, i) { tone(f, 0.3, 'triangle', 0.1, i * 0.15); }); }
  };
  function vib(p) { if (P.set.vib && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }

  // ---------- 알림 띠·창 ----------
  var toastQ = [], toastBusy = false;
  function queueToast(html) { toastQ.push(html); if (!toastBusy) nextToast(); }
  function nextToast() {
    var h = toastQ.shift(); if (!h) { toastBusy = false; return; }
    toastBusy = true; var t = $('toast'); t.innerHTML = h; t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); setTimeout(nextToast, 260); }, fast ? 10 : 2200);
  }
  function openModal(html, opt) {
    opt = opt || {};
    var dim = document.createElement('div');
    dim.className = 'dim';
    dim.innerHTML = '<div class="sheet" role="dialog">' + html + '</div>';
    dim.addEventListener('click', function (e) {
      if ((e.target === dim && !opt.locked) || e.target.closest('[data-close]')) close();
    });
    function close() { if (dim.parentNode) dim.remove(); if (opt.onClose) opt.onClose(); }
    dim.close = close;
    $('modalRoot').appendChild(dim);
    return dim;
  }
  function confirmBox(title, msg, yes, cb, danger) {
    var d = openModal('<h3>' + title + '</h3><p>' + msg + '</p><button class="sbtn ' + (danger ? 'danger' : 'primary') + '" data-y>' + yes + '</button><button class="sbtn" data-close>취소</button>');
    d.querySelector('[data-y]').onclick = function () { d.close(); cb(); };
  }
  function tileHTML(k, cls) {
    if (!k) return '';
    var t = T[k], inner = t.emoji ? '<span>' + t.emoji + '</span>' : '<span></span>';
    return '<div class="tile t-' + k + (cls ? ' ' + cls : '') + '">' + inner + (k[0] === 'p' ? '<i class="lv">' + t.tier + '</i>' : '') + '</div>';
  }

  // ---------- 첫 화면 ----------
  function show(id) {
    $('home').classList.toggle('hidden', id !== 'home');
    $('game').classList.toggle('hidden', id !== 'game');
    document.body.classList.toggle('ingame', id === 'game');
    if (id === 'game') { wake.on(); fit(); } else { wake.off(); renderHome(); }
  }
  function latestSave() {
    var best = null;
    for (var m in P.saves) { var s = P.saves[m]; if (s && !s.over && (!best || (s.updatedAt || 0) > (best.updatedAt || 0))) best = s; }
    return best;
  }
  function seasonLabel(turn) { return G.yearOf(turn) + '년째 ' + G.SEASONS[G.seasonOf(turn)]; }
  function renderHome() {
    var L = lv(), cur = P.xp - needXp(L), span = needXp(L + 1) - needXp(L);
    var nextU = UNLOCKS.filter(function (u) { return u.lv > L; })[0];
    $('lvcard').innerHTML = '<div class="lv"><small>정원사</small>Lv.' + L + '</div><div class="info"><div class="ttl">' + titleOf(L) + '</div>' +
      '<div class="bar"><i style="width:' + Math.min(100, cur / span * 100).toFixed(1) + '%"></i></div>' +
      '<div class="sub">다음 레벨까지 ' + fmt(span - cur) + '점' + (nextU ? ' · Lv.' + nextU.lv + ' ' + nextU.text : '') + '</div></div>';
    var s = latestSave();
    $('hCont').classList.toggle('hidden', !s);
    if (s) $('hContSub').textContent = G.MODES[s.mode].name + ' · ' + seasonLabel(s.turn) + ' · ' + fmt(s.score) + '점';
    var td = P.daily[today()], sk = streak();
    $('hDailySub').textContent = (td != null ? '오늘 최고 ' + fmt(td) + '점' : '오늘은 아직 안 했어요') + (sk ? ' · ' + sk + '일 연속' : '');
    paintInstall();
  }

  // ---------- 게임 ----------
  var st = null, busy = false, gloveMode = false, previewCell = -1, cells = [], cache = [];
  function bestFor(mode) { return P.best[mode] || 0; }

  function startGame(mode) {
    var opt = {}, L = lv();
    if (mode === 'daily') { opt.date = today(); opt.seed = G.hashStr('season-garden:' + opt.date); }
    else { if (L >= 4) opt.bonusGlove = 1; if (L >= 8) opt.bonusUndo = 1; }
    st = G.newGame(mode, opt);
    st.updatedAt = Date.now();
    P.saves[mode] = st; saveP();
    enterGame();
    if (!P.ui.seenHow) { P.ui.seenHow = true; saveP(); howTo(); }
  }
  function resumeGame(mode) { st = P.saves[mode]; enterGame(); }
  function enterGame() {
    gloveMode = false; previewCell = -1;
    buildBoard();
    show('game');
    renderAll();
  }
  function persist() { if (!st) return; st.updatedAt = Date.now(); P.saves[st.mode] = st; saveSoon(); }

  function buildBoard() {
    var b = $('board'); b.innerHTML = ''; cells = []; cache = [];
    b.style.gridTemplateColumns = 'repeat(' + st.size + ',minmax(0,1fr))';
    b.style.gridTemplateRows = 'repeat(' + st.size + ',minmax(0,1fr))';
    for (var i = 0; i < st.size * st.size; i++) {
      var c = document.createElement('div'); c.className = 'cell'; c.dataset.i = i;
      b.appendChild(c); cells.push(c); cache.push(null);
    }
  }
  function fit() {
    if (!st || $('game').classList.contains('hidden')) return;
    var r = $('stage').getBoundingClientRect();
    var s = Math.max(160, Math.floor(Math.min(r.width, r.height)));
    var b = $('board'); b.style.width = s + 'px'; b.style.height = s + 'px';
    var gap = s < 360 ? 3 : 5; b.style.gap = gap + 'px'; b.style.padding = gap + 2 + 'px';
    var cell = (s - (gap + 2) * 2 - gap * (st.size - 1)) / st.size;
    b.style.setProperty('--fs', Math.round(cell * 0.5) + 'px');
  }
  function renderBoard(board, popAt, popCls) {
    for (var i = 0; i < cells.length; i++) {
      var k = board[i] || '';
      var key = k + (i === popAt ? '!' + Math.random() : '');
      if (cache[i] === key && i !== popAt) continue;
      cache[i] = i === popAt ? null : k;
      cells[i].innerHTML = tileHTML(k, i === popAt ? popCls : '');
    }
  }
  function renderSeason() {
    var s = G.seasonOf(st.turn), into = st.turn % G.SEASON_LEN, E = ['🌸', '☀️', '🍁', '❄️'];
    var dots = ''; for (var i = 0; i < G.SEASON_LEN; i++) dots += '<i' + (i < into ? ' class="on"' : '') + '></i>';
    $('gSeason').innerHTML = '<div class="nm"><span class="e">' + E[s] + '</span> ' + G.yearOf(st.turn) + '년 ' + G.SEASONS[s] + '</div><div class="dots">' + dots + '</div>';
    var b = $('board'); b.classList.remove('s0', 's1', 's2', 's3'); b.classList.add('s' + s);
  }
  function renderHand(note) {
    var t = T[st.cur];
    $('gCur').innerHTML = '<small>지금 놓을 것</small>' + tileHTML(st.cur) + '<div class="nm">' + (note || esc(t.name)) + '</div>';
    $('gNext').innerHTML = '<small>다음</small>' + tileHTML(st.next);
    var bk = $('gBasket');
    bk.innerHTML = '<small>바구니</small>' + (st.basket ? tileHTML(st.basket) : '<span class="tile empty"></span>');
    bk.classList.toggle('full', !!st.basket);
    if (!P.seen[st.cur]) { P.seen[st.cur] = 1; saveSoon(); }
  }
  function renderTools() {
    var it = st.items, un = st.unlimited;
    var gb = $('gGlove'); gb.querySelector('i').textContent = it.glove; gb.disabled = it.glove <= 0 && !gloveMode; gb.classList.toggle('on', gloveMode);
    var ub = $('gUndo'); ub.querySelector('i').textContent = un ? '∞' : it.undo; ub.disabled = it.undo <= 0 || !st.hist || !st.hist.length;
    var hb = $('gHint'); hb.querySelector('i').textContent = un ? '∞' : it.hint; hb.disabled = it.hint <= 0;
    $('board').classList.toggle('glove', gloveMode);
  }
  function renderAll() {
    $('gScore').textContent = fmt(st.score);
    $('gBest').textContent = fmt(Math.max(bestFor(st.mode), st.score));
    renderBoard(st.board); renderSeason(); renderHand(); renderTools(); clearPreview();
  }

  // 미리 보기: 이 칸에 놓으면 무엇이 합쳐지는지
  function clearPreview() {
    if (previewCell >= 0 && cells[previewCell]) { cache[previewCell] = null; renderBoard(st.board); }
    previewCell = -1;
    cells.forEach(function (c) { c.classList.remove('hl'); });
    if (st) renderHand();
  }
  function showPreview(c) {
    if (busy || gloveMode || !st || st.over || st.board[c]) { if (previewCell !== -1) clearPreview(); return; }
    if (previewCell === c) return;
    clearPreview();
    previewCell = c;
    var sim = { size: st.size, board: st.board.slice() }, kind = st.cur === 'f' ? G.fairyKind(sim, c) : st.cur;
    var r = G.resolve(sim, c, kind);
    cells[c].innerHTML = tileHTML(kind, 'ghost'); cache[c] = null;
    var note = esc(T[st.cur].name);
    if (r.steps.length) {
      r.steps.forEach(function (s) { s.from.forEach(function (f) { cells[f].classList.add('hl'); }); });
      cells[c].classList.add('hl');
      var last = r.steps[r.steps.length - 1];
      note = '→ ' + (last.to === 'gone' ? '✨' : '<span style="font-family:var(--emoji)">' + T[last.to].emoji + '</span>') + ' +' + fmt(r.gained);
    }
    renderHand(note);
  }

  function cellRect(i) { return cells[i].getBoundingClientRect(); }
  function floatText(i, text, big) {
    var sr = $('stage').getBoundingClientRect(), r = cellRect(i);
    var d = document.createElement('div'); d.className = 'float' + (big ? ' big' : ''); d.textContent = text;
    d.style.left = (r.left + r.width / 2 - sr.left) + 'px'; d.style.top = (r.top + r.height / 2 - sr.top) + 'px';
    $('stage').appendChild(d); setTimeout(function () { d.remove(); }, 1150);
  }
  function notice(html) {
    var d = document.createElement('div'); d.className = 'notice'; d.innerHTML = html;
    $('stage').appendChild(d); setTimeout(function () { d.remove(); }, 1850);
  }

  async function doPlace(c) {
    if (busy || !st || st.over || st.board[c]) return;
    busy = true;
    var pre = st.board.slice();
    var res = G.place(st, c);
    if (!res.ok) { busy = false; return; }
    clearPreview();
    var b = pre.slice(); b[c] = res.placed;
    renderBoard(b, c, 'drop'); SFX.place(); vib(8);
    renderHand();
    try {
      for (var i = 0; i < res.steps.length; i++) {
        var s = res.steps[i];
        await wait(i ? 60 : 110);
        var tr = cellRect(s.at);
        s.from.forEach(function (f) {
          var el = cells[f].firstChild; if (!el) return;
          var fr = cellRect(f);
          el.style.transform = 'translate(' + (tr.left - fr.left) + 'px,' + (tr.top - fr.top) + 'px) scale(.55)';
          el.style.opacity = '.2';
        });
        await wait(200);
        s.from.forEach(function (f) { b[f] = null; });
        b[s.at] = s.to === 'gone' ? null : s.to;
        renderBoard(b, s.to === 'gone' ? -1 : s.at, 'pop');
        if (s.to === 'gone') { SFX.gone(); vib([20, 40, 20]); floatText(s.at, (s.kind === 's2' ? '👑 ' : s.kind === 'p8' ? '☁️ ' : '⛄ ') + '+' + fmt(s.pts), true); }
        else { SFX.merge(T[s.to].tier, s.chain); vib(15); floatText(s.at, (s.chain > 1 ? '연쇄 ' : '') + '+' + fmt(s.pts), s.chain > 1); }
        P.made[s.to === 'gone' ? 'x' + s.kind : s.to] = (P.made[s.to === 'gone' ? 'x' + s.kind : s.to] || 0) + 1;
        $('gScore').textContent = fmt(st.score);
      }
      res.earned.forEach(function (e) { queueToast(e === 'glove' ? '<span class="e">🧤</span> 해바라기 선물: 장갑을 하나 받았어요' : '<span class="e">↩️</span> 큰 나무 선물: 되돌리기를 하나 받았어요'); });
      for (var j = 0; j < res.events.length; j++) {
        var ev = res.events[j];
        if (ev.type === 'harvest') {
          ev.cells.forEach(function (x) { floatText(x.at, '+' + fmt(x.pts)); });
          notice('<span class="e">🧺</span> 가을 수확 +' + fmt(ev.pts) + '<small>' + (ev.cells.length ? '튤립 이상 꽃과 나무가 점수를 줬어요' : '튤립 이상을 키워 두면 수확 점수를 받아요') + '</small>');
          await wait(900);
        } else if (ev.type === 'melt') {
          ev.cells.forEach(function (x) { floatText(x.at, '+' + fmt(x.pts)); });
          renderBoard(st.board);
          notice('<span class="e">🌸</span> 봄이 왔어요' + '<small>' + (ev.cells.length ? '눈이 녹아 자리가 ' + ev.cells.length + '칸 비었어요 +' + fmt(ev.pts) : '새 해가 시작돼요') + '</small>');
          await wait(900);
        } else if (ev.type === 'season' && ev.season !== 0) {
          var NM = { 1: ['☀️', '여름', '돌이 조금 더 자주 나와요'], 2: ['🍁', '가을', '가을이 끝나면 수확해요'], 3: ['❄️', '겨울', st.noSnow ? '느긋한 정원엔 눈이 오지 않아요' : '눈송이가 내려요. 봄이면 녹아요'] }[ev.season];
          notice('<span class="e">' + NM[0] + '</span> ' + NM[1] + '<small>' + NM[2] + '</small>');
        }
        if (ev.type === 'season') SFX.season();
      }
    } catch (e) { console.error(e); }
    renderAll();
    checkAch(st);
    persist();
    busy = false;
    if (res.full) boardFull();
  }

  function boardFull() {
    if (G.empties(st).length) return;
    var canUndo = st.items.undo > 0 && st.hist && st.hist.length, canGlove = st.items.glove > 0;
    if (!canUndo && !canGlove) { gameOver(); return; }
    var d = openModal('<h3>정원이 가득 찼어요</h3><p>도구를 쓰면 조금 더 가꿀 수 있어요.</p>' +
      (canGlove ? '<button class="sbtn primary" data-a="glove">🧤 장갑으로 하나 뽑기<small>' + st.items.glove + '개 남음</small></button>' : '') +
      (canUndo ? '<button class="sbtn" data-a="undo">↩️ 되돌리기<small>' + (st.unlimited ? '마음껏' : st.items.undo + '번 남음') + '</small></button>' : '') +
      '<button class="sbtn danger" data-a="end">여기서 마치기</button>', { locked: true });
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.dataset.a; d.close();
      if (a === 'glove') { gloveMode = true; renderTools(); queueToast('뽑을 타일을 누르세요'); }
      else if (a === 'undo') doUndo();
      else gameOver();
    });
  }

  function gameOver() {
    if (st.over) return;
    st.over = true; SFX.over();
    var mode = st.mode, score = st.score, oldBest = bestFor(mode), oldL = lv();
    var gain = mode === 'relax' ? Math.round(score / 2) : score;
    P.games++; P.total += score; P.xp += gain;
    if (score > oldBest) P.best[mode] = score;
    if (mode === 'daily') { var d = st.date || today(); P.daily[d] = Math.max(P.daily[d] || 0, score); }
    P.hist.unshift({ mode: mode, score: score, turn: st.turn, best: st.stats.best, date: today() });
    if (P.hist.length > 30) P.hist.length = 30;
    delete P.saves[mode];
    checkAch(st);
    saveP();
    var newL = lv(), ups = UNLOCKS.filter(function (u) { return u.lv > oldL && u.lv <= newL; });
    var html = '<div class="result"><h3>정원 가꾸기를 마쳤어요</h3>' + (score > oldBest && score > 0 ? '<span class="nr">새 최고 기록!</span>' : '') +
      '<div class="sc">' + fmt(score) + '</div><p style="color:var(--muted)">' + esc(G.MODES[mode].name) + ' · ' + seasonLabel(st.turn) + '까지 · ' + st.turn + '번 놓음</p></div>' +
      '<div class="stats"><div class="stat"><b style="font-family:var(--emoji)">' + T[st.stats.best].emoji + '</b><small>가장 크게 키운 것: ' + T[st.stats.best].name + '</small></div>' +
      '<div class="stat"><b>' + st.stats.merges + '</b><small>합친 횟수 (최대 연쇄 ' + st.stats.maxChain + ')</small></div></div>' +
      '<p>정원사 경험치 +' + fmt(gain) + (mode === 'relax' ? ' (느긋한 정원은 절반)' : '') + '</p>' +
      (newL > oldL ? '<p><b>🎉 정원사 레벨 ' + newL + '이 되었어요! (' + titleOf(newL) + ')</b>' + (ups.length ? '<br>새로 열림: ' + ups.map(function (u) { return u.text; }).join(', ') : '') + '</p>' : '') +
      (mode === 'daily' ? '<p>오늘의 정원은 내일 새 순서로 바뀌어요. 오늘 다시 하면 더 높은 점수만 남아요.</p>' : '') +
      '<button class="sbtn primary" data-a="again">한 판 더</button><button class="sbtn" data-a="home">첫 화면으로</button>';
    var dlg = openModal(html, { locked: true });
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      dlg.close();
      if (b.dataset.a === 'again') startGame(mode); else { st = null; show('home'); }
    });
  }

  function doUndo() {
    if (busy || !st) return;
    if (G.undo(st)) { SFX.pick(); gloveMode = false; renderAll(); persist(); }
  }

  // 판 위 누르기
  $('board').addEventListener('click', function (e) {
    var c = e.target.closest('.cell'); if (!c || busy || !st) return;
    var i = +c.dataset.i;
    if (gloveMode) {
      if (!st.board[i]) { queueToast('뽑을 타일이 있는 칸을 누르세요'); return; }
      G.useGlove(st, i); gloveMode = false; SFX.pick(); vib(10);
      renderAll(); persist(); return;
    }
    if (st.board[i]) { SFX.bad(); return; }
    if (P.set.confirm && previewCell !== i) { showPreview(i); return; }
    doPlace(i);
  });
  $('board').addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var c = e.target.closest('.cell'); if (!c) return;
    showPreview(+c.dataset.i);
  });
  $('board').addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !P.set.confirm) clearPreview(); });

  $('gBasket').addEventListener('click', function () {
    if (busy || !st) return;
    if (st.basket === st.cur) { queueToast('바구니에 같은 것이 들어 있어요'); return; }
    G.swapBasket(st); SFX.pick(); renderAll(); persist();
  });
  $('gGlove').addEventListener('click', function () {
    if (busy || !st) return;
    if (!gloveMode && st.items.glove <= 0) return;
    gloveMode = !gloveMode; clearPreview(); renderTools();
    if (gloveMode) queueToast('<span class="e">🧤</span> 뽑을 타일을 누르세요 (다시 누르면 취소)');
  });
  $('gUndo').addEventListener('click', doUndo);
  $('gHint').addEventListener('click', function () {
    if (busy || !st || st.items.hint <= 0) return;
    var m = G.bestMove(st); if (!m) return;
    if (!st.unlimited) st.items.hint--;
    renderTools(); persist();
    cells.forEach(function (c) { c.classList.remove('hint'); });
    cells[m.cell].classList.add('hint');
    if (m.swap) { $('gBasket').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 500, iterations: 3 }); queueToast('<span class="e">🧺</span> 바구니와 바꾼 뒤 빛나는 칸에 놓아 보세요'); }
    setTimeout(function () { cells.forEach(function (c) { c.classList.remove('hint'); }); }, 2600);
  });
  $('gMenu').addEventListener('click', gameMenu);

  function gameMenu() {
    var d = openModal('<h3>' + esc(G.MODES[st.mode].name) + '</h3><p style="color:var(--muted)">' + seasonLabel(st.turn) + ' · ' + fmt(st.score) + '점. 진행 상황은 자동으로 저장돼요.</p>' +
      '<button class="sbtn primary" data-close>계속 가꾸기</button>' +
      '<button class="sbtn" data-a="how">❔ 놀이 방법</button>' +
      '<button class="sbtn" data-a="set">⚙️ 설정 (전체화면·소리)</button>' +
      '<button class="sbtn" data-a="end">여기서 마치고 점수 남기기</button>' +
      '<button class="sbtn" data-a="restart">처음부터 다시</button>' +
      '<button class="sbtn" data-a="home">첫 화면으로</button>');
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.dataset.a; d.close();
      if (a === 'how') howTo();
      else if (a === 'set') settings();
      else if (a === 'home') { persist(); saveP(); show('home'); }
      else if (a === 'end') confirmBox('여기서 마칠까요?', '지금 점수 ' + fmt(st.score) + '점으로 기록하고 경험치를 받아요.', '마치기', gameOver);
      else if (a === 'restart') confirmBox('처음부터 다시 할까요?', '지금 정원은 기록 없이 사라져요.', '다시 시작', function () { startGame(st.mode); }, true);
    });
  }

  // ---------- 여러 창 ----------
  function howTo() {
    var chain = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'].map(function (k) { return T[k].emoji; }).join('<i>›</i>');
    openModal('<h3>놀이 방법</h3>' +
      '<ol><li><b>빈 칸을 눌러</b> 지금 놓을 것을 심어요.</li>' +
      '<li><b>같은 것이 셋 이상</b> 가로·세로로 이어지면, 마지막에 놓은 자리에서 <b>한 단계 위</b>로 합쳐져요. 넷·다섯을 한꺼번에 합치면 점수가 더 커요.</li>' +
      '<li>합쳐서 생긴 것이 또 셋이 되면 <b>연쇄</b>로 이어서 합쳐져요.</li></ol>' +
      '<div class="chainline">' + chain + '</div>' +
      '<ul><li><b>계절</b>: 12번 놓을 때마다 계절이 바뀌어요. <b>가을이 끝나면 수확</b>(튤립 이상이 점수를 줌), <b>겨울엔 눈송이</b>가 내리지만 <b>봄이 오면 녹아요</b>.</li>' +
      '<li><b>돌</b>은 자리만 차지해요. 셋을 모으면 💎 보석, 보석 셋이면 👑 왕관이 되어 날아가요.</li>' +
      '<li>✨ <b>요정 씨앗</b>은 놓는 자리에서 가장 좋게 합쳐지는 것으로 바뀌어요.</li>' +
      '<li>🧺 <b>바구니</b>: 지금 것을 넣어 두었다가 나중에 꺼내 써요.</li>' +
      '<li>🧤 <b>장갑</b>은 타일 하나를 뽑고, ↩️ <b>되돌리기</b>는 한 수를 무르고, 💡 <b>힌트</b>는 좋은 자리를 알려 줘요. 해바라기를 피우면 장갑, 큰 나무를 키우면 되돌리기를 받아요.</li>' +
      '<li>빈 칸이 없으면 정원 가꾸기가 끝나요. 점수만큼 정원사 경험치가 쌓여 새 정원과 테마가 열려요.</li></ul>' +
      '<button class="sbtn primary" data-close>시작해 볼게요</button>');
  }

  function modePicker() {
    var L = lv(), h = '<h3>어떤 정원을 가꿀까요?</h3><div class="modes">';
    [['classic', '🌿'], ['relax', '☕'], ['small', '🪴'], ['wide', '🏞️']].forEach(function (x) {
      var m = G.MODES[x[0]], need = modeLv(x[0]), lock = need > L, sv = P.saves[x[0]];
      h += '<button class="mode" data-m="' + x[0] + '"' + (lock ? ' disabled' : '') + '><span class="ic">' + (lock ? '🔒' : x[1]) + '</span><span><b>' + m.name + '</b><small>' + m.desc + '</small>' +
        '<em>' + (lock ? '정원사 Lv.' + need + '에 열려요' : (sv && !sv.over ? '가꾸는 중 · ' + seasonLabel(sv.turn) + ' · ' + fmt(sv.score) + '점' : (bestFor(x[0]) ? '최고 ' + fmt(bestFor(x[0])) + '점' : '아직 기록 없음'))) + '</em></span></button>';
    });
    h += '</div><button class="sbtn" data-close>닫기</button>';
    var d = openModal(h);
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b || b.disabled) return;
      var m = b.dataset.m; d.close();
      openMode(m);
    });
  }
  function openMode(m) {
    var sv = P.saves[m];
    if (sv && !sv.over && !(m === 'daily' && sv.date !== today())) {
      var d = openModal('<h3>' + G.MODES[m].name + '</h3><p>가꾸던 정원이 있어요 (' + seasonLabel(sv.turn) + ', ' + fmt(sv.score) + '점).</p>' +
        '<button class="sbtn primary" data-a="go">이어서 가꾸기</button><button class="sbtn" data-a="new">새로 시작 (가꾸던 정원은 지워져요)</button><button class="sbtn" data-close>취소</button>');
      d.addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]'); if (!b) return; d.close();
        if (b.dataset.a === 'go') resumeGame(m); else startGame(m);
      });
    } else startGame(m);
  }

  function book() {
    var h = '<h3>정원 도감</h3><p style="color:var(--muted)">지금까지 만든 횟수예요. 아직 못 본 것은 물음표로 나와요.</p><div class="book">';
    G.ORDER.forEach(function (k) {
      var t = T[k], n = P.made[k] || 0, known = n > 0 || P.seen[k];
      h += '<div class="bk' + (known ? '' : ' lock') + '">' + (known ? tileHTML(k) : '<div class="tile t-p1"><span>❔</span></div>') +
        '<div><b>' + (known ? t.name : '???') + (k[0] === 'p' ? ' · ' + t.tier + '단계' : '') + '</b><small>' + (known ? esc(t.desc) + (n ? '<br>만든 횟수 ' + fmt(n) : '') : '정원을 키우다 보면 만나요') + '</small></div></div>';
    });
    var gx = [['xp8', '☁️', '하늘 정원', '무지개 셋'], ['xs2', '👑', '왕관', '보석 셋'], ['xw2', '☃️', '눈사람 가족', '눈사람 셋']];
    gx.forEach(function (x) {
      var n = P.made[x[0]] || 0;
      h += '<div class="bk' + (n ? '' : ' lock') + '"><div class="tile t-f"><span>' + (n ? x[1] : '❔') + '</span></div><div><b>' + (n ? x[2] : '???') + '</b><small>' + (n ? x[3] + '를 모아 날려 보냈어요<br>횟수 ' + fmt(n) : '아주 크게 키우면 만나요') + '</small></div></div>';
    });
    h += '</div><button class="sbtn primary" data-close>닫기</button>';
    openModal(h);
  }
  function badges() {
    var got = ACH.filter(function (a) { return P.ach[a[0]]; }).length;
    var h = '<h3>배지 ' + got + ' / ' + ACH.length + '</h3><div class="badges">';
    ACH.forEach(function (a) {
      var on = P.ach[a[0]];
      h += '<div class="bd' + (on ? '' : ' lock') + '"><span class="e">' + a[1] + '</span><b>' + esc(a[2]) + '</b><small>' + esc(a[3]) + (on ? '<br>' + on : '') + '</small></div>';
    });
    h += '</div><button class="sbtn primary" data-close>닫기</button>';
    openModal(h);
  }
  function records() {
    var L = lv();
    var h = '<h3>기록</h3><div class="stats">' +
      '<div class="stat"><b>Lv.' + L + '</b><small>' + titleOf(L) + '</small></div>' +
      '<div class="stat"><b>' + fmt(P.games) + '</b><small>가꾼 정원 수</small></div>' +
      '<div class="stat"><b>' + fmt(P.total) + '</b><small>모은 점수 합계</small></div>' +
      '<div class="stat"><b>' + streak() + '일</b><small>오늘의 정원 연속</small></div></div>' +
      '<p><b>모드별 최고 점수</b></p><table class="hist">';
    ['classic', 'daily', 'relax', 'small', 'wide'].forEach(function (m) { h += '<tr><td>' + G.MODES[m].name + '</td><td>' + (bestFor(m) ? fmt(bestFor(m)) : '-') + '</td></tr>'; });
    h += '</table><p style="margin-top:14px"><b>최근 정원</b></p><table class="hist">';
    if (!P.hist.length) h += '<tr><td>아직 기록이 없어요</td><td></td></tr>';
    P.hist.slice(0, 15).forEach(function (r) {
      h += '<tr><td>' + r.date.slice(5).replace('-', '/') + ' · ' + G.MODES[r.mode].name + ' <span style="font-family:var(--emoji)">' + T[r.best].emoji + '</span><br><small style="color:var(--muted)">' + seasonLabel(r.turn) + '까지</small></td><td>' + fmt(r.score) + '</td></tr>';
    });
    h += '</table><p style="margin-top:14px"><b>레벨 보상</b></p><ul>' + UNLOCKS.map(function (u) { return '<li>' + (L >= u.lv ? '✅ ' : '🔒 ') + 'Lv.' + u.lv + ' ' + u.text + '</li>'; }).join('') + '</ul>' +
      '<button class="sbtn primary" data-close>닫기</button>';
    openModal(h);
  }

  function settings() {
    var L = lv();
    var sw = function (id, on, title, sub) { return '<div class="srow"><span>' + title + (sub ? '<small>' + sub + '</small>' : '') + '</span><label class="switch"><input type="checkbox" data-s="' + id + '"' + (on ? ' checked' : '') + '><span></span></label></div>'; };
    var themes = [['auto', '기기 따라'], ['light', '밝게'], ['dark', '어둡게'], ['sakura', '벚꽃'], ['sea', '바다'], ['sunset', '노을']];
    var h = '<h3>설정</h3>';
    if (FS.supported()) {
      h += '<button class="sbtn primary" data-a="fs">' + (FS.on() ? '전체화면 끝내기' : '전체화면 켜기') + '</button>';
      h += sw('autoFS', P.set.autoFS, '자동 전체화면', '화면을 처음 누르면 주소창 없이 전체화면으로 바꿔요');
    } else if (!isStandalone()) {
      h += '<button class="sbtn" data-a="fs">전체화면으로 보기</button>';
    }
    h += sw('sound', P.set.sound, '소리') + sw('vib', P.set.vib, '진동') +
      sw('nums', P.set.nums, '단계 숫자 보기', '타일 귀퉁이에 몇 단계인지 숫자를 보여 줘요') +
      sw('confirm', P.set.confirm, '두 번 눌러 심기', '처음 누르면 합쳐지는 모양을 미리 보여 주고, 한 번 더 누르면 심어요') +
      sw('wake', P.set.wake, '화면 켜 두기', '정원을 가꾸는 동안 화면이 꺼지지 않게 해요');
    h += '<div class="srow"><span>테마</span><div class="seg">' + themes.map(function (t) {
      var need = themeLv(t[0]), lock = need > L;
      return '<button data-t="' + t[0] + '"' + (P.set.theme === t[0] ? ' class="on"' : '') + (lock ? ' disabled title="Lv.' + need + '"' : '') + '>' + (lock ? '🔒' : '') + t[1] + '</button>';
    }).join('') + '</div></div>';
    if (!isStandalone()) h += '<button class="sbtn" data-a="inst">📲 홈 화면에 설치하기</button>';
    h += '<button class="sbtn danger" data-a="reset">모든 기록 지우기</button><button class="sbtn primary" data-close>닫기</button>';
    var d = openModal(h);
    d.addEventListener('change', function (e) {
      var s = e.target.dataset.s; if (!s) return;
      P.set[s] = e.target.checked; saveP(); applyTheme();
      if (s === 'wake') { if (P.set.wake && !$('game').classList.contains('hidden')) wake.on(); else wake.off(); }
      if (s === 'confirm' && st) clearPreview();
    });
    d.addEventListener('click', function (e) {
      var t = e.target.closest('[data-t]');
      if (t && !t.disabled) { P.set.theme = t.dataset.t; saveP(); applyTheme(); d.querySelectorAll('[data-t]').forEach(function (b) { b.classList.toggle('on', b === t); }); return; }
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.dataset.a; d.close();
      if (a === 'fs') FS.toggle();
      else if (a === 'inst') installSheet();
      else if (a === 'reset') confirmBox('모든 기록을 지울까요?', '레벨, 배지, 도감, 점수, 가꾸던 정원이 모두 지워져요. 되돌릴 수 없어요.', '모두 지우기', function () {
        try { localStorage.removeItem(KEY); } catch (e) {} location.reload();
      }, true);
    });
  }

  // ---------- 화면 꺼짐 방지 ----------
  var wake = {
    lock: null, want: false,
    on: function () {
      wake.want = true;
      if (!P.set.wake || wake.lock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      try { navigator.wakeLock.request('screen').then(function (l) { wake.lock = l; l.addEventListener('release', function () { wake.lock = null; }); }).catch(function () {}); } catch (e) {}
    },
    off: function () { wake.want = false; if (wake.lock) { try { wake.lock.release(); } catch (e) {} wake.lock = null; } }
  };
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { if (wake.want) wake.on(); }
    else { if (st) persist(); saveP(); }
  });
  window.addEventListener('pagehide', function () { if (st) persist(); saveP(); });

  // ---------- 전체화면·홈 화면 설치 ----------
  var FS = {
    userExit: false,
    supported: function () { var d = document.documentElement; return !!(d.requestFullscreen || d.webkitRequestFullscreen) && !isStandalone() && !inFrame; },
    on: function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
    enter: function () {
      var d = document.documentElement;
      try { var r = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : (d.webkitRequestFullscreen && d.webkitRequestFullscreen()); if (r && r.catch) r.catch(function () {}); } catch (e) {}
    },
    exit: function () {
      try { var r = document.exitFullscreen ? document.exitFullscreen() : (document.webkitExitFullscreen && document.webkitExitFullscreen()); if (r && r.catch) r.catch(function () {}); } catch (e) {}
    },
    toggle: function () {
      if (!FS.supported()) { installSheet(); return; }   // 아이폰·iframe 처럼 전체화면이 막힌 곳은 설치 방법 안내
      if (FS.on()) { FS.userExit = true; FS.exit(); } else { FS.userExit = false; FS.enter(); }
    }
  };
  var installEvt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; paintInstall(); });
  window.addEventListener('appinstalled', function () { installEvt = null; P.ui.installDismissed = true; saveP(); paintInstall(); queueToast('홈 화면에 설치했어요'); });
  function paintInstall() {
    var sa = isStandalone();
    $('banner').classList.toggle('hidden', sa || inFrame || P.ui.installDismissed);
    $('bFs').classList.toggle('hidden', !FS.supported());
    $('hInst').classList.toggle('hidden', sa);
  }
  function doInstall() {
    var ev = installEvt; installEvt = null;
    try {
      ev.prompt();
      ev.userChoice.then(function (r) { if (r && r.outcome === 'accepted') { P.ui.installDismissed = true; saveP(); } paintInstall(); }).catch(function () {});
    } catch (e) { installSheet(); }
  }
  function installSheet() {
    if (isStandalone()) { queueToast('이미 홈 화면 앱으로 실행 중이에요'); return; }
    if (installEvt) { doInstall(); return; }
    var ua = navigator.userAgent;
    var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var samsung = /SamsungBrowser/i.test(ua), inapp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(ua);
    var mobile = /Android|Mobi/i.test(ua) || ios;
    var kbd = function (t) { return '<span class="kbd">' + t + '</span>'; };
    var how;
    if (location.protocol === 'file:') how = '<p>지금은 파일로 열려 있어서 설치할 수 없어요. 휴대폰 크롬이나 사파리에서 아래 주소로 열어 주세요.</p><p><b>immanueladmin1985-dev.github.io/my-apps/season-garden/</b></p>';
    else if (inapp) how = '<ol><li>오른쪽 아래(또는 위) ' + kbd('⋮') + ' 메뉴를 누르세요</li><li><b>다른 브라우저로 열기</b>(크롬·사파리)를 누르세요</li><li>열린 화면에서 다시 <b>설치하기</b>를 누르세요</li></ol>';
    else if (ios) how = '<ol><li>사파리 아래(아이패드는 위) ' + kbd('공유 ⬆') + ' 단추를 누르세요</li><li>메뉴를 올려 <b>홈 화면에 추가</b>를 누르세요</li><li>오른쪽 위 <b>추가</b>를 누르세요</li></ol><p>아이폰·아이패드는 홈 화면 앱으로 열어야 주소창 없이 넓게 보여요.</p>';
    else if (samsung) how = '<ol><li>아래 ' + kbd('≡') + ' 메뉴를 누르세요</li><li><b>현재 페이지 추가</b> → <b>홈 화면</b>을 누르세요</li></ol>';
    else if (mobile) how = '<ol><li>오른쪽 위 ' + kbd('⋮') + ' 메뉴를 누르세요</li><li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누르세요</li><li>뜨는 창에서 <b>설치</b>를 누르세요</li></ol>';
    else how = '<ol><li>크롬·엣지 주소창 오른쪽의 ' + kbd('설치 ⊕') + ' 아이콘을 누르세요</li><li>없으면 ' + kbd('⋮') + ' 메뉴 → <b>앱 설치</b>(또는 <b>앱</b> → <b>이 사이트를 앱으로 설치</b>)를 누르세요</li></ol>';
    openModal('<h3>홈 화면에 설치하기</h3><p>설치하면 아이콘으로 바로 열리고, 주소창 없이 화면을 넓게 쓸 수 있어요. 인터넷이 없어도 열려요.</p>' + how + '<button class="sbtn primary" data-close>알겠어요</button>');
  }
  $('bInst').addEventListener('click', installSheet);
  $('bFs').addEventListener('click', FS.toggle);
  $('bLater').addEventListener('click', function () { P.ui.installDismissed = true; saveP(); paintInstall(); queueToast('첫 화면 아래와 설정에서 언제든 설치할 수 있어요'); });
  $('hInst').addEventListener('click', installSheet);
  document.addEventListener('click', function (e) {
    if (!P.set.autoFS || FS.userExit || FS.on() || !FS.supported()) return;
    if (e.target.closest && e.target.closest('#banner, .dim')) return;
    FS.enter();
  }, true);
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (n) { document.addEventListener(n, function () { paintInstall(); setTimeout(fit, 120); }); });

  // ---------- 첫 화면 단추 ----------
  $('hCont').addEventListener('click', function () { var s = latestSave(); if (s) resumeGame(s.mode); });
  $('hNew').addEventListener('click', modePicker);
  $('hDaily').addEventListener('click', function () { openMode('daily'); });
  $('hBook').addEventListener('click', book);
  $('hBadge').addEventListener('click', badges);
  $('hRec').addEventListener('click', records);
  $('hHow').addEventListener('click', howTo);
  $('hSet').addEventListener('click', settings);

  window.addEventListener('resize', function () { fit(); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  // 자동 점검용 (Playwright)
  window.__garden = {
    get st() { return st; }, get busy() { return busy; }, P: P,
    setFast: function (v) { fast = v; },
    place: doPlace, gameOver: function () { gameOver(); },
    best: function () { return st && G.bestMove(st); }
  };

  applyTheme();
  show('home');
})();
