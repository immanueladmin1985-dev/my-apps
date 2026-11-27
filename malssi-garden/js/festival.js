// 계절 행사 (말씨정원): 설날 연날리기(1~2월), 봄 꽃놀이 사진(4월), 여름 불꽃놀이(8월). 크리스마스(12월)는 xmas.js.
// 행사 기간에만 마을 오른쪽에 단추가 생기고, 하루 한 번 끝까지 하면 ✔가 붙는다 (P.fest[id] = 날짜).
(function () {
  var M = window.M, X = M.MG; if (!X) return;
  var esc = X.esc, $ = function (id) { return document.getElementById(id); }, WI = 'img/w/';
  function alive(g) { return g.alive && $('mBody'); }
  function bounce(el, cls) { if (!el) return; el.classList.remove('hop', 'nope'); void el.offsetWidth; el.classList.add(cls); }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  function residents() { var rs = (M.V ? M.V.residents() : []).map(function (c) { return c.id; }); return rs.length >= 3 ? rs : ['bear', 'squirrel', 'chick', 'panda', 'fox', 'cat']; }
  function done(id) { M.P.fest = M.P.fest || {}; M.P.fest[id] = M.today(); M.save(); }

  var FEST = [
    { id: 'kite', months: [0, 1], chip: '연날리기', img: 'ev-kite.png', m: { id: 'kite', cust: 'squirrel', solo: true, icon: '🪁', name: '설날 연날리기', thanks: '새해 복 많이 받으세요! 연이 구름 위까지 날았어요.' } },
    { id: 'blossom', months: [3], chip: '꽃놀이', img: 'it-flowers.png', m: { id: 'blossom', cust: 'chick', solo: true, icon: '🌸', name: '봄 꽃놀이 사진', thanks: '사진첩이 꽃잎과 웃음으로 가득해요!' } },
    { id: 'fireworks', months: [7], chip: '불꽃놀이', img: 'fx-burst.png', m: { id: 'fireworks', cust: 'fox', solo: true, icon: '🎆', name: '여름 불꽃놀이', thanks: '펑! 펑! 올해 불꽃놀이도 정말 예뻤어요.' } }
  ];
  M.festNow = function () { var mo = M.now().getMonth(); return FEST.filter(function (f) { return f.months.indexOf(mo) >= 0; })[0] || null; };
  M.festDone = function (id) { return ((M.P.fest || {})[id] || '') === M.today(); };
  M.festStart = function () { var f = M.festNow(); if (!f) { M.toast('지금은 열린 행사가 없어요'); return; } X.start(f.m); };
  M.festChip = function () { var f = M.festNow(); return f ? '<button class="wsb chip fest" data-wfest><img src="' + WI + f.img + '" alt=""><span>' + f.chip + (M.festDone(f.id) ? ' ✔' : '') + '</span></button>' : ''; };
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-wfest]')) M.festStart(); });

  X.SCENES.kite = [WI + 'ev-kite.png', WI + 'ev-pouch.png', '연이 하늘 높이 날았어요! 새해 복 많이 받으세요!'];
  X.SCENES.blossom = [WI + 'ch-chick-happy.png', WI + 'it-flowers.png', '꽃놀이 사진첩을 다 채웠어요!'];
  X.SCENES.fireworks = [WI + 'ch-fox-happy.png', WI + 'fx-burst.png', '밤하늘에 불꽃이 활짝 피었어요!'];

  // ---------- 설날 · 연날리기 ----------
  // 낱말을 듣고 뜻이 적힌 복주머니를 고르면 연이 한 칸씩 높이 오른다 (8번이면 구름 위)
  X.GAMES.kite = function (g) {
    var pool = X.words(16); if (!X.need(pool, 3)) return;
    var n = 0, total = 8, h = 0;
    function draw() { var k = $('kKite'); if (k) k.style.bottom = (8 + h * 10) + '%'; var l = $('kLine'); if (l) l.style.height = (8 + h * 10) + '%'; }
    function round() {
      if (!alive(g)) return;
      if (n >= total) { done('kite'); X.finish(g, total * 12); return; }
      n++; var three = M.shuffle(pool).slice(0, 3), want = three[0], tries = 0; three = M.shuffle(three);
      $('mBody').innerHTML = '<div class="gkitewrap"><div class="gsky" id="kSky"><i class="gcloud c1"></i><i class="gcloud c2"></i><i class="gline" id="kLine"></i><img class="gkite" id="kKite" src="' + WI + 'ev-kite.png" alt="">' +
        '<img class="gnpc gkboy" id="kN" src="' + WI + 'ch-squirrel-front.png" alt=""></div>' +
        '<div class="gkcol"><button class="gbub" id="kQ"><small>' + n + ' / ' + total + ' · 눌러서 다시 듣기</small><span class="wtag">' + X.wordHtml(want) + '</span></button>' +
        '<div class="gpouches">' + three.map(function (it, i) { return '<button class="gpouch" data-i="' + i + '"><img src="' + WI + 'ev-pouch.png" alt=""><b>' + esc(it.k) + '</b></button>'; }).join('') + '</div></div></div>';
      draw();
      var say = function () { M.say(want.say, want.lang); }; $('kQ').onclick = say; setTimeout(function () { if (alive(g)) say(); }, 300);
      each('.gpouch', function (b) {
        b.onclick = function () {
          if (!alive(g) || b.disabled) return;
          if (three[+b.dataset.i] === want) {
            each('.gpouch', function (x) { x.disabled = true; }); b.classList.add('ok');
            X.setScore(g, g.score + (tries ? 6 : 12)); M.sfx('ok'); h++;
            X.fly(b.querySelector('img'), WI + 'ev-pouch.png', $('kKite'), { size: 44, ms: 500, spin: 30, end: 0.5, done: function () { draw(); var k = $('kN'); if (k) { k.src = WI + 'ch-squirrel-happy.png'; bounce(k, 'hop'); } } });
            setTimeout(round, 1300);
          } else { tries++; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); bounce($('kKite'), 'nope'); bounce($('kN'), 'nope'); say(); }
        };
      });
    }
    round(); X.timeBar(g, 100, function () { X.finish(g, total * 12); });
  };

  // ---------- 봄 · 꽃놀이 사진 ----------
  // 벚나무 아래에서 주민이 낱말을 말하면, 그 뜻이 적힌 액자를 골라 사진을 찍는다. 사진은 아래 사진첩에 쌓인다
  X.GAMES.blossom = function (g) {
    var pool = X.words(16); if (!X.need(pool, 4)) return;
    var rs = residents(), n = 0, total = 6, album = [];
    function round() {
      if (!alive(g)) return;
      if (n >= total) { done('blossom'); X.finish(g, total * 15); return; }
      n++; var who = rs[(n * 5) % rs.length], four = M.shuffle(pool).slice(0, 4), want = four[0], tries = 0; four = M.shuffle(four);
      $('mBody').innerHTML = '<div class="gbloom"><div class="gcherry" id="bC"><i class="gpetal p1"></i><i class="gpetal p2"></i><i class="gpetal p3"></i><i class="gpetal p4"></i><i class="gpetal p5"></i>' +
        '<img class="gnpc gpose" id="bN" src="' + WI + 'ch-' + who + '-front.png" alt=""><button class="gbub" id="bQ"><small>' + n + ' / ' + total + ' · 눌러서 다시 듣기</small>📸 이 말을 하면 찍어 줘요!</button><div class="gflash" id="bF"></div></div>' +
        '<div class="gbcol2"><div class="gframes">' + four.map(function (it, i) { return '<button class="gframe" data-i="' + i + '"><b>' + (it.e ? '<i>' + it.e + '</i>' : '') + esc(it.k) + '</b></button>'; }).join('') + '</div>' +
        '<div class="galbum" id="bA">' + album.map(function (a) { return '<span><img src="' + WI + 'ch-' + a.who + '-happy.png" alt=""><small class="lang-' + a.lang + '">' + esc(a.t) + '</small></span>'; }).join('') + '</div></div></div>';
      var say = function () { M.say(want.say, want.lang, false, false, 'c:' + who); bounce($('bN'), 'hop'); };
      $('bQ').onclick = say; setTimeout(function () { if (alive(g)) say(); }, 300);
      each('.gframe', function (b) {
        b.onclick = function () {
          if (!alive(g) || b.disabled) return;
          if (four[+b.dataset.i] === want) {
            each('.gframe', function (x) { x.disabled = true; }); b.classList.add('ok');
            X.setScore(g, g.score + (tries ? 7 : 15)); M.sfx('ok');
            var f = $('bF'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
            var npc = $('bN'); npc.src = WI + 'ch-' + who + '-happy.png';
            $('bQ').innerHTML = '<span class="wtag">' + X.wordHtml(want) + '</span> = ' + esc(want.k);
            album.push({ who: who, t: want.t, lang: want.lang });
            X.fly(npc, WI + 'ch-' + who + '-happy.png', $('bA'), { size: 60, ms: 650, spin: 0, end: 0.5, done: function () { var a = $('bA'); if (!a) return; var s = document.createElement('span'); s.className = 'new'; s.innerHTML = '<img src="' + WI + 'ch-' + who + '-happy.png" alt=""><small class="lang-' + want.lang + '">' + esc(want.t) + '</small>'; a.appendChild(s); } });
            setTimeout(round, 1600);
          } else { tries++; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); bounce($('bN'), 'nope'); }
        };
      });
    }
    round(); X.timeBar(g, 100, function () { X.finish(g, total * 15); });
  };

  // ---------- 여름 · 불꽃놀이 ----------
  // 낱말이 적힌 폭죽 세 개가 밤하늘로 올라간다. 위에 적힌 뜻과 맞는 폭죽이 터지기 전에 누르면 펑!
  var COLORS = ['#ff6b8b', '#ffd34d', '#6bd1ff', '#9b7bff', '#5fe0a0'];
  X.GAMES.fireworks = function (g) {
    var pool = X.words(16); if (!X.need(pool, 3)) return;
    var hits = 0, total = 10, want = null, wave = 0;
    $('mBody').innerHTML = '<div class="gfire"><div class="gnight" id="fS"><i class="gstar s1"></i><i class="gstar s2"></i><i class="gstar s3"></i><i class="gstar s4"></i>' +
      '<img class="gnpc gfox" id="fN" src="' + WI + 'ch-fox-front.png" alt=""><div class="gwant" id="fW"></div></div></div>';
    function burst(x, y, color) {
      var s = $('fS'); if (!s) return;
      var b = document.createElement('div'); b.className = 'gboom'; b.style.left = x + 'px'; b.style.top = y + 'px';
      for (var i = 0; i < 14; i++) { var p = document.createElement('i'); p.style.setProperty('--a', (i * 360 / 14) + 'deg'); p.style.background = color; b.appendChild(p); }
      s.appendChild(b); setTimeout(function () { b.remove(); }, 1100);
    }
    function launch() {
      if (!alive(g)) return;
      if (hits >= total) { done('fireworks'); X.finish(g, total * 12); return; }
      wave++; var my = wave;
      var three = M.shuffle(pool).slice(0, 3); want = three[0]; three = M.shuffle(three);
      $('fW').innerHTML = '<small>' + hits + ' / ' + total + ' 펑!</small><b>' + (want.e ? want.e + ' ' : '') + esc(want.k) + '</b>';
      var s = $('fS');
      Array.prototype.forEach.call(s.querySelectorAll('.grocket'), function (r) { r.remove(); });
      three.forEach(function (it, i) {
        var r = document.createElement('button'); r.className = 'grocket'; r.style.left = (14 + i * 28) + '%'; r.style.animationDuration = (3.6 + Math.random() * 0.8) + 's';
        r.innerHTML = '<span class="gtail"></span>' + X.wordHtml(it); s.appendChild(r);
        r.onclick = function () {
          if (!alive(g) || r.disabled) return; r.disabled = true;
          var sr = s.getBoundingClientRect(), rr = r.getBoundingClientRect(), x = rr.left - sr.left + rr.width / 2, y = rr.top - sr.top;
          if (it === want) {
            hits++; X.setScore(g, g.score + 12); M.sfx('ok'); M.say(it.say, it.lang);
            burst(x, y, M.pick(COLORS)); r.remove(); bounce($('fN'), 'hop'); $('fN').src = WI + 'ch-fox-happy.png';
            Array.prototype.forEach.call(s.querySelectorAll('.grocket'), function (o) { o.classList.add('fade'); });
            setTimeout(function () { if (my === wave) launch(); }, 900);
          } else { M.sfx('bad'); X.setScore(g, g.score - 3); r.classList.add('fizz'); bounce($('fN'), 'nope'); }
        };
      });
      setTimeout(function () { if (my === wave && alive(g)) { M.say(want.say, want.lang); } }, 200);
      g.timers.push(setTimeout(function () { if (my === wave && alive(g)) launch(); }, 4600));   // 놓치면 다음 폭죽이 올라온다
    }
    launch(); X.timeBar(g, 75, function () { X.finish(g, total * 12); });
  };
})();
