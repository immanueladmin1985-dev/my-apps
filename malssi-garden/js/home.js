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
    ['sakura', '🌸', '벚꽃 화분', 250, 'f', 20],
    ['wardrobe', '🚪', '옷장', 220, 'f', 24], ['dresser', '🪞', '화장대', 200, 'f', 24], ['mirror', '🪞', '전신 거울', 120, 'f', 15], ['armchair', '🛋️', '분홍 안락의자', 180, 'f', 22],
    ['sidetable', '☕', '동그란 찻상', 90, 'f', 16], ['floorcush', '🟡', '방석 세트', 70, 'r', 22], ['piano', '🎹', '피아노', 400, 'f', 28], ['fireplace', '🔥', '벽난로', 350, 'f', 26],
    ['tv', '📺', 'TV 장', 260, 'f', 26], ['teatable', '🍪', '낮은 차 탁자', 140, 'f', 26], ['hangplant', '🌿', '걸이 화분', 80, 'w', 14], ['tulips', '🌷', '튤립 꽃병', 90, 'f', 13],
    ['kitchen', '🍳', '부엌 조리대', 380, 'f', 32], ['fridge', '🧊', '당근 냉장고', 300, 'f', 18], ['dining', '🍽️', '2인 식탁', 320, 'f', 32], ['coffee', '☕', '커피 머신', 160, 'f', 14],
    ['cakestand', '🧁', '컵케이크 진열대', 150, 'f', 14], ['cattower', '🐾', '캣타워', 200, 'f', 18], ['hutch', '🏠', '토끼 집', 300, 'f', 24], ['guitar', '🎸', '기타', 150, 'f', 13],
    ['plush', '🧸', '인형 더미', 180, 'f', 20], ['stars', '⭐', '별 가랜드', 80, 'w', 30], ['painting', '🖼️', '집 그림 액자', 120, 'w', 16],
    ['pl-monstera', '🪴', '몬스테라', 90, 'f', 14], ['pl-cactus', '🪴', '선인장', 40, 'f', 14], ['pl-succulent', '🪴', '다육이', 40, 'f', 14], ['pl-lavender', '🪴', '라벤더', 60, 'f', 14], ['pl-hydrangea', '🪴', '수국', 80, 'f', 14], ['pl-lily', '🪴', '백합', 70, 'f', 14], ['pl-tulip', '🪴', '튤립 화분', 50, 'f', 14], ['pl-pearls', '🪴', '구슬 덩굴', 70, 'f', 14], ['pl-fern', '🪴', '고사리', 50, 'f', 14], ['pl-ivy', '🪴', '아이비', 60, 'f', 14], ['pl-calla', '🪴', '칼라', 70, 'f', 14], ['pl-poinsettia', '🪴', '포인세티아', 80, 'f', 14], ['pl-morningglory', '🪴', '나팔꽃', 60, 'f', 14], ['pl-carnation', '🪴', '카네이션', 60, 'f', 14], ['pl-clover', '🪴', '클로버', 40, 'f', 14], ['pl-aloe', '🪴', '알로에', 40, 'f', 14], ['dx-topiary', '🪴', '동글 나무', 90, 'f', 16], ['dx-barrel', '🪴', '나무통', 50, 'f', 16], ['dx-applecrate', '🪴', '사과 상자', 60, 'f', 16], ['dx-flowercart', '🪴', '꽃 수레', 150, 'f', 16], ['dx-tulipbox', '🪴', '튤립 상자', 80, 'f', 16]
  ].map(function (a) { return { id: a[0], e: a[1], name: a[2], price: a[3], wall: a[4] === 'w', rug: a[4] === 'r', size: a[5] }; });
  var FCAT = { plants: ['🪴 화분', 'pl-monstera,pl-cactus,pl-succulent,pl-lavender,pl-hydrangea,pl-lily,pl-tulip,pl-pearls,pl-fern,pl-ivy,pl-calla,pl-poinsettia,pl-morningglory,pl-carnation,pl-clover,pl-aloe'], living: ['🛋️ 거실', 'sofa,armchair,table,sidetable,teatable,tv,fireplace,books,lamp,piano'], bed: ['🛏️ 침실', 'bed,wardrobe,dresser,mirror,desk,chair,cushion'],
    kitchen: ['🍳 부엌', 'kitchen,fridge,dining,coffee,cakestand,tea'], deco: ['🌷 장식', 'plant,sakura,tulips,hangplant,fish,toys,plush,guitar,petbed,cattower,hutch,dx-topiary,dx-barrel,dx-applecrate,dx-flowercart,dx-tulipbox'],
    wall: ['🖼️ 벽', 'window,clock,frame,shelf,lights,stars,painting'], rug: ['🧶 깔개', 'rug,rug2,floorcush'] };
  var fcat = 'living';
  var WALLS = [{ id: 0, name: '기본 (아이보리)', price: 0, src: 'img/bg-room.jpg' }, { id: 1, name: '분홍 줄무늬', price: 300, src: 'img/wall-1.jpg' }, { id: 2, name: '민트 물방울', price: 300, src: 'img/wall-2.jpg' },
    { id: 3, name: '꽃무늬·분홍 카펫', price: 400, src: 'img/wall-3.jpg' }, { id: 4, name: '밤하늘 별빛', price: 500, src: 'img/wall-4.jpg' }];
  // 소품: 토끼 그림 위에 겹쳐 그린다. x·y 는 토끼 그림 안의 위치(%), w 는 너비(%)
  var ACCS = [{ id: 'ribbon', name: '빨간 리본', price: 120, x: 66, y: 10, w: 32 }, { id: 'crown', name: '꽃 화관', price: 200, x: 50, y: 18, w: 56 }, { id: 'strawhat', name: '밀짚모자', price: 250, x: 50, y: 12, w: 64 },
    { id: 'chefhat', name: '요리사 모자', price: 250, x: 50, y: 12, w: 60 }, { id: 'glasses', name: '동그란 안경', price: 150, eyes: true }, { id: 'starpin', name: '별 머리핀', price: 100, x: 66, y: 26, w: 22 }];
  M.ACCS = ACCS;
  M.FURN = FURN; M.FOODS = FOODS;

  var LINES = ['오늘도 같이 공부해요!', '레슨 한 판 할까요?', '정원에 꽃이 피면 좋겠어요 🌸', '말을 배우면 씨앗이 자라요!', '쓰다듬어 줘서 고마워요 💕', '오늘 목표까지 조금만 더!'];
  var editing = false, mood = '', fsel = '';

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
    Object.keys(M.P.room.placed).forEach(function (id) {
      var f = FURN.filter(function (x) { return x.id === id; })[0], p = M.P.room.placed[id]; if (!f || !p) return;
      var hw = Math.min(50, f.size * (p.s || 1) / 2); p.x = Math.max(hw, Math.min(100 - hw, p.x));
    });
    var P = M.P, p = P.pet, full = M.petFull();
    var face = mood || (full < 30 ? 'sad' : 'normal');
    var line = full < 30 ? '배고파요… 🥕 먹이를 주세요' : M.pick(LINES);
    var placed = Object.keys(P.room.placed).map(function (id) { return FURN.filter(function (f) { return f.id === id; })[0]; }).filter(Boolean);
    placed.sort(function (a, b) { return P.room.placed[a.id].y - P.room.placed[b.id].y; });
    var h = '<div class="home">' +
      '<div class="room' + (editing ? ' editing' : '') + '" id="room" style="background-image:url(' + wallSrc() + ')">' +
      placed.map(function (f) { var pos = P.room.placed[f.id]; return '<div class="furn' + (f.wall ? ' onwall' : '') + (editing && fsel === f.id ? ' fsel' : '') + (pos.f ? ' flip' : '') + '" data-f="' + f.id + '" style="left:' + pos.x + '%;top:' + pos.y + '%;width:' + (f.size * (pos.s || 1)).toFixed(1) + '%;z-index:' + ((f.rug ? 1 : Math.round(pos.y)) + (pos.z || 0)) + '"><img src="img/furn-' + f.id + '.png" alt="' + esc(f.name) + '" draggable="false"></div>'; }).join('') +
      (M.potsRoomHtml ? M.potsRoomHtml() : '') +
      '<div class="pet" id="pet" style="z-index:70"><div class="bubble" id="petSay">' + esc(line) + '</div><div class="petfig"><img id="petImg" src="' + M.petImg(face) + '" alt="' + esc(P.petName) + '">' + accHtml(face) + '</div></div>' +
      (editing ? '<div class="edithint">' + (fsel ? '아래 버튼으로 크기·방향·순서를 바꿔요' : '가구를 끌어서 옮기고, 눌러서 골라요') + '</div>' : '') +
      '</div>' + (editing && fsel && P.room.placed[fsel] ? '<div class="ftools"><b>' + esc((FURN.filter(function (x) { return x.id === fsel; })[0] || {}).name || '') + '</b><button data-ft="small">－ 작게</button><button data-ft="big">＋ 크게</button><button data-ft="flip">↔ 뒤집기</button><button data-ft="front">⬆ 앞으로</button><button data-ft="back">⬇ 뒤로</button><button data-ft="store">📦 보관</button></div>' : '') +
      '<div id="potArea">' + (M.potsHtml ? M.potsHtml() : '') + '</div>' +
      '<div class="card petcard"><div class="pname"><b>' + esc(P.petName) + '</b> <span class="lv">Lv.' + p.lv + '</span><span class="bonus">💧 +' + M.petBonus() + '%</span></div>' +
      '<div class="meter"><span>친밀도</span><div class="mbar"><i style="width:' + Math.round(p.exp / needExp(p.lv) * 100) + '%"></i></div><small>' + p.exp + '/' + needExp(p.lv) + '</small></div>' +
      '<div class="meter"><span>배부름</span><div class="mbar full"><i style="width:' + M.petFullPct() + '%"></i></div><small>' + (full >= 100 ? '아주 배부름' : full < 30 ? '배고파요' : full + '%') + '</small></div>' +
      '<div class="row3 hx"><button class="btn" id="hMail">📮 우체통' + (M.mailUnread && M.mailUnread() ? ' <b class="nbadge">' + M.mailUnread() + '</b>' : '') + '</button><button class="btn" id="hCook">🍳 요리</button><button class="btn" id="hHouse">🔨 ' + (M.houseInfo ? M.houseInfo().name : '집') + '</button></div>' +
      '<div style="display:none" class="hup" id="hHouseOld"></div><div class="row3"><button class="btn primary" id="hFeed">🥕 먹이 주기</button><button class="btn" id="hShop">🛋️ 꾸미기 상점</button><button class="btn' + (editing ? ' on' : '') + '" id="hEdit">' + (editing ? '✅ 꾸미기 끝' : '✏️ 꾸미기') + '</button></div>' +
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
    clearTimeout(happy.t); happy.t = setTimeout(function () { mood = ''; setFace(); }, M.fast ? 0 : 1600);
  }
  function hearts() {
    var pet = $('pet'); if (!pet) return;
    for (var i = 0; i < 4; i++) {
      var h = document.createElement('span'); h.className = 'heart'; h.textContent = M.pick(['💕', '💗', '✨']);
      h.style.left = (30 + Math.random() * 40) + '%'; h.style.animationDelay = (i * 0.12) + 's';
      pet.appendChild(h); setTimeout(h.remove.bind(h), 1400);
    }
  }
  function wallSrc() { var w = WALLS[M.P.room.wall || 0] || WALLS[0]; return w.src; }
  // 토끼 그림마다 두 눈 가운데(x·y)와 눈 사이 거리(d), 그림 크기에 대한 % (그림에서 눈을 찾아 잰 값). 안경은 여기에 맞춘다
  var EYES = { '1-normal': [39.5, 51.8, 23.8], '1-happy': [44, 40.5, 20.2], '1-sad': [39.6, 56, 23.7], '2-normal': [46.3, 48.5, 23.1], '2-happy': [44.8, 43.9, 21.9],
    '2-sad': [49.1, 49.3, 23.2], '3-normal': [44.1, 44.5, 21.1], '3-happy': [41.1, 39.4, 20.3], '3-sad': [51.6, 50.7, 18.6] };
  function accStyle(a, face) {
    var st = M.petStage();
    if (a.eyes) { var e = EYES[st + '-' + (face || 'normal')] || EYES[st + '-normal']; return 'left:' + e[0] + '%;top:' + e[1] + '%;width:' + (e[2] * 2.1).toFixed(1) + '%'; }
    var dy = st === 1 ? 6 : st === 2 ? 3 : 0;   // 아기 토끼는 머리가 조금 낮다
    return 'left:' + a.x + '%;top:' + (a.y + dy) + '%;width:' + a.w + '%';
  }
  function accHtml(face) {
    var a = ACCS.filter(function (x) { return x.id === M.P.pet.acc; })[0]; if (!a) return '';
    return '<img class="acc" id="petAcc" src="img/acc-' + a.id + '.png" alt="" style="' + accStyle(a, face) + '">';
  }
  function setFace(face) {   // 표정을 바꾸면 안경도 같이 옮긴다
    var i = $('petImg'); if (i) i.src = M.petImg(face);
    var a = ACCS.filter(function (x) { return x.id === M.P.pet.acc; })[0], el = $('petAcc');
    if (a && el) el.setAttribute('style', accStyle(a, face || (M.petFull() < 30 ? 'sad' : 'normal')));
  }
  M.furnShop = function (t) { furnShop(t); };
  function furnShop(startTab) {
    var P = M.P;
    var tab = startTab || 'furn';
    var d = M.modal('<h3>🛋️ 꾸미기 상점</h3><div class="tabs"><button data-st="furn">가구</button><button data-st="wall">벽지·바닥</button><button data-st="acc">' + esc(P.petName) + ' 소품</button><button data-st="seed">씨앗·비료</button></div><p class="hint" id="fHint"></p><div class="list" id="fList"></div><button class="btn ghost wide" data-close>닫기</button>', { onClose: rerender });
    var tabs = function () { Array.prototype.forEach.call(d.querySelectorAll('[data-st]'), function (b) { b.classList.toggle('on', b.dataset.st === tab); }); };
    var paintOther = function () {
      var R = P.room, ow = R.walls || {}, oa = P.pet.accs || {};
      if (tab === 'seed') { M.seedTab(d.querySelector('#fList'), d.querySelector('#fHint')); return; }
      d.querySelector('#fList').onclick = null;
      if (tab === 'wall') {
        d.querySelector('#fHint').textContent = '방 전체의 벽지와 바닥을 바꿔요';
        d.querySelector('#fList').innerHTML = '<div class="walls">' + WALLS.map(function (w) {
          var own = !w.price || ow[w.id], on = (R.wall || 0) === w.id;
          return '<button class="wallc' + (on ? ' on' : '') + '" data-wid="' + w.id + '"><img src="' + w.src + '" alt=""><b>' + w.name + '</b><small>' + (on ? '사용 중' : own ? '바꾸기' : '<img src="img/coin.png" alt="">' + w.price) + '</small></button>';
        }).join('') + '</div>';
      } else {
        d.querySelector('#fHint').textContent = M.j(P.petName, '이', '') + '에게 하나씩 씌울 수 있어요';
        d.querySelector('#fList').innerHTML = ACCS.map(function (a) {
          var own = oa[a.id], on = P.pet.acc === a.id;
          return '<button class="litem" data-aid="' + a.id + '"><span class="le"><img src="img/acc-' + a.id + '.png" alt=""></span><span class="ln">' + a.name + (own ? '<small>' + (on ? '쓰고 있어요 · 눌러서 벗기' : '눌러서 씌우기') + '</small>' : '') + '</span>' +
            (own ? '<span class="lp own">' + (on ? '벗기' : '쓰기') + '</span>' : '<span class="lp"><img src="img/coin.png" alt="">' + a.price + '</span>') + '</button>';
        }).join('');
      }
    };
    var paint = function () {
      tabs();
      if (tab !== 'furn') { paintOther(); return; }
      d.querySelector('#fHint').innerHTML = '<span class="fcats">' + Object.keys(FCAT).map(function (k) { return '<button data-fc="' + k + '" class="' + (k === fcat ? 'on' : '') + '">' + FCAT[k][0] + '</button>'; }).join('') + '</span>';
      var ids = FCAT[fcat][1].split(',');
      d.querySelector('#fList').innerHTML = '<div class="fgrid">' + FURN.filter(function (f) { return ids.indexOf(f.id) >= 0; }).map(function (f) {
        var own = P.room.owned[f.id], on = !!P.room.placed[f.id];
        return '<button class="fcard' + (on ? ' on' : '') + '" data-fid="' + f.id + '"><img src="img/furn-' + f.id + '.png" alt=""><b>' + f.name + '</b>' +
          (own ? '<small class="own">' + (on ? '방에 있음 · 보관' : '꺼내기') + '</small>' : '<small class="price"><img src="img/coin.png" alt="">' + f.price + '</small>') + '</button>';
      }).join('') + '</div>';
    };
    paint();
    d.addEventListener('click', function (e) {
      var tb = e.target.closest('[data-st]'); if (tb) { tab = tb.dataset.st; paint(); return; }
      var fc = e.target.closest('[data-fc]'); if (fc) { fcat = fc.dataset.fc; paint(); return; }
      var wb = e.target.closest('[data-wid]');
      if (wb) {
        var w = WALLS[+wb.dataset.wid]; P.room.walls = P.room.walls || {};
        if (w.price && !P.room.walls[w.id]) { if (!M.spend('coins', w.price)) { M.toast('코인이 ' + (w.price - P.coins) + '개 더 필요해요'); return; } P.room.walls[w.id] = true; M.sfx('coin'); }
        P.room.wall = w.id; M.save(); M.toast('🏠 벽지를 ' + M.j(w.name, '으로', '로') + ' 바꿨어요'); paint(); rerender(); return;
      }
      var ab = e.target.closest('[data-aid]');
      if (ab) {
        var a = ACCS.filter(function (x) { return x.id === ab.dataset.aid; })[0]; P.pet.accs = P.pet.accs || {};
        if (!P.pet.accs[a.id]) { if (!M.spend('coins', a.price)) { M.toast('코인이 ' + (a.price - P.coins) + '개 더 필요해요'); return; } P.pet.accs[a.id] = true; M.sfx('coin'); }
        P.pet.acc = P.pet.acc === a.id ? '' : a.id; M.save(); paint(); rerender(); return;
      }
      var b = e.target.closest('[data-fid]'); if (!b) return;
      var f = FURN.filter(function (x) { return x.id === b.dataset.fid; })[0];
      if (P.room.owned[f.id]) { togglePlace(f); paint(); return; }
      if (!M.spend('coins', f.price)) { M.toast('코인이 ' + (f.price - P.coins) + '개 더 필요해요'); return; }
      P.room.owned[f.id] = true; togglePlace(f); M.sfx('coin'); M.toast(M.j(f.name, '을', '를') + ' 샀어요! ✏️ 꾸미기를 누르면 원하는 곳으로 옮길 수 있어요'); paint();
    });
  }
  function togglePlace(f) {
    var P = M.P;
    if (P.room.placed[f.id]) delete P.room.placed[f.id];
    else {
      // 토끼(가운데 아래)를 가리지 않게 양옆에 놓는다
      var half = f.size / 2 + 2, room = Math.max(0, 34 - half);   // 가구가 방 밖으로 나가지 않게
      var side = Math.random() < 0.5, x = f.wall ? half + Math.random() * (100 - 2 * half) : side ? half + Math.random() * room : 100 - half - Math.random() * room;
      P.room.placed[f.id] = { x: x, y: f.wall ? 18 + Math.random() * 22 : f.rug ? 84 + Math.random() * 6 : 64 + Math.random() * 16 };
    }
    M.save();
  }

  // 꾸미기: 가구 끌기
  var fd = null;
  document.addEventListener('pointerdown', function (e) {
    if (!editing) return;
    var el = e.target.closest && e.target.closest('#room .furn'); if (!el) return;
    var r = $('room').getBoundingClientRect();
    var cur = M.P.room.placed[el.dataset.f] || { x: 50, y: 50 };
    // 누른 지점과 가구 중심의 차이를 기억해서, 가구가 손가락 위치로 튀지 않게 한다
    fd = { el: el, id: el.dataset.f, r: r, x: e.clientX, y: e.clientY, moved: false, pid: e.pointerId, ox: (e.clientX - r.left) / r.width * 100 - cur.x, oy: (e.clientY - r.top) / r.height * 100 - cur.y };
    el.classList.add('drag');
  });
  document.addEventListener('pointermove', function (e) {
    if (!fd || e.pointerId !== fd.pid) return;
    if (Math.abs(e.clientX - fd.x) + Math.abs(e.clientY - fd.y) > 6) fd.moved = true;
    if (!fd.moved) return;
    var fw = Math.min(50, (FURN.filter(function (f) { return f.id === fd.id; })[0] || { size: 10 }).size * ((M.P.room.placed[fd.id] || {}).s || 1) / 2);
    var x = Math.max(fw, Math.min(100 - fw, (e.clientX - fd.r.left) / fd.r.width * 100 - fd.ox));
    var y = Math.max(5, Math.min(95, (e.clientY - fd.r.top) / fd.r.height * 100 - fd.oy));
    fd.el.style.left = x + '%'; fd.el.style.top = y + '%'; if (!FURN.filter(function (f) { return f.id === fd.id; })[0].rug) fd.el.style.zIndex = Math.round(y) + ((M.P.room.placed[fd.id] || {}).z || 0);
    fd.pos = { x: x, y: y }; e.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerup', function (e) {
    if (!fd || e.pointerId !== fd.pid) return;
    var d = fd; fd = null; d.el.classList.remove('drag');
    var cur = M.P.room.placed[d.id] || {};
    if (d.moved && d.pos) { cur.x = d.pos.x; cur.y = d.pos.y; M.P.room.placed[d.id] = cur; fsel = d.id; M.save(); rerender(); return; }
    fsel = fsel === d.id ? '' : d.id; rerender();
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('#hFeed')) feedSheet();
    else if (e.target.closest('#hShop')) furnShop();
    else if (e.target.closest('#hHouse')) M.houseSheet();
    else if (e.target.closest('#hMail')) M.mailSheet();
    else if (e.target.closest('#hCook')) M.cookSheet();
    else if (e.target.closest('#hEdit')) { editing = !editing; fsel = ''; rerender(); }
    else if (e.target.closest('[data-ft]') && fsel) {
      var a = e.target.closest('[data-ft]').dataset.ft, pos = M.P.room.placed[fsel], f = FURN.filter(function (x) { return x.id === fsel; })[0];
      if (a === 'small') pos.s = Math.max(0.5, (pos.s || 1) - 0.15);
      else if (a === 'big') pos.s = Math.min(2.2, (pos.s || 1) + 0.15);
      else if (a === 'flip') pos.f = !pos.f;
      else if (a === 'front') pos.z = (pos.z || 0) + 30;
      else if (a === 'back') pos.z = (pos.z || 0) - 30;
      else if (a === 'store') { togglePlace(f); fsel = ''; }
      M.sfx('tap'); M.save(); rerender();
    }
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
