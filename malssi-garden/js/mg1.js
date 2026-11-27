// 미니게임 첫 묶음 (말씨정원): 다람이·삐약이·판다·여우·나비 카페·몽실이.
// 원칙: 주민이 놀이판 안에서 직접 움직이고 반응한다. 글자는 이름표·팻말·카드처럼 글자를 넣도록 그린 자리에만 쓴다.
(function () {
  var M = window.M, X = M.MG; if (!X) return;
  var G = X.GAMES, esc = X.esc, $ = function (id) { return document.getElementById(id); };
  var WI = 'img/w/';
  function sprite(cust, kind) { return WI + 'ch-' + cust + '-' + (kind || 'front') + '.png'; }
  function alive(g) { return g.alive && $('mBody'); }
  // 주민 반응: 맞히면 웃으며 폴짝, 틀리면 도리도리
  function react(el, ok, cust) {
    if (!el) return;
    el.classList.remove('hop', 'nope'); void el.offsetWidth; el.classList.add(ok ? 'hop' : 'nope');
    if (cust && ok) { el.src = sprite(cust, 'happy'); clearTimeout(el._t); el._t = setTimeout(function () { el.src = sprite(cust, 'front'); }, 800); }
  }
  function swap(el, src, back, ms) { if (!el) return; el.src = src; clearTimeout(el._s); el._s = setTimeout(function () { if (el.isConnected) el.src = back; }, ms || 800); }
  function tagHtml(it) { return '<span class="wtag">' + X.wordHtml(it) + '</span>'; }
  function noWords(n) { return X.need(X.words(n), n); }

  // ---------- 다람이 · 도토리 받기 ----------
  // 나뭇가지 위 다람이가 뜻을 말하며 이름표 달린 도토리를 떨어뜨린다. 바구니를 옮겨 맞는 도토리만 받는다
  G.acorn = function (g) {
    var pool = X.words(16); if (!X.need(pool, 4)) return;
    $('mBody').innerHTML = '<div class="gacorn"><div class="gbranch"><img class="gbranchimg" src="' + WI + 'mg3-branch.png" alt=""><img class="gnpc" id="aN" src="' + WI + 'mg3-squirrel-throw.png" alt=""><div class="gbub" id="aQ"></div></div>' +
      '<div class="gfield" id="aF"><div class="glanes"><button data-l="0"></button><button data-l="1"></button><button data-l="2"></button></div><img class="gbasket" id="aB" src="' + WI + 'mg2-basket.png" alt=""></div><p class="ghint">칸을 누르거나 끌어서 바구니를 옮겨요</p></div>';
    var field = $('aF'), bk = $('aB'), npc = $('aN'), lane = 1, drops = [], target = null, n = 0, speed = 0.16, last = 0;
    function place() { bk.style.left = (lane * 33.333 + 16.666) + '%'; }
    place();
    Array.prototype.forEach.call(field.querySelectorAll('[data-l]'), function (b) { b.onpointerdown = function () { lane = +b.dataset.l; place(); }; });
    field.addEventListener('pointermove', function (e) { if (!e.buttons && e.pointerType === 'mouse') return; var r = field.getBoundingClientRect(); lane = Math.max(0, Math.min(2, Math.floor((e.clientX - r.left) / r.width * 3))); place(); });
    function round() {
      if (!alive(g)) return;
      if (n >= 12) { X.finish(g, 12 * 10); return; }
      n++; drops.forEach(function (o) { o.el.remove(); }); drops = [];
      var three = M.shuffle(pool).slice(0, 3); target = three[0];
      $('aQ').innerHTML = '<small>' + n + ' / 12</small>' + (target.e ? '<span class="ge">' + target.e + '</span>' : '') + '<b>' + esc(target.k) + '</b> 주세요!';
      var lanes = M.shuffle([0, 1, 2]);
      M.shuffle(three).forEach(function (it, i) {
        var el = document.createElement('div'); el.className = 'gacornd'; el.innerHTML = '<img src="img/mg-acorn.png" alt=""><span class="gplate">' + X.wordHtml(it) + '</span>';
        el.style.left = (lanes[i] * 33.333 + 16.666) + '%'; field.appendChild(el);
        drops.push({ el: el, it: it, lane: lanes[i], y: -0.15 - i * 0.28 });
      });
      npc.classList.remove('throw'); void npc.offsetWidth; npc.classList.add('throw');
    }
    function tick(now) {
      if (!alive(g)) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      var h = field.clientHeight;
      drops.forEach(function (o) {
        if (o.done) return;
        o.y += speed * dt; o.el.style.transform = 'translate(-50%,' + (o.y * h) + 'px)';
        if (o.y >= 0.74 && o.y < 0.86 && o.lane === lane) {   // 바구니에 들어갔다
          o.done = true; o.el.classList.add('caught');
          if (o.it === target) { X.setScore(g, g.score + 10); M.sfx('ok'); M.say(o.it.say, o.it.lang); react(npc, true); swap(npc, sprite('squirrel', 'happy'), WI + 'mg3-squirrel-throw.png'); X.fxAt(bk, 'sparkle'); speed = Math.min(0.3, speed + 0.012); setTimeout(round, 500); }
          else { X.setScore(g, g.score - 3); M.sfx('bad'); react(npc, false); }
        } else if (o.y > 1.02) { o.done = true; o.el.classList.add('gone'); if (o.it === target) { react(npc, false); setTimeout(round, 300); } }
      });
      g.raf = requestAnimationFrame(tick);
    }
    round(); g.raf = requestAnimationFrame(tick); X.timeBar(g, 75, function () { X.finish(g, 12 * 10); });
  };

  // ---------- 삐약이 · 노래 풍선 ----------
  // 무대 위 삐약이가 낱말을 노래하면, 같은 낱말 이름표가 달린 풍선을 터뜨린다. 맞힐 때마다 악보에 음표가 하나씩 생긴다
  G.song = function (g) {
    var pool = X.words(16); if (!X.need(pool, 4)) return;
    var tts = M.ttsOK ? M.ttsOK() : true, n = 0, target = null, t0 = 0, colors = ['pink', 'mint', 'sky', 'lemon'];
    $('mBody').innerHTML = '<div class="gsong"><div class="gstaff" id="sS">' + '<i></i>'.repeat(10) + '</div><div class="gballoons" id="sB"></div>' +
      '<div class="gstagebox"><div class="gbub sing" id="sQ"></div><button class="gnpcbtn" id="sP" aria-label="다시 듣기"><img class="gnpc" id="sN" src="' + sprite('chick') + '" alt=""></button><img class="gcurtain" src="' + WI + 'mg3-stage-curtain.png" alt=""></div></div>';
    var npc = $('sN');
    function sing() { if (!target) return; if (tts) M.say(target.say, target.lang); npc.classList.remove('sing'); void npc.offsetWidth; npc.classList.add('sing'); swap(npc, WI + 'mg3-chick-sing.png', sprite('chick'), 1200); }
    $('sP').onclick = sing;
    function round() {
      if (!alive(g)) return;
      if (n >= 10) { X.finish(g, 120); return; }
      n++; var four = M.shuffle(pool).slice(0, 4); target = four[0]; t0 = Date.now();
      $('sQ').innerHTML = tts ? '♪ ♫ <small>삐약이를 누르면 다시 불러요</small>' : '<b>' + esc(target.k) + '</b>';
      $('sB').innerHTML = M.shuffle(four).map(function (it, i) { return '<button class="gballoon" data-i="' + pool.indexOf(it) + '" style="animation-delay:' + (i * 0.2) + 's"><img src="img/mg-balloon-' + colors[i] + '.png" alt=""><span class="gstring"></span>' + tagHtml(it) + '</button>'; }).join('');
      setTimeout(function () { if (alive(g)) sing(); }, 300);
      Array.prototype.forEach.call(document.querySelectorAll('.gballoon'), function (b) {
        b.onclick = function () {
          if (!alive(g) || b.classList.contains('pop')) return;
          var it = pool[+b.dataset.i];
          if (it === target) {
            var sec = (Date.now() - t0) / 1000; X.setScore(g, g.score + Math.max(4, Math.round(12 - sec))); b.classList.add('pop'); X.fxAt(b, 'pop'); M.sfx('ok'); react(npc, true, 'chick');
            var notes = $('sS').children; if (notes[n - 1]) notes[n - 1].classList.add('on'); setTimeout(round, 600);
          } else { b.classList.add('miss'); M.sfx('bad'); X.setScore(g, g.score - 2); react(npc, false); }
        };
      });
    }
    round(); X.timeBar(g, 70, function () { X.finish(g, 120); });
  };

  // ---------- 판다 · 대나무 쌓기 ----------
  // 뜻을 보고 낱말 마디를 문장 순서대로 아래부터 쌓는다. 다 쌓으면 판다가 꼭대기 잎을 먹는다
  G.bamboo = function (g) {
    var list = X.sentences(5); if (list.length < 2) { $('mBody').innerHTML = '<p class="center">문장을 조금 더 배우고 와 주세요!</p>'; return; }
    var n = 0;
    function round() {
      if (!alive(g)) return;
      if (n >= list.length) { X.finish(g, list.length * 20); return; }
      var sn = list[n++], got = 0, miss = 0, lang = sn.lang;
      var tiles = M.shuffle(sn.w.map(function (w, i) { return { w: w, i: i }; }));
      $('mBody').innerHTML = '<div class="gbamboo"><div class="gbq"><small>' + n + ' / ' + list.length + '</small><b>' + esc(sn.k) + '</b></div>' +
        '<div class="gbstage"><div class="gtower lang-' + lang + '" id="bT"><img class="gleaf" id="bL" src="' + WI + 'mg3-bamboo-leaf.png" alt=""></div><img class="gnpc gpanda" id="bN" src="' + sprite('panda') + '" alt=""></div>' +
        '<div class="gbtiles lang-' + lang + '">' + tiles.map(function (t) { return '<button class="gtile gbseg" data-i="' + t.i + '"><span>' + esc(t.w) + '</span></button>'; }).join('') + '</div></div>';
      var npc = $('bN'), tower = $('bT');
      Array.prototype.forEach.call(document.querySelectorAll('.gtile'), function (b) {
        b.onclick = function () {
          if (!alive(g) || b.disabled) return;
          var idx = +b.dataset.i;
          if (idx === got || sn.w[idx] === sn.w[got]) {
            b.disabled = true; b.classList.add('used');
            var seg = document.createElement('div'); seg.className = 'gseg'; seg.innerHTML = '<span>' + esc(sn.w[got]) + '</span>';
            seg.style.visibility = 'hidden'; tower.insertBefore(seg, $('bL')); got++; M.sfx('pop');
            X.fly(b, WI + 'mg3-bamboo-seg.png', seg, { size: 120, ms: 420, spin: 0, end: 1, dyk: 0.5, done: function () { seg.style.visibility = ''; } });
            if (got === sn.w.length) { tower.classList.add('full'); X.setScore(g, g.score + Math.max(6, 20 - miss * 4)); M.say(sn.say, lang); M.sfx('ok'); react(npc, true); npc.src = WI + 'mg3-panda-eat.png'; npc.classList.add('eat'); setTimeout(round, 1500); }
          } else { miss++; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); tower.classList.remove('wobble'); void tower.offsetWidth; tower.classList.add('wobble'); M.sfx('bad'); react(npc, false); }
        };
      });
    }
    round(); X.timeBar(g, 110, function () { X.finish(g, list.length * 20); });
  };

  // ---------- 여우 · 힌트 카드 수수께끼 ----------
  // 여우가 카드 석 장(소리·그림·뜻)을 엎어 둔다. 적게 뒤집고 맞힐수록 점수가 크다
  G.riddle = function (g) {
    var pool = X.words(14); if (!X.need(pool, 4)) return;
    var n = 0, combo = 0, tts = M.ttsOK ? M.ttsOK() : true;
    function round() {
      if (!alive(g)) return;
      if (n >= 8) { X.finish(g, 8 * 18); return; }
      n++; var four = M.shuffle(pool).slice(0, 4), target = four[0], opened = 0;
      four = M.shuffle(four);
      var cards = [
        { k: 'snd', ico: '🔊', name: '소리', html: '<span class="gsay">🔊 다시 듣기</span>', on: function () { M.say(target.say, target.lang); }, ok: tts },
        { k: 'pic', ico: '🖼️', name: target.e ? '그림' : '첫 글자', html: target.e ? '<span class="gpic">' + target.e + '</span>' : '<span class="gfirst lang-' + target.lang + '">' + esc(Array.from(target.t)[0]) + '…</span>', ok: true },
        { k: 'mean', ico: '📖', name: '뜻', html: '<b class="gmean">' + esc(target.k) + '</b>', ok: true }
      ].filter(function (c) { return c.ok; });
      $('mBody').innerHTML = '<div class="griddle"><div class="grstage"><img class="gnpc" id="rN" src="' + WI + 'mg3-fox-magic.png" alt=""><img class="gstage" src="' + WI + 'mg2-stage.png" alt=""><div class="gbub" id="rQ"><small>수수께끼 ' + n + ' / 8' + (combo > 1 ? ' · 🔥' + combo + '연속' : '') + '</small>카드를 적게 뒤집을수록 점수가 커요!</div></div>' +
        '<div class="gcards">' + cards.map(function (c, i) { return '<button class="gcard" data-c="' + i + '"><span class="gback"><small>' + c.ico + ' ' + c.name + '</small></span><span class="gfront">' + c.html + '</span></button>'; }).join('') + '</div>' +
        '<div class="gropts">' + four.map(function (it, i) { return '<button class="gtile big" data-i="' + i + '">' + X.wordHtml(it) + '</button>'; }).join('') + '</div></div>';
      var npc = $('rN');
      function flip(b) { if (b.classList.contains('open')) { var c0 = cards[+b.dataset.c]; if (c0.on) c0.on(); return; } b.classList.add('open'); opened++; var c = cards[+b.dataset.c]; if (c.on) c.on(); M.sfx('tap'); }
      flip(document.querySelectorAll('.gcard')[0]);   // 첫 장은 공짜로 보여 준다
      Array.prototype.forEach.call(document.querySelectorAll('.gcard'), function (b) { b.onclick = function () { if (alive(g)) flip(b); }; });
      Array.prototype.forEach.call(document.querySelectorAll('.gropts .gtile'), function (b) {
        b.onclick = function () {
          if (!alive(g) || b.disabled) return;
          var it = four[+b.dataset.i];
          if (it === target) {
            combo++; X.setScore(g, g.score + [0, 15, 10, 6][Math.min(3, opened)] + Math.min(6, combo)); b.classList.add('ok'); X.fxAt(b, 'sparkle'); M.sfx('ok'); M.say(it.say, it.lang); react(npc, true);
            Array.prototype.forEach.call(document.querySelectorAll('.gcard'), function (c) { c.classList.add('open'); });
            setTimeout(round, 1100);
          } else { combo = 0; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); react(npc, false); var shut = document.querySelector('.gcard:not(.open)'); if (shut) flip(shut); }
        };
      });
    }
    round(); X.timeBar(g, 100, function () { X.finish(g, 8 * 18); });
  };

  // ---------- 나비 카페 · 주문 받기 ----------
  // 손님이 실제 주문 문장을 말한다. 개수·온도·메뉴를 주문서에 체크해서 주문을 완성한다
  var MENU = [
    { id: 'coffee', e: '☕', ko: '커피', hot: 1, ja: 'コーヒー', en: ['coffee', 'coffees'], zh: '咖啡', zm: '杯' },
    { id: 'latte', e: '🥛', ko: '라테', hot: 1, ja: 'ラテ', en: ['latte', 'lattes'], zh: '拿铁', zm: '杯' },
    { id: 'tea', e: '🍵', ko: '녹차', hot: 1, ja: 'りょくちゃ', en: ['green tea', 'green teas'], zh: '绿茶', zm: '杯' },
    { id: 'juice', e: '🧃', ko: '오렌지 주스', ja: 'オレンジジュース', en: ['orange juice', 'orange juices'], zh: '橙汁', zm: '杯' },
    { id: 'cake', e: '🍰', ko: '케이크', ja: 'ケーキ', en: ['piece of cake', 'pieces of cake'], zh: '蛋糕', zm: '块' },
    { id: 'cookie', e: '🍪', ko: '쿠키', img: 'dish-seedcookie', ja: 'クッキー', en: ['cookie', 'cookies'], zh: '饼干', zm: '块' }
  ];
  var REPLY = { ja: ['かしこまりました。', '알겠습니다(주문 받을 때).'], en: ['Sure, coming right up!', '네, 바로 준비할게요!'], zh: ['好的，马上来！', '네, 바로 나와요!'] };
  function orderText(lang, o) {
    var it = o.m, n = o.n, t = o.t, sz = o.s ? { s: 0, m: 1, l: 2 }[o.s] : -1;
    if (lang === 'ja') return (sz >= 0 ? ['S', 'M', 'L'][sz] + 'サイズの' : '') + (t ? (t === 'hot' ? 'ホット' : 'アイス') : '') + it.ja + 'を' + ['ひとつ', 'ふたつ', 'みっつ'][n - 1] + (o.v ? 'おねがいします。' : 'ください。');
    if (lang === 'zh') return (o.v ? '请给我' : '我要') + ['一', '两', '三'][n - 1] + (sz >= 0 ? ['小', '中', '大'][sz] : '') + it.zm + (t ? (t === 'hot' ? '热' : '冰') : '') + it.zh + '。';
    var w = (sz >= 0 ? ['small ', 'medium ', 'large '][sz] : '') + (t ? (t === 'hot' ? 'hot ' : 'iced ') : '') + it.en[n > 1 ? 1 : 0], num = ['one', 'two', 'three'][n - 1];
    return o.v ? 'Can I have ' + num + ' ' + w + ', please?' : num.charAt(0).toUpperCase() + num.slice(1) + ' ' + w + ', please.';
  }
  function orderKo(o) { return (o.s ? { s: '작은 ', m: '보통 ', l: '큰 ' }[o.s] : '') + (o.t ? (o.t === 'hot' ? '따뜻한 ' : '차가운 ') : '') + o.m.ko + ' ' + o.n + (o.m.zm === '杯' ? '잔' : '개') + ' 주세요'; }
  G.cafe = function (g) {
    var lang = M.P.lang, n = 0, total = 6;
    var guests = (M.V ? M.V.residents().map(function (c) { return c.id; }) : []).filter(function (id) { return id !== 'cat'; });
    if (guests.length < 3) guests = ['bear', 'squirrel', 'chick', 'hedgehog', 'panda', 'fox'];
    function round() {
      if (!alive(g)) return;
      if (n >= total) { X.finish(g, total * 20); return; }
      n++;
      var m = M.pick(MENU), o = { m: m, n: 1 + Math.floor(Math.random() * 3), t: m.hot ? M.pick(['hot', 'iced']) : '', v: Math.random() < 0.4, s: n >= 3 && m.zm === '杯' && Math.random() < 0.75 ? M.pick(['s', 'm', 'l']) : '' };   // 셋째 손님부터는 컵 크기도 말한다
      var text = orderText(lang, o), guest = guests[(n * 5 + Math.floor(Math.random() * 3)) % guests.length], pick = { n: 0, t: '', m: '', s: '' }, tries = 0;
      $('mBody').innerHTML = '<div class="gcafe"><div class="gcounter"><img class="gnpc gcat" id="cN" src="' + WI + 'mg4-cat-order.png" alt=""><img class="gguest" src="' + sprite(guest) + '" alt=""><button class="gbub order lang-' + lang + '" id="cQ"><small>손님 ' + n + ' / ' + total + ' · 눌러서 다시 듣기</small><b>' + esc(text) + '</b><em id="cK"></em></button></div>' +
        '<div class="gpad"><img class="gpadtop" src="' + WI + 'mg3-order-pad.png" alt=""><div class="gprow"><span>개수</span>' + [1, 2, 3].map(function (k) { return '<button data-n="' + k + '">' + k + '</button>'; }).join('') + '</div>' +
        '<div class="gprow"><span>온도</span><button data-t="hot"><img src="' + WI + 'mg3-steam.png" alt="">따뜻하게</button><button data-t="iced"><img src="' + WI + 'mg3-ice.png" alt="">차갑게</button><button data-t="">그대로</button></div>' +
        (n >= 3 ? '<div class="gprow cups"><span>크기</span>' + [['s', '작게'], ['m', '보통'], ['l', '크게']].map(function (c) { return '<button data-s="' + c[0] + '"><img src="' + WI + 'mg3-cup-' + c[0] + '.png" alt="">' + c[1] + '</button>'; }).join('') + '<button data-s="" class="on">말 안 함</button></div>' : '') +
        '<div class="gprow menu"><span>메뉴</span>' + MENU.map(function (x) { return '<button data-m="' + x.id + '"><img src="' + WI + (x.img || 'mg3-menu-' + x.id) + '.png" alt=""><small>' + x.ko + '</small></button>'; }).join('') + '</div>' +
        '<button class="btn primary wide" id="cGo">주문 완료</button></div></div>';
      var say = function () { M.say(text, lang, false, false, 'A'); };
      setTimeout(function () { if (alive(g)) say(); }, 300); $('cQ').onclick = say;
      var pad = document.querySelector('.gpad');
      pad.onclick = function (e) {
        var b = e.target.closest('button'); if (!b || b.id === 'cGo') return;
        var key = b.dataset.n != null ? 'n' : b.dataset.t != null ? 't' : b.dataset.s != null ? 's' : 'm';
        pick[key] = key === 'n' ? +b.dataset.n : b.dataset[key];
        Array.prototype.forEach.call(b.parentNode.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
        M.sfx('tap');
      };
      $('cGo').onclick = function () {
        if (!alive(g)) return;
        var okN = pick.n === o.n, okT = pick.t === o.t, okM = pick.m === m.id, okS = pick.s === o.s;
        if (okN && okT && okM && okS) {
          X.setScore(g, g.score + Math.max(8, 20 - tries * 6)); M.sfx('ok'); X.fxAt($('cGo'), 'coffee'); var cn = $('cN'), mb = document.querySelector('.gpad [data-m].on img'), cup = document.querySelector('.gpad [data-s].on img');
          if (cn) { cn.src = WI + 'mg3-cat-barista.png'; react(cn, true); }   // 바리스타 모습으로 만들고, 쟁반에 담아 내간다
          setTimeout(function () { if (!alive(g)) return; if (cn) cn.src = WI + 'mg4-cat-tray.png'; var from = cn || mb; if (mb) X.fly(from, cup ? cup.src : mb.src, document.querySelector('.gguest'), { size: cup ? 46 + { s: 0, m: 8, l: 16 }[o.s] : 52, ms: 600, spin: 0, end: 0.8 }); }, 450);
          $('cK').textContent = '= ' + orderKo(o);
          var r = REPLY[lang] || REPLY.en;
          $('cGo').outerHTML = '<button class="greply lang-' + lang + '" id="cR">🐱 <b>' + esc(r[0]) + '</b><small>' + esc(r[1]) + '</small></button>';
          M.sayThen ? M.sayThen(r[0], lang, 'B', function () { setTimeout(round, 500); }) : setTimeout(round, 1600);
        } else {
          tries++; M.sfx('bad'); X.setScore(g, g.score - 3);
          [['n', okN], ['t', okT], ['m', okM], ['s', okS]].forEach(function (z) { if (!z[1]) { var row = pad.querySelector('[data-' + z[0] + ']').parentNode; row.classList.remove('bad'); void row.offsetWidth; row.classList.add('bad'); } });
          if (tries >= 2) { $('cK').textContent = '= ' + orderKo(o); }
        }
      };
    }
    round(); X.timeBar(g, 140, function () { X.finish(g, total * 20); });
  };

  // ---------- 몽실이 · 털실 잇기 ----------
  // 낱말과 뜻을 털실로 이을 때마다 몽실이가 뜨는 목도리가 조금씩 길어진다
  var oldYarn = G.yarn;
  G.yarn = function (g) {
    oldYarn(g);
    var body = $('mBody'); if (!body || !body.querySelector('.yarn')) return;
    var top = document.createElement('div'); top.className = 'gknit';
    top.innerHTML = '<img class="gnpc" id="yN" src="' + WI + 'mg3-sheep-knit.png" alt=""><div class="gscarf"><img src="' + WI + 'mg3-scarf-stripe.png" alt="" id="yScarf" style="clip-path:inset(0 100% 0 0)"></div>';
    body.insertBefore(top, body.firstChild);
    var links = 0;
    var mo = new MutationObserver(function () {
      if (!alive(g)) { mo.disconnect(); return; }
      var done = document.querySelectorAll('.yl.done').length, boardN = 0, t = document.querySelector('.mhead2');
      if (t) { var mm = /(\d) \/ 3판/.exec(t.textContent); if (mm) boardN = +mm[1] - 1; }
      var now = boardN * 5 + done;
      if (now > links) { links = now; react($('yN'), true); }
      var sc = $('yScarf'); if (sc) sc.style.clipPath = 'inset(0 ' + Math.max(0, 100 - links / 15 * 100) + '% 0 0)';
      if (!document.querySelector('.gknit') && body.querySelector('.yarn')) body.insertBefore(top, body.firstChild);
    });
    mo.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  };
})();
