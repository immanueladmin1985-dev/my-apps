// 화분 키우기 (말씨정원). 토끼 집의 화분 선반에서 실제 시간으로 키운다.
//  - 물을 주면(물방울) 12시간 촉촉하고, 촉촉한 동안만 자란다. 마르면 멈추고 시들어 보이지만 죽지는 않는다.
//  - 비료는 전체 성장 시간의 1/4을 바로 앞당긴다(화분마다 2번까지).
//  - 다 자라면 열매를 딴다. 열매는 팔거나 주민에게 선물한다(하루 한 번, 친밀도 +1).
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  var H = 3600 * 1000, WET = 12 * H, WATER_COST = 3, FERT_PRICE = 15;
  // 그림이 오면 img: true 로 켠다 (img/plant-<id>-<1~5>.png, img/fruit-<id>.png)
  var SEEDS = {
    strawberry: { name: '딸기', hours: 4, price: 20, yield: 3, sell: 12, st: ['🌱', '🌿', '☘️', '🌼', '🍓'], fruit: '🍓', lv: 1 },
    tomato: { name: '토마토', hours: 6, price: 30, yield: 3, sell: 16, st: ['🌱', '🌿', '🪴', '🌼', '🍅'], fruit: '🍅', lv: 1 },
    sunflower: { name: '해바라기', hours: 8, price: 40, yield: 2, sell: 18, fp: 3, st: ['🌱', '🌿', '🪴', '🌻', '🌻'], fruit: '🌻', lv: 3 },
    rose: { name: '장미', hours: 12, price: 60, yield: 2, sell: 28, fp: 5, st: ['🌱', '🌿', '🪴', '🥀', '🌹'], fruit: '🌹', lv: 5 },
    lemon: { name: '레몬나무', hours: 24, price: 90, yield: 4, sell: 30, st: ['🌱', '🌿', '🪴', '🌳', '🍋'], fruit: '🍋', lv: 7 }
  };
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
    return sd.img ? '<img src="img/plant-' + p.id + '-' + sg + '.png" alt="">' : '<span class="pe s' + sg + '">' + sd.st[sg - 1] + '</span>';
  }
  M.potsHtml = function () {
    var s = S(), now = Date.now();
    s.list.forEach(function (p) { if (p) update(p, now); });
    var fruits = Object.keys(s.fruits).filter(function (k) { return s.fruits[k] > 0; });
    return '<div class="card potshelf"><div class="pots-h"><b>🪴 화분 선반</b><small>실제 시간으로 자라요 · 물 주기 💧' + WATER_COST + '</small></div><div class="potrow">' +
      s.list.map(function (p, i) {
        if (!p) return '<button class="pot0" data-pplant="' + i + '"><span class="pe">🪴</span><b>씨앗 심기</b></button>';
        var sd = SEEDS[p.id], r = ripe(p), w = wet(p), left = total(p) - p.t;
        return '<div class="potc' + (r ? ' ripe' : '') + (!w && !r ? ' dry' : '') + '"><div class="pfig">' + plantFace(p) + '<span class="pbase">🟫</span></div>' +
          '<b>' + sd.name + '</b><div class="mbar"><i style="width:' + Math.round(p.t / total(p) * 100) + '%"></i></div>' +
          '<small>' + (r ? '다 자랐어요!' : w ? '촉촉 ' + fmt(p.wet - now) + ' · 남은 ' + fmt(left) : '물이 말랐어요 · 성장 멈춤') + '</small>' +
          (r ? '<button class="btn primary sm" data-pharv="' + i + '">수확하기</button>' :
            '<div class="pbtns"><button class="btn sm' + (w ? '' : ' primary') + '" data-pwater="' + i + '">💧 물</button><button class="btn sm" data-pfert="' + i + '"' + ((p.f || 0) >= 2 ? ' disabled' : '') + '>🧪 비료</button></div>') + '</div>';
      }).join('') +
      (s.slots < 6 ? '<button class="pot0 add" data-pslot><span class="pe">➕</span><b>화분 자리 늘리기</b><small><img class="inl" src="img/coin.png" alt="">' + SLOT_COST[s.slots] + '</small></button>' : '') +
      '</div><div class="basket"><b>🧺 열매 바구니</b>' + (fruits.length ? fruits.map(function (k) { return '<button class="fruit" data-psell="' + k + '">' + SEEDS[k].fruit + '<i>' + s.fruits[k] + '</i></button>'; }).join('') + '<small>누르면 팔 수 있어요 · 주민에게 선물도 돼요</small>' : '<small>아직 비어 있어요</small>') +
      '<span class="binv">씨앗 ' + Object.keys(s.seeds).reduce(function (a, k) { return a + (s.seeds[k] || 0); }, 0) + ' · 비료 ' + s.fert + '</span></div></div>';
  };
  function repaint() { var a = $('potArea'); if (a) a.innerHTML = M.potsHtml(); if (M.paintBadges) M.paintBadges(); }
  M.paintPots = repaint;

  function plantSheet(i) {
    var s = S(), have = Object.keys(SEEDS).filter(function (k) { return s.seeds[k] > 0; });
    if (!have.length) { M.confirm('씨앗이 없어요', '마을의 <b>잡화점</b>이나 꾸미기 상점의 <b>씨앗·비료</b> 탭에서 씨앗을 사 오세요.', '지금 사러 가기', function () { M.furnShop('seed'); }); return; }
    var d = M.modal('<h3>🌱 어떤 씨앗을 심을까요?</h3><div class="list">' + have.map(function (k) { var sd = SEEDS[k]; return '<button class="litem" data-sk="' + k + '"><span class="le">' + sd.fruit + '</span><span class="ln">' + sd.name + ' <small>' + sd.hours + '시간 · 열매 ' + sd.yield + '개' + (sd.fp ? ' · 꽃 포인트' : '') + '</small></span><span class="lp own">' + s.seeds[k] + '개</span></button>'; }).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>');
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
    var d = M.modal('<h3>🎁 ' + esc(M.j(c.name, '이', '')) + '에게 무엇을 줄까요?</h3><div class="basket big">' + ks.map(function (k) { return '<button class="fruit" data-gk="' + k + '">' + SEEDS[k].fruit + '<i>' + s.fruits[k] + '</i></button>'; }).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>');
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
      M.modal('<div class="center"><div class="tbig">' + sd.fruit.repeat(Math.min(4, sd.yield)) + '</div><h3>' + sd.name + ' ' + sd.yield + '개를 땄어요!</h3>' + (sd.fp ? '<p>' + M.rewardHtml({ fp: sd.fp }) + '</p>' : '') + '<p class="hint">열매 바구니에 넣었어요. 팔거나 주민에게 선물해 보세요.</p><button class="btn primary wide" data-close>좋아요</button></div>');
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
