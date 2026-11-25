// 두더 영감의 땅굴 (말씨정원). 6×5칸 흙판에 숨은 보물을 도구로 파내서 찾고, 다 찾으면 아래층으로 내려간다.
//  삽: 한 칸을 한 겹, 드릴: 한 칸을 끝까지, 폭탄: 3×3을 한 겹씩, 손전등: 3×3 안에 보물이 있으면 반짝.
//  삽은 실제 시간으로 30분마다 하나씩 차고(최대 10), 레슨을 끝내면 3개를 더 받는다.
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  var COLS = 6, ROWS = 5, MAXS = 10, REFILL = 30 * 60000;
  var PRICE = { shovel: 25, drill: 30, bomb: 60, light: 40 };   // 삽은 5개 묶음
  var TOOL = { shovel: ['dg-shovel', '삽'], drill: ['dg-drill', '드릴'], bomb: ['dg-bomb', '폭탄'], light: ['dg-light', '손전등'] };
  function S() {
    var d = M.P.dig = M.P.dig || { shovel: MAXS, drill: 2, bomb: 1, light: 1, floor: 1, best: 1, at: Date.now(), board: null };
    if (d.shovel < MAXS) { var n = Math.floor((Date.now() - d.at) / REFILL); if (n > 0) { d.shovel = Math.min(MAXS, d.shovel + n); d.at += n * REFILL; } }
    if (d.shovel >= MAXS) d.at = Date.now();
    return d;
  }
  M.digReward = function () { var d = S(); d.shovel += 3; M.save(); };   // 레슨을 끝낼 때
  function table(f) {   // 층이 깊을수록 귀한 것
    return [['stone', 30], ['clay', 20], ['pebble', 12], ['silver', 10 + f], ['gold', 4 + f * 0.6], ['bone', 6], ['ammonite', 6], ['trilobite', 5], ['tooth', 4], ['amber', 3 + f * 0.3],
      ['oldkey', 2], ['ruby', 1 + f * 0.4], ['sapphire', 1 + f * 0.4], ['mammoth', f >= 5 ? 2 : 0], ['diamond', f >= 8 ? 1 + f * 0.2 : 0], ['skull', f >= 10 ? 1 : 0], ['chest', 2],
      ['min-coal', 8], ['min-iron', 7], ['min-copper', 7], ['min-quartz', 3 + f * 0.2], ['min-salt', 3], ['min-lava', f >= 3 ? 3 : 0],
      ['min-amethyst', 0.8 + f * 0.15], ['min-garnet', 0.8 + f * 0.15], ['min-peridot', 0.8 + f * 0.15], ['min-turquoise', 0.8 + f * 0.1], ['min-moonstone', 0.6 + f * 0.1], ['min-topaz', 0.5 + f * 0.12], ['min-aquamarine', 0.5 + f * 0.12],
      ['min-emerald', f >= 4 ? 0.4 + f * 0.1 : 0], ['min-opal', f >= 4 ? 0.4 + f * 0.1 : 0], ['min-platinum', f >= 3 ? 0.8 : 0], ['min-goldnugget', f >= 6 ? 0.5 : 0], ['min-meteor', f >= 6 ? 0.4 : 0], ['min-pinkdia', f >= 9 ? 0.4 : 0],
      ['min-rainbowq', f >= 8 ? 0.3 : 0], ['min-starpiece', f >= 10 ? 0.3 : 0], ['min-dragoneye', f >= 12 ? 0.25 : 0], ['min-mana', f >= 14 ? 0.2 : 0],
      ['fos-fern', 2], ['fos-shellfos', 2], ['fos-egg', f >= 3 ? 1 : 0], ['fos-trexclaw', f >= 5 ? 0.6 : 0], ['fos-trihorn', f >= 6 ? 0.5 : 0], ['fos-brachneck', f >= 7 ? 0.4 : 0], ['fos-goldorn', f >= 8 ? 0.3 : 0]];
  }
  function pickW(list) { var s = list.reduce(function (a, x) { return a + x[1]; }, 0), r = Math.random() * s; for (var i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; } return list[0][0]; }
  function newBoard(f) {
    var hard = function () { var r = Math.random(); return f < 3 ? (r < 0.7 ? 1 : 2) : f < 8 ? (r < 0.35 ? 1 : r < 0.8 ? 2 : 3) : (r < 0.2 ? 1 : r < 0.6 ? 2 : 3); };
    var cells = []; for (var i = 0; i < COLS * ROWS; i++) cells.push({ h: hard(), it: null, got: false, glow: false });
    var n = Math.min(8, 4 + Math.floor(f / 3)), idx = M.shuffle(cells.map(function (_, i) { return i; }));
    for (var k = 0; k < n; k++) cells[idx[k]].it = pickW(M.gatherLucky ? M.gatherLucky(table(f)) : table(f));
    if (Math.random() < 0.5) cells[idx[n]].it = 'word';   // 단어 바위 (보물 개수에는 넣지 않는다)
    return { cells: cells, total: n };
  }
  var tool = 'shovel';
  M.digOpen = function () {
    var d = S(); if (!d.board) { d.board = newBoard(d.floor); M.save(); }
    var el = $('digGame'); if (!el) { el = document.createElement('div'); el.id = 'digGame'; el.className = 'mgame dig'; document.body.appendChild(el); }
    el.classList.remove('hidden'); document.body.classList.add('in-mini');
    paint();
  };
  function close() { var el = $('digGame'); if (el) { el.classList.add('hidden'); el.innerHTML = ''; } document.body.classList.remove('in-mini'); if (M.render) M.render(); }
  function found(b) { return b.cells.filter(function (c) { return c.it && c.it !== 'word' && c.got; }).length; }
  function nextIn() { var d = S(); return d.shovel >= MAXS ? '' : Math.ceil((REFILL - (Date.now() - d.at)) / 60000) + '분 뒤 +1'; }
  function paint() {
    var d = S(), b = d.board, el = $('digGame'); if (!el) return;
    var done = found(b) >= b.total;
    el.innerHTML = '<div class="mhead"><button class="ib" id="dgQuit" aria-label="나가기">✕</button><span class="mgt">⛏️ 땅굴 ' + d.floor + '층</span><span class="mscore">💎 ' + found(b) + ' / ' + b.total + '</span></div>' +
      '<div class="dgmole"><img src="img/w/cust-mole.png" alt=""><div class="msay"><b>두더 영감</b><p id="dgSay">' + (done ? '허허, 다 찾았구먼! 아래층으로 내려가 볼까?' : '이 층에 보물이 <b>' + b.total + '개</b> 숨어 있다네. 단단한 흙은 여러 번 파야 해!') + '</p></div></div>' +
      '<div class="dgboard" id="dgBoard">' + b.cells.map(function (c, i) {
        var inner = '';
        if (c.h > 0) inner = '<img class="dt" src="img/w/dt-' + (c.h >= 3 ? 'rock' : c.h === 2 ? 'hard' : (c.cracked ? 'crack' : 'soft')) + '.png" alt="">' + (c.glow ? '<i class="dglow">✨</i>' : '');
        else inner = '<img class="dt" src="img/w/dt-hole.png" alt="">' + (c.it && !c.got ? '<img class="dit" src="' + (c.it === 'chest' ? 'img/w/dg-chest.png' : c.it === 'word' ? 'img/w/dg-wordrock.png' : M.GATHER.ITEMS[c.it].img) + '" alt="">' : '');
        return '<button class="dgc' + (c.h <= 0 && c.it && !c.got ? ' has' : '') + '" data-dc="' + i + '">' + inner + '</button>';
      }).join('') + '</div>' +
      '<div class="dgtools">' + Object.keys(TOOL).map(function (k) { return '<button class="dgt' + (tool === k ? ' on' : '') + '" data-tool="' + k + '"><img src="img/w/' + TOOL[k][0] + '.png" alt=""><b>' + TOOL[k][1] + '</b><i>' + d[k] + '</i></button>'; }).join('') + '</div>' +
      '<p class="hint center">' + (d.shovel < MAXS ? '삽 ' + nextIn() + ' · ' : '') + '레슨을 끝내면 삽 +3</p>' +
      (done ? '<button class="btn primary wide" id="dgNext">⬇ ' + (d.floor + 1) + '층으로 내려가기</button>' : '') +
      '<button class="btn ghost wide" id="dgShop">🛒 도구 사기</button>';
    el.onclick = onClick;
  }
  function say(t) { var s = $('dgSay'); if (s) s.innerHTML = t; }
  function onClick(e) {
    var t = e.target, d = S(), b = d.board;
    if (t.closest('#dgQuit')) { close(); return; }
    if (t.closest('#dgShop')) { shop(); return; }
    if (t.closest('#dgNext')) {
      d.floor++; d.best = Math.max(d.best, d.floor);
      if (d.floor % 10 === 1 && d.floor > 1) { M.give({ coins: 200 }); d.bomb++; d.drill += 2; M.toast('🎁 ' + (d.floor - 1) + '층 돌파 보상! 코인 200 · 폭탄 1 · 드릴 2'); }
      d.board = newBoard(d.floor); M.save(); M.sfx('win'); paint(); return;
    }
    var tb = t.closest('[data-tool]'); if (tb) { tool = tb.dataset.tool; paint(); return; }
    var cb = t.closest('[data-dc]'); if (!cb) return;
    var i = +cb.dataset.dc, c = b.cells[i];
    if (c.h <= 0) { if (c.it && !c.got) collect(i); return; }
    if (d[tool] <= 0) { say(tool === 'shovel' ? '삽이 다 떨어졌구먼. 조금 쉬었다 오거나 레슨을 하고 오게!' : TOOL[tool][1] + '이(가) 없다네. 도구 가게에서 살 수 있지.'); M.sfx('bad'); return; }
    if (tool === 'shovel' && d.shovel >= MAXS) d.at = Date.now();
    d[tool]--;
    var area = (tool === 'bomb' || tool === 'light') ? around(i) : [i];
    if (tool === 'light') {
      var any = false; area.forEach(function (j) { var x = b.cells[j]; if (x.h > 0 && x.it && x.it !== 'word') { x.glow = true; any = true; } });
      say(any ? '오호, 반짝이는 곳에 뭔가 있구먼!' : '이 근처엔 아무것도 없는 것 같군.'); M.sfx(any ? 'ok' : 'tap');
    } else {
      area.forEach(function (j) { var x = b.cells[j]; if (x.h <= 0) return; x.h = tool === 'drill' ? 0 : x.h - 1; if (x.h === 1 && tool === 'shovel') x.cracked = true; });
      M.sfx(tool === 'bomb' ? 'merge' : 'tap'); M.buzz(tool === 'bomb' ? [30, 20, 40] : 10);
      if (tool === 'bomb') boom(i);
      area.forEach(function (j) { var x = b.cells[j]; if (x.h <= 0 && x.it) say(x.it === 'word' ? '단어 바위가 나왔구먼! 눌러서 풀어 보게.' : '뭔가 나왔다! 눌러서 꺼내게.'); });
    }
    M.save(); paint();
  }
  function around(i) { var x = i % COLS, y = Math.floor(i / COLS), out = []; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) out.push(ny * COLS + nx); } return out; }
  function boom(i) {
    var bd = $('dgBoard'); if (!bd) return; var c = bd.children[i]; if (!c) return;
    var r = c.getBoundingClientRect(), f = document.createElement('img'); f.src = 'img/w/dg-boom.png'; f.className = 'dgboom';
    f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + r.height / 2) + 'px'; document.body.appendChild(f); setTimeout(function () { f.remove(); }, 600);
  }
  function collect(i) {
    var d = S(), c = d.board.cells[i];
    if (c.it === 'word') { wordRock(i); return; }
    c.got = true; M.save();
    if (c.it === 'chest') { var coins = 50 + d.floor * 10; M.give({ coins: coins }); M.sfx('win'); say('보물 상자다! 코인 ' + coins + '개가 들어 있구먼!'); }
    else M.gatherGot(c.it);
    paint();
    if (found(d.board) >= d.board.total) { M.sfx('win'); say('허허, 다 찾았구먼! 아래층으로 내려가 볼까?'); }
  }
  function wordRock(i) {
    var d = S(), items = M.learnedItems(M.P.lang).filter(function (it) { return it.k && !it.kana; });
    if (items.length < 3) { d.board.cells[i].got = true; d.shovel += 2; M.save(); paint(); return; }
    var three = M.shuffle(items).slice(0, 3), t = three[0];
    var m = M.modal('<div class="center"><img class="gbig" src="img/w/dg-wordrock.png" alt=""><h3 class="lang-' + t.lang + '">' + esc(t.t) + '</h3>' + (t.r && t.r !== t.t ? '<p class="hint">' + esc(t.r) + '</p>' : '') + '<p>바위에 새겨진 말의 뜻은?</p></div><div class="copts">' +
      M.shuffle(three).map(function (it) { return '<button class="copt" data-k="' + esc(it.k) + '">' + esc(it.k) + '</button>'; }).join('') + '</div>');
    M.say(t.say, t.lang);
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b) return;
      var ok = b.dataset.k === t.k; d.board.cells[i].got = true;
      if (ok) { d.shovel += 2; d.drill += 1; M.sfx('win'); } else M.sfx('bad');
      M.save(); m.close(); paint(); say(ok ? '정답! 삽 2개와 드릴 1개를 주겠네.' : '아쉽구먼. 정답은 「' + esc(t.k) + '」였다네.');
    });
  }
  function shop() {
    var d = S();
    var m = M.modal('<h3>🛒 두더 영감의 도구 가게</h3><div class="list">' + Object.keys(TOOL).map(function (k) {
      return '<button class="litem" data-buy="' + k + '"><span class="le"><img src="img/w/' + TOOL[k][0] + '.png" alt="" style="width:40px;height:40px;object-fit:contain"></span><span class="ln">' + TOOL[k][1] + (k === 'shovel' ? ' 5개' : '') + '<small>가진 것 ' + d[k] + '개</small></span><span class="lp"><img src="img/coin.png" alt="">' + PRICE[k] + '</span></button>';
    }).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>', { onClose: paint });
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-buy]'); if (!b) return; var k = b.dataset.buy;
      if (!M.spend('coins', PRICE[k])) { M.toast('코인이 모자라요'); return; }
      d[k] += k === 'shovel' ? 5 : 1; M.save(); M.sfx('coin'); m.close(); shop();
    });
  }
  M.digTest = { S: S, newBoard: newBoard };
})();
