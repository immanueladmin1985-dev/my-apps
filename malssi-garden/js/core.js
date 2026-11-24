// 말씨정원 공통: 저장, 재화, 연속 학습, 퀘스트, 소리, 발음, 창
(function () {
  if (window.parseLangs) window.parseLangs();   // 학습 내용 읽기 (추가 단어장 포함)
  var M = window.M = {};
  var KEY = 'malssi-garden-v1';
  M.$ = function (id) { return document.getElementById(id); };
  M.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  M.fmt = function (n) { return Number(n || 0).toLocaleString('ko-KR'); };
  M.rand = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  M.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  M.shuffle = function (arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  M.fast = false;   // 자동 점검 때 기다림을 없앤다
  M.wait = function (ms) { return new Promise(function (r) { setTimeout(r, M.fast ? 0 : ms); }); };

  // ---------- 날짜 ----------
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  M.today = function () { return ymd(M.now()); };
  M.now = function () { return new Date(Date.now() + (M.dayShift || 0) * 86400000); };
  M.dayShift = 0;   // 자동 점검에서 날짜를 옮겨 볼 때 쓴다
  M.addDays = function (s, n) { var p = s.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2] + n); return ymd(d); };
  M.daysBetween = function (a, b) { var pa = a.split('-'), pb = b.split('-'); return Math.round((new Date(+pb[0], +pb[1] - 1, +pb[2]) - new Date(+pa[0], +pa[1] - 1, +pa[2])) / 86400000); };
  M.weekStart = function (s) { var p = s.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); var w = (d.getDay() + 6) % 7; return M.addDays(s, -w); };

  // ---------- 저장 ----------
  M.defaults = function () {
    return {
      v: 3, started: false, lang: 'ja', petName: '말랑이',
      water: 30, coins: 60, fp: 0, xp: 0,
      prog: { ja: {}, en: {}, zh: {} }, srs: {},
      streak: 0, best: 0, lastDay: '', freeze: 0, miles: {},
      log: {},
      daily: { day: '', quests: [], bigClaimed: false, gift: false },
      week: { start: '', claimed: false },
      garden: { cells: [], open: 20 },
      pet: { lv: 1, exp: 0, full: 70, fullAt: Date.now(), petDay: '', petN: 0 },
      room: { owned: {}, placed: {} },
      rewards: [
        { id: 'r1', e: '💆', name: '어깨 안마 10분', price: 100 },
        { id: 'r2', e: '🧽', name: '설거지 면제권', price: 200 },
        { id: 'r3', e: '☕', name: '커피 기프티콘', price: 300 },
        { id: 'r4', e: '🍰', name: '케이크 쿠폰', price: 500 },
        { id: 'r5', e: '🍽️', name: '외식 한 번', price: 1500 },
        { id: 'r6', e: '🎁', name: '갖고 싶은 선물', price: 3000 }
      ],
      coupons: [],
      admin: { pin: '', weekBonus: 30, rate: 10 },
      requests: [],
      gifts: [],
      set: { sound: true, autoAudio: true, speak: true, rate: 0.9, autoFS: true, wake: true, goal: 2 },
      ui: { installDismissed: false, seenGarden: false, seenHome: false, seenShop: false },
      stats: { lessons: 0, perfect: 0, merges: 0, harvest: 0, golden: 0, speak: 0, correct: 0 }
    };
  };
  function merge(base, saved) {
    Object.keys(saved || {}).forEach(function (k) {
      var v = saved[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], v);
      else base[k] = v;
    });
    return base;
  }
  M.load = function () {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    M.P = merge(M.defaults(), raw || {});
    var g = M.P.garden;
    if (!Array.isArray(g.cells)) g.cells = [];   // 밭 줄 수 맞추기는 garden.js 가 한다
    migrate(M.P); migrate3(M.P);
  };
  // 단계 번호가 바뀐 판(v1 → v2)의 진행 기록을 옮긴다
  function migrate(P) {
    if ((P.v || 1) >= 2) return;
    var old = P.prog || {}, np = { ja: {}, en: {}, zh: {} };
    Object.keys(old.ja || {}).forEach(function (id) {
      var m = id.match(/^ja-1-(\d)$/);
      if (m) { var n = +m[1]; np.ja['ja-1-' + (n * 2 - 1)] = old.ja[id]; np.ja['ja-1-' + (n * 2)] = old.ja[id]; }
      else np.ja[id] = old.ja[id];
    });
    ['en', 'zh'].forEach(function (c) {
      Object.keys(old[c] || {}).forEach(function (id) {
        var m = id.match(/^(\w+)-(\d+)-(\d+)$/);
        if (m) np[c][m[1] + '-' + (+m[2] + 1) + '-' + m[3]] = old[c][id];
      });
    });
    P.prog = np; P.v = 2;
  }
  // v2 → v3: 단계 번호(ja-1-3) 대신 단계 이름(ja:さ행)으로 기록한다
  var V2_TITLES = {"ja-1-1": "あ행", "ja-1-2": "か행", "ja-1-3": "さ행", "ja-1-4": "た행", "ja-1-5": "な행", "ja-1-6": "は행", "ja-1-7": "ま행", "ja-1-8": "や행", "ja-1-9": "ら행", "ja-1-10": "わ·を·ん", "ja-2-1": "하루 인사", "ja-2-2": "고마워요·미안해요", "ja-2-3": "네·아니요", "ja-2-4": "이것·저것", "ja-3-1": "숫자 1 ~ 5", "ja-3-2": "숫자 6 ~ 10", "ja-3-3": "먹고 마시기", "ja-3-4": "식당에서", "ja-4-1": "자기소개", "ja-4-2": "우리 가족", "ja-4-3": "좋아하는 것", "ja-4-4": "어디에 있어요?", "en-1-1": "f 와 p", "en-1-2": "r 과 l", "en-1-3": "b · v · th", "en-2-1": "만나고 헤어질 때", "en-2-2": "고마워요·미안해요", "en-2-3": "네·아니요", "en-2-4": "안부 묻기", "en-3-1": "숫자 1 ~ 5", "en-3-2": "숫자 6 ~ 10", "en-3-3": "색깔", "en-3-4": "동물과 자연", "en-4-1": "마실 것", "en-4-2": "먹을 것", "en-4-3": "카페에서", "en-4-4": "식당에서", "en-5-1": "가족", "en-5-2": "우리 집", "en-5-3": "하는 일", "en-5-4": "어디에 있어요?", "zh-1-1": "네 가지 성조", "zh-1-2": "성조 연습", "zh-1-3": "병음 읽기 ①", "zh-1-4": "병음 읽기 ②", "zh-2-1": "만나고 헤어질 때", "zh-2-2": "고마워요·미안해요", "zh-2-3": "나·너·그", "zh-2-4": "이것·저것", "zh-3-1": "숫자 1 ~ 5", "zh-3-2": "숫자 6 ~ 10", "zh-3-3": "오늘·내일", "zh-3-4": "물건 사기", "zh-4-1": "마실 것·먹을 것", "zh-4-2": "먹고 마시기", "zh-4-3": "좋아하는 음식", "zh-4-4": "식당에서", "zh-5-1": "자기소개", "zh-5-2": "우리 가족", "zh-5-3": "좋아하는 것", "zh-5-4": "어디에 있어요?"};
  function migrate3(P) {
    if ((P.v || 1) >= 3) return;
    ['ja', 'en', 'zh'].forEach(function (c) {
      var o = P.prog[c] || {}, n = {};
      Object.keys(o).forEach(function (id) { var t = V2_TITLES[id]; if (t) n[c + ':' + t] = o[id]; else if (id.indexOf(':') > 0) n[id] = o[id]; });
      P.prog[c] = n;
    });
    if (P.last) Object.keys(P.last).forEach(function (c) { var t = V2_TITLES[P.last[c]]; if (t) P.last[c] = c + ':' + t; });
    P.v = 3;
  }
  // 받침에 맞는 조사를 붙인다: M.j('토끼', '를', '을')가 아니라 M.j(낱말, 받침 있을 때, 받침 없을 때)
  M.j = function (w, withB, noB) {
    w = String(w || ''); var c = w.charCodeAt(w.length - 1) - 0xAC00;
    var has = c >= 0 && c <= 11171 ? c % 28 !== 0 : false;
    return w + (has ? withB : noB);
  };
  M.save = function () { try { localStorage.setItem(KEY, JSON.stringify(M.P)); } catch (e) {} };
  M.exportData = function () { return JSON.stringify({ app: 'malssi-garden', at: new Date().toISOString(), data: M.P }); };
  M.importData = function (text) {
    var o = JSON.parse(text);
    if (!o || o.app !== 'malssi-garden' || !o.data) throw new Error('bad');
    M.P = merge(M.defaults(), o.data); M.save();
  };
  M.reset = function () { try { localStorage.removeItem(KEY); } catch (e) {} };

  // ---------- 재화 ----------
  // 토끼 레벨이 오를수록 물방울을 더 받는다
  M.petBonus = function () { return Math.min(40, (M.P.pet.lv - 1) * 3); };
  M.give = function (o, why) {
    var P = M.P;
    if (o.water) P.water += o.water;
    if (o.coins) P.coins += o.coins;
    if (o.fp) P.fp += o.fp;
    if (o.freeze) P.freeze = Math.min(3, P.freeze + o.freeze);
    M.save(); M.paintTop(true);
  };
  M.spend = function (kind, n) {
    if (M.P[kind] < n) return false;
    M.P[kind] -= n; M.save(); M.paintTop(); return true;
  };
  M.rewardHtml = function (o) {
    var a = [];
    if (o.water) a.push('<span class="rw"><img src="img/water.png" alt="">' + M.fmt(o.water) + '</span>');
    if (o.coins) a.push('<span class="rw"><img src="img/coin.png" alt="">' + M.fmt(o.coins) + '</span>');
    if (o.fp) a.push('<span class="rw fp"><img src="img/flower-point.png" alt="">' + M.fmt(o.fp) + '</span>');
    if (o.freeze) a.push('<span class="rw">🧊 보호권 ' + o.freeze + '</span>');
    return a.join('');
  };
  M.paintTop = function (bump) {
    var P = M.P;
    var set = function (id, v) { var el = M.$(id); if (!el) return; if (el.textContent !== String(v) && bump) { el.parentNode.classList.remove('bump'); void el.offsetWidth; el.parentNode.classList.add('bump'); } el.textContent = v; };
    set('tStreak', P.streak); set('tWater', M.fmt(P.water)); set('tCoin', M.fmt(P.coins)); set('tFp', M.fmt(P.fp));
    var s = M.$('tStreakBox'); if (s) s.classList.toggle('cold', P.lastDay !== M.today());
  };

  // ---------- 하루 기록·연속 학습 ----------
  M.logDay = function (d) { var t = M.today(); var L = M.P.log[t] || (M.P.log[t] = { l: 0, xp: 0, w: 0 }); Object.keys(d).forEach(function (k) { L[k] = (L[k] || 0) + d[k]; }); };
  // 앱을 열 때: 빠진 날이 있으면 보호권을 쓰거나 연속 기록을 끊는다. 알릴 내용을 돌려준다.
  M.checkStreak = function () {
    var P = M.P, t = M.today();
    if (!P.lastDay || P.streak === 0) return null;
    var gap = M.daysBetween(P.lastDay, t) - 1;   // 공부하지 않고 지나간 날 수
    if (gap <= 0) return null;
    if (P.freeze >= gap) {
      P.freeze -= gap; P.lastDay = M.addDays(t, -1); M.save();
      return { kind: 'saved', n: gap };
    }
    var lost = P.streak; P.streak = 0; M.save();
    return { kind: 'lost', n: lost };
  };
  var MILES = [[3, 5], [7, 15], [14, 30], [30, 80], [50, 120], [100, 300], [200, 500], [365, 1000]];
  M.milestones = MILES;
  // 레슨을 끝냈을 때 호출. 새로 늘었으면 true
  M.markStudy = function () {
    var P = M.P, t = M.today();
    if (P.lastDay === t) return false;
    if (P.lastDay === M.addDays(t, -1)) P.streak += 1; else P.streak = 1;
    P.lastDay = t; P.best = Math.max(P.best, P.streak);
    M.save(); return true;
  };
  M.pendingMilestone = function () {
    var P = M.P;
    for (var i = 0; i < MILES.length; i++) if (P.streak >= MILES[i][0] && !P.miles[MILES[i][0]]) return MILES[i];
    return null;
  };

  // ---------- 주간 목표 ----------
  M.weekDays = function () {
    var P = M.P, ws = M.weekStart(M.today()), n = 0;
    for (var i = 0; i < 7; i++) { var d = M.addDays(ws, i), L = P.log[d]; if (L && L.l > 0) n++; }
    return n;
  };
  M.weekState = function () {
    var P = M.P, ws = M.weekStart(M.today());
    if (P.week.start !== ws) { P.week = { start: ws, claimed: false }; M.save(); }
    return { days: M.weekDays(), need: 5, claimed: P.week.claimed, bonus: P.admin.weekBonus };
  };

  // ---------- 오늘의 퀘스트 ----------
  M.speechOK = function () { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); };
  var QUESTS = {
    lesson: { needs: [2, 3], text: function (n) { return '레슨 ' + n + '판 끝내기'; }, icon: '📖' },
    perfect: { needs: [1], text: function () { return '실수 없이 레슨 끝내기'; }, icon: '⭐' },
    listen: { needs: [5, 8], text: function (n) { return '듣기 문제 ' + n + '개 맞히기'; }, icon: '🎧' },
    speak: { needs: [2, 3], text: function (n) { return '따라 말하기 ' + n + '번 성공'; }, icon: '🎤', ok: function () { return M.speechOK() && M.P.set.speak; } },
    merge: { needs: [5, 8], text: function (n) { return '정원에서 ' + n + '번 합치기'; }, icon: '🌱' },
    feed: { needs: [1], text: function () { return M.P.petName + '에게 먹이 주기'; }, icon: '🥕' },
    combo: { needs: [5, 8], text: function (n) { return n + '문제 연속으로 맞히기'; }, icon: '🔥', max: true },
    review: { needs: [1], text: function () { return '복습 1판 하기'; }, icon: '🔁', ok: function () { return M.learnedCount() >= 6; } },
    harvest: { needs: [2], text: function (n) { return '정원에서 ' + n + '번 팔기'; }, icon: '🧺' },
    order: { needs: [2, 3], text: function (n) { return '손님 의뢰 ' + n + '개 채우기'; }, icon: '📦' },
    craft: { needs: [1], text: function () { return '작업대에서 1개 만들기'; }, icon: '🛠️', ok: function () { return (M.P.garden.lv || 1) >= 4; } }
  };
  M.QUESTS = QUESTS;
  M.dailyState = function () {
    var P = M.P, t = M.today();
    if (P.daily.day !== t) {
      var pool = Object.keys(QUESTS).filter(function (k) { return k !== 'lesson' && (!QUESTS[k].ok || QUESTS[k].ok()); });
      var chosen = ['lesson'].concat(M.shuffle(pool).slice(0, 2));
      P.daily = { day: t, bigClaimed: false, gift: false, quests: chosen.map(function (id) { return { id: id, need: M.pick(QUESTS[id].needs), have: 0, claimed: false }; }) };
      M.save();
    }
    return P.daily;
  };
  M.quest = function (id, n) {
    var D = M.dailyState(), changed = false;
    D.quests.forEach(function (q) {
      if (q.id !== id || q.have >= q.need) return;
      var before = q.have;
      q.have = QUESTS[id].max ? Math.max(q.have, n) : q.have + (n || 1);
      q.have = Math.min(q.have, q.need);
      if (q.have >= q.need && before < q.need) { changed = true; M.toast(QUESTS[id].icon + ' 퀘스트 완료! 상자를 열어 보세요'); }
    });
    M.save(); if (M.paintBadges) M.paintBadges();
    return changed;
  };
  M.questReady = function () {
    var D = M.dailyState(), n = 0;
    D.quests.forEach(function (q) { if (q.have >= q.need && !q.claimed) n++; });
    if (D.quests.every(function (q) { return q.claimed; }) && !D.bigClaimed) n++;
    var W = M.weekState(); if (W.days >= W.need && !W.claimed) n++;
    if (M.pendingMilestone()) n++;
    return n;
  };
  // 상자에서 나오는 보상. 무엇이 나올지 몰라야 재미있다.
  M.rollChest = function (big) {
    var r = Math.random(), o = {};
    if (big) {
      o.water = M.rand(30, 60); o.coins = M.rand(30, 70);
      o.fp = M.rand(3, 6); if (r < 0.15) o.fp += 10;
      if (Math.random() < 0.2) o.freeze = 1;
    } else {
      if (r < 0.45) o.water = M.rand(15, 30);
      else if (r < 0.85) o.coins = M.rand(15, 40);
      else { o.fp = M.rand(1, 3); o.water = 10; }
    }
    return o;
  };

  // ---------- 복습 (간격 반복) ----------
  var GAP = [0, 1, 2, 4, 7, 15, 30];
  M.itemKey = function (it) { return it.lang + ':' + it.t; };
  M.srsHit = function (it, ok) {
    var k = M.itemKey(it), s = M.P.srs[k] || [0, 0];
    if (ok) { s[0] = Math.min(6, s[0] + 1); s[1] = Date.now() + GAP[s[0]] * 86400000; }
    else { s[0] = 0; s[1] = Date.now(); }
    M.P.srs[k] = s;
  };
  M.learnedItems = function (lang) {
    var L = window.LANGS[lang], out = [];
    L.stages.forEach(function (s) { if (M.P.prog[lang][s.id]) out = out.concat(s.items); });
    return out;
  };
  M.learnedCount = function (lang) {
    if (lang) return M.learnedItems(lang).length;
    return M.learnedItems('ja').length + M.learnedItems('en').length + M.learnedItems('zh').length;
  };
  M.dueItems = function (lang) {
    var now = Date.now();
    return M.learnedItems(lang).filter(function (it) { var s = M.P.srs[M.itemKey(it)]; return !s || s[1] <= now; });
  };

  // ---------- 효과음 ----------
  var ac = null;
  function actx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, t0, dur, type, vol) {
    var c = actx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, c.currentTime + t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
  }
  M.sfx = function (name) {
    if (!M.P || !M.P.set.sound) return;
    try {
      if (name === 'ok') { tone(784, 0, 0.12); tone(1175, 0.09, 0.2); }
      else if (name === 'bad') { tone(220, 0, 0.18, 'triangle', 0.2); tone(180, 0.12, 0.22, 'triangle', 0.2); }
      else if (name === 'pop') { tone(520, 0, 0.08, 'sine', 0.15); tone(880, 0.05, 0.1, 'sine', 0.12); }
      else if (name === 'merge') { tone(660, 0, 0.1); tone(880, 0.07, 0.1); tone(1320, 0.14, 0.18); }
      else if (name === 'coin') { tone(1320, 0, 0.08, 'square', 0.06); tone(1760, 0.07, 0.15, 'square', 0.06); }
      else if (name === 'win') { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, 0.25); }); }
      else if (name === 'tap') { tone(600, 0, 0.05, 'sine', 0.08); }
    } catch (e) {}
  };
  M.buzz = function (ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };

  // ---------- 발음 듣기 (기기 음성 합성) ----------
  var voices = [];
  function loadVoices() { try { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { voices = []; } }
  if (window.speechSynthesis) { loadVoices(); try { speechSynthesis.onvoiceschanged = loadVoices; } catch (e) {} }
  M.ttsOK = function () { return !!window.speechSynthesis; };
  M.say = function (text, lang, slow) {
    if (!window.speechSynthesis) return;
    try {
      var code = window.LANGS[lang].voice;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = code; u.rate = slow ? 0.55 : (M.P.set.rate || 0.9);
      var pre = code.slice(0, 2), v = voices.filter(function (x) { return x.lang && x.lang.replace('_', '-').indexOf(code) === 0; })[0] ||
        voices.filter(function (x) { return x.lang && x.lang.slice(0, 2) === pre; })[0];
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  };

  // ---------- 따라 말하기 (음성 인식) ----------
  M.listen = function (lang) {
    return new Promise(function (res, rej) {
      var R = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!R) { rej(new Error('none')); return; }
      var r; try { r = new R(); } catch (e) { rej(e); return; }
      r.lang = window.LANGS[lang].voice; r.interimResults = false; r.maxAlternatives = 5;
      var done = false, out = [];
      r.onresult = function (e) {
        for (var i = 0; i < e.results.length; i++) for (var j = 0; j < e.results[i].length; j++) out.push(e.results[i][j].transcript);
      };
      r.onerror = function (e) { if (!done) { done = true; rej(new Error(e.error || 'error')); } };
      r.onend = function () { if (!done) { done = true; res(out); } };
      try { r.start(); } catch (e) { rej(e); }
      M._rec = r;
    });
  };
  M.norm = function (s, lang) {
    return String(s || '').toLowerCase().replace(/[\s.,!?！？。、，'’"・~]/g, '');
  };
  function lev(a, b) {
    var m = a.length, n = b.length, d = [];
    for (var i = 0; i <= m; i++) { d[i] = [i]; }
    for (var j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  M.similar = function (heard, targets, lang) {
    var best = 0;
    heard.forEach(function (h) {
      var a = M.norm(h, lang);
      targets.forEach(function (t) {
        var b = M.norm(t, lang); if (!a || !b) return;
        var s = 1 - lev(a, b) / Math.max(a.length, b.length);
        if (a.indexOf(b) >= 0) s = Math.max(s, 0.9);
        best = Math.max(best, s);
      });
    });
    return best;
  };

  // ---------- 알림 띠·창 ----------
  var toastQ = [], toastOn = false;
  M.toast = function (msg) { toastQ.push(msg); if (toastQ.length > 2) toastQ.splice(0, toastQ.length - 2); if (!toastOn) nextToast(); };
  function nextToast() {
    var m = toastQ.shift(); if (!m) { toastOn = false; return; }
    toastOn = true;
    var el = document.createElement('div'); el.className = 'toast'; el.textContent = m;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, M.fast ? 0 : 1900);
    setTimeout(function () { el.remove(); nextToast(); }, M.fast ? 0 : 2200);
  }
  // 창 열기. html 안의 [data-close] 를 누르면 닫힌다.
  M.modal = function (html, opt) {
    opt = opt || {};
    var dim = document.createElement('div'); dim.className = 'dim' + (opt.cls ? ' ' + opt.cls : '');
    dim.innerHTML = '<div class="sheet" role="dialog">' + html + '</div>';
    document.body.appendChild(dim);
    var box = dim.firstChild;
    box.close = function () { if (!dim.parentNode) return; dim.remove(); if (opt.onClose) opt.onClose(); };
    dim.addEventListener('click', function (e) {
      if (e.target === dim && !opt.sticky) box.close();
      if (e.target.closest('[data-close]')) box.close();
    });
    return box;
  };
  M.confirm = function (title, body, okText, fn, danger) {
    var d = M.modal('<h3>' + title + '</h3><p>' + body + '</p><div class="row2"><button class="btn ghost" data-close>취소</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" data-ok>' + okText + '</button></div>');
    d.querySelector('[data-ok]').addEventListener('click', function () { d.close(); fn(); });
    return d;
  };
  // 상자 열기 연출
  M.openChest = function (o, title) {
    M.sfx('pop');
    var d = M.modal('<div class="chest"><img class="cimg shake" src="img/chest-closed.png" alt=""><h3>' + (title || '보물상자') + '</h3><p class="hint">상자를 눌러 열어 보세요</p><div class="rws hidden"></div><button class="btn primary hidden" data-close>받기</button></div>', { sticky: true });
    var img = d.querySelector('.cimg'), opened = false;
    var open = function () {
      if (opened) return; opened = true;
      img.classList.remove('shake'); img.src = 'img/chest-open.png'; img.classList.add('popin');
      d.querySelector('.hint').classList.add('hidden');
      var rw = d.querySelector('.rws'); rw.innerHTML = M.rewardHtml(o); rw.classList.remove('hidden');
      d.querySelector('[data-close]').classList.remove('hidden');
      M.give(o); M.sfx('win'); M.buzz(30);
    };
    img.addEventListener('click', open);
    d.querySelector('.hint').addEventListener('click', open);
    if (M.fast) open();
    return d;
  };

  // 보상 아이콘이 위쪽 숫자로 날아가는 연출
  M.fly = function (fromEl, src, toId, n) {
    var to = M.$(toId); if (M.fast || !fromEl || !to || !document.body.animate) return;
    var a = fromEl.getBoundingClientRect(), b = to.getBoundingClientRect();
    for (var i = 0; i < Math.max(1, n || 1); i++) (function (i) {
      var im = document.createElement('img'); im.className = 'flyicon'; im.src = src;
      var sx = a.left + a.width / 2 + (Math.random() - .5) * 30, sy = a.top + a.height / 2 + (Math.random() - .5) * 20;
      im.style.left = sx + 'px'; im.style.top = sy + 'px'; document.body.appendChild(im);
      var dx = b.left + b.width / 2 - sx, dy = b.top + b.height / 2 - sy;
      var an = im.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(calc(-50% + ' + (Math.random() - .5) * 60 + 'px), calc(-50% - 30px)) scale(1.1)', opacity: 1, offset: .25 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(.7)', opacity: 1 }], { duration: 650, delay: i * 70, easing: 'cubic-bezier(.5,0,.7,1)', fill: 'backwards' });
      an.onfinish = function () { im.parentNode && im.parentNode.removeChild(im); var p = to.parentNode; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); };
    })(i);
  };

  // PIN 은 기기에만 저장하므로 간단한 해시로 충분하다
  M.hashPin = function (s) { var h = 5381; s = 'malssi:' + s; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
})();
