// 스티커 앨범 (말씨정원). 목표를 이루면 스티커를 받는다. 받을 때 50코인.
(function () {
  var M = window.M, esc = M.esc;
  function P() { return M.P; }
  function dex() { return (P().gather && P().gather.dex) || {}; }
  function catN(cat, f) { var I = M.GATHER.ITEMS, d = dex(); return Object.keys(d).filter(function (k) { return I[k] && I[k].cat === cat && (!f || f(I[k])); }).length; }
  function fishN() { return Object.keys(P().fishDex || {}).length; }
  function stars() { var n = 0; ['ja', 'en', 'zh'].forEach(function (l) { var pr = (P().prog || {})[l] || {}; Object.keys(pr).forEach(function (k) { n += +pr[k] || 0; }); }); return n; }
  function convN() { var l = P().lang, pr = (P().prog || {})[l] || {}; return window.LANGS[l].stages.filter(function (s) { return s.conv && pr[s.id]; }).length; }
  function maxFriend() { var f = (P().garden && P().garden.friends) || {}; return Math.max.apply(null, [0].concat(Object.keys(f).map(function (k) { return f[k]; }))); }
  var LIST = [
    ['study', '첫걸음', '레슨 10판 하기', function () { return ((P().stats || {}).lessons || 0) >= 10; }],
    ['streak', '꾸준함', '7일 연속 공부', function () { return (P().best || 0) >= 7; }],
    ['book', '낱말 부자', '낱말 100개 익히기', function () { return M.learnedCount() >= 100; }],
    ['talk', '수다쟁이', '회화 단원 5개 끝내기', function () { return convN() >= 5; }],
    ['stars', '별 모으기', '별 100개 모으기', function () { return stars() >= 100; }],
    ['fish1', '첫 손맛', '물고기 처음 낚기', function () { return fishN() >= 1; }],
    ['rod', '낚시꾼', '물고기 10종 낚기', function () { return fishN() >= 10; }],
    ['goldfish', '황금빛', '황금 잉어 낚기', function () { return !!(P().fishDex || {}).goldcarp; }],
    ['whaleshark', '바다의 거인', '고래상어 낚기', function () { return !!(P().fishDex || {}).whaleshark; }],
    ['fishdex', '물고기 박사', '물고기 30종 낚기', function () { return fishN() >= 30; }],
    ['net', '잠자리채', '곤충 처음 잡기', function () { return catN('bug') >= 1; }],
    ['butterflies', '나비 정원', '곤충 10종 잡기', function () { return catN('bug') >= 10; }],
    ['goldstag', '황금 사슴벌레', '황금 사슴벌레 잡기', function () { return !!dex()['bug-goldstag']; }],
    ['trophy', '곤충 리그', '곤충 리그 5단계 넘기', function () { return ((P().bugBattle || {}).rank || 0) >= 5; }],
    ['bugdex', '곤충 박사', '곤충 30종 잡기', function () { return catN('bug') >= 30; }],
    ['cookbook', '요리책', '레시피 30개 알기', function () { return M.recipeCount && M.recipeCount()[0] >= 30; }],
    ['pan', '요리사', '요리 20번 만들기', function () { return ((P().extra || {}).cooked || 0) >= 20; }],
    ['fruits', '과일 바구니', '열매 5종 모으기', function () { return catN('fruit') >= 5; }],
    ['gems', '보석함', '보석 5종 모으기', function () { return catN('mineral', function (it) { return it.price >= 130; }) >= 5; }],
    ['fossil', '화석 탐험가', '화석 15종 모으기', function () { return catN('fossil') >= 15; }],
    ['friends', '단짝 친구', '주민 한 명과 ♥5', function () { return maxFriend() >= 20; }],
    ['key', '내 집 마련', '집을 2층 이상으로', function () { return (M.houseLv ? M.houseLv() : 1) >= 2; }],
    ['bike', '씽씽', '자전거 사기', function () { return !!P().bike; }],
    ['couple', '우리 둘이', '가족 연결하기', function () { var F = M.Family && M.Family.state(); return !!(F && F.ready && F.mateUid); }],
    ['all', '모두 모았다!', '다른 스티커 24개 모으기', function () { var s = P().stickers || {}; return LIST.filter(function (x) { return x[0] !== 'all' && s[x[0]]; }).length >= 24; }]
  ];
  M.STICKERS = LIST;
  var busy = false;
  M.stickerCheck = function () {
    if (busy || !P() || !P().started) return;
    // 레슨·놀이 중에는 문제를 가리지 않게 끝난 뒤에 확인한다 (레슨 결과 화면은 괜찮다)
    var bc = document.body.classList;
    if ((bc.contains('in-lesson') && !document.querySelector('#lBody .result')) || bc.contains('in-mini')) { clearTimeout(t); t = setTimeout(M.stickerCheck, 3000); return; }
    busy = true;
    var s = P().stickers = P().stickers || {}, got = [];
    try { LIST.forEach(function (x) { if (!s[x[0]] && x[3]()) { s[x[0]] = M.today(); got.push(x); } }); } catch (e) {}
    busy = false;
    if (!got.length) return;
    M.give({ coins: 50 * got.length }); M.save();
    var x = got[0];
    setTimeout(function () { M.fxPop({ bg: 'fx-ring', img: 'img/w/st-' + x[0] + '.png', title: '🏅 스티커: ' + x[1] + (got.length > 1 ? ' 외 ' + (got.length - 1) + '개' : ''), sub: x[2] + ' · +' + (50 * got.length) + '코인', ms: 3000 }); M.sfx && M.sfx('win'); }, 600);
  };
  M.stickerAlbum = function () {
    M.stickerCheck();
    var s = P().stickers || {}, n = LIST.filter(function (x) { return s[x[0]]; }).length;
    var d = M.modal('<h3>🏅 스티커 앨범 <small>' + n + ' / ' + LIST.length + '</small></h3><p class="hint">목표를 이루면 스티커와 50코인을 받아요. 스티커를 누르면 목표를 볼 수 있어요</p><div class="stgrid">' + LIST.map(function (x) {
      return '<button class="stk' + (s[x[0]] ? ' got' : '') + '" data-st="' + x[0] + '"><img src="img/w/st-' + x[0] + '.png" alt=""><small>' + (s[x[0]] ? esc(x[1]) : '???') + '</small></button>';
    }).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>', { cls: 'bagsheet' });
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-st]'); if (!b) return; var x = LIST.filter(function (y) { return y[0] === b.dataset.st; })[0]; M.toast((s[x[0]] ? '🏅 ' + x[1] + ' · ' : '🔒 ') + x[2] + (s[x[0]] ? ' (' + s[x[0]] + ')' : '')); });
  };
  // 저장할 때마다 조금 뒤에 확인한다
  var t = 0;
  document.addEventListener('DOMContentLoaded', function () {});
  setTimeout(function () { var s0 = M.save; M.save = function () { s0.apply(M, arguments); clearTimeout(t); t = setTimeout(M.stickerCheck, 2500); }; }, 0);
})();
