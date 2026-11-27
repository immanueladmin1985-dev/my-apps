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
    ['plush', '🧸', '인형 더미', 180, 'f', 20], ['fishbowl', '🐟', '작은 어항', 120, 'f', 15], ['aquarium', '🐠', '큰 수족관', 450, 'f', 30], ['bugcase', '🪲', '곤충 채집 상자', 300, 'f', 23], ['bugframe', '🦋', '곤충 표본 액자', 200, 'w', 17], ['stars', '⭐', '별 가랜드', 80, 'w', 30], ['painting', '🖼️', '집 그림 액자', 120, 'w', 16],
    ['pl-monstera', '🪴', '몬스테라', 90, 'f', 14], ['pl-cactus', '🪴', '선인장', 40, 'f', 14], ['pl-succulent', '🪴', '다육이', 40, 'f', 14], ['pl-lavender', '🪴', '라벤더', 60, 'f', 14], ['pl-hydrangea', '🪴', '수국', 80, 'f', 14], ['pl-lily', '🪴', '백합', 70, 'f', 14], ['pl-tulip', '🪴', '튤립 화분', 50, 'f', 14], ['pl-pearls', '🪴', '구슬 덩굴', 70, 'f', 14], ['pl-fern', '🪴', '고사리', 50, 'f', 14], ['pl-ivy', '🪴', '아이비', 60, 'f', 14], ['pl-calla', '🪴', '칼라', 70, 'f', 14], ['pl-poinsettia', '🪴', '포인세티아', 80, 'f', 14], ['pl-morningglory', '🪴', '나팔꽃', 60, 'f', 14], ['pl-carnation', '🪴', '카네이션', 60, 'f', 14], ['pl-clover', '🪴', '클로버', 40, 'f', 14], ['pl-aloe', '🪴', '알로에', 40, 'f', 14], ['dx-topiary', '🪴', '동글 나무', 90, 'f', 16], ['dx-barrel', '🪴', '나무통', 50, 'f', 16], ['dx-applecrate', '🪴', '사과 상자', 60, 'f', 16], ['dx-flowercart', '🪴', '꽃 수레', 150, 'f', 16], ['dx-tulipbox', '🪴', '튤립 상자', 80, 'f', 16]
  ].map(function (a) { return { id: a[0], e: a[1], name: a[2], price: a[3], wall: a[4] === 'w', rug: a[4] === 'r', size: a[5] }; });
  var FCAT = { plants: ['🪴 화분', 'pl-monstera,pl-cactus,pl-succulent,pl-lavender,pl-hydrangea,pl-lily,pl-tulip,pl-pearls,pl-fern,pl-ivy,pl-calla,pl-poinsettia,pl-morningglory,pl-carnation,pl-clover,pl-aloe'], living: ['🛋️ 거실', 'sofa,armchair,table,sidetable,teatable,tv,fireplace,books,lamp,piano'], bed: ['🛏️ 침실', 'bed,wardrobe,dresser,mirror,desk,chair,cushion'],
    kitchen: ['🍳 부엌', 'kitchen,fridge,dining,coffee,cakestand,tea'], deco: ['🌷 장식', 'fishbowl,aquarium,bugcase,bugframe,plant,sakura,tulips,hangplant,fish,toys,plush,guitar,petbed,cattower,hutch,dx-topiary,dx-barrel,dx-applecrate,dx-flowercart,dx-tulipbox'],
    wall: ['🖼️ 벽', 'window,clock,frame,shelf,lights,stars,painting'], rug: ['🧶 깔개', 'rug,rug2,floorcush'] };
  var fcat = 'living';
  var WALLS = [{ id: 0, name: '기본 (아이보리)', price: 0, src: 'img/bg-room.jpg' }, { id: 1, name: '분홍 줄무늬', price: 300, src: 'img/wall-1.jpg' }, { id: 2, name: '민트 물방울', price: 300, src: 'img/wall-2.jpg' },
    { id: 3, name: '꽃무늬·분홍 카펫', price: 400, src: 'img/wall-3.jpg' }, { id: 4, name: '밤하늘 별빛', price: 500, src: 'img/wall-4.jpg' }];
  WALLS.forEach(function (w) { var b = w.src.replace('.jpg', ''); w.wl = b + '-w.webp'; w.fl = b + '-f.webp'; });
  WALLS.push({ id: 5, name: '옥상 정원 (하늘)', price: 0, src: 'img/room-roof.jpg', roof: true });
  // 벽·바닥 색: 무늬는 그대로 두고 색만 바꾼다 (CSS 필터)
  // [바닥 필터, 이름, 견본 색, 벽에 곱할 색]
  var TINTS = [['', '원래 색', '#e9dcc6', ''], ['sepia(1) saturate(1.7) hue-rotate(300deg) brightness(1.02)', '분홍', '#f6b7c8', '#ffc4dc'], ['sepia(1) saturate(1.6) hue-rotate(168deg) brightness(1.04)', '하늘', '#a9d4f2', '#c8ecff'],
    ['sepia(1) saturate(1.3) hue-rotate(80deg) brightness(1.04)', '민트', '#b4e3b8', '#bdeccb'], ['sepia(1) saturate(1.5) hue-rotate(228deg) brightness(1.03)', '보라', '#c9b4ef', '#d6c2ff'], ['sepia(.9) saturate(2.2) hue-rotate(8deg) brightness(1.05)', '노랑', '#f4dc8a', '#fff0a0'],
    ['sepia(.9) saturate(2) hue-rotate(345deg) brightness(1)', '주황', '#f3b483', '#ffcf9f'], ['grayscale(1) brightness(1.05)', '회색', '#cfcfcf', '#d4d4d4'], ['brightness(.72) saturate(1.2)', '짙게', '#9a7656', '#b0927a'], ['brightness(1.18) saturate(.7)', '밝게', '#f4ead9', '']];
  // 소품: 토끼 그림 위에 겹쳐 그린다. x·y 는 토끼 그림 안의 위치(%), w 는 너비(%)
  var ACCS = [{ id: 'ribbon', name: '빨간 리본', price: 120, x: 66, y: 10, w: 32 }, { id: 'crown', name: '꽃 화관', price: 200, x: 50, y: 18, w: 56 }, { id: 'strawhat', name: '밀짚모자', price: 250, x: 50, y: 12, w: 64 },
    { id: 'chefhat', name: '요리사 모자', price: 250, x: 50, y: 12, w: 60 }, { id: 'glasses', name: '동그란 안경', price: 150, eyes: true }, { id: 'starpin', name: '별 머리핀', price: 100, x: 66, y: 26, w: 22 }];
  M.ACCS = ACCS;
  // 옷장: 옷·가방·장식은 그 옷을 입은 토끼 그림(img/dress-<id>.png)으로 바꿔 보여 준다. 모자와는 함께 쓰지 않는다
  var WEARS = [
    { id: 'apron', cat: 'cloth', name: '분홍 앞치마', price: 300 }, { id: 'raincoat', cat: 'cloth', name: '노란 우비', price: 350 }, { id: 'overalls', cat: 'cloth', name: '하늘색 멜빵바지', price: 300 },
    { id: 'scarf', cat: 'cloth', name: '빨간 목도리', price: 250 }, { id: 'cape', cat: 'cloth', name: '초록 망토', price: 350 },
    { id: 'carrotbag', cat: 'bag', name: '당근 가방', price: 280 }, { id: 'backpack', cat: 'bag', name: '작은 배낭', price: 300 }, { id: 'basket', cat: 'bag', name: '꽃바구니', price: 260 },
    { id: 'net', cat: 'bag', name: '곤충채', price: 240 }, { id: 'rod', cat: 'bag', name: '낚싯대', price: 240 },
    { id: 'heartglasses', cat: 'deco', name: '하트 선글라스', price: 220 }, { id: 'bowtie', cat: 'deco', name: '나비넥타이', price: 180 }, { id: 'flowercrown', cat: 'deco', name: '꽃 화관', price: 260 },
    { id: 'stars', cat: 'deco', name: '별 귀걸이', price: 200 }, { id: 'wings', cat: 'deco', name: '반짝이 날개', price: 500 }];
  var WCAT = { hat: '🎩 모자', cloth: '👗 옷', bag: '🎒 가방·도구', deco: '✨ 장식' }, wcat = 'hat';
  M.WEARS = WEARS;
  function wearOf(id) { return WEARS.filter(function (w) { return w.id === id; })[0]; }
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
  // bare: 옷을 입지 않은 모습 (자랐을 때 보여 주는 그림 등)
  M.petImg = function (face, bare) {
    if (!bare && M.P.pet.wear && wearOf(M.P.pet.wear)) return 'img/dress-' + M.P.pet.wear + '.png';
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
      M.modal('<div class="center"><img class="bigpet popin" src="' + M.petImg('happy', true) + '" alt=""><h3>' + (grown ? esc(M.j(M.P.petName, '이가', '가')) + ' 자랐어요!' : '레벨 업! Lv.' + p.lv) + '</h3><p>이제 레슨에서 물방울을 <b>' + M.petBonus() + '%</b> 더 받아요.</p><button class="btn primary wide" data-close>좋아요</button></div>');
    }
  }

  function toolList(full) {
    return [{ id: 'hYard', e: '🌷', n: '정원', hot: M.gardenOrderReady && M.gardenOrderReady(), main: 1 }, { id: 'hFeed', e: '🥕', n: '먹이', hot: full < 30, main: 1 }, { id: 'hEdit', e: editing ? '✅' : '✏️', n: editing ? '완료' : '꾸미기', hot: editing, main: 1 }, { id: 'hCook', e: '🍳', n: '요리', main: 1 },
      { id: 'hShop', e: '🛋️', n: '상점' }, { id: 'hPots', e: '🪴', n: '화분', hot: M.potAlert && M.potAlert() }, { id: 'hMail', e: '📮', n: '편지', hot: M.mailUnread && M.mailUnread(), badge: 1 }, { id: 'hHouse', e: '🔨', n: '집' }];
  }
  function toolBtn(b) { return '<button class="ht' + (b.hot ? ' hot' : '') + '" id="' + b.id + '"><span>' + b.e + '</span><small>' + b.n + '</small>' + (b.badge && b.hot ? '<i class="nbadge">' + b.hot + '</i>' : '') + '</button>'; }
  // 방 확대·이동 (두 손가락으로 벌리기, 확대한 뒤 끌기). 꾸미기 중에는 원래 크기로 둔다
  var Z = { s: 1, x: 0, y: 0 };
  function zoomTf() { return editing || Z.s <= 1.01 ? '' : 'translate(' + Z.x + 'px,' + Z.y + 'px) scale(' + Z.s + ')'; }
  function zoomCss() { var t = zoomTf(); return t ? 'transform:' + t : ''; }
  function applyZoom() {
    var r = $('room'), rin = $('rin'); if (!r || !rin) return;
    var w = r.clientWidth, h = r.clientHeight;
    Z.s = Math.max(1, Math.min(2.4, Z.s)); Z.x = Math.min(0, Math.max(w - w * Z.s, Z.x)); Z.y = Math.min(0, Math.max(h - h * Z.s, Z.y));
    rin.style.transform = zoomTf();
    var zb = r.querySelector('[data-rzoom]');
    if (Z.s > 1.01 && !zb && !editing) { zb = document.createElement('button'); zb.className = 'roomzoom'; zb.dataset.rzoom = '1'; zb.textContent = '↺ 원래 크기'; r.appendChild(zb); }
    if (Z.s <= 1.01 && zb) zb.remove();
  }
  var zp = {}, zg = null, zPanned = 0;
  document.addEventListener('pointerdown', function (e) {
    var r = e.target.closest && e.target.closest('#room'); if (!r || editing) return;
    zp[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(zp), rr = r.getBoundingClientRect();
    if (ids.length === 2) { var a = zp[ids[0]], b = zp[ids[1]]; zg = { d: Math.hypot(a.x - b.x, a.y - b.y), s: Z.s, x: Z.x, y: Z.y, cx: (a.x + b.x) / 2 - rr.left, cy: (a.y + b.y) / 2 - rr.top }; }
    else if (ids.length === 1 && Z.s > 1.01) zg = { pan: 1, sx: e.clientX, sy: e.clientY, x: Z.x, y: Z.y, moved: false };
  });
  document.addEventListener('pointermove', function (e) {
    if (!zp[e.pointerId] || !zg) return;
    zp[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(zp);
    if (!zg.pan && ids.length >= 2) {
      var a = zp[ids[0]], b = zp[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), ns = Math.max(1, Math.min(2.4, zg.s * d / (zg.d || 1)));
      Z.x = zg.cx - (zg.cx - zg.x) * ns / zg.s; Z.y = zg.cy - (zg.cy - zg.y) * ns / zg.s; Z.s = ns; applyZoom(); zPanned = Date.now(); e.preventDefault();
    } else if (zg.pan) {
      var dx = e.clientX - zg.sx, dy = e.clientY - zg.sy;
      if (zg.moved || Math.abs(dx) + Math.abs(dy) > 8) { zg.moved = true; Z.x = zg.x + dx; Z.y = zg.y + dy; applyZoom(); zPanned = Date.now(); }
    }
  }, { passive: false });
  function zEnd(e) { delete zp[e.pointerId]; if (!Object.keys(zp).length) zg = null; else if (zg && !zg.pan) zg = null; }
  document.addEventListener('pointerup', zEnd); document.addEventListener('pointercancel', zEnd);
  // 확대·이동한 직후의 손 뗌은 누르기로 치지 않는다
  document.addEventListener('click', function (e) { if (Date.now() - zPanned < 300 && e.target.closest && e.target.closest('#room')) { e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('wheel', function (e) {   // 컴퓨터: Ctrl+휠(트랙패드 벌리기)로 확대
    var r = e.target.closest && e.target.closest('#room'); if (!r || editing || !e.ctrlKey) return;
    e.preventDefault(); var rr = r.getBoundingClientRect(), cx = e.clientX - rr.left, cy = e.clientY - rr.top, ns = Math.max(1, Math.min(2.4, Z.s * (e.deltaY < 0 ? 1.1 : 0.9)));
    Z.x = cx - (cx - Z.x) * ns / Z.s; Z.y = cy - (cy - Z.y) * ns / Z.s; Z.s = ns; applyZoom();
  }, { passive: false });
  M.renderHome = function (root) {
    Object.keys(M.P.room.placed).forEach(function (id) {
      var f = FURN.filter(function (x) { return x.id === id; })[0], p = M.P.room.placed[id]; if (!f || !p) return;
      var hw = Math.min(50, f.size * (p.s || 1) / 2); p.x = Math.max(hw, Math.min(100 - hw, p.x));
    });
    var P = M.P, p = P.pet, full = M.petFull();
    var face = mood || (full < 30 ? 'sad' : 'normal');
    var line = full < 30 ? '배고파요… 🥕 먹이를 주세요' : M.pick(LINES);
    var fl = (M.houseInfo && M.houseInfo().floors) || 1, cur = P.room.cur || 1;
    if (cur > fl) { M.homeFloor(1); cur = 1; }
    var placed = Object.keys(P.room.placed).map(function (id) { return FURN.filter(function (f) { return f.id === id; })[0]; }).filter(Boolean);
    placed.sort(function (a, b) { return P.room.placed[a.id].y - P.room.placed[b.id].y; });
    var h = '<div class="home">' + (fl > 1 ? '<div class="floors">' + FLOORS.slice(1, fl + 1).map(function (n, i) { return '<button data-fl="' + (i + 1) + '" class="' + (cur === i + 1 ? 'on' : '') + '">' + n + '</button>'; }).join('') + '</div>' : '') +
      '<div class="room' + (editing ? ' editing' : '') + '" id="room"><div class="rin" id="rin" style="' + zoomCss() + '">' + roomLayers() +
      placed.map(function (f) { var pos = P.room.placed[f.id]; return '<div class="furn' + (f.wall ? ' onwall' : '') + (editing && fsel === f.id ? ' fsel' : '') + (pos.f ? ' flip' : '') + '" data-f="' + f.id + '" style="left:' + pos.x + '%;top:' + pos.y + '%;width:' + (f.size * (pos.s || 1)).toFixed(1) + '%;z-index:' + ((f.rug ? 1 : Math.round(pos.y)) + (pos.z || 0)) + '"><img src="img/furn-' + f.id + '.png" alt="' + esc(f.name) + '" draggable="false">' + showcase(f.id) + '</div>'; }).join('') +
      (M.potsRoomHtml && cur === 1 ? M.potsRoomHtml() : '') +
      '<div class="pet' + (editing ? ' movable' : '') + '" id="pet" style="z-index:' + Math.round((P.pet.pos || { y: 92 }).y) + ';' + (P.pet.pos ? 'left:' + P.pet.pos.x + '%;top:' + P.pet.pos.y + '%;bottom:auto' : '') + '"><div class="bubble" id="petSay">' + esc(line) + '</div><div class="pstat"><span class="ps' + (full < 30 ? ' low' : '') + '" title="배부름">🥕<i><i style="width:' + M.petFullPct() + '%"></i></i></span><span class="ps" title="친밀도">💗<i><i style="width:' + Math.round(p.exp / needExp(p.lv) * 100) + '%"></i></i></span></div><div class="petfig"><img id="petImg" src="' + M.petImg(face) + '" alt="' + esc(P.petName) + '">' + accHtml(face) + '</div></div>' +
      '</div>' + (editing ? '' : '<button class="roomcam" data-rcam aria-label="사진 찍기">📷</button>' + (Z.s > 1.01 ? '<button class="roomzoom" data-rzoom aria-label="원래 크기로">↺ 원래 크기</button>' : '')) +
      (editing ? '<div class="edithint">' + (fsel ? '아래 버튼으로 크기·방향·순서를 바꿔요' : '가구·화분·' + esc(P.petName) + '를 끌어서 옮겨요') + '</div>' : '') +
      '</div>' + (editing && fsel && P.room.placed[fsel] ? '<div class="ftools"><b>' + esc((FURN.filter(function (x) { return x.id === fsel; })[0] || {}).name || '') + '</b><button data-ft="small">－ 작게</button><button data-ft="big">＋ 크게</button><button data-ft="flip">↔ 뒤집기</button><button data-ft="front">⬆ 앞으로</button><button data-ft="back">⬇ 뒤로</button><button data-ft="store">📦 보관</button></div>' : '') +
      '<div class="hstat"><b>' + esc(P.petName) + ' <small>Lv.' + p.lv + '</small></b>' +
      '<span class="hs">💧 레슨 보너스 +' + M.petBonus() + '%</span></div>' +
      // 자주 쓰는 4개는 늘 보이고, 나머지는 할 일이 있을 때만 앞으로 나온다 (그 밖에는 더보기)
      '<div class="htools">' + toolList(full).filter(function (b) { return b.main || b.hot; }).map(toolBtn).join('') +
      '<button class="ht" id="hMore"><span>⋯</span><small>더보기</small></button></div></div>';
    root.innerHTML = h;
  };
  function rerender() { var r = $('homeView'); if (r) M.renderHome(r); }
  // 수족관·곤충 상자: 잡은 것 중 귀한 순서로 넣어 보여 준다
  var SHOW = { fishbowl: { k: 'fish', at: [[50, 50, 46]] }, aquarium: { k: 'fish', at: [[30, 45, 26], [55, 34, 28], [74, 50, 24]] }, bugcase: { k: 'bug', at: [[35, 60, 30], [65, 58, 32]] }, bugframe: { k: 'bug', at: [[27, 50, 26], [50, 50, 28], [73, 50, 26]] } };
  function showcase(id) {
    var s = SHOW[id]; if (!s) return '';
    var list = s.k === 'fish' ? (M.FISH || []).filter(function (f) { return (M.P.fishDex || {})[f.id]; }).sort(function (a, b) { return b.price - a.price; }).map(function (f) { return 'img/w/fish-' + f.id + '.png'; })
      : Object.keys(((M.P.gather || {}).dex) || {}).filter(function (k) { var it = M.GATHER.ITEMS[k]; return it && it.cat === 'bug'; }).sort(function (a, b) { return M.GATHER.ITEMS[b].price - M.GATHER.ITEMS[a].price; }).map(function (k) { return M.GATHER.ITEMS[k].img; });
    return s.at.map(function (p, i) { return list[i] ? '<img class="shw ' + s.k + (i % 2 ? ' alt' : '') + '" src="' + list[i] + '" style="left:' + p[0] + '%;top:' + p[1] + '%;width:' + p[2] + '%" alt="">' : ''; }).join('');
  }
  // 층: 지금 층의 배치는 room.placed·room.wall 에, 다른 층은 room.floors[층] 에 둔다
  var FLOORS = ['', '1층 거실', '2층 침실', '3층 다락방', '옥상 정원'];
  M.homeFloor = function (n) {
    var R = M.P.room, cur = R.cur || 1; if (n === cur) return;
    R.floors = R.floors || {};
    R.floors[cur] = { placed: R.placed, wall: R.wall || 0, wallTint: R.wallTint || 0, floorTint: R.floorTint || 0 };
    var nx = R.floors[n] || { placed: {}, wall: n === 4 ? 5 : 0 };   // 새 층은 1층과 같은 빈 방, 옥상은 하늘 배경
    R.placed = nx.placed || {}; R.wall = WALLS[nx.wall] ? nx.wall : 0; R.wallTint = nx.wallTint || 0; R.floorTint = nx.floorTint || 0; R.cur = n; M.save();
  };
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-fl]'); if (!b) return; if (M.stopEditing) M.stopEditing(); M.homeFloor(+b.dataset.fl); rerender(); M.sfx && M.sfx('pop'); });

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
  function roomLayers() {
    var R = M.P.room, w = WALLS[R.wall || 0] || WALLS[0], ft = function (i) { var t = TINTS[i || 0] || TINTS[0]; return t[0] ? 'filter:' + t[0] + ';' : ''; };
    if (w.roof) return '<div class="rlayer" style="background-image:url(' + w.src + ');' + ft(R.floorTint) + '"></div>';
    var wt = TINTS[R.wallTint || 0] || TINTS[0], wf = !wt[3] && wt[0] ? 'filter:' + wt[0] + ';' : '';
    return '<div class="rlayer" style="background-image:url(' + w.wl + ');' + wf + '"></div>' + (wt[3] ? '<div class="rlayer rmul" style="background-color:' + wt[3] + ';-webkit-mask-image:url(' + w.wl + ');mask-image:url(' + w.wl + ')"></div>' : '') + '<div class="rlayer" style="background-image:url(' + w.fl + ');' + ft(R.floorTint) + '"></div>';
  }
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
    if (M.P.pet.wear) return '';
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
    var d = M.modal('<h3>🛋️ 꾸미기 상점</h3><div class="tabs"><button data-st="furn">가구</button><button data-st="wall">벽지·바닥</button><button data-st="acc">👗 옷장</button><button data-st="seed">씨앗·비료</button><button data-st="ride">🚲 탈것</button></div><p class="hint" id="fHint"></p><div class="list" id="fList"></div><button class="btn ghost wide" data-close>닫기</button>', { onClose: rerender });
    var tabs = function () { Array.prototype.forEach.call(d.querySelectorAll('[data-st]'), function (b) { b.classList.toggle('on', b.dataset.st === tab); }); };
    var paintOther = function () {
      var R = P.room, ow = R.walls || {}, oa = P.pet.accs || {};
      if (tab === 'seed') { M.seedTab(d.querySelector('#fList'), d.querySelector('#fHint')); return; }
      if (tab === 'ride') {
        var grown = M.petStage() >= 3, own = !!P.bike;
        d.querySelector('#fHint').textContent = '마을에서 멀리 갈 때나 🗺️ 지도에서 고른 곳으로 갈 때 자전거를 타고 빨리 가요';
        d.querySelector('#fList').innerHTML = '<div class="fgrid"><button class="fcard' + (grown ? '' : ' lock') + '" data-bike><img src="img/w/it-bike.png" alt=""><b>분홍 자전거</b>' + (own ? '<small>가지고 있어요 ✔</small>' : grown ? '<small class="price"><img src="img/coin.png" alt="">1500</small>' : '<small>' + esc(P.petName) + '가 다 자라면 탈 수 있어요 (Lv.10)</small>') + '</button></div>';
        d.querySelector('#fList').onclick = function (e) {
          if (!e.target.closest('[data-bike]') || own) return;
          if (!grown) { M.toast(esc(P.petName) + '가 다 자라야 탈 수 있어요. 먹이를 주고 레슨을 해서 키워 주세요'); return; }
          M.confirm('🚲 분홍 자전거', '<img class="inl" src="img/coin.png" alt="">1500코인에 살까요? 마을에서 멀리 갈 때 자전거를 타요.', '사기', function () {
            if (!M.spend('coins', 1500)) { M.toast('코인이 모자라요'); return; }
            P.bike = true; M.save(); M.sfx('win'); M.toast('🚲 자전거를 샀어요! 멀리 갈 때 자동으로 타요'); paintOther();
          });
        };
        return;
      }
      d.querySelector('#fList').onclick = null;
      if (tab === 'wall') {
        d.querySelector('#fHint').textContent = '방 전체의 벽지와 바닥을 바꿔요';
        d.querySelector('#fList').innerHTML = '<div class="walls">' + WALLS.map(function (w) {
          var own = !w.price || ow[w.id], on = (R.wall || 0) === w.id;
          return '<button class="wallc' + (on ? ' on' : '') + '" data-wid="' + w.id + '"><img src="' + w.src + '" alt=""><b>' + w.name + '</b><small>' + (on ? '사용 중' : own ? '바꾸기' : '<img src="img/coin.png" alt="">' + w.price) + '</small></button>';
        }).join('') + '</div>' +
          '<h4>🎨 벽 색</h4><div class="tints">' + TINTS.map(function (t, i) { return '<button class="tint' + ((R.wallTint || 0) === i ? ' on' : '') + '" data-wt="' + i + '"><i style="background:' + t[2] + '"></i><small>' + t[1] + '</small></button>'; }).join('') + '</div>' +
          '<h4>🎨 바닥 색</h4><div class="tints">' + TINTS.map(function (t, i) { return '<button class="tint' + ((R.floorTint || 0) === i ? ' on' : '') + '" data-ft2="' + i + '"><i style="background:' + t[2] + '"></i><small>' + t[1] + '</small></button>'; }).join('') + '</div><p class="hint">색은 공짜로 몇 번이든 바꿀 수 있어요. 무늬는 위에서 골라요.</p>';
      } else {
        var ow2 = P.pet.wears || {};
        d.querySelector('#fHint').innerHTML = '<span class="fcats">' + Object.keys(WCAT).map(function (k) { return '<button data-wc="' + k + '" class="' + (k === wcat ? 'on' : '') + '">' + WCAT[k] + '</button>'; }).join('') + '</span>';
        var cur = P.pet.wear ? wearOf(P.pet.wear) : null, curA = ACCS.filter(function (x) { return x.id === P.pet.acc; })[0];
        var now = '<div class="wearnow"><span class="wnfig"><img src="' + M.petImg('happy') + '" alt="">' + (curA ? '<img class="acc" src="img/acc-' + curA.id + '.png" alt="" style="' + accStyle(curA, 'happy') + '">' : '') + '</span><p>' + (cur ? '<b>' + esc(M.j(cur.name, '을', '를')) + '</b> 입고 있어요' : curA ? '<b>' + esc(M.j(curA.name, '을', '를')) + '</b> 쓰고 있어요' : '아무것도 입지 않았어요') + '<small>옷·가방·장식은 하나씩 입고, 모자와는 같이 쓰지 않아요</small></p></div>';
        d.querySelector('#fList').innerHTML = now + (wcat === 'hat' ? ACCS.map(function (a) {
          var own = oa[a.id], on = P.pet.acc === a.id;
          return '<button class="litem" data-aid="' + a.id + '"><span class="le"><img src="img/acc-' + a.id + '.png" alt=""></span><span class="ln">' + a.name + (own ? '<small>' + (on ? '쓰고 있어요 · 눌러서 벗기' : '눌러서 씌우기') + '</small>' : '') + '</span>' +
            (own ? '<span class="lp own">' + (on ? '벗기' : '쓰기') + '</span>' : '<span class="lp"><img src="img/coin.png" alt="">' + a.price + '</span>') + '</button>';
        }) : WEARS.filter(function (w) { return w.cat === wcat; }).map(function (w) {
          var own = ow2[w.id], on = P.pet.wear === w.id;
          return '<button class="litem" data-wid2="' + w.id + '"><span class="le"><img src="img/wear-' + w.id + '.png" alt=""></span><span class="ln">' + w.name + (own ? '<small>' + (on ? '입고 있어요 · 눌러서 벗기' : '눌러서 입히기') + '</small>' : '<small>입은 모습 미리 보기는 눌러서</small>') + '</span>' +
            (own ? '<span class="lp own">' + (on ? '벗기' : '입기') + '</span>' : '<span class="lp"><img src="img/coin.png" alt="">' + w.price + '</span>') + '</button>';
        })).join('');
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
      var wt = e.target.closest('[data-wt]'), ftt = e.target.closest('[data-ft2]');
      if (wt || ftt) { if (wt) P.room.wallTint = +wt.dataset.wt; else P.room.floorTint = +ftt.dataset.ft2; M.save(); paint(); rerender(); M.sfx && M.sfx('pop'); return; }
      var wb = e.target.closest('[data-wid]');
      if (wb) {
        var w = WALLS[+wb.dataset.wid]; P.room.walls = P.room.walls || {};
        if (w.price && !P.room.walls[w.id]) { if (!M.spend('coins', w.price)) { M.toast('코인이 ' + (w.price - P.coins) + '개 더 필요해요'); return; } P.room.walls[w.id] = true; M.sfx('coin'); }
        P.room.wall = w.id; M.save(); M.toast('🏠 벽지를 ' + M.j(w.name, '으로', '로') + ' 바꿨어요'); paint(); rerender(); return;
      }
      var wc = e.target.closest('[data-wc]'); if (wc) { wcat = wc.dataset.wc; paint(); return; }
      var wb2 = e.target.closest('[data-wid2]');
      if (wb2) {
        var wr = wearOf(wb2.dataset.wid2); P.pet.wears = P.pet.wears || {};
        if (!P.pet.wears[wr.id]) {   // 사기 전에 입은 모습을 보여 준다
          var pv = M.modal('<div class="center"><img class="bigpet" src="img/dress-' + wr.id + '.png" alt=""><h3>' + wr.name + '</h3><p class="hint">' + esc(M.j(P.petName, '이가', '가')) + ' 입으면 이렇게 보여요</p></div><div class="row2"><button class="btn ghost" data-close>그만두기</button><button class="btn primary" data-wbuy><img class="inl" src="img/coin.png" alt="">' + wr.price + ' 사서 입히기</button></div>');
          pv.querySelector('[data-wbuy]').onclick = function () {
            if (!M.spend('coins', wr.price)) { M.toast('코인이 ' + (wr.price - P.coins) + '개 더 필요해요'); return; }
            P.pet.wears[wr.id] = true; P.pet.wear = wr.id; if (P.pet.acc) P.pet.acc = ''; M.save(); M.sfx('coin'); pv.close(); paint(); rerender();
            M.toast('👗 ' + M.j(wr.name, '을', '를') + ' 입었어요');
          };
          return;
        }
        P.pet.wear = P.pet.wear === wr.id ? '' : wr.id; if (P.pet.wear && P.pet.acc) { P.pet.acc = ''; M.toast('🎩 모자는 벗었어요'); } M.save(); paint(); rerender(); return;
      }
      var ab = e.target.closest('[data-aid]');
      if (ab) {
        var a = ACCS.filter(function (x) { return x.id === ab.dataset.aid; })[0]; P.pet.accs = P.pet.accs || {};
        if (!P.pet.accs[a.id]) { if (!M.spend('coins', a.price)) { M.toast('코인이 ' + (a.price - P.coins) + '개 더 필요해요'); return; } P.pet.accs[a.id] = true; M.sfx('coin'); }
        P.pet.acc = P.pet.acc === a.id ? '' : a.id; if (P.pet.acc && P.pet.wear) { P.pet.wear = ''; M.toast('👗 옷은 벗었어요'); } M.save(); paint(); rerender(); return;
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
  // 토끼 끌기
  var pdr = null;
  document.addEventListener('pointerdown', function (e) {
    if (!editing) return;
    var pe = e.target.closest && e.target.closest('#room .pet'); if (!pe) return;
    pdr = { el: pe, r: $('room').getBoundingClientRect(), pid: e.pointerId };
  });
  document.addEventListener('pointermove', function (e) {
    if (!pdr || e.pointerId !== pdr.pid) return;
    var x = Math.max(12, Math.min(88, (e.clientX - pdr.r.left) / pdr.r.width * 100)), y = Math.max(45, Math.min(99, (e.clientY - pdr.r.top) / pdr.r.height * 100 + 12));
    pdr.el.style.left = x + '%'; pdr.el.style.top = y + '%'; pdr.el.style.bottom = 'auto'; pdr.pos = { x: x, y: y }; e.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerup', function (e) { if (!pdr || e.pointerId !== pdr.pid) return; if (pdr.pos) { M.P.pet.pos = pdr.pos; M.save(); pdr.el.style.zIndex = Math.round(pdr.pos.y); } pdr = null; });
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
    if (e.target.closest('[data-rzoom]')) { Z = { s: 1, x: 0, y: 0 }; applyZoom(); return; }
    if (e.target.closest('#hMore')) {
      var md = M.modal('<h3>🏠 집에서 할 수 있는 것</h3><div class="hmore">' + toolList(M.petFull()).map(function (b) { return '<button class="ht' + (b.hot ? ' hot' : '') + '" data-hgo="' + b.id + '"><span>' + b.e + '</span><small>' + b.n + '</small>' + (b.badge && b.hot ? '<i class="nbadge">' + b.hot + '</i>' : '') + '</button>'; }).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>');
      md.addEventListener('click', function (ev) { var g = ev.target.closest('[data-hgo]'); if (!g) return; md.close(); var bt = document.createElement('button'); bt.id = g.dataset.hgo; bt.style.display = 'none'; document.body.appendChild(bt); bt.click(); bt.remove(); });
      return;
    }
    if (e.target.closest('#hFeed')) feedSheet();
    else if (e.target.closest('#hShop')) furnShop();
    else if (e.target.closest('#hHouse')) M.houseSheet();
    else if (e.target.closest('#hYard')) { M.inVillage = true; M.go('garden'); if (M.render) M.render(); }
    else if (e.target.closest('#hMail')) M.mailSheet();
    else if (e.target.closest('#hCook')) M.cookSheet();
    else if (e.target.closest('#hEdit')) { editing = !editing; fsel = ''; Z = { s: 1, x: 0, y: 0 }; rerender(); }
    else if (e.target.closest('#hPots')) { var pd = M.modal('<div class="potshelf">' + M.potsHtml() + '</div><button class="btn ghost wide" data-close>닫기</button>'); pd.querySelector('.potshelf').classList.add('insheet'); }
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
