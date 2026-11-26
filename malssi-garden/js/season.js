// 날씨와 계절 (말씨정원).
// 날씨는 날짜와 4시간 단위로 정해진다(두 폰이 같다). 비 오는 날은 귀한 물고기가 잘 물고, 무지개가 뜨면 행운.
// 맑은 밤에는 가끔 별똥별이 지나가고, 누르면 소원을 빈다. 달마다 마을에 계절 장식이 놓이고, 장식을 누르면 그 계절 인사를 배운다.
(function () {
  var M = window.M, esc = M.esc;
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function month() { return M.now().getMonth() + 1; }
  M.weather = function () {
    var d = M.now(), blk = Math.floor(d.getHours() / 4), seed = parseInt(M.today().replace(/\D/g, ''), 10) * 7 + blk, r = rnd(seed % 2147483646 + 1);
    r(); var x = r(), m = month(), winter = m === 12 || m <= 2;
    var w = x < 0.22 ? (winter ? 'snow' : 'rain') : x < 0.32 ? 'cloud' : 'clear';
    // 비가 그친 다음 칸(낮)에는 무지개가 뜰 때가 있다
    if (w === 'clear' && blk >= 2 && blk <= 4) { var p = rnd((parseInt(M.today().replace(/\D/g, ''), 10) * 7 + blk - 1) % 2147483646 + 1); p(); if (p() < 0.22 && !winter) w = 'rainbow'; }
    return w;
  };
  var WX = { clear: ['☀️', '맑음'], cloud: ['☁️', '흐림', 'wx-cloud'], rain: ['🌧️', '비 · 귀한 물고기가 잘 물어요', 'wx-rain'], snow: ['❄️', '눈', 'wx-snow'], rainbow: ['🌈', '무지개 · 행운이 와요!', 'wx-rainbow'] };
  M.weatherInfo = function () { var w = M.weather(); return { k: w, em: WX[w][0], name: WX[w][1], img: WX[w][2] }; };
  M.weatherFishMult = function () { var w = M.weather(); return w === 'rain' ? 1.4 : w === 'rainbow' ? 1.6 : 1; };

  // ---------- 화면 효과 (마을 캔버스 위) ----------
  var drops = [];
  M.weatherDraw = function (ctx, vw, vh, dt) {
    var w = M.weather();
    if (w === 'rain' || w === 'snow') {
      var want = w === 'rain' ? 110 : 60;
      while (drops.length < want) drops.push({ x: Math.random() * vw, y: Math.random() * vh, s: 0.6 + Math.random() * 0.8 });
      ctx.save();
      if (w === 'rain') { ctx.fillStyle = 'rgba(50,70,110,.18)'; ctx.fillRect(0, 0, vw, vh); ctx.strokeStyle = 'rgba(200,225,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); }
      else { ctx.fillStyle = 'rgba(255,255,255,.9)'; }
      drops.forEach(function (p) {
        if (w === 'rain') { p.y += dt * 0.55 * p.s; p.x -= dt * 0.08; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 3, p.y + 11 * p.s); }
        else { p.y += dt * 0.05 * p.s; p.x += Math.sin((p.y + p.s * 50) / 30) * 0.4; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 * p.s, 0, 7); ctx.fill(); }
        if (p.y > vh) { p.y = -10; p.x = Math.random() * vw; } if (p.x < -10) p.x = vw;
      });
      if (w === 'rain') ctx.stroke();
      ctx.restore();
    } else drops.length = 0;
    if (w === 'cloud') { ctx.fillStyle = 'rgba(90,100,120,.10)'; ctx.fillRect(0, 0, vw, vh); }
  };

  // ---------- 별똥별 (맑은 밤) ----------
  var starT = 0;
  M.starTick = function (host) {
    var h = M.now().getHours(), night = h >= 20 || h < 5, w = M.weather();
    if (!night || (w !== 'clear' && w !== 'rainbow') || !host || document.getElementById('wStar')) return;
    if (Date.now() < starT) return; starT = Date.now() + 45000 + Math.random() * 60000;
    if (Math.random() > 0.55) return;
    var b = document.createElement('button'); b.id = 'wStar'; b.className = 'wstar'; b.innerHTML = '<img src="img/w/wx-star.png" alt="별똥별">';
    b.style.top = (8 + Math.random() * 25) + '%'; host.appendChild(b);
    var gone = setTimeout(function () { b.remove(); }, 3800);
    b.onclick = function (e) {
      e.stopPropagation(); clearTimeout(gone); b.remove();
      var L = M.P.lang, wish = { ja: ['ねがいがかないますように', '소원이 이루어지길'], en: ['I wish upon a star', '별에게 소원을 빌어요'], zh: ['许个愿吧', '소원을 빌어요'] }[L];
      var items = ['min-starpiece', 'sea-pinkpearl', 'gem', 'for-fairywing'], gotItem = Math.random() < 0.3 ? M.pick(items) : null, coins = 30 + Math.floor(Math.random() * 70);
      if (gotItem) M.gatherGot(gotItem); else M.give({ coins: coins });
      M.say(wish[0], L);
      M.fxPop({ bg: 'fx-burst', img: 'img/w/wx-star.png', title: '🌠 소원을 빌었어요!', sub: '<span class="lang-' + L + '">' + esc(wish[0]) + '</span> = ' + wish[1] + '<br>' + (gotItem ? '별이 선물을 떨어뜨렸어요' : '+' + coins + '코인'), ms: 3200 });
    };
  };

  // ---------- 계절 장식 ----------
  // 놓을 자리(칸)는 광장 둘레와 길가. 달에 맞는 장식만 놓는다
  var SPOTS = [[15, 22, 1.6], [28, 22, 1.6], [14, 13, 1.4], [29, 13, 1.3], [24, 22, 1.2], [19, 22, 1.2], [8, 13, 1.3], [33, 23, 1.3]];
  function setFor(m) {
    if (m >= 9 && m <= 11) return { name: '가을 수확제', items: ['ev-scarecrow', 'ev-pumpkin', 'ev-leaves', 'ev-chestnut', 'ev-flags', 'ev-pumpkin', 'ev-leaves', 'ev-scarecrow'], greet: { ja: ['しゅうかくさい、おめでとう！', '수확제 축하해요!'], en: ['Happy harvest festival!', '수확제 축하해요!'], zh: ['丰收节快乐！', '수확제 축하해요!'] } };
    if (m === 12) return { name: '크리스마스', items: ['ev-tree', 'ev-gift', 'ev-snowman', 'ev-gift', 'ev-flags', 'ev-snowman', 'ev-gift', 'ev-tree'], greet: { ja: ['メリークリスマス！', '메리 크리스마스!'], en: ['Merry Christmas!', '메리 크리스마스!'], zh: ['圣诞快乐！', '메리 크리스마스!'] } };
    if (m <= 2) return { name: '새해', items: ['ev-kite', 'ev-pouch', 'ev-snowman', 'ev-flags', 'ev-pouch', 'ev-kite', 'ev-snowman', 'ev-pouch'], greet: { ja: ['あけましておめでとう！', '새해 복 많이 받아요!'], en: ['Happy New Year!', '새해 복 많이 받아요!'], zh: ['新年快乐！', '새해 복 많이 받아요!'] } };
    return null;
  }
  M.seasonSet = function () { return setFor(month()); };
  M.seasonObjs = function (free) {
    var s = setFor(month()); if (!s) return [];
    return SPOTS.map(function (p, i) { return free(p[0], p[1]) ? { x: p[0], y: p[1], h: p[2], src: s.items[i % s.items.length] } : null; }).filter(Boolean);
  };
  // 장식을 누르면 하루 한 번 계절 인사를 배우고 작은 선물을 받는다
  M.seasonTap = function () {
    var s = setFor(month()); if (!s) return;
    var L = M.P.lang, g = s.greet[L] || s.greet.en, st = M.P.season = M.P.season || {};
    M.say(g[0], L);
    var first = st.day !== M.today(); if (first) { st.day = M.today(); M.give({ coins: 20, water: 5 }); M.save(); }
    M.fxPop({ bg: 'fx-burst', img: 'img/w/' + s.items[0] + '.png', title: '🎉 ' + s.name, sub: '<span class="lang-' + L + '">' + esc(g[0]) + '</span> = ' + g[1] + (first ? '<br>오늘의 계절 선물 💧5 · 20코인' : ''), ms: 3000 });
  };
})();
