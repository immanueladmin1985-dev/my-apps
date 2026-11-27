// 미니게임 셋째 묶음 (말씨정원): 새 놀이 코알라·햄찌, 고슴도치 배달 도착지, 펭펭 물고기 이름표.
(function () {
  var M = window.M, X = M.MG; if (!X || !M.MINIS) return;
  var G = X.GAMES, esc = X.esc, $ = function (id) { return document.getElementById(id); };
  var WI = 'img/w/';
  function sprite(cust, kind) { return WI + 'ch-' + cust + '-' + (kind || 'front') + '.png'; }
  function alive(g) { return g.alive && $('mBody'); }
  function react(el, ok, cust) {
    if (!el) return;
    el.classList.remove('hop', 'nope'); void el.offsetWidth; el.classList.add(ok ? 'hop' : 'nope');
    if (cust && ok) { el.src = sprite(cust, 'happy'); clearTimeout(el._t); el._t = setTimeout(function () { el.src = sprite(cust, 'front'); }, 800); }
  }

  // 새 주민 놀이 두 가지를 부탁 목록에 넣는다
  M.MINIS.push(
    { id: 'sleep', cust: 'koala', heart: 1, icon: '💤', name: '코알라의 잠꼬대',
      ask: '쿨… 쿨… 제가 낮잠을 자면서 외국 말로 잠꼬대를 한대요. 무슨 말을 했는지 알려 줄래요?', how: '코알라의 잠꼬대(문장)를 잘 듣고 알맞은 뜻을 골라요. 코알라를 누르면 다시 들려요.', thanks: '하암… 덕분에 꿈 내용이 다 생각났어요. 고마워요.' },
    { id: 'seeds', cust: 'hamster', heart: 1, icon: '🥜', name: '햄찌의 땅콩 세기',
      ask: '볼주머니에 땅콩을 모았는데 몇 개인지 외국 말로 세어 보고 싶어요! 같이 세어 줄래요?', how: '땅콩이 몇 개인지 외국 말로 골라요. 가끔은 반대로, 낱말을 보고 땅콩 무더기를 골라요.', thanks: '찍찍! 이제 땅콩을 외국 말로도 셀 수 있어요!' }
  );

  // ---------- 코알라 · 잠꼬대 듣기 ----------
  // 배운 문장을 코알라가 잠꼬대로 말한다. 문장 전체를 듣고 뜻을 고르는 듣기 이해 연습
  G.sleep = function (g) {
    var list = X.sentences(8); if (list.length < 3) { $('mBody').innerHTML = '<p class="center">문장을 조금 더 배우고 와 주세요!</p>'; return; }
    var others = X.sentences(20), tts = M.ttsOK ? M.ttsOK() : true, n = 0;
    function round() {
      if (!alive(g)) return;
      if (n >= list.length) { X.finish(g, list.length * 15); return; }
      var sn = list[n++], tries = 0;
      var opts = M.shuffle([sn.k].concat(M.shuffle(others.filter(function (x) { return x.k !== sn.k; }).map(function (x) { return x.k; })).slice(0, 2)));
      $('mBody').innerHTML = '<div class="gsleep"><div class="gtreebox"><button class="gnpcbtn" id="kP" aria-label="다시 듣기"><img class="gnpc gkoala" id="kN" src="' + sprite('koala') + '" alt=""></button><span class="gzz">z<br>Z</span>' +
        '<div class="gbub dream"><small>잠꼬대 ' + n + ' / ' + list.length + ' · 코알라를 누르면 다시 들려요</small>' + (tts ? '<b>💭 쿨… 쿨…</b>' : '<b class="lang-' + sn.lang + '">' + esc(sn.w.join(sn.lang === 'en' ? ' ' : '')) + '</b>') + '<em id="kT"></em></div></div>' +
        '<div class="gsopts">' + opts.map(function (o, i) { return '<button class="gtile big" data-i="' + i + '"><b>' + esc(o) + '</b></button>'; }).join('') + '</div></div>';
      var npc = $('kN'), say = function () { M.say(sn.say, sn.lang); npc.classList.remove('mumble'); void npc.offsetWidth; npc.classList.add('mumble'); };
      $('kP').onclick = say; if (tts) setTimeout(function () { if (alive(g)) say(); }, 400);
      Array.prototype.forEach.call(document.querySelectorAll('.gsopts .gtile'), function (b) {
        b.onclick = function () {
          if (!alive(g) || b.disabled) return;
          if (opts[+b.dataset.i] === sn.k) {
            X.setScore(g, g.score + (tries ? 7 : 15)); b.classList.add('ok'); M.sfx('ok'); react(npc, true, 'koala');
            $('kT').innerHTML = '<span class="lang-' + sn.lang + '">' + esc(sn.w.join(sn.lang === 'en' ? ' ' : '')) + '</span>';
            setTimeout(round, 1600);
          } else { tries++; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); if (tts) say(); }
        };
      });
    }
    round(); X.timeBar(g, 130, function () { X.finish(g, list.length * 15); });
  };

  // ---------- 햄찌 · 땅콩 세기 ----------
  // 1~10을 세는 말로 고른다 (일본어 ~こ, 중국어 ~个, 영어 peanut(s))
  var NUM = {
    ja: [['いっこ', '1개'], ['にこ', '2개'], ['さんこ', '3개'], ['よんこ', '4개'], ['ごこ', '5개'], ['ろっこ', '6개'], ['ななこ', '7개'], ['はっこ', '8개'], ['きゅうこ', '9개'], ['じゅっこ', '10개']],
    zh: [['一个', 'yí ge'], ['两个', 'liǎng ge'], ['三个', 'sān ge'], ['四个', 'sì ge'], ['五个', 'wǔ ge'], ['六个', 'liù ge'], ['七个', 'qī ge'], ['八个', 'bā ge'], ['九个', 'jiǔ ge'], ['十个', 'shí ge']],
    en: [['one peanut'], ['two peanuts'], ['three peanuts'], ['four peanuts'], ['five peanuts'], ['six peanuts'], ['seven peanuts'], ['eight peanuts'], ['nine peanuts'], ['ten peanuts']]
  };
  function numItem(lang, k) { var x = NUM[lang][k - 1]; return { t: x[0], r: lang === 'zh' ? x[1] : '', k: k + '개', lang: lang, say: x[0] }; }
  function pile(k) { return '<span class="gpile">' + '🥜'.repeat(k) + '</span>'; }
  G.seeds = function (g) {
    var lang = M.P.lang, n = 0, combo = 0;
    function round() {
      if (!alive(g)) return;
      if (n >= 10) { X.finish(g, 10 * 14); return; }
      n++; var k = 1 + Math.floor(Math.random() * 10), rev = n % 3 === 0;
      var c = [k]; while (c.length < 4) { var d = Math.max(1, Math.min(10, k + M.pick([-2, -1, 1, 2, 3, -3]))); if (c.indexOf(d) < 0) c.push(d); }
      c = M.shuffle(c);
      var it = numItem(lang, k);
      $('mBody').innerHTML = '<div class="gseeds"><div class="gcheek"><img class="gnpc" id="hN" src="' + sprite('hamster') + '" alt=""><div class="gbub"><small>' + n + ' / 10' + (combo > 1 ? ' · 🔥' + combo + '연속' : '') + '</small>' + (rev ? '<span class="wtag">' + X.wordHtml(it) + '</span><br>이만큼 골라 줘요!' : '땅콩이 몇 개일까요?') + '</div></div>' +
        (rev ? '' : '<div class="gnuts">' + pile(k) + '</div>') +
        '<div class="gsopts' + (rev ? ' piles' : '') + '">' + c.map(function (v, i) { return '<button class="gtile big" data-v="' + v + '">' + (rev ? pile(v) : X.wordHtml(numItem(lang, v))) + '</button>'; }).join('') + '</div></div>';
      var npc = $('hN');
      if (rev) M.say(it.say, lang);
      Array.prototype.forEach.call(document.querySelectorAll('.gseeds .gtile'), function (b) {
        b.onclick = function () {
          if (!alive(g) || b.disabled) return;
          if (+b.dataset.v === k) { combo++; X.setScore(g, g.score + 10 + Math.min(4, combo)); b.classList.add('ok'); M.sfx('ok'); M.say(it.say, lang); react(npc, true, 'hamster'); setTimeout(round, 900); }
          else { combo = 0; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); react(npc, false); }
        };
      });
    }
    round(); X.timeBar(g, 90, function () { X.finish(g, 10 * 14); });
  };

  // ---------- 고슴도치 · 배달 도착지 ----------
  // 길 위쪽에 차를 받을 주민 집을 보여 주고, 갈림길을 지날 때마다 가까워진다
  var oldRoad = G.road;
  G.road = function (g) {
    oldRoad(g);
    var road = document.querySelector('.road'); if (!road) return;
    var rs = (M.V ? M.V.residents() : []).filter(function (c) { return c.id !== 'hedgehog'; }), to = rs.length ? M.pick(rs) : null;
    if (!to) return;
    var h = document.createElement('div'); h.className = 'gdest';
    h.innerHTML = '<img src="' + WI + 'h-' + to.id + '.png" alt=""><small>' + esc(to.name) + '네 집</small>';
    road.appendChild(h);
    var mo = new MutationObserver(function () {
      if (!alive(g) || !$('rP')) { mo.disconnect(); return; }
      var m = /(\d+) \/ 12/.exec($('rP').textContent || ''); if (m) h.style.setProperty('--near', (+m[1] / 12).toFixed(2));
    });
    if ($('rP')) mo.observe($('rP'), { childList: true, characterData: true, subtree: true });
  };
})();
