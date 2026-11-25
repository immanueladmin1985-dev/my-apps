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
      ask: '목도리를 뜨려는데 털실 끝마다 낱말과 뜻이 붙어 있어요. 같은 뜻끼리 털실을 이어 줄래요?', how: '왼쪽 낱말을 누르고 오른쪽 뜻을 눌러 털실로 이어요. 세 판을 이으면 목도리 완성!', thanks: '포근한 목도리가 완성됐어요! 하나는 선물이에요.' },
    { id: 'fetch', cust: 'dog', heart: 1, icon: '🎾', name: '바둑이와 공 물어오기',
      ask: '멍멍! 공놀이 해요! 제가 외국 말로 외치면 그 뜻이 적힌 곳으로 공을 던져 주세요. 제가 쌩 달려가서 물어 올게요!', how: '소리를 듣고 뜻이 맞는 풀밭을 눌러 공을 던져요. 🔊로 다시 들을 수 있어요.', thanks: '헥헥, 너무 재밌었어요! 꼬리가 멈추질 않아요!' },
    { id: 'shell', cust: 'otter', heart: 1, icon: '🐚', name: '수달이의 조개 깨기 OX',
      ask: '조개마다 낱말과 뜻이 짝지어 적혀 있는데, 틀린 짝도 섞여 있어요! 맞는 짝이면 ⭕, 틀린 짝이면 ❌를 눌러 줄래요?', how: '낱말과 뜻이 맞으면 ⭕, 틀리면 ❌. 빠르게 많이 맞힐수록 좋아요.', thanks: '조개 껍데기가 탁탁 잘 깨졌어요! 오늘 저녁은 조개 파티예요!' },
    { id: 'cloze', cust: 'deer', heart: 1, icon: '🍄', name: '꽃사슴의 빈칸 버섯',
      ask: '숲에서 주운 쪽지에 구멍이 뽕뽕 났어요. 빈칸에 들어갈 낱말이 적힌 버섯을 골라 문장을 채워 줄래요?', how: '뜻을 보고 문장의 빈칸에 맞는 낱말 버섯을 골라요. 한 번에 맞히면 점수가 커요.', thanks: '쪽지가 다 채워졌어요! 숲 친구들에게 읽어 줄게요.' },
    { id: 'echo', cust: 'duck', heart: 1, icon: '🦆', name: '꽥꽥이 따라 말하기',
      ask: '꽥! 연못 친구들에게 외국 말 인사를 해 보고 싶어요. 제가 먼저 말하면 똑같이 따라 말해 줄래요?', how: '꽥꽥이가 말하면 🎤를 누르고 따라 말해요. 마이크가 없으면 소리를 듣고 맞는 낱말을 골라요.', thanks: '꽥꽥! 연못 친구들이 다 알아들었대요!' },
    { id: 'spicy', cust: 'lion', heart: 1, icon: '🌶️', name: '레오의 매운맛 도전',
      ask: '어흥! 왕의 매운맛 퀴즈다! 맞힐 때마다 고추가 늘어나고 시간이 짧아진다. 하트 세 개가 다 없어지기 전에 버텨 봐라!', how: '낱말의 뜻을 빨리 골라요. 맞힐수록 빨라지고 점수가 커져요. 틀리거나 시간이 지나면 하트가 줄어요.', thanks: '크하하, 대단한 매운맛 실력이다! 왕관을 잠깐 빌려줄게!' },
    { id: 'bazaar', cust: 'camel', heart: 1, icon: '🪙', name: '사막이의 시장 놀이',
      ask: '딸랑딸랑~ 사막 시장에 오신 걸 환영해요. 손님이 외국 말로 값을 말하면 맞는 동전을 내 주세요!', how: '값을 듣고 같은 숫자의 동전을 골라요. 숫자는 점점 커져요. 🔊로 다시 들을 수 있어요.', thanks: '장사가 아주 잘 됐어요! 사막에서도 이렇게 계산 잘하는 친구는 처음이에요.' },
    { id: 'parade', cust: 'elephant', heart: 1, icon: '🐘', name: '코코의 기억력 행진',
      ask: '코끼리 행진을 해요! 제가 낱말을 하나씩 순서대로 보여 줄게요. 다 보여 준 다음 같은 순서로 눌러 줄래요?', how: '낱말이 나오는 순서를 기억했다가 같은 순서로 눌러요. 갈수록 길어져요. 하트 세 개가 있어요.', thanks: '뿌우~! 완벽한 행진이었어요. 저보다 기억력이 좋은 것 같아요!' },
    { id: 'banana', cust: 'monkey', heart: 1, icon: '🍌', name: '끼끼의 바나나 팡팡',
      ask: '끼끼! 나뭇잎 사이로 바나나가 쏙쏙 나와요. 위에 나온 뜻과 같은 낱말이 적힌 바나나만 잽싸게 따 줘요!', how: '뜻에 맞는 바나나가 나오면 얼른 눌러요. 다른 바나나를 누르면 점수가 줄어요.', thanks: '바나나가 산더미예요! 반은 나눠 줄게요, 끼끼!' }
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
      $('mBody').innerHTML = '<div class="cafe"><img class="cafeimg" src="img/mg-cafe.png" alt=""><div class="cguest"><span class="gface">' + guests[(n * 3) % guests.length] + '</span><button class="cbub lang-' + lang + '" data-say="' + esc(x.p) + '"><b>' + M.fz(x.p, lang) + '</b>' + (x.pr ? '<small>' + esc(x.pr) + '</small>' : '') + '<em>' + esc(x.pk || '') + '</em></button></div><div class="cme">🐱 내 대답은? <small>' + n + ' / ' + list.length + '</small></div>' +
        '<div class="copts">' + opts.map(function (o, i) { return '<button class="copt lang-' + lang + '" data-i="' + i + '">' + M.fz(o, lang) + '</button>'; }).join('') + '</div></div>';
      setTimeout(function () { if (g.alive) M.say(x.p, lang, false, false, 'A'); }, 250);
      document.querySelector('.cbub').onclick = function () { M.say(x.p, lang, false, false, 'A'); };
      Array.prototype.forEach.call(document.querySelectorAll('.copt'), function (b) {
        b.onclick = function () {
          if (!g.alive || b.disabled) return;
          var o = opts[+b.dataset.i];
          if (right(o)) { var sec = (Date.now() - t0) / 1000; setScore(g, g.score + Math.max(8, 20 - tries * 6 - Math.floor(sec / 3))); b.classList.add('ok'); M.sfx('ok'); M.sayThen(o, lang, 'B', round); }
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

  // ===================== 새 주민 놀이 =====================
  function need(pool, n, msg) { if (pool.length >= n) return true; $('mBody').innerHTML = '<p class="center">' + (msg || '낱말을 조금 더 배우고 와 주세요!') + '</p>'; return false; }
  function headHtml(g, inner) { var src = M.custImg(g.m.cust, false); return '<div class="rq nq">' + (src ? '<img class="nqface" src="' + src + '" alt="">' : '') + '<div class="nqin">' + inner + '</div></div>'; }
  function bindOpts(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), function (b) { b.onclick = function () { if (b.disabled) return; fn(b); }; }); }

  // 공 물어오기: 소리를 듣고 뜻이 맞는 풀밭에 공을 던진다 (10번)
  GAMES.fetch = function (g) {
    var pool = words(14); if (!need(pool, 3)) return;
    var n = 0, combo = 0, target = null;
    function round() {
      if (!g.alive) return;
      if (n >= 10) { finish(g, 150); return; }
      n++; var three = M.shuffle(pool).slice(0, 3); target = three[0]; three = M.shuffle(three);
      $('mBody').innerHTML = headHtml(g, '<small>' + n + ' / 10' + (combo > 1 ? ' · 🔥' + combo + '연속' : '') + '</small><p>바둑이가 뭐라고 외쳤을까요?</p><button class="btn" id="fPlay">🔊 다시 듣기</button>') +
        '<div class="fgrass">' + three.map(function (it, i) { return '<button class="fspot" data-i="' + i + '"><span class="fball">🎾</span><b>' + esc(it.k) + '</b></button>'; }).join('') + '</div><div class="fdog" id="fDog">🐶</div>';
      $('fPlay').onclick = function () { M.say(target.say, target.lang); };
      setTimeout(function () { if (g.alive) M.say(target.say, target.lang); }, 300);
      bindOpts('.fspot', function (b) {
        if (!g.alive) return;
        var it = three[+b.dataset.i];
        if (it === target) {
          combo++; setScore(g, g.score + 10 + Math.min(5, combo)); M.sfx('ok'); b.classList.add('ok');
          var dog = $('fDog'); if (dog) { var r = b.getBoundingClientRect(), r0 = dog.getBoundingClientRect(); dog.style.transform = 'translate(' + (r.left + r.width / 2 - r0.left - r0.width / 2) + 'px,' + (r.top - r0.top) + 'px)'; }
          setTimeout(function () { if (g.alive) { var w = document.createElement('p'); w.className = 'center fword'; w.innerHTML = wordHtml(target); $('mBody').appendChild(w); } }, 250);
          setTimeout(round, 1100);
        } else { combo = 0; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); }
      });
    }
    round(); timeBar(g, 80, function () { finish(g, 150); });
  };

  // 조개 깨기 OX: 낱말과 뜻이 맞는 짝인지 빠르게 고른다
  GAMES.shell = function (g) {
    var pool = words(16); if (!need(pool, 4)) return;
    var cnt = 0, combo = 0;
    function round() {
      if (!g.alive) return;
      var it = M.pick(pool), right = Math.random() < 0.5, other = M.pick(pool.filter(function (x) { return x !== it && x.k !== it.k; })), shown = right ? it : other;
      cnt++;
      $('mBody').innerHTML = headHtml(g, '<small>' + cnt + '번째 조개' + (combo > 1 ? ' · 🔥' + combo + '연속' : '') + '</small>') +
        '<div class="oshell"><div class="ow">' + wordHtml(it) + '</div><div class="oeq">=</div><div class="ok2">' + esc(shown.k) + '</div></div>' +
        '<div class="oxbtns"><button class="oxb o" data-a="1">⭕<small>맞아요</small></button><button class="oxb x" data-a="0">❌<small>아니에요</small></button></div><p class="hint center" id="oMsg"></p>';
      bindOpts('.oxb', function (b) {
        if (!g.alive) return;
        var ok = (b.dataset.a === '1') === right;
        Array.prototype.forEach.call(document.querySelectorAll('.oxb'), function (x) { x.disabled = true; });
        if (ok) { combo++; setScore(g, g.score + 5 + Math.min(3, Math.floor(combo / 3))); M.sfx('ok'); b.classList.add('ok'); M.say(it.say, it.lang); setTimeout(round, 650); }
        else { combo = 0; setScore(g, g.score - 3); M.sfx('bad'); b.classList.add('miss'); $('oMsg').innerHTML = esc(it.t) + ' = <b>' + esc(it.k) + '</b>'; setTimeout(round, 1500); }
      });
    }
    round(); timeBar(g, 60, function () { finish(g, 110); });
  };

  // 빈칸 버섯: 문장의 빈칸에 들어갈 낱말을 고른다 (6문장)
  GAMES.cloze = function (g) {
    var list = sentences(6); if (list.length < 2) { $('mBody').innerHTML = '<p class="center">문장을 조금 더 배우고 와 주세요!</p>'; return; }
    var allW = []; list.concat(sentences(12)).forEach(function (x) { x.w.forEach(function (w) { if (allW.indexOf(w) < 0) allW.push(w); }); });
    var n = 0;
    function round() {
      if (!g.alive) return;
      if (n >= list.length) { finish(g, list.length * 20); return; }
      var sn = list[n++], lang = sn.lang, sp = lang === 'en' ? ' ' : '';
      var idxs = sn.w.map(function (w, i) { return i; }).filter(function (i) { return !/^[\s.,!?。、？！]+$/.test(sn.w[i]); });
      var bi = M.pick(idxs.length ? idxs : [0]), ans = sn.w[bi], tries = 0;
      var opts = [ans].concat(M.shuffle(allW.filter(function (w) { return w !== ans && !/^[\s.,!?。、？！]+$/.test(w); })).slice(0, 2));
      opts = M.shuffle(opts);
      $('mBody').innerHTML = headHtml(g, '<small>' + n + ' / ' + list.length + '</small><p>' + esc(sn.k) + '</p>') +
        '<div class="csent lang-' + lang + '">' + sn.w.map(function (w, i) { return i === bi ? '<span class="cblank" id="cB">？</span>' : esc(w); }).join(sp) + '</div>' +
        '<div class="ropts c3">' + opts.map(function (w, i) { return '<button class="ropt cmush" data-i="' + i + '"><span class="cm">🍄</span><b class="lang-' + lang + '">' + esc(w) + '</b></button>'; }).join('') + '</div>';
      bindOpts('.cmush', function (b) {
        if (!g.alive) return;
        if (opts[+b.dataset.i] === ans) { setScore(g, g.score + (tries ? 8 : 20)); b.classList.add('ok'); $('cB').textContent = ans; $('cB').classList.add('fill'); M.sfx('ok'); M.say(sn.say, lang); setTimeout(round, 1500); }
        else { tries++; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); }
      });
    }
    round(); timeBar(g, 100, function () { finish(g, list.length * 20); });
  };

  // 따라 말하기: 꽥꽥이가 말한 낱말을 마이크로 따라 한다. 마이크가 없으면 듣고 고르기
  GAMES.echo = function (g) {
    var pool = words(10, function (it) { return it.t.length <= 10; }); if (!need(pool, 3)) return;
    var mic = M.speechOK() && M.P.set.speak !== false, n = 0, list = pool.slice(0, 8);
    function round() {
      if (!g.alive) return;
      if (n >= list.length) { finish(g, list.length * 15); return; }
      var it = list[n++], fails = 0;
      var say = function () { M.say(it.say, it.lang); };
      if (mic) {
        $('mBody').innerHTML = headHtml(g, '<small>' + n + ' / ' + list.length + '</small><p>꽥꽥이를 따라 말해 보세요</p>') +
          '<div class="eword">' + wordHtml(it) + '<small>' + esc(it.k) + '</small></div><div class="ebtns"><button class="btn" id="eHear">🔊 듣기</button><button class="btn primary emic" id="eMic">🎤 말하기</button></div><p class="hint center" id="eMsg"></p><button class="btn ghost wide hidden" id="eSkip">넘어가기</button>';
        setTimeout(function () { if (g.alive) say(); }, 300);
        $('eHear').onclick = say;
        $('eSkip').onclick = function () { round(); };
        $('eMic').onclick = function () {
          var b = $('eMic'); if (b.classList.contains('on')) { try { M._rec.stop(); } catch (e) {} return; }
          b.classList.add('on'); $('eMsg').textContent = '듣고 있어요… 말해 보세요';
          var targets = [it.t, it.say].concat(it.alt || []); if (it.r && it.lang === 'ja') targets.push(it.r.split(' · ')[0]);
          M.listen(it.lang).then(function (res) {
            if (!g.alive || !$('eMic')) return; $('eMic').classList.remove('on');
            if (!res.length) { $('eMsg').textContent = '소리가 들리지 않았어요. 다시 눌러 보세요'; return; }
            var bm = M.bestMatch(res, targets, it.lang);
            if (bm.s >= 0.42) { setScore(g, g.score + Math.round(8 + bm.s * 7)); M.sfx('ok'); $('eMsg').innerHTML = '꽥! 잘했어요 · 들린 말: <b>' + esc(bm.h) + '</b>'; setTimeout(round, 1200); }
            else { fails++; M.sfx('bad'); $('eMsg').innerHTML = '들린 말: <b>' + esc(bm.h) + '</b> · 한 번 더!'; if (fails >= 2) $('eSkip').classList.remove('hidden'); }
          }).catch(function () { if (!g.alive) return; mic = false; M.toast('마이크를 쓸 수 없어서 듣고 고르기로 바꿨어요'); n--; round(); });
        };
      } else {
        var three = M.shuffle([it].concat(M.shuffle(pool.filter(function (x) { return x !== it; })).slice(0, 2)));
        $('mBody').innerHTML = headHtml(g, '<small>' + n + ' / ' + list.length + '</small><p>꽥꽥이가 한 말을 골라요</p><button class="btn" id="eHear">🔊 다시 듣기</button>') +
          '<div class="ropts c3">' + three.map(function (x, i) { return '<button class="ropt eopt" data-i="' + i + '">' + wordHtml(x) + '</button>'; }).join('') + '</div>';
        setTimeout(function () { if (g.alive) say(); }, 300);
        $('eHear').onclick = say;
        bindOpts('.eopt', function (b) {
          if (!g.alive) return;
          if (three[+b.dataset.i] === it) { setScore(g, g.score + (fails ? 6 : 15)); b.classList.add('ok'); M.sfx('ok'); setTimeout(round, 700); }
          else { fails++; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); }
        });
      }
    }
    round(); timeBar(g, 150, function () { finish(g, list.length * 15); });
  };

  // 매운맛 도전: 문제마다 시간이 정해져 있고, 맞힐수록 짧아진다. 하트 3개
  GAMES.spicy = function (g) {
    var pool = words(16); if (!need(pool, 4)) return;
    var lives = 3, lvl = 1, n = 0, qt = null;
    function round() {
      if (!g.alive) return;
      if (lives <= 0 || n >= 20) { finish(g, 220); return; }
      n++; var four = M.shuffle(pool).slice(0, 4), target = four[0], limit = Math.max(2.4, 6 - (lvl - 1) * 0.4); four = M.shuffle(four);
      $('mBody').innerHTML = headHtml(g, '<small>' + '❤️'.repeat(lives) + '🤍'.repeat(3 - lives) + ' · 매운맛 ' + '🌶️'.repeat(Math.min(5, lvl)) + (lvl > 5 ? '+' + (lvl - 5) : '') + '</small><div class="rword">' + wordHtml(target) + '</div>') +
        '<div class="sbar"><i id="sBar"></i></div><div class="ropts">' + four.map(function (it, i) { return '<button class="ropt sopt" data-i="' + i + '"><b>' + esc(it.k) + '</b></button>'; }).join('') + '</div>';
      M.say(target.say, target.lang);
      var t0 = Date.now(), bar = $('sBar'), done = false;
      clearInterval(qt); qt = setInterval(function () {
        if (!g.alive || done) { clearInterval(qt); return; }
        var left = limit - (Date.now() - t0) / 1000; if (bar) bar.style.width = Math.max(0, left / limit * 100) + '%';
        if (left <= 0) { done = true; clearInterval(qt); lives--; lvl = Math.max(1, lvl - 1); M.sfx('bad'); M.toast('⏰ 앗, 늦었어요! 「' + target.k + '」'); setTimeout(round, 900); }
      }, 50); g.timers.push(qt);
      bindOpts('.sopt', function (b) {
        if (!g.alive || done) return; done = true; clearInterval(qt);
        if (four[+b.dataset.i] === target) { setScore(g, g.score + 5 + lvl * 3); lvl++; b.classList.add('ok'); M.sfx('ok'); setTimeout(round, 450); }
        else { lives--; lvl = Math.max(1, lvl - 1); b.classList.add('miss'); M.sfx('bad'); M.toast('「' + target.t + '」 = ' + target.k); setTimeout(round, 1100); }
      });
    }
    round(); timeBar(g, 120, function () { finish(g, 220); });
  };

  // 시장 놀이: 값을 듣고 같은 숫자 동전을 고른다 (10번, 숫자가 점점 커진다)
  GAMES.bazaar = function (g) {
    var lang = M.P.lang, n = 0, combo = 0;
    var unit = function (v) { return lang === 'ja' ? v + '円' : lang === 'zh' ? v + '块钱' : v + ' dollars'; };
    function round() {
      if (!g.alive) return;
      if (n >= 10) { finish(g, 140); return; }
      n++;
      var max = n <= 3 ? 10 : n <= 6 ? 99 : 999, v = 1 + Math.floor(Math.random() * max);
      var cand = [v + 1, v - 1, v + 10, v - 10, v * 10 % 1000, parseInt(String(v).split('').reverse().join(''), 10), v + 100].filter(function (x) { return x > 0 && x !== v && x <= max; });
      var opts = [v]; M.shuffle(cand).forEach(function (x) { if (opts.length < 4 && opts.indexOf(x) < 0) opts.push(x); });
      while (opts.length < 4) { var r = 1 + Math.floor(Math.random() * max); if (opts.indexOf(r) < 0) opts.push(r); }
      opts = M.shuffle(opts);
      var say = function () { M.say(unit(v), lang); };
      $('mBody').innerHTML = headHtml(g, '<small>손님 ' + n + ' / 10' + (combo > 1 ? ' · 🔥' + combo + '연속' : '') + '</small><p>손님이 말한 값은 얼마일까요?</p><button class="btn" id="bPlay">🔊 다시 듣기</button>') +
        '<div class="ropts">' + opts.map(function (x, i) { return '<button class="ropt coin" data-i="' + i + '"><span>🪙</span><b>' + x + '</b></button>'; }).join('') + '</div><p class="center hint" id="bMsg"></p>';
      $('bPlay').onclick = say; setTimeout(function () { if (g.alive) say(); }, 300);
      bindOpts('.coin', function (b) {
        if (!g.alive) return;
        if (opts[+b.dataset.i] === v) { combo++; setScore(g, g.score + 10 + Math.min(4, combo)); b.classList.add('ok'); M.sfx('coin'); $('bMsg').innerHTML = '딸랑! <b class="lang-' + lang + '">' + esc(unit(v)) + '</b>'; setTimeout(round, 1000); }
        else { combo = 0; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); say(); }
      });
    }
    round(); timeBar(g, 100, function () { finish(g, 140); });
  };

  // 기억력 행진: 낱말이 순서대로 지나가고, 같은 순서로 누른다. 하트 3개
  GAMES.parade = function (g) {
    var pool = words(16); if (!need(pool, 6)) return;
    var len = 2, lives = 3, rounds = 0;
    function round() {
      if (!g.alive) return;
      if (lives <= 0 || rounds >= 7) { finish(g, 150); return; }
      rounds++;
      var seq = M.shuffle(pool).slice(0, len), extra = M.shuffle(pool.filter(function (x) { return seq.indexOf(x) < 0; })).slice(0, 2), k = 0;
      $('mBody').innerHTML = headHtml(g, '<small>' + '❤️'.repeat(lives) + '🤍'.repeat(3 - lives) + ' · ' + len + '개 행진</small><p id="pTip">잘 보고 순서를 기억해요</p>') + '<div class="pshow" id="pShow"></div><div class="ropts p3" id="pOpts"></div><div class="pgot" id="pGot"></div>';
      var show = $('pShow');
      (function next() {
        if (!g.alive) return;
        if (k >= seq.length) { show.innerHTML = '<span class="pel">🐘❓</span>'; ask(); return; }
        var it = seq[k++]; show.innerHTML = '<span class="pel">🐘</span><div class="pw">' + wordHtml(it) + '<small>' + esc(it.k) + '</small></div>'; M.say(it.say, it.lang);
        g.timers.push(setTimeout(next, 1500));
      })();
      function ask() {
        $('pTip').textContent = '같은 순서로 눌러요';
        var opts = M.shuffle(seq.concat(extra)), got = 0;
        $('pOpts').innerHTML = opts.map(function (it, i) { return '<button class="ropt popt" data-i="' + i + '">' + wordHtml(it) + '</button>'; }).join('');
        bindOpts('.popt', function (b) {
          if (!g.alive) return;
          var it = opts[+b.dataset.i];
          if (it === seq[got]) { got++; b.disabled = true; b.classList.add('ok'); M.sfx('pop'); $('pGot').innerHTML += '<span>' + got + '. ' + esc(it.t) + '</span>';
            if (got === seq.length) { setScore(g, g.score + len * 6); M.sfx('ok'); len = Math.min(6, len + 1); setTimeout(round, 900); } }
          else { lives--; M.sfx('bad'); b.classList.add('miss'); Array.prototype.forEach.call(document.querySelectorAll('.popt'), function (x) { x.disabled = true; }); $('pTip').innerHTML = '순서: ' + seq.map(function (x) { return esc(x.t); }).join(' → '); setTimeout(round, 1800); }
        });
      }
    }
    round(); timeBar(g, 150, function () { finish(g, 150); });
  };

  // 바나나 팡팡: 나뭇잎 사이로 튀어나오는 바나나 중 뜻이 맞는 것만 딴다
  GAMES.banana = function (g) {
    var pool = words(14); if (!need(pool, 4)) return;
    var target = null, hits = 0, up = {}, speed = 1700;
    function newTarget() { target = M.pick(pool); hits = 0; $('nT').innerHTML = (target.e ? target.e + ' ' : '') + '<b>' + esc(target.k) + '</b>'; }
    $('mBody').innerHTML = headHtml(g, '<p>이 뜻의 바나나를 따요!</p><div class="ntarget" id="nT"></div>') + '<div class="ngrid" id="nG">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return '<button class="nhole" data-h="' + i + '"><span class="nleaf">🌿</span></button>'; }).join('') + '</div>';
    newTarget();
    function pop() {
      if (!g.alive) return;
      var free = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(function (i) { return !up[i]; }); if (!free.length) return;
      var h = M.pick(free), it = Math.random() < 0.4 ? target : M.pick(pool), b = document.querySelector('[data-h="' + h + '"]');
      up[h] = it; b.innerHTML = '<span class="nban">🍌</span><span class="nw">' + wordHtml(it) + '</span>'; b.classList.add('up');
      g.timers.push(setTimeout(function () { if (up[h] === it) { delete up[h]; b.classList.remove('up'); b.innerHTML = '<span class="nleaf">🌿</span>'; } }, speed));
    }
    $('nG').onclick = function (e) {
      if (!g.alive) return;
      var b = e.target.closest('.nhole'); if (!b) return; var h = +b.dataset.h, it = up[h]; if (!it) return;
      delete up[h]; b.classList.remove('up');
      if (it === target || it.k === target.k) { setScore(g, g.score + 5); M.sfx('ok'); M.say(it.say, it.lang); b.innerHTML = '<span class="nleaf">✨</span>'; hits++; speed = Math.max(1000, speed - 40); if (hits >= 3) newTarget(); }
      else { setScore(g, g.score - 3); M.sfx('bad'); b.innerHTML = '<span class="nleaf">💦</span>'; }
      setTimeout(function () { if (!up[h]) b.innerHTML = '<span class="nleaf">🌿</span>'; }, 400);
    };
    var iv = setInterval(function () { pop(); if (Math.random() < 0.35) pop(); }, 750); g.timers.push(iv); pop();
    timeBar(g, 60, function () { finish(g, 110); });
  };

  M.MINIS = MINIS;
  M.miniTest = function (id) { var m = byId(id); start(m); return cur; };   // 자동 점검용
})();
