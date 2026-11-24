// 말씨정원 정원 가게
//  - 밭 위의 생산기를 누르면(물방울) 재료가 나오고, 같은 것끼리 합치면 자란다.
//  - 손님이 카운터에 와서 의뢰하고, 채워 주면 코인·꽃 포인트·가게 경험치·친밀도를 받는다.
//  - 가게 레벨이 오르면 새 생산기·손님·작업대 제작법이 열리고, 밭을 한 줄씩 넓힐 수 있다.
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  var COLS = 6, GEN_COST = 5, MAX_ROWS = 10;

  // ---------- 물건 정의 (img 가 없는 것은 임시로 이모지) ----------
  var CHAINS = {
    f: { name: '꽃', names: ['꽃씨', '새싹', '꽃봉오리', '분홍 꽃', '황금 꽃'], img: 'flower', gen: 'seed' },
    t: { name: '과일나무', names: ['도토리', '어린 나무', '나무', '사과나무', '황금 사과나무'], img: 'tree', gen: 'acorn' },
    h: { name: '꿀', names: ['꿀방울', '꿀병', '꿀단지', '벌집', '황금 꿀단지'], img: 'honey', gen: 'hive' },
    b: { name: '블루베리', names: ['블루베리 한 알', '블루베리 송이', '블루베리 바구니', '블루베리잼', '블루베리 파이'], img: 'berry', gen: 'bush' },
    c: { name: '차', names: ['찻잎', '찻잎 묶음', '찻잔', '찻주전자', '황금 티세트'], img: 'tea', gen: 'tea' }
  };
  var GENS = {
    seed: { name: '씨앗 주머니', em: '👝', chain: 'f', lv: 1 },
    acorn: { name: '도토리 바구니', em: '🪵', chain: 't', lv: 1 },
    hive: { name: '벌통', em: '🐝', chain: 'h', lv: 3 },
    bush: { name: '베리 덤불', em: '🌳', chain: 'b', lv: 5 },
    tea: { name: '찻잎 화분', em: '🪴', chain: 'c', lv: 7 }
  };
  var PRODUCTS = {
    bouquet: { name: '꽃다발', em: '💐', need: [['f', 4, 2]], min: 3, lv: 4 },
    flowertea: { name: '꽃꿀', em: '🧋', need: [['f', 4, 1], ['h', 3, 1]], min: 10, lv: 4 },
    jam: { name: '사과잼', em: '🍎', need: [['t', 4, 1], ['h', 2, 1]], min: 10, lv: 5 },
    basket: { name: '과일 바구니', em: '🧺', need: [['t', 4, 1], ['b', 3, 1]], min: 15, lv: 6 },
    honeycake: { name: '허니 케이크', em: '🍰', need: [['h', 4, 1], ['b', 2, 2]], min: 30, lv: 6 },
    wreath: { name: '화관', em: '🌼', need: [['f', 3, 2], ['clover', 0, 1]], min: 20, lv: 7 },
    tart: { name: '베리 타르트', em: '🍮', need: [['b', 4, 1], ['c', 3, 1]], min: 30, lv: 8 },
    giftbox: { name: '선물 상자', em: '🎁', need: [['f', 5, 1], ['h', 5, 1]], min: 60, lv: 10 }
  };
  var RARES = {
    clover: { name: '네잎클로버', em: '🍀', sell: { coins: 15 } },
    rainbow: { name: '무지개 꽃', em: '🌈', sell: { coins: 30, fp: 5 } },
    gseed: { name: '황금 씨앗', em: '🌟', sell: { coins: 20 } }
  };
  var CUSTOMERS = [
    { id: 'bear', em: '🐻', name: '곰돌이', lv: 1, likes: ['f', 't'] },
    { id: 'squirrel', em: '🐿️', name: '다람이', lv: 1, likes: ['t', 'f'] },
    { id: 'chick', em: '🐥', name: '삐약이', lv: 1, likes: ['f'] },
    { id: 'hedgehog', em: '🦔', name: '고슴이', lv: 3, likes: ['h', 'f'] },
    { id: 'panda', em: '🐼', name: '판다', lv: 5, likes: ['b', 't', 'p'] },
    { id: 'fox', em: '🦊', name: '여우', lv: 7, likes: ['c', 'p'] },
    { id: 'koala', em: '🐨', name: '코알라', lv: 8, likes: ['c', 'h', 'p'] },
    { id: 'hamster', em: '🐹', name: '햄찌', lv: 10, likes: ['p', 'b'] }
  ];
  var CUST_IMG = { bear: 1, squirrel: 1, hedgehog: 1, chick: 1, panda: 1, fox: 1, koala: 1, hamster: 1 };   // 손님 그림이 생기면 { bear: 1, ... } 로 켠다 (img/cust-bear.png, img/cust-bear-happy.png)
  var VAL = { 1: 1, 2: 4, 3: 9, 4: 20, 5: 45 }, FPV = { 2: 1, 3: 3, 4: 6, 5: 15 };
  var SELL = [null, { coins: 1 }, { coins: 3 }, { coins: 8 }, { coins: 30, fp: 3 }];
  var ROW_COST = { 4: 100, 5: 180, 6: 280, 7: 400, 8: 550, 9: 720 };
  M.SHOP = { CHAINS: CHAINS, GENS: GENS, PRODUCTS: PRODUCTS, RARES: RARES, CUSTOMERS: CUSTOMERS };

  var sel = -1, lastAct = Date.now(), combo = 0, comboAt = 0;
  M.craftScale = 1;   // 자동 점검에서 제작 시간을 줄일 때 쓴다

  // ---------- 상태 ----------
  function G() {
    var g = M.P.garden;
    g.found = g.found || {}; g.orders = g.orders || []; g.done = g.done || 0; g.lv = g.lv || 1; g.xp = g.xp || 0;
    g.friends = g.friends || {}; g.inbox = g.inbox || []; g.bench = g.bench || { slots: [null] };
    if (g.orders.some(function (o) { return !o || !o.cust; })) g.orders = g.orders.filter(function (o) { return o && o.cust; });   // 예전 판의 주문은 버린다
    if (!g.rows) {   // 예전 판(칸 단위로 열던 밭)에서 옮겨 온다
      g.rows = Math.min(MAX_ROWS, Math.max(4, Math.ceil((g.open || 20) / COLS)));
      var keep = (g.cells || []).slice(0, g.rows * COLS), extra = (g.cells || []).slice(g.rows * COLS).filter(Boolean);
      while (keep.length < g.rows * COLS) keep.push(null);
      g.cells = keep; g.inbox = g.inbox.concat(extra);
    }
    while (g.cells.length < g.rows * COLS) g.cells.push(null);
    if (g.cells.length > g.rows * COLS) g.cells.length = g.rows * COLS;
    if (!g.gensPlaced) { g.gensPlaced = true; giveGen(g, 'seed', 0); giveGen(g, 'acorn', 1); }
    var slots = g.lv >= 10 ? 2 : 1; while (g.bench.slots.length < slots) g.bench.slots.push(null);
    return g;
  }
  function giveGen(g, id, prefer) {
    if (g.cells.some(function (x) { return x && x.g === id; }) || g.inbox.some(function (x) { return x && x.g === id; })) return;
    var c = prefer != null && !g.cells[prefer] ? prefer : g.cells.indexOf(null);
    if (c >= 0) g.cells[c] = { g: id }; else g.inbox.push({ g: id });
  }
  function N() { return G().rows * COLS; }
  function keyOf(x) { return !x ? '' : x.k ? x.k + x.l : x.p ? 'p:' + x.p : x.r ? 'r:' + x.r : 'g:' + x.g; }
  function needKey(r) { return r.p ? 'p:' + r.p : r.r ? 'r:' + r.r : r.k + r.l; }
  function count(key) { var g = G(), n = 0; for (var i = 0; i < N(); i++) if (keyOf(g.cells[i]) === key) n++; return n; }
  function nameOf(x) { return x.k ? CHAINS[x.k].names[x.l - 1] : x.p ? PRODUCTS[x.p].name : x.r ? RARES[x.r].name : GENS[x.g].name; }
  function chainOn(k) { return G().lv >= GENS[CHAINS[k].gen].lv; }
  function iconHtml(x, cls) {
    cls = cls || 'gi';
    if (x.k && CHAINS[x.k].img) return '<img class="' + cls + ' lv' + x.l + '" src="img/' + CHAINS[x.k].img + '-' + x.l + '.png" alt="" draggable="false">';
    var kind = x.k ? 'lv' + x.l : x.p ? 'prod' : x.r ? 'rare' : 'gen';
    var src = x.p ? 'prod-' + x.p : x.r ? 'rare-' + x.r : x.g ? 'gen-' + x.g : '';
    var em = src ? '<img src="img/' + src + '.png" alt="" draggable="false">' : CHAINS[x.k].em[x.l - 1];
    return '<span class="' + cls + ' ge ' + kind + (src ? ' hasimg' : '') + '">' + em + (x.k ? '<i class="glv">' + x.l + '</i>' : '') + (x.g ? '<i class="gcost">💧' + GEN_COST + '</i>' : '') + '</span>';
  }
  function needIcon(r) { return iconHtml(r.p ? { p: r.p } : r.r ? { r: r.r } : { k: r.k, l: r.l }, 'ni'); }

  // ---------- 가게 레벨 ----------
  function xpNeed(lv) { return 10 + lv * 8; }
  function maxRows() { return Math.min(MAX_ROWS, 3 + G().lv); }
  function unlocksAt(lv) {
    var u = [];
    Object.keys(GENS).forEach(function (id) { if (GENS[id].lv === lv) u.push(GENS[id].em + ' 새 생산기: ' + GENS[id].name + ' (밭에 놓았어요)'); });
    CUSTOMERS.forEach(function (c) { if (c.lv === lv) u.push(c.em + ' 새 손님: ' + c.name); });
    if (lv === 4) u.push('🛠️ 작업대가 열렸어요! 재료를 조합해 특별한 물건을 만들어요');
    Object.keys(PRODUCTS).forEach(function (id) { if (PRODUCTS[id].lv === lv) u.push(PRODUCTS[id].em + ' 새 제작법: ' + PRODUCTS[id].name); });
    if (lv === 10) u.push('🛠️ 작업대 칸이 하나 더 생겼어요');
    if (3 + lv <= MAX_ROWS) u.push('🔨 밭을 ' + (3 + lv) + '줄까지 넓힐 수 있어요');
    return u;
  }
  function addXp(n) {
    var g = G(); g.xp += n;
    var ups = [];
    while (g.xp >= xpNeed(g.lv)) { g.xp -= xpNeed(g.lv); g.lv++; ups.push(g.lv); Object.keys(GENS).forEach(function (id) { if (GENS[id].lv === g.lv) giveGen(g, id); }); }
    G(); M.save();
    if (ups.length) setTimeout(function () {
      M.sfx('win');
      var lv = ups[ups.length - 1], list = [];
      ups.forEach(function (l) { list = list.concat(unlocksAt(l)); });
      M.modal('<div class="center"><div class="tbig">🏪</div><h3>가게 레벨 ' + lv + '!</h3><ul class="unl">' + list.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul><button class="btn primary wide" data-close>좋아요</button></div>', { onClose: function () { M.renderGarden($('gardenView')); } });
    }, M.fast ? 0 : 700);
  }

  // ---------- 손님 의뢰 ----------
  function custOf(id) { return CUSTOMERS.filter(function (c) { return c.id === id; })[0]; }
  function genOrder() {
    var g = G(), lv = g.lv;
    var starter = [[{ k: 'f', l: 2, n: 1 }], [{ k: 'f', l: 3, n: 1 }], [{ k: 't', l: 2, n: 1 }]];
    var here = g.orders.map(function (o) { return o.cust; });
    var pool = CUSTOMERS.filter(function (c) { return c.lv <= lv; });
    var free = pool.filter(function (c) { return here.indexOf(c.id) < 0; });
    var cust = M.pick(free.length ? free : pool);
    var need = [], rare = false;
    var chains = Object.keys(CHAINS).filter(chainOn);
    var prods = lv >= 4 ? Object.keys(PRODUCTS).filter(function (id) { return PRODUCTS[id].lv <= lv; }) : [];
    if (g.done < 3 && !g.orders.some(function (o) { return o.starter === g.done; })) need = starter[g.done].slice();
    else if (lv >= 4 && Math.random() < 0.12) {
      rare = true;
      need = [{ r: M.pick(['clover', 'clover', 'rainbow', 'gseed']), n: 1 }, { k: M.pick(chains), l: 4, n: 1 }];
    } else {
      var maxL = Math.min(5, 2 + Math.floor((lv + 1) / 2));
      var cnt = lv < 3 ? 1 : Math.random() < (lv < 6 ? 0.4 : 0.55) ? 2 : 1;
      var likes = cust.likes.filter(function (k) { return k === 'p' ? prods.length : CHAINS[k] && chainOn(k); });
      for (var i = 0; i < cnt; i++) {
        var pick = M.pick(likes.length ? likes : chains);
        if (pick === 'p' && prods.length && Math.random() < 0.6) { var pid = M.pick(prods); if (!need.some(function (r) { return r.p === pid; })) need.push({ p: pid, n: 1 }); continue; }
        if (pick === 'p') pick = M.pick(chains);
        var l = 2 + Math.floor(Math.pow(Math.random(), 1.4) * (maxL - 1));
        if (need.some(function (r) { return r.k === pick && r.l === l; })) continue;
        need.push({ k: pick, l: l, n: l <= 3 ? M.rand(1, 2) : 1 });
      }
      if (!need.length) need.push({ k: 'f', l: 2, n: 1 });
    }
    var rw = { coins: 0, fp: 0, xp: 0 };
    need.forEach(function (r) {
      if (r.p) { var P = PRODUCTS[r.p]; rw.coins += 40 + P.min * 2; rw.fp += 8 + Math.round(P.min / 3); rw.xp += 8; }
      else if (r.r) { rw.coins += 30; rw.fp += 20; rw.xp += 10; }
      else { rw.coins += VAL[r.l] * r.n; rw.fp += (FPV[r.l] || 0) * r.n; rw.xp += r.l * r.n; }
    });
    return { id: 'o' + Date.now() + Math.floor(Math.random() * 1e4), cust: cust.id, need: need, rw: rw, rare: rare, starter: g.done < 3 ? g.done : null };
  }
  function ensureOrders() { var g = G(); while (g.orders.length < 3) g.orders.push(genOrder()); }
  function ready(o) { return o.need.every(function (r) { return count(needKey(r)) >= r.n; }); }
  function benchDone() { var now = Date.now(); return G().bench.slots.some(function (s) { return s && s.until <= now; }); }
  M.gardenOrderReady = function () { return G().orders.some(ready) || (G().lv >= 4 && benchDone()); };

  // ---------- 그리기 ----------
  M.renderGarden = function (root) {
    if (!root) return;
    ensureOrders();
    var g = G(), R = g.rows, H = 296 + 191 * R;   // 그림 기준(가로 1496) 높이
    var h = '<div class="garden"><div class="shophead"><b>🏪 ' + esc(M.P.petName) + '네 정원 가게</b><span class="slv">Lv.' + g.lv + '</span><div class="mbar"><i style="width:' + Math.round(g.xp / xpNeed(g.lv) * 100) + '%"></i></div><small>' + g.xp + '/' + xpNeed(g.lv) + '</small></div>' +
      '<div class="counter" id="gCounter"></div><div class="orders" id="gOrders"></div>' +
      '<div class="board" id="board" style="--bh:' + (H / 1496).toFixed(4) + ';aspect-ratio:1496/' + H + '"><img class="btop" src="img/garden-top.png" alt=""><img class="bbot" src="img/garden-bot.png" alt="">';
    h += '<div class="bcells" id="grid" style="top:' + (180 / H * 100) + '%;bottom:' + (116 / H * 100) + '%;grid-template-rows:repeat(' + R + ',minmax(0,1fr))">';
    for (var i = 0; i < R * COLS; i++) h += '<div class="cell" data-c="' + i + '"></div>';
    h += '</div></div><div id="gExpand"></div><div class="gpanel" id="gPanel"></div><div id="gBench"></div><div class="gbook" id="gBook"></div></div>';
    root.innerHTML = h;
    for (i = 0; i < R * COLS; i++) paintCell(i);
    placeInbox(); paintOrders(); panel(); paintBook(); paintExpand(); paintBench();
  };
  function cellEl(c) { return document.querySelector('#grid .cell[data-c="' + c + '"]'); }
  function paintCell(c) {
    var el = cellEl(c); if (!el) return null;
    var it = G().cells[c];
    el.className = 'cell' + (c === sel ? ' sel' : '') + (it && it.g ? ' hasgen' : '');
    el.innerHTML = it ? iconHtml(it) : '';
    return el;
  }
  function placeInbox() {
    var g = G(), moved = false;
    while (g.inbox.length && g.cells.indexOf(null) >= 0) { var c = g.cells.indexOf(null); g.cells[c] = g.inbox.shift(); paintCell(c); moved = true; }
    if (moved) M.save();
  }
  function paintOrders() {
    var el = $('gOrders'); if (!el) return;
    var g = G();
    var ct = $('gCounter');
    if (ct) ct.innerHTML = '<div class="custs">' + g.orders.map(function (o, i) {
      var c = custOf(o.cust), ok = ready(o);
      return '<div class="cust' + (ok ? ' happy' : '') + '" style="left:' + (34 + i * 16) + '%">' + (CUST_IMG[c.id] ? '<img src="img/cust-' + c.id + (ok ? '-happy' : '') + '.png" alt="' + esc(c.name) + '">' : '<span class="cem">' + c.em + '</span>') + (o.rare ? '<i class="rmark">✨</i>' : '') + '</div>';
    }).join('') + '</div><img class="stallimg" src="img/stall.png" alt="">';
    el.innerHTML = g.orders.map(function (o) {
      var c = custOf(o.cust), ok = ready(o), fr = g.friends[o.cust] || 0, hearts = Math.min(5, Math.floor(fr / 4));
      var face = '';
      return '<div class="order' + (ok ? ' ok' : '') + (o.rare ? ' rare' : '') + '" data-o="' + o.id + '">' + face +
        '<div class="cname">' + esc(c.name) + (hearts ? ' <span class="hearts">' + '♥'.repeat(hearts) + '</span>' : '') + '</div>' +
        '<div class="bubble2"><div class="needs">' + o.need.map(function (r) {
          var have = Math.min(count(needKey(r)), r.n);
          return '<div class="need' + (have >= r.n ? ' got' : '') + '">' + needIcon(r) + '<i>' + have + '/' + r.n + '</i></div>';
        }).join('') + '</div></div>' +
        '<button class="give" data-give="' + o.id + '"' + (ok ? '' : ' disabled') + '>' + (ok ? '주기' : '<span class="mini">' + M.rewardHtml({ coins: o.rw.coins, fp: o.rw.fp }) + '</span>') + '</button></div>';
    }).join('');
    if (M.paintBadges) M.paintBadges();
  }
  function paintExpand() {
    var el = $('gExpand'); if (!el) return; var g = G();
    if (g.rows >= MAX_ROWS) { el.innerHTML = ''; return; }
    if (g.rows >= maxRows()) { el.innerHTML = '<div class="expand off">🔨 가게 레벨 ' + (g.rows - 2) + '부터 밭을 한 줄 더 넓힐 수 있어요</div>'; return; }
    el.innerHTML = '<button class="expand" id="gRow">🔨 밭 한 줄 넓히기 <span class="cost"><img src="img/coin.png" alt="">' + ROW_COST[g.rows] + '</span></button>';
  }
  function paintBook() {
    var el = $('gBook'); if (!el) return; var g = G();
    el.innerHTML = '<small>도감</small>' + Object.keys(CHAINS).filter(chainOn).map(function (k) {
      return '<div class="gline">' + [1, 2, 3, 4, 5].map(function (l) {
        var ok = (g.found[k] || 0) >= l;
        return '<span class="bk' + (ok ? '' : ' unk') + '" title="' + (ok ? CHAINS[k].names[l - 1] : '???') + '">' + iconHtml({ k: k, l: l }, 'bi') + '</span>';
      }).join('<span class="arr">›</span>') + '</div>';
    }).join('');
  }
  function sellValue(it) {
    if (it.k) return it.k === 'f' && it.l === 5 ? { coins: 15, fp: 8 } : SELL[it.l - 1];
    if (it.p) return { coins: 20, fp: 3 };
    if (it.r) return RARES[it.r].sell;
    return null;
  }
  function panel() {
    var el = $('gPanel'); if (!el) return;
    var it = sel >= 0 ? G().cells[sel] : null;
    if (!it) {
      var empty = G().cells.filter(function (x) { return !x; }).length;
      el.innerHTML = '<div class="gp-empty"><b>생산기</b>(씨앗 주머니, 도토리 바구니 등)를 누르면 재료가 나와요. 같은 것끼리 <b>끌어다 겹치면</b> 자라고, 손님 의뢰를 채우면 보상을 받아요. <small>빈 칸 ' + empty + '개</small></div>';
      return;
    }
    var info, sv = sellValue(it);
    if (it.g) { var first = CHAINS[GENS[it.g].chain].names[0]; info = '누르면 ' + M.j(first, '이', '가') + ' 나와요 (물방울 ' + GEN_COST + ') · 꾹 누르면 계속 · 끌어서 옮길 수 있어요'; }
    else if (it.k) info = it.l < 5 ? '2개를 합치면 ' + M.j(CHAINS[it.k].names[it.l], '이', '가') + ' 돼요' : '다 자랐어요! 의뢰에 쓰거나 팔 수 있어요';
    else if (it.p) info = '손님 의뢰에 쓰는 특별한 물건이에요';
    else info = it.r === 'gseed' ? '한 번 더 누르면 싹이 터서 3단계 재료가 돼요' : '귀한 손님이 찾는 귀한 물건이에요';
    el.innerHTML = '<span class="gp-ic">' + iconHtml(it, 'pi') + '</span><div class="gp-info"><b>' + esc(nameOf(it)) + '</b>' + (it.k ? ' <small>' + it.l + '단계</small>' : '') + '<br><small>' + info + '</small></div>' +
      (sv ? '<button class="btn" id="gSell">팔기<br><span class="mini">' + M.rewardHtml(sv) + '</span></button>' : '');
  }
  function afterChange() { paintOrders(); panel(); }

  // ---------- 작업대 ----------
  function fmtLeft(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
    return h ? h + '시간 ' + m + '분' : m ? m + '분 ' + (s % 60) + '초' : (s % 60) + '초';
  }
  function recipeNeed(P) { return P.need.map(function (n) { return RARES[n[0]] ? { r: n[0], n: n[2] } : { k: n[0], l: n[1], n: n[2] }; }); }
  function rushCost(left) { return Math.max(5, Math.ceil(left / 60000) * 3); }
  function paintBench() {
    var el = $('gBench'); if (!el) return; var g = G();
    if (g.lv < 4) { el.innerHTML = '<div class="bench off"><img class="wbimg" src="img/workbench.png" alt=""><b>작업대</b> · 가게 레벨 4에 열려요<br><small>재료를 조합해 꽃다발, 꽃꿀차 같은 특별한 물건을 만들어요</small></div>'; return; }
    var now = Date.now();
    el.innerHTML = '<div class="bench"><div class="bhead"><img src="img/workbench.png" alt=""><b>작업대</b></div>' + g.bench.slots.map(function (s, i) {
      if (!s) return '<button class="bslot empty" data-bnew="' + i + '">+ 무엇을 만들까요?</button>';
      var P = PRODUCTS[s.rid], left = s.until - now;
      var pim = '<img class="bem" src="img/prod-' + s.rid + '.png" alt="">';
      if (left <= 0) return '<div class="bslot done">' + pim + '<b>' + P.name + ' 완성!</b><button class="btn primary" data-bget="' + i + '">받기</button></div>';
      var pct = Math.round((1 - left / Math.max(1, s.until - s.at)) * 100);
      return '<div class="bslot run">' + pim + '<div class="bmid"><b>' + P.name + '</b><div class="mbar"><i style="width:' + pct + '%"></i></div><small data-left="' + i + '">' + fmtLeft(left) + ' 남음</small></div><button class="btn" data-bnow="' + i + '">바로 완성<br><span class="mini">' + M.rewardHtml({ coins: rushCost(left) }) + '</span></button></div>';
    }).join('') + '</div>';
  }
  function recipeSheet(slot) {
    var g = G();
    var list = Object.keys(PRODUCTS).filter(function (id) { return PRODUCTS[id].lv <= g.lv; });
    var lockedNext = Object.keys(PRODUCTS).filter(function (id) { return PRODUCTS[id].lv > g.lv; })[0];
    var d = M.modal('<h3>🛠️ 무엇을 만들까요?</h3><p class="hint">밭에 있는 재료를 써서 만들어요. 다 만들어지면 받으러 와 주세요.</p><div class="list">' + list.map(function (id) {
      var P = PRODUCTS[id], nd = recipeNeed(P), ok = nd.every(function (r) { return count(needKey(r)) >= r.n; });
      return '<div class="recipe' + (ok ? ' ok' : '') + '"><span class="le"><img src="img/prod-' + id + '.png" alt=""></span><div class="ln">' + P.name + ' <small>⏱ ' + (P.min >= 60 ? P.min / 60 + '시간' : P.min + '분') + '</small><div class="needs">' +
        nd.map(function (r) { var have = Math.min(count(needKey(r)), r.n); return '<div class="need' + (have >= r.n ? ' got' : '') + '">' + needIcon(r) + '<i>' + have + '/' + r.n + '</i></div>'; }).join('') +
        '</div></div><button class="btn ' + (ok ? 'primary' : 'ghost') + '" data-make="' + id + '"' + (ok ? '' : ' disabled') + '>만들기</button></div>';
    }).join('') + '</div>' + (lockedNext ? '<p class="hint">' + PRODUCTS[lockedNext].em + ' ' + PRODUCTS[lockedNext].name + ' 제작법은 가게 레벨 ' + PRODUCTS[lockedNext].lv + '에 열려요</p>' : '') + '<button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-make]'); if (b && !b.disabled) { d.close(); M.gardenCraft(slot, b.dataset.make); } });
  }
  function takeItems(need) {
    var g = G();
    need.forEach(function (r) {
      var left = r.n, key = needKey(r);
      for (var i = N() - 1; i >= 0 && left; i--) if (keyOf(g.cells[i]) === key) { g.cells[i] = null; if (sel === i) sel = -1; paintCell(i); left--; }
    });
  }
  M.gardenCraft = function (slot, id) {
    var g = G(), P = PRODUCTS[id], nd = recipeNeed(P);
    if (g.bench.slots[slot] || !nd.every(function (r) { return count(needKey(r)) >= r.n; })) return false;
    takeItems(nd);
    var now = Date.now();
    g.bench.slots[slot] = { rid: id, at: now, until: now + P.min * 60000 * M.craftScale };
    M.quest('craft', 1); M.sfx('pop'); M.save();
    paintBench(); afterChange(); M.toast(P.em + ' ' + P.name + ' 만들기 시작!');
    return true;
  };
  M.gardenCollect = function (slot) {
    var g = G(), s = g.bench.slots[slot]; if (!s || s.until > Date.now()) return false;
    var c = g.cells.indexOf(null);
    if (c < 0) { M.toast('밭에 빈칸이 있어야 받을 수 있어요'); return false; }
    g.cells[c] = { p: s.rid }; g.bench.slots[slot] = null; M.save();
    var el = paintCell(c); burst(el, ['#ffd84a', '#ff9fc0', '#fff'], 14); floatText(el, PRODUCTS[s.rid].name + ' 완성!', 'gold');
    M.sfx('win'); paintBench(); afterChange();
    return true;
  };
  function rush(slot) {
    var s = G().bench.slots[slot]; if (!s) return;
    var cost = rushCost(s.until - Date.now());
    M.confirm('바로 완성', '<img class="inl" src="img/coin.png" alt="">' + cost + '코인으로 바로 완성할까요?', '완성하기', function () {
      if (!M.spend('coins', cost)) { M.toast('코인이 부족해요'); return; }
      s.until = Date.now(); M.save(); paintBench(); M.paintBadges();
    });
  }
  setInterval(function () {
    if (!M.P || !M.P.started) return;
    var el = $('gBench'); if (!el || !el.offsetParent) { if (M.paintBadges) M.paintBadges(); return; }
    var g = G(), now = Date.now(), need = false;
    g.bench.slots.forEach(function (s, i) {
      if (!s) return; var t = el.querySelector('[data-left="' + i + '"]');
      if (s.until <= now) { if (t) need = true; } else if (t) t.textContent = fmtLeft(s.until - now) + ' 남음';
    });
    if (need) { paintBench(); M.paintBadges(); }
  }, 1000);

  // ---------- 효과 ----------
  function center(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }
  function burst(el, colors, n) {
    if (M.fast || !el || !el.animate) return;
    var c = center(el);
    for (var i = 0; i < (n || 10); i++) {
      var p = document.createElement('i'); p.className = 'spark';
      p.style.left = c.x + 'px'; p.style.top = c.y + 'px'; p.style.background = M.pick(colors);
      document.body.appendChild(p);
      var a = Math.random() * Math.PI * 2, d = c.w * (0.5 + Math.random() * 0.6);
      p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + Math.cos(a) * d + 'px), calc(-50% + ' + Math.sin(a) * d + 'px)) scale(.2)', opacity: 0 }], { duration: 520 + Math.random() * 200, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = (function (x) { return function () { x.parentNode && x.parentNode.removeChild(x); }; })(p);
    }
  }
  function floatText(el, text, cls) {
    if (M.fast || !el) return;
    var c = center(el), t = document.createElement('div'); t.className = 'ftext ' + (cls || ''); t.textContent = text;
    t.style.left = c.x + 'px'; t.style.top = c.y + 'px'; document.body.appendChild(t);
    setTimeout(function () { t.parentNode && t.parentNode.removeChild(t); }, 1000);
  }
  function dropIn(c, fromEl) {
    var el = cellEl(c), ic = el && el.firstChild; if (!ic || M.fast || !ic.animate || !fromEl) return;
    var a = center(fromEl), b = center(ic);
    ic.animate([{ transform: 'translate(' + (a.x - b.x) + 'px,' + (a.y - b.y) + 'px) scale(.3)', offset: 0 },
      { transform: 'translate(' + (a.x - b.x) / 2 + 'px,' + ((a.y - b.y) / 2 - 60) + 'px) scale(.8)', offset: 0.5 },
      { transform: 'translate(0,0) scale(1.15)', offset: 0.85 }, { transform: 'none', offset: 1 }], { duration: 400, easing: 'ease-out' });
  }

  // ---------- 동작 ----------
  function found(it) { var g = G(); if (it.k && it.l > (g.found[it.k] || 0)) { g.found[it.k] = it.l; paintBook(); return true; } return false; }
  function nearEmpty(c) {   // 생산기와 가까운 빈칸
    var g = G(), best = -1, bd = 1e9, r0 = Math.floor(c / COLS), c0 = c % COLS;
    for (var i = 0; i < N(); i++) if (!g.cells[i]) { var d = Math.abs(Math.floor(i / COLS) - r0) + Math.abs(i % COLS - c0); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  M.gardenTapGen = function (c) {
    var g = G(), gen = g.cells[c]; lastAct = Date.now();
    if (!gen || !gen.g) return false;
    var to = nearEmpty(c);
    if (to < 0) { M.toast('빈 칸이 없어요. 합치거나 팔아서 자리를 만들어요'); M.buzz(40); return false; }
    if (!M.spend('water', GEN_COST)) { M.toast('물방울이 부족해요. 레슨을 하면 물방울을 받아요 💧'); M.buzz(40); return false; }
    var lucky = Math.random() < 0.08, it = { k: GENS[gen.g].chain, l: lucky ? 2 : 1 };
    g.cells[to] = it; found(it);
    var genEl = cellEl(c);
    paintCell(to); dropIn(to, genEl); M.sfx('pop');
    if (genEl && genEl.firstChild && !M.fast) { genEl.firstChild.classList.remove('squish'); void genEl.offsetWidth; genEl.firstChild.classList.add('squish'); }
    if (lucky) setTimeout(function () { floatText(cellEl(to), '🍀 행운!', 'gold'); }, 350);
    if (Math.random() < 0.03) {   // 가끔 귀한 물건이 같이 나온다
      var to2 = nearEmpty(c);
      if (to2 >= 0) { var rr = Math.random(), rid = rr < 0.6 ? 'clover' : rr < 0.85 ? 'gseed' : 'rainbow'; g.cells[to2] = { r: rid }; paintCell(to2); dropIn(to2, genEl); setTimeout(function () { floatText(cellEl(to2), RARES[rid].em + ' 귀한 물건!', 'gold'); M.sfx('win'); }, 350); }
    }
    M.save(); afterChange();
    return true;
  };
  function openGoldenSeed(c) {
    var g = G(), chains = Object.keys(CHAINS).filter(chainOn), it = { k: M.pick(chains), l: 3 };
    g.cells[c] = it; found(it); M.save();
    var el = paintCell(c); burst(el, ['#ffd84a', '#9be36b', '#fff'], 14); floatText(el, nameOf(it) + '!', 'gold'); M.sfx('merge'); afterChange();
  }
  // a 칸을 b 칸으로: 같은 재료면 합치고, 비었으면 옮기고, 다르면 서로 바꾼다
  M.gardenMove = function (a, b) {
    var g = G(); lastAct = Date.now();
    if (a === b || b >= N()) return false;
    var A = g.cells[a], B = g.cells[b]; if (!A) return false;
    if (A.k && B && B.k === A.k && B.l === A.l && A.l < 5) {
      var nl = A.l + 1;
      g.cells[b] = { k: A.k, l: nl }; g.cells[a] = null;
      var first = found(g.cells[b]);
      M.P.stats.merges++; M.quest('merge', 1);
      sel = b; M.save();
      paintCell(a); var el = paintCell(b);
      if (el.firstChild) el.firstChild.classList.add('merged');
      var now = Date.now(); combo = now - comboAt < 2200 ? combo + 1 : 1; comboAt = now;
      burst(el, nl === 5 ? ['#ffd84a', '#fff3a6', '#ffb02e'] : ['#ff9fc0', '#ffd1e0', '#9be36b'], nl === 5 ? 18 : 10);
      M.sfx(nl === 5 ? 'win' : 'merge'); M.buzz(nl === 5 ? [30, 40, 60] : 20);
      if (combo >= 3) { var bonus = Math.min(10, combo - 1); M.give({ coins: bonus }); floatText(el, '콤보 ' + combo + '! +' + bonus, 'gold'); }
      else if (first) floatText(el, '도감 등록!', 'pink');
      else floatText(el, CHAINS[A.k].names[nl - 1]);
      if (nl === 5) { M.P.stats.golden++; var bd = $('board'); bd.classList.remove('quake'); void bd.offsetWidth; bd.classList.add('quake'); }
      afterChange();
      return true;
    }
    g.cells[b] = A; g.cells[a] = B || null; sel = b; M.save(); M.sfx('tap');
    paintCell(a); paintCell(b); afterChange();
    return true;
  };
  M.gardenSell = function (c) {
    var g = G(), it = g.cells[c]; if (!it || it.g) return;
    var sv = sellValue(it); if (!sv) return;
    var el = cellEl(c);
    g.cells[c] = null; sel = -1;
    M.P.stats.harvest++; M.quest('harvest', 1);
    if (M.fly) { M.fly(el, 'img/coin.png', 'tCoin', Math.min(6, sv.coins)); if (sv.fp) M.fly(el, 'img/flower-point.png', 'tFp', 4); }
    M.give(sv); M.sfx(sv.fp ? 'win' : 'coin'); burst(el, ['#ffd84a', '#fff'], 8);
    M.save(); paintCell(c); afterChange();
  };
  M.gardenDeliver = function (id) {
    var g = G(), o = g.orders.filter(function (x) { return x.id === id; })[0];
    if (!o || !ready(o)) return false;
    lastAct = Date.now();
    var card = document.querySelector('.order[data-o="' + id + '"]');
    if (card && !M.fast) o.need.forEach(function (r) {   // 물건이 손님에게 날아간다
      var key = needKey(r), left = r.n;
      for (var i = N() - 1; i >= 0 && left; i--) if (keyOf(g.cells[i]) === key) {
        var ic = cellEl(i) && cellEl(i).firstChild; left--;
        if (!ic || !ic.animate) continue;
        var a = center(ic), b2 = center(card), gh = ic.cloneNode(true); gh.classList.add('flyimg');
        gh.style.left = a.x + 'px'; gh.style.top = a.y + 'px'; gh.style.width = a.w + 'px'; document.body.appendChild(gh);
        gh.animate([{ transform: 'translate(-50%,-50%)' }, { transform: 'translate(calc(-50% + ' + (b2.x - a.x) + 'px), calc(-50% + ' + (b2.y - a.y) + 'px)) scale(.3)', opacity: 0.4 }], { duration: 450, easing: 'ease-in' }).onfinish = (function (z) { return function () { z.parentNode && z.parentNode.removeChild(z); }; })(gh);
      }
    });
    takeItems(o.need);
    g.orders = g.orders.filter(function (x) { return x !== o; });
    g.done++;
    var fr = (g.friends[o.cust] || 0) + 1; g.friends[o.cust] = fr;
    M.give({ coins: o.rw.coins, fp: o.rw.fp });
    if (card && M.fly) { M.fly(card, 'img/coin.png', 'tCoin', 5); if (o.rw.fp) M.fly(card, 'img/flower-point.png', 'tFp', 4); }
    if (M.petExp) M.petExp(Math.ceil(o.rw.xp / 2));
    M.quest('order', 1);
    M.sfx('win'); M.buzz([20, 30, 20]);
    var c = custOf(o.cust);
    if (card) { burst(card, ['#ffd84a', '#ff9fc0', '#9be36b'], 14); floatText(card, c.em + ' 고마워요!', 'pink'); }
    M.save();
    addXp(o.rw.xp);
    if (fr % 4 === 0) {   // 친밀도가 오르면 선물
      var lvl = fr / 4;
      setTimeout(function () { M.openChest({ coins: 20 * lvl, fp: 3 * lvl }, c.em + ' ' + M.j(c.name, '과', '와') + ' 더 친해졌어요! ' + '♥'.repeat(Math.min(5, lvl))); }, M.fast ? 0 : 900);
    }
    setTimeout(function () { ensureOrders(); M.save(); paintOrders(); var n = document.querySelector('#gOrders .order:last-child'); if (n) n.classList.add('slidein'); panel(); }, M.fast ? 0 : 450);
    paintOrders(); panel();
    return true;
  };
  M.gardenExpand = function () {
    var g = G(); if (g.rows >= maxRows()) return false;
    var cost = ROW_COST[g.rows];
    if (!M.spend('coins', cost)) { M.toast('코인이 ' + (cost - M.P.coins) + '개 더 필요해요. 의뢰를 채우면 코인을 받아요'); return false; }
    g.rows++; G(); M.save(); M.sfx('win');
    M.renderGarden($('gardenView'));
    var row = g.rows - 1;
    for (var i = 0; i < COLS; i++) { var el = cellEl(row * COLS + i); if (el) el.classList.add('newrow'); }
    M.toast('🔨 밭이 한 줄 넓어졌어요!');
    return true;
  };

  // ---------- 끌어서 놓기·누르기 ----------
  var drag = null, holdT = null;
  function cellAt(x, y) { var el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('#grid .cell') : null; }
  function clearMarks() { Array.prototype.forEach.call(document.querySelectorAll('#grid .over, #grid .lift, #grid .can'), function (x) { x.classList.remove('over', 'lift', 'can'); }); }
  function stopHold() { if (holdT) { clearTimeout(holdT); holdT = null; } }
  document.addEventListener('pointerdown', function (e) {
    var cell = e.target.closest && e.target.closest('#grid .cell');
    if (!cell) return;
    lastAct = Date.now();
    var c = +cell.dataset.c, it = G().cells[c];
    drag = { c: c, x: e.clientX, y: e.clientY, on: false, id: e.pointerId, has: !!it, gen: !!(it && it.g), held: false };
    if (drag.gen) {   // 생산기를 꾹 누르면 계속 뽑는다
      holdT = setTimeout(function rep() { if (!drag || drag.on) return; drag.held = true; if (!M.gardenTapGen(c)) { stopHold(); return; } holdT = setTimeout(rep, 190); }, 450);
    }
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id || !drag.has) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on && !drag.held && dx * dx + dy * dy > 64) {
      drag.on = true; stopHold();
      var cell = cellEl(drag.c), A = G().cells[drag.c];
      var gh = document.createElement('div'); gh.className = 'dragghost'; gh.innerHTML = iconHtml(A);
      var w = cell.getBoundingClientRect().width * 1.15; gh.style.width = gh.style.height = w + 'px'; drag.w = w;
      document.body.appendChild(gh); drag.gh = gh;
      cell.classList.add('lift');
      var g = G();
      if (A.k && A.l < 5) for (var i = 0; i < N(); i++) { var x = g.cells[i]; if (i !== drag.c && x && x.k === A.k && x.l === A.l) cellEl(i).classList.add('can'); }
    }
    if (drag.on) {
      drag.gh.style.transform = 'translate(' + (e.clientX - drag.w / 2) + 'px,' + (e.clientY - drag.w * 0.7) + 'px)';
      var over = cellAt(e.clientX, e.clientY);
      Array.prototype.forEach.call(document.querySelectorAll('#grid .cell.over'), function (x) { if (x !== over) x.classList.remove('over'); });
      if (over) over.classList.add('over');
      e.preventDefault();
    }
  }, { passive: false });
  function end(e) {
    stopHold();
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    if (d.gh) d.gh.parentNode.removeChild(d.gh);
    clearMarks();
    if (d.on) { var over = cellAt(e.clientX, e.clientY); if (over && e.type === 'pointerup') M.gardenMove(d.c, +over.dataset.c); return; }
    if (e.type !== 'pointerup' || d.held) return;
    var g = G(), it = g.cells[d.c];
    // 고른 재료와 같은 것을 누르면 합치고, 빈 칸을 누르면 옮긴다
    if (sel >= 0 && sel !== d.c && g.cells[sel]) {
      var A = g.cells[sel];
      if (!it || (A.k && it.k === A.k && it.l === A.l && A.l < 5)) { M.gardenMove(sel, d.c); return; }
    }
    if (it && it.g) { var o0 = sel; sel = d.c; if (o0 >= 0 && o0 !== sel) paintCell(o0); paintCell(sel); M.gardenTapGen(d.c); panel(); return; }
    if (it && it.r === 'gseed' && sel === d.c) { openGoldenSeed(d.c); return; }
    var old = sel;
    sel = it ? (sel === d.c ? -1 : d.c) : -1;
    if (old >= 0) paintCell(old);
    if (sel >= 0) { var el = paintCell(sel); if (el.firstChild) el.firstChild.classList.add('bounce'); }
    M.sfx('tap'); panel();
  }
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('#gSell') && sel >= 0) { M.gardenSell(sel); return; }
    var gb = t.closest('[data-give]'); if (gb && !gb.disabled) { M.gardenDeliver(gb.dataset.give); return; }
    if (t.closest('#gRow')) { var g = G(); M.confirm('밭 넓히기', '<img class="inl" src="img/coin.png" alt="">' + ROW_COST[g.rows] + '코인으로 밭을 한 줄(' + COLS + '칸) 넓힐까요?', '넓히기', M.gardenExpand); return; }
    var bn = t.closest('[data-bnew]'); if (bn) { recipeSheet(+bn.dataset.bnew); return; }
    var bg = t.closest('[data-bget]'); if (bg) { M.gardenCollect(+bg.dataset.bget); return; }
    var bw = t.closest('[data-bnow]'); if (bw) { rush(+bw.dataset.bnow); return; }
  });
  // 잠시 손을 놓고 있으면 합칠 수 있는 짝을 흔들어 알려 준다
  setInterval(function () {
    var grid = $('grid'); if (!grid || drag || !grid.offsetParent || document.querySelector('.dim')) return;
    if (Date.now() - lastAct < 6000) return;
    lastAct = Date.now();
    var g = G(), c = g.cells;
    for (var i = 0; i < N(); i++) for (var j = i + 1; j < N(); j++) if (c[i] && c[j] && c[i].k && c[i].k === c[j].k && c[i].l === c[j].l && c[i].l < 5) {
      [i, j].forEach(function (k) { var ic = cellEl(k).firstChild; if (ic) { ic.classList.remove('hint'); void ic.offsetWidth; ic.classList.add('hint'); } });
      return;
    }
  }, 1000);
  M.gardenSel = function () { return sel; };
  M.gardenState = G;
})();
