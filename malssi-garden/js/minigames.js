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
      ask: '꿀단지 뚜껑에 낱말과 뜻을 나눠 적어 뒀는데 섞여 버렸어요. 짝을 맞춰 줄래요?', how: '두 개씩 뒤집어서 낱말과 뜻이 맞는 짝을 찾아요. 적게 뒤집을수록 좋아요.', thanks: '꿀단지 정리 끝! 고마워요, 친구!' },
    { id: 'road', cust: 'hedgehog', heart: 1, icon: '🫖', name: '갈림길 차 배달',
      ask: '따뜻한 차를 배달해야 하는데, 길마다 표지판이 외국 말로 적혀 있어요… 주소 뜻을 알려 줄 테니 맞는 길로 같이 가 줄래요?', how: '위에 나온 뜻과 같은 말이 적힌 표지판 쪽으로 가요. 12번 갈림길을 지나면 도착!', thanks: '차가 식기 전에 도착했어요! 고마워요.' },
    { id: 'bamboo', cust: 'panda', heart: 1, icon: '🎋', name: '대나무 문장 쌓기',
      ask: '대나무 마디마다 낱말을 써서 문장 탑을 쌓고 싶은데, 순서를 자꾸 잊어버려요… 뜻을 보고 순서대로 쌓아 줄래요?', how: '뜻을 보고 낱말 마디를 문장 순서대로 눌러 쌓아요. 틀리면 마디가 흔들려요.', thanks: '와, 멋진 대나무 탑이에요! 하나 먹어도 돼요?' },
    { id: 'riddle', cust: 'fox', heart: 1, icon: '🦊', name: '여우의 수수께끼',
      ask: '후후, 수수께끼 놀이 해요! 제가 그림을 보여 주면 무엇인지 외국 말로 맞혀 보세요. 연달아 맞히면 점수가 쑥쑥!', how: '그림을 보고 알맞은 낱말을 골라요. 연속으로 맞히면 점수가 커져요.', thanks: '대단해요! 제 수수께끼를 이렇게 잘 푸는 친구는 처음이에요.' },
    { id: 'dict', cust: 'owl', heart: 1, icon: '🦉', name: '부엉 박사의 받아쓰기',
      ask: '부엉, 오늘은 받아쓰기 시간이에요. 제가 낱말을 읽어 줄 테니 글자 조각을 모아 써 보세요.', how: '소리를 듣고 글자 조각을 순서대로 눌러 낱말을 완성해요. 잘못 누른 조각은 다시 눌러 빼요.', thanks: '부엉부엉! 백 점짜리 받아쓰기예요.' },
    { id: 'fish', cust: 'penguin', heart: 1, icon: '🎣', name: '펭펭의 얼음 낚시',
      ask: '얼음 아래 물고기들이 저마다 이름표를 달고 있대요! 제가 부르는 이름의 물고기만 낚아 주세요. 다른 물고기는 놓아주고요!', how: '소리를 듣고, 그 말이 적힌 물고기가 헤엄쳐 지나갈 때 눌러요. 놓치면 다시 와요.', thanks: '와, 오늘 저녁은 잔치예요! 고마워요, 펭펭!' },
    { id: 'cafe', cust: 'cat', heart: 1, icon: '☕', name: '나비의 카페 주문 받기',
      ask: '냐아… 오늘 하루만 우리 카페 점원을 해 줄래요? 외국 손님이 말을 걸면 알맞게 대답해 주면 돼요. 팁은 반반!', how: '손님의 말을 듣고 알맞은 대답을 골라요. 회화 단원에 나온 말이에요.', thanks: '훌륭한 점원이었어요. 팁 여기요, 냐.' },
    { id: 'yarn', cust: 'sheep', heart: 1, icon: '🧶', name: '몽실이의 털실 잇기',
      ask: '목도리를 뜨려는데 털실 끝마다 낱말과 뜻이 붙어 있어요. 같은 뜻끼리 털실을 이어 줄래요?', how: '왼쪽 낱말을 누르고 오른쪽 뜻을 눌러 털실로 이어요. 세 판을 이으면 목도리 완성!', thanks: '포근한 목도리가 완성됐어요! 하나는 선물이에요.' }
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
  // 배운 낱말 중에서 고른다. 모자라면 앞쪽 단계의 낱말로 채운다. 문자·병음 연습 항목(kana)은 낱말이 모자랄 때만 쓴다
  function words(n, ok) {
    var lang = M.P.lang, L = window.LANGS[lang], seen = {}, out = [];
    ok = ok || function () { return true; };
    var good = function (it) { return it.k && it.t && it.t.length <= 12 && ok(it); };
    var learned = M.learnedItems(lang).filter(good), nonKana = learned.filter(function (it) { return !it.kana; });
    var src = nonKana.length >= n ? nonKana : learned;
    if (src.length < n) { var extra = []; L.stages.forEach(function (st) { if (!st.kana && !st.gram && extra.length < n * 3) extra = extra.concat(st.items.filter(good)); }); src = src.concat(extra); }
    M.shuffle(src).forEach(function (it) { if (out.length < n && !seen[it.k] && !seen[it.t]) { seen[it.k] = seen[it.t] = 1; out.push(it); } });
    return out;
  }
  function wordHtml(it) { var n = it.t.length, sz = it.lang === 'en' ? (n <= 5 ? 'w1' : n <= 9 ? 'w2' : 'w3') : (n <= 3 ? 'w1' : n <= 5 ? 'w2' : 'w3'); return '<b class="' + sz + ' lang-' + it.lang + '">' + esc(it.t) + '</b>' + (it.lang === 'ja' && it.r && HAN.test(it.t) ? '<small>' + esc(it.r) + '</small>' : it.lang === 'zh' && it.r && !it.kana ? '<small>' + esc(it.r.split(' · ')[0]) + '</small>' : ''); }

  // ---------- 화면 ----------
  var cur = null, pendingExp = 0;   // 지금 하는 놀이, 나갈 때 줄 토끼 경험치
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
    if (pendingExp && M.petExp) { var e = pendingExp; pendingExp = 0; setTimeout(function () { M.petExp(e); }, 300); }
    if ($('gardenView') && !$('gardenView').hidden) M.render();
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
    M.give({ coins: coins, water: water }); pendingExp += 2 + stars;   // 토끼 경험치는 놀이를 마치고 나갈 때 준다 (레벨업 창이 놀이 위에 뜨지 않게)
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
    var field = $('aF'), speed = 0.11, drops = [], target = null, last = 0, missed = 0;   // speed: 1초에 내려오는 거리(밭 높이의 비율)
    function round() {
      if (!g.alive) return;
      field.innerHTML = ''; drops = [];
      var four = M.shuffle(pool).slice(0, 4); target = four[0];
      $('aQ').innerHTML = (target.e ? '<span class="ae">' + target.e + '</span>' : '') + '<b>' + esc(target.k) + '</b>';
      M.shuffle(four).forEach(function (it, i) {
        var b = document.createElement('button'); b.className = 'acorn'; b.innerHTML = '<span class="aw">' + wordHtml(it) + '</span>';
        b.style.left = (i * 24.5) + '%'; field.appendChild(b);
        var o = { el: b, it: it, y: -0.12 - Math.random() * 0.18 }; drops.push(o);
        b.onclick = function () {
          if (!g.alive) return;
          if (it === target) { setScore(g, g.score + 1); M.sfx('ok'); M.say(it.say, it.lang); b.classList.add('got'); speed = Math.min(0.2, speed + 0.006); setTimeout(round, 450); }
          else { M.sfx('bad'); b.classList.add('miss'); g.left = Math.max(0, g.left - 3); }
        };
      });
    }
    function tick(now) {   // 걸린 시간만큼 내려간다 (화면 새로 고침이 빠른 폰에서도 같은 빠르기)
      if (!g.alive) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      var h = field.clientHeight, fallen = 0;
      drops.forEach(function (o) { if (o.el.classList.contains('got')) return; o.y += speed * dt; o.el.style.transform = 'translateY(' + (o.y * h) + 'px)'; if (o.y > 1) fallen++; });
      if (drops.length && fallen === drops.length) { missed++; speed = Math.max(0.09, speed - 0.01); round(); }   // 놓치면 조금 느려진다
      g.raf = requestAnimationFrame(tick);
    }
    round(); g.raf = requestAnimationFrame(tick); timeBar(g, 60, function () { finish(g, 15); });
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
      var colors = ['pink', 'mint', 'sky', 'lemon'];
      $('sB').innerHTML = M.shuffle(four).map(function (it, i) { return '<button class="balloon" data-i="' + pool.indexOf(it) + '" style="background-image:url(img/mg-balloon-' + colors[i] + '.png);animation-delay:' + (i * 0.15) + 's"><span class="bw">' + wordHtml(it) + '</span></button>'; }).join('');
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
      return '<button class="pot" data-i="' + i + '"><img class="lid" src="img/mg-pot.png" alt=""><span class="face">' + (c.side === 'w' ? wordHtml(c.it) : '<b>' + esc(c.it.k) + '</b>') + '</span></button>';
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

  // 갈림길 배달: 뜻을 보고 왼쪽·오른쪽 표지판 중 맞는 길로 간다 (12번)
  GAMES.road = function (g) {
    var pool = words(16); if (pool.length < 4) { $('mBody').innerHTML = '<p class="center">낱말을 조금 더 배우고 와 주세요!</p>'; return; }
    var n = 0, combo = 0;
    $('mBody').innerHTML = '<div class="aq" id="rQ"></div><div class="road"><div class="rsigns" id="rS"></div><div class="rpath"><img class="rhog" id="rH" src="img/mg-hog.png" alt=""></div><div class="rprog" id="rP"></div></div>';
    function round() {
      if (!g.alive) return;
      if (n >= 12) { finish(g, 150); return; }
      n++; $('rP').textContent = n + ' / 12';
      var two = M.shuffle(pool).slice(0, 2), target = two[0], pair = M.shuffle(two.slice());
      $('rQ').innerHTML = '🏠 <b>' + esc(target.k) + '</b>' + (target.e ? ' <span class="ae">' + target.e + '</span>' : '');
      $('rS').innerHTML = pair.map(function (it, i) { return '<button class="rsign ' + (i ? 'right' : 'left') + '" data-i="' + i + '"><span class="sw">' + wordHtml(it) + '</span></button>'; }).join('');
      Array.prototype.forEach.call(document.querySelectorAll('.rsign'), function (b) {
        b.onclick = function () {
          if (!g.alive || b.disabled) return;
          var it = pair[+b.dataset.i], h = $('rH');
          if (it === target) { combo++; setScore(g, g.score + 10 + Math.min(5, combo)); M.sfx('ok'); M.say(it.say, it.lang); h.className = 'rhog go' + (b.dataset.i === '1' ? 'r' : 'l'); setTimeout(function () { h.className = 'rhog'; round(); }, 420); }
          else { combo = 0; M.sfx('bad'); b.disabled = true; b.classList.add('miss'); g.left = Math.max(0, g.left - 4); }
        };
      });
    }
    round(); timeBar(g, 60, function () { finish(g, 150); });
  };
  // 대나무 문장 쌓기: 배운 문장의 낱말을 순서대로 눌러 쌓는다 (5문장)
  function sentences(n) {
    var lang = M.P.lang, L = window.LANGS[lang], out = [];
    L.stages.forEach(function (st) { if (M.P.prog[lang][st.id] && !st.kana) (st.sents || []).forEach(function (x) { if (x.w && x.w.length >= 2 && x.w.length <= 7) out.push(x); }); });
    if (out.length < n) L.stages.filter(function (st) { return !st.kana; }).slice(0, 12).forEach(function (st) { (st.sents || []).forEach(function (x) { if (x.w && x.w.length >= 2 && x.w.length <= 7 && out.indexOf(x) < 0) out.push(x); }); });
    return M.shuffle(out).slice(0, n);
  }
  GAMES.bamboo = function (g) {
    var list = sentences(5); if (list.length < 2) { $('mBody').innerHTML = '<p class="center">문장을 조금 더 배우고 와 주세요!</p>'; return; }
    var n = 0;
    function round() {
      if (!g.alive) return;
      if (n >= list.length) { finish(g, list.length * 20); return; }
      var sn = list[n++], got = 0, miss = 0, lang = sn.lang;
      var tiles = sn.w.map(function (w, i) { return { w: w, i: i }; });
      $('mBody').innerHTML = '<div class="aq"><b>' + esc(sn.k) + '</b><small class="bprog">' + n + ' / ' + list.length + '</small></div><div class="btower lang-' + lang + '" id="bT"></div><div class="btiles lang-' + lang + '" id="bTi">' +
        M.shuffle(tiles).map(function (t) { return '<button class="bseg" data-i="' + t.i + '">' + esc(t.w) + '</button>'; }).join('') + '</div>';
      Array.prototype.forEach.call(document.querySelectorAll('.bseg'), function (b) {
        b.onclick = function () {
          if (!g.alive || b.disabled) return;
          var idx = +b.dataset.i;
          if (idx === got || sn.w[idx] === sn.w[got]) {   // 같은 낱말이 두 번 나오면 어느 쪽이든 된다
            b.disabled = true; b.classList.add('used');
            var seg = document.createElement('div'); seg.className = 'tseg'; seg.textContent = sn.w[got]; $('bT').prepend(seg);
            got++; M.sfx('pop');
            if (got === sn.w.length) { setScore(g, g.score + Math.max(6, 20 - miss * 4)); M.say(sn.say, lang); M.sfx('ok'); setTimeout(round, 1200); }
          } else { miss++; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); M.sfx('bad'); }
        };
      });
    }
    round(); timeBar(g, 100, function () { finish(g, list.length * 20); });
  };
  // 여우의 수수께끼: 그림(이모지)만 보고 낱말 고르기, 가끔은 낱말을 보고 그림 고르기 (10문제)
  GAMES.riddle = function (g) {
    var pool = words(12, function (it) { return !!it.e; }); if (pool.length < 4) { $('mBody').innerHTML = '<p class="center">그림이 있는 낱말을 조금 더 배우고 와 주세요!</p>'; return; }
    var n = 0, combo = 0;
    function round() {
      if (!g.alive) return;
      if (n >= 10) { finish(g, 150); return; }
      n++; var four = M.shuffle(pool).slice(0, 4), target = four[0], rev = n % 3 === 0;
      four = M.shuffle(four);
      $('mBody').innerHTML = '<div class="rq"><img class="rstage" src="img/mg-fox-stage.png" alt=""><small>수수께끼 ' + n + ' / 10' + (combo > 1 ? ' · 🔥' + combo + '연속' : '') + '</small>' + (rev ? '<div class="rword">' + wordHtml(target) + '</div><p>이 말은 어떤 그림일까요?</p>' : '<div class="remoji">' + target.e + '</div><p>나는 누구일까요?</p>') + '</div>' +
        '<div class="ropts' + (rev ? ' em' : '') + '">' + four.map(function (it, i) { return '<button class="ropt" data-i="' + i + '">' + (rev ? '<span class="remoji sm">' + it.e + '</span>' : wordHtml(it)) + '</button>'; }).join('') + '</div>';
      if (rev) M.say(target.say, target.lang);
      Array.prototype.forEach.call(document.querySelectorAll('.ropt'), function (b) {
        b.onclick = function () {
          if (!g.alive || b.disabled) return;
          var it = four[+b.dataset.i];
          if (it === target) { combo++; setScore(g, g.score + 10 + Math.min(10, combo * 2)); b.classList.add('ok'); M.sfx('ok'); if (!rev) M.say(it.say, it.lang); setTimeout(round, 600); }
          else { combo = 0; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); }
        };
      });
    }
    round(); timeBar(g, 80, function () { finish(g, 150); });
  };
  // 받아쓰기: 소리를 듣고 글자 조각을 순서대로 눌러 낱말을 쓴다 (6낱말)
  GAMES.dict = function (g) {
    var lang = M.P.lang;
    var pool = words(12, function (it) { var t = lang === 'ja' && it.r && HAN.test(it.t) ? it.r : it.t; return t.replace(/[\s~～]/g, '').length >= 2 && t.length <= 8; });
    if (pool.length < 3) { $('mBody').innerHTML = '<p class="center">낱말을 조금 더 배우고 와 주세요!</p>'; return; }
    var list = pool.slice(0, 6), n = 0;
    function chars(it) { var t = lang === 'ja' && it.r && HAN.test(it.t) ? it.r.split(' · ')[0] : it.t; return Array.from(t.replace(/[\s~～]/g, '')); }
    function round() {
      if (!g.alive) return;
      if (n >= list.length) { finish(g, list.length * 15); return; }
      var it = list[n++], ans = chars(it), picked = [], miss = 0;
      var decoy = []; M.shuffle(pool).forEach(function (o) { if (o !== it) chars(o).forEach(function (c) { if (decoy.length < 3 && ans.indexOf(c) < 0 && decoy.indexOf(c) < 0) decoy.push(c); }); });
      var tiles = M.shuffle(ans.concat(decoy).map(function (c, i) { return { c: c, id: i }; }));
      $('mBody').innerHTML = '<div class="sq dq"><img class="dowl" src="img/mg-owl-board.png" alt=""><button class="say big" id="dPlay">🔊</button><small>' + n + ' / ' + list.length + ' · 뜻: ' + esc(it.k) + '</small></div><div class="dslots lang-' + lang + '" id="dS">' + ans.map(function () { return '<span class="dslot"></span>'; }).join('') + '</div>' +
        '<div class="dtiles lang-' + lang + '">' + tiles.map(function (t) { return '<button class="dtile" data-id="' + t.id + '">' + esc(t.c) + '</button>'; }).join('') + '</div>' + '<button class="btn ghost wide" id="dUndo">⌫ 하나 지우기</button>';
      var play = function () { M.say(it.say, lang); }; $('dPlay').onclick = play; setTimeout(play, 250);
      function paint() { Array.prototype.forEach.call(document.querySelectorAll('.dslot'), function (sl, k) { sl.textContent = picked[k] ? picked[k].c : ''; }); }
      $('dUndo').onclick = function () { var t = picked.pop(); if (t) { t.b.disabled = false; t.b.classList.remove('used'); paint(); } };
      Array.prototype.forEach.call(document.querySelectorAll('.dtile'), function (b) {
        b.onclick = function () {
          if (!g.alive || b.disabled || picked.length >= ans.length) return;
          picked.push({ c: b.textContent, b: b }); b.disabled = true; b.classList.add('used'); paint(); M.sfx('tap');
          if (picked.length === ans.length) {
            if (picked.map(function (t) { return t.c; }).join('') === ans.join('')) { setScore(g, g.score + Math.max(5, 15 - miss * 3)); M.sfx('ok'); $('dS').classList.add('ok'); setTimeout(round, 900); }
            else { miss++; M.sfx('bad'); $('dS').classList.add('bad'); setTimeout(function () { $('dS') && $('dS').classList.remove('bad'); picked.forEach(function (t) { t.b.disabled = false; t.b.classList.remove('used'); }); picked = []; paint(); }, 700); }
          }
        };
      });
    }
    round(); timeBar(g, 120, function () { finish(g, list.length * 15); });
  };

  // 얼음 낚시: 소리를 듣고, 그 말이 적힌 물고기가 지나갈 때 누른다 (10마리)
  GAMES.fish = function (g) {
    var pool = words(16); if (pool.length < 4) { $('mBody').innerHTML = '<p class="center">낱말을 조금 더 배우고 와 주세요!</p>'; return; }
    var n = 0, target = null, fishes = [], speed = 1.1;
    $('mBody').innerHTML = '<div class="sq"><button class="say big" id="fPlay">🔊</button><small id="fN">1 / 10</small></div><div class="ice" id="fI"><div class="icehole"></div><img class="ppg" src="img/mg-penguin-fish.png" alt=""></div>';
    $('fPlay').onclick = function () { if (target) M.say(target.say, target.lang); };
    var pond = $('fI'), lanes = [0.42, 0.58, 0.74, 0.9];
    function round() {
      if (!g.alive) return;
      if (n >= 10) { finish(g, 130); return; }
      n++; $('fN').textContent = n + ' / 10';
      fishes.forEach(function (f) { f.el.remove(); }); fishes = [];
      var four = M.shuffle(pool).slice(0, 4); target = four[0];
      M.shuffle(four).forEach(function (it, i) {
        var el = document.createElement('button'), dir = i % 2 ? -1 : 1;
        el.className = 'fishb' + (dir > 0 ? ' rev' : ''); el.innerHTML = '<img class="fimg" src="img/mg-fish-' + ['yellow', 'purple', 'blue', 'orange'][i] + '.png" alt=""><span class="fw">' + wordHtml(it) + '</span>';   // 그림은 왼쪽을 본다: 오른쪽으로 가는 물고기만 뒤집는다
        el.style.top = (lanes[i] * 100) + '%'; pond.appendChild(el);
        var f = { el: el, it: it, x: 0.12 + ((i * 0.27 + Math.random() * 0.1) % 0.8), dir: dir, v: speed * (0.8 + Math.random() * 0.4) };
        fishes.push(f);
        el.onclick = function () {
          if (!g.alive || el.classList.contains('miss')) return;
          if (it === target) { setScore(g, g.score + 10 + Math.round(speed * 2)); el.classList.add('caught'); M.sfx('ok'); speed = Math.min(2.2, speed + 0.1); setTimeout(round, 500); }
          else { el.classList.add('miss'); M.sfx('bad'); setScore(g, g.score - 3); }
        };
      });
      setTimeout(function () { if (g.alive) M.say(target.say, target.lang); }, 300);
    }
    var last = performance.now();
    function tick(t) {
      if (!g.alive) return;
      var dt = Math.min(50, t - last) / 1000; last = t;
      fishes.forEach(function (f) {
        if (f.el.classList.contains('caught')) return;
        f.x += f.dir * f.v * 0.22 * dt;
        if (f.dir > 0 && f.x > 1.1) f.x = -0.35; if (f.dir < 0 && f.x < -0.35) f.x = 1.1;   // 놓치면 다시 헤엄쳐 온다
        f.el.style.left = (f.x * 100) + '%';
      });
      g.raf = requestAnimationFrame(tick);
    }
    round(); g.raf = requestAnimationFrame(tick); timeBar(g, 75, function () { finish(g, 130); });
  };
  // 카페 주문 받기: 회화 단원의 "상대 말 → 알맞은 대답" 문제를 손님 말로 낸다 (6손님)
  GAMES.cafe = function (g) {
    var lang = M.P.lang, L = window.LANGS[lang], done = [], all = [];
    L.stages.forEach(function (st) { if (st.conv) st.xf.forEach(function (x) { if (x.w && x.w.length >= 2) { all.push(x); if (M.P.prog[lang][st.id]) done.push(x); } }); });
    var list = M.shuffle(done.length >= 6 ? done : all).slice(0, 6);
    if (list.length < 3) { $('mBody').innerHTML = '<p class="center">회화를 조금 더 배우고 와 주세요!</p>'; return; }
    var guests = ['🐰', '🐻', '🦊', '🐼', '🐨', '🐹', '🐸', '🦁'], n = 0;
    function round() {
      if (!g.alive) return;
      if (n >= list.length) { finish(g, list.length * 20); return; }
      var x = list[n++], opts = M.shuffle([x.a].concat((x.alts || []).map(function (a) { return a.t; }), x.w.slice(0, 3 - (x.alts || []).length))), t0 = Date.now(), tries = 0;
      var right = function (o) { return o === x.a || (x.alts || []).some(function (a) { return a.t === o; }); };
      $('mBody').innerHTML = '<div class="cafe"><img class="cafeimg" src="img/mg-cafe.png" alt=""><div class="cguest"><span class="gface">' + guests[(n * 3) % guests.length] + '</span><button class="cbub lang-' + lang + '" data-say="' + esc(x.p) + '"><b>' + esc(x.p) + '</b>' + (x.pr ? '<small>' + esc(x.pr) + '</small>' : '') + '<em>' + esc(x.pk || '') + '</em></button></div><div class="cme">🐱 내 대답은? <small>' + n + ' / ' + list.length + '</small></div>' +
        '<div class="copts">' + opts.map(function (o, i) { return '<button class="copt lang-' + lang + '" data-i="' + i + '">' + esc(o) + '</button>'; }).join('') + '</div></div>';
      setTimeout(function () { if (g.alive) M.say(x.p, lang, false, false, 'A'); }, 250);
      document.querySelector('.cbub').onclick = function () { M.say(x.p, lang, false, false, 'A'); };
      Array.prototype.forEach.call(document.querySelectorAll('.copt'), function (b) {
        b.onclick = function () {
          if (!g.alive || b.disabled) return;
          var o = opts[+b.dataset.i];
          if (right(o)) { var sec = (Date.now() - t0) / 1000; setScore(g, g.score + Math.max(8, 20 - tries * 6 - Math.floor(sec / 3))); b.classList.add('ok'); M.sfx('ok'); M.say(o, lang, false, false, 'B'); setTimeout(round, 1300); }
          else { tries++; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); }
        };
      });
    }
    round(); timeBar(g, 110, function () { finish(g, list.length * 20); });
  };
  // 털실 잇기: 왼쪽 낱말과 오른쪽 뜻을 털실로 잇는다 (5쌍 × 3판)
  GAMES.yarn = function (g) {
    var pool = words(15); if (pool.length < 5) { $('mBody').innerHTML = '<p class="center">낱말을 조금 더 배우고 와 주세요!</p>'; return; }
    var board = 0, colors = ['#ff8fab', '#7ec8f0', '#ffd166', '#9ad77c', '#c49bff'], YC = ['blue', 'pink', 'yellow'];
    function round() {
      if (!g.alive) return;
      if (board >= 3 || board * 5 >= pool.length) { $('mBody').innerHTML = '<div class="scarfdone"><img src="img/mg-scarf.png" alt=""><b>목도리 완성!</b></div>'; M.sfx('win'); setTimeout(function () { finish(g, 3 * 5 * 6); }, 1200); return; }
      var set = pool.slice(board * 5, board * 5 + 5); board++;
      var right = M.shuffle(set.slice()), sel = null, joined = 0, miss = 0;
      $('mBody').innerHTML = '<p class="hint center">' + board + ' / 3판 · 낱말을 누르고 뜻을 눌러요</p><div class="yarn" id="yB"><svg class="ysvg" id="yS"></svg><div class="ycol">' +
        set.map(function (it, i) { return '<button class="yl" data-i="' + i + '">' + wordHtml(it) + '<img class="knot" src="img/mg-yarn-' + YC[i % 3] + '.png" alt=""></button>'; }).join('') + '</div><div class="ycol">' +
        right.map(function (it, i) { return '<button class="yr" data-i="' + set.indexOf(it) + '"><img class="knot" src="img/mg-yarn-' + YC[(i + 1) % 3] + '.png" alt="">' + esc(it.k) + '</button>'; }).join('') + '</div></div>';
      var box = $('yB'), svg = $('yS');
      function line(a, b, col) {
        var r = box.getBoundingClientRect(), p = a.querySelector('.knot').getBoundingClientRect(), q = b.querySelector('.knot').getBoundingClientRect();
        var x1 = p.left + p.width / 2 - r.left, y1 = p.top + p.height / 2 - r.top, x2 = q.left + q.width / 2 - r.left, y2 = q.top + q.height / 2 - r.top, mx = (x1 + x2) / 2;
        var el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        el.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + (y1 + 18) + ' ' + mx + ' ' + (y2 - 18) + ' ' + x2 + ' ' + y2);
        el.setAttribute('stroke', col); el.setAttribute('class', 'ythread'); svg.appendChild(el);
      }
      box.onclick = function (e) {
        if (!g.alive) return;
        var b = e.target.closest('.yl, .yr'); if (!b || b.classList.contains('done')) return;
        if (b.classList.contains('yl')) { if (sel) sel.classList.remove('on'); sel = b; b.classList.add('on'); M.say(set[+b.dataset.i].say, set[+b.dataset.i].lang); return; }
        if (!sel) { M.toast('왼쪽 낱말을 먼저 눌러요'); return; }
        if (sel.dataset.i === b.dataset.i) {
          var col = colors[joined % colors.length]; line(sel, b, col); sel.classList.remove('on'); sel.classList.add('done'); b.classList.add('done'); sel.style.borderColor = b.style.borderColor = col;
          sel = null; joined++; M.sfx('ok'); setScore(g, g.score + 6);
          if (joined === set.length) { setScore(g, g.score + Math.max(0, 6 - miss * 2)); M.sfx('win'); setTimeout(round, 900); }
        } else { miss++; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); M.sfx('bad'); setScore(g, g.score - 2); }
      };
    }
    round(); timeBar(g, 100, function () { finish(g, 3 * 5 * 6); });
  };

  M.MINIS = MINIS;
  M.miniTest = function (id) { var m = byId(id); start(m); return cur; };   // 자동 점검용
})();
