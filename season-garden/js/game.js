/* 사계절 정원: 게임 규칙 (화면과 분리된 순수 로직, Node 에서도 돌아감) */
(function (root) {
  'use strict';

  var SEASON_LEN = 12;                       // 한 계절에 놓는 횟수
  var SEASONS = ['봄', '여름', '가을', '겨울'];

  // 타일 종류: 같은 것 3개 이상이 이어지면 다음 단계로 합쳐짐 (next 가 'gone' 이면 사라지며 점수)
  var TILES = {
    p1: { name: '새싹', emoji: '🌱', val: 5, next: 'p2', tier: 1, desc: '정원의 시작이에요.' },
    p2: { name: '풀잎', emoji: '🌿', val: 20, next: 'p3', tier: 2, desc: '새싹 셋이 모이면 풀잎이 돼요.' },
    p3: { name: '클로버', emoji: '🍀', val: 60, next: 'p4', tier: 3, desc: '행운의 네잎클로버.' },
    p4: { name: '들꽃', emoji: '🌼', val: 180, next: 'p5', tier: 4, desc: '정원에 첫 꽃이 피었어요.' },
    p5: { name: '튤립', emoji: '🌷', val: 500, next: 'p6', tier: 5, desc: '가을 수확 때 점수를 줘요.' },
    p6: { name: '해바라기', emoji: '🌻', val: 1500, next: 'p7', tier: 6, desc: '처음 피울 때마다 정원 장갑을 하나 받아요.' },
    p7: { name: '큰 나무', emoji: '🌳', val: 4500, next: 'p8', tier: 7, desc: '처음 키울 때마다 되돌리기를 하나 받아요.' },
    p8: { name: '무지개', emoji: '🌈', val: 15000, next: 'gone', tier: 8, desc: '셋이 모이면 하늘로 올라가며 큰 점수를 줘요.' },
    s1: { name: '돌', emoji: '', val: 0, next: 's2', tier: 1, desc: '자리를 차지해요. 셋을 모으면 보석이 돼요.' },
    s2: { name: '보석', emoji: '💎', val: 400, next: 'gone', tier: 2, desc: '돌 셋이 모여 보석이 돼요. 보석 셋이 모이면 왕관이 되어 날아가며 큰 점수를 줘요.' },
    w1: { name: '눈송이', emoji: '❄️', val: 10, next: 'w2', tier: 1, desc: '겨울에 내려요. 봄이 오면 녹아 없어져요.' },
    w2: { name: '눈사람', emoji: '⛄', val: 150, next: 'gone', tier: 2, desc: '눈송이 셋으로 만들어요. 봄에 녹으면 점수를 줘요.' },
    f: { name: '요정 씨앗', emoji: '✨', val: 0, next: null, tier: 0, desc: '놓는 자리에서 가장 좋게 합쳐지는 타일로 바뀌어요.' }
  };
  var GONE_VAL = { p8: 50000, s2: 3000, w2: 600 }; // 맨 끝 단계가 셋 모여 사라질 때 점수
  var ORDER = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 's1', 's2', 'w1', 'w2', 'f'];

  var MODES = {
    classic: { name: '기본 정원', size: 6, desc: '6×6 정원. 사계절을 몇 해나 버틸 수 있을까요?' },
    daily: { name: '오늘의 정원', size: 6, desc: '오늘 날짜로 정해진 같은 순서의 타일이 나와요.' },
    relax: { name: '느긋한 정원', size: 6, desc: '눈이 내리지 않고, 되돌리기와 힌트를 마음껏 써요.' },
    small: { name: '작은 정원', size: 5, desc: '5×5 정원. 자리가 좁아 더 깊이 생각해야 해요.' },
    wide: { name: '넓은 정원', size: 7, desc: '7×7 정원. 크게 키우는 재미가 있어요.' }
  };

  // ---------- 난수 (저장·되돌리기·오늘의 정원을 위해 상태를 숫자 하나로 둠) ----------
  function rnd(st) {
    var t = (st.rng = (st.rng + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  function seasonOf(turn) { return Math.floor(turn / SEASON_LEN) % 4; }
  function yearOf(turn) { return Math.floor(turn / (SEASON_LEN * 4)) + 1; }

  // 계절과 해에 따라 나오는 타일 비율이 바뀜
  function weights(st) {
    var s = seasonOf(st.turn), y = yearOf(st.turn) - 1;
    var w = { p1: 68, p2: 18, p3: 3, s1: 5, f: 4, w1: 0 };
    if (s === 0) { w.p1 = 70; w.p2 = 20; w.s1 = 3; w.f = 5; }
    if (s === 1) { w.s1 = 7; }
    if (s === 2) { w.s1 = 7; w.p3 = 4; }
    if (s === 3 && !st.noSnow) { w.p1 = 50; w.p2 = 14; w.w1 = 24 + Math.min(10, y * 3); w.f = 3; }
    w.s1 += Math.min(8, y * 2);
    w.f = Math.max(1, w.f - Math.floor(y / 2));
    return w;
  }
  function draw(st) {
    var w = weights(st), tot = 0, k;
    for (k in w) tot += w[k];
    var r = rnd(st) * tot;
    for (k in w) { r -= w[k]; if (r < 0) return k; }
    return 'p1';
  }

  function newGame(mode, opt) {
    opt = opt || {};
    var m = MODES[mode] || MODES.classic;
    var seed = opt.seed != null ? opt.seed >>> 0 : (Math.floor(Math.random() * 4294967296) >>> 0);
    var st = {
      v: 1, mode: mode, size: m.size, rng: seed, seed: seed, date: opt.date || null,
      board: [], cur: null, next: null, basket: null, turn: 0, score: 0,
      items: { glove: 1 + (opt.bonusGlove || 0), undo: 1 + (opt.bonusUndo || 0), hint: 3 },
      unlimited: mode === 'relax', noSnow: mode === 'relax',
      stats: { merges: 0, maxChain: 0, maxGroup: 0, made: {}, harvestBest: 0, best: 'p1' },
      over: false, startedAt: Date.now()
    };
    if (st.unlimited) { st.items.undo = 99; st.items.hint = 99; }
    var n = m.size * m.size, i;
    for (i = 0; i < n; i++) st.board.push(null);
    // 처음 정원: 몇 칸에 새싹·풀잎·돌을 미리 둠 (바로 합쳐지지 않게)
    var pre = Math.round(n * 0.16), tries = 0;
    while (pre > 0 && tries++ < 500) {
      var c = Math.floor(rnd(st) * n);
      if (st.board[c]) continue;
      var r = rnd(st), k = r < 0.55 ? 'p1' : r < 0.85 ? 'p2' : 's1';
      st.board[c] = k;
      if (group(st, c).length >= 3) { st.board[c] = null; continue; }
      pre--;
    }
    st.cur = draw(st); st.next = draw(st);
    return st;
  }

  function neighbors(size, c) {
    var x = c % size, y = (c - x) / size, out = [];
    if (x > 0) out.push(c - 1);
    if (x < size - 1) out.push(c + 1);
    if (y > 0) out.push(c - size);
    if (y < size - 1) out.push(c + size);
    return out;
  }
  function group(st, c) {
    var k = st.board[c]; if (!k) return [];
    var seen = {}, stack = [c], out = [];
    seen[c] = 1;
    while (stack.length) {
      var a = stack.pop(); out.push(a);
      var nb = neighbors(st.size, a);
      for (var i = 0; i < nb.length; i++) {
        var b = nb[i];
        if (!seen[b] && st.board[b] === k) { seen[b] = 1; stack.push(b); }
      }
    }
    return out;
  }
  function empties(st) { var o = []; for (var i = 0; i < st.board.length; i++) if (!st.board[i]) o.push(i); return o; }

  // 칸 c 에 kind 를 놓고 합치기를 끝까지 진행 (st.board 를 바꿈). 단계별 기록을 돌려줌
  function resolve(st, c, kind) {
    st.board[c] = kind;
    var steps = [], chain = 0, gained = 0;
    for (;;) {
      var k = st.board[c], g = group(st, c);
      if (g.length < 3 || !TILES[k].next) break;
      chain++;
      var nk = TILES[k].next;
      var base = nk === 'gone' ? (GONE_VAL[k] || 0) : TILES[nk].val;
      var pts = Math.round(base * (1 + (g.length - 3) * 0.5) * (1 + (chain - 1) * 0.5));
      for (var i = 0; i < g.length; i++) if (g[i] !== c) st.board[g[i]] = null;
      st.board[c] = nk === 'gone' ? null : nk;
      steps.push({ at: c, from: g.filter(function (x) { return x !== c; }), kind: k, to: nk, size: g.length, chain: chain, pts: pts });
      gained += pts;
      if (nk === 'gone') break;
    }
    return { steps: steps, gained: gained, chain: chain };
  }

  function cloneBoard(st) { return { size: st.size, board: st.board.slice() }; }

  // 요정 씨앗: 이 칸에서 가장 많은 점수를 내는 종류로 바뀜. 합쳐지는 게 없으면 새싹
  function fairyKind(st, c) {
    var nb = neighbors(st.size, c), cand = {}, best = 'p1', bestPts = 0, bestTier = -1;
    for (var i = 0; i < nb.length; i++) { var k = st.board[nb[i]]; if (k && TILES[k].next) cand[k] = 1; }
    for (var k2 in cand) {
      var sim = cloneBoard(st), r = resolve(sim, c, k2);
      if (!r.steps.length) continue;
      var top = r.steps[r.steps.length - 1];
      var tier = top.to === 'gone' ? 99 : TILES[top.to].tier + (top.to[0] === 'p' ? 10 : 0);
      if (r.gained > bestPts || (r.gained === bestPts && tier > bestTier)) { best = k2; bestPts = r.gained; bestTier = tier; }
    }
    return best;
  }

  function snapshot(st) {
    return JSON.stringify({ board: st.board, cur: st.cur, next: st.next, basket: st.basket, turn: st.turn, score: st.score, rng: st.rng, items: st.items, stats: st.stats });
  }
  function pushUndo(st) {
    st.hist = st.hist || [];
    st.hist.push(snapshot(st));
    var max = st.unlimited ? 40 : 5;
    if (st.hist.length > max) st.hist.shift();
  }

  // 놓기. 결과: { ok, steps, gained, events, earned, full }
  function place(st, c) {
    if (st.over || st.board[c] || c < 0 || c >= st.board.length) return { ok: false };
    pushUndo(st);
    var kind = st.cur;
    if (kind === 'f') kind = fairyKind(st, c);
    var r = resolve(st, c, kind);
    var earned = [];
    st.score += r.gained;
    for (var i = 0; i < r.steps.length; i++) {
      var s = r.steps[i];
      st.stats.merges++;
      if (s.to !== 'gone') {
        st.stats.made[s.to] = (st.stats.made[s.to] || 0) + 1;
        if (s.to[0] === 'p' && TILES[s.to].tier > TILES[st.stats.best].tier) st.stats.best = s.to;
        if (s.to === 'p6' && st.items.glove < 5) { st.items.glove++; earned.push('glove'); }
        if (s.to === 'p7' && !st.unlimited && st.items.undo < 5) { st.items.undo++; earned.push('undo'); }
      } else {
        st.stats.made['x' + s.kind] = (st.stats.made['x' + s.kind] || 0) + 1;
      }
      if (s.size > st.stats.maxGroup) st.stats.maxGroup = s.size;
    }
    if (r.chain > st.stats.maxChain) st.stats.maxChain = r.chain;
    st.turn++;
    var events = seasonTurn(st);
    st.cur = st.next; st.next = draw(st);
    var full = empties(st).length === 0;
    return { ok: true, placed: kind, fairy: st.cur === kind ? null : kind, steps: r.steps, gained: r.gained, chain: r.chain, events: events, earned: earned, full: full };
  }

  // 계절이 바뀔 때 일어나는 일
  function seasonTurn(st) {
    if (st.turn % SEASON_LEN !== 0) return [];
    var s = seasonOf(st.turn), ev = [];
    if (s === 3) {   // 가을이 끝나고 겨울로: 수확
      var pts = 0, cells = [];
      for (var i = 0; i < st.board.length; i++) {
        var k = st.board[i];
        if (k && k[0] === 'p' && TILES[k].tier >= 5) { var p = Math.round(TILES[k].val * 0.4); pts += p; cells.push({ at: i, pts: p }); }
      }
      st.score += pts;
      if (pts > st.stats.harvestBest) st.stats.harvestBest = pts;
      ev.push({ type: 'harvest', pts: pts, cells: cells });
    }
    if (s === 0) {   // 겨울이 끝나고 봄으로: 눈이 녹음
      var mp = 0, mc = [];
      for (var j = 0; j < st.board.length; j++) {
        var k2 = st.board[j];
        if (k2 === 'w1' || k2 === 'w2') { var q = k2 === 'w1' ? 10 : 150; mp += q; mc.push({ at: j, pts: q }); st.board[j] = null; }
      }
      st.score += mp;
      ev.push({ type: 'melt', pts: mp, cells: mc });
      if (st.turn > 0) ev.push({ type: 'year', year: yearOf(st.turn) });
    }
    ev.push({ type: 'season', season: s });
    return ev;
  }

  function swapBasket(st) {
    if (st.over) return false;
    pushUndo(st);
    if (st.basket == null) { st.basket = st.cur; st.cur = st.next; st.next = draw(st); }
    else { var t = st.basket; st.basket = st.cur; st.cur = t; }
    return true;
  }

  function useGlove(st, c) {
    if (st.over || !st.board[c] || st.items.glove <= 0) return false;
    pushUndo(st);
    st.board[c] = null; st.items.glove--;
    return true;
  }

  function undo(st) {
    if (!st.hist || !st.hist.length || st.items.undo <= 0) return false;
    var left = st.items.undo - 1, hint = st.items.hint;
    var s = JSON.parse(st.hist.pop());
    for (var k in s) st[k] = s[k];
    st.items.undo = st.unlimited ? 99 : left;
    st.items.hint = hint;
    st.over = false;
    return true;
  }

  // ---------- 힌트·컴퓨터: 한 수 앞을 보는 욕심쟁이 ----------
  function evalBoard(st) {
    var v = 0, n = st.board.length, emp = 0;
    for (var i = 0; i < n; i++) {
      var k = st.board[i];
      if (!k) { emp++; continue; }
      var nb = neighbors(st.size, i);
      for (var j = 0; j < nb.length; j++) {
        if (nb[j] > i && st.board[nb[j]] === k && TILES[k].next) v += Math.max(4, TILES[k].val * 0.35);
      }
      // 겨울이 아닐 때 눈은 곧 녹으니 덜 나쁨
      if (k === 's1') v -= 6;
    }
    var fill = 1 - emp / n;
    v += emp * 12 - (fill > 0.75 ? (fill - 0.75) * 400 : 0);
    return v;
  }
  function scoreMove(st, c, kind) {
    var sim = { size: st.size, board: st.board.slice() };
    if (kind === 'f') kind = fairyKind(sim, c);
    var r = resolve(sim, c, kind);
    // 놓은 자리가 같은 종류 옆이면 다음 합치기 준비가 됨
    return r.gained + evalBoard(sim);
  }
  function bestMove(st) {
    var em = empties(st), best = null;
    var options = [{ swap: false, kind: st.cur }];
    if (st.basket != null && st.basket !== st.cur) options.push({ swap: true, kind: st.basket });
    else if (st.basket == null) options.push({ swap: true, kind: st.next, stash: true });
    for (var o = 0; o < options.length; o++) {
      for (var i = 0; i < em.length; i++) {
        var v = scoreMove(st, em[i], options[o].kind) - (options[o].swap ? 3 : 0);
        if (!best || v > best.v) best = { cell: em[i], swap: options[o].swap, v: v };
      }
    }
    return best;
  }

  var api = {
    TILES: TILES, ORDER: ORDER, MODES: MODES, SEASONS: SEASONS, SEASON_LEN: SEASON_LEN, GONE_VAL: GONE_VAL,
    newGame: newGame, place: place, swapBasket: swapBasket, useGlove: useGlove, undo: undo,
    group: group, neighbors: neighbors, empties: empties, resolve: resolve, fairyKind: fairyKind,
    seasonOf: seasonOf, yearOf: yearOf, bestMove: bestMove, hashStr: hashStr, weights: weights
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Garden = api;
})(this);
