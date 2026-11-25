// 마을 (말씨정원).
// 지도 위를 누르면 토끼가 그곳으로 걸어간다. 건물을 누르면 걸어가서 들어간다.
// 정원 가게(머지 밭)·잡화점·게시판·박물관·선물 교환소·주민 집이 지도 위에 있다.
// 지도 그림이 오면 MAP_IMG 를 켜고, 아래 자리(%)를 그림에 맞춰 옮긴다.
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  var MAP_IMG = '';   // 예: 'img/village-map.jpg' (세로 9:16)
  var MAP_W = 900, MAP_H = 1600;   // 지도 좌표 (그림 크기와 같은 비율)

  // 장소: x·y 는 지도에서 문 앞(토끼가 서는 곳)의 %, w 는 건물 너비(지도 너비의 %)
  var PLACES = [
    { id: 'shop', name: '정원 가게', em: '🏪', img: 'img/stall.png', x: 30, y: 31, w: 30 },
    { id: 'board', name: '광장 게시판', em: '📋', x: 56, y: 43, w: 13 },
    { id: 'store', name: '잡화점', em: '🛍️', x: 76, y: 23, w: 20 },
    { id: 'museum', name: '박물관', em: '🏛️', x: 24, y: 13, w: 22 },
    { id: 'gift', name: '선물 교환소', em: '🎁', x: 82, y: 40, w: 16 },
    { id: 'pier', name: '낚시터', em: '🎣', x: 64, y: 87, w: 16, soon: '낚시는 다음 단계에서 열려요. 강가에서 물고기를 낚아 박물관을 채우게 돼요!' }
  ];
  // 주민 집터 (이사 온 순서대로 채운다)
  var LOTS = [[14, 53], [40, 57], [70, 56], [88, 62], [22, 67], [52, 69], [80, 73], [12, 79], [36, 81], [90, 82], [48, 49], [10, 41]];
  var HOUSE_EM = { bear: '🍯', squirrel: '🌰', chick: '🥚', hedgehog: '🍄', panda: '🎋', fox: '🍂', koala: '🌳', hamster: '🌻', penguin: '🧊', cat: '🐟', sheep: '🧶', owl: '📚' };

  function V() { var P = M.P; P.village = P.village || { x: 50, y: 46 }; return P.village; }
  function residents() {
    var g = M.gardenState(), lv = g.lv;
    return M.SHOP.CUSTOMERS.filter(function (c) { return c.lv <= lv; });
  }
  function nextMover() { var lv = M.gardenState().lv; return M.SHOP.CUSTOMERS.filter(function (c) { return c.lv > lv; })[0]; }
  function hearts(id) { return Math.min(5, Math.floor((M.gardenState().friends[id] || 0) / 4)); }

  // 시간에 따라 마을 빛깔을 바꾼다 (휴대폰 시계)
  function timeTint() {
    var h = new Date().getHours();
    return h < 5 ? 'night' : h < 8 ? 'dawn' : h < 17 ? 'day' : h < 20 ? 'dusk' : 'night';
  }

  // 그림이 없을 때 쓰는 임시 지도 (SVG)
  function mapSvg() {
    return '<svg class="vmap" viewBox="0 0 ' + MAP_W + ' ' + MAP_H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<rect width="900" height="1600" fill="#a8dd8c"/>' +
      '<rect width="900" height="150" fill="#7fc46a"/>' +
      [60, 160, 260, 380, 520, 640, 760, 860].map(function (x, i) { return '<circle cx="' + x + '" cy="' + (60 + (i % 2) * 40) + '" r="' + (55 + (i % 3) * 10) + '" fill="#5fae55"/>'; }).join('') +
      '<path d="M450 140 C 450 300, 200 330, 260 520 S 640 640, 500 760 S 200 980, 380 1120 S 620 1200, 560 1290" fill="none" stroke="#e9cf9c" stroke-width="58" stroke-linecap="round"/>' +
      '<path d="M260 520 C 420 560, 640 520, 760 380" fill="none" stroke="#e9cf9c" stroke-width="40" stroke-linecap="round"/>' +
      '<path d="M500 760 C 640 760, 760 800, 800 980" fill="none" stroke="#e9cf9c" stroke-width="36" stroke-linecap="round"/>' +
      '<ellipse cx="500" cy="690" rx="150" ry="95" fill="#ddd3c2" stroke="#c8bba5" stroke-width="6"/>' +
      '<path d="M0 1290 C 200 1250, 400 1330, 600 1280 S 820 1260, 900 1290 L 900 1380 C 700 1360, 500 1420, 300 1380 S 100 1370, 0 1390 Z" fill="#7cc6ec"/>' +
      '<rect x="520" y="1270" width="80" height="130" rx="8" fill="#b98a52" stroke="#8a6236" stroke-width="5"/>' +
      '<path d="M0 1390 C 200 1370, 500 1420, 900 1380 L 900 1480 L 0 1480 Z" fill="#f3e2b3"/>' +
      '<rect y="1470" width="900" height="130" fill="#6cc0e8"/>' +
      '</svg>';
  }

  var walking = null;
  M.inVillage = false;
  M.renderVillage = function (root) {
    if (!root) return;
    if (M.inVillage) { M.renderGarden(root); return; }
    var v = V(), res = residents(), nm = nextMover();
    var lotHtml = LOTS.map(function (l, i) {
      var c = res[i];
      if (c) {
        var mq = M.miniAvail ? M.miniAvail(c.id) : null;
        return '<button class="vhouse" data-res="' + c.id + '" style="left:' + l[0] + '%;top:' + l[1] + '%"><span class="hroof">' + (HOUSE_EM[c.id] || '🏠') + '</span><span class="hbody">🏠</span>' +
          '<span class="vlabel">' + esc(c.name) + (hearts(c.id) ? ' <i class="hh">♥' + hearts(c.id) + '</i>' : '') + '</span>' + (mq ? '<i class="vq">❗</i>' : '') + '</button>';
      }
      if (i === res.length && nm) return '<button class="vlot" data-lot="' + i + '" style="left:' + l[0] + '%;top:' + l[1] + '%"><span>🚧</span><span class="vlabel">이사 예정</span></button>';
      return '';
    }).join('');
    var placeHtml = PLACES.map(function (p) {
      var badge = p.id === 'shop' && M.gardenOrderReady && M.gardenOrderReady() ? '<i class="vq">📦</i>' : p.id === 'board' && boardNews() ? '<i class="vq">❗</i>' : '';
      return '<button class="vplace' + (p.soon ? ' soon' : '') + '" data-place="' + p.id + '" style="left:' + p.x + '%;top:' + p.y + '%;width:' + p.w + '%">' +
        (p.img ? '<img src="' + p.img + '" alt="">' : '<span class="pem">' + p.em + '</span>') + '<span class="vlabel">' + p.name + '</span>' + badge + '</button>';
    }).join('');
    root.innerHTML = '<div class="village tint-' + timeTint() + '"><div class="vbar"><b>🏡 ' + esc(M.P.petName) + '네 마을</b><small>주민 ' + res.length + '명' + (nm ? ' · Lv.' + nm.lv + '에 ' + esc(nm.name) + ' 이사' : '') + '</small><button class="helpbtn" id="vHelp" aria-label="도움말">?</button></div>' +
      '<div class="vworld" id="vWorld" style="aspect-ratio:' + MAP_W + '/' + MAP_H + '">' + (MAP_IMG ? '<img class="vmap" src="' + MAP_IMG + '" alt="">' : mapSvg()) +
      placeHtml + lotHtml +
      '<div class="vme" id="vMe" style="left:' + v.x + '%;top:' + v.y + '%"><img src="' + M.petImg('normal') + '" alt=""></div>' +
      '<div class="vtint"></div></div></div>';
  };
  function boardNews() { return residents().some(function (c) { return M.miniAvail && M.miniAvail(c.id); }); }

  // ---------- 걷기 ----------
  function walkTo(x, y, then) {
    var me = $('vMe'), w = $('vWorld'); if (!me || !w) { if (then) then(); return; }
    var v = V(), W = w.clientWidth, H = w.clientHeight;
    var dx = (x - v.x) / 100 * W, dy = (y - v.y) / 100 * H, dist = Math.sqrt(dx * dx + dy * dy);
    var ms = M.fast ? 0 : Math.min(2200, Math.max(200, dist / 0.22));   // 1초에 220px
    clearTimeout(walking);
    me.classList.toggle('left', dx < 0); me.classList.add('walk');
    me.style.transition = 'left ' + ms + 'ms linear, top ' + ms + 'ms linear';
    me.style.left = x + '%'; me.style.top = y + '%';
    v.x = x; v.y = y; M.save();
    walking = setTimeout(function () { me.classList.remove('walk'); if (then) then(); }, ms + 30);
  }

  // ---------- 장소 ----------
  function enter(id) {
    var p = PLACES.filter(function (x) { return x.id === id; })[0];
    if (p && p.soon) { M.modal('<div class="center"><div class="tbig">' + p.em + '</div><h3>' + p.name + '</h3><p>' + p.soon + '</p><button class="btn primary wide" data-close>알겠어요</button></div>'); return; }
    if (id === 'shop') { M.inVillage = true; M.render(); return; }
    if (id === 'store') { M.furnShop(); return; }
    if (id === 'museum') { M.gardenBook(); return; }
    if (id === 'gift') { M.go('shop'); return; }
    if (id === 'board') { boardSheet(); return; }
  }
  function boardSheet() {
    var res = residents(), asks = res.filter(function (c) { return M.miniAvail && M.miniAvail(c.id); }), nm = nextMover();
    var d = M.modal('<h3>📋 광장 게시판</h3>' +
      '<h4>오늘의 부탁</h4>' + (asks.length ? '<div class="list">' + asks.map(function (c) { var m = M.miniFor(c.id); return '<button class="litem" data-ask="' + m.id + '"><span class="le">' + resImg(c) + '</span><span class="ln">' + esc(c.name) + '<small>' + m.icon + ' ' + esc(m.name) + '</small></span><span class="lp own">가기</span></button>'; }).join('') + '</div>' : '<p class="hint">오늘 부탁은 다 들어줬어요! 주민과 더 친해지면 새 부탁이 생겨요.</p>') +
      '<h4>마을 소식</h4><ul class="unl">' + (nm ? '<li>가게 레벨 <b>' + nm.lv + '</b>이 되면 <b>' + esc(nm.name) + '</b>이(가) 이사 와요.</li>' : '<li>모든 주민이 이사 왔어요!</li>') +
      '<li>지금 주민 ' + res.length + '명이 살고 있어요.</li></ul>' +
      '<button class="btn wide" data-quests>⭐ 오늘의 퀘스트 보기</button><button class="btn primary wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) {
      var a = e.target.closest('[data-ask]'); if (a) { d.close(); M.miniIntro(a.dataset.ask); return; }
      if (e.target.closest('[data-quests]')) { d.close(); M.openQuests(); }
    });
  }
  function resImg(c) { var s = M.custImg(c.id); return s ? '<img src="' + s + '" alt="">' : c.em; }
  function residentSheet(id) {
    var c = M.custOf(id), m = M.miniFor(id), h = hearts(id), mq = M.miniAvail(id);
    var d = M.modal('<div class="mintro"><img class="mface" src="' + M.custImg(id, true) + '" alt=""><div class="msay"><b>' + esc(c.name) + ' <span class="hearts">' + '♥'.repeat(h) + '♡'.repeat(5 - h) + '</span></b><p>' + esc(greet(c)) + '</p></div></div>' +
      (m ? '<button class="btn ' + (mq ? 'primary' : '') + ' wide" data-play>' + m.icon + ' ' + esc(m.name) + (m.open ? (mq ? ' · 오늘의 부탁!' : ' · 연습하기') : ' · ♥' + m.heart + '에 열려요') + '</button>' : '') +
      '<button class="btn wide" data-talk>💬 이야기하기 <small>(곧 열려요)</small></button><button class="btn ghost wide" data-close>나가기</button>');
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-play]')) { if (!m.open) { M.toast(c.name + '와(과) 더 친해지면 부탁해요'); return; } d.close(); M.miniIntro(m.id); }
      if (e.target.closest('[data-talk]')) M.toast('주민과의 대화는 다음 단계에서 열려요');
    });
  }
  function greet(c) {
    var L = ['오늘 날씨 좋죠?', '놀러 와 줘서 고마워요!', '공부는 잘 되어 가요?', '가게에 또 갈게요!', '우리 마을이 점점 예뻐져요.'];
    return L[(new Date().getDate() + c.id.length) % L.length];
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('#vBack')) { M.inVillage = false; M.render(); return; }
    if (t.closest('#vHelp')) { M.modal('<h3>🏡 마을</h3><ul class="unl"><li>지도를 누르면 ' + esc(M.P.petName) + '이(가) 걸어가요.</li><li>건물을 누르면 걸어가서 들어가요. <b>정원 가게</b>에서 밭을 가꾸고 손님 의뢰를 채워요.</li><li>❗가 뜬 주민 집에 가면 <b>부탁</b>을 들어줄 수 있어요.</li><li>가게 레벨이 오르면 새 주민이 <b>이사</b> 와요.</li></ul><button class="btn primary wide" data-close>닫기</button>'); return; }
    var w = t.closest('#vWorld'); if (!w) return;
    var pl = t.closest('[data-place]'), rs = t.closest('[data-res]'), lot = t.closest('[data-lot]');
    var tgt = pl || rs || lot;
    if (tgt) {
      var x = parseFloat(tgt.style.left), y = parseFloat(tgt.style.top) + 3;
      walkTo(x, y, function () {
        if (pl) enter(pl.dataset.place);
        else if (rs) residentSheet(rs.dataset.res);
        else { var nm = nextMover(); if (nm) M.modal('<div class="center"><div class="tbig">🚧</div><h3>이사 예정</h3><p>가게 레벨 <b>' + nm.lv + '</b>이 되면 <b>' + esc(nm.name) + '</b>이(가) 이 집터로 이사 와요.<br>정원 가게에서 손님 의뢰를 채우면 가게 레벨이 올라요.</p><button class="btn primary wide" data-close>알겠어요</button></div>'); }
      });
      return;
    }
    var r = w.getBoundingClientRect();
    walkTo(Math.max(3, Math.min(97, (e.clientX - r.left) / r.width * 100)), Math.max(10, Math.min(97, (e.clientY - r.top) / r.height * 100)));
  });

  M.villagePlaces = PLACES;   // 자동 점검용
})();
