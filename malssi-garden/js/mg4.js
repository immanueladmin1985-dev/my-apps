// 미니게임 넷째 묶음 (말씨정원): 강아지 공원, 오리 연못, 원숭이 바나나 나무, 부엉이 칠판 분필, 펭귄 낚시 바구니.
(function () {
  var M = window.M, X = M.MG; if (!X) return;
  var G = X.GAMES, esc = X.esc, $ = function (id) { return document.getElementById(id); };
  var WI = 'img/w/';
  function alive(g) { return g.alive && $('mBody'); }
  function bounce(el, cls) { if (!el) return; el.classList.remove('hop', 'nope'); void el.offsetWidth; el.classList.add(cls); }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  // ---------- 강아지 · 공원에서 공 물어 오기 ----------
  // 바둑이가 외친 말의 뜻이 적힌 과녁을 고르면, 공이 날아가고 바둑이가 달려가서 물어 온다
  var SPOTS = [{ l: 20, t: 26, s: 0.9 }, { l: 51, t: 12, s: 0.7 }, { l: 81, t: 28, s: 0.95 }];
  G.fetch = function (g) {
    var pool = X.words(14); if (!X.need(pool, 3)) return;
    var n = 0, combo = 0;
    function round() {
      if (!alive(g)) return;
      if (n >= 10) { X.finish(g, 150); return; }
      n++; var three = M.shuffle(pool).slice(0, 3), target = three[0]; three = M.shuffle(three);
      $('mBody').innerHTML = '<div class="gpark"><div class="gfield2" id="pF">' +
        three.map(function (it, i) { var s = SPOTS[i]; return '<button class="gtgt" data-i="' + i + '" style="left:' + s.l + '%;top:' + s.t + '%;--s:' + s.s + '"><img src="' + WI + 'mg2-target.png" alt=""><span class="gtsign">' + (it.e ? '<i>' + it.e + '</i>' : '') + '<b>' + esc(it.k) + '</b></span></button>'; }).join('') +
        '<div class="gdog" id="pD"><img id="pDi" src="' + WI + 'ch-dog-side.png" alt=""><img class="gdball" id="pBall" src="' + WI + 'mg2-ball.png" alt=""></div></div>' +
        '<div class="gpcol"><div class="gbub" id="pB"><small>' + n + ' / 10' + (combo > 1 ? ' · 🔥' + combo + '연속' : '') + '</small><b>멍! 멍!</b><br>바둑이가 뭐라고 외쳤을까요?<em id="pW"></em></div><button class="btn" id="pPlay">🔊 다시 듣기</button></div></div>';
      var say = function () { M.say(target.say, target.lang); bounce($('pDi'), 'hop'); };
      $('pPlay').onclick = say; setTimeout(function () { if (alive(g)) say(); }, 300);
      each('.gtgt', function (b) {
        b.onclick = function () {
          if (!alive(g) || b.disabled) return;
          var it = three[+b.dataset.i];
          if (it !== target) { combo = 0; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); bounce($('pDi'), 'nope'); return; }
          combo++; X.setScore(g, g.score + 10 + Math.min(5, combo)); M.sfx('ok'); b.classList.add('ok');
          each('.gtgt', function (x) { x.disabled = true; });
          var dog = $('pD'), di = $('pDi'), ball = $('pBall'), s = SPOTS[+b.dataset.i];
          X.fly(ball, WI + 'mg2-ball.png', b.querySelector('img'), { size: 30, ms: 450, spin: 540, end: 0.9 }); ball.style.visibility = 'hidden';
          dog.classList.toggle('flip', s.l < 50); dog.classList.add('run');
          dog.style.left = s.l + '%'; dog.style.bottom = (100 - s.t - 46 * s.s) + '%'; dog.style.setProperty('--ds', (0.75 + s.s * 0.25).toFixed(2));
          $('pW').innerHTML = X.wordHtml(target);
          setTimeout(function () {   // 공을 물고 돌아온다
            if (!alive(g)) return;
            b.classList.add('got'); ball.style.visibility = ''; dog.classList.remove('run'); dog.classList.add('back');
            dog.classList.toggle('flip', s.l >= 50); dog.style.left = ''; dog.style.bottom = ''; dog.style.removeProperty('--ds');
          }, 700);
          setTimeout(function () { if (!alive(g)) return; dog.classList.remove('back', 'flip'); di.src = WI + 'ch-dog-happy.png'; bounce(di, 'hop'); M.say(target.say, target.lang); }, 1350);
          setTimeout(round, 2100);
        };
      });
    }
    round(); X.timeBar(g, 90, function () { X.finish(g, 150); });
  };

  // ---------- 오리 · 연못에서 따라 말하기 ----------
  // 맞힐 때마다 새끼 오리가 한 마리씩 엄마 꽥꽥이를 따라온다
  G.echo = function (g) {
    var pool = X.words(10, function (it) { return it.t.length <= 10; }); if (!X.need(pool, 3)) return;
    var mic = M.speechOK() && M.P.set.speak !== false, n = 0, list = pool.slice(0, 8), kids = 0;
    function ripple() { var w = $('eW'); if (!w) return; var r = document.createElement('i'); r.className = 'grip'; w.appendChild(r); setTimeout(function () { r.remove(); }, 1300); }
    function addKid() {
      kids++; var d = $('eD'); if (!d) return;
      var k = document.createElement('img'); k.className = 'gkid new'; k.src = WI + 'ch-duck-front.png'; k.alt = ''; d.appendChild(k);
    }
    function scene(it, inner) {
      return '<div class="gpond"><div class="gwater" id="eW"><div class="glily2"><img src="' + WI + 'mg2-lily.png" alt=""><div class="gword">' + X.wordHtml(it) + '<small>' + esc(it.k) + '</small></div></div>' +
        '<div class="gducks" id="eD"><button class="gnpcbtn" id="eNb" aria-label="다시 듣기"><img class="gnpc gduck" id="eN" src="' + WI + 'ch-duck-side.png" alt=""></button>' +
        new Array(kids + 1).join('<img class="gkid" src="' + WI + 'ch-duck-front.png" alt="">') + '</div></div><div class="gecol">' + inner + '</div></div>';
    }
    function good(pts, msg) {
      X.setScore(g, g.score + pts); M.sfx('ok'); ripple(); addKid();
      var d = $('eN'); if (d) { d.src = WI + 'ch-duck-happy.png'; bounce(d, 'hop'); }
      if (msg && $('eMsg')) $('eMsg').innerHTML = msg;
      setTimeout(round, 1300);
    }
    function round() {
      if (!alive(g)) return;
      if (n >= list.length) { X.finish(g, list.length * 15); return; }
      var it = list[n++], fails = 0;
      var say = function () { M.say(it.say, it.lang); ripple(); bounce($('eN'), 'hop'); };
      var head = '<div class="gbub"><small>' + n + ' / ' + list.length + ' · 새끼 오리 ' + kids + '마리</small>';
      if (mic) {
        $('mBody').innerHTML = scene(it, head + '꽥꽥이를 따라 말해 보세요</div><div class="ebtns"><button class="btn" id="eHear">🔊 듣기</button><button class="btn primary emic" id="eMic"><img class="mi" src="' + WI + 'mg2-mic.png" alt=""> 말하기</button></div><p class="hint center" id="eMsg"></p><button class="btn ghost wide hidden" id="eSkip">넘어가기</button>');
        $('eSkip').onclick = function () { round(); };
        $('eMic').onclick = function () {
          var b = $('eMic'); if (b.classList.contains('on')) { try { M._rec.stop(); } catch (e) {} return; }
          b.classList.add('on'); $('eMsg').textContent = '듣고 있어요… 말해 보세요';
          var targets = [it.t, it.say].concat(it.alt || []); if (it.r && it.lang === 'ja') targets.push(it.r.split(' · ')[0]);
          M.listen(it.lang).then(function (res) {
            if (!alive(g) || !$('eMic')) return; $('eMic').classList.remove('on');
            if (!res.length) { $('eMsg').textContent = '소리가 들리지 않았어요. 다시 눌러 보세요'; return; }
            var bm = M.bestMatch(res, targets, it.lang);
            if (bm.s >= 0.42) good(Math.round(8 + bm.s * 7), '꽥! 잘했어요 · 들린 말: <b>' + esc(bm.h) + '</b>');
            else { fails++; M.sfx('bad'); bounce($('eN'), 'nope'); $('eMsg').innerHTML = '들린 말: <b>' + esc(bm.h) + '</b> · 한 번 더!'; if (fails >= 2) $('eSkip').classList.remove('hidden'); }
          }).catch(function () { if (!alive(g)) return; mic = false; M.toast('마이크를 쓸 수 없어서 듣고 고르기로 바꿨어요'); n--; round(); });
        };
      } else {
        var three = M.shuffle([it].concat(M.shuffle(pool.filter(function (x) { return x !== it; })).slice(0, 2)));
        $('mBody').innerHTML = scene({ t: '？', k: '꽥꽥이가 한 말은?', lang: it.lang }, head + '꽥꽥이가 한 말을 연잎에서 골라요</div><button class="btn" id="eHear">🔊 다시 듣기</button>' +
          '<div class="glopts">' + three.map(function (x, i) { return '<button class="glopt" data-i="' + i + '"><img src="' + WI + 'mg2-lily.png" alt=""><span>' + X.wordHtml(x) + '</span></button>'; }).join('') + '</div><p class="hint center" id="eMsg"></p>');
        each('.glopt', function (b) {
          b.onclick = function () {
            if (!alive(g) || b.disabled) return;
            if (three[+b.dataset.i] === it) { each('.glopt', function (x) { x.disabled = true; }); b.classList.add('ok'); var gw = document.querySelector('.glily2 .gword'); if (gw) gw.innerHTML = X.wordHtml(it) + '<small>' + esc(it.k) + '</small>'; good(fails ? 6 : 15); }
            else { fails++; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); bounce($('eN'), 'nope'); say(); }
          };
        });
      }
      $('eHear').onclick = say; $('eNb').onclick = say;
      setTimeout(function () { if (alive(g)) say(); }, 300);
    }
    round(); X.timeBar(g, 150, function () { X.finish(g, list.length * 15); });
  };

  // ---------- 원숭이 · 바나나 나무 ----------
  // 나무 가지에 바나나가 매달렸다가 올라간다. 원숭이가 말한 뜻의 바나나를 누르면 떨어져서 바구니에 담긴다
  var BSPOT = [[17, 30], [40, 20], [63, 28], [25, 56], [50, 50], [75, 56]];
  G.banana = function (g) {
    var pool = X.words(14); if (!X.need(pool, 4)) return;
    var target = null, hits = 0, up = {}, speed = 1900, got = 0;
    $('mBody').innerHTML = '<div class="gbtree"><div class="gtreebig" id="nTr"><div class="gtrunk"></div><div class="gcanopy"></div>' +
      BSPOT.map(function (p, i) { return '<button class="gbspot" data-h="' + i + '" style="left:' + p[0] + '%;top:' + p[1] + '%"><span class="gstem"></span></button>'; }).join('') +
      '<img class="gnpc gmonk" id="nM" src="' + WI + 'ch-monkey-front.png" alt=""><div class="gbkt"><img id="nBk" src="' + WI + 'mg2-basket.png" alt=""><b id="nCnt">0</b></div></div>' +
      '<div class="gbcol"><div class="gbub"><small>이 뜻의 바나나를 따 줘요!</small><span id="nT"></span></div></div></div>';
    function newTarget() { target = M.pick(pool); hits = 0; $('nT').innerHTML = (target.e ? '<span class="ge">' + target.e + '</span>' : '') + '<b>' + esc(target.k) + '</b>'; }
    newTarget();
    function hide(h) { var b = document.querySelector('[data-h="' + h + '"]'); delete up[h]; if (b) { b.classList.remove('up'); setTimeout(function () { if (!up[h]) b.innerHTML = '<span class="gstem"></span>'; }, 300); } }
    function pop() {
      if (!alive(g)) return;
      var free = [0, 1, 2, 3, 4, 5].filter(function (i) { return !up[i]; }); if (!free.length) return;
      var shown = Object.keys(up).map(function (k) { return up[k]; });
      var hasT = shown.some(function (x) { return x.k === target.k; });
      var h = M.pick(free), it = !hasT && Math.random() < 0.5 ? target : M.pick(pool.filter(function (x) { return x.k !== target.k; })), b = document.querySelector('[data-h="' + h + '"]');
      up[h] = it; b.innerHTML = '<span class="gstem"></span><img class="gban" src="' + WI + 'mg2-banana.png" alt=""><span class="gbw">' + X.wordHtml(it) + '</span>';
      void b.offsetWidth; b.classList.add('up');
      g.timers.push(setTimeout(function () { if (up[h] === it) hide(h); }, speed));
    }
    $('nTr').onclick = function (e) {
      if (!alive(g)) return;
      var b = e.target.closest('.gbspot'); if (!b) return; var h = +b.dataset.h, it = up[h]; if (!it) return;
      var monk = $('nM');
      if (it.k === target.k) {
        X.setScore(g, g.score + 5); M.sfx('ok'); M.say(it.say, it.lang);
        X.fly(b.querySelector('.gban'), WI + 'mg2-banana.png', $('nBk'), { size: 54, ms: 520, spin: 160, end: 0.5, dyk: 0.3, done: function () { got++; var c = $('nCnt'); if (c) c.textContent = got; bounce($('nBk'), 'hop'); } });
        delete up[h]; b.classList.remove('up'); b.classList.add('picked'); b.innerHTML = '<span class="gstem"></span>'; setTimeout(function () { b.classList.remove('picked'); }, 400);
        monk.src = WI + 'ch-monkey-happy.png'; bounce(monk, 'hop'); clearTimeout(monk._t); monk._t = setTimeout(function () { monk.src = WI + 'ch-monkey-front.png'; }, 700);
        hits++; speed = Math.max(1100, speed - 40); if (hits >= 3) newTarget();
      } else { X.setScore(g, g.score - 3); M.sfx('bad'); b.classList.add('shake'); setTimeout(function () { b.classList.remove('shake'); }, 400); bounce(monk, 'nope'); hide(h); }
    };
    var iv = setInterval(function () { pop(); if (Math.random() < 0.35) pop(); }, 800); g.timers.push(iv); pop(); pop();
    X.timeBar(g, 60, function () { X.finish(g, 110); });
  };

  // ---------- 부엉이 · 칠판 받아쓰기: 누른 글자가 분필 글씨로 날아가 적힌다 ----------
  var oldDict = G.dict;
  G.dict = function (g) {
    oldDict(g);
    var body = $('mBody'); if (!body) return;
    body.addEventListener('click', function (e) {
      var t = e.target.closest('.dtile'); if (!t || t.disabled) return;
      var slot = null; each('.dslot', function (s) { if (!slot && !s.textContent) slot = s; }); if (!slot) return;
      var a = t.getBoundingClientRect(), b = slot.getBoundingClientRect(), ch = document.createElement('span');
      ch.className = 'gchalk lang-' + M.P.lang; ch.textContent = t.textContent;
      ch.style.left = a.left + a.width / 2 + 'px'; ch.style.top = a.top + a.height / 2 + 'px'; document.body.appendChild(ch);
      if (ch.animate) ch.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(calc(-50% + ' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px), calc(-50% + ' + (b.top + b.height / 2 - a.top - a.height / 2) + 'px)) scale(1.15)' }], { duration: 260, easing: 'ease-out' });
      setTimeout(function () { ch.remove(); }, 250);
      setTimeout(function () { slot.classList.remove('chalkin'); void slot.offsetWidth; slot.classList.add('chalkin'); }, 0);
    }, true);
    // 맞히면 부엉이 박사가 뛴다
    var mo = new MutationObserver(function () {
      if (!alive(g)) { mo.disconnect(); return; }
      var s = $('dS'); if (s && s.classList.contains('ok') && !s._hop) { s._hop = 1; bounce(document.querySelector('.dowl'), 'hop'); }
    });
    mo.observe(body, { attributes: true, subtree: true, attributeFilter: ['class'] });
  };

  // ---------- 펭귄 · 낚시: 잡은 물고기가 양동이에 쌓인다 ----------
  var oldFish = G.fish;
  G.fish = function (g) {
    oldFish(g);
    var pond = $('fI'); if (!pond) return;
    var cnt = 0, bk = document.createElement('div'); bk.className = 'gfbucket'; bk.innerHTML = '<span>🪣</span><b id="fCnt">0</b>마리'; pond.appendChild(bk);
    var mo = new MutationObserver(function (ms) {
      if (!alive(g)) { mo.disconnect(); return; }
      ms.forEach(function (m) { var el = m.target; if (el.classList && el.classList.contains('caught') && !el._cnt) { el._cnt = 1; cnt++; setTimeout(function () { var c = $('fCnt'); if (c) { c.textContent = cnt; bounce(bk, 'hop'); } bounce(document.querySelector('.ppg'), 'hop'); }, 600); } });
    });
    mo.observe(pond, { attributes: true, subtree: true, attributeFilter: ['class'] });
  };
})();
