// 화분 키우기 (말씨정원). 토끼 집의 화분 선반에서 실제 시간으로 키운다.
//  - 물을 주면(물방울) 12시간 촉촉하고, 촉촉한 동안만 자란다. 마르면 멈추고 시들어 보이지만 죽지는 않는다.
//  - 비료는 전체 성장 시간의 1/4을 바로 앞당긴다(화분마다 2번까지).
//  - 다 자라면 열매를 딴다. 열매는 팔거나 주민에게 선물한다(하루 한 번, 친밀도 +1).
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  var H = 3600 * 1000, WET = 12 * H, WATER_COST = 3, FERT_PRICE = 15;
  // 그림이 오면 img: true 로 켠다 (img/plant-<id>-<1~5>.png, img/fruit-<id>.png)
  var SEEDS = {
    strawberry: { name: '딸기', hours: 4, price: 20, yield: 3, sell: 12, st: ['🌱', '🌿', '☘️', '🌼', '🍓'], fruit: '🍓', lv: 1, img: true },
    tomato: { name: '토마토', hours: 6, price: 30, yield: 3, sell: 16, st: ['🌱', '🌿', '🪴', '🌼', '🍅'], fruit: '🍅', lv: 1, img: true },
    sunflower: { name: '해바라기', hours: 8, price: 40, yield: 2, sell: 18, fp: 3, st: ['🌱', '🌿', '🪴', '🌻', '🌻'], fruit: '🌻', lv: 3, img: true },
    rose: { name: '장미', hours: 12, price: 60, yield: 2, sell: 28, fp: 5, st: ['🌱', '🌿', '🪴', '🥀', '🌹'], fruit: '🌹', lv: 5, img: true },
    lemon: { name: '레몬나무', hours: 24, price: 90, yield: 4, sell: 30, st: ['🌱', '🌿', '🪴', '🌳', '🍋'], fruit: '🍋', lv: 7, img: true }
  };
  function fruitImg(k) { return '<img class="fimg2" src="img/w/fruit-' + k + '.png" alt="' + SEEDS[k].name + '">'; }
  var SLOT_COST = [0, 0, 150, 300, 500, 800];   // 3번째 칸부터
  M.SEEDS = SEEDS;

  function S() {
    var P = M.P; P.pots = P.pots || { slots: 2, list: [], seeds: {}, fert: 0, fruits: {}, gifted: {}, giftDay: '' };
    var s = P.pots; while (s.list.length < s.slots) s.list.push(null);
    if (s.giftDay !== M.today()) { s.giftDay = M.today(); s.gifted = {}; }
    return s;
  }
  function total(p) { return SEEDS[p.id].hours * H; }
  function update(p, now) {   // 촉촉했던 시간만큼 자란다
    now = now || Date.now();
    var end = Math.min(now, p.wet || 0);
    if (end > p.at) p.t += end - p.at;
    p.at = now; p.t = Math.min(p.t, total(p));
  }
  function stage(p) { var f = p.t / total(p); return f >= 1 ? 5 : f >= 0.66 ? 4 : f >= 0.33 ? 3 : f >= 0.1 ? 2 : 1; }
  function wet(p) { return Date.now() < (p.wet || 0); }
  function ripe(p) { return p.t >= total(p); }
  function fmt(ms) { var m = Math.max(0, Math.ceil(ms / 60000)), h = Math.floor(m / 60); return h ? h + '시간 ' + (m % 60) + '분' : m + '분'; }

  M.potAlert = function () {
    if (!M.P || !M.P.pots) return '';
    var s = S(); return s.list.some(function (p) { if (!p) return false; update(p); return ripe(p); }) ? '🍓' : s.list.some(function (p) { return p && !ripe(p) && !wet(p); }) ? '💧' : '';
  };

  function plantFace(p) {
    var sd = SEEDS[p.id], sg = stage(p);
    return sd.img ? '<img class="pimg" src="img/w/' + (sg === 1 ? 'pot-empty' : 'plant-' + p.id + '-' + sg) + '.png" alt="">' : '<span class="pe s' + sg + '">' + sd.st[sg - 1] + '</span>';
  }
  // 방 안의 화분 자리(%) — 꾸미기 모드에서 끌어서 옮길 수 있다
  var SPOTS = [[16, 80], [30, 86], [70, 86], [84, 80], [10, 64], [90, 64]];
  function spot(s, i) { s.pos = s.pos || []; return s.pos[i] || { x: SPOTS[i][0], y: SPOTS[i][1] }; }
  function potSvg() {
    return '<svg class="potsvg" viewBox="0 0 60 40"><path d="M6 4 H54 L49 38 H11 Z" fill="#d9774a" stroke="#7a3e22" stroke-width="3" stroke-linejoin="round"/><rect x="3" y="2" width="54" height="9" rx="3" fill="#e88a5a" stroke="#7a3e22" stroke-width="3"/><path d="M14 18 H46" stroke="#f3a77c" stroke-width="3" stroke-linecap="round"/></svg>';
  }
  M.potsRoomHtml = function () {
    var s = S(), now = Date.now();
    return s.list.map(function (p, i) {
      var sp = spot(s, i), inner, tag;
      if (!p) { inner = '<img class="pimg" src="img/w/pot-empty.png" alt=""><span class="pplus">＋</span>'; tag = '<i class="ptag empty">심기</i>'; }
      else {
        update(p, now); var r = ripe(p), w = wet(p), sd = SEEDS[p.id];
        inner = SEEDS[p.id].img ? plantFace(p) : '<span class="pplant">' + plantFace(p) + '</span>' + potSvg();
        tag = r ? '<i class="ptag ripe">수확!</i>' : !w ? '<i class="ptag dry">💧물</i>' : '<i class="ptag">' + fmtShort(total(p) - p.t) + '</i>';
      }
      return '<button class="potobj' + (p && ripe(p) ? ' ripe' : '') + (p && !ripe(p) && !wet(p) ? ' dry' : '') + '" data-pot="' + i + '" style="left:' + sp.x + '%;top:' + sp.y + '%;z-index:' + Math.round(sp.y + 2) + '">' + inner + tag + '</button>';
    }).join('');
  };
  function fmtShort(ms) { var m = Math.max(1, Math.ceil(ms / 60000)), h = Math.floor(m / 60); return h ? h + '시간' + (m % 60 ? ' ' + (m % 60) + '분' : '') : m + '분'; }
  // 방 아래 작은 막대: 바구니·씨앗·화분 자리
  M.potsHtml = function () {
    var s = S(), fruits = Object.keys(s.fruits).filter(function (k) { return s.fruits[k] > 0; });
    var seeds = Object.keys(s.seeds).reduce(function (a, k) { return a + (s.seeds[k] || 0); }, 0);
    return '<div class="card potshelf"><div class="pots-h"><b>🪴 화분 ' + s.list.filter(Boolean).length + '/' + s.slots + '</b><small>방 안의 화분을 눌러 물·비료·수확 · 실제 시간으로 자라요</small></div>' +
      '<div class="basket"><b>🧺 열매 바구니</b>' + (fruits.length ? fruits.map(function (k) { return '<button class="fruit" data-psell="' + k + '">' + fruitImg(k) + '<i>' + s.fruits[k] + '</i></button>'; }).join('') + '<small>누르면 팔 수 있어요 · 주민에게 선물도 돼요</small>' : '<small>아직 비어 있어요</small>') +
      '<span class="binv">씨앗 ' + seeds + ' · 비료 ' + s.fert + '</span></div>' +
      '<div class="row2"><button class="btn sm" data-pshop>🌱 씨앗·비료 사기</button>' + (s.slots < 6 ? '<button class="btn sm" data-pslot>➕ 화분 늘리기 <img class="inl" src="img/coin.png" alt="">' + SLOT_COST[s.slots] + '</button>' : '<span></span>') + '</div></div>';
  };
  function repaint() { if (M.render) M.render(); if (M.paintBadges) M.paintBadges(); }
  M.paintPots = repaint;
  // 화분을 누르면 할 일 고르기
  function potSheet(i) {
    var s = S(), p = s.list[i];
    if (!p) { plantSheet(i); return; }
    update(p); var sd = SEEDS[p.id], r = ripe(p), w = wet(p), left = total(p) - p.t;
    var d = M.modal('<div class="center"><div class="potbig">' + plantFace(p) + (sd.img ? '' : potSvg()) + '</div><h3>' + sd.name + '</h3><div class="mbar"><i style="width:' + Math.round(p.t / total(p) * 100) + '%"></i></div>' +
      '<p class="hint">' + (r ? '다 자랐어요! 열매 ' + sd.yield + '개를 딸 수 있어요' : (w ? '촉촉해요 · ' + fmt(p.wet - Date.now()) + ' 동안 자라요' : '물이 말라서 자라지 않아요') + '<br>다 자라기까지 ' + fmt(left)) + '</p></div>' +
      (r ? '<button class="btn primary wide" data-pharv="' + i + '">🧺 수확하기</button>' :
        '<div class="row2"><button class="btn' + (w ? '' : ' primary') + '" data-pwater="' + i + '">💧 물 주기 (' + WATER_COST + ')</button><button class="btn" data-pfert="' + i + '"' + ((p.f || 0) >= 2 ? ' disabled' : '') + '>🧪 비료 (' + s.fert + ')</button></div>') +
      '<button class="btn ghost wide" data-close>닫기</button>');
    d.classList.add('potshelf');   // 아래 버튼 처리를 같이 쓴다
    d.addEventListener('click', function (e) { if (e.target.closest('[data-pwater],[data-pfert],[data-pharv]')) setTimeout(function () { d.close(); }, 0); });
  }
  // 꾸미기 모드에서 화분 끌기
  var pd = null;
  document.addEventListener('pointerdown', function (e) {
    var el = e.target.closest && e.target.closest('.room.editing .potobj'); if (!el) return;
    pd = { el: el, i: +el.dataset.pot, r: el.parentNode.getBoundingClientRect(), x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId };
  });
  document.addEventListener('pointermove', function (e) {
    if (!pd || e.pointerId !== pd.pid) return;
    if (Math.abs(e.clientX - pd.x0) + Math.abs(e.clientY - pd.y0) > 6) pd.moved = true;
    if (!pd.moved) return;
    var x = Math.max(6, Math.min(94, (e.clientX - pd.r.left) / pd.r.width * 100)), y = Math.max(40, Math.min(94, (e.clientY - pd.r.top) / pd.r.height * 100));
    pd.el.style.left = x + '%'; pd.el.style.top = y + '%'; pd.pos = { x: x, y: y }; e.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerup', function (e) {
    if (!pd || e.pointerId !== pd.pid) return;
    var d = pd; pd = null;
    if (d.moved && d.pos) { var s = S(); s.pos = s.pos || []; s.pos[d.i] = d.pos; M.save(); d.el.style.zIndex = Math.round(d.pos.y + 2); d.el.dataset.dragged = '1'; setTimeout(function () { delete d.el.dataset.dragged; }, 50); }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.potobj'); if (!b || b.dataset.dragged) return;
    if (b.closest('.room.editing')) { M.toast('꾸미기를 끝내면 화분을 돌볼 수 있어요'); return; }
    potSheet(+b.dataset.pot);
  });

  function plantSheet(i) {
    var s = S(), have = Object.keys(SEEDS).filter(function (k) { return s.seeds[k] > 0; });
    if (!have.length) { M.confirm('씨앗이 없어요', '마을의 <b>잡화점</b>이나 꾸미기 상점의 <b>씨앗·비료</b> 탭에서 씨앗을 사 오세요.', '지금 사러 가기', function () { M.furnShop('seed'); }); return; }
    var d = M.modal('<h3>🌱 어떤 씨앗을 심을까요?</h3><div class="list">' + have.map(function (k) { var sd = SEEDS[k]; return '<button class="litem" data-sk="' + k + '"><span class="le">' + fruitImg(k) + '</span><span class="ln">' + sd.name + ' <small>' + sd.hours + '시간 · 열매 ' + sd.yield + '개' + (sd.fp ? ' · 꽃 포인트' : '') + '</small></span><span class="lp own">' + s.seeds[k] + '개</span></button>'; }).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sk]'); if (!b) return;
      var k = b.dataset.sk; s.seeds[k]--; s.list[i] = { id: k, t: 0, at: Date.now(), wet: 0, f: 0 };
      M.save(); d.close(); M.sfx('pop'); M.toast(SEEDS[k].fruit + ' ' + SEEDS[k].name + ' 씨앗을 심었어요! 물을 주면 자라기 시작해요'); repaint();
    });
  }
  // 잡화점 "씨앗·비료" 탭
  M.seedTab = function (box, hint) {
    var s = S(), lv = M.gardenState ? M.gardenState().lv : 1;
    hint.textContent = '씨앗을 사서 토끼 집 화분에 심어요. 물은 레슨으로 받은 물방울로 줘요';
    box.innerHTML = '<div class="fgrid">' + Object.keys(SEEDS).map(function (k) {
      var sd = SEEDS[k], lock = lv < sd.lv;
      return '<button class="fcard' + (lock ? ' lock' : '') + '" data-buyseed="' + k + '"><span class="seedem">' + sd.fruit + '</span><b>' + sd.name + ' 씨앗</b><small>' + sd.hours + '시간</small>' +
        (lock ? '<small>가게 Lv.' + sd.lv + '</small>' : '<small class="price"><img src="img/coin.png" alt="">' + sd.price + '</small>') + (s.seeds[k] ? '<i class="own">' + s.seeds[k] + '개</i>' : '') + '</button>';
    }).join('') + '<button class="fcard" data-buyfert><span class="seedem">🧪</span><b>비료</b><small>성장 1/4 앞당김</small><small class="price"><img src="img/coin.png" alt="">' + FERT_PRICE + '</small>' + (s.fert ? '<i class="own">' + s.fert + '개</i>' : '') + '</button></div>';
    box.onclick = function (e) {
      var b = e.target.closest('[data-buyseed]'), f = e.target.closest('[data-buyfert]');
      if (b) { var k = b.dataset.buyseed, sd = SEEDS[k]; if (lv < sd.lv) { M.toast('가게 레벨 ' + sd.lv + '에 팔아요'); return; } if (!M.spend('coins', sd.price)) { M.toast('코인이 모자라요'); return; } s.seeds[k] = (s.seeds[k] || 0) + 1; M.sfx('coin'); M.save(); M.seedTab(box, hint); }
      if (f) { if (!M.spend('coins', FERT_PRICE)) { M.toast('코인이 모자라요'); return; } s.fert++; M.sfx('coin'); M.save(); M.seedTab(box, hint); }
    };
  };
  // 주민에게 열매 선물 (하루 한 번)
  M.potGiftable = function (id) { var s = S(); return !s.gifted[id] && Object.keys(s.fruits).some(function (k) { return s.fruits[k] > 0; }); };
  M.potGiftSheet = function (id, done) {
    var s = S(), c = M.custOf(id), ks = Object.keys(s.fruits).filter(function (k) { return s.fruits[k] > 0; });
    var d = M.modal('<h3>🎁 ' + esc(M.j(c.name, '이', '')) + '에게 무엇을 줄까요?</h3><div class="basket big">' + ks.map(function (k) { return '<button class="fruit" data-gk="' + k + '">' + fruitImg(k) + '<i>' + s.fruits[k] + '</i></button>'; }).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-gk]'); if (!b) return;
      s.fruits[b.dataset.gk]--; s.gifted[id] = 1; M.save(); d.close(); M.sfx('win');
      M.modal('<div class="center"><img class="mface" src="' + M.custImg(id, true) + '" alt=""><h3>' + esc(c.name) + ': "와, ' + SEEDS[b.dataset.gk].name + '! 고마워요!"</h3><p class="hint">친밀도가 올랐어요 ♥</p><button class="btn primary wide" data-close>좋아요</button></div>', { onClose: function () { M.gardenFriendUp(id); if (done) done(); } });
    });
  };

  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest || !t.closest('.potshelf')) return;
    var s = S(), b;
    if ((b = t.closest('[data-pplant]'))) { plantSheet(+b.dataset.pplant); return; }
    if (t.closest('[data-pshop]')) { M.furnShop('seed'); return; }
    if ((b = t.closest('[data-pwater]'))) {
      var p = s.list[+b.dataset.pwater]; update(p);
      if (wet(p) && p.wet - Date.now() > WET - H) { M.toast('방금 물을 줬어요. 조금 뒤에 다시 주세요'); return; }
      if (!M.spend('water', WATER_COST)) { M.toast('물방울이 모자라요. 레슨을 하면 받아요'); return; }
      p.wet = Date.now() + WET; M.save(); M.sfx('pop'); M.toast('💧 촉촉해졌어요! 12시간 동안 자라요'); repaint(); return;
    }
    if ((b = t.closest('[data-pfert]'))) {
      var q = s.list[+b.dataset.pfert]; update(q);
      if (!s.fert) { M.confirm('비료가 없어요', '잡화점의 씨앗·비료 탭에서 비료를 살 수 있어요.', '사러 가기', function () { M.furnShop('seed'); }); return; }
      s.fert--; q.f = (q.f || 0) + 1; q.t = Math.min(total(q), q.t + total(q) / 4); M.save(); M.sfx('merge'); M.toast('🧪 쑥쑥 자랐어요!'); repaint(); return;
    }
    if ((b = t.closest('[data-pharv]'))) {
      var i = +b.dataset.pharv, r = s.list[i], sd = SEEDS[r.id];
      s.fruits[r.id] = (s.fruits[r.id] || 0) + sd.yield; s.list[i] = null;
      if (sd.fp) M.give({ fp: sd.fp });
      M.save(); M.sfx('win'); M.quest && M.quest('harvest', 1);
      M.modal('<div class="center"><div class="tbig fruitrow">' + new Array(Math.min(4, sd.yield) + 1).join(fruitImg(r.id)) + '</div><h3>' + sd.name + ' ' + sd.yield + '개를 땄어요!</h3>' + (sd.fp ? '<p>' + M.rewardHtml({ fp: sd.fp }) + '</p>' : '') + '<p class="hint">열매 바구니에 넣었어요. 팔거나 주민에게 선물해 보세요.</p><button class="btn primary wide" data-close>좋아요</button></div>');
      repaint(); return;
    }
    if ((b = t.closest('[data-pslot]'))) {
      var cost = SLOT_COST[s.slots];
      M.confirm('화분 자리 늘리기', '<img class="inl" src="img/coin.png" alt="">' + cost + '코인으로 화분 자리를 하나 늘릴까요?', '늘리기', function () { if (!M.spend('coins', cost)) { M.toast('코인이 모자라요'); return; } s.slots++; S(); M.save(); M.sfx('win'); repaint(); });
      return;
    }
    if ((b = t.closest('[data-psell]'))) {
      var k = b.dataset.psell, sd2 = SEEDS[k], n = s.fruits[k];
      var d = M.modal('<h3>' + sd2.fruit + ' ' + sd2.name + ' 팔기</h3><p>하나에 <img class="inl" src="img/coin.png" alt="">' + sd2.sell + ' · ' + n + '개 있어요</p><div class="row2"><button class="btn" data-sell1>1개 팔기</button><button class="btn primary" data-sellall>모두 팔기</button></div><button class="btn ghost wide" data-close>닫기</button>');
      d.addEventListener('click', function (e2) {
        var m = e2.target.closest('[data-sell1]') ? 1 : e2.target.closest('[data-sellall]') ? s.fruits[k] : 0; if (!m) return;
        s.fruits[k] -= m; M.give({ coins: sd2.sell * m }); M.sfx('coin'); M.save(); d.close(); repaint();
      });
    }
  });
  M.potTest = { S: S, update: update, H: H };   // 자동 점검용
})();
