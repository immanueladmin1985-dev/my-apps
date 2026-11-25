// 위에서 내려다보는 칸(타일) 마을 (말씨정원).
// 누른 칸까지 길을 찾아 걸어간다(터치로만 움직인다). 주민이나 건물 문을 누르면 그 앞까지 가서 말을 걸거나 들어간다.
// 바닥(풀·길·물·모래·돌바닥)은 이음매가 없도록 코드로 그린다. 나무·건물·캐릭터는 그림이 오면 IMG 에 넣는다.
(function () {
  var M = window.M, $ = M.$;
  var T = 32, W = 36, H = 48;   // 칸 크기(화면 px), 지도 가로·세로 칸 수
  var STEP = 170;               // 한 칸 걷는 시간(ms)
  // 그림이 오면 켠다. 예: tree: 'img/w-tree.png', house_bear: 'img/w-house-bear.png', ch_rabbit: 'img/ch-rabbit.png'(앞·뒤·옆 세 칸)
  var IMG = {};

  // ---------- 지도 만들기 ----------
  // 바닥: 0 풀, 1 길, 2 물, 3 모래, 4 다리, 5 돌바닥(광장)
  var G = [], SOLID = [], OBJ = [], DOORS = {}, built = false;
  var BUILD = [
    { id: 'museum', name: '박물관', x: 4, y: 4, w: 5, h: 4, color: '#c9d6e8', roof: '#7d8fb3', em: '🏛️' },
    { id: 'shop', name: '정원 가게', x: 23, y: 4, w: 6, h: 4, color: '#ffe3ea', roof: '#ff8fab', em: '🏪' },
    { id: 'gift', name: '선물 교환소', x: 5, y: 13, w: 4, h: 3, color: '#fff3c9', roof: '#ffb02e', em: '🎁' },
    { id: 'home', name: '내 집', x: 10, y: 13, w: 4, h: 3, color: '#fff', roof: '#e07a5f', em: '🐰' },
    { id: 'store', name: '잡화점', x: 26, y: 13, w: 5, h: 4, color: '#e9f7e4', roof: '#6cbf7a', em: '🛍️' }
  ];
  var LOTS = [[3, 23], [7, 23], [11, 23], [21, 23], [25, 23], [29, 23], [3, 29], [7, 29], [11, 29], [21, 29], [25, 29], [29, 29]];
  var HOUSE_COL = { bear: '#d9a066', squirrel: '#c98b5a', chick: '#ffe08a', hedgehog: '#e8b4a0', panda: '#e8e8e8', fox: '#f4a261', koala: '#b8c4d6', hamster: '#f6d6a8', penguin: '#cfe9f7', cat: '#f3d9b1', sheep: '#fbf7ef', owl: '#b5926a' };
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
    // 게시판·선착장
    solid(BOARD.x, BOARD.y); OBJ.push({ kind: 'board', x: BOARD.x, y: BOARD.y + 1 }); DOORS[BOARD.x + ',' + (BOARD.y + 1)] = { type: 'place', id: 'board' };
    DOORS[PIER.x + ',' + PIER.y] = { type: 'place', id: 'pier' }; OBJ.push({ kind: 'pierSign', x: PIER.x + 1, y: PIER.y });
    solid(PIER.x + 1, PIER.y);
    // 숲 테두리와 흩어진 나무·꽃
    var r = rnd(7);
    for (y = 0; y < 34; y++) for (x = 0; x < W; x++) {
      var edge = y < 3 || x < 2 || x > W - 3;
      if (G[y * W + x] !== 0 || SOLID[y * W + x]) continue;
      var nearPath = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var v = G[(y + d[1]) * W + x + d[0]]; return v === 1 || v === 5; });
      if (edge ? r() < 0.85 : (!nearPath && r() < 0.08)) { solid(x, y); OBJ.push({ kind: 'tree', x: x, y: y + 1, v: Math.floor(r() * 3) }); }
      else if (r() < 0.09) OBJ.push({ kind: 'flower', x: x, y: y + 1, v: Math.floor(r() * 3) });
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
  function drawGround() {
    var sc = Math.min(2, window.devicePixelRatio || 1); groundScale = sc;
    var c = document.createElement('canvas'); c.width = W * T * sc; c.height = H * T * sc;
    var g = c.getContext('2d'); g.scale(sc, sc);
    var r = rnd(11), x, y;
    var col = { 0: '#a7dc8a', 1: '#ead1a0', 2: '#79c4ea', 3: '#f4e3b5', 4: '#79c4ea', 5: '#e4dccd' };
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var v = G[y * W + x];
      g.fillStyle = v === 1 || v === 5 ? col[0] : col[v]; g.fillRect(x * T, y * T, T, T);
      if (v === 0 || v === 1 || v === 5) for (var k = 0; k < 3; k++) { g.fillStyle = r() < 0.5 ? '#98d27b' : '#b6e49b'; g.fillRect(x * T + r() * 28, y * T + r() * 28, 3, 2); }
      if (v === 2 && r() < 0.25) { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); var wx = x * T + 6 + r() * 14, wy = y * T + 10 + r() * 14; g.moveTo(wx, wy); g.quadraticCurveTo(wx + 5, wy - 4, wx + 10, wy); g.stroke(); }
    }
    // 길·광장: 이웃이 같으면 이어서, 가장자리는 둥글게
    function blob(type, fill, edge, inset) {
      [0, 1].forEach(function (pass) {   // 테두리를 먼저 다 그리고, 안쪽을 나중에 칠해서 칸 사이 줄이 안 보이게
        for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
          if (!same(x, y)) continue;
          var l = same(x - 1, y), rr = same(x + 1, y), u = same(x, y - 1), d = same(x, y + 1);
          var x0 = x * T + (l ? 0 : inset), x1 = x * T + T - (rr ? 0 : inset), y0 = y * T + (u ? 0 : inset), y1 = y * T + T - (d ? 0 : inset);
          if (!pass) { g.fillStyle = edge; rect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, l, rr, u, d); }
          else { g.fillStyle = fill; rect(x0 - (l ? 1 : 0), y0 - (u ? 1 : 0), x1 - x0 + (l ? 1 : 0) + (rr ? 1 : 0), y1 - y0 + (u ? 1 : 0) + (d ? 1 : 0), l, rr, u, d); }
        }
      });
      function same(a, b) { if (a < 0 || b < 0 || a >= W || b >= H) return false; var t = G[b * W + a]; return type.indexOf(t) >= 0; }
    }
    function rect(x0, y0, w, h, l, rr, u, d) {
      var rad = 7; g.beginPath();
      g.moveTo(x0 + (u || l ? 0 : rad), y0); g.lineTo(x0 + w - (u || rr ? 0 : rad), y0);
      g.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + (u || rr ? 0 : rad)); g.lineTo(x0 + w, y0 + h - (d || rr ? 0 : rad));
      g.quadraticCurveTo(x0 + w, y0 + h, x0 + w - (d || rr ? 0 : rad), y0 + h); g.lineTo(x0 + (d || l ? 0 : rad), y0 + h);
      g.quadraticCurveTo(x0, y0 + h, x0, y0 + h - (d || l ? 0 : rad)); g.lineTo(x0, y0 + (u || l ? 0 : rad));
      g.quadraticCurveTo(x0, y0, x0 + (u || l ? 0 : rad), y0); g.fill();
    }
    blob([1, 4], '#ead1a0', '#d6b77f', 3);
    blob([5], '#e4dccd', '#cbbfa9', 2);
    for (y = 13; y <= 19; y++) for (x = 13; x <= 22; x++) { g.strokeStyle = 'rgba(160,145,120,.13)'; g.strokeRect(x * T + 2, y * T + 2, T - 4, T - 4); }
    // 물가: 풀과 만나는 곳에 밝은 테두리
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (G[y * W + x] !== 2) continue;
      [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
        var nx = x + d[0], ny = y + d[1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) return; var t = G[ny * W + nx];
        if (t === 2 || t === 4) return;
        g.fillStyle = t === 3 ? '#fff6d8' : '#e9f6ff';
        if (d[1] === -1) g.fillRect(x * T, y * T, T, 4); if (d[1] === 1) g.fillRect(x * T, y * T + T - 4, T, 4);
        if (d[0] === -1) g.fillRect(x * T, y * T, 4, T); if (d[0] === 1) g.fillRect(x * T + T - 4, y * T, 4, T);
      });
    }
    // 다리 판자
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (G[y * W + x] === 4) {
      g.fillStyle = '#c99a5b'; g.fillRect(x * T, y * T, T, T);
      g.strokeStyle = '#9c6f3a'; g.lineWidth = 2; for (var p = 0; p < 4; p++) { g.beginPath(); g.moveTo(x * T, y * T + p * 8 + 1); g.lineTo(x * T + T, y * T + p * 8 + 1); g.stroke(); }
    }
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
      var l = LOTS[k], n = mkActor(l[0] + 1, l[1] + 4, 'npc', c.id); n.home = { x: n.x, y: n.y }; n.wait = 500 + Math.random() * 2000; npcs.push(n);
    });
  }
  function occupied(x, y, self) {
    if (me && me !== self && ((me.x === x && me.y === y) || (me.tx === x && me.ty === y))) return true;
    return npcs.some(function (n) { return n !== self && ((n.x === x && n.y === y) || (n.tx === x && n.ty === y)); });
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
      a.t = Math.min(1, a.t + dt / STEP);
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
  function npcThink(n, dt) {
    if (n.t < 1 || n.path.length || n.talking) return;
    n.wait -= dt; if (n.wait > 0) return;
    n.wait = 1200 + Math.random() * 2800;
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
    cam.x = Math.max(0, Math.min(W * T - vw, (mp.x + 0.5) * T - vw / 2));
    cam.y = Math.max(0, Math.min(H * T - vh, (mp.y + 0.5) * T - vh / 2));
    var sc = cv.width / vw;
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    ctx.drawImage(ground, cam.x * groundScale, cam.y * groundScale, vw * groundScale, vh * groundScale, 0, 0, vw, vh);
    ctx.translate(-cam.x, -cam.y);
    // 물체와 캐릭터를 아래쪽(y)이 큰 순서로 그려 앞뒤를 맞춘다
    var list = OBJ.filter(function (o) { var oy = o.y * T; return oy > cam.y - 40 && oy < cam.y + vh + 200; }).map(function (o) { return { y: o.y, o: o }; });
    [me].concat(npcs).forEach(function (a) { var p = pos(a); list.push({ y: p.y + 1, a: a, p: p }); });
    list.sort(function (A, B) { return A.y - B.y; });
    list.forEach(function (it) { if (it.o) drawObj(it.o); else drawActor(it.a, it.p, now); });
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
  function drawObj(o) {
    var X, Y, im;
    if (o.kind === 'tree') {
      X = o.x * T; Y = (o.y - 1) * T; im = img(IMG['tree' + o.v] || IMG.tree);
      if (im) { ctx.drawImage(im, X - T * 0.35, Y - T * 1.1, T * 1.7, T * 2.1); return; }
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(X + T / 2, Y + T - 3, T * 0.42, T * 0.18, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(X + T * 0.4, Y + T * 0.35, T * 0.2, T * 0.6);
      ctx.fillStyle = ['#5fae55', '#4f9e4a', '#ff9fc0'][o.v]; ctx.strokeStyle = '#3c6e2f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X + T / 2, Y + T * 0.1, T * 0.55, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(X + T * 0.35, Y - T * 0.05, T * 0.18, 0, 7); ctx.fill();
    } else if (o.kind === 'flower') {
      emoji(['🌼', '🌸', '🌷'][o.v], o.x * T + T / 2, (o.y - 1) * T + T / 2, 14);
    } else if (o.kind === 'shell') {
      emoji('🐚', o.x * T + T / 2, (o.y - 1) * T + T / 2, 13);
    } else if (o.kind === 'build') {
      var b = o.b; im = img(IMG['b_' + b.id]);
      if (im) ctx.drawImage(im, b.x * T - 6, b.y * T - T, b.w * T + 12, b.h * T + T);
      else { house(b.x, b.y, b.w, b.h, b.color, b.roof); emoji(b.em, (b.x + b.w / 2) * T, (b.y + b.h * 0.62) * T, 22); }
      label(b.name, (b.x + b.w / 2) * T, b.y * T - 8);
      if ((b.id === 'shop' && M.gardenOrderReady && M.gardenOrderReady())) emoji('📦', (b.x + b.w) * T, b.y * T, 18);
    } else if (o.kind === 'lot') {
      var l = o.lot, c = residentAt(l.k);
      if (c) {
        im = img(IMG['house_' + c.id]);
        if (im) ctx.drawImage(im, l.x * T - 6, l.y * T - T, 3 * T + 12, 4 * T);
        else house(l.x, l.y, 3, 3, HOUSE_COL[c.id] || '#fff', '#c46b6b');
        label(c.name + (M.V.hearts(c.id) ? ' ♥' + M.V.hearts(c.id) : ''), (l.x + 1.5) * T, l.y * T - 8);
      } else if (l.k === M.V.residents().length && M.V.nextMover()) {
        ctx.strokeStyle = '#b98a52'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeRect(l.x * T + 4, l.y * T + 4, 3 * T - 8, 3 * T - 8); ctx.setLineDash([]);
        emoji('🚧', (l.x + 1.5) * T, (l.y + 1.5) * T, 22); label('이사 예정', (l.x + 1.5) * T, l.y * T + 2);
      }
    } else if (o.kind === 'board') {
      X = o.x * T; Y = (o.y - 1) * T;
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(X + 6, Y + 12, 4, 20); ctx.fillRect(X + T - 10, Y + 12, 4, 20);
      ctx.fillStyle = '#c99a5b'; ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; roundRect(X - 4, Y - 8, T + 8, 24, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(X + 2, Y - 4, 10, 12); ctx.fillRect(X + 16, Y - 3, 10, 10);
      label('게시판', X + T / 2, Y - 18); if (M.V.boardNews()) emoji('❗', X + T + 4, Y - 10, 16);
    } else if (o.kind === 'pierSign') {
      emoji('🎣', o.x * T + T / 2, (o.y - 1) * T + T / 2, 20); label('낚시터', o.x * T + T / 2, (o.y - 1) * T - 6);
    }
  }
  function drawActor(a, p, now) {
    var X = p.x * T, Y = p.y * T, walking = a.t < 1, bob = walking ? Math.abs(Math.sin(now / 70)) * 4 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(X + T / 2, Y + T - 3, T * 0.34, T * 0.13, 0, 0, 7); ctx.fill();
    var key = a.kind === 'me' ? 'ch_rabbit' : 'ch_' + a.id, sheet = img(IMG[key]);
    var size = T * 1.45, dx = X + T / 2 - size / 2, dy = Y + T - size - bob + 2;
    ctx.save();
    if (sheet) {   // 앞·뒤·왼쪽 세 칸짜리 그림
      var fw = sheet.naturalWidth / 3, col = a.d === 'up' ? 1 : a.d === 'down' ? 0 : 2;
      if (a.d === 'right') { ctx.translate(dx + size, 0); ctx.scale(-1, 1); dx = 0; }
      ctx.drawImage(sheet, fw * col, 0, fw, sheet.naturalHeight, dx, dy, size, size * sheet.naturalHeight / fw);
    } else {
      var src = a.kind === 'me' ? M.petImg('normal') : M.custImg(a.id), im = img(src);
      if (a.d === 'left' && a.kind === 'me' || a.d === 'right' && a.kind !== 'me') { ctx.translate(dx + size, 0); ctx.scale(-1, 1); dx = 0; }
      if (im) ctx.drawImage(im, dx, dy, size, size);
    }
    ctx.restore();
    if (a.kind === 'npc') {
      var mq = M.miniAvail && M.miniAvail(a.id);
      if (mq) emoji('❗', X + T * 0.95, Y - T * 0.45, 15);
    }
  }

  // ---------- 누르기 ----------
  var tapMark = null;
  function onTap(e) {
    var r = cv.getBoundingClientRect(), wx = e.clientX - r.left + cam.x, wy = e.clientY - r.top + cam.y;
    var tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    // 주민을 눌렀나 (그림이 칸보다 커서 조금 넉넉하게 본다)
    var hit = npcs.filter(function (n) { var p = pos(n); return wx > p.x * T - 4 && wx < p.x * T + T + 4 && wy > p.y * T - T * 0.6 && wy < p.y * T + T; })[0];
    if (hit) {   // 누른 주민은 멈춰서 기다린다
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
      if (c) { goTo(door.x, door.y, function () { me.d = 'up'; M.V.resident(c.id); }); return; }
      if (l.k === M.V.residents().length && M.V.nextMover()) { var nm = M.V.nextMover(); M.modal('<div class="center"><div class="tbig">🚧</div><h3>이사 예정</h3><p>가게 레벨 <b>' + nm.lv + '</b>이 되면 <b>' + M.esc(nm.name) + '</b>의 집이 여기에 생겨요.</p><button class="btn primary wide" data-close>알겠어요</button></div>'); return; }
    }
    if (Math.abs(tx - BOARD.x) <= 0 && (ty === BOARD.y || ty === BOARD.y - 1)) { goTo(BOARD.x, BOARD.y + 1, function () { me.d = 'up'; M.V.enter('board'); }); return; }
    if ((tx === PIER.x + 1 && ty === PIER.y) || (tx === PIER.x && ty === PIER.y)) { goTo(PIER.x, PIER.y, function () { M.V.enter('pier'); }); return; }
    if (!walkable(tx, ty)) { var near = nearestWalkable(tx, ty); if (!near) return; tx = near[0]; ty = near[1]; }
    tapMark = { x: tx, y: ty, t: performance.now() };
    goTo(tx, ty);
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
      build(); if (!ground) drawGround();
      var w = Wst();
      if (!me) { me = mkActor(w.x, w.y, 'me'); me.d = w.d || 'down'; if (!walkable(me.x, me.y)) { me.x = me.px = me.tx = 17; me.y = me.py = me.ty = 22; } }
      syncNpcs();
      var rs = M.V.residents(), nm = M.V.nextMover();
      root.innerHTML = '<div class="village world"><div class="vbar"><b>🏡 ' + M.esc(M.P.petName) + '네 마을</b><small>주민 ' + rs.length + '명' + (nm ? ' · Lv.' + nm.lv + '에 ' + M.esc(nm.name) + ' 이사' : '') + '</small><button class="helpbtn" id="vHelp" aria-label="도움말">?</button></div><canvas id="wCanvas" class="wcanvas"></canvas></div>';
      cv = $('wCanvas'); ctx = cv.getContext('2d');
      var fit = function () { var dpr = Math.min(3, window.devicePixelRatio || 1), r = cv.getBoundingClientRect(); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); };
      fit(); window.removeEventListener('resize', M.World._fit); M.World._fit = fit; window.addEventListener('resize', fit);
      cv.addEventListener('pointerup', onTap);
      mounted = root; lastT = 0;
      if (!raf) raf = requestAnimationFrame(draw);
    },
    // 자동 점검용
    state: function () { return { me: me && { x: me.x, y: me.y, moving: me.t < 1 || me.path.length > 0 }, npcs: npcs.map(function (n) { return { id: n.id, x: n.x, y: n.y }; }) }; },
    tapTile: function (x, y) { onTap({ clientX: cv.getBoundingClientRect().left + x * T - cam.x + T / 2, clientY: cv.getBoundingClientRect().top + y * T - cam.y + T / 2 }); },
    doorOf: function (id) { var b = BUILD.filter(function (b) { return b.id === id; })[0]; return b && b.door; },
    T: T
  };
})();
