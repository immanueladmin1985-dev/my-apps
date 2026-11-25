// 편지·요리·떠돌이 장터 (말씨정원).
//  편지: 매일 아침 이사 온 주민 1~2명이 배우는 말로 짧은 편지를 보낸다. 뜻을 맞히면 선물이 함께 온다.
//  요리: 채집한 열매·버섯·화분 열매로 요리한다. 요리를 주민에게 주면 친밀도가 크게 오른다.
//  떠돌이 장터: 사흘에 한 번 광장에 너구리 상인이 와서 귀한 가구를 판다. 낱말 퀴즈를 맞히면 깎아 준다.
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  function X() { var x = M.P.extra = M.P.extra || { mailDay: '', mail: [], dishes: {}, fed: {}, fedDay: '', marketBought: {} }; if (x.fedDay !== M.today()) { x.fedDay = M.today(); x.fed = {}; } return x; }

  // ---------- 편지 ----------
  var OPEN = { ja: ['こんにちは！', '안녕하세요!'], zh: ['你好！', '안녕하세요!'], en: ['Hello!', '안녕하세요!'] };
  var CLOSE = { ja: ['またね。', '또 봐요.'], zh: ['再见！', '또 봐요!'], en: ['See you!', '또 봐요!'] };
  function makeMail() {
    var x = X(); if (x.mailDay === M.today() || !M.V) return;
    x.mailDay = M.today();
    var lang = M.P.lang, rs = M.V.residents(); if (!rs.length) return;
    var sents = []; window.LANGS[lang].stages.forEach(function (s) { if (M.P.prog[lang][s.id] && !s.kana) (s.sents || []).forEach(function (t) { sents.push(t); }); });
    if (sents.length < 3) window.LANGS[lang].stages.filter(function (s) { return !s.kana; }).slice(0, 10).forEach(function (s) { (s.sents || []).forEach(function (t) { sents.push(t); }); });
    if (sents.length < 3) return;
    var n = Math.random() < 0.5 ? 1 : 2;
    M.shuffle(rs).slice(0, n).forEach(function (c) {
      var s = M.pick(sents), wrong = M.shuffle(sents.filter(function (o) { return o.k !== s.k; })).slice(0, 2).map(function (o) { return o.k; });
      var gift = M.pick([['coins', 30], ['coins', 50], ['water', 20], ['item', 'apple'], ['item', 'flowers'], ['item', 'pebble'], ['item', 'clover']]);
      x.mail.push({ from: c.id, t: s.t, say: s.say, k: s.k, wrong: wrong, gift: gift, read: false });
    });
    x.mail = x.mail.slice(-12); M.save();
  }
  M.mailUnread = function () { if (!M.P) return 0; makeMail(); return X().mail.filter(function (m) { return !m.read; }).length; };
  M.mailSheet = function () {
    makeMail(); var x = X(), lang = M.P.lang;
    var d = M.modal('<h3>📮 우체통</h3>' + (x.mail.length ? '<div class="list">' + x.mail.slice().reverse().map(function (m, ri) {
      var i = x.mail.length - 1 - ri, c = M.custOf(m.from);
      return '<button class="litem" data-mail="' + i + '"><span class="le"><img src="' + M.custImg(m.from) + '" alt=""></span><span class="ln">' + esc(c.name) + '의 편지<small>' + (m.read ? '읽음' : '✉️ 새 편지!') + '</small></span><span class="lp' + (m.read ? ' own' : '') + '">' + (m.read ? '다시 보기' : '열기') + '</span></button>';
    }).join('') + '</div>' : '<p class="hint center">아직 편지가 없어요. 내일 아침에 다시 확인해 보세요!</p>') + '<button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-mail]'); if (!b) return; d.close(); readMail(+b.dataset.mail); });
  };
  function readMail(i) {
    var x = X(), m = x.mail[i], c = M.custOf(m.from), lang = M.P.lang, o = OPEN[lang] || OPEN.en, cl = CLOSE[lang] || CLOSE.en;
    var opts = M.shuffle([m.k].concat(m.wrong));
    var d = M.modal('<div class="letter"><div class="lt-from"><img src="' + M.custImg(m.from) + '" alt=""><b>' + esc(c.name) + '</b></div>' +
      '<p class="lt-body lang-' + lang + '">' + esc(o[0]) + '<br><button class="lt-line" data-say="' + esc(m.say) + '">🔊 ' + esc(m.t) + '</button><br>' + esc(cl[0]) + '</p></div>' +
      (m.read ? '<p class="center"><b>' + esc(m.k) + '</b></p><button class="btn primary wide" data-close>닫기</button>' :
        '<p class="hint center">가운데 문장은 무슨 뜻일까요? 맞히면 선물을 받아요</p><div class="copts">' + opts.map(function (k) { return '<button class="copt" data-k="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') + '</div>'));
    M.say(m.say, lang, false, false, 'A');
    d.addEventListener('click', function (e) {
      var s = e.target.closest('[data-say]'); if (s) { M.say(s.dataset.say, lang, false, false, 'A'); return; }
      var b = e.target.closest('[data-k]'); if (!b || m.read) return;
      var ok = b.dataset.k === m.k; m.read = true; M.save(); d.close();
      if (ok) {
        if (m.gift[0] === 'item') M.gatherGot(m.gift[1]); else { var g = {}; g[m.gift[0]] = m.gift[1]; M.give(g); }
        M.gardenFriendUp(m.from); M.sfx('win');
        M.modal('<div class="center"><img class="mface" src="' + M.custImg(m.from, true) + '" alt=""><h3>정답! 「' + esc(m.k) + '」</h3><p>' + esc(c.name) + '이(가) 선물을 함께 보냈어요 ' + (m.gift[0] === 'item' ? '🎁' : M.rewardHtml((function () { var g = {}; g[m.gift[0]] = m.gift[1]; return g; })())) + '</p><button class="btn primary wide" data-close>좋아요</button></div>');
      } else { M.sfx('bad'); M.modal('<div class="center"><h3>아쉬워요</h3><p>뜻은 「<b>' + esc(m.k) + '</b>」이었어요.</p><button class="btn primary wide" data-close>알겠어요</button></div>'); }
    });
  }

  // ---------- 요리 ----------
  var DISH = {
    salad: ['과일 샐러드', '🥗', { apple: 1, orange: 1, peach: 1 }, 'フルーツサラダ', '水果沙拉', 'fruit salad'],
    jam: ['체리 잼', '🍯', { cherry: 3 }, 'さくらんぼジャム', '樱桃果酱', 'cherry jam'],
    soup: ['버섯 수프', '🍲', { 'mush-brown': 1, 'mush-white': 1 }, 'きのこスープ', '蘑菇汤', 'mushroom soup'],
    pie: ['사과 파이', '🥧', { apple: 2, acorn: 1 }, 'アップルパイ', '苹果派', 'apple pie'],
    tart: ['배 타르트', '🍰', { pear: 2, peach: 1 }, 'なしのタルト', '梨挞', 'pear tart'],
    juice: ['오렌지 주스', '🧃', { orange: 2 }, 'オレンジジュース', '橙汁', 'orange juice'],
    berrybowl: ['딸기 토마토 볼', '🍓', { pot_strawberry: 2, pot_tomato: 1 }, 'いちごとトマトのボウル', '草莓番茄碗', 'berry bowl'],
    lemonade: ['레몬에이드', '🍋', { pot_lemon: 2, cherry: 1 }, 'レモネード', '柠檬水', 'lemonade']
  };
  function have(k) { if (k.indexOf('pot_') === 0) { var p = M.P.pots; return p && p.fruits ? p.fruits[k.slice(4)] || 0 : 0; } var g = M.P.gather; return g && g.bag ? g.bag[k] || 0 : 0; }
  function take(k, n) { if (k.indexOf('pot_') === 0) M.P.pots.fruits[k.slice(4)] -= n; else M.P.gather.bag[k] -= n; }
  function ingImg(k) { if (k.indexOf('pot_') === 0) return 'img/w/fruit-' + k.slice(4) + '.png'; return M.GATHER.ITEMS[k].img; }
  function ingName(k) { if (k.indexOf('pot_') === 0) return (M.SEEDS[k.slice(4)] || {}).name || k; return M.GATHER.ITEMS[k].ko; }
  M.cookSheet = function () {
    var x = X();
    var d = M.modal('<h3>🍳 요리하기</h3><p class="hint">채집한 열매·버섯과 화분 열매로 만들어요. 요리를 주민에게 주면 친밀도가 두 칸 올라요.</p><div class="list" id="ckList"></div><button class="btn ghost wide" data-close>닫기</button>');
    function paint() {
      d.querySelector('#ckList').innerHTML = Object.keys(DISH).map(function (id) {
        var r = DISH[id], ok = Object.keys(r[2]).every(function (k) { return have(k) >= r[2][k]; });
        return '<div class="recipe' + (ok ? ' ok' : '') + '"><span class="le dishe">' + r[1] + '</span><div class="ln">' + r[0] + (x.dishes[id] ? ' <small>가진 것 ' + x.dishes[id] + '</small>' : '') + '<div class="needs">' +
          Object.keys(r[2]).map(function (k) { return '<span class="ing' + (have(k) >= r[2][k] ? ' got' : '') + '"><img src="' + ingImg(k) + '" alt="" title="' + ingName(k) + '"><i>' + have(k) + '/' + r[2][k] + '</i></span>'; }).join('') +
          '</div></div><button class="btn ' + (ok ? 'primary' : 'ghost') + '" data-cook="' + id + '"' + (ok ? '' : ' disabled') + '>만들기</button></div>';
      }).join('');
    }
    paint();
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cook]'); if (!b || b.disabled) return;
      var id = b.dataset.cook, r = DISH[id]; Object.keys(r[2]).forEach(function (k) { take(k, r[2][k]); });
      x.dishes[id] = (x.dishes[id] || 0) + 1; M.save(); M.sfx('win');
      var L = M.P.lang, nm = L === 'ja' ? r[3] : L === 'zh' ? r[4] : r[5]; M.say(nm, L);
      M.toast(r[1] + ' ' + r[0] + ' 완성! (' + nm + ')'); paint();
    });
  };
  M.dishGiftable = function (id) { var x = X(); return !x.fed[id] && Object.keys(x.dishes).some(function (k) { return x.dishes[k] > 0; }); };
  M.dishGiftSheet = function (id) {
    var x = X(), c = M.custOf(id), ks = Object.keys(x.dishes).filter(function (k) { return x.dishes[k] > 0; });
    var d = M.modal('<h3>🍲 ' + esc(M.j(c.name, '이', '')) + '에게 어떤 요리를 줄까요?</h3><div class="list">' + ks.map(function (k) { return '<button class="litem" data-dish="' + k + '"><span class="le dishe">' + DISH[k][1] + '</span><span class="ln">' + DISH[k][0] + '</span><span class="lp own">' + x.dishes[k] + '개</span></button>'; }).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dish]'); if (!b) return;
      x.dishes[b.dataset.dish]--; x.fed[id] = 1; M.save(); d.close(); M.sfx('win');
      M.modal('<div class="center"><img class="mface" src="' + M.custImg(id, true) + '" alt=""><h3>' + esc(c.name) + ': "' + DISH[b.dataset.dish][0] + '! 정말 맛있어요!"</h3><p class="hint">친밀도가 크게 올랐어요 ♥♥</p><button class="btn primary wide" data-close>좋아요</button></div>', { onClose: function () { M.gardenFriendUp(id); M.gardenFriendUp(id); } });
    });
  };

  // ---------- 떠돌이 장터 ----------
  M.marketToday = function () { var n = Math.floor(Date.now() / 86400000); return n % 3 === 0; };
  M.marketSheet = function () {
    var x = X(), lang = M.P.lang, day = M.today();
    var pool = (M.FURN || []).filter(function (f) { return f.price >= 120 && !(M.P.room.owned || {})[f.id]; });
    var seed = parseInt(day.replace(/\D/g, ''), 10), pick = [];
    for (var i = 0; i < pool.length * 4 && pick.length < Math.min(4, pool.length); i++) { var f = pool[(seed * 7 + i * 5 + Math.floor(i / pool.length)) % pool.length]; if (pick.indexOf(f) < 0) pick.push(f); }
    x.marketDisc = x.marketDisc && x.marketDisc.day === day ? x.marketDisc : { day: day, rate: 1 };
    var d = M.modal('<div class="mintro"><span class="mface em">🦝</span><div class="msay"><b>너구리 상인 너굴</b><p>어서 와요! 오늘만 파는 귀한 물건이에요. 퀴즈를 맞히면 30% 깎아 줄게요!</p></div></div>' +
      '<div class="fgrid">' + pick.map(function (f) { var pr = Math.round(f.price * x.marketDisc.rate); return '<button class="fcard" data-mk="' + f.id + '"><img src="img/furn-' + f.id + '.png" alt=""><b>' + f.name + '</b><small class="price"><img src="img/coin.png" alt="">' + pr + '</small></button>'; }).join('') + '</div>' +
      (x.marketDisc.rate < 1 ? '<p class="hint center">🎉 오늘은 30% 할인 중!</p>' : '<button class="btn wide" data-mq>🧩 퀴즈 풀고 깎기</button>') + '<button class="btn ghost wide" data-close>나가기</button>');
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-mq]')) {
        var items = M.learnedItems(lang).filter(function (it) { return it.k && !it.kana; }); if (items.length < 3) { M.toast('낱말을 조금 더 배우고 와요!'); return; }
        var three = M.shuffle(items).slice(0, 3), t = three[0]; d.close();
        var q = M.modal('<div class="center"><span class="mface em">🦝</span><h3 class="lang-' + lang + '">' + esc(t.t) + '</h3><p>이 말의 뜻은?</p></div><div class="copts">' + M.shuffle(three).map(function (it) { return '<button class="copt" data-k="' + esc(it.k) + '">' + esc(it.k) + '</button>'; }).join('') + '</div>');
        M.say(t.say, lang);
        q.addEventListener('click', function (e2) { var b = e2.target.closest('[data-k]'); if (!b) return; q.close(); if (b.dataset.k === t.k) { x.marketDisc.rate = 0.7; M.sfx('win'); M.toast('정답! 오늘은 30% 할인이에요'); } else { M.sfx('bad'); M.toast('아쉬워요! 뜻은 「' + t.k + '」'); x.marketDisc.tried = true; } M.save(); M.marketSheet(); });
        return;
      }
      var b = e.target.closest('[data-mk]'); if (!b) return;
      var f = pick.filter(function (z) { return z.id === b.dataset.mk; })[0], pr = Math.round(f.price * x.marketDisc.rate);
      M.confirm(f.name, '<img class="inl" src="img/coin.png" alt="">' + pr + '코인에 살까요? 토끼 집 방에 놓여요.', '사기', function () {
        if (!M.spend('coins', pr)) { M.toast('코인이 모자라요'); return; }
        M.P.room.owned[f.id] = true; M.P.room.placed[f.id] = { x: 50, y: f.wall ? 30 : 70 }; M.save(); M.sfx('coin'); d.close(); M.toast(f.name + '을(를) 샀어요! 방에 놓았어요');
      });
    });
  };
})();
