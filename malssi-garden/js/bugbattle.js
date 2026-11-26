// 곤충 배틀 (말씨정원). 가방의 곤충으로 주민과 대결한다.
// 매 턴 기술 셋 중 하나를 고른다: 들이받기 > 붙잡기 > 날아오르기 > 들이받기 (가위바위보).
// 위아래로 움직이는 힘 막대가 가운데(★)에 있을 때 누르면 더 세게 들어간다. 기술 이름은 배우는 말로 나온다.
(function () {
  var M = window.M, esc = M.esc, $ = function (id) { return document.getElementById(id); };
  var MOVES = [
    { id: 'ram', em: '💥', ko: '들이받기', ja: ['たいあたり', 'たいあたり'], en: ['Tackle', ''], zh: ['冲撞', 'chōngzhuàng'], beats: 'grab' },
    { id: 'grab', em: '🦀', ko: '붙잡기', ja: ['つかむ', 'つかむ'], en: ['Grab', ''], zh: ['抓住', 'zhuāzhù'], beats: 'fly' },
    { id: 'fly', em: '🌪️', ko: '날아오르기', ja: ['とびあがる', 'とびあがる'], en: ['Fly up', ''], zh: ['飞起', 'fēiqǐ'], beats: 'ram' }
  ];
  // 곤충 종류마다 잘하는 기술 (그 기술이 30% 세다)
  var POWER = /beetle|stag|longhorn|chafer|jewel|dung|divingbeetle/, FLYER = /bf|butterfly|monarch|whitebf|swallowtail|peacock|moth|dragonfly|redfly|damselfly|bee|cicada|higurashi|firefly/;
  function style(id) { return POWER.test(id) ? 'ram' : FLYER.test(id) ? 'fly' : 'grab'; }
  function B() { var b = M.P.bugBattle = M.P.bugBattle || { rank: 0, lv: {}, day: '', won: {} }; if (b.day !== M.today()) { b.day = M.today(); b.won = {}; } return b; }
  function item(id) { return M.GATHER.ITEMS[id]; }
  function stats(id, lv) {
    var it = item(id), n = M.rarity(it.price).n; lv = lv || 1;
    return { hp: 40 + n * 14 + lv * 5, atk: 7 + n * 3 + lv * 1.5, style: style(id), n: n, lv: lv };
  }
  M.bugStats = stats;
  // 리그: 아래부터 차례로 이기면 다음 상대가 열린다
  var LEAGUE = [
    { cust: 'chick', bug: 'ladybug', lv: 1 }, { cust: 'squirrel', bug: 'bug-grasshopper', lv: 2 }, { cust: 'hedgehog', bug: 'bug-mantis', lv: 3 },
    { cust: 'hamster', bug: 'cicada', lv: 4 }, { cust: 'fox', bug: 'bug-longhorn', lv: 5 }, { cust: 'cat', bug: 'dragonfly', lv: 6 },
    { cust: 'bear', bug: 'beetle', lv: 7 }, { cust: 'owl', bug: 'bug-jewel', lv: 8 }, { cust: 'lion', bug: 'stag', lv: 10 }, { cust: 'monkey', bug: 'bug-goldstag', lv: 12 }
  ];
  function mvName(m) { var L = M.P.lang, v = m[L] || m.en; return { t: v[0], r: L === 'en' ? '' : v[1] }; }
  function bugName(id) { var it = item(id), L = M.P.lang, v = it[L] || it.en; return v[0]; }
  function myBugs() { var bag = (M.P.gather && M.P.gather.bag) || {}; return Object.keys(bag).filter(function (k) { return bag[k] > 0 && item(k) && item(k).cat === 'bug'; }); }

  // ---------- 배틀장 ----------
  M.bugArena = function () {
    var b = B(), mine = myBugs();
    var d = M.modal('<div class="bbhead"><h3>🪲 곤충 배틀장</h3><p class="hint">들이받기 💥 &gt; 붙잡기 🦀 &gt; 날아오르기 🌪️ &gt; 들이받기. 막대가 ★에 있을 때 누르면 세게 들어가요.</p></div>' +
      '<h4>도전 상대</h4><div class="list">' + LEAGUE.map(function (o, i) {
        var c = M.custOf(o.cust) || { name: o.cust }, lock = i > b.rank, it = item(o.bug);
        return '<button class="litem bbopp' + (lock ? ' lock' : '') + '" data-opp="' + i + '"' + (lock ? ' disabled' : '') + '><span class="le dishe"><img src="' + (M.custImg(o.cust) || it.img) + '" alt=""></span><span class="ln">' + (i + 1) + '단계 · ' + esc(c.name) + '<small>' + (lock ? '앞 단계를 이기면 열려요' : '🪲 ' + esc(it.ko) + ' Lv.' + o.lv + (b.won[i] ? ' · 오늘 이겼어요 ✔' : '')) + '</small></span><img class="bbbug" src="' + it.img + '" alt=""></button>';
      }).join('') + '</div>' + (mine.length ? '' : '<p class="hint center">가방에 곤충이 없어요. 마을에서 곤충을 잡아 와요!</p>') +
      '<button class="btn ghost wide" data-close>나가기</button>', { cls: 'bagsheet' });
    d.addEventListener('click', function (e) {
      var o = e.target.closest('[data-opp]'); if (!o || o.disabled) return;
      if (!mine.length) { M.toast('가방에 곤충이 없어요. 마을에서 곤충을 잡아 와요!'); return; }
      d.close(); pickBug(+o.dataset.opp);
    });
  };
  function pickBug(oi) {
    var b = B(), mine = myBugs().sort(function (x, y) { return stats(y, b.lv[y]).hp - stats(x, b.lv[x]).hp; });
    var d = M.modal('<h3>어떤 곤충으로 싸울까요?</h3><div class="list">' + mine.map(function (k) {
      var s = stats(k, b.lv[k]), mv = MOVES.filter(function (m) { return m.id === s.style; })[0];
      return '<button class="litem" data-bug="' + k + '"><span class="le dishe"><img src="' + item(k).img + '" alt=""></span><span class="ln">' + esc(item(k).ko) + ' <small class="rs">' + M.rarity(item(k).price).stars + '</small><small>Lv.' + s.lv + ' · 체력 ' + s.hp + ' · 힘 ' + Math.round(s.atk) + ' · 특기 ' + mv.em + mv.ko + '</small></span></button>';
    }).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>', { cls: 'bagsheet' });
    d.addEventListener('click', function (e) { var x = e.target.closest('[data-bug]'); if (!x) return; d.close(); fight(oi, x.dataset.bug); });
  }

  // ---------- 대결 ----------
  var G = null;
  function fight(oi, myId) {
    var b = B(), o = LEAGUE[oi], c = M.custOf(o.cust) || { name: '상대' };
    var me = stats(myId, b.lv[myId]), op = stats(o.bug, o.lv);
    G = { oi: oi, my: { id: myId, s: me, hp: me.hp }, op: { id: o.bug, s: op, hp: op.hp }, turn: 0, busy: false, alive: true, t0: performance.now() };
    var el = document.createElement('div'); el.id = 'bbattle'; el.className = 'bbattle';
    el.innerHTML = '<div class="bbtop"><button class="ib" id="bbQuit" aria-label="그만하기">✕</button><span>🪲 ' + esc(c.name) + '와(과) 대결</span><span id="bbTurn"></span></div>' +
      '<div class="bbfield"><div class="bbside op"><div class="bbinfo"><b>' + esc(item(o.bug).ko) + ' <small class="lang-' + M.P.lang + '">' + esc(bugName(o.bug)) + '</small></b><small>Lv.' + op.lv + '</small><div class="bbhp"><i id="bbHpO"></i></div></div><img class="bbimg" id="bbO" src="' + item(o.bug).img + '" alt=""><img class="bbcoach" src="' + (M.custImg(o.cust) || '') + '" alt=""></div>' +
      '<div class="bbmsg" id="bbMsg">기술을 골라요! 막대가 ★일 때 누르면 세게 들어가요</div>' +
      '<div class="bbside me"><img class="bbimg" id="bbM" src="' + item(myId).img + '" alt=""><div class="bbinfo"><b>' + esc(item(myId).ko) + ' <small class="lang-' + M.P.lang + '">' + esc(bugName(myId)) + '</small></b><small>Lv.' + me.lv + '</small><div class="bbhp"><i id="bbHpM"></i></div></div></div></div>' +
      '<div class="bbpow"><i id="bbPow"></i><span class="bbstar">★</span></div>' +
      '<div class="bbmoves">' + MOVES.map(function (m) { var n = mvName(m); return '<button class="bbmove' + (m.id === me.style ? ' fav' : '') + '" data-mv="' + m.id + '"><span class="bbem">' + m.em + '</span><b class="lang-' + M.P.lang + '">' + esc(n.t) + '</b>' + (n.r && n.r !== n.t ? '<small>' + esc(n.r) + '</small>' : '') + '<small>' + m.ko + (m.id === me.style ? ' · 특기' : '') + '</small></button>'; }).join('') + '</div>';
    document.body.appendChild(el); document.body.classList.add('in-mini');
    $('bbQuit').onclick = function () { M.confirm('그만할까요?', '이 대결은 진 것으로 쳐요.', '그만하기', function () { end(false); }); };
    Array.prototype.forEach.call(el.querySelectorAll('.bbmove'), function (bt) { bt.onclick = function () { choose(bt.dataset.mv); }; });
    hp(); M.say(bugName(o.bug), M.P.lang);
    (function loop() { if (!G || !G.alive) return; var p = (Math.sin((performance.now() - G.t0) / 380) + 1) / 2, bar = $('bbPow'); if (bar) bar.style.left = (p * 100) + '%'; G.pow = p; G.raf = requestAnimationFrame(loop); })();
  }
  function hp() {
    var a = $('bbHpM'), o = $('bbHpO'); if (!a) return;
    a.style.width = Math.max(0, G.my.hp / G.my.s.hp * 100) + '%'; o.style.width = Math.max(0, G.op.hp / G.op.s.hp * 100) + '%';
    $('bbTurn').textContent = (G.turn + 1) + '턴';
  }
  function aiMove() {
    // 상대는 자기 특기를 조금 더 자주 쓴다
    var w = MOVES.map(function (m) { return m.id === G.op.s.style ? 2 : 1; }), s = w[0] + w[1] + w[2], r = Math.random() * s;
    return r < w[0] ? MOVES[0] : r < w[0] + w[1] ? MOVES[1] : MOVES[2];
  }
  function choose(mid) {
    if (!G || G.busy || !G.alive) return; G.busy = true;
    var m = MOVES.filter(function (x) { return x.id === mid; })[0], om = aiMove(), n = mvName(m);
    var acc = 1 - Math.abs(G.pow - 0.5) * 2, mult = acc > 0.8 ? 1.5 : acc > 0.5 ? 1.15 : 0.9;   // 가운데일수록 세다
    M.say(n.t, M.P.lang);
    var win = m.beats === om.id ? 1 : om.beats === m.id ? -1 : 0;
    var dmgM = Math.round(G.my.s.atk * mult * (m.id === G.my.s.style ? 1.3 : 1) * (win === 1 ? 1.6 : win === 0 ? 0.5 : 0)), dmgO = Math.round(G.op.s.atk * (om.id === G.op.s.style ? 1.3 : 1) * (win === -1 ? 1.6 : win === 0 ? 0.5 : 0) * (0.9 + Math.random() * 0.2));
    var on = mvName(om);
    $('bbMsg').innerHTML = '나: ' + m.em + ' <b class="lang-' + M.P.lang + '">' + esc(n.t) + '</b> ' + (mult >= 1.5 ? '<span class="crit">완벽!</span>' : '') + ' vs 상대: ' + om.em + ' <b class="lang-' + M.P.lang + '">' + esc(on.t) + '</b><br>' + (win === 1 ? '이겼어요! ' + dmgM + ' 피해' : win === -1 ? '막혔어요… ' + dmgO + ' 피해를 입었어요' : '맞부딪혔어요! 서로 ' + dmgM + ' / ' + dmgO);
    var mi = $('bbM'), oi = $('bbO');
    mi.classList.remove('hit', 'atk'); oi.classList.remove('hit', 'atk'); void mi.offsetWidth;
    if (dmgM) { mi.classList.add('atk'); oi.classList.add('hit'); }
    if (dmgO) { oi.classList.add('atk'); mi.classList.add('hit'); }
    M.sfx(win === 1 ? 'ok' : win === -1 ? 'bad' : 'pop'); M.buzz && M.buzz(win === -1 ? [30, 30, 30] : 20);
    G.op.hp -= dmgM; G.my.hp -= dmgO; G.turn++;
    setTimeout(function () {
      if (!G) return; hp();
      if (G.op.hp <= 0 || G.my.hp <= 0) { setTimeout(function () { end(G.op.hp <= 0 && G.my.hp > 0 ? true : G.op.hp <= 0 && G.my.hp <= 0 ? G.my.hp >= G.op.hp : false); }, 600); return; }
      G.busy = false;
    }, 700);
  }
  function end(won) {
    if (!G) return; G.alive = false; cancelAnimationFrame(G.raf);
    var b = B(), o = LEAGUE[G.oi], first = won && !b.won[G.oi], up = '', coins = 0, myId = G.my.id;
    if (won) {
      coins = first ? 30 + G.oi * 15 : 8; b.won[G.oi] = 1;
      if (G.oi === b.rank && b.rank < LEAGUE.length - 1) { b.rank++; up = '<p>🏆 다음 단계 상대가 열렸어요!</p>'; }
      else if (G.oi === b.rank && b.rank === LEAGUE.length - 1 && !b.champ) { b.champ = 1; up = '<p>👑 곤충 리그 챔피언이 됐어요!</p>'; coins += 300; }
      b.lv[myId] = Math.min(20, (b.lv[myId] || 1) + 1);
      M.give({ coins: coins }); if (M.quest) M.quest('gather', 1);
    }
    M.save(); M.sfx(won ? 'win' : 'bad');
    var el = $('bbattle'); if (!el) return;
    var c = M.custOf(o.cust) || { name: '상대' };
    el.querySelector('.bbmoves').innerHTML = ''; el.querySelector('.bbpow').style.display = 'none';
    $('bbMsg').innerHTML = '<div class="bbend"><div class="tbig">' + (won ? '🎉' : '😢') + '</div><h3>' + (won ? '이겼어요!' : '졌어요…') + '</h3>' + (won ? '<p>' + esc(item(myId).ko) + '가 Lv.' + b.lv[myId] + '이 됐어요</p>' + up + M.rewardHtml({ coins: coins }) : '<p>' + esc(c.name) + ': "다음에 또 붙어요!"</p>') +
      '<button class="btn primary wide" id="bbAgain">다시 도전</button><button class="btn ghost wide" id="bbOut">배틀장으로</button></div>';
    var keep = G.oi;
    $('bbAgain').onclick = function () { close(); pickBug(keep); };
    $('bbOut').onclick = function () { close(); M.bugArena(); };
  }
  function close() { var el = $('bbattle'); if (el) el.remove(); document.body.classList.remove('in-mini'); var g = G; G = null; return g; }
  M.bugBattleTest = function (oi, id) { fight(oi, id); return function (mv) { G.pow = 0.5; choose(mv); }; };   // 자동 점검용
  M.bugBattleState = function () { return G && { my: G.my.hp, op: G.op.hp, turn: G.turn, alive: G.alive }; };
})();
