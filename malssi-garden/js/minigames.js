// 손님 부탁 미니게임 (말씨정원).
// 손님과 친해지면(♥) 그 손님의 부탁이 열리고, 하루에 한 번 가판대 위에 ❗로 부탁하러 온다.
// 부탁은 배운 낱말로 하는 짧은 놀이이고, 들어주면 코인·친밀도를 받는다.
(function () {
  var M = window.M, $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var HAN = /[一-鿿]/;

  var MINIS = [
    { id: 'acorn', cust: 'squirrel', heart: 1, icon: '🌰', name: '도토리 줍기',
      ask: '겨울 준비를 하는데 도토리에 낯선 글자가 써 있어요! 위에 적힌 뜻과 맞는 도토리만 주워 줄래요?', how: '뜻에 맞는 도토리를 눌러요. 틀리면 시간이 줄어요.', thanks: '덕분에 겨울 내내 배부르겠어요!' },
    { id: 'song', cust: 'chick', heart: 1, icon: '🎈', name: '삐약이 소리 풍선',
      ask: '삐약! 제가 들은 말을 풍선에 적어 뒀는데 헷갈려요. 소리를 듣고 맞는 풍선을 터뜨려 주세요!', how: '소리를 잘 듣고 같은 말이 적힌 풍선을 눌러요. 빨리 맞힐수록 점수가 커요.', thanks: '삐약삐약! 이제 다 알아들었어요!' },
    { id: 'memory', cust: 'bear', heart: 1, icon: '🍯', name: '꿀단지 짝 맞추기',
      ask: '꿀단지 뚜껑에 낱말과 뜻을 나눠 적어 뒀는데 섞여 버렸어요. 짝을 맞춰 줄래요?', how: '두 개씩 뒤집어서 낱말과 뜻이 맞는 짝을 찾아요. 적게 뒤집을수록 좋아요.', thanks: '꿀단지 정리 끝! 고마워요, 친구!' }
  ];
  function gs() { return M.gardenState(); }
  function state() { var g = gs(); g.mini = g.mini || { day: '', done: {}, best: {}, seen: {} }; if (g.mini.day !== M.today()) { g.mini.day = M.today(); g.mini.done = {}; } return g.mini; }
  function hearts(id) { return Math.floor((gs().friends[id] || 0) / 4); }
  function isOpen(m) { var c = M.custOf(m.cust); return c && gs().lv >= c.lv && hearts(m.cust) >= m.heart; }
  function byId(id) { return MINIS.filter(function (m) { return m.id === id; })[0]; }

  // 가판대에 서 있는 손님이 오늘 할 부탁이 있으면 그 놀이 id 를 돌려준다
  M.miniAvail = function (custId) {
    if (!M.gardenState) return null;
    var m = MINIS.filter(function (x) { return x.cust === custId && isOpen(x); })[0];
    return m && !state().done[m.id] ? m.id : null;
  };
  M.miniFor = function (custId) { var m = MINIS.filter(function (x) { return x.cust === custId; })[0]; return m ? { id: m.id, icon: m.icon, name: m.name, heart: m.heart, open: isOpen(m) } : null; };
  // ♥가 올라 부탁이 새로 열리면 알려 준다
  M.miniUnlockedNow = function (custId, lvl) {
    var m = MINIS.filter(function (x) { return x.cust === custId && x.heart === lvl; })[0]; if (!m) return;
    var st = state(); if (st.seen[m.id]) return; st.seen[m.id] = 1; M.save();
    setTimeout(function () { if (M.toast) M.toast('❗ ' + M.custOf(custId).name + '에게 부탁이 생겼어요! 가판대에서 눌러 보세요'); }, 1200);
  };

  // ---------- 낱말 고르기 ----------
  function words(n) {
    var lang = M.P.lang, seen = {}, out = [];
    var src = M.learnedItems(lang);
    if (src.length < n + 2) { var L = window.LANGS[lang]; L.stages.slice(0, 6).forEach(function (s) { src = src.concat(s.items); }); }
    M.shuffle(src).forEach(function (it) { if (out.length < n && it.k && it.t && !seen[it.k] && !seen[it.t] && it.t.length <= 12) { seen[it.k] = seen[it.t] = 1; out.push(it); } });
    return out;
  }
  function wordHtml(it) { return '<b class="lang-' + it.lang + '">' + esc(it.t) + '</b>' + (it.lang === 'ja' && it.r && HAN.test(it.t) ? '<small>' + esc(it.r) + '</small>' : it.lang === 'zh' && it.r && !it.kana ? '<small>' + esc(it.r.split(' · ')[0]) + '</small>' : ''); }

  // ---------- 화면 ----------
  var cur = null;   // 지금 하는 놀이
  function custFace(m, happy) { var src = M.custImg(m.cust, happy), c = M.custOf(m.cust); return src ? '<img class="mface" src="' + src + '" alt="">' : '<span class="mface em">' + c.em + '</span>'; }
  M.miniIntro = function (id) {
    var m = byId(id); if (!m || !isOpen(m)) return;
    var c = M.custOf(m.cust), st = state();
    var d = M.modal('<div class="mintro">' + custFace(m, false) + '<div class="msay"><b>' + esc(c.name) + '</b><p>' + esc(m.ask) + '</p></div></div>' +
      '<h3>' + m.icon + ' ' + esc(m.name) + '</h3><p class="hint">' + esc(m.how) + '</p>' +
      '<p class="hint">' + (st.done[m.id] ? '오늘은 이미 도와줬어요. 연습으로 더 할 수 있어요.' : '오늘 처음 도와주면 친밀도 +1 · 보상 두 배') + (st.best[m.id] ? ' · 최고 기록 ' + st.best[m.id] + '점' : '') + '</p>' +
      '<button class="btn primary wide" id="mGo">도와줄게요!</button><button class="btn ghost wide" data-close>다음에</button>');
    d.querySelector('#mGo').onclick = function () { d.close(); start(m); };
  };
  function start(m) {
    if (cur) { cur.alive = false; cur.timers.forEach(function (t) { clearInterval(t); clearTimeout(t); }); if (cur.raf) cancelAnimationFrame(cur.raf); }   // 하던 놀이는 멈춘다
    var el = $('mini'); if (!el) { el = document.createElement('div'); el.id = 'mini'; el.className = 'mgame'; document.body.appendChild(el); }
    el.innerHTML = '<div class="mhead"><button class="ib" id="mQuit" aria-label="그만하기">✕</button><span class="mgt">' + m.icon + ' ' + esc(m.name) + '</span><span class="mscore" id="mScore">0점</span></div><div class="mtime"><i id="mTime"></i></div><div class="mbody" id="mBody"></div>';
    el.classList.remove('hidden'); document.body.classList.add('in-mini');
    cur = { m: m, score: 0, alive: true, timers: [] };
    $('mQuit').onclick = function () { M.confirm('그만할까요?', '지금까지 한 것은 보상이 없어요.', '그만하기', function () { stop(); }); };
    GAMES[m.id](cur);
  }
  function stop() {
    if (cur) { cur.alive = false; cur.timers.forEach(function (t) { clearInterval(t); clearTimeout(t); }); if (cur.raf) cancelAnimationFrame(cur.raf); }
    cur = null; var el = $('mini'); if (el) { el.classList.add('hidden'); el.innerHTML = ''; } document.body.classList.remove('in-mini');
    if ($('gardenView') && M.renderGarden && !$('gardenView').hidden) M.renderGarden($('gardenView'));
  }
  function setScore(g, n) { g.score = Math.max(0, n); var s = $('mScore'); if (s) s.textContent = g.score + '점'; }
  function timeBar(g, total, onEnd) {
    g.left = total; var t0 = Date.now(), bar = $('mTime');
    var iv = setInterval(function () {
      if (!g.alive) return;
      g.left -= 0.1; if (bar) bar.style.width = Math.max(0, g.left / total * 100) + '%';
      if (g.left <= 0) { clearInterval(iv); onEnd(); }
    }, 100);
    g.timers.push(iv);
  }
  function finish(g, maxScore) {
    if (!g.alive) return; g.alive = false;
    var m = g.m, st = state(), first = !st.done[m.id], c = M.custOf(m.cust);
    var ratio = Math.min(1, g.score / maxScore), stars = ratio >= 0.8 ? 3 : ratio >= 0.45 ? 2 : g.score > 0 ? 1 : 0;
    var coins = Math.round((10 + 30 * ratio) * (first ? 2 : 1)), water = first ? 10 + stars * 5 : 0;
    var best = st.best[m.id] || 0; if (g.score > best) st.best[m.id] = g.score;
    if (first && stars > 0) st.done[m.id] = 1;
    M.give({ coins: coins, water: water }); if (M.petExp) M.petExp(2 + stars);
    M.save(); M.sfx(stars ? 'win' : 'bad');
    var lines = (window.STORY_LINES || {})[M.P.lang] || [], ln = lines[0];
    var el = $('mBody'); if (!el) return;
    el.innerHTML = '<div class="mres">' + custFace(m, stars > 0) + '<div class="msay"><b>' + esc(c.name) + '</b><p>' + esc(stars ? m.thanks : '괜찮아요, 다음에 또 부탁할게요!') + '</p>' +
      (stars && ln ? '<button class="sline" data-say="' + esc(ln[0]) + '" data-lang="' + M.P.lang + '">🔊 <b class="lang-' + M.P.lang + '">' + esc(ln[0]) + '</b> = ' + esc(ln[1]) + '</button>' : '') + '</div></div>' +
      '<div class="mstars">' + '⭐'.repeat(stars) + '☆'.repeat(3 - stars) + '</div><p class="center"><b>' + g.score + '점</b>' + (g.score > best ? ' · 최고 기록!' : '') + '</p>' +
      '<div class="center">' + M.rewardHtml({ coins: coins, water: water }) + '</div>' +
      (first && stars ? '<p class="hint center">' + esc(c.name) + '의 친밀도가 올랐어요 ♥</p>' : first ? '<p class="hint center">별을 하나 이상 받으면 오늘 부탁을 들어준 거예요</p>' : '') +
      '<button class="btn primary wide" id="mAgain">한 번 더</button><button class="btn ghost wide" id="mClose">가게로 돌아가기</button>';
    $('mAgain').onclick = function () { start(m); };
    $('mClose').onclick = function () { stop(); if (first && stars) M.gardenFriendUp(m.cust); };
    if (first && stars) $('mAgain').onclick = function () { M.gardenFriendUp(m.cust); start(m); };
  }

  // ---------- 놀이들 ----------
  var GAMES = {};
  // 도토리 줍기: 위에 뜻이 나오고, 낱말이 적힌 도토리 넷이 떨어진다. 맞는 것을 누른다
  GAMES.acorn = function (g) {
    var pool = words(16); if (pool.length < 4) { $('mBody').innerHTML = '<p class="center">낱말을 조금 더 배우고 와 주세요!</p>'; return; }
    $('mBody').innerHTML = '<div class="aq" id="aQ"></div><div class="afield" id="aF"></div>';
    var field = $('aF'), speed = 0.18, drops = [], target = null;
    function round() {
      if (!g.alive) return;
      field.innerHTML = ''; drops = [];
      var four = M.shuffle(pool).slice(0, 4); target = four[0];
      $('aQ').innerHTML = (target.e ? '<span class="ae">' + target.e + '</span>' : '') + '<b>' + esc(target.k) + '</b>';
      M.shuffle(four).forEach(function (it, i) {
        var b = document.createElement('button'); b.className = 'acorn'; b.innerHTML = '<span class="anut">🌰</span>' + wordHtml(it);
        b.style.left = (4 + i * 24) + '%'; field.appendChild(b);
        var o = { el: b, it: it, y: -20 - Math.random() * 60 }; drops.push(o);
        b.onclick = function () {
          if (!g.alive) return;
          if (it === target) { setScore(g, g.score + 1); M.sfx('ok'); M.say(it.say, it.lang); b.classList.add('got'); speed = Math.min(0.5, speed + 0.015); setTimeout(round, 350); }
          else { M.sfx('bad'); b.classList.add('miss'); g.left = Math.max(0, g.left - 3); }
        };
      });
    }
    function tick() {
      if (!g.alive) return;
      var h = field.clientHeight, fallen = 0;
      drops.forEach(function (o) { o.y += speed * 16; o.el.style.transform = 'translateY(' + o.y + 'px)'; if (o.y > h) fallen++; });
      if (drops.length && fallen === drops.length) round();
      g.raf = requestAnimationFrame(tick);
    }
    round(); tick(); timeBar(g, 45, function () { finish(g, 15); });
  };
  // 소리 풍선: 소리를 듣고 같은 말이 적힌 풍선을 누른다 (10번)
  GAMES.song = function (g) {
    var pool = words(16); if (pool.length < 4) { $('mBody').innerHTML = '<p class="center">낱말을 조금 더 배우고 와 주세요!</p>'; return; }
    var n = 0, target = null, t0 = 0;
    $('mBody').innerHTML = '<div class="sq"><button class="say big" id="sPlay">🔊</button><small>다시 듣기</small></div><div class="balloons" id="sB"></div>';
    $('sPlay').onclick = function () { if (target) M.say(target.say, target.lang); };
    function round() {
      if (!g.alive) return;
      if (n >= 10) { finish(g, 120); return; }
      n++; var four = M.shuffle(pool).slice(0, 4); target = four[0]; t0 = Date.now();
      var colors = ['#ff8fab', '#7ed6a5', '#8ec5ff', '#ffd166'];
      $('sB').innerHTML = M.shuffle(four).map(function (it, i) { return '<button class="balloon" data-i="' + pool.indexOf(it) + '" style="--bc:' + colors[i] + ';animation-delay:' + (i * 0.15) + 's">' + wordHtml(it) + '</button>'; }).join('');
      setTimeout(function () { if (g.alive) M.say(target.say, target.lang); }, 250);
      Array.prototype.forEach.call(document.querySelectorAll('.balloon'), function (b) {
        b.onclick = function () {
          if (!g.alive || b.classList.contains('pop')) return;
          var it = pool[+b.dataset.i];
          if (it === target) { var sec = (Date.now() - t0) / 1000; setScore(g, g.score + Math.max(4, Math.round(12 - sec))); b.classList.add('pop'); M.sfx('ok'); setTimeout(round, 450); }
          else { b.classList.add('miss'); M.sfx('bad'); setScore(g, g.score - 2); }
        };
      });
    }
    round(); timeBar(g, 70, function () { finish(g, 120); });
  };
  // 꿀단지 짝 맞추기: 낱말 6개와 뜻 6개를 뒤집어 짝을 찾는다
  GAMES.memory = function (g) {
    var pool = words(6); if (pool.length < 4) { $('mBody').innerHTML = '<p class="center">낱말을 조금 더 배우고 와 주세요!</p>'; return; }
    var cards = [];
    pool.forEach(function (it, i) { cards.push({ p: i, side: 'w', it: it }); cards.push({ p: i, side: 'k', it: it }); });
    cards = M.shuffle(cards);
    $('mBody').innerHTML = '<p class="hint center" id="mFlips">뒤집은 횟수 0</p><div class="pots" id="mP">' + cards.map(function (c, i) {
      return '<button class="pot" data-i="' + i + '"><span class="lid">🍯</span><span class="face">' + (c.side === 'w' ? wordHtml(c.it) : '<b>' + esc(c.it.k) + '</b>') + '</span></button>';
    }).join('') + '</div>';
    var open = [], flips = 0, found = 0, busy = false;
    Array.prototype.forEach.call(document.querySelectorAll('.pot'), function (b) {
      b.onclick = function () {
        if (!g.alive || busy || b.classList.contains('open') || b.classList.contains('done')) return;
        var c = cards[+b.dataset.i]; b.classList.add('open'); if (c.side === 'w') M.say(c.it.say, c.it.lang); else M.sfx('tap');
        open.push({ b: b, c: c });
        if (open.length < 2) return;
        flips++; $('mFlips').textContent = '뒤집은 횟수 ' + flips;
        var a = open[0], z = open[1]; open = [];
        if (a.c.p === z.c.p && a.c.side !== z.c.side) {
          a.b.classList.add('done'); z.b.classList.add('done'); found++; M.sfx('ok');
          if (found === pool.length) { setScore(g, Math.max(10, 60 - (flips - pool.length) * 4 + Math.round(g.left))); setTimeout(function () { finish(g, 90); }, 500); }
        } else { busy = true; setTimeout(function () { a.b.classList.remove('open'); z.b.classList.remove('open'); busy = false; }, 800); }
      };
    });
    timeBar(g, 90, function () { setScore(g, found * 5); finish(g, 90); });
  };

  M.MINIS = MINIS;
  M.miniTest = function (id) { var m = byId(id); start(m); return cur; };   // 자동 점검용
})();
