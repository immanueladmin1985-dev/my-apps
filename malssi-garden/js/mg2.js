// 미니게임 둘째 묶음 (말씨정원): 수달·꽃사슴·레오·사막이·코코·곰돌이.
// 첫 묶음과 같은 원칙: 주민이 놀이판에서 움직이고, 글자는 이름표·돌·깃발에만 쓴다.
(function () {
  var M = window.M, X = M.MG; if (!X) return;
  var G = X.GAMES, esc = X.esc, $ = function (id) { return document.getElementById(id); };
  var WI = 'img/w/';
  function sprite(cust, kind) { return WI + 'ch-' + cust + '-' + (kind || 'front') + '.png'; }
  function alive(g) { return g.alive && $('mBody'); }
  function react(el, ok, cust) {
    if (!el) return;
    el.classList.remove('hop', 'nope'); void el.offsetWidth; el.classList.add(ok ? 'hop' : 'nope');
    if (cust && ok) { el.src = sprite(cust, 'happy'); clearTimeout(el._t); el._t = setTimeout(function () { el.src = sprite(cust, 'front'); }, 800); }
  }
  function hearts(n) { return ('<img class="mh" src="' + WI + 'mg2-heart.png" alt="">').repeat(Math.max(0, n)) + ('<img class="mh off" src="' + WI + 'mg2-heart.png" alt="">').repeat(Math.max(0, 3 - n)); }
  function sep(lang) { return lang === 'en' ? ' ' : ''; }

  // ---------- 수달 · 조개 깨기 ----------
  // 수달이 배 위에 조개를 올려 둔다. 낱말과 뜻이 맞는 짝이면 돌로 깨고, 틀린 짝이면 바다로 던진다
  G.shell = function (g) {
    var pool = X.words(16); if (!X.need(pool, 4)) return;
    var cnt = 0, combo = 0;
    function round() {
      if (!alive(g)) return;
      var it = M.pick(pool), right = Math.random() < 0.5, other = M.pick(pool.filter(function (x) { return x !== it && x.k !== it.k; })), shown = right ? it : other;
      cnt++;
      $('mBody').innerHTML = '<div class="gshell"><div class="gsea"><small class="gcount">' + cnt + '번째 조개' + (combo > 1 ? ' · 🔥' + combo + '연속' : '') + '</small>' +
        '<div class="gotter"><img class="gnpc" id="oN" src="' + WI + 'mg4-otter-float.png" alt=""><img class="gclam" id="oC" src="' + WI + 'mg2-shell.png" alt=""></div><div class="gwave"></div></div>' +
        '<div class="gpair"><span class="wtag">' + X.wordHtml(it) + '</span><i>=</i><span class="wtag mean"><b>' + esc(shown.k) + '</b></span></div><p class="ghint" id="oMsg">맞는 짝일까요?</p>' +
        '<div class="gox"><button class="gtile big" data-a="1">🪨 깨기<small>맞는 짝이에요</small></button><button class="gtile big" data-a="0">🌊 던지기<small>틀린 짝이에요</small></button></div></div>';
      var npc = $('oN'), clam = $('oC');
      Array.prototype.forEach.call(document.querySelectorAll('.gox button'), function (b) {
        b.onclick = function () {
          if (!alive(g) || b.disabled) return;
          var crack = b.dataset.a === '1', ok = crack === right;
          Array.prototype.forEach.call(document.querySelectorAll('.gox button'), function (x) { x.disabled = true; });
          if (crack) { npc.src = WI + 'mg4-otter-rock.png'; clam.src = WI + 'mg2-shellopen.png'; clam.classList.add('crack'); } else clam.classList.add('toss');
          if (ok) { combo++; X.setScore(g, g.score + 5 + Math.min(3, Math.floor(combo / 3))); M.sfx('ok'); b.classList.add('ok'); react(npc, true); M.say(it.say, it.lang); setTimeout(round, 800); }
          else { combo = 0; X.setScore(g, g.score - 3); M.sfx('bad'); b.classList.add('miss'); react(npc, false); $('oMsg').innerHTML = esc(it.t) + ' = <b>' + esc(it.k) + '</b>'; setTimeout(round, 1600); }
        };
      });
    }
    round(); X.timeBar(g, 60, function () { X.finish(g, 110); });
  };

  // ---------- 꽃사슴 · 숲길 빈칸 ----------
  // 문장이 숲길의 징검돌로 놓여 있고, 빈 돌 자리에 맞는 버섯을 심으면 꽃사슴이 끝까지 걸어간다
  G.cloze = function (g) {
    var list = X.sentences(6); if (list.length < 2) { $('mBody').innerHTML = '<p class="center">문장을 조금 더 배우고 와 주세요!</p>'; return; }
    var allW = []; list.concat(X.sentences(12)).forEach(function (x) { x.w.forEach(function (w) { if (allW.indexOf(w) < 0) allW.push(w); }); });
    var PUNC = /^[\s.,!?。、？！]+$/, n = 0;
    function round() {
      if (!alive(g)) return;
      if (n >= list.length) { X.finish(g, list.length * 20); return; }
      var sn = list[n++], lang = sn.lang;
      var idxs = sn.w.map(function (w, i) { return i; }).filter(function (i) { return !PUNC.test(sn.w[i]); });
      var bi = M.pick(idxs.length ? idxs : [0]), ans = sn.w[bi], tries = 0;
      var opts = M.shuffle([ans].concat(M.shuffle(allW.filter(function (w) { return w !== ans && !PUNC.test(w); })).slice(0, 2)));
      $('mBody').innerHTML = '<div class="gcloze"><div class="gsignq"><img src="' + WI + 'mg4-sign.png" alt=""><div><small>' + n + ' / ' + list.length + '</small><b>' + esc(sn.k) + '</b></div></div>' +
        '<div class="gforest"><img class="gnpc gdeer" id="dN" src="' + sprite('deer', 'side') + '" alt=""><div class="gpath lang-' + lang + '">' + sn.w.map(function (w, i) { return i === bi ? '<span class="gstone hole" id="cB"><img src="' + WI + 'mg4-hole.png" alt=""><i>?</i></span>' : '<span class="gstone">' + esc(w) + '</span>'; }).join('') + '</div></div>' +
        '<div class="gmush">' + opts.map(function (w, i) { return '<button class="gmushb" data-i="' + i + '"><img src="' + WI + 'mg2-mush.png" alt=""><span class="wtag"><b class="lang-' + lang + '">' + esc(w) + '</b></span></button>'; }).join('') + '</div></div>';
      var npc = $('dN');
      Array.prototype.forEach.call(document.querySelectorAll('.gmushb'), function (b) {
        b.onclick = function () {
          if (!alive(g) || b.disabled) return;
          if (opts[+b.dataset.i] === ans) {
            X.setScore(g, g.score + (tries ? 8 : 20)); b.classList.add('planted'); var hole = $('cB');
            X.fly(b.querySelector('img'), WI + 'mg2-mush.png', hole, { size: 50, ms: 500, spin: 0, end: 0.5, done: function () { if (!hole.isConnected) return; hole.innerHTML = '<i>' + esc(ans) + '</i>'; hole.classList.remove('hole'); hole.classList.add('fill'); } });
            M.sfx('ok'); M.say(sn.say, lang); npc.classList.add('walk'); setTimeout(round, 1700);
          } else { tries++; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); react(npc, false); }
        };
      });
    }
    round(); X.timeBar(g, 100, function () { X.finish(g, list.length * 20); });
  };

  // ---------- 레오 · 매운맛 요리 ----------
  // 요리사 레오가 냄비를 끓인다. 맞힐수록 불이 세지고 고추가 쌓이며, 문제마다 주어진 시간이 짧아진다. 하트 3개
  G.spicy = function (g) {
    var pool = X.words(16); if (!X.need(pool, 4)) return;
    var lives = 3, lvl = 1, n = 0, qt = null;
    function round() {
      if (!alive(g)) return;
      if (lives <= 0 || n >= 20) { X.finish(g, 220); return; }
      n++; var four = M.shuffle(pool).slice(0, 4), target = four[0], limit = Math.max(2.4, 6 - (lvl - 1) * 0.4); four = M.shuffle(four);
      var fire = lvl >= 7 ? 3 : lvl >= 4 ? 2 : 1;
      $('mBody').innerHTML = '<div class="gspicy"><div class="gkitchen"><div class="glv"><span>' + hearts(lives) + '</span><span class="gpep">' + ('<img src="' + WI + 'mg2-pepper.png" alt="">').repeat(Math.min(6, lvl)) + (lvl > 6 ? '<b>+' + (lvl - 6) + '</b>' : '') + '</span></div>' +
        '<div class="gbub gorder"><small>레오의 주문 · 이 뜻의 고추를 솥에 넣어 줘!</small><span class="wtag">' + X.wordHtml(target) + '</span></div>' +
        '<div class="gchef"><img class="gnpc" id="sN" src="' + WI + 'mg4-lion-chef.png" alt=""><div class="gpotbox" id="sPot"><img class="gpotimg f' + fire + '" src="' + WI + 'mg4-pot-fire.png" alt=""></div></div></div>' +
        '<div class="sbar gfuse"><i id="sBar"></i></div><div class="gpeps">' + four.map(function (it, i) { return '<button class="gpepb" data-i="' + i + '"><img src="' + WI + 'mg2-pepper.png" alt=""><b>' + esc(it.k) + '</b></button>'; }).join('') + '</div></div>';
      M.say(target.say, target.lang);
      var npc = $('sN'), t0 = Date.now(), bar = $('sBar'), done = false;
      clearInterval(qt); qt = setInterval(function () {
        if (!alive(g) || done) { clearInterval(qt); return; }
        var left = limit - (Date.now() - t0) / 1000; if (bar) bar.style.width = Math.max(0, left / limit * 100) + '%';
        if (left <= 0) { done = true; clearInterval(qt); lives--; lvl = Math.max(1, lvl - 1); M.sfx('bad'); react(npc, false); M.toast('⏰ 앗, 늦었어요! 「' + target.k + '」'); setTimeout(round, 900); }
      }, 50); g.timers.push(qt);
      Array.prototype.forEach.call(document.querySelectorAll('.gspicy .gpepb'), function (b) {
        b.onclick = function () {
          if (!alive(g) || done) return; done = true; clearInterval(qt);
          var ok = four[+b.dataset.i] === target, pot = $('sPot');
          b.classList.add('thrown');
          X.fly(b.querySelector('img'), WI + 'mg2-pepper.png', pot, { size: 54, ms: 550, dyk: 0.25, done: function () {
            if (!alive(g)) return;
            if (ok) { X.setScore(g, g.score + 5 + lvl * 3); lvl++; M.sfx('ok'); pot.classList.remove('boil'); void pot.offsetWidth; pot.classList.add('boil'); react(npc, true); setTimeout(round, 600); }
            else { lives--; lvl = Math.max(1, lvl - 1); M.sfx('bad'); pot.classList.remove('smoke'); void pot.offsetWidth; pot.classList.add('smoke'); react(npc, false); b.classList.add('miss'); var r = document.querySelectorAll('.gpepb')[four.indexOf(target)]; if (r) r.classList.add('right'); M.toast('「' + target.t + '」 = ' + target.k); setTimeout(round, 1300); }
          } });
        };
      });
    }
    round(); X.timeBar(g, 120, function () { X.finish(g, 220); });
  };

  // ---------- 사막이 · 동전 내기 ----------
  // 손님이 값을 말하면 100·10·1 동전을 쟁반에 올려 값을 맞춘다
  G.bazaar = function (g) {
    var lang = M.P.lang, n = 0, combo = 0, tts = M.ttsOK ? M.ttsOK() : true;
    var unit = function (v) { return lang === 'ja' ? v + '円' : lang === 'zh' ? v + '块钱' : v + ' dollars'; };
    var guests = ['bear', 'squirrel', 'chick', 'hedgehog', 'panda', 'fox', 'koala', 'hamster'];
    function round() {
      if (!alive(g)) return;
      if (n >= 8) { X.finish(g, 8 * 14); return; }
      n++;
      var max = n <= 2 ? 10 : n <= 5 ? 99 : 999, v = 1 + Math.floor(Math.random() * max), tray = { 100: 0, 10: 0, 1: 0 }, tries = 0;
      var say = function () { M.say(unit(v), lang); };
      $('mBody').innerHTML = '<div class="gbazaar"><div class="gstall"><img class="gnpc gcamel" id="zN" src="' + WI + 'mg4-camel-stall.png" alt=""><img class="gguest2" src="' + sprite(guests[n % guests.length]) + '" alt="">' +
        '<button class="gbub" id="zQ"><small>손님 ' + n + ' / 8' + (combo > 1 ? ' · 🔥' + combo + '연속' : '') + ' · 눌러서 다시 듣기</small>' + (tts ? '🔊 <b>얼마일까요?</b>' : '<b class="lang-' + lang + '">' + esc(unit(v)) + '</b>') + '</button></div>' +
        '<div class="gtray" id="zT"><span class="gtsum" id="zS">0</span><div class="gtcoins" id="zC"></div></div>' +
        '<div class="gcoins">' + [100, 10, 1].map(function (c) { return '<button class="gcoinb" data-c="' + c + '"><img src="' + WI + 'mg4-coin-' + { 100: 'gold', 10: 'silver', 1: 'copper' }[c] + '.png" alt=""><b>' + c + '</b></button>'; }).join('') + '</div>' +
        '<div class="gox"><button class="gtile big" id="zU">↩ 하나 빼기</button><button class="btn primary" id="zGo">값 내기</button></div><p class="ghint" id="zM"></p></div>';
      var npc = $('zN');
      if (tts) setTimeout(function () { if (alive(g)) say(); }, 300);
      $('zQ').onclick = say;
      var hist = [];
      function paint() { var s = tray[100] * 100 + tray[10] * 10 + tray[1]; $('zS').textContent = s; $('zC').innerHTML = hist.map(function (c) { return '<i class="c' + c + '"><img src="' + WI + 'mg4-coin-' + { 100: 'gold', 10: 'silver', 1: 'copper' }[c] + '.png" alt=""><b>' + c + '</b></i>'; }).join(''); }
      Array.prototype.forEach.call(document.querySelectorAll('.gcoinb'), function (b) { b.onclick = function () { var c = +b.dataset.c; if (tray[c] >= 9) return; tray[c]++; hist.push(c); M.sfx('coin'); X.fly(b.querySelector('img'), b.querySelector('img').src, $('zT'), { size: 44, ms: 380, spin: 360, end: 0.7, dyk: 0.5, done: paint }); }; });
      $('zU').onclick = function () { var c = hist.pop(); if (c) { tray[c]--; paint(); } };
      $('zGo').onclick = function () {
        if (!alive(g)) return;
        var s = tray[100] * 100 + tray[10] * 10 + tray[1];
        if (s === v) { combo++; X.setScore(g, g.score + Math.max(6, 14 - tries * 4) + Math.min(3, combo)); M.sfx('coin'); react(npc, true); $('zM').innerHTML = '딸랑! <b class="lang-' + lang + '">' + esc(unit(v)) + '</b>'; $('zGo').disabled = true; setTimeout(round, 1100); }
        else { combo = 0; tries++; M.sfx('bad'); react(npc, false); $('zM').innerHTML = s > v ? '조금 많아요. 다시 들어 볼까요?' : '조금 모자라요. 다시 들어 볼까요?'; if (tries >= 2) { $('zM').innerHTML += '<br>정답: <b class="lang-' + lang + '">' + esc(unit(v)) + '</b>'; } say(); }
      };
    }
    round(); X.timeBar(g, 120, function () { X.finish(g, 8 * 14); });
  };

  // ---------- 코코 · 깃발 행진 ----------
  // 코끼리들이 낱말 깃발을 들고 차례로 지나간다. 다 지나가면 같은 순서로 깃발을 고른다. 하트 3개
  G.parade = function (g) {
    var pool = X.words(16); if (!X.need(pool, 6)) return;
    var len = 2, lives = 3, rounds = 0;
    function round() {
      if (!alive(g)) return;
      if (lives <= 0 || rounds >= 7) { X.finish(g, 150); return; }
      rounds++;
      var seq = M.shuffle(pool).slice(0, len), extra = M.shuffle(pool.filter(function (x) { return seq.indexOf(x) < 0; })).slice(0, 2), k = 0;
      $('mBody').innerHTML = '<div class="gparade"><div class="glv"><span>' + hearts(lives) + '</span><small>' + len + '마리 행진</small></div><p class="ghint big" id="pTip">잘 보고 순서를 기억해요</p>' +
        '<div class="groad" id="pRoad"></div><div class="gline" id="pGot"></div><div class="gflags" id="pOpts"></div></div>';
      var road = $('pRoad');
      (function next() {
        if (!alive(g)) return;
        if (k >= seq.length) { road.innerHTML = '<img class="gnpc gwait" src="' + WI + 'mg4-elephant-flag.png" alt="">'; ask(); return; }
        var it = seq[k++], el = document.createElement('div'); el.className = 'gmarch';
        el.innerHTML = '<img src="' + WI + 'mg4-elephant-flag.png" alt=""><span class="gflagtxt">' + X.wordHtml(it) + '</span>';
        road.innerHTML = ''; road.appendChild(el); M.say(it.say, it.lang);
        g.timers.push(setTimeout(next, 1700));
      })();
      function ask() {
        $('pTip').textContent = '지나간 순서대로 깃발을 골라요';
        var opts = M.shuffle(seq.concat(extra)), got = 0;
        $('pOpts').innerHTML = opts.map(function (it, i) { return '<button class="gtile" data-i="' + i + '">' + X.wordHtml(it) + '</button>'; }).join('');
        Array.prototype.forEach.call(document.querySelectorAll('#pOpts .gtile'), function (b) {
          b.onclick = function () {
            if (!alive(g) || b.disabled) return;
            var it = opts[+b.dataset.i];
            if (it === seq[got]) {
              got++; b.disabled = true; b.classList.add('used'); M.sfx('pop');
              $('pGot').insertAdjacentHTML('beforeend', '<span class="gmini"><img src="' + sprite('elephant', 'side') + '" alt=""><i>' + esc(it.t) + '</i></span>');
              if (got === seq.length) { X.setScore(g, g.score + len * 6); M.sfx('ok'); react(document.querySelector('.gwait'), true); len = Math.min(6, len + 1); setTimeout(round, 1000); }
            } else {
              lives--; M.sfx('bad'); b.classList.add('miss'); react(document.querySelector('.gwait'), false);
              Array.prototype.forEach.call(document.querySelectorAll('#pOpts .gtile'), function (x) { x.disabled = true; });
              $('pTip').innerHTML = '순서: ' + seq.map(function (x) { return esc(x.t); }).join(' → '); setTimeout(round, 1900);
            }
          };
        });
      }
    }
    round(); X.timeBar(g, 150, function () { X.finish(g, 150); });
  };

  // ---------- 곰돌이 · 꿀단지 (놀이 방식은 그대로, 곰돌이가 옆에서 반응) ----------
  var oldMemory = G.memory;
  G.memory = function (g) {
    oldMemory(g);
    var body = $('mBody'); if (!body || !body.querySelector('.pots')) return;
    var top = document.createElement('div'); top.className = 'gknit';
    top.innerHTML = '<img class="gnpc" id="mN" src="' + sprite('bear') + '" alt=""><div class="gbub" id="mQ">꿀단지 뚜껑을 두 개씩 열어 짝을 찾아 줘요!</div>';
    body.insertBefore(top, body.firstChild);
    var done = 0, wasTwo = false;
    // 단지 상태가 바뀔 때만 반응한다 (곰돌이 그림의 class 변화는 무시)
    var mo = new MutationObserver(function (list) {
      if (!alive(g) || !document.querySelector('.pots')) { mo.disconnect(); return; }
      if (!list.some(function (r) { return r.target.classList && r.target.classList.contains('pot'); })) return;
      var d = document.querySelectorAll('.pot.done').length / 2, two = document.querySelectorAll('.pot.open:not(.done)').length === 2;
      if (d > done) { done = d; var lp = document.querySelectorAll('.pot.done'); X.fly(lp[lp.length - 1], WI + 'mg2-honey.png', $('mN'), { size: 46, ms: 550, spin: 0, end: 0.5 }); react($('mN'), true, 'bear'); $('mQ').textContent = ['냠냠, 꿀 냄새!', '좋아요, 그 짝이에요!', '역시 친구는 꿀단지 박사예요!'][done % 3]; }
      else if (two && !wasTwo) { react($('mN'), false); $('mQ').textContent = '음… 그 둘은 짝이 아니에요'; }
      wasTwo = two;
    });
    mo.observe(body.querySelector('.pots'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  };
})();
