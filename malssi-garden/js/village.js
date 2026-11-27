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
    { id: 'pier', name: '낚시터', em: '🎣', x: 64, y: 87, w: 16 }
  ];
  // 주민 집터 (이사 온 순서대로 채운다)
  var LOTS = [[14, 53], [40, 57], [70, 56], [88, 62], [22, 67], [52, 69], [80, 73], [12, 79], [36, 81], [90, 82], [48, 49], [10, 41], [30, 45], [64, 45], [92, 46], [6, 90], [26, 92], [60, 93], [76, 92], [94, 94]];
  var HOUSE_EM = { bear: '🍯', squirrel: '🌰', chick: '🥚', hedgehog: '🍄', panda: '🎋', fox: '🍂', koala: '🌳', hamster: '🌻', penguin: '🧊', cat: '🐟', sheep: '🧶', owl: '📚', dog: '🦴', otter: '🐚', deer: '🌸', duck: '☔', lion: '👑', camel: '🔔', elephant: '🌺', monkey: '🍌' };

  function V() { var P = M.P; P.village = P.village || { x: 50, y: 46 }; return P.village; }
  function residents() {
    var g = M.gardenState(), lv = M.visitLv || g.lv;
    return M.SHOP.CUSTOMERS.filter(function (c) { return c.lv <= lv; });
  }
  function nextMover() { var lv = M.gardenState().lv; return M.SHOP.CUSTOMERS.filter(function (c) { return c.lv > lv; })[0]; }
  function hearts(id) { var fr = M.visiting && M.visitData ? M.visitData.friends || {} : M.gardenState().friends; return Math.min(5, Math.floor((fr[id] || 0) / 4)); }

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
    if (M.World) { M.World.mount(root); return; }   // 위에서 내려다보는 칸 마을 (world.js)
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
    root.innerHTML = '<div class="village tint-' + timeTint() + '"><div class="vbar"><b>🏡 ' + esc(M.P.petName) + '네 마을</b><small>주민 ' + res.length + '명' + (nm ? ' · Lv.' + nm.lv + '에 새로운 친구 이사' : '') + '</small><button class="helpbtn" id="vHelp" aria-label="도움말">?</button></div>' +
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
    if ((id === 'shop' || id === 'home') && M.visiting) { M.toast('🦝 방문 중에는 ' + M.Family.mateName() + '의 집에 들어갈 수 없어요'); return; }
    if (id === 'shop') { M.inVillage = true; M.render(); return; }
    if (id === 'home') { M.go('home'); return; }
    if (id === 'den') { M.digOpen(); return; }
    if (id === 'store') { M.furnShop(); return; }
    if (id === 'museum') { var dm = M.modal('<h3>🏛️ 박물관</h3><p class="hint">모은 것들을 구경해요</p><button class="btn wide" data-mg>🌸 정원 도감</button><button class="btn wide" data-mf>🐟 물고기 도감</button><button class="btn wide" data-mx="bug">🦋 곤충 도감</button><button class="btn wide" data-mx="fossil">🦴 화석 도감</button><button class="btn wide" data-mx="sea">🐚 바다 도감</button><button class="btn wide" data-mx="forest">🌲 꽃·숲·열매 도감</button><button class="btn wide" data-mx="mineral">💎 광물·보석 도감</button><button class="btn primary wide" data-bb>🪲 곤충 배틀장</button><button class="btn wide" data-stk>🏅 스티커 앨범</button><button class="btn ghost wide" data-close>나가기</button>');
      dm.addEventListener('click', function (e) { if (e.target.closest('[data-mg]')) { dm.close(); M.gardenBook(); } if (e.target.closest('[data-mf]')) { dm.close(); M.fishDexSheet(); } var mx = e.target.closest('[data-mx]'); if (mx) { dm.close(); M.gatherDex(mx.dataset.mx); } if (e.target.closest('[data-bb]')) { dm.close(); M.bugArena(); } if (e.target.closest('[data-stk]')) { dm.close(); M.stickerAlbum(); } }); return; }
    if (id === 'gift') { M.go('shop'); return; }
    if (id === 'board') { boardSheet(); return; }
    if (id === 'pier') { M.fishStart('sea'); return; }
  }
  function boardSheet() {
    var res = residents(), asks = res.filter(function (c) { return M.miniAvail && M.miniAvail(c.id); }), nm = nextMover();
    var d = M.modal('<h3>📋 광장 게시판</h3>' +
      '<h4>오늘의 부탁</h4>' + (asks.length ? '<div class="list">' + asks.map(function (c) { var m = M.miniFor(c.id); return '<button class="reqc" data-ask="' + m.id + '"><span class="rqwho">' + resImg(c) + '<small>' + esc(c.name) + '</small></span><span class="rqtxt"><b>' + m.icon + ' ' + esc(m.name.replace(c.name + '의 ', '').replace(c.name + '와 ', '')) + '</b><small>도와주면 코인 · 친밀도 ♥</small></span><span class="rqgo">가기</span></button>'; }).join('') + '</div>' : '<p class="hint">오늘 부탁은 다 들어줬어요! 주민과 더 친해지면 새 부탁이 생겨요.</p>') +
      (M.dishOrderHtml ? M.dishOrderHtml() : '') +
      '<h4>마을 소식</h4><ul class="unl">' + (nm ? '<li>가게 레벨 <b>' + nm.lv + '</b>이 되면 <b>새로운 친구</b>가 이사 와요.</li>' : '<li>모든 주민이 이사 왔어요!</li>') +
      '<li>지금 주민 ' + res.length + '명이 살고 있어요.</li></ul>' +
      '<button class="btn wide" data-quests>⭐ 오늘의 퀘스트 보기</button><button class="btn primary wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) {
      var a = e.target.closest('[data-ask]'); if (a) { d.close(); M.miniIntro(a.dataset.ask); return; }
      var od = e.target.closest('[data-order]'); if (od && !od.disabled) { if (M.dishOrderDeliver(+od.dataset.order)) d.close(); return; }
      if (e.target.closest('[data-quests]')) { d.close(); M.openQuests(); }
    });
  }
  // 마을 도움말: 주제별로 나눠서 보여 준다
  function villageHelp() {
    var pn = esc(M.j(M.P.petName, '이가', '가')), sec = function (t, items) { return '<h4 class="hsec">' + t + '</h4><ul class="unl">' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; };
    M.modal('<h3>🏡 마을 도움말</h3><div class="helpbody">' +
      sec('🚶 다니기', ['지도를 누르면 ' + pn + ' 걸어가요. 손가락으로 끌면 화면을 옮겨 봐요.', '🗺️ <b>지도</b>에서 가고 싶은 곳을 바로 고를 수 있어요.', '🚲 <b>자전거</b>(잡화점, 다 자란 뒤)가 있으면 먼 길은 자동으로 타고 가요.']) +
      sec('🐻 주민', ['❗가 뜬 주민 집에 가면 <b>부탁</b>(미니게임)을 들어줄 수 있어요.', '💬 하루 한 번 <b>이야기하기</b>, 🍎 열매·🍲 요리 <b>선물</b>로 친해져요. 좋아하는 맛을 주면 ♥가 더 올라요.', '🎂 주민마다 <b>생일</b>이 있어요. 생일인 주민 집에는 케이크가 놓이고, 찾아가서 축하하면 ♥가 한 칸 올라요.', '정원 가게 레벨이 오르면 새 주민이 <b>이사</b> 와요. 밤에는 주민들이 집에 들어가 자요.']) +
      sec('🧺 모으기', ['🌳 <b>나무</b>를 흔들면 열매·나뭇가지·통나무가 떨어져요. 🪨 <b>바위</b>는 하루 3번 두드려요.', '바닥의 버섯·꽃, 모래사장의 조개, 별 모양 <b>파는 곳</b>(화석)은 매일 새로 생겨요.', '🦋 날아다니는 <b>곤충</b>을 눌러 잡아요. 시간대마다 나오는 곤충이 달라요.', '🎣 낚시터에서 <b>낚시</b>를 해요. 비 오는 날에는 귀한 물고기가 잘 물어요.', '✨ <b>행운의 향수</b>(가방)를 쓰면 30분 동안 곤충과 물건이 두 배로 나와요. 오늘 공부 목표를 채우면 하나 받아요.']) +
      sec('🍳 요리와 배틀', ['모은 재료로 집에서 <b>요리</b>하고, 먹으면 잠깐 힘이 나는 효과(버프)가 붙어요.', '🪲 잡은 곤충으로 <b>곤충 배틀</b>을 해요. 이기면 곤충이 강해져요.']) +
      sec('🏆 행사', ['주말에는 <b>대회</b>가 열려요. 토요일은 가장 큰 물고기를 겨루는 낚시 대회, 일요일은 곤충 점수를 모으는 곤충 대회예요. 다음 날 상을 받아요.', '달마다 <b>계절 장식</b>이 놓이고, 누르면 계절 인사를 배워요. 맑은 밤에는 별똥별이 지나가요.', '⭐ 정해진 일을 해내면 <b>스티커</b>를 모아요.']) +
      sec('📷 사진과 가족', ['오른쪽 위 📷 단추로 마을을, 집에서는 방 왼쪽 위 📷 단추로 방을 찍어요. 사진첩에 모으거나 기기에 저장해요.', '💕 <b>가족 연결</b>(설정)을 하면 서로의 토끼가 마을에 보이고, 선물·사진을 보내고, 같이 놀이를 할 수 있어요.']) +
      sec('📖 공부와 이어지기', ['레슨을 하면 하루 처음 세 번은 <b>낚시 미끼</b>를 받고, 오늘 목표를 채우면 <b>행운의 향수</b>를 받아요.']) +
      '</div><button class="btn primary wide" data-close>닫기</button>', { cls: 'bagsheet' });
  }
  function resImg(c) { var s = M.custImg(c.id); return s ? '<img src="' + s + '" alt="">' : c.em; }
  function residentSheet(id) {
    if (M.visiting) { M.toast('🦝 방문 중에는 주민과 놀 수 없어요. 장터를 열거나 ' + M.Family.mateName() + '에게 인사해 보세요'); return; }
    if (M.residentAsleep && M.residentAsleep(id)) { var cz = M.custOf(id); M.toast('💤 ' + M.j(cz.name, '은', '는') + ' 쿨쿨 자고 있어요. 아침 6시쯤 일어나요'); return; }
    var c = M.custOf(id), m = M.miniFor(id), h = hearts(id), mq = M.miniAvail(id);
    var d = M.modal('<div class="mintro"><img class="mface" src="' + M.custImg(id, true) + '" alt=""><div class="msay"><b>' + esc(c.name) + ' <span class="hearts">' + '♥'.repeat(h) + '♡'.repeat(5 - h) + '</span></b><p>' + esc(greet(c)) + '</p></div></div>' + (M.tasteLine ? M.tasteLine(id) : '') + (M.bdayLine ? M.bdayLine(id) : '') +
      (m ? '<button class="btn ' + (mq ? 'primary' : '') + ' wide" data-play>' + m.icon + ' ' + esc(m.name) + (m.open ? (mq ? ' · 오늘의 부탁!' : ' · 연습하기') : ' · ♥' + m.heart + '에 열려요') + '</button>' : '') +
      (M.dishGiftable && M.dishGiftable(id) ? '<button class="btn wide" data-dishg>🍲 요리 선물하기 <small>· 좋아하는 맛이면 ♥♥♥</small></button>' : '') + (M.potGiftable && M.potGiftable(id) ? '<button class="btn wide" data-gift>🎁 열매 선물하기 <small>· 친밀도 ♥</small></button>' : '') + '<button class="btn ' + (talkedToday(id) ? '' : 'primary') + ' wide" data-talk>💬 이야기하기' + (talkedToday(id) ? ' <small>(오늘 이미 이야기했어요)</small>' : ' <small>· 친밀도 ♥</small>') + '</button><button class="btn ghost wide" data-close>나가기</button>');
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-play]')) { if (!m.open) { M.toast(M.j(c.name, '과', '와') + ' 더 친해지면 부탁해요'); return; } d.close(); M.miniIntro(m.id); }
      if (e.target.closest('[data-talk]')) { d.close(); talk(id); }
      if (e.target.closest('[data-gift]')) { d.close(); M.potGiftSheet(id); }
      if (e.target.closest('[data-dishg]')) { d.close(); M.dishGiftSheet(id); }
      if (e.target.closest('[data-bday]')) { d.close(); M.bdayCelebrate(id); }
    });
  }
  function greet(c) {
    var L = ['오늘 날씨 좋죠?', '놀러 와 줘서 고마워요!', '공부는 잘 되어 가요?', '가게에 또 갈게요!', '우리 마을이 점점 예뻐져요.'];
    return L[(new Date().getDate() + c.id.length) % L.length];
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var sb = t.closest && t.closest('#tChat [data-say]'); if (sb) { M.say(sb.dataset.say, M.P.lang, false, false, sb.dataset.who); return; }
    if (t.closest('#vBack')) { M.inVillage = false; M.render(); return; }
    if (t.closest('#vBag')) { M.gatherBag(); return; }
    if (t.closest('#vHome')) { M.Family.visit(false); return; }
    if (t.closest('#vHelp')) { villageHelp(); return; }
    var w = t.closest('#vWorld'); if (!w) return;
    var pl = t.closest('[data-place]'), rs = t.closest('[data-res]'), lot = t.closest('[data-lot]');
    var tgt = pl || rs || lot;
    if (tgt) {
      var x = parseFloat(tgt.style.left), y = parseFloat(tgt.style.top) + 3;
      walkTo(x, y, function () {
        if (pl) enter(pl.dataset.place);
        else if (rs) residentSheet(rs.dataset.res);
        else { var nm = nextMover(); if (nm) M.modal('<div class="center"><div class="tbig">🚧</div><h3>이사 예정</h3><p>가게 레벨 <b>' + nm.lv + '</b>이 되면 <b>' + '새로운 친구</b>가 이 집터로 이사 와요.<br>정원 가게에서 손님 의뢰를 채우면 가게 레벨이 올라요.</p><button class="btn primary wide" data-close>알겠어요</button></div>'); }
      });
      return;
    }
    var r = w.getBoundingClientRect();
    walkTo(Math.max(3, Math.min(97, (e.clientX - r.left) / r.width * 100)), Math.max(10, Math.min(97, (e.clientY - r.top) / r.height * 100)));
  });

  // ---------- 주민과 이야기하기 ----------
  // 배운 회화 장면 하나를 골라 주민(A)이 말을 걸고, 내 차례(B)에 알맞은 대답을 고른다. 끝에 배운 낱말 하나를 묻는다.
  function talks() { var V2 = V(); if (V2.talkDay !== M.today()) { V2.talkDay = M.today(); V2.talked = {}; } return V2.talked; }
  function talkedToday(id) { return !!talks()[id]; }
  function pickScene(id) {
    var lang = M.P.lang, all = window.LANGS[lang].stages.filter(function (s) { return s.conv && s.xf.some(function (x) { return x.aw === 'B'; }); });
    var done = all.filter(function (s) { return M.P.prog[lang][s.id]; }), pool = done.length ? done : all.slice(0, 3);
    var n = (new Date().getDate() * 7 + id.length * 3 + (M.gardenState().friends[id] || 0)) % pool.length;
    return pool[n];
  }
  function talk(id) {
    var c = M.custOf(id), lang = M.P.lang, sc = pickScene(id), i = 0, ok = 0, total = 0;
    var face = M.custImg(id) ? '<img src="' + M.custImg(id) + '" alt="">' : c.em;
    var d = M.modal('<div class="talkhead"><span class="tface">' + face + '</span><div><b>' + esc(M.j(c.name, '과', '와')) + ' 이야기</b><small>' + esc(sc.title) + '</small></div></div><div class="chat lang-' + lang + '" id="tChat"></div><div id="tOpts" class="copts"></div><button class="btn ghost wide" data-close>그만하기</button>');
    var chat = d.querySelector('#tChat'), opts = d.querySelector('#tOpts');
    function bubble(t, k, me, r) {
      var b = document.createElement('button'); b.className = 'cb ' + (me ? 'me' : 'you'); b.dataset.say = t; b.dataset.who = me ? 'B' : 'c:' + id;
      b.innerHTML = '<b>' + M.fz(t, lang) + '</b>' + (r ? '<span class="dr">' + esc(r) + '</span>' : '') + '<small>' + esc(k) + '</small>';
      chat.appendChild(b); chat.scrollTop = chat.scrollHeight;
    }
    function step() {
      if (!d.isConnected) return;
      if (i >= sc.dlg.length) { wordQuiz(); return; }
      var line = sc.dlg[i], x = sc.xf.filter(function (q) { return q.di === i && q.aw === 'B'; })[0];
      if (line.who === 'A') { bubble(line.t, line.k, false, line.r); i++; M.sayThen(line.t, lang, 'c:' + id, step); return; }
      if (!x) { bubble(line.t, line.k, true, line.r); i++; M.sayThen(line.t, lang, 'B', step); return; }
      total++;
      var right = [x.a].concat((x.alts || []).map(function (a) { return a.t; }));
      var list = M.shuffle(right.concat(x.w.slice(0, Math.max(1, 3 - right.length))));
      opts.innerHTML = '<div class="cme">💬 내 차례예요</div>' + list.map(function (o, k) { return '<button class="copt lang-' + lang + '" data-o="' + k + '">' + M.fz(o, lang) + '</button>'; }).join('');
      var tries = 0;
      Array.prototype.forEach.call(opts.querySelectorAll('.copt'), function (b) {
        b.onclick = function () {
          var o = list[+b.dataset.o];
          if (right.indexOf(o) >= 0) {
            if (!tries) ok++;
            M.sfx('ok'); opts.innerHTML = '';
            var alt = (x.alts || []).filter(function (a) { return a.t === o; })[0];
            bubble(o, alt ? alt.k : line.k, true, alt ? alt.r : line.r);
            i++; M.sayThen(o, lang, 'B', step);
          } else { tries++; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); }
        };
      });
    }
    function wordQuiz() {
      var items = M.learnedItems(lang).filter(function (it) { return it.k && !it.kana; });
      if (items.length < 4) { done(); return; }
      var four = M.shuffle(items).slice(0, 4), t = four[0]; total++;
      bubble((lang === 'ja' ? 'ところで、「' + t.t + '」って わかる?' : lang === 'zh' ? '对了，你知道“' + t.t + '”吗？' : 'By the way, do you know "' + t.t + '"?'), '그런데 「' + t.t + '」 알아요?', false);
      M.say(t.say, lang, false, false, 'A');
      opts.innerHTML = '<div class="cme">🤔 무슨 뜻일까요?</div>' + M.shuffle(four).map(function (it) { return '<button class="copt" data-k="' + esc(it.k) + '">' + esc(it.k) + '</button>'; }).join('');
      var tries = 0;
      Array.prototype.forEach.call(opts.querySelectorAll('.copt'), function (b) {
        b.onclick = function () {
          if (b.dataset.k === t.k) { if (!tries) ok++; M.sfx('ok'); opts.innerHTML = ''; bubble(t.k + '!', '맞혔어요', true); setTimeout(done, M.fast ? 0 : 700); }
          else { tries++; b.disabled = true; b.classList.add('miss'); M.sfx('bad'); }
        };
      });
    }
    function done() {
      var first = !talkedToday(id), coins = first ? 10 + ok * 5 : 0;
      var taught = null;
      if (first) { talks()[id] = 1; M.give({ coins: coins }); if (Math.random() < 0.5 && M.recipeLearnRandom) taught = M.recipeLearnRandom(M.custOf(id).name + '에게 배웠어요', id); }
      M.save();
      opts.innerHTML = '<div class="tdone"><b>' + (ok === total ? '대화가 즐거웠어요! 🎵' : '재미있었어요! 또 이야기해요.') + '</b><small>한 번에 맞힌 대답 ' + ok + ' / ' + total + '</small>' + (first ? M.rewardHtml({ coins: coins }) + '<small>' + esc(c.name) + '의 친밀도가 올랐어요 ♥</small>' : '<small>오늘 보상은 이미 받았어요. 연습은 언제든 좋아요!</small>') + '</div>';
      if (taught) opts.querySelector('.tdone').insertAdjacentHTML('beforeend', '<p class="tteach">📜 ' + esc(M.custOf(id).name) + ': "제가 좋아하는 <b>' + esc(M.recipeName(taught)) + '</b> 만드는 법 알려 줄게요!"</p>');
      if (first) { var closeBtn = d.querySelector('[data-close]'); closeBtn.textContent = '인사하고 나가기'; closeBtn.addEventListener('click', function () { M.gardenFriendUp(id); }, { once: true }); }
      M.sfx('win');
    }
    step();
  }

  // world.js 에서 쓰는 것들
  M.V = { enter: enter, resident: residentSheet, residents: residents, nextMover: nextMover, hearts: hearts, tint: timeTint, boardNews: boardNews };
  M.villagePlaces = PLACES;
  M.villageTalk = talk;   // 자동 점검용   // 자동 점검용
})();
