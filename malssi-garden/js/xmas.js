// 크리스마스 선물 배달 (말씨정원, 12월에만). 주민이 갖고 싶은 것을 배우는 말로 말하면, 그 뜻이 적힌 선물을 건네준다.
(function () {
  var M = window.M, X = M.MG; if (!X) return;
  var esc = X.esc, $ = function (id) { return document.getElementById(id); }, WI = 'img/w/';
  var XM = { id: 'xmas', cust: 'bear', solo: true, icon: '🎄', name: '크리스마스 선물 배달', thanks: '메리 크리스마스! 모두 선물을 받고 기뻐해요.' };
  M.xmasOn = function () { return M.now().getMonth() === 11; };
  M.xmasDone = function () { return (M.P.xmasDay || '') === M.today(); };
  M.xmasStart = function () { if (!M.xmasOn()) { M.toast('12월에 열리는 놀이예요'); return; } X.start(XM); };
  X.SCENES.xmas = [WI + 'ev-tree.png', WI + 'ev-gift.png', '마을 모두에게 선물을 전했어요! 메리 크리스마스!'];
  X.GAMES.xmas = function (g) {
    var pool = X.words(16, function (it) { return !!it.e && !/[다요]\s*$|니다|세요|\?/.test(it.k) && it.t.length <= 8; });   // 물건 낱말만 (인사말 제외) if (pool.length < 4) pool = X.words(16); if (!X.need(pool, 4)) return;
    var rs = (M.V ? M.V.residents() : []).map(function (c) { return c.id; }); if (rs.length < 3) rs = ['bear', 'squirrel', 'chick', 'panda', 'fox'];
    var n = 0, total = 8;
    function round() {
      if (!g.alive || !$('mBody')) return;
      if (n >= total) { M.P.xmasDay = M.today(); M.save(); X.finish(g, total * 10); return; }
      n++;
      var who = rs[(n * 7) % rs.length], four = M.shuffle(pool).slice(0, 4), want = four[0]; four = M.shuffle(four);
      $('mBody').innerHTML = '<div class="gxmas"><div class="gsnow"><img class="gxtree" src="' + WI + 'ev-tree.png" alt=""><img class="gnpc" id="xN" src="' + WI + 'ch-' + who + '-front.png" alt=""><button class="gbub" id="xQ"><small>' + n + ' / ' + total + ' · 눌러서 다시 듣기</small>🎁 <span class="wtag">' + X.wordHtml(want) + '</span> 갖고 싶어요!</button></div>' +
        '<div class="ggifts">' + four.map(function (it, i) { return '<button class="ggift" data-i="' + i + '"><img src="' + WI + 'ev-gift.png" alt=""><b>' + esc(it.k) + '</b></button>'; }).join('') + '</div></div>';
      var npc = $('xN'), say = function () { M.say(want.say, want.lang, false, false, 'c:' + who); };
      setTimeout(function () { if (g.alive) say(); }, 300); $('xQ').onclick = say;
      Array.prototype.forEach.call(document.querySelectorAll('.ggift'), function (b) {
        b.onclick = function () {
          if (!g.alive || b.disabled) return;
          if (four[+b.dataset.i] === want) {
            Array.prototype.forEach.call(document.querySelectorAll('.ggift'), function (x) { x.disabled = true; });
            X.setScore(g, g.score + 10); M.sfx('ok'); b.classList.add('given');
            X.fly(b.querySelector('img'), WI + 'ev-gift.png', npc, { size: 60, ms: 600, spin: 20, end: 0.6, done: function () { if (!npc.isConnected) return; npc.src = WI + 'ch-' + who + '-happy.png'; npc.classList.add('hop'); } });
            setTimeout(round, 1300);
          } else { b.disabled = true; b.classList.add('miss'); M.sfx('bad'); X.setScore(g, g.score - 2); npc.classList.remove('nope'); void npc.offsetWidth; npc.classList.add('nope'); }
        };
      });
    }
    round(); X.timeBar(g, 90, function () { X.finish(g, total * 10); });
  };
})();
