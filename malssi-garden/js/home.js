// 말씨정원 집: 토끼 키우기와 방 꾸미기
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  var FOODS = [
    { id: 'carrot', e: '🥕', name: '당근', price: 10, exp: 10, full: 25 },
    { id: 'berry', e: '🍓', name: '딸기', price: 25, exp: 25, full: 35 },
    { id: 'cake', e: '🍰', name: '케이크', price: 60, exp: 70, full: 50 }
  ];
  // 가구: [id, 이모지, 이름, 가격, 놓는 곳(w 벽, f 바닥, r 깔개), 방 너비 대비 크기(%)]. 그림은 img/furn-<id>.png
  var FURN = [
    ['bed', '🛏️', '침대', 150, 'f', 30], ['rug', '🌸', '꽃무늬 러그', 60, 'r', 32], ['rug2', '🟩', '체크 러그', 60, 'r', 30], ['sofa', '🛋️', '소파', 200, 'f', 30],
    ['table', '🍽️', '꽃병 탁자', 120, 'f', 22], ['chair', '🪑', '의자', 50, 'f', 12], ['books', '📚', '책장', 100, 'f', 18], ['lamp', '💡', '스탠드', 70, 'f', 11],
    ['window', '🪟', '창문', 90, 'w', 22], ['plant', '🪴', '화분', 40, 'f', 13], ['clock', '🕰️', '벽시계', 60, 'w', 11], ['frame', '🖼️', '액자', 50, 'w', 12],
    ['cushion', '🎀', '쿠션', 30, 'f', 11], ['toys', '🧸', '장난감 상자', 80, 'f', 17], ['petbed', '🥕', '당근 방석', 120, 'f', 17], ['desk', '🖥️', '책상', 150, 'f', 24],
    ['tea', '🫖', '찻잔 세트', 70, 'f', 14], ['shelf', '🏺', '벽 선반', 60, 'w', 20], ['lights', '✨', '꼬마전구', 90, 'w', 44], ['fish', '🐠', '어항', 160, 'f', 20],
    ['sakura', '🌸', '벚꽃 화분', 250, 'f', 20]
  ].map(function (a) { return { id: a[0], e: a[1], name: a[2], price: a[3], wall: a[4] === 'w', rug: a[4] === 'r', size: a[5] }; });
  M.FURN = FURN; M.FOODS = FOODS;

  var LINES = ['오늘도 같이 공부해요!', '레슨 한 판 할까요?', '정원에 꽃이 피면 좋겠어요 🌸', '말을 배우면 씨앗이 자라요!', '쓰다듬어 줘서 고마워요 💕', '오늘 목표까지 조금만 더!'];
  var editing = false, mood = '';

  M.petFull = function () {
    var p = M.P.pet; return Math.max(0, Math.round(p.full - (Date.now() - p.fullAt) / 86400000 * 25));
  };
  var FULL_MAX = 150;   // 100 을 넘으면 ‘아주 배부름’
  M.petFullPct = function () { return Math.min(100, Math.round(M.petFull() / FULL_MAX * 100));
  };
  M.petStage = function () { var l = M.P.pet.lv; return l >= 10 ? 3 : l >= 5 ? 2 : 1; };
  function needExp(lv) { return 15 + lv * 10; }
  M.petImg = function (face) {
    face = face || (M.petFull() < 30 ? 'sad' : 'normal');
    return 'img/pet-' + M.petStage() + '-' + face + '.png';
  };
  M.petExp = function (n) { addExp(n); };
  function addExp(n) {
    var p = M.P.pet, before = M.petStage(), up = false;
    p.exp += n;
    while (p.exp >= needExp(p.lv) && p.lv < 30) { p.exp -= needExp(p.lv); p.lv++; up = true; }
    M.save();
    if (up) {
      M.sfx('win');
      var grown = M.petStage() !== before;
      M.modal('<div class="center"><img class="bigpet popin" src="' + M.petImg('happy') + '" alt=""><h3>' + (grown ? esc(M.j(M.P.petName, '이가', '가')) + ' 자랐어요!' : '레벨 업! Lv.' + p.lv) + '</h3><p>이제 레슨에서 물방울을 <b>' + M.petBonus() + '%</b> 더 받아요.</p><button class="btn primary wide" data-close>좋아요</button></div>');
    }
  }

  M.renderHome = function (root) {
    var P = M.P, p = P.pet, full = M.petFull();
    var face = mood || (full < 30 ? 'sad' : 'normal');
    var line = full < 30 ? '배고파요… 🥕 먹이를 주세요' : M.pick(LINES);
    var placed = Object.keys(P.room.placed).map(function (id) { return FURN.filter(function (f) { return f.id === id; })[0]; }).filter(Boolean);
    placed.sort(function (a, b) { return P.room.placed[a.id].y - P.room.placed[b.id].y; });
    var h = '<div class="home">' +
      '<div class="room' + (editing ? ' editing' : '') + '" id="room">' +
      placed.map(function (f) { var pos = P.room.placed[f.id]; return '<div class="furn' + (f.wall ? ' onwall' : '') + '" data-f="' + f.id + '" style="left:' + pos.x + '%;top:' + pos.y + '%;width:' + f.size + '%;z-index:' + (f.rug ? 1 : Math.round(pos.y)) + '"><img src="img/furn-' + f.id + '.png" alt="' + esc(f.name) + '" draggable="false"></div>'; }).join('') +
      '<div class="pet" id="pet" style="z-index:70"><div class="bubble" id="petSay">' + esc(line) + '</div><img id="petImg" src="' + M.petImg(face) + '" alt="' + esc(P.petName) + '"></div>' +
      (editing ? '<div class="edithint">가구를 끌어서 옮기고, 누르면 보관할 수 있어요</div>' : '') +
      '</div>' +
      '<div class="card petcard"><div class="pname"><b>' + esc(P.petName) + '</b> <span class="lv">Lv.' + p.lv + '</span><span class="bonus">💧 +' + M.petBonus() + '%</span></div>' +
      '<div class="meter"><span>친밀도</span><div class="mbar"><i style="width:' + Math.round(p.exp / needExp(p.lv) * 100) + '%"></i></div><small>' + p.exp + '/' + needExp(p.lv) + '</small></div>' +
      '<div class="meter"><span>배부름</span><div class="mbar full"><i style="width:' + M.petFullPct() + '%"></i></div><small>' + (full >= 100 ? '아주 배부름' : full < 30 ? '배고파요' : full + '%') + '</small></div>' +
      '<div class="row3"><button class="btn primary" id="hFeed">🥕 먹이 주기</button><button class="btn" id="hShop">🛋️ 가구 상점</button><button class="btn' + (editing ? ' on' : '') + '" id="hEdit">' + (editing ? '✅ 꾸미기 끝' : '✏️ 꾸미기') + '</button></div>' +
      '<p class="hint">레벨 5와 10이 되면 ' + esc(M.j(P.petName, '이가', '가')) + ' 자라요. 레벨이 오를수록 레슨에서 물방울을 더 받아요.</p></div></div>';
    root.innerHTML = h;
  };
  function rerender() { var r = $('homeView'); if (r) M.renderHome(r); }

  function feedSheet() {
    var full = M.petFull();
    var d = M.modal('<h3>먹이 주기</h3><p class="hint">배부름 ' + full + ' / ' + FULL_MAX + ' · 하루에 25씩 줄어요</p><div class="list">' + FOODS.map(function (f) {
      return '<button class="litem" data-food="' + f.id + '"><span class="le">' + f.e + '</span><span class="ln">' + f.name + '<small>친밀도 +' + f.exp + ' · 배부름 +' + f.full + '</small></span><span class="lp"><img src="img/coin.png" alt="">' + f.price + '</span></button>';
    }).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-food]'); if (!b) return;
      var f = FOODS.filter(function (x) { return x.id === b.dataset.food; })[0];
      if (M.petFull() >= FULL_MAX) { M.toast('배불러서 더 못 먹어요 😊 내일 또 주세요'); return; }
      if (!M.spend('coins', f.price)) { M.toast('코인이 부족해요. 정원에서 수확하면 코인이 나와요'); return; }
      var p = M.P.pet; p.full = Math.min(FULL_MAX, M.petFull() + f.full); p.fullAt = Date.now();
      M.quest('feed', 1); M.sfx('pop'); d.close();
      happy(f.e + ' 냠냠! 맛있어요!');
      addExp(f.exp);
    });
  }
  function happy(text) {
    mood = 'happy'; rerender();
    var s = $('petSay'); if (s && text) s.textContent = text;
    hearts();
    clearTimeout(happy.t); happy.t = setTimeout(function () { mood = ''; var i = $('petImg'); if (i) i.src = M.petImg(); }, M.fast ? 0 : 1600);
  }
  function hearts() {
    var pet = $('pet'); if (!pet) return;
    for (var i = 0; i < 4; i++) {
      var h = document.createElement('span'); h.className = 'heart'; h.textContent = M.pick(['💕', '💗', '✨']);
      h.style.left = (30 + Math.random() * 40) + '%'; h.style.animationDelay = (i * 0.12) + 's';
      pet.appendChild(h); setTimeout(h.remove.bind(h), 1400);
    }
  }
  function furnShop() {
    var P = M.P;
    var d = M.modal('<h3>가구 상점</h3><p class="hint">산 가구는 방에 놓이고, 꾸미기에서 옮길 수 있어요</p><div class="list" id="fList"></div><button class="btn ghost wide" data-close>닫기</button>', { onClose: rerender });
    var paint = function () {
      d.querySelector('#fList').innerHTML = FURN.map(function (f) {
        var own = P.room.owned[f.id], on = !!P.room.placed[f.id];
        return '<button class="litem" data-fid="' + f.id + '"><span class="le"><img src="img/furn-' + f.id + '.png" alt=""></span><span class="ln">' + f.name + (own ? '<small>' + (on ? '방에 있어요 · 눌러서 보관' : '보관 중 · 눌러서 꺼내기') + '</small>' : '') + '</span>' +
          (own ? '<span class="lp own">' + (on ? '보관' : '꺼내기') + '</span>' : '<span class="lp"><img src="img/coin.png" alt="">' + f.price + '</span>') + '</button>';
      }).join('');
    };
    paint();
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-fid]'); if (!b) return;
      var f = FURN.filter(function (x) { return x.id === b.dataset.fid; })[0];
      if (P.room.owned[f.id]) { togglePlace(f); paint(); return; }
      if (!M.spend('coins', f.price)) { M.toast('코인이 ' + (f.price - P.coins) + '개 더 필요해요'); return; }
      P.room.owned[f.id] = true; togglePlace(f); M.sfx('coin'); M.toast(M.j(f.name, '을', '를') + ' 샀어요! 방에 놓았어요'); paint();
    });
  }
  function togglePlace(f) {
    var P = M.P;
    if (P.room.placed[f.id]) delete P.room.placed[f.id];
    else P.room.placed[f.id] = { x: 15 + Math.random() * 70, y: f.wall ? 24 + Math.random() * 18 : f.rug ? 80 + Math.random() * 8 : 66 + Math.random() * 22 };
    M.save();
  }

  // 꾸미기: 가구 끌기
  var fd = null;
  document.addEventListener('pointerdown', function (e) {
    if (!editing) return;
    var el = e.target.closest && e.target.closest('#room .furn'); if (!el) return;
    var r = $('room').getBoundingClientRect();
    fd = { el: el, id: el.dataset.f, r: r, x: e.clientX, y: e.clientY, moved: false, pid: e.pointerId };
    el.classList.add('drag');
  });
  document.addEventListener('pointermove', function (e) {
    if (!fd || e.pointerId !== fd.pid) return;
    if (Math.abs(e.clientX - fd.x) + Math.abs(e.clientY - fd.y) > 6) fd.moved = true;
    if (!fd.moved) return;
    var x = Math.max(5, Math.min(95, (e.clientX - fd.r.left) / fd.r.width * 100));
    var y = Math.max(5, Math.min(92, (e.clientY - fd.r.top) / fd.r.height * 100));
    fd.el.style.left = x + '%'; fd.el.style.top = y + '%'; if (!FURN.filter(function (f) { return f.id === fd.id; })[0].rug) fd.el.style.zIndex = Math.round(y);
    fd.pos = { x: x, y: y }; e.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerup', function (e) {
    if (!fd || e.pointerId !== fd.pid) return;
    var d = fd; fd = null; d.el.classList.remove('drag');
    if (d.moved && d.pos) { M.P.room.placed[d.id] = d.pos; M.save(); return; }
    var f = FURN.filter(function (x) { return x.id === d.id; })[0];
    M.confirm(f.e + ' ' + f.name, '이 가구를 보관할까요? 가구 상점에서 다시 꺼낼 수 있어요.', '보관하기', function () { togglePlace(f); rerender(); });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('#hFeed')) feedSheet();
    else if (e.target.closest('#hShop')) furnShop();
    else if (e.target.closest('#hEdit')) { editing = !editing; rerender(); }
    else if (e.target.closest('#pet') && !editing) {
      var p = M.P.pet, t = M.today();
      if (p.petDay !== t) { p.petDay = t; p.petN = 0; }
      M.sfx('pop'); M.buzz(10);
      if (p.petN < 5) { p.petN++; addExp(1); }
      happy(M.pick(['헤헤, 좋아요!', '간지러워요 😆', '오늘도 힘내요!', '사랑해요 💕']));
    }
  });
  M.homeEditing = function () { return editing; };
  M.stopEditing = function () { editing = false; };
})();
