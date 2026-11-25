// 위에서 내려다보는 칸(타일) 마을 (말씨정원).
// 누른 칸까지 길을 찾아 걸어간다(터치로만 움직인다). 주민이나 건물 문을 누르면 그 앞까지 가서 말을 걸거나 들어간다.
// 바닥(풀·길·물·모래·돌바닥)은 이음매가 없도록 코드로 그린다. 나무·건물·캐릭터는 그림이 오면 IMG 에 넣는다.
(function () {
  var M = window.M, $ = M.$;
  var T = 32, W = 36, H = 48;   // 칸 크기(화면 px), 지도 가로·세로 칸 수
  var STEP = 170;               // 한 칸 걷는 시간(ms)
  // 그림이 오면 켠다. 예: tree: 'img/w-tree.png', house_bear: 'img/w-house-bear.png', ch_rabbit: 'img/ch-rabbit.png'(앞·뒤·옆 세 칸)
  var IMG = {};
  var WI = 'img/w/', CH_H = 1.6;   // 캐릭터 키(칸)
  var TILES = ['grass1', 'grass3', 'path', 'water', 'sand', 'plaza', 'plankh', 'flowers'];
  var TREES = ['t-green', 't-autumn', 't-cherry', 't-pine', 't-green2', 't-cherry2', 't-pine2', 't-green3', 't-cherry3'];
  var FLOWERS = ['d-flower1', 'd-flower2', 'd-tulip', 'd-grass1', 'd-grass2'];
  var DECO = ['d-bush1', 'd-bush2', 'd-bush3', 'd-bush4', 'd-bush5', 'd-bush6', 'd-bush7', 'd-flowerbush', 'd-rock', 'd-rock2', 'd-rock3', 'd-rock4', 'd-rocks', 'd-stump'];

  // ---------- 지도 만들기 ----------
  // 바닥: 0 풀, 1 길, 2 물, 3 모래, 4 다리, 5 돌바닥(광장)
  var G = [], SOLID = [], OBJ = [], DOORS = {}, built = false;
  var BUILD = [
    { id: 'museum', name: '박물관', x: 4, y: 5, w: 5, h: 3, color: '#c9d6e8', roof: '#7d8fb3', em: '🏛️' },
    { id: 'shop', name: '정원 가게', x: 23, y: 5, w: 5, h: 3, color: '#ffe3ea', roof: '#ff8fab', em: '🏪' },
    { id: 'gift', name: '선물 교환소', x: 4, y: 13, w: 5, h: 3, color: '#fff3c9', roof: '#ffb02e', em: '🎁' },
    { id: 'home', name: '내 집', x: 10, y: 14, w: 3, h: 2, color: '#fff', roof: '#e07a5f', em: '🐰' },
    { id: 'den', name: '두더지 땅굴', x: 30, y: 5, w: 3, h: 2, color: '#c9a06a', roof: '#8a5a2b', em: '⛏️' },
    { id: 'store', name: '잡화점', x: 25, y: 14, w: 5, h: 3, color: '#e9f7e4', roof: '#6cbf7a', em: '🛍️' }
  ];
  var LOTS = [[3, 23], [7, 23], [11, 23], [21, 23], [25, 23], [29, 23], [3, 29], [7, 29], [11, 29], [21, 29], [25, 29], [29, 29],
    [9, 6], [13, 6], [19, 6], [27, 8], [2, 8], [30, 13], [7, 17], [2, 17]];   // 13번째부터는 새 주민 자리
  var HOUSE_COL = { bear: '#d9a066', squirrel: '#c98b5a', chick: '#ffe08a', hedgehog: '#e8b4a0', panda: '#e8e8e8', fox: '#f4a261', koala: '#b8c4d6', hamster: '#f6d6a8', penguin: '#cfe9f7', cat: '#f3d9b1', sheep: '#fbf7ef', owl: '#b5926a', dog: '#fff1dc', otter: '#e6c48a', deer: '#d9eccc', duck: '#ffe680', lion: '#f6a54b', camel: '#e8c99a', elephant: '#c9ccd6', monkey: '#c79a6a' };
  var BOARD = { x: 15, y: 15 }, PIER = { x: 26, y: 42 };

  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function set(x, y, v) { if (x >= 0 && y >= 0 && x < W && y < H) G[y * W + x] = v; }
  function hpath(y, x1, x2) { for (var x = x1; x <= x2; x++) { set(x, y, 1); } }
  function vpath(x, y1, y2) { for (var y = y1; y <= y2; y++) { set(x, y, 1); } }
  function solid(x, y, v) { if (x >= 0 && y >= 0 && x < W && y < H) SOLID[y * W + x] = v || 1; }
  function build() {
    if (built) return; built = true;
    var i, x, y;
    for (i = 0; i < W * H; i++) { G[i] = 0; SOLID[i] = 0; }
    // 길
    vpath(17, 3, 33); vpath(18, 3, 33);
    hpath(11, 3, 32); hpath(21, 3, 32); hpath(28, 3, 32); hpath(32, 3, 32);
    for (y = 13; y <= 19; y++) for (x = 13; x <= 22; x++) set(x, y, 5);   // 광장
    // 강과 다리
    for (x = 0; x < W; x++) { set(x, 34, 2); set(x, 35, 2); }
    set(17, 34, 4); set(18, 34, 4); set(17, 35, 4); set(18, 35, 4);
    // 모래사장과 바다, 선착장
    for (y = 36; y <= 38; y++) for (x = 0; x < W; x++) set(x, y, 3);
    for (y = 39; y < H; y++) for (x = 0; x < W; x++) set(x, y, 2);
    for (y = 39; y <= 42; y++) set(26, y, 4);
    vpath(17, 36, 38); vpath(18, 36, 38); hpath(37, 18, 26);
    // 건물: 몸통은 막히고, 문 앞 칸까지 길을 낸다
    BUILD.forEach(function (b) {
      for (y = b.y; y < b.y + b.h; y++) for (x = b.x; x < b.x + b.w; x++) solid(x, y);
      var dx = b.x + Math.floor(b.w / 2), dy = b.y + b.h;   // 문 앞 칸
      b.door = { x: dx, y: dy }; DOORS[dx + ',' + dy] = { type: 'place', id: b.id };
      var py = dy; while (py < H && G[py * W + dx] !== 1 && G[py * W + dx] !== 5) { set(dx, py, 1); py++; }
      OBJ.push({ kind: 'build', b: b, y: b.y + b.h });
    });
    LOTS.forEach(function (l, k) {
      var lot = { x: l[0], y: l[1], w: 3, h: 3, k: k };
      lot.door = { x: l[0] + 1, y: l[1] + 3 };
      for (y = lot.y; y < lot.y + 3; y++) for (x = lot.x; x < lot.x + 3; x++) solid(x, y, 2 + k);   // 집터 (집이 없으면 나중에 풀어 준다)
      var py = lot.door.y; while (py < H && G[py * W + lot.door.x] !== 1) { set(lot.door.x, py, 1); py++; }
      OBJ.push({ kind: 'lot', lot: lot, y: lot.y + 3 });
    });
    // 게시판·선착장·다리
    solid(BOARD.x, BOARD.y); solid(BOARD.x + 1, BOARD.y); OBJ.push({ kind: 'board', x: BOARD.x, y: BOARD.y + 1 }); DOORS[BOARD.x + ',' + (BOARD.y + 1)] = { type: 'place', id: 'board' };
    DOORS[PIER.x + ',' + PIER.y] = { type: 'place', id: 'pier' };
    solid(PIER.x + 1, 38); OBJ.push({ kind: 'img', src: 'o-sign', x: PIER.x + 1.5, y: 39, h: 1.1 }); OBJ.push({ kind: 'label', text: '🎣 낚시터', x: PIER.x + 1.5, y: 37.6, z: 39 });
    OBJ.push({ kind: 'img', src: 'o-pier', x: PIER.x + 0.5, y: PIER.y + 1.4, h: 1.6, under: true });
    OBJ.push({ kind: 'img', src: 'm-arch', x: 18, y: 12.6, h: 2.4 });
    // 광장 꾸미기: 가로등·벤치·꽃밭
    [[13, 13, 'o-lamp'], [22, 13, 'o-lamp1'], [13, 19, 'o-lamp2'], [22, 19, 'o-lamp3']].forEach(function (q) { solid(q[0], q[1]); OBJ.push({ kind: 'img', src: q[2], x: q[0] + 0.5, y: q[1] + 1, h: 1.6 }); });
    [[20, 15, 'o-bench'], [20, 18, 'o-bench1'], [14, 17, 'o-bench2']].forEach(function (q) { solid(q[0], q[1]); solid(q[0] + 1, q[1]); OBJ.push({ kind: 'img', src: q[2], x: q[0] + 1, y: q[1] + 1, h: 1.1 }); });
    [[16, 13, 'o-planter'], [19, 13, 'o-flowerbed']].forEach(function (q) { solid(q[0], q[1]); OBJ.push({ kind: 'img', src: q[2], x: q[0] + 0.5, y: q[1] + 1, h: 0.9 }); });
    solid(17, 16); solid(18, 16); OBJ.push({ kind: 'img', src: 'x-fountain', x: 18, y: 17, h: 1.7 });
    solid(15, 19); OBJ.push({ kind: 'img', src: 'o-well', x: 15.5, y: 20, h: 1.5 });
    OBJ.push({ kind: 'market', x: 21.5, y: 15, tx: 21, ty: 14 });
    solid(13, 16); OBJ.push({ kind: 'mailbox', x: 13.5, y: 17 });
    solid(20, 12); OBJ.push({ kind: 'img', src: 'x-signpost', x: 20.5, y: 13, h: 1.4 });
    [[24, 18, 'x-barrel', 1], [24, 19, 'x-applecrate', 0.9], [30, 18, 'x-flowercart', 1.1], [3, 17, 'x-tulipbox', 0.9], [9, 18, 'x-topiary', 1.3], [14, 21, 'x-flag', 1.6], [21, 21, 'x-flag', 1.6]].forEach(function (q) { if (G[q[1] * W + q[0]] !== 0 || SOLID[q[1] * W + q[0]]) return; solid(q[0], q[1]); OBJ.push({ kind: 'img', src: q[2], x: q[0] + 0.5, y: q[1] + 1, h: q[3] }); });
    // 주민 집 옆 우체통
    LOTS.forEach(function (l, k) { solid(l[0] + 3, l[1] + 2, 2 + k); OBJ.push({ kind: 'mail', k: k, x: l[0] + 3.5, y: l[1] + 3 }); });
    // 열매 나무 6그루: 사방이 풀인 곳에 서로 떨어뜨려 심는다
    var rf = rnd(31), FK = ['apple', 'orange', 'peach', 'pear', 'cherry', 'apple'], fts = [];
    for (var tries = 0; tries < 3000 && fts.length < FK.length; tries++) {
      var fx = 3 + Math.floor(rf() * (W - 6)), fy = 4 + Math.floor(rf() * 28), okk = true;
      for (var a2 = -1; a2 <= 1 && okk; a2++) for (var b2 = -1; b2 <= 1; b2++) { var gi = (fy + b2) * W + fx + a2; if (G[gi] !== 0 || SOLID[gi]) { okk = false; break; } }
      if (okk && fts.every(function (f) { return Math.abs(f[0] - fx) + Math.abs(f[1] - fy) > 6; })) fts.push([fx, fy]);
    }
    fts.forEach(function (f, k) { solid(f[0], f[1]); OBJ.push({ kind: 'ftree', fk: FK[k], key: 'f' + k, tx: f[0], ty: f[1], x: f[0] + 0.5, y: f[1] + 1, h: 2.5 }); });
    // 숲 테두리와 흩어진 나무·덤불·바위·꽃
    var r = rnd(7), TREEAT = [], FOREST = ['t-green', 't-green2', 't-green3', 't-pine', 't-pine2', 't-green', 't-autumn', 't-cherry'];
    for (y = 0; y < 34; y++) for (x = 0; x < W; x++) {
      var edge = y < 3 || x < 2 || x > W - 3;
      if (G[y * W + x] !== 0 || SOLID[y * W + x]) continue;
      var nearPath = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1]].some(function (d) { var v = G[(y + d[1]) * W + x + d[0]]; return v === 1 || v === 5 || SOLID[(y + d[1]) * W + x + d[0]]; });
      var q = r();
      var crowd = 0; for (var dy2 = -1; dy2 <= 1; dy2++) for (var dx2 = -1; dx2 <= 1; dx2++) if (TREEAT[(y + dy2) * W + x + dx2]) crowd++;
      if ((edge ? q < 0.55 : (!nearPath && q < 0.05)) && crowd < (edge ? 3 : 1)) {
        solid(x, y); TREEAT[y * W + x] = 1;
        var tn = edge ? FOREST[Math.floor(r() * FOREST.length)] : TREES[Math.floor(r() * TREES.length)];
        OBJ.push({ kind: 'tree', src: tn, key: 't' + x + '_' + y, tx: x, ty: y, pine: tn.indexOf('pine') >= 0, x: x + 0.5 + (r() - 0.5) * 0.3, y: y + 1, h: (tn.indexOf('pine') >= 0 ? 2.6 : 2.2) + r() * 0.35 });
      }
      else if (!nearPath && q < 0.085 && !crowd) { solid(x, y); var dn = DECO[Math.floor(r() * DECO.length)], isRock = dn.indexOf('rock') >= 0; OBJ.push({ kind: isRock ? 'rock' : 'img', src: dn, key: 'r' + x + '_' + y, tx: x, ty: y, x: x + 0.5, y: y + 1, h: isRock ? 1.0 : 0.8 + r() * 0.2 }); }
      else if (q < 0.15) OBJ.push({ kind: 'img', src: FLOWERS[Math.floor(r() * FLOWERS.length)], x: x + 0.5, y: y + 1, h: 0.5, flat: true });
    }
    for (x = 0; x < W; x++) if (r() < 0.25 && G[36 * W + x] === 3 && x !== 17 && x !== 18) OBJ.push({ kind: 'shell', x: x, y: 37 });
  }
  function walkable(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    var g = G[y * W + x]; if (g === 2) return false;
    var s = SOLID[y * W + x]; if (!s) return true;
    if (s >= 2) { return !lotHasHouse(s - 2); }
    return false;
  }
  function lotHasHouse(k) { return !!residentAt(k); }
  function residentAt(k) { var rs = M.V.residents(); return rs[k] || null; }

  // ---------- 바닥 그리기 (한 번만 그려 둔다) ----------
  var ground = null, groundScale = 1;
  // 바닥 그림(이음매 없이 이어지게 만든 64px 타일)을 먼저 불러온다
  var tileImg = {}, tilesReady = false;
  function loadTiles(done) {
    var left = TILES.length;
    TILES.forEach(function (n) { var im = new Image(); im.onload = im.onerror = function () { if (--left === 0) done(); }; im.src = WI + 'tile-' + n + '.png'; tileImg[n] = im; });
  }
  function drawGround() {
    var sc = Math.min(2, window.devicePixelRatio || 1); groundScale = sc;
    var c = document.createElement('canvas'); c.width = W * T * sc; c.height = H * T * sc;
    var g = c.getContext('2d'); g.scale(sc, sc);
    var pat = {};
    TILES.forEach(function (n) {
      var im = tileImg[n]; if (!im || !im.naturalWidth) return;
      var p = g.createPattern(im, 'repeat'); if (p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().scale(T / im.naturalWidth));
      pat[n] = p;
    });
    var P = function (n, fb) { return pat[n] || fb; };
    var r = rnd(11), x, y;
    // 풀밭 전체
    g.fillStyle = P('grass1', '#a7dc8a'); g.fillRect(0, 0, W * T, H * T);
    // 물·모래: 이웃이 같으면 이어서, 가장자리는 둥글게
    function rect(x0, y0, w, h, l, rr, u, d) {
      var rad = 9; g.beginPath();
      g.moveTo(x0 + (u || l ? 0 : rad), y0); g.lineTo(x0 + w - (u || rr ? 0 : rad), y0);
      g.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + (u || rr ? 0 : rad)); g.lineTo(x0 + w, y0 + h - (d || rr ? 0 : rad));
      g.quadraticCurveTo(x0 + w, y0 + h, x0 + w - (d || rr ? 0 : rad), y0 + h); g.lineTo(x0 + (d || l ? 0 : rad), y0 + h);
      g.quadraticCurveTo(x0, y0 + h, x0, y0 + h - (d || l ? 0 : rad)); g.lineTo(x0, y0 + (u || l ? 0 : rad));
      g.quadraticCurveTo(x0, y0, x0 + (u || l ? 0 : rad), y0); g.fill();
    }
    function blob(type, fill, edge, inset) {
      function same(a, b) { if (a < 0 || b < 0 || a >= W || b >= H) return type.indexOf(G[Math.max(0, Math.min(H - 1, b)) * W + Math.max(0, Math.min(W - 1, a))]) >= 0; return type.indexOf(G[b * W + a]) >= 0; }
      [0, 1].forEach(function (pass) {   // 테두리를 먼저 다 그리고, 안쪽을 나중에 칠해서 칸 사이 줄이 안 보이게
        for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
          if (!same(x, y)) continue;
          var l = same(x - 1, y), rr = same(x + 1, y), u = same(x, y - 1), d = same(x, y + 1);
          var x0 = x * T + (l ? 0 : inset), x1 = x * T + T - (rr ? 0 : inset), y0 = y * T + (u ? 0 : inset), y1 = y * T + T - (d ? 0 : inset);
          if (!pass) { g.fillStyle = edge; rect(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6, l, rr, u, d); }
          else { g.fillStyle = fill; rect(x0 - (l ? 1 : 0), y0 - (u ? 1 : 0), x1 - x0 + (l ? 1 : 0) + (rr ? 1 : 0), y1 - y0 + (u ? 1 : 0) + (d ? 1 : 0), l, rr, u, d); }
        }
      });
    }
    blob([3], P('sand', '#f4e3b5'), '#e6cf95', 0);
    blob([2, 4], P('water', '#79c4ea'), '#eaf7ff', 2);
    // 다리와 선착장: 가로 판자, 양옆 난간
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (G[y * W + x] === 4) {
      g.fillStyle = P('plankh', '#c99a5b'); g.fillRect(x * T, y * T - 2, T, T + 4);
      var lw = G[y * W + x - 1] === 4, rw = G[y * W + x + 1] === 4;
      g.fillStyle = '#8a5a2b';
      if (!lw) { g.fillRect(x * T - 3, y * T - 4, 6, T + 8); g.beginPath(); g.arc(x * T, y * T + 2, 5, 0, 7); g.fill(); }
      if (!rw) { g.fillRect(x * T + T - 3, y * T - 4, 6, T + 8); g.beginPath(); g.arc(x * T + T, y * T + 2, 5, 0, 7); g.fill(); }
    }
    blob([1], P('path', '#ead1a0'), '#d2b07a', 3);
    blob([5], P('plaza', '#e4dccd'), '#c9b99c', 2);
    ground = c;
  }

  // ---------- 캐릭터 ----------
  var me = null, npcs = [], cam = { x: 0, y: 0 }, cv = null, ctx = null, raf = 0, imgs = {}, lastT = 0, mounted = null;
  function img(src) { if (!src) return null; if (!imgs[src]) { var i = new Image(); i.src = src; imgs[src] = i; } return imgs[src].complete && imgs[src].naturalWidth ? imgs[src] : null; }
  function Wst() { var P = M.P; P.world = P.world || { x: 17, y: 22, d: 'down' }; return P.world; }
  function mkActor(x, y, kind, id) { return { x: x, y: y, px: x, py: y, tx: x, ty: y, t: 1, d: 'down', path: [], kind: kind, id: id, wait: 0 }; }
  function syncNpcs() {
    var rs = M.V.residents();
    npcs = npcs.filter(function (n) { return rs.some(function (c) { return c.id === n.id; }); });
    rs.forEach(function (c, k) {
      if (npcs.some(function (n) { return n.id === c.id; }) || !LOTS[k]) return;
      var l = LOTS[k], n = mkActor(l[0] + 1, l[1] + 4, 'npc', c.id); n.home = { x: n.x, y: n.y }; n.k = k; n.door = { x: l[0] + 1, y: l[1] + 3 }; n.asleep = sleepy(n); n.wait = 500 + Math.random() * 2000; npcs.push(n);
    });
  }
  // 잠: 밤 9시부터 한 명씩 집에 들어가 자고, 자정에는 모두 잔다. 아침 6시부터 차례로 나온다
  function hourNow() { var d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  function sleepy(n) { var h = hourNow(), at = 21 + ((n.k * 7) % 12) * 0.25, wake = 6 + ((n.k * 5) % 4) * 0.25; return h >= at || h < wake; }
  M.residentAsleep = function (id) { var n = npcs.filter(function (x) { return x.id === id; })[0]; return n ? !!n.asleep : (function () { var h = hourNow(); return h < 6 || h >= 23.9; })(); };
  function occupied(x, y, self) {
    if (me && me !== self && ((me.x === x && me.y === y) || (me.tx === x && me.ty === y))) return true;
    return npcs.some(function (n) { return n !== self && !n.asleep && ((n.x === x && n.y === y) || (n.tx === x && n.ty === y)); });
  }
  // 길 찾기 (네 방향 BFS)
  function findPath(sx, sy, gx, gy, self) {
    if (sx === gx && sy === gy) return [];
    var prev = {}, q = [[sx, sy]], key = function (x, y) { return x + ',' + y; }; prev[key(sx, sy)] = null;
    while (q.length) {
      var c = q.shift();
      if (c[0] === gx && c[1] === gy) break;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = c[0] + d[0], ny = c[1] + d[1], k = key(nx, ny);
        if (k in prev || !walkable(nx, ny)) return;
        if (occupied(nx, ny, self) && !(nx === gx && ny === gy)) return;
        prev[k] = c; q.push([nx, ny]);
      });
      if (q.length > 3000) break;
    }
    if (!(key(gx, gy) in prev)) return null;
    var path = [], p = [gx, gy];
    while (p && !(p[0] === sx && p[1] === sy)) { path.unshift(p); p = prev[key(p[0], p[1])]; }
    return path;
  }
  function stepActor(a, dt) {
    if (a.t < 1) {
      a.t = Math.min(1, a.t + dt / (a.kind === 'npc' ? STEP * 1.8 : STEP));
      if (a.t >= 1) { a.x = a.tx; a.y = a.ty; if (a === me) { var w = Wst(); w.x = a.x; w.y = a.y; w.d = a.d; } }
      return;
    }
    if (a.path.length) {
      var n = a.path[0];
      if (!walkable(n[0], n[1]) || occupied(n[0], n[1], a)) { a.path = a.kind === 'me' && a.goal ? (findPath(a.x, a.y, a.goal[0], a.goal[1], a) || []) : []; return; }
      a.path.shift();
      a.d = n[0] > a.x ? 'right' : n[0] < a.x ? 'left' : n[1] > a.y ? 'down' : 'up';
      a.px = a.x; a.py = a.y; a.tx = n[0]; a.ty = n[1]; a.t = 0;
      return;
    }
    if (a === me && a.onArrive) { var f = a.onArrive; a.onArrive = null; f(); }
  }
  // 주민이 혼잣말을 한다 (배우는 말 + 뜻). 누르면 다가가서 이야기한다
  var CHAT = {
    ja: [['いい天気！', '날씨 좋다!'], ['おなかすいた…', '배고파…'], ['こんにちは！', '안녕!'], ['♪ ラララ', '♪ 랄랄라'], ['ねむい…', '졸려…'], ['あそぼう！', '놀자!'], ['おはよう！', '좋은 아침!'], ['きれいな花！', '예쁜 꽃!']],
    zh: [['天气真好！', '날씨 좋다!'], ['我饿了…', '배고파…'], ['你好！', '안녕!'], ['♪ 啦啦啦', '♪ 랄랄라'], ['好困…', '졸려…'], ['一起玩吧！', '같이 놀자!'], ['早上好！', '좋은 아침!'], ['花真漂亮！', '꽃이 예뻐!']],
    en: [['Nice weather!', '날씨 좋다!'], ["I'm hungry…", '배고파…'], ['Hello!', '안녕!'], ['♪ La la la', '♪ 랄랄라'], ['So sleepy…', '졸려…'], ["Let's play!", '놀자!'], ['Good morning!', '좋은 아침!'], ['Pretty flowers!', '예쁜 꽃!']]
  };
  var SLEEPY = { ja: ['ねむい…', '졸려…'], zh: ['好困…', '졸려…'], en: ['So sleepy…', '졸려…'] };
  function npcThink(n, dt) {
    if (n.asleep) { if (!sleepy(n)) { n.asleep = false; n.x = n.px = n.tx = n.door.x; n.y = n.py = n.ty = n.door.y + 1; n.path = []; } return; }
    var late = new Date().getHours() >= 20;
    if (sleepy(n) && !n.talking) {   // 집으로 가서 잔다
      if (n.t < 1) return;
      if (n.x === n.door.x && n.y === n.door.y + 1) { n.asleep = true; n.say = null; n.path = []; return; }
      if (!n.path.length) { var hp = findPath(n.x, n.y, n.door.x, n.door.y + 1, n); if (hp && hp.length) n.path = hp; else { n.asleep = true; return; } }
      if (!n.say) n.say = { t: (SLEEPY[M.P.lang] || SLEEPY.en)[0], k: '졸려… 집에 가서 잘래요', until: performance.now() + 2500 };
      return;
    }
    if (n.say && performance.now() > n.say.until) n.say = null;
    if (!n.say && !n.talking && Math.random() < dt / 9000) { var L = late ? [SLEEPY[M.P.lang] || SLEEPY.en] : (CHAT[M.P.lang] || CHAT.en), c = L[Math.floor(Math.random() * L.length)]; n.say = { t: c[0], k: c[1], until: performance.now() + 3200 }; }
    if (n.t < 1 || n.path.length || n.talking) return;
    n.wait -= dt; if (n.wait > 0) return;
    n.wait = 1500 + Math.random() * 3500;
    // 가끔은 먼 곳(광장·다른 집·바닷가)까지 산책하고, 집에서 너무 멀면 돌아온다
    var far = Math.abs(n.x - n.home.x) + Math.abs(n.y - n.home.y);
    if (Math.random() < 0.45 || far > 18) {
      var tx, ty, k;
      for (k = 0; k < 12; k++) {
        if (far > 18) { tx = n.home.x + Math.round((Math.random() - 0.5) * 4); ty = n.home.y + Math.round((Math.random() - 0.5) * 2); }
        else if (Math.random() < 0.3) { tx = 14 + Math.floor(Math.random() * 8); ty = 14 + Math.floor(Math.random() * 6); }   // 광장
        else { tx = n.x + Math.round((Math.random() - 0.5) * 16); ty = n.y + Math.round((Math.random() - 0.5) * 12); }
        if (walkable(tx, ty) && !DOORS[tx + ',' + ty] && !occupied(tx, ty, n)) break;
      }
      if (k < 12) { var pth = findPath(n.x, n.y, tx, ty, n); if (pth && pth.length && pth.length <= 30) { n.path = pth; return; } }
    }
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], d = dirs[Math.floor(Math.random() * 4)], nx = n.x + d[0], ny = n.y + d[1];
    if (Math.abs(nx - n.home.x) > 4 || Math.abs(ny - n.home.y) > 3) { nx = n.x + Math.sign(n.home.x - n.x); ny = n.y + (nx === n.x ? Math.sign(n.home.y - n.y) : 0); }
    if (walkable(nx, ny) && !occupied(nx, ny, n) && !DOORS[nx + ',' + ny]) n.path = [[nx, ny]];
    else n.d = ['down', 'left', 'right', 'up'][Math.floor(Math.random() * 4)];
  }
  function pos(a) { var e = a.t < 1 ? a.t : 1; return { x: a.px + (a.tx - a.px) * e, y: a.py + (a.ty - a.py) * e }; }

  // ---------- 그리기 ----------
  function draw(now) {
    if (!mounted || !cv.isConnected) { raf = 0; return; }
    var dt = Math.min(60, now - (lastT || now)); lastT = now;
    stepActor(me, dt); npcs.forEach(function (n) { npcThink(n, dt); stepActor(n, dt); });
    var vw = cv.clientWidth, vh = cv.clientHeight, mp = pos(me);
    // 시야: 손가락으로 끌어 옮긴 동안은 그 자리, 아니면 토끼를 부드럽게 따라간다
    var fx = (mp.x + 0.5) * T - vw / 2, fy = (mp.y + 0.5) * T - vh / 2;
    if (freeCam) { fx = freeCam.x; fy = freeCam.y; }
    fx = Math.max(0, Math.min(W * T - vw, fx)); fy = Math.max(0, Math.min(H * T - vh, fy));
    if (freeCam) { freeCam.x = fx; freeCam.y = fy; cam.x = fx; cam.y = fy; }
    else if (camEase) { var k = Math.min(1, dt / 120); cam.x += (fx - cam.x) * k; cam.y += (fy - cam.y) * k; if (Math.abs(fx - cam.x) + Math.abs(fy - cam.y) < 1) camEase = false; }
    else { cam.x = fx; cam.y = fy; }
    var sc = cv.width / vw;
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    ctx.drawImage(ground, cam.x * groundScale, cam.y * groundScale, vw * groundScale, vh * groundScale, 0, 0, vw, vh);
    ctx.translate(-cam.x, -cam.y);
    // 물체와 캐릭터를 아래쪽(y)이 큰 순서로 그려 앞뒤를 맞춘다
    OBJ.forEach(function (o) { if (o.under) drawObj(o); });
    var list = OBJ.filter(function (o) { var oy = o.y * T; return !o.under && oy > cam.y - 40 && oy < cam.y + vh + 260; }).map(function (o) { return { y: o.z || o.y, o: o }; });
    [me].concat(npcs.filter(function (n) { return !n.asleep; })).forEach(function (a) { var p = pos(a); list.push({ y: p.y + 1, a: a, p: p }); });
    daily().forEach(function (d) { list.push({ y: d.y + 0.5, g: d }); });
    bugTick(dt, now); bugs.forEach(function (b) { list.push({ y: b.y + 2, b: b }); });
    list.sort(function (A, B) { return A.y - B.y; });
    list.forEach(function (it) {
      if (it.o) drawObj(it.o);
      else if (it.g) sprite(it.g.type === 'd' ? 'dig-spot' : (M.GATHER.ITEMS[it.g.id] || {}).img.replace('img/w/', '').replace('.png', ''), it.g.x + 0.5, it.g.y + 0.9, 0, false, it.g.type === 'd' ? 0.7 : 0.62);
      else if (it.b) { var fl = Math.sin(now / 120 + it.b.ph) * 0.12; sprite(M.GATHER.ITEMS[it.b.id].img.replace('img/w/', '').replace('.png', ''), it.b.x, it.b.y + fl, 0, it.b.vx < 0, 0.62); if (it.b.id === 'firefly' && M.V.tint() !== 'day') { ctx.fillStyle = 'rgba(255,240,120,.35)'; ctx.beginPath(); ctx.arc(it.b.x * T, (it.b.y + fl - 0.3) * T, 12, 0, 7); ctx.fill(); } }
      else drawActor(it.a, it.p, now);
    });
    if (tapMark && now - tapMark.t < 600) { ctx.strokeStyle = 'rgba(255,255,255,' + (1 - (now - tapMark.t) / 600) + ')'; ctx.lineWidth = 3; ctx.strokeRect(tapMark.x * T + 3, tapMark.y * T + 3, T - 6, T - 6); }
    // 시간대 빛깔
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    var tint = M.V.tint(); if (tint !== 'day') { ctx.fillStyle = tint === 'night' ? 'rgba(40,50,120,.32)' : tint === 'dusk' ? 'rgba(255,140,80,.16)' : 'rgba(255,200,170,.12)'; ctx.fillRect(0, 0, vw, vh); }
    raf = requestAnimationFrame(draw);
  }
  function label(text, x, y, color) {
    ctx.font = '700 11px system-ui, sans-serif'; var w = ctx.measureText(text).width + 10;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; roundRect(x - w / 2, y - 9, w, 17, 8); ctx.fill();
    ctx.fillStyle = color || '#5b4630'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function emoji(e, x, y, size) { ctx.font = size + 'px "Noto Color Emoji", "Apple Color Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y); }
  function house(x, y, w, h, wall, roof) {
    var X = x * T, Y = y * T, WW = w * T, HH = h * T;
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(X + 4, Y + HH - 6, WW, 8);
    ctx.fillStyle = wall; ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2.5;
    roundRect(X + 2, Y + HH * 0.42, WW - 4, HH * 0.58 - 2, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(X - 4, Y + HH * 0.48); ctx.lineTo(X + WW / 2, Y - 6); ctx.lineTo(X + WW + 4, Y + HH * 0.48); ctx.closePath(); ctx.fill(); ctx.stroke();
    var dw = T * 0.7; ctx.fillStyle = '#8a5a2b'; roundRect(X + WW / 2 - dw / 2, Y + HH - T * 0.95, dw, T * 0.95 - 2, 6); ctx.fill(); ctx.stroke();
  }
  // 그림을 가로 w칸 너비로, 아래쪽 가운데가 (x, y) 칸 좌표에 오게 그린다
  function sprite(name, x, y, w, flip, h) {
    var im = img(WI + name + '.png'); if (!im) return false;
    var ar = im.naturalHeight / im.naturalWidth, dw, dh;
    if (w && h) { dw = Math.min(w * T, h * T / ar); dh = dw * ar; }   // 상자 안에 맞춘다
    else if (h) { dh = h * T; dw = dh / ar; }
    else { dw = w * T; dh = dw * ar; }
    var X = x * T - dw / 2, Y = y * T - dh;
    if (flip) { ctx.save(); ctx.translate(X + dw, Y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, dw, dh); ctx.restore(); }
    else ctx.drawImage(im, X, Y, dw, dh);
    return { top: Y, h: dh };
  }
  function drawObj(o) {
    var X, Y, r;
    if (o.kind === 'img') { sprite(o.src, o.x, o.y + (o.flat ? -0.1 : 0.05), o.w, false, o.h); }
    else if (o.kind === 'tree' || o.kind === 'ftree' || o.kind === 'rock') {
      var sh = o.shake ? performance.now() - o.shake : 1e9, dx = sh < 600 ? Math.sin(sh / 35) * (1 - sh / 600) * (o.kind === 'rock' ? 3 : 6) : 0;
      ctx.save(); ctx.translate(dx, 0);
      sprite(o.kind === 'ftree' ? (M.fruitReady && M.fruitReady(o.key) ? 'ft-' + o.fk : 'ft-none') : o.src, o.x, o.y + 0.05, 0, false, o.h);
      ctx.restore();
      if (sh < 700 && o.kind !== 'rock') sprite('fx-leaves', o.x + 0.2, o.y - o.h * 0.35 + sh / 500, 0, false, 0.8);
      if (sh < 500 && o.kind === 'rock') sprite('fx-dust', o.x, o.y + 0.1, 0, false, 0.6);
    }
    else if (o.kind === 'label') { label(o.text, o.x * T, o.y * T); }
    else if (o.kind === 'mailbox') { var mr = sprite('mail-box', o.x, o.y, 0, false, 1.3); if (M.mailUnread && M.mailUnread()) emoji('✉️', o.x * T + T * 0.5, (mr ? mr.top : o.y * T - 40) + 4, 16); }
    else if (o.kind === 'market') { if (M.marketToday && M.marketToday()) { var rr = sprite('x-stand', o.x, o.y, 0, false, 1.7); sprite('ch-raccoon-front', o.x + 0.9, o.y + 0.25, 0, false, CH_H); label('떠돌이 장터', o.x * T, (rr ? rr.top : o.y * T - 50) + 2); } }
    else if (o.kind === 'shell') { emoji('🐚', o.x * T + T / 2, (o.y - 1) * T + T / 2, 13); }
    else if (o.kind === 'mail') { if (residentAt(o.k)) sprite(['o-mail', 'o-mail1', 'o-mail2'][o.k % 3], o.x, o.y + 0.05, 0, false, 1.1); }
    else if (o.kind === 'build') {
      var b = o.b, nm = b.id === 'home' ? 'h-pink' : 'b-' + b.id;
      r = sprite(nm, b.x + b.w / 2, b.y + b.h + 0.15, b.id === 'home' ? 3.5 : b.id === 'den' ? 4 : 5.6, false, b.id === 'home' ? 3.4 : b.id === 'den' ? 2.6 : 4.6);
      if (!r) { house(b.x, b.y, b.w, b.h, b.color, b.roof); emoji(b.em, (b.x + b.w / 2) * T, (b.y + b.h * 0.62) * T, 22); r = { top: b.y * T }; }
      label(b.name, (b.x + b.w / 2) * T, r.top + 4);
      if ((b.id === 'shop' && M.gardenOrderReady && M.gardenOrderReady())) emoji('📦', (b.x + b.w) * T, r.top + 10, 18);
    } else if (o.kind === 'lot') {
      var l = o.lot, c = residentAt(l.k);
      if (c) {
        r = sprite('h-' + c.id, l.x + 1.5, l.y + 3.15, 3.5, false, 3.4);
        if (!r) { house(l.x, l.y, 3, 3, HOUSE_COL[c.id] || '#fff', '#c46b6b'); r = { top: l.y * T }; }
        label(c.name + (M.V.hearts(c.id) ? ' ♥' + M.V.hearts(c.id) : ''), (l.x + 1.5) * T, r.top + 2);
        if (M.residentAsleep(c.id)) emoji('💤', (l.x + 2.6) * T, r.top + 18 + Math.sin(performance.now() / 500) * 3, 18);
      } else if (l.k === M.V.residents().length && M.V.nextMover()) {
        r = sprite('b-lot', l.x + 1.5, l.y + 3.1, 3.4, false, 2.6);
        sprite('m-boxes', l.x + 0.9, l.y + 2.4, 0, false, 1.1);
        label('이사 예정', (l.x + 1.5) * T, (r ? r.top : l.y * T) + 4);
      }
    } else if (o.kind === 'board') {
      r = sprite('b-board', o.x + 1, o.y + 0.05, 0, false, 1.9);
      label('게시판', (o.x + 1) * T, (r ? r.top : (o.y - 2) * T) + 2);
      if (M.V.boardNews()) emoji('❗', (o.x + 2.1) * T, (r ? r.top : (o.y - 2) * T) + 8, 16);
    }
  }
  // 토끼: ch-rabbit<단계>-<front|back|side><1|2>, 주민: ch-<id>-<front|back|side>. 옆모습 그림은 오른쪽을 본다
  function drawActor(a, p, now) {
    var X = p.x * T, Y = p.y * T, walking = a.t < 1 || (a.path && a.path.length), step = Math.floor(now / 160) % 2;
    var bob = walking ? Math.abs(Math.sin(now / 80)) * 2.5 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(X + T / 2, Y + T - 3, T * 0.34, T * 0.13, 0, 0, 7); ctx.fill();
    var view = a.d === 'up' ? 'back' : a.d === 'down' ? 'front' : 'side', flip = a.d === 'left';
    var name = a.kind === 'me' ? 'ch-rabbit' + M.petStage() + '-' + view + (walking ? step + 1 : 1) : 'ch-' + a.id + '-' + view;
    var r = sprite(name, p.x + 0.5, p.y + 1 - bob / T, 0, flip, CH_H);
    if (!r) {   // 그 방향 그림을 아직 불러오는 중이면, 이미 불러온 다른 모습으로 그린다 (예전 상반신 그림은 쓰지 않는다)
      var alts = a.kind === 'me' ? ['ch-rabbit' + M.petStage() + '-' + view + '1', 'ch-rabbit' + M.petStage() + '-front1'] : ['ch-' + a.id + '-front', 'ch-' + a.id + '-side'];
      for (var k = 0; k < alts.length && !r; k++) r = sprite(alts[k], p.x + 0.5, p.y + 1 - bob / T, 0, flip, CH_H);
    }
    if (a.kind === 'npc' && a.say) {   // 말풍선
      var top = (r ? r.top : Y - T) - 6, cx = X + T / 2;
      ctx.font = '700 12px system-ui, sans-serif'; var tw = Math.max(ctx.measureText(a.say.t).width, ctx.measureText(a.say.k).width * 0.85) + 14;
      ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.strokeStyle = '#d9c7ae'; ctx.lineWidth = 1.5; roundRect(cx - tw / 2, top - 34, tw, 32, 10); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 5, top - 3); ctx.lineTo(cx + 5, top - 3); ctx.lineTo(cx, top + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4b3a2a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(a.say.t, cx, top - 24);
      ctx.font = '600 10px system-ui, sans-serif'; ctx.fillStyle = '#9a8a78'; ctx.fillText(a.say.k, cx, top - 11);
      return;
    }
    if (a.kind === 'npc') {
      var mq = M.miniAvail && M.miniAvail(a.id);
      if (mq) emoji('❗', X + T * 0.95, (r ? r.top : Y - T * 0.45) + 6, 15);
    }
  }

  // ---------- 채집: 오늘 놓인 물건, 곤충 ----------
  var cands = null, dailyCache = null, dailyDay = '';
  function daily() {
    if (!M.gatherDaily) return [];
    if (!cands) {
      cands = { grass: [], sand: [] };
      for (var y = 4; y < 33; y++) for (var x = 3; x < W - 3; x++) if (G[y * W + x] === 0 && !SOLID[y * W + x] && !DOORS[x + ',' + y]) cands.grass.push([x, y]);
      for (y = 36; y <= 38; y++) for (x = 1; x < W - 1; x++) if (G[y * W + x] === 3 && !SOLID[y * W + x]) cands.sand.push([x, y]);
    }
    var lk = M.luckOn && M.luckOn() ? (M.P.gather.luckSeed || 1) : 0;
    if (dailyDay !== M.today() + lk || !dailyCache) { dailyDay = M.today() + lk; dailyCache = M.gatherDaily(cands).concat(lk ? M.gatherDaily(cands, lk) : []); }
    return dailyCache;
  }
  var bugs = [], bugNext = 0;
  function bugTick(dt, now) {
    if (!M.bugNow) return;
    var luck = M.luckOn && M.luckOn();
    if (now > bugNext && bugs.length < (luck ? 3 : 2)) {
      bugNext = now + (luck ? 0.5 : 1) * (25000 + Math.random() * 35000);   // 평소 25~60초에 한 마리, 향수를 쓰면 두 배
      var where = ['flower', 'flower', 'tree', 'water'][Math.floor(Math.random() * 4)], id = M.bugNow(where);
      if (id) {
        var pool = where === 'tree' ? OBJ.filter(function (o) { return o.kind === 'tree' && o.tx > 2 && o.tx < W - 3 && o.ty > 3; }) : where === 'water' ? [{ x: 4 + Math.random() * 28, y: 34 }] : OBJ.filter(function (o) { return o.kind === 'img' && o.flat; });
        var at = pool[Math.floor(Math.random() * pool.length)];
        if (at) bugs.push({ id: id, x: at.x + (Math.random() - 0.5), y: at.y - (where === 'tree' ? 1.6 : 0.8), hx: at.x, hy: at.y - (where === 'tree' ? 1.6 : 0.8), vx: 0.4, vy: 0, ph: Math.random() * 6, life: now + 40000 + Math.random() * 40000 });
      }
    }
    bugs = bugs.filter(function (b) { return b.held || now < b.life; });
    bugs.forEach(function (b) {
      if (b.held) return;
      if (Math.random() < dt / 800) { b.vx = (Math.random() - 0.5) * 1.6; b.vy = (Math.random() - 0.5) * 1.2; }
      b.x += b.vx * dt / 1000; b.y += b.vy * dt / 1000;
      if (Math.abs(b.x - b.hx) > 2) b.vx = -Math.sign(b.x - b.hx) * Math.abs(b.vx || 0.5);
      if (Math.abs(b.y - b.hy) > 1.2) b.vy = -Math.sign(b.y - b.hy) * Math.abs(b.vy || 0.4);
    });
  }
  function gatherTap(tx, ty, wx, wy) {
    // 곤충
    var bg = bugs.filter(function (b) { return Math.abs(wx / T - b.x) < 0.7 && Math.abs(wy / T - (b.y - 0.3)) < 0.7; })[0];
    if (bg) {
      bg.held = true; var gx = Math.round(bg.x - 0.5), gy = Math.round(bg.y);
      var near = nearestWalkable(gx, gy) || [gx, gy];
      goTo(near[0], near[1], function () { bugs = bugs.filter(function (b) { return b !== bg; }); M.gatherGot(bg.id); });
      return true;
    }
    // 오늘 놓인 물건
    var dg = daily().filter(function (d) { return d.x === tx && (d.y === ty || d.y === ty + 1); })[0];
    if (dg) {
      tapMark = { x: dg.x, y: dg.y, t: performance.now() };
      goTo(dg.x, dg.y, function () { M.gatherPick(dg); dailyCache = null; if (dg.type === 'd') M.sfx('merge'); });
      return true;
    }
    // 우체통 (내 집 옆)
    if (tx === 13 && (ty === 16 || ty === 15)) { goNear(13, 16, function () { M.mailSheet(); }); return true; }
    // 떠돌이 장터
    if (M.marketToday && M.marketToday() && (tx === 21 || tx === 22) && (ty === 13 || ty === 14)) { goNear(21, 14, function () { M.marketSheet(); }); return true; }
    // 나무·열매 나무·바위
    var o = OBJ.filter(function (o) { return (o.kind === 'tree' || o.kind === 'ftree' || o.kind === 'rock') && o.tx === tx && (ty === o.ty || ty === o.ty - 1 || (o.kind !== 'rock' && ty === o.ty - 2)); })[0];
    if (o) {
      goNear(o.tx, o.ty, function () {
        me.d = o.tx > me.x ? 'right' : o.tx < me.x ? 'left' : o.ty < me.y ? 'up' : 'down';
        o.shake = performance.now();
        if (o.kind === 'ftree') M.shakeFruitTree(o.key, o.fk); else if (o.kind === 'tree') M.shakeTree(o.key, o.pine); else M.hitRock(o.key);
      });
      return true;
    }
    return false;
  }

  // ---------- 시야 옮기기: 한 손가락으로 끌거나 두 손가락으로 밀기 ----------
  var freeCam = null, camEase = false, ptrs = {}, panFrom = null, panned = 0;
  function onDown(e) { ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; panFrom = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, n: Object.keys(ptrs).length }; }
  function onMove(e) {
    if (!ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ks = Object.keys(ptrs), mx = 0, my = 0; ks.forEach(function (k) { mx += ptrs[k].x; my += ptrs[k].y; }); mx /= ks.length; my /= ks.length;
    if (!panFrom || panFrom.n !== ks.length) { panFrom = { x: mx, y: my, cx: cam.x, cy: cam.y, n: ks.length }; return; }
    var dx = mx - panFrom.x, dy = my - panFrom.y;
    if (!freeCam && Math.abs(dx) + Math.abs(dy) < 12) return;   // 조금 움직인 건 누르기로 본다
    freeCam = { x: panFrom.cx - dx, y: panFrom.cy - dy }; panned = Date.now(); e.preventDefault();
  }
  function onUp(e) { delete ptrs[e.pointerId]; panFrom = null; }

  // ---------- 누르기 ----------
  var tapMark = null;
  function onTap(e) {
    if (Date.now() - panned < 250) return;   // 시야를 옮긴 직후의 손 뗌은 누르기가 아니다
    var r = cv.getBoundingClientRect(), wx = e.clientX - r.left + cam.x, wy = e.clientY - r.top + cam.y;
    if (freeCam) { freeCam = null; camEase = true; }   // 옮긴 시야에서 누르면 토끼 쪽으로 돌아가며 걸어간다
    var tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    // 주민을 눌렀나 (그림이 칸보다 커서 조금 넉넉하게 본다)
    var hit = npcs.filter(function (n) { if (n.asleep) return false; var p = pos(n); return wx > p.x * T - 8 && wx < p.x * T + T + 8 && wy > (p.y + 1 - CH_H) * T - 4 && wy < p.y * T + T + 4; })[0];
    if (hit) { talkTo(hit); return; }
    if (gatherTap(tx, ty, wx, wy)) return;
    if (false) {
      npcs.forEach(function (n) { if (n.talking === 'wait') n.talking = false; });
      hit.talking = 'wait'; hit.path = [];
      var tgt = hit.t < 1 ? [hit.tx, hit.ty] : [hit.x, hit.y];
      goNear(tgt[0], tgt[1], function () { face(hit); M.V.resident(hit.id); setTimeout(function () { hit.talking = false; }, 1500); });
      return;
    }
    // 건물·집·게시판을 눌렀나 → 문 앞으로
    var b = BUILD.filter(function (b) { return tx >= b.x && tx < b.x + b.w && ty >= b.y - 1 && ty <= b.y + b.h; })[0];
    if (b) { goTo(b.door.x, b.door.y, function () { me.d = 'up'; M.V.enter(b.id === 'home' ? 'home' : b.id); }); return; }
    var l = LOTS.map(function (v, k) { return { x: v[0], y: v[1], k: k }; }).filter(function (v) { return tx >= v.x && tx < v.x + 3 && ty >= v.y - 1 && ty <= v.y + 3; })[0];
    if (l) {
      var c = residentAt(l.k), door = { x: l.x + 1, y: l.y + 3 };
      if (c && M.residentAsleep(c.id)) { M.toast('💤 ' + M.j(c.name, '은', '는') + ' 쿨쿨 자고 있어요. 아침 6시쯤 일어나요'); return; }
      if (c) { var out = npcs.filter(function (n) { return n.id === c.id; })[0]; if (out) { M.toast(M.j(c.name, '은', '는') + ' 밖에서 산책 중이에요. 찾아가 볼게요!'); talkTo(out); return; } goTo(door.x, door.y, function () { me.d = 'up'; M.V.resident(c.id); }); return; }
      if (l.k === M.V.residents().length && M.V.nextMover()) { var nm = M.V.nextMover(); M.modal('<div class="center"><div class="tbig">🚧</div><h3>이사 예정</h3><p>가게 레벨 <b>' + nm.lv + '</b>이 되면 <b>새로운 친구</b>의 집이 여기에 생겨요.</p><button class="btn primary wide" data-close>알겠어요</button></div>'); return; }
    }
    if (Math.abs(tx - BOARD.x) <= 0 && (ty === BOARD.y || ty === BOARD.y - 1)) { goTo(BOARD.x, BOARD.y + 1, function () { me.d = 'up'; M.V.enter('board'); }); return; }
    if ((tx === PIER.x + 1 && ty === PIER.y) || (tx === PIER.x && ty === PIER.y)) { goTo(PIER.x, PIER.y, function () { me.d = 'down'; M.fishStart('sea'); }); return; }
    // 물을 누르면 그 물가로 가서 낚시
    if (tx >= 0 && ty >= 0 && tx < W && ty < H && G[ty * W + tx] === 2) {
      var where = ty >= 39 ? 'sea' : 'river', best = null;
      [[0, -1], [0, 1], [-1, 0], [1, 0], [0, -2], [0, 2]].forEach(function (d2) {
        var sx = tx + d2[0], sy = ty + d2[1]; if (!walkable(sx, sy)) return;
        var pth = (sx === me.x && sy === me.y) ? [] : findPath(me.x, me.y, sx, sy, me); if (!pth) return;
        if (!best || pth.length < best.p.length) best = { p: pth, x: sx, y: sy };
      });
      if (!best) { M.toast('물가까지 걸어가서 눌러 주세요'); return; }
      tapMark = { x: tx, y: ty, t: performance.now() };
      goTo(best.x, best.y, function () { me.d = ty < me.y ? 'up' : ty > me.y ? 'down' : tx < me.x ? 'left' : 'right'; M.fishStart(where); });
      return;
    }
    if (!walkable(tx, ty)) { var near = nearestWalkable(tx, ty); if (!near) return; tx = near[0]; ty = near[1]; }
    tapMark = { x: tx, y: ty, t: performance.now() };
    goTo(tx, ty);
  }
  function talkTo(hit) {   // 누른 주민은 멈춰서 기다리고, 토끼가 옆으로 가서 말을 건다
    npcs.forEach(function (n) { if (n.talking === 'wait') n.talking = false; });
    hit.talking = 'wait'; hit.path = [];
    var tgt = hit.t < 1 ? [hit.tx, hit.ty] : [hit.x, hit.y];
    goNear(tgt[0], tgt[1], function () { face(hit); hit.say = null; M.V.resident(hit.id); setTimeout(function () { hit.talking = false; }, 1500); });
  }
  function nearestWalkable(x, y) {
    for (var r = 1; r < 4; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) if (walkable(x + dx, y + dy)) return [x + dx, y + dy];
    return null;
  }
  function goTo(x, y, then) {
    var start = me.t < 1 ? [me.tx, me.ty] : [me.x, me.y];
    var p = findPath(start[0], start[1], x, y, me);
    if (!p) { M.toast('거기까지는 갈 수 없어요'); return; }
    me.path = p; me.goal = [x, y]; me.onArrive = then || null;
    if (!p.length && me.t >= 1 && then) { me.onArrive = null; then(); }
  }
  function goNear(x, y, then) {
    var best = null;
    [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) {
      var nx = x + d[0], ny = y + d[1]; if (!walkable(nx, ny)) return;
      var p = (nx === me.x && ny === me.y) ? [] : findPath(me.x, me.y, nx, ny, me); if (!p) return;
      if (!best || p.length < best.p.length) best = { p: p, x: nx, y: ny };
    });
    if (!best) { M.toast('지금은 가까이 갈 수 없어요'); return; }
    goTo(best.x, best.y, then);
  }
  function face(n) { me.d = n.x > me.x ? 'right' : n.x < me.x ? 'left' : n.y > me.y ? 'down' : 'up'; n.d = { right: 'left', left: 'right', up: 'down', down: 'up' }[me.d]; }

  // ---------- 붙이기 ----------
  M.World = {
    mount: function (root) {
      build(); if (!ground) { if (!tilesReady) { loadTiles(function () { tilesReady = true; ground = null; drawGround(); }); } drawGround(); }
      var w = Wst();
      if (!me) { me = mkActor(w.x, w.y, 'me'); me.d = w.d || 'down'; if (!walkable(me.x, me.y)) { me.x = me.px = me.tx = 17; me.y = me.py = me.ty = 22; } }
      syncNpcs();
      // 캐릭터 그림을 미리 불러 둔다 (걷는 방향이 바뀔 때 깜빡이지 않게)
      ['front', 'back', 'side'].forEach(function (v) { [1, 2].forEach(function (k) { img(WI + 'ch-rabbit' + M.petStage() + '-' + v + k + '.png'); }); npcs.forEach(function (n) { img(WI + 'ch-' + n.id + '-' + v + '.png'); }); });
      var rs = M.V.residents(), nm = M.V.nextMover();
      root.innerHTML = '<div class="village world"><div class="vbar"><b>🏡 ' + M.esc(M.P.petName) + '네 마을</b><small>주민 ' + rs.length + '명</small><button class="vbag" id="vBag">🧺 가방</button><button class="helpbtn" id="vHelp" aria-label="도움말">?</button></div><canvas id="wCanvas" class="wcanvas"></canvas></div>';
      cv = $('wCanvas'); ctx = cv.getContext('2d');
      var fit = function () { var dpr = Math.min(3, window.devicePixelRatio || 1), r = cv.getBoundingClientRect(); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); };
      fit(); window.removeEventListener('resize', M.World._fit); M.World._fit = fit; window.addEventListener('resize', fit);
      cv.addEventListener('click', onTap);
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove, { passive: false });
      cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('pointerleave', onUp);
      freeCam = null;
      mounted = root; lastT = 0;
      if (!raf) raf = requestAnimationFrame(draw);
      if (M.moveInCheck) M.moveInCheck();
    },
    // 자동 점검용
    state: function () { return { me: me && { x: me.x, y: me.y, moving: me.t < 1 || me.path.length > 0 }, npcs: npcs.map(function (n) { return { id: n.id, x: n.x, y: n.y }; }) }; },
    tapTile: function (x, y) { onTap({ clientX: cv.getBoundingClientRect().left + x * T - cam.x + T / 2, clientY: cv.getBoundingClientRect().top + y * T - cam.y + T / 2 }); },
    objs: function () { return { ftree: OBJ.filter(function (o) { return o.kind === 'ftree'; }).map(function (o) { return [o.tx, o.ty, o.fk]; }), rock: OBJ.filter(function (o) { return o.kind === 'rock'; }).slice(0, 3).map(function (o) { return [o.tx, o.ty]; }), tree: OBJ.filter(function (o) { return o.kind === 'tree' && o.tx > 2 && o.tx < W - 3 && o.ty > 3; }).slice(0, 3).map(function (o) { return [o.tx, o.ty]; }), daily: daily().map(function (d) { return [d.x, d.y, d.type, d.id]; }), bugs: bugs.length }; },
    teleport: function (x, y) { me.x = me.px = me.tx = x; me.y = me.py = me.ty = y; me.path = []; },
    reach: function (gx, gy) { var p = findPath(me.x, me.y, gx, gy); return p ? p.length : -1; },
    lots: function () { return LOTS; },
    doorOf: function (id) { var b = BUILD.filter(function (b) { return b.id === id; })[0]; return b && b.door; },
    T: T
  };
})();
