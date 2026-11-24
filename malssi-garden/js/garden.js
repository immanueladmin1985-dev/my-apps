// 말씨정원 머지 정원: 씨앗을 뿌리고, 같은 것끼리 합쳐 키우고, 동물 친구들의 주문을 채운다
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  var CELLS = 48, PLOT = 24, SEED_COST = 5;
  var KINDS = {
    f: { names: ['꽃씨', '새싹', '꽃봉오리', '분홍 꽃', '황금 꽃'], img: 'flower', sell: [null, { coins: 1 }, { coins: 2 }, { coins: 5 }, { coins: 15, fp: 8 }] },
    t: { names: ['도토리', '어린 나무', '나무', '사과나무', '황금 사과나무'], img: 'tree', sell: [null, { coins: 1 }, { coins: 3 }, { coins: 8 }, { coins: 30, fp: 3 }] }
  };
  var FRIENDS = [['🐻', '곰돌이'], ['🐿️', '다람이'], ['🦔', '고슴이'], ['🐥', '삐약이'], ['🐼', '판다'], ['🦊', '여우'], ['🐨', '코알라'], ['🐹', '햄찌']];
  M.KINDS = KINDS;
  var sel = -1, lastAct = Date.now(), combo = 0, comboAt = 0;
  function G() { var g = M.P.garden; g.found = g.found || { f: 0, t: 0 }; g.orders = g.orders || []; g.done = g.done || 0; return g; }
  function src(it) { return 'img/' + KINDS[it.k].img + '-' + it.l + '.png'; }
  function name(k, l) { return KINDS[k].names[l - 1]; }
  function unlockCost() { return 40 + (G().open - 20) * 20; }
  function count(k, l) { var g = G(), n = 0; for (var i = 0; i < g.open; i++) { var x = g.cells[i]; if (x && x.k === k && x.l === l) n++; } return n; }

  // ---------- 주문 ----------
  var VAL = { 2: 4, 3: 9, 4: 20, 5: 45 };
  function genOrder() {
    var g = G();
    var starter = [[{ k: 'f', l: 2, n: 1 }], [{ k: 'f', l: 3, n: 1 }], [{ k: 't', l: 2, n: 1 }]];
    var need;
    if (g.done < 3 && g.orders.length < 3 && !g.orders.some(function (o) { return o.starter === g.done; })) need = starter[g.done];
    else {
      var maxL = Math.max(g.found.f, g.found.t, 2);
      var top = Math.min(5, maxL + 1), l = 2 + Math.floor(Math.pow(Math.random(), 1.6) * (top - 1));
      var k = Math.random() < 0.68 ? 'f' : 't';
      need = [{ k: k, l: l, n: l <= 3 ? M.rand(1, 2) : 1 }];
      if (g.done >= 5 && l <= 3 && Math.random() < 0.35) need.push({ k: k === 'f' ? 't' : 'f', l: M.rand(2, 3), n: 1 });
    }
    var rw = { coins: 0, fp: 0, exp: 0 };
    need.forEach(function (r) {
      rw.coins += VAL[r.l] * r.n; rw.exp += r.l * 2 * r.n;
      if (r.k === 'f' && r.l === 5) rw.fp += 12; else if (r.k === 't' && r.l === 5) rw.fp += 4; else if (r.k === 'f' && r.l === 4) rw.fp += 2;
    });
    if (!rw.fp) delete rw.fp;
    var fr = M.pick(FRIENDS);
    return { id: 'o' + Date.now() + Math.floor(Math.random() * 1000), need: need, rw: rw, who: fr, starter: g.done < 3 ? g.done : null };
  }
  function ensureOrders() { var g = G(); while (g.orders.length < 3) g.orders.push(genOrder()); }
  function ready(o) { return o.need.every(function (r) { return count(r.k, r.l) >= r.n; }); }
  M.gardenOrderReady = function () { return G().orders.some(ready); };

  // ---------- 그리기 ----------
  M.renderGarden = function (root) {
    ensureOrders();
    var g = G(), h = '<div class="garden"><div class="orders" id="gOrders"></div><div class="grid" id="grid">';
    for (var i = 0; i < CELLS; i++) {
      if (i % PLOT === 0) h += '<div class="plot"><div class="pgrid">';
      h += '<div class="cell" data-c="' + i + '"></div>';
      if (i % PLOT === PLOT - 1) h += '</div></div>';
    }
    h += '</div><div class="gpanel" id="gPanel"></div>' +
      '<button class="btn seed wide" id="gSeed"><span>🌰 씨앗 뿌리기 <small>꾹 누르면 계속</small></span><span class="cost"><img src="img/water.png" alt="">' + SEED_COST + '</span></button>' +
      '<div class="gbook" id="gBook"></div></div>';
    root.innerHTML = h;
    for (i = 0; i < CELLS; i++) paintCell(i);
    paintOrders(); panel(); paintBook();
  };
  function cellEl(c) { return document.querySelector('#grid .cell[data-c="' + c + '"]'); }
  function paintCell(c) {
    var el = cellEl(c); if (!el) return;
    var g = G(), it = g.cells[c];
    el.className = 'cell' + (c >= g.open ? ' lock' : '') + (c === sel ? ' sel' : '');
    if (c >= g.open) el.innerHTML = c === g.open ? '<span>🔒<br><img src="img/coin.png" alt="">' + unlockCost() + '</span>' : '';
    else el.innerHTML = it ? '<img class="gi lv' + it.l + '" src="' + src(it) + '" alt="" draggable="false">' : '';
    return el;
  }
  function paintOrders() {
    var el = $('gOrders'); if (!el) return;
    el.innerHTML = G().orders.map(function (o) {
      var ok = ready(o);
      return '<div class="order' + (ok ? ' ok' : '') + '" data-o="' + o.id + '"><div class="who"><span>' + o.who[0] + '</span><small>' + esc(o.who[1]) + '</small></div>' +
        '<div class="needs">' + o.need.map(function (r) {
          var have = Math.min(count(r.k, r.l), r.n);
          return '<div class="need' + (have >= r.n ? ' got' : '') + '"><img src="img/' + KINDS[r.k].img + '-' + r.l + '.png" alt="' + name(r.k, r.l) + '"><i>' + have + '/' + r.n + '</i></div>';
        }).join('') + '</div>' +
        '<button class="give" data-give="' + o.id + '"' + (ok ? '' : ' disabled') + '>' + (ok ? '주기' : '<span class="mini">' + M.rewardHtml({ coins: o.rw.coins, fp: o.rw.fp }) + '</span>') + '</button></div>';
    }).join('');
    if (M.paintBadges) M.paintBadges();
  }
  function paintBook() {
    var el = $('gBook'); if (!el) return; var g = G();
    el.innerHTML = '<small>도감</small>' + ['f', 't'].map(function (k) {
      return '<div class="gline">' + [1, 2, 3, 4, 5].map(function (l) {
        var ok = g.found[k] >= l;
        return '<img class="' + (ok ? '' : 'unk') + '" src="img/' + KINDS[k].img + '-' + l + '.png" alt="" title="' + (ok ? name(k, l) : '???') + '">';
      }).join('<span class="arr">›</span>') + '</div>';
    }).join('');
  }
  function panel() {
    var el = $('gPanel'); if (!el) return;
    var it = sel >= 0 ? G().cells[sel] : null;
    if (!it) {
      var empty = 0, g = G(); for (var i = 0; i < g.open; i++) if (!g.cells[i]) empty++;
      el.innerHTML = '<div class="gp-empty">같은 것끼리 <b>끌어다 겹치면</b> 한 단계 자라요. 위의 <b>주문</b>을 채우면 코인과 <img src="img/flower-point.png" alt="">꽃 포인트를 받아요. <small>빈 칸 ' + empty + '개</small></div>';
      return;
    }
    var K = KINDS[it.k], sv = K.sell[it.l - 1];
    el.innerHTML = '<img src="' + src(it) + '" alt=""><div class="gp-info"><b>' + name(it.k, it.l) + '</b> <small>' + it.l + '단계</small><br><small>' +
      (it.l < 5 ? '2개를 합치면 ' + M.j(name(it.k, it.l + 1), '이', '가') + ' 돼요' : '다 자랐어요! 주문에 쓰거나 팔 수 있어요') + '</small></div>' +
      (sv ? '<button class="btn" id="gSell">팔기<br><span class="mini">' + M.rewardHtml(sv) + '</span></button>' : '');
  }
  function afterChange() { paintOrders(); panel(); }

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
    var img = cellEl(c) && cellEl(c).querySelector('.gi'); if (!img || M.fast || !img.animate) return;
    var a = center(fromEl), b = center(img);
    img.animate([{ transform: 'translate(' + (a.x - b.x) + 'px,' + (a.y - b.y) + 'px) scale(.3)', offset: 0 },
      { transform: 'translate(' + (a.x - b.x) / 2 + 'px,' + ((a.y - b.y) / 2 - 80) + 'px) scale(.8)', offset: 0.5 },
      { transform: 'translate(0,0) scale(1.15)', offset: 0.85 }, { transform: 'none', offset: 1 }], { duration: 420, easing: 'ease-out' });
  }

  // ---------- 동작 ----------
  function place(item) {
    var g = G(), free = [];
    for (var i = 0; i < g.open; i++) if (!g.cells[i]) free.push(i);
    if (!free.length) return -1;
    var c = M.pick(free); g.cells[c] = item; return c;
  }
  function found(it) { var g = G(); if (it.l > g.found[it.k]) { g.found[it.k] = it.l; paintBook(); return true; } return false; }
  M.gardenSeed = function () {
    var g = G(); lastAct = Date.now();
    var free = 0; for (var i = 0; i < g.open; i++) if (!g.cells[i]) free++;
    if (!free) { M.toast('빈 칸이 없어요. 합치거나 팔아서 자리를 만들어요'); return false; }
    if (!M.spend('water', SEED_COST)) { M.toast('물방울이 부족해요. 레슨을 하면 물방울을 받아요 💧'); M.buzz(40); return false; }
    var lucky = Math.random() < 0.1;
    var it = { k: Math.random() < 0.68 ? 'f' : 't', l: lucky ? 2 : 1 };
    var c = place(it); found(it); M.save();
    paintCell(c); dropIn(c, $('gSeed'));
    M.sfx('pop');
    if (lucky) setTimeout(function () { floatText(cellEl(c), '🍀 행운!', 'gold'); }, 380);
    afterChange();
    return true;
  };
  // a 칸을 b 칸으로 옮긴다: 같은 것이면 합치고, 비었으면 옮기고, 다르면 서로 바꾼다
  M.gardenMove = function (a, b) {
    var g = G(); lastAct = Date.now();
    if (a === b || b >= g.open) return false;
    var A = g.cells[a], B = g.cells[b]; if (!A) return false;
    if (B && B.k === A.k && B.l === A.l && A.l < 5) {
      var nl = A.l + 1;
      g.cells[b] = { k: A.k, l: nl }; g.cells[a] = null;
      var first = found(g.cells[b]);
      M.P.stats.merges++; M.quest('merge', 1);
      sel = b; M.save();
      paintCell(a); var el = paintCell(b); paintCell(sel);
      var img = el.querySelector('.gi'); if (img) img.classList.add('merged');
      var now = Date.now(); combo = now - comboAt < 2200 ? combo + 1 : 1; comboAt = now;
      burst(el, nl === 5 ? ['#ffd84a', '#fff3a6', '#ffb02e'] : A.k === 'f' ? ['#ff9fc0', '#ffd1e0', '#9be36b'] : ['#8fd65c', '#c6f19b', '#ff6b6b'], nl === 5 ? 18 : 10);
      M.sfx(nl === 5 ? 'win' : 'merge'); M.buzz(nl === 5 ? [30, 40, 60] : 20);
      if (combo >= 3) { var bonus = Math.min(10, combo - 1); M.give({ coins: bonus }); floatText(el, '콤보 ' + combo + '! +' + bonus, 'gold'); }
      else if (first) floatText(el, '도감 등록!', 'pink');
      else floatText(el, name(A.k, nl));
      if (nl === 5) { M.P.stats.golden++; var gr = $('grid'); gr.classList.remove('quake'); void gr.offsetWidth; gr.classList.add('quake'); }
      afterChange();
      return true;
    }
    g.cells[b] = A; g.cells[a] = B || null; sel = b; M.save(); M.sfx('tap');
    paintCell(a); paintCell(b); afterChange();
    return true;
  };
  M.gardenSell = function (c) {
    var g = G(), it = g.cells[c]; if (!it) return;
    var sv = KINDS[it.k].sell[it.l - 1]; if (!sv) return;
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
    o.need.forEach(function (r) {
      var left = r.n;
      for (var i = g.open - 1; i >= 0 && left; i--) {
        var x = g.cells[i];
        if (x && x.k === r.k && x.l === r.l) {
          var el = cellEl(i), img = el && el.querySelector('.gi');
          if (img && card && !M.fast && img.animate) {
            var a = center(img), b = center(card), gh = img.cloneNode(); gh.className = 'flyimg';
            gh.style.left = a.x + 'px'; gh.style.top = a.y + 'px'; gh.style.width = a.w + 'px'; document.body.appendChild(gh);
            gh.animate([{ transform: 'translate(-50%,-50%)' }, { transform: 'translate(calc(-50% + ' + (b.x - a.x) + 'px), calc(-50% + ' + (b.y - a.y) + 'px)) scale(.3)', opacity: 0.4 }], { duration: 450, easing: 'ease-in' }).onfinish = (function (z) { return function () { z.parentNode && z.parentNode.removeChild(z); }; })(gh);
          }
          g.cells[i] = null; if (sel === i) sel = -1; paintCell(i); left--;
        }
      }
    });
    g.orders = g.orders.filter(function (x) { return x !== o; });
    g.done++;
    M.give({ coins: o.rw.coins, fp: o.rw.fp });
    if (card && M.fly) { M.fly(card, 'img/coin.png', 'tCoin', 5); if (o.rw.fp) M.fly(card, 'img/flower-point.png', 'tFp', 4); }
    if (M.petExp) M.petExp(o.rw.exp, true);
    M.quest('order', 1);
    M.sfx('win'); M.buzz([20, 30, 20]);
    if (card) { burst(card, ['#ffd84a', '#ff9fc0', '#9be36b'], 14); floatText(card, o.who[0] + ' 고마워요!', 'pink'); }
    M.save();
    setTimeout(function () { ensureOrders(); M.save(); paintOrders(); var n = document.querySelector('#gOrders .order:last-child'); if (n) n.classList.add('slidein'); panel(); }, M.fast ? 0 : 450);
    paintOrders();
    return true;
  };
  function unlock() {
    var cost = unlockCost();
    M.confirm('땅 넓히기', '<img class="inl" src="img/coin.png" alt="">' + cost + '코인으로 칸을 하나 더 열까요?', '넓히기', function () {
      if (!M.spend('coins', cost)) { M.toast('코인이 부족해요. 주문을 채우면 코인을 받아요'); return; }
      var g = G(); g.open++; M.save(); M.sfx('coin');
      paintCell(g.open - 1); paintCell(g.open); burst(cellEl(g.open - 1), ['#c69a5d', '#9be36b'], 8); panel();
    });
  }

  // ---------- 끌어서 놓기·누르기 ----------
  var drag = null;
  function cellAt(x, y) { var el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('#grid .cell') : null; }
  function clearMarks() { Array.prototype.forEach.call(document.querySelectorAll('#grid .over, #grid .lift, #grid .can'), function (x) { x.classList.remove('over', 'lift', 'can'); }); }
  document.addEventListener('pointerdown', function (e) {
    var seedB = e.target.closest && e.target.closest('#gSeed');
    if (seedB) { startSeeding(); return; }
    var cell = e.target.closest && e.target.closest('#grid .cell');
    if (!cell) return;
    lastAct = Date.now();
    var c = +cell.dataset.c;
    if (cell.classList.contains('lock')) return;   // 잠긴 칸은 click 에서 연다
    drag = { c: c, x: e.clientX, y: e.clientY, on: false, id: e.pointerId, has: !!G().cells[c] };
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id || !drag.has) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on && dx * dx + dy * dy > 64) {
      drag.on = true;
      var cell = cellEl(drag.c), img = cell.querySelector('.gi'), A = G().cells[drag.c];
      var gh = document.createElement('img'); gh.className = 'dragghost'; gh.src = img.src;
      var w = cell.getBoundingClientRect().width * 1.15; gh.style.width = gh.style.height = w + 'px'; drag.w = w;
      document.body.appendChild(gh); drag.gh = gh;
      cell.classList.add('lift');
      var g = G();
      if (A.l < 5) for (var i = 0; i < g.open; i++) { var x = g.cells[i]; if (i !== drag.c && x && x.k === A.k && x.l === A.l) cellEl(i).classList.add('can'); }
    }
    if (drag.on) {
      drag.gh.style.transform = 'translate(' + (e.clientX - drag.w / 2) + 'px,' + (e.clientY - drag.w * 0.7) + 'px)';
      var over = cellAt(e.clientX, e.clientY);
      Array.prototype.forEach.call(document.querySelectorAll('#grid .cell.over'), function (x) { if (x !== over) x.classList.remove('over'); });
      if (over && !over.classList.contains('lock')) over.classList.add('over');
      e.preventDefault();
    }
  }, { passive: false });
  function end(e) {
    stopSeeding();
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    if (d.gh) d.gh.parentNode.removeChild(d.gh);
    clearMarks();
    if (d.on) {
      var over = cellAt(e.clientX, e.clientY);
      if (over && e.type === 'pointerup') M.gardenMove(d.c, +over.dataset.c);
      return;
    }
    if (e.type !== 'pointerup') return;
    // 눌렀을 때: 고른 것과 같은 것을 누르면 합치고, 빈 칸을 누르면 옮긴다
    var g = G();
    if (sel >= 0 && sel !== d.c && g.cells[sel]) {
      var A = g.cells[sel], B = g.cells[d.c];
      if (!B || (B.k === A.k && B.l === A.l && A.l < 5)) { M.gardenMove(sel, d.c); return; }
    }
    var old = sel;
    sel = g.cells[d.c] ? (sel === d.c ? -1 : d.c) : -1;
    if (old >= 0) paintCell(old); if (sel >= 0) { paintCell(sel); var im = cellEl(sel).querySelector('.gi'); if (im) im.classList.add('bounce'); }
    M.sfx('tap'); panel();
  }
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  // 씨앗 버튼: 꾹 누르면 계속 뿌린다
  var seedT = null;
  function startSeeding() {
    stopSeeding();
    M.gardenSeed();
    seedT = setTimeout(function rep() { if (!M.gardenSeed()) { stopSeeding(); return; } seedT = setTimeout(rep, 170); }, 450);
  }
  function stopSeeding() { if (seedT) { clearTimeout(seedT); seedT = null; } }
  document.addEventListener('click', function (e) {
    var lk = e.target.closest('#grid .cell.lock'); if (lk && +lk.dataset.c === G().open) { unlock(); return; }
    if (e.target.closest('#gSell') && sel >= 0) M.gardenSell(sel);
    var gb = e.target.closest('[data-give]'); if (gb && !gb.disabled) M.gardenDeliver(gb.dataset.give);
  });
  // 잠시 손을 놓고 있으면 합칠 수 있는 짝을 흔들어 알려 준다
  setInterval(function () {
    var grid = $('grid'); if (!grid || drag || !grid.offsetParent || document.querySelector('.dim')) return;
    if (Date.now() - lastAct < 6000) return;
    lastAct = Date.now();
    var g = G(), c = g.cells;
    for (var i = 0; i < g.open; i++) for (var j = i + 1; j < g.open; j++) if (c[i] && c[j] && c[i].k === c[j].k && c[i].l === c[j].l && c[i].l < 5) {
      [i, j].forEach(function (k) { var im = cellEl(k).querySelector('.gi'); if (im) { im.classList.remove('hint'); void im.offsetWidth; im.classList.add('hint'); } });
      return;
    }
  }, 1000);
  M.gardenSel = function () { return sel; };
})();
