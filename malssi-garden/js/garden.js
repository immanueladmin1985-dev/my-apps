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
    c: { name: '차', names: ['찻잎', '찻잎 묶음', '찻잔', '찻주전자', '황금 티세트'], img: 'tea', gen: 'tea' },
        m: { name: '우유', names: ['우유 방울', '우유병', '우유 한 잔', '치즈', '황금 치즈'], img: 'milk', gen: 'cow' },
    w: { name: '밀', names: ['밀 싹', '밀 이삭', '크루아상', '식빵', '생일 케이크'], img: 'wheat', gen: 'wheat' }
  };
  var GENS = {
    seed: { name: '씨앗 주머니', em: '👝', chain: 'f', lv: 1 },
    acorn: { name: '도토리 바구니', em: '🪵', chain: 't', lv: 1 },
    hive: { name: '벌통', em: '🐝', chain: 'h', lv: 3 },
    bush: { name: '베리 덤불', em: '🌳', chain: 'b', lv: 5 },
    tea: { name: '찻잎 화분', em: '🪴', chain: 'c', lv: 7 },
    cow: { name: '젖소', em: '🐄', chain: 'm', lv: 11 },
    wheat: { name: '밀밭 트랙터', em: '🚜', chain: 'w', lv: 12 }
  };
  var PRODUCTS = {
    bouquet: { name: '꽃다발', em: '💐', need: [['f', 4, 2]], min: 3, lv: 4 },
    flowertea: { name: '꽃꿀', em: '🧋', need: [['f', 4, 1], ['h', 3, 1]], min: 10, lv: 4 },
    jam: { name: '사과잼', em: '🍎', need: [['t', 4, 1], ['h', 2, 1]], min: 10, lv: 5 },
    basket: { name: '과일 바구니', em: '🧺', need: [['t', 4, 1], ['b', 3, 1]], min: 15, lv: 6 },
    honeycake: { name: '허니 케이크', em: '🍰', need: [['h', 4, 1], ['b', 2, 2]], min: 30, lv: 6 },
    wreath: { name: '화관', em: '🌼', need: [['f', 3, 2], ['clover', 0, 1]], min: 20, lv: 7 },
    tart: { name: '베리 타르트', em: '🍮', need: [['b', 4, 1], ['c', 3, 1]], min: 30, lv: 8 },
    giftbox: { name: '선물 상자', em: '🎁', need: [['f', 5, 1], ['h', 5, 1]], min: 60, lv: 10 },
    sandwich: { name: '샌드위치', em: '🥪', need: [['w', 4, 1], ['m', 3, 1]], min: 20, lv: 12 },
    cheesecake: { name: '치즈케이크', em: '🍰', need: [['m', 4, 1], ['b', 3, 1]], min: 40, lv: 13 },
    picnic: { name: '소풍 바구니', em: '🧺', need: [['w', 4, 1], ['c', 4, 1], ['t', 4, 1]], min: 90, lv: 14 }
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
    { id: 'hamster', em: '🐹', name: '햄찌', lv: 10, likes: ['p', 'b'] },
    { id: 'penguin', em: '🐧', name: '펭펭', lv: 11, likes: ['m', 'c'] },
    { id: 'cat', em: '🐱', name: '나비', lv: 12, likes: ['m', 'w', 'p'] },
    { id: 'sheep', em: '🐑', name: '몽실이', lv: 13, likes: ['w', 'f', 'p'] },
    { id: 'owl', em: '🦉', name: '부엉 박사', lv: 14, likes: ['c', 'p', 'h'] },
    { id: 'dog', em: '🐶', name: '바둑이', lv: 15, likes: ['m', 'w', 'p'] },
    { id: 'otter', em: '🦦', name: '수달이', lv: 16, likes: ['b', 'h', 'p'] },
    { id: 'deer', em: '🦌', name: '꽃사슴', lv: 17, likes: ['f', 'c'] },
    { id: 'duck', em: '🦆', name: '꽥꽥이', lv: 18, likes: ['w', 'f'] },
    { id: 'lion', em: '🦁', name: '레오', lv: 19, likes: ['m', 'p'] },
    { id: 'camel', em: '🐫', name: '사막이', lv: 20, likes: ['c', 'w', 'p'] },
    { id: 'elephant', em: '🐘', name: '코코', lv: 21, likes: ['t', 'h'] },
    { id: 'monkey', em: '🐒', name: '끼끼', lv: 22, likes: ['t', 'b', 'p'] }
  ];
  var CUST_IMG = { bear: 1, squirrel: 1, hedgehog: 1, chick: 1, panda: 1, fox: 1, koala: 1, hamster: 1, penguin: 1, cat: 1, sheep: 1, owl: 1, dog: 1, otter: 1, deer: 1, duck: 1, lion: 1, camel: 1, elephant: 1, monkey: 1 };   // 손님 그림이 생기면 { bear: 1, ... } 로 켠다 (img/cust-bear.png, img/cust-bear-happy.png)
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
    g.friends = g.friends || {}; g.inbox = g.inbox || []; g.bench = g.bench || { slots: [null] }; g.store = g.store || {}; g.bag = g.bag || [];
    g.cells.forEach(function (x, i) { if (x && x.p) { g.store[x.p] = (g.store[x.p] || 0) + 1; g.cells[i] = null; } });   // 예전에 밭에 있던 완성품은 보관함으로
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
    if (!g.gotGens) { g.gotGens = {}; Object.keys(GENS).forEach(function (id) { if (GENS[id].lv <= g.lv && GENS[id].lv <= 10) g.gotGens[id] = 1; }); }   // 예전 생산기는 이미 받았다고 본다
    Object.keys(GENS).forEach(function (id) { if (GENS[id].lv <= g.lv && !g.gotGens[id]) { g.gotGens[id] = 1; giveGen(g, id); } });
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
  function count(key) {
    var g = G(), n = 0; for (var i = 0; i < N(); i++) if (keyOf(g.cells[i]) === key) n++;
    if (key.indexOf('p:') === 0) n += g.store[key.slice(2)] || 0;   // 완성품은 보관함에도 있다
    return n;
  }
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
  function isFound(r) {
    var g = G();
    if (r.p) return !!((g.pfound || {})[r.p] || g.store[r.p]);
    if (r.r) return !!((g.rfound || {})[r.r] || count('r:' + r.r) || g.bag.some(function (x) { return x && x.r === r.r; }));
    return r.l <= 1 || (g.found[r.k] || 0) >= r.l;   // 1단계는 생산기에서 바로 나오므로 처음부터 보여 준다
  }
  function nkey(r) { return r.p ? 'p:' + r.p : r.r ? 'r:' + r.r : 'k:' + r.k + ':' + r.l; }
  function needHtml(r, showCount) {
    var have = Math.min(count(needKey(r)), r.n || 1);
    return '<button class="need' + (showCount && have >= r.n ? ' got' : '') + (isFound(r) ? '' : ' unk') + '" data-nk="' + nkey(r) + '"><span class="nimg">' + (r.p ? '<img src="img/prod-' + r.p + '.png" alt="" draggable="false">' : needIcon(r)) + '</span>' + (showCount ? '<i>' + have + '/' + r.n + '</i>' : '') + '</button>';
  }
  function howSheet(key) {
    var f = key.split(':'), g = G(), h = '', title = '';
    if (f[0] === 'k') {
      var k = f[1], l = +f[2], C = CHAINS[k], gen = GENS[C.gen];
      title = isFound({ k: k, l: l }) ? C.names[l - 1] : '아직 못 만든 물건';
      h = '<div class="howpath">' + [1, 2, 3, 4, 5].slice(0, l).map(function (i) { return needHtml({ k: k, l: i }, false) + '<small>' + (isFound({ k: k, l: i }) ? C.names[i - 1] : '???') + '</small>'; }).map(function (x) { return '<span>' + x + '</span>'; }).join('<b class="arr">›</b>') + '</div>' +
        '<p>' + (chainOn(k) ? '밭의 <b>' + gen.name + '</b>을(를) 누르면 ' + C.names[0] + '이(가) 나와요.' : '<b>' + gen.name + '</b>은(는) 가게 레벨 ' + gen.lv + '에 생겨요.') + ' 같은 물건 두 개를 겹치면 다음 단계가 돼요' + (l > 1 ? '. ' + C.names[0] + ' 기준으로 ' + Math.pow(2, l - 1) + '개가 필요해요' : '') + '.</p>';
    } else if (f[0] === 'p') {
      var P = PRODUCTS[f[1]], nd = recipeNeed(P);
      title = P.name;
      h = '<div class="howprod"><img src="img/prod-' + f[1] + '.png" alt="" class="' + (isFound({ p: f[1] }) ? '' : 'unkimg') + '"></div><p><b>작업대</b>에서 아래 재료로 만들어요 (⏱ ' + (P.min >= 60 ? P.min / 60 + '시간' : P.min + '분') + ')' + (P.lv > g.lv ? ' · 가게 레벨 ' + P.lv + '에 열려요' : '') + '</p>' +
        '<div class="needs howneeds">' + nd.map(function (r) { return '<span>' + needHtml(r, true) + '<small>' + (isFound(r) ? nameOf(r) : '???') + '</small></span>'; }).join('') + '</div><p class="hint">재료를 누르면 만드는 법이 나와요</p>';
    } else {
      var R = RARES[f[1]]; title = isFound({ r: f[1] }) ? R.name : '귀한 물건';
      h = '<div class="howprod">' + needHtml({ r: f[1] }, false) + '</div><p>생산기를 누르다 보면 가끔 나오는 귀한 물건이에요.</p>';
    }
    M.modal('<h3>' + esc(title) + '</h3>' + h + '<button class="btn primary wide" data-close>알겠어요</button>');
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
    var h = '<div class="garden">' + (M.inVillage ? '<button class="vback" id="vBack">← 마을로 나가기</button>' : '') + '<div class="stallwrap"><div class="shophead"><b>' + esc(M.P.petName) + '네 가게</b><span class="slv">Lv.' + g.lv + '</span><div class="mbar"><i style="width:' + Math.round(g.xp / xpNeed(g.lv) * 100) + '%"></i></div><small>' + g.xp + '/' + xpNeed(g.lv) + '</small><button class="helpbtn" id="gDeco" aria-label="가게 꾸미기">🎨</button><button class="helpbtn" id="gHelp" aria-label="도움말">?</button></div>' +
      '<div class="counter" id="gCounter"></div></div><div class="orders" id="gOrders"></div>' +
      '<div class="board" id="board" style="--bh:' + (H / 1496).toFixed(4) + ';aspect-ratio:1496/' + H + '"><img class="btop" src="img/garden-top.png" alt=""><img class="bbot" src="img/garden-bot.png" alt="">';
    h += '<div class="bcells" id="grid" style="top:' + (180 / H * 100) + '%;bottom:' + (116 / H * 100) + '%;grid-template-rows:repeat(' + R + ',minmax(0,1fr))">';
    for (var i = 0; i < R * COLS; i++) h += '<div class="cell" data-c="' + i + '"></div>';
    h += '</div></div><div class="gpanel" id="gPanel"></div><div class="gbar" id="gBar"></div></div>';
    root.innerHTML = h;
    for (i = 0; i < R * COLS; i++) paintCell(i);
    placeInbox(); paintOrders(); panel(); paintBar();
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
      var mq = M.miniAvail ? M.miniAvail(c.id) : null;
      return '<div class="cust full' + (ok ? ' happy' : '') + (mq ? ' hasq' : '') + '"' + (mq ? ' data-mq="' + mq + '"' : '') + ' style="left:' + (g.orders.length === 1 ? 50 : g.orders.length === 2 ? 41 + i * 18 : 34 + i * 16) + '%">' + '<img src="img/w/ch-' + c.id + (ok ? '-happy' : '-front') + '.png" alt="' + esc(c.name) + '">' + (o.rare ? '<i class="rmark">✨</i>' : '') + (mq ? '<i class="qmark">❗</i>' : '') + '</div>';
    }).join('') + '</div><img class="stallimg" src="img/stall' + (g.awn ? '-' + g.awn : '') + '.png" alt="">';
    el.innerHTML = g.orders.map(function (o) {
      var c = custOf(o.cust), ok = ready(o), fr = g.friends[o.cust] || 0, hearts = Math.min(5, Math.floor(fr / 4));
      return '<div class="order' + (ok ? ' ok' : '') + (o.rare ? ' rare' : '') + '" data-o="' + o.id + '">' +
        '<div class="cname">' + esc(c.name) + (hearts ? ' <span class="hearts">' + '♥'.repeat(hearts) + '</span>' : '') + (M.miniAvail && M.miniAvail(c.id) ? '<span class="mqchip" data-mq="' + M.miniAvail(c.id) + '">❗부탁</span>' : '') + '</div>' +
        '<div class="bubble2"><div class="needs">' + o.need.map(function (r) { return needHtml(r, true); }).join('') + '</div></div>' +
        '<button class="give" data-give="' + o.id + '"' + (ok ? '' : ' disabled') + '>' + (ok ? '주기' : '<span class="mini">' + M.rewardHtml({ coins: o.rw.coins, fp: o.rw.fp }) + '</span>') + '</button></div>';
    }).join('');
    if (M.paintBadges) M.paintBadges();
  }
  function paintExpand() {
    var el = $('gExpand'); if (!el) return; var g = G();
    if (g.rows >= MAX_ROWS) { el.innerHTML = ''; return; }
    if (g.rows >= maxRows()) { el.innerHTML = '<div class="expand off">🔨 Lv.' + (g.rows - 2) + '에 넓히기</div>'; return; }
    el.innerHTML = '<button class="expand" id="gRow">🔨 넓히기 <span class="cost"><img src="img/coin.png" alt="">' + ROW_COST[g.rows] + '</span></button>';
  }
  var AWNS = [['', '딸기 분홍', 0], ['mint', '민트', 150], ['sky', '하늘', 150], ['lemon', '레몬', 200], ['lilac', '라일락', 250], ['coral', '산호', 300]];
  function decoSheet() {
    var g = G(); g.awns = g.awns || {};
    var d = M.modal('<h3>🎨 가게 꾸미기</h3><p class="hint">차양 색을 골라요. 한 번 산 색은 언제든 바꿀 수 있어요.</p><div class="fgrid" id="awList"></div><button class="btn ghost wide" data-close>닫기</button>');
    function paint() {
      d.querySelector('#awList').innerHTML = AWNS.map(function (a) {
        var own = !a[2] || g.awns[a[0]], on = (g.awn || '') === a[0];
        return '<button class="fcard' + (on ? ' on' : '') + '" data-aw="' + a[0] + '"><img src="img/stall' + (a[0] ? '-' + a[0] : '') + '.png" alt="" style="aspect-ratio:900/369"><b>' + a[1] + '</b>' +
          (on ? '<small class="own">사용 중</small>' : own ? '<small class="own">바꾸기</small>' : '<small class="price"><img src="img/coin.png" alt="">' + a[2] + '</small>') + '</button>';
      }).join('');
    }
    paint();
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-aw]'); if (!b) return;
      var a = AWNS.filter(function (x) { return x[0] === b.dataset.aw; })[0];
      if (a[2] && !g.awns[a[0]]) { if (!M.spend('coins', a[2])) { M.toast('코인이 모자라요'); return; } g.awns[a[0]] = true; M.sfx('coin'); }
      g.awn = a[0]; M.save(); paint(); paintOrders(); M.paintTop && M.paintTop();
    });
  }
  M.gardenBook = function () { bookSheet(); };
  function bookSheet() {
    var g = G();
    M.modal('<h3>📖 도감</h3><p class="hint">합쳐서 처음 만든 것은 도감에 그림이 채워져요</p><div class="gbook">' + bookHtml() + '</div><button class="btn primary wide" data-close>닫기</button>');
  }
  function paintBook() {}
  function bookHtml() {
    var g = G();
    return Object.keys(CHAINS).filter(chainOn).map(function (k) {
      return '<div class="gline">' + [1, 2, 3, 4, 5].map(function (l) {
        var ok = isFound({ k: k, l: l });
        return '<span class="bk' + (ok ? '' : ' unk') + '" title="' + (ok ? CHAINS[k].names[l - 1] : '???') + '">' + iconHtml({ k: k, l: l }, 'bi') + '</span>';
      }).join('<span class="arr">›</span>') + '</div>';
    }).join('') + '<div class="gline prods"><small>작업대 완성품 · 누르면 만드는 법</small>' + Object.keys(PRODUCTS).map(function (id) { return needHtml({ p: id }, false); }).join('') + '</div>';
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
      el.innerHTML = '<div class="gp-empty">물건을 누르면 여기에 정보가 나와요</div>'; return;
      el.innerHTML = '<div class="gp-empty"><b>생산기</b>(씨앗 주머니, 도토리 바구니 등)를 누르면 재료가 나와요. 같은 것끼리 <b>끌어다 겹치면</b> 자라고, 손님 의뢰를 채우면 보상을 받아요. <small>빈 칸 ' + empty + '개</small></div>';
      return;
    }
    var info, sv = sellValue(it);
    if (it.g) { var first = CHAINS[GENS[it.g].chain].names[0]; info = '누르면 ' + M.j(first, '이', '가') + ' 나와요 (물방울 ' + GEN_COST + ') · 꾹 누르면 계속 · 끌어서 옮길 수 있어요'; }
    else if (it.k) info = it.l < 5 ? '2개를 합치면 ' + M.j(CHAINS[it.k].names[it.l], '이', '가') + ' 돼요' : '다 자랐어요! 의뢰에 쓰거나 팔 수 있어요';
    else if (it.p) info = '손님 의뢰에 쓰는 특별한 물건이에요';
    else info = it.r === 'gseed' ? '한 번 더 누르면 싹이 터서 3단계 재료가 돼요' : '귀한 손님이 찾는 귀한 물건이에요';
    el.innerHTML = '<span class="gp-ic">' + iconHtml(it, 'pi') + '</span><div class="gp-info"><b>' + esc(nameOf(it)) + '</b>' + (it.k ? ' <small>' + it.l + '단계</small>' : '') + '<br><small>' + info + '</small></div>' +
      '<button class="btn" id="gStash">🎒<br><span class="mini">가방에</span></button>' +
      (sv ? '<button class="btn" id="gSell">팔기<br><span class="mini">' + M.rewardHtml(sv) + '</span></button>' : '');
  }
  // ---------- 아래 버튼 줄 ----------
  var BAG = 10;
  function paintBar() {
    var el = $('gBar'); if (!el) return; var g = G(), now = Date.now();
    var done = g.bench.slots.some(function (x) { return x && x.until <= now; }), run = g.bench.slots.some(function (x) { return x && x.until > now; });
    var canRow = g.rows < MAX_ROWS && g.rows < maxRows();
    var bt = function (id, ic, label, badge, lock) { return '<button class="gb' + (lock ? ' lock' : '') + '" id="' + id + '"><span class="gbi">' + ic + '</span><small>' + label + '</small>' + (badge ? '<i class="gbb">' + badge + '</i>' : '') + '</button>'; };
    el.innerHTML = bt('gBagBtn', '🎒', '가방', g.bag.length ? g.bag.length + '/' + BAG : '') +
      bt('gBenchBtn', '<img src="img/workbench.png" alt="">', '작업대', g.lv < 4 ? '' : done ? '완성' : run ? '⏳' : '', g.lv < 4) +
      bt('gWater', '<img src="img/waterbag.png" alt="">', '물방울') +
      bt('gBookBtn', '📖', '도감') +
      bt('gRow', '🔨', '넓히기', canRow ? '' : '', !canRow) +
      bt('gAlbum', '📒', '손님');
  }
  M.gardenBar = paintBar;
  function bagSheet() {
    var d = M.modal('<h3>🎒 가방</h3><p class="hint">밭이 꽉 차면 물건을 잠시 넣어 둬요. 누르면 밭으로 꺼내요.</p><div id="bagBody"></div><button class="btn ghost wide" data-close>닫기</button>', { onClose: function () { paintBar(); } });
    var paint = function () {
      var g = G(), h = '<div class="bag">';
      for (var i = 0; i < BAG; i++) { var it = g.bag[i]; h += '<button class="bslot2' + (it ? '' : ' empty') + '"' + (it ? ' data-take="' + i + '"' : '') + '>' + (it ? iconHtml(it, 'bi') : '') + '</button>'; }
      h += '</div>' + storeHtml();
      d.querySelector('#bagBody').innerHTML = h;
    };
    paint();
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-take]'); if (!b) return;
      var g = G(), c = g.cells.indexOf(null);
      if (c < 0) { M.toast('밭에 빈칸이 없어요'); return; }
      g.cells[c] = g.bag.splice(+b.dataset.take, 1)[0]; M.save(); paintCell(c); M.sfx('pop'); paint(); afterChange();
    });
  }
  function stash(c) {
    var g = G(), it = g.cells[c]; if (!it) return;
    if (g.bag.length >= BAG) { M.toast('가방이 꽉 찼어요 (' + BAG + '칸)'); return; }
    g.bag.push(it); g.cells[c] = null; sel = -1; M.save(); M.sfx('pop'); paintCell(c); afterChange(); paintBar();
    M.toast('🎒 ' + M.j(nameOf(it), '을', '를') + ' 가방에 넣었어요');
  }
  function benchSheet() {
    var g = G();
    if (g.lv < 4) { lockedInfo('작업대', '가게 레벨 4가 되면 열려요. 재료를 조합해 꽃다발, 꽃꿀 같은 특별한 물건을 만들고, 손님 의뢰에 쓰면 보상이 커요.'); return; }
    M.modal('<div id="gBench"></div><button class="btn ghost wide" data-close>닫기</button>', { onClose: function () { paintBar(); } });
    paintBench();
  }
  function lockedInfo(title, text) { M.modal('<h3>🔒 ' + title + '</h3><p>' + text + '</p><button class="btn primary wide" data-close>알겠어요</button>'); }
  // ---------- 손님 이야기·앨범 ----------
  function storyHtml(c, n) {
    var lang = M.P.lang, ln = ((window.STORY_LINES || {})[lang] || [])[n - 1], txt = ((window.STORIES || {})[c.id] || [])[n - 1];
    return '<div class="story">' + (CUST_IMG[c.id] ? '<img src="img/cust-' + c.id + '-happy.png" alt="">' : '') + '<p>' + esc(txt || '') + '</p>' +
      (ln ? '<button class="sline lang-' + lang + '" data-say="' + esc(ln[0]) + '" data-lang="' + lang + '"><b>💬 ' + esc(ln[0]) + '</b>' + (ln[2] ? '<span>' + esc(ln[2]) + '</span>' : '') + '<small>' + esc(ln[1]) + '</small></button>' : '') + '</div>';
  }
  function albumSheet() {
    var g = G();
    var d = M.modal('<h3>📒 손님 앨범</h3><p class="hint">의뢰를 4번 채울 때마다 ♥가 오르고 이야기가 열려요</p><div class="album">' + CUSTOMERS.map(function (c) {
      var fr = g.friends[c.id] || 0, lv = Math.min(5, Math.floor(fr / 4)), open = g.lv >= c.lv;
      return '<button class="acard' + (open ? '' : ' lock') + '" data-cust="' + c.id + '">' + (open && CUST_IMG[c.id] ? '<img src="img/cust-' + c.id + '.png" alt="">' : '<span class="cem">' + (open ? c.em : '❔') + '</span>') +
        '<b>' + (open ? esc(c.name) : '???') + '</b><small>' + (open ? '♥'.repeat(lv) + '♡'.repeat(5 - lv) : 'Lv.' + c.lv + '에 와요') + '</small></button>';
    }).join('') + '</div><div id="albumStory"></div><button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cust]'); if (!b) return;
      var c = custOf(b.dataset.cust); if (g.lv < c.lv) { M.toast('가게 레벨 ' + c.lv + '이 되면 와요'); return; }
      var lv = Math.min(5, Math.floor((g.friends[c.id] || 0) / 4)), h = '';
      for (var i = 1; i <= lv; i++) h += '<h4>♥' + i + '</h4>' + storyHtml(c, i);
      var mb = M.miniFor ? M.miniFor(c.id) : null;
      d.querySelector('#albumStory').innerHTML = (mb ? '<button class="btn primary wide" data-mplay="' + mb.id + '">' + mb.icon + ' ' + esc(mb.name) + (mb.open ? '' : ' · ♥' + mb.heart + '에 열려요') + '</button>' : '') + (h || '<p class="hint center">아직 열린 이야기가 없어요. ' + esc(c.name) + '의 의뢰를 채워 보세요!</p>');
      var pb = d.querySelector('[data-mplay]'); if (pb) pb.onclick = function () { if (!mb.open) { M.toast(c.name + '와(과) ♥' + mb.heart + '이 되면 부탁해요'); return; } d.close(); M.miniIntro(mb.id); };
    });
  }
  document.addEventListener('click', function (e) { var sl = e.target.closest && e.target.closest('.sline'); if (sl) M.say(sl.dataset.say, sl.dataset.lang); });
  M.gardenHelp = function () {
    M.modal('<h3>🏪 정원 가게 도움말</h3><ul class="unl">' +
      '<li><b>생산기</b>(씨앗 주머니·도토리 바구니 등)를 누르면 물방울 5개로 재료가 나와요. 꾹 누르면 계속 나와요.</li>' +
      '<li>같은 것끼리 <b>끌어다 겹치면</b> 한 단계 자라요. 빠르게 이어서 합치면 콤보 보너스!</li>' +
      '<li>손님 아래 <b>말풍선</b>에 원하는 물건이 있어요. 다 모이면 <b>주기</b>를 눌러요.</li>' +
      '<li>밭이 꽉 차면 물건을 골라 <b>🎒 가방</b>에 넣어 두세요.</li>' +
      '<li><b>작업대</b>에서 만든 완성품은 가방 속 보관함에 쌓여요.</li>' +
      '<li>가게 레벨이 오르면 새 생산기·손님·제작법이 열리고 밭을 넓힐 수 있어요.</li>' +
      '<li>물방울은 <b>레슨</b>을 하면 받아요.</li></ul><button class="btn primary wide" data-close>닫기</button>');
  };
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
    }).join('') + storeHtml() + '</div>';
  }
  function storeHtml() {
    var g = G(), ks = Object.keys(g.store).filter(function (k) { return g.store[k] > 0; });
    return '<div class="store"><small>📦 보관함</small>' + (ks.length ? ks.map(function (k) { return '<span class="sitem"><img src="img/prod-' + k + '.png" alt="" title="' + PRODUCTS[k].name + '"><i>' + g.store[k] + '</i></span>'; }).join('') : '<small class="hint"> 완성품은 밭이 아니라 여기에 쌓여요</small>') + '</div>';
  }
  function recipeSheet(slot) {
    var g = G();
    var list = Object.keys(PRODUCTS).filter(function (id) { return PRODUCTS[id].lv <= g.lv; });
    var lockedNext = Object.keys(PRODUCTS).filter(function (id) { return PRODUCTS[id].lv > g.lv; })[0];
    var d = M.modal('<h3>🛠️ 무엇을 만들까요?</h3><p class="hint">밭에 있는 재료를 써서 만들어요. 다 만들어지면 받으러 와 주세요.</p><div class="list">' + list.map(function (id) {
      var P = PRODUCTS[id], nd = recipeNeed(P), ok = nd.every(function (r) { return count(needKey(r)) >= r.n; });
      return '<div class="recipe' + (ok ? ' ok' : '') + '"><span class="le"><img src="img/prod-' + id + '.png" alt=""></span><div class="ln">' + P.name + ' <small>⏱ ' + (P.min >= 60 ? P.min / 60 + '시간' : P.min + '분') + '</small><div class="needs">' +
        nd.map(function (r) { return needHtml(r, true); }).join('') +
        '</div></div><button class="btn ' + (ok ? 'primary' : 'ghost') + '" data-make="' + id + '"' + (ok ? '' : ' disabled') + '>만들기</button></div>';
    }).join('') + '</div>' + (lockedNext ? '<p class="hint">' + PRODUCTS[lockedNext].em + ' ' + PRODUCTS[lockedNext].name + ' 제작법은 가게 레벨 ' + PRODUCTS[lockedNext].lv + '에 열려요</p>' : '') + '<button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-make]'); if (b && !b.disabled) { d.close(); M.gardenCraft(slot, b.dataset.make); } });
  }
  function takeItems(need) {
    var g = G();
    need.forEach(function (r) {
      var left = r.n, key = needKey(r);
      if (r.p) { var have = g.store[r.p] || 0, use = Math.min(have, left); g.store[r.p] = have - use; left -= use; }
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
    paintBench(); paintBar(); afterChange(); M.toast(P.em + ' ' + P.name + ' 만들기 시작!');
    return true;
  };
  M.gardenCollect = function (slot) {
    var g = G(), s = g.bench.slots[slot]; if (!s || s.until > Date.now()) return false;
    g.store[s.rid] = (g.store[s.rid] || 0) + 1; g.pfound = g.pfound || {}; g.pfound[s.rid] = 1; g.bench.slots[slot] = null; M.save();   // 밭 칸이 아니라 보관함으로
    var el = $('gBench'); burst(el, ['#ffd84a', '#ff9fc0', '#fff'], 14); floatText(el, PRODUCTS[s.rid].name + ' 완성! 보관함에 넣었어요', 'gold');
    M.sfx('win'); paintBench(); paintBar(); afterChange();
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
    var el = $('gBench'); if (!el || !el.offsetParent) { if (M.paintBadges) M.paintBadges(); if ($('gBar') && $('gBar').offsetParent && Date.now() % 5000 < 1000) paintBar(); return; }
    var g = G(), now = Date.now(), need = false;
    g.bench.slots.forEach(function (s, i) {
      if (!s) return; var t = el.querySelector('[data-left="' + i + '"]');
      if (s.until <= now) { if (t) need = true; } else if (t) t.textContent = fmtLeft(s.until - now) + ' 남음';
    });
    if (need) { paintBench(); M.paintBadges(); }
    paintBar();
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
    if (!M.spend('water', GEN_COST)) { M.toast('물방울이 부족해요. 레슨을 하거나 아래 "물방울 사기"로 살 수 있어요 💧'); M.buzz(40); return false; }
    var lucky = Math.random() < 0.08, it = { k: GENS[gen.g].chain, l: lucky ? 2 : 1 };
    g.cells[to] = it; found(it);
    var genEl = cellEl(c);
    paintCell(to); dropIn(to, genEl); M.sfx('pop');
    if (genEl && genEl.firstChild && !M.fast) { genEl.firstChild.classList.remove('squish'); void genEl.offsetWidth; genEl.firstChild.classList.add('squish'); }
    if (lucky) setTimeout(function () { floatText(cellEl(to), '🍀 행운!', 'gold'); }, 350);
    if (Math.random() < 0.03) {   // 가끔 귀한 물건이 같이 나온다
      var to2 = nearEmpty(c);
      if (to2 >= 0) { var rr = Math.random(), rid = rr < 0.6 ? 'clover' : rr < 0.85 ? 'gseed' : 'rainbow'; g.cells[to2] = { r: rid }; g.rfound = g.rfound || {}; g.rfound[rid] = 1; paintCell(to2); dropIn(to2, genEl); setTimeout(function () { floatText(cellEl(to2), RARES[rid].em + ' 귀한 물건!', 'gold'); M.sfx('win'); }, 350); }
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
    // 의뢰를 채운 손님은 옆모습으로 걸어 나간다
    var ci = g.orders.indexOf(o), cel = document.querySelectorAll('#gCounter .cust')[ci];
    if (cel && !M.fast) {
      var gone = cel.cloneNode(true), sw = document.querySelector('.stallwrap'), box = sw.querySelector('.custfx') || sw.appendChild(Object.assign(document.createElement('div'), { className: 'custfx' })), toRight = ci >= g.orders.length / 2 - 0.01 || g.orders.length === 1;
      gone.className = 'cust full leaving'; gone.removeAttribute('data-mq'); gone.querySelectorAll('i').forEach(function (z) { z.remove(); });
      var gi = gone.querySelector('img'); gi.src = 'img/w/ch-' + o.cust + '-side.png'; if (!toRight) gi.style.transform = 'scaleX(-1)';
      setTimeout(function () { box.appendChild(gone); void gone.offsetWidth; gone.style.left = (toRight ? 125 : -25) + '%'; setTimeout(function () { gone.remove(); }, 1700); }, 320);
    }
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
    var fr = friendUp(o.cust, true);
    M.give({ coins: o.rw.coins, fp: o.rw.fp });
    if (card && M.fly) { M.fly(card, 'img/coin.png', 'tCoin', 5); if (o.rw.fp) M.fly(card, 'img/flower-point.png', 'tFp', 4); }
    if (M.petExp) M.petExp(Math.ceil(o.rw.xp / 2));
    M.quest('order', 1);
    M.sfx('win'); M.buzz([20, 30, 20]);
    var c = custOf(o.cust);
    if (card) { burst(card, ['#ffd84a', '#ff9fc0', '#9be36b'], 14); floatText(card, c.em + ' 고마워요!', 'pink'); }
    M.save();
    addXp(o.rw.xp);
    if (fr % 4 === 0) heartUp(c, fr / 4, M.fast ? 0 : 900);
    setTimeout(function () { ensureOrders(); M.save(); paintOrders(); var n = document.querySelector('#gOrders .order:last-child'); if (n) n.classList.add('slidein'); panel(); }, M.fast ? 0 : 450);
    paintOrders(); panel();
    return true;
  };
  // 물방울 사기: 코인으로 산다. 공부(레슨)가 더 이득이 되도록 비싸게 둔다.
  var PACKS = [[30, 50], [100, 150], [300, 400]];
  function waterShop() {
    var d = M.modal('<h3>💧 물방울 사기</h3><p class="hint">레슨을 하면 물방울을 공짜로 받아요. 급할 때만 코인으로 사세요.</p><div class="list">' + PACKS.map(function (p, i) {
      return '<button class="litem" data-pack="' + i + '"><span class="le"><img src="img/' + (i === 0 ? 'water' : i === 1 ? 'waterbag' : 'waterbarrel') + '.png" alt="" style="width:44px;height:44px"></span><span class="ln">물방울 ' + p[0] + '개<small>생산기 ' + p[0] / GEN_COST + '번</small></span><span class="lp"><img src="img/coin.png" alt="">' + p[1] + '</span></button>';
    }).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pack]'); if (!b) return;
      var p = PACKS[+b.dataset.pack];
      if (!M.spend('coins', p[1])) { M.toast('코인이 ' + (p[1] - M.P.coins) + '개 더 필요해요'); return; }
      M.give({ water: p[0] }); M.sfx('coin'); M.toast('💧 물방울 ' + p[0] + '개를 샀어요'); d.close();
    });
  }
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
    if (t.closest('#gStash') && sel >= 0) { stash(sel); return; }
    if (t.closest('#gBagBtn')) { bagSheet(); return; }
    if (t.closest('#gBenchBtn')) { benchSheet(); return; }
    if (t.closest('#gHelp')) { M.gardenHelp(); return; }
    if (t.closest('#gDeco')) { decoSheet(); return; }
    var nk = t.closest('[data-nk]'); if (nk) { howSheet(nk.dataset.nk); return; }
    var mq = t.closest('[data-mq]'); if (mq && M.miniIntro) { M.miniIntro(mq.dataset.mq); return; }
    var gb = t.closest('[data-give]'); if (gb && !gb.disabled) { M.gardenDeliver(gb.dataset.give); return; }
    if (t.closest('#gWater')) { waterShop(); return; }
    if (t.closest('#gBookBtn')) { bookSheet(); return; }
    if (t.closest('#gAlbum')) { albumSheet(); return; }
    if (t.closest('#gRow')) { var g = G();
      if (g.rows >= MAX_ROWS) { M.toast('밭을 끝까지 넓혔어요'); return; }
      if (g.rows >= maxRows()) { lockedInfo('밭 넓히기', '가게 레벨 ' + (g.rows - 2) + '이 되면 밭을 한 줄 더 넓힐 수 있어요. 손님 의뢰를 채우면 가게 레벨이 올라요.'); return; } M.confirm('밭 넓히기', '<img class="inl" src="img/coin.png" alt="">' + ROW_COST[g.rows] + '코인으로 밭을 한 줄(' + COLS + '칸) 넓힐까요?', '넓히기', M.gardenExpand); return; }
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
  // 친밀도: 의뢰를 채우거나 부탁(미니게임)을 들어주면 오른다. 4번마다 ♥ 하나와 이야기
  function friendUp(id, quiet) {
    var g = G(), fr = (g.friends[id] || 0) + 1; g.friends[id] = fr; M.save();
    if (!quiet && fr % 4 === 0) heartUp(custOf(id), fr / 4, 400);
    return fr;
  }
  function heartUp(c, lvl, delay) {
    setTimeout(function () {
      var d = M.openChest({ coins: 20 * lvl, fp: 3 * lvl }, c.em + ' ' + M.j(c.name, '과', '와') + ' 더 친해졌어요! ' + '♥'.repeat(Math.min(5, lvl)));
      if (lvl <= 5) { var st = document.createElement('div'); st.innerHTML = storyHtml(c, lvl); d.querySelector('h3').after(st); }
      if (M.miniUnlockedNow) M.miniUnlockedNow(c.id, lvl);
    }, delay);
  }
  // 요리 재료로 쓰기: key 는 'h2'(꿀병)처럼 사슬 글자 + 단계
  M.gardenHave = function (key) { return M.P.garden && M.P.garden.cells ? count(key) : 0; };
  M.gardenTake = function (key, n) {
    var g = G(); sel = -1;
    for (var i = 0; i < N() && n > 0; i++) if (keyOf(g.cells[i]) === key) { g.cells[i] = null; n--; }
  };
  M.gardenItemInfo = function (key) { var k = key.charAt(0), l = +key.slice(1), C = CHAINS[k]; return C ? { name: C.names[l - 1], img: 'img/' + C.img + '-' + l + '.png' } : { name: key, img: '' }; };
  M.gardenFriendUp = function (id) { return friendUp(id, false); };
  M.custImg = function (id, happy) { return CUST_IMG[id] ? 'img/cust-' + id + (happy ? '-happy' : '') + '.png' : ''; };
  M.custOf = custOf;
  M.gardenState = G;
})();
