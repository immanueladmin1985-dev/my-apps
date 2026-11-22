// 말씨정원 머지 정원: 씨앗을 뿌리고 같은 것끼리 합쳐 키운다
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  var COLS = 5, CELLS = 30, SEED_COST = 5;
  var KINDS = {
    f: { names: ['꽃씨', '새싹', '꽃봉오리', '분홍 꽃', '황금 꽃'], img: 'flower', harvest: [null, { coins: 1 }, { coins: 3 }, { coins: 8 }, { coins: 20, fp: 10 }] },
    t: { names: ['도토리', '어린 나무', '나무', '사과나무', '황금 사과나무'], img: 'tree', harvest: [null, { coins: 2 }, { coins: 5 }, { coins: 14 }, { coins: 45, fp: 3 }] }
  };
  M.KINDS = KINDS;
  var sel = -1;   // 고른 칸
  function G() { return M.P.garden; }
  function src(it) { return 'img/' + KINDS[it.k].img + '-' + it.l + '.png'; }
  function unlockCost() { return 40 + (G().open - 20) * 20; }

  M.renderGarden = function (root) {
    var g = G(); g.found = g.found || { f: 0, t: 0 };
    var empty = 0; for (var i = 0; i < g.open; i++) if (!g.cells[i]) empty++;
    var h = '<div class="garden">' +
      '<div class="gbook">' + ['f', 't'].map(function (k) {
        return '<div class="gline">' + [1, 2, 3, 4, 5].map(function (l) {
          var ok = g.found[k] >= l;
          return '<img class="' + (ok ? '' : 'unk') + '" src="img/' + KINDS[k].img + '-' + l + '.png" alt="" title="' + (ok ? KINDS[k].names[l - 1] : '???') + '">';
        }).join('<span class="arr">›</span>') + '</div>';
      }).join('') + '</div>' +
      '<div class="grid" id="grid">';
    for (i = 0; i < CELLS; i++) {
      var it = g.cells[i];
      if (i >= g.open) h += '<div class="cell lock" data-c="' + i + '">' + (i === g.open ? '<span>🔒<br><img src="img/coin.png" alt="">' + unlockCost() + '</span>' : '') + '</div>';
      else h += '<div class="cell' + (i === sel ? ' sel' : '') + '" data-c="' + i + '">' + (it ? '<img class="gi lv' + it.l + '" src="' + src(it) + '" alt="" draggable="false">' : '') + '</div>';
    }
    h += '</div><div class="gpanel" id="gPanel"></div>' +
      '<button class="btn seed wide" id="gSeed"><span>🌰 씨앗 뿌리기</span><span class="cost"><img src="img/water.png" alt="">' + SEED_COST + '</span></button>' +
      '<p class="hint center">빈 칸 ' + empty + '개 · 같은 것끼리 끌어다 겹치면 한 단계 자라요</p></div>';
    root.innerHTML = h;
    panel();
  };

  function panel() {
    var el = $('gPanel'); if (!el) return;
    var it = sel >= 0 ? G().cells[sel] : null;
    if (!it) {
      el.innerHTML = '<div class="gp-empty">🌱 레슨으로 물방울을 모아 씨앗을 뿌리세요. <b>황금 꽃</b>을 수확하면 <img src="img/flower-point.png" alt="">꽃 포인트가 나와요.</div>';
      return;
    }
    var K = KINDS[it.k], hv = K.harvest[it.l - 1];
    el.innerHTML = '<img src="' + src(it) + '" alt=""><div class="gp-info"><b>' + K.names[it.l - 1] + '</b> <small>' + it.l + '단계</small><br><small>' +
      (it.l < 5 ? '같은 것 2개를 합치면 ' + K.names[it.l] + '(이)가 돼요' : '다 자랐어요! 수확해 보세요') + '</small></div>' +
      (hv ? '<button class="btn primary" id="gHarvest">수확<br><span class="mini">' + M.rewardHtml(hv) + '</span></button>' : '');
  }

  function place(item) {
    var g = G(), free = [];
    for (var i = 0; i < g.open; i++) if (!g.cells[i]) free.push(i);
    if (!free.length) return -1;
    var c = M.pick(free); g.cells[c] = item; return c;
  }
  M.gardenSeed = function () {
    var g = G();
    var free = 0; for (var i = 0; i < g.open; i++) if (!g.cells[i]) free++;
    if (!free) { M.toast('빈 칸이 없어요. 합치거나 수확해서 자리를 만들어요'); return false; }
    if (!M.spend('water', SEED_COST)) { M.toast('물방울이 부족해요. 레슨을 하면 물방울을 받아요 💧'); M.buzz(40); return false; }
    var lucky = Math.random() < 0.1;
    var it = { k: Math.random() < 0.72 ? 'f' : 't', l: lucky ? 2 : 1 };
    var c = place(it); found(it); M.save();
    M.sfx('pop'); if (lucky) M.toast('🍀 행운! 바로 새싹이 났어요');
    redraw(c, 'popin');
    return true;
  };
  function found(it) { var g = G(); g.found = g.found || { f: 0, t: 0 }; if (it.l > g.found[it.k]) g.found[it.k] = it.l; }
  function redraw(c, cls) {
    var root = $('gardenView'); if (!root) return;
    M.renderGarden(root);
    if (c >= 0 && cls) { var img = root.querySelector('.cell[data-c="' + c + '"] .gi'); if (img) img.classList.add(cls); }
  }
  // a 칸을 b 칸으로 옮긴다: 같은 것이면 합치고, 비었으면 옮기고, 다르면 서로 바꾼다
  M.gardenMove = function (a, b) {
    var g = G(); if (a === b || b >= g.open) return false;
    var A = g.cells[a], B = g.cells[b]; if (!A) return false;
    if (B && B.k === A.k && B.l === A.l && A.l < 5) {
      g.cells[b] = { k: A.k, l: A.l + 1 }; g.cells[a] = null;
      var first = (g.found[A.k] || 0) < A.l + 1; found(g.cells[b]);
      M.P.stats.merges++; M.quest('merge', 1);
      sel = b; M.save();
      M.sfx(A.l + 1 === 5 ? 'win' : 'merge'); M.buzz(20);
      if (A.l + 1 === 5) { M.P.stats.golden++; M.toast('✨ ' + KINDS[A.k].names[4] + '(이)가 생겼어요! 눌러서 수확하세요'); }
      else if (first) M.toast('📖 도감에 ' + KINDS[A.k].names[A.l] + '(이)가 등록됐어요');
      redraw(b, 'merged');
      return true;
    }
    g.cells[b] = A; g.cells[a] = B || null; sel = b; M.save(); M.sfx('tap'); redraw(b);
    return true;
  };
  M.gardenHarvest = function (c) {
    var g = G(), it = g.cells[c]; if (!it) return;
    var hv = KINDS[it.k].harvest[it.l - 1]; if (!hv) return;
    g.cells[c] = null; sel = -1;
    M.P.stats.harvest++; M.quest('harvest', 1);
    M.give(hv); M.sfx(hv.fp ? 'win' : 'coin');
    if (hv.fp) M.toast('🌸 꽃 포인트 +' + hv.fp + '! 상점에서 선물로 바꿀 수 있어요');
    redraw(-1);
  };
  function unlock() {
    var cost = unlockCost();
    M.confirm('땅 넓히기', '<img class="inl" src="img/coin.png" alt="">' + cost + '코인으로 칸을 하나 더 열까요?', '넓히기', function () {
      if (!M.spend('coins', cost)) { M.toast('코인이 부족해요. 정원에서 수확하면 코인이 나와요'); return; }
      G().open++; M.save(); M.sfx('coin'); redraw(-1);
    });
  }

  // ---------- 끌어서 놓기·누르기 ----------
  var drag = null;
  function cellAt(x, y) { var el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.cell') : null; }
  document.addEventListener('pointerdown', function (e) {
    var cell = e.target.closest && e.target.closest('#grid .cell');
    if (!cell) return;
    var c = +cell.dataset.c;
    if (cell.classList.contains('lock')) { if (c === G().open) unlock(); return; }
    drag = { c: c, x: e.clientX, y: e.clientY, on: false, id: e.pointerId, has: !!G().cells[c] };
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id || !drag.has) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on && dx * dx + dy * dy > 64) {
      drag.on = true;
      var img = document.querySelector('#grid .cell[data-c="' + drag.c + '"] .gi');
      var gh = document.createElement('img'); gh.className = 'dragghost'; gh.src = img.src; document.body.appendChild(gh); drag.gh = gh;
      img.classList.add('lift');
    }
    if (drag.on) {
      drag.gh.style.transform = 'translate(' + (e.clientX - 36) + 'px,' + (e.clientY - 46) + 'px)';
      var over = cellAt(e.clientX, e.clientY);
      Array.prototype.forEach.call(document.querySelectorAll('#grid .cell.over'), function (x) { if (x !== over) x.classList.remove('over'); });
      if (over && !over.classList.contains('lock')) over.classList.add('over');
      e.preventDefault();
    }
  }, { passive: false });
  function end(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    if (d.gh) d.gh.remove();
    Array.prototype.forEach.call(document.querySelectorAll('#grid .over, #grid .lift'), function (x) { x.classList.remove('over'); x.classList.remove('lift'); });
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
    sel = g.cells[d.c] ? (sel === d.c ? -1 : d.c) : -1;
    M.sfx('tap');
    Array.prototype.forEach.call(document.querySelectorAll('#grid .cell'), function (x) { x.classList.toggle('sel', +x.dataset.c === sel); });
    panel();
  }
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  document.addEventListener('click', function (e) {
    if (e.target.closest('#gSeed')) M.gardenSeed();
    else if (e.target.closest('#gHarvest') && sel >= 0) M.gardenHarvest(sel);
  });
  M.gardenSel = function () { return sel; };
})();
