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
    M.shuffle(rs).slice(0, n).forEach(function (c, ci) {
      var s = M.pick(sents), wrong = M.shuffle(sents.filter(function (o) { return o.k !== s.k; })).slice(0, 2).map(function (o) { return o.k; });
      var gift = M.pick([['coins', 30], ['coins', 50], ['water', 20], ['item', 'apple'], ['item', 'flowers'], ['item', 'pebble'], ['item', 'clover']]);
      // 두 번째 편지(또는 가끔 첫 편지)는 듣고 빈칸을 채우는 받아쓰기 편지
      var dict = (ci === 1 || Math.random() < 0.35) && s.w && s.w.filter(function (w) { return !/^[\s.,!?。、？！]+$/.test(w); }).length >= 3;
      x.mail.push({ from: c.id, t: s.t, say: s.say, k: s.k, wrong: wrong, gift: gift, read: false, mode: dict ? 'dict' : '', w: dict ? s.w : null, others: dict ? M.shuffle(sents.filter(function (o) { return o !== s; })).slice(0, 4).reduce(function (a, o) { return a.concat(o.w || []); }, []).slice(0, 12) : null });
    });
    x.mail = x.mail.slice(-12); M.save();
  }
  M.mailUnread = function () { if (!M.P) return 0; makeMail(); return X().mail.filter(function (m) { return !m.read; }).length; };
  M.mailSheet = function () {
    makeMail(); var x = X(), lang = M.P.lang;
    var d = M.modal('<div class="center"><img class="mbx" src="img/w/mail-box.png" alt=""></div><h3>📮 우체통</h3>' + (x.mail.length ? '<div class="list">' + x.mail.slice().reverse().map(function (m, ri) {
      var i = x.mail.length - 1 - ri, c = M.custOf(m.from);
      return '<button class="litem" data-mail="' + i + '"><span class="le"><img src="img/w/mail-' + (m.read ? 'open' : 'closed') + '.png" alt=""></span><span class="ln">' + esc(c.name) + '의 ' + (m.mode === 'dict' ? '받아쓰기 편지 ✍️' : '편지') + '<small>' + (m.read ? '읽음' : '✉️ 새 편지!') + '</small></span><span class="lp' + (m.read ? ' own' : '') + '">' + (m.read ? '다시 보기' : '열기') + '</span></button>';
    }).join('') + '</div>' : '<p class="hint center">아직 편지가 없어요. 내일 아침에 다시 확인해 보세요!</p>') + '<button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-mail]'); if (!b) return; d.close(); readMail(+b.dataset.mail); });
  };
  // 받아쓰기 편지: 문장을 듣고 빠진 낱말을 차례로 채운다
  function dictMail(i) {
    var x = X(), m = x.mail[i], c = M.custOf(m.from), lang = M.P.lang, o = OPEN[lang] || OPEN.en, cl = CLOSE[lang] || CLOSE.en, sep = lang === 'en' ? ' ' : '';
    var PUNC = /^[\s.,!?。、？！]+$/, idx = m.w.map(function (w, j) { return j; }).filter(function (j) { return !PUNC.test(m.w[j]); });
    var holes = M.shuffle(idx).slice(0, m.w.length >= 5 ? 2 : 1).sort(function (a, b) { return a - b; });
    var ans = holes.map(function (j) { return m.w[j]; }), decoy = M.shuffle((m.others || []).filter(function (w) { return ans.indexOf(w) < 0 && !PUNC.test(w); })).filter(function (w, j, a) { return a.indexOf(w) === j; }).slice(0, 3);
    var tiles = M.shuffle(ans.concat(decoy)), filled = [];
    var d = M.modal('<div class="letter"><img class="lt-env" src="img/w/mail-open.png" alt=""><div class="lt-from"><img src="' + M.custImg(m.from) + '" alt=""><b>' + esc(c.name) + '</b><small class="lt-tag">✍️ 받아쓰기 편지</small></div>' +
      '<p class="lt-body lang-' + lang + '">' + esc(o[0]) + '<br><span class="lt-line" id="ldS"></span><br>' + esc(cl[0]) + '</p></div>' +
      '<div class="center"><button class="btn" data-ldsay>🔊 편지 듣기</button> <button class="btn ghost" data-ldslow>🐢 천천히</button></div>' +
      '<p class="hint center">편지를 듣고 빈칸에 들어갈 낱말을 차례로 눌러요</p><div class="ldtiles lang-' + lang + '">' + tiles.map(function (t, j) { return '<button class="tile" data-ld="' + j + '">' + M.fz(t, lang) + '</button>'; }).join('') + '</div>' +
      '<div class="row2"><button class="btn ghost" data-ldundo>↩ 하나 빼기</button><button class="btn primary" data-ldgo>답장 보내기</button></div>');
    function paint() {
      var k = 0; d.querySelector('#ldS').innerHTML = m.w.map(function (w, j) { if (holes.indexOf(j) < 0) return M.fz(w, lang); var f = filled[k++]; return '<span class="ldhole' + (f != null ? ' on' : '') + '">' + (f != null ? M.fz(tiles[f], lang) : '　') + '</span>'; }).join(sep);
      Array.prototype.forEach.call(d.querySelectorAll('[data-ld]'), function (b) { b.disabled = filled.indexOf(+b.dataset.ld) >= 0; });
    }
    paint(); setTimeout(function () { M.say(m.say, lang, false, false, 'c:' + m.from); }, 300);
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-ldsay]')) { M.say(m.say, lang, false, false, 'c:' + m.from); return; }
      if (e.target.closest('[data-ldslow]')) { M.say(m.say, lang, true, false, 'c:' + m.from); return; }
      if (e.target.closest('[data-ldundo]')) { filled.pop(); paint(); return; }
      var t = e.target.closest('[data-ld]'); if (t && filled.length < holes.length) { filled.push(+t.dataset.ld); M.sfx('tap'); paint(); return; }
      if (e.target.closest('[data-ldgo]')) {
        if (filled.length < holes.length) { M.toast('빈칸을 모두 채워 주세요'); return; }
        var ok = filled.every(function (f, k) { return tiles[f] === ans[k]; });
        m.read = true; M.save(); d.close();
        if (ok) {
          if (m.gift[0] === 'item') M.gatherGot(m.gift[1]); else { var g = {}; g[m.gift[0]] = m.gift[1]; M.give(g); }
          M.gardenFriendUp(m.from); M.sfx('win');
          M.modal('<div class="center"><img class="mface" src="' + M.custImg(m.from, true) + '" alt=""><h3>답장을 잘 보냈어요!</h3><p class="lang-' + lang + '"><b>' + M.fz(m.t, lang) + '</b></p><p>' + esc(m.k) + '</p><p class="hint">' + esc(c.name) + '이(가) 선물을 보냈어요</p><button class="btn primary wide" data-close>고마워요</button></div>');
        } else { M.sfx('bad'); M.modal('<div class="center"><h3>아쉬워요</h3><p class="lang-' + lang + '"><b>' + M.fz(m.t, lang) + '</b></p><p>' + esc(m.k) + '</p><button class="btn primary wide" data-close>알겠어요</button></div>'); }
      }
    });
  }
  function readMail(i) {
    if (X().mail[i].mode === 'dict' && !X().mail[i].read) { dictMail(i); return; }
    var x = X(), m = x.mail[i], c = M.custOf(m.from), lang = M.P.lang, o = OPEN[lang] || OPEN.en, cl = CLOSE[lang] || CLOSE.en;
    var opts = M.shuffle([m.k].concat(m.wrong));
    var d = M.modal('<div class="letter"><img class="lt-env" src="img/w/mail-open.png" alt=""><div class="lt-from"><img src="' + M.custImg(m.from) + '" alt=""><b>' + esc(c.name) + '</b></div>' +
      '<p class="lt-body lang-' + lang + '">' + esc(o[0]) + '<br><button class="lt-line" data-say="' + esc(m.say) + '">🔊 ' + M.fz(m.t, lang) + '</button><br>' + esc(cl[0]) + '</p></div>' +
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
        M.modal('<div class="center"><img class="mface" src="' + M.custImg(m.from, true) + '" alt=""><h3>정답! 「' + esc(m.k) + '」</h3><p>' + esc(c.name) + '이(가) 선물을 함께 보냈어요 ' + (m.gift[0] === 'item' ? '<img class="inl" src="img/w/mail-gift.png" alt="" style="width:28px;height:28px">' : M.rewardHtml((function () { var g = {}; g[m.gift[0]] = m.gift[1]; return g; })())) + '</p><button class="btn primary wide" data-close>좋아요</button></div>');
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
    lemonade: ['레몬에이드', '🍋', { pot_lemon: 2, cherry: 1 }, 'レモネード', '柠檬水', 'lemonade'],
    // 화분·밭(정원 가게)
    strawmilk: ['딸기우유', '🥛', { pot_strawberry: 2, gd_m2: 1 }, 'いちごミルク', '草莓牛奶', 'strawberry milk'],
    tomatopasta: ['토마토 파스타', '🍝', { pot_tomato: 2, gd_w2: 2, pan_oil: 1 }, 'トマトパスタ', '番茄意面', 'tomato pasta'],
    honeylemon: ['꿀레몬차', '🍋', { pot_lemon: 1, gd_h2: 1 }, 'はちみつレモン', '蜂蜜柠檬茶', 'honey lemon tea'],
    greentea: ['녹차', '🍵', { gd_c2: 1 }, 'りょくちゃ', '绿茶', 'green tea'],
    milktea: ['밀크티', '🧋', { gd_c1: 1, gd_m2: 1 }, 'ミルクティー', '奶茶', 'milk tea'],
    pancake: ['팬케이크', '🥞', { gd_w2: 1, gd_m2: 1, gd_h1: 1, 'for-nest': 1 }, 'パンケーキ', '松饼', 'pancakes'],
    muffin: ['블루베리 머핀', '🧁', { gd_b2: 1, gd_w2: 1 }, 'ブルーベリーマフィン', '蓝莓玛芬', 'blueberry muffin'],
    cheesetoast: ['치즈 토스트', '🧀', { gd_w4: 1, gd_m4: 1 }, 'チーズトースト', '芝士吐司', 'cheese toast'],
    frenchtoast: ['프렌치토스트', '🍞', { gd_w4: 1, gd_m2: 1, 'for-nest': 1 }, 'フレンチトースト', '法式吐司', 'French toast'],
    omelet: ['토마토 오믈렛', '🍳', { pot_tomato: 1, gd_m2: 1, 'for-nest': 1 }, 'オムレツ', '番茄蛋卷', 'tomato omelet'],
    rosetea: ['장미차', '🌹', { pot_rose: 1, gd_h1: 1 }, 'ローズティー', '玫瑰花茶', 'rose tea'],
    seedcookie: ['해바라기씨 쿠키', '🍪', { pot_sunflower: 1, gd_w2: 1, gd_h1: 1 }, 'ひまわりのたねクッキー', '葵花籽饼干', 'sunflower seed cookie'],
    honeytoast: ['허니 토스트', '🍯', { gd_w4: 1, 'for-honeycomb': 1 }, 'ハニートースト', '蜂蜜吐司', 'honey toast'],
    peachice: ['복숭아 아이스크림', '🍨', { peach: 2, gd_m3: 1 }, 'ももアイス', '桃子冰淇淋', 'peach ice cream'],
    // 숲
    berryyogurt: ['산딸기 요거트', '🍓', { 'for-raspberry': 2, gd_m3: 1 }, 'ラズベリーヨーグルト', '树莓酸奶', 'raspberry yogurt'],
    grapejuice: ['머루 주스', '🍇', { 'for-wildgrape': 2 }, 'ぶどうジュース', '葡萄汁', 'grape juice'],
    chestnut: ['군밤', '🌰', { 'for-chestnut': 3, pan_sugar: 1 }, 'やきぐり', '烤栗子', 'roasted chestnuts'],
    acornjelly: ['도토리묵', '🟫', { acorn: 4, 'min-salt': 1 }, 'どんぐりのゼリー', '橡子凉粉', 'acorn jelly'],
    mushpot: ['버섯전골', '🍲', { 'for-enoki': 1, 'for-oyster': 1, 'mush-brown': 1 }, 'きのこなべ', '蘑菇火锅', 'mushroom hot pot'],
    matsutake: ['송이 소금구이', '🍄', { 'for-matsutake': 1, 'min-salt': 1 }, 'まつたけのしおやき', '盐烤松茸', 'grilled matsutake'],
    namul: ['고사리나물', '🥬', { 'for-fiddlehead': 2, 'min-salt': 1 }, 'わらびのナムル', '凉拌蕨菜', 'seasoned bracken'],
    ginsengtea: ['인삼차', '🍵', { 'for-ginseng': 1, gd_h2: 1 }, 'にんじんちゃ', '人参茶', 'ginseng tea'],
    lotustea: ['연꽃차', '🪷', { 'for-lotus': 1, gd_c1: 1 }, 'はすのはなちゃ', '莲花茶', 'lotus tea'],
    dandsalad: ['민들레 샐러드', '🥗', { 'for-dandelion': 2, pot_tomato: 1 }, 'たんぽぽサラダ', '蒲公英沙拉', 'dandelion salad'],
    goldrisotto: ['황금 버섯 리조또', '✨', { 'for-goldmush': 1, gd_m3: 1, gd_w2: 1 }, 'きんのきのこリゾット', '金蘑菇烩饭', 'golden mushroom risotto'],
    // 바다
    clamnoodle: ['바지락 칼국수', '🍜', { 'sea-clam': 3, gd_w2: 1 }, 'あさりうどん', '蛤蜊面', 'clam noodles'],
    seaweedsoup: ['미역국', '🥣', { 'sea-wakame': 2, 'sea-mussel': 1 }, 'わかめスープ', '海带汤', 'seaweed soup'],
    gimbap: ['김밥', '🍙', { 'sea-nori': 1, pot_rice: 1, pot_carrot: 1, 'for-nest': 1 }, 'のりまき', '紫菜包饭', 'gimbap'],
    scallopgrill: ['가리비 구이', '🐚', { scallop: 2, 'min-salt': 1 }, 'ホタテやき', '烤扇贝', 'grilled scallops'],
    oysterjeon: ['굴전', '🥘', { 'sea-oyster': 2, gd_w2: 1, 'for-nest': 1 }, 'かきのチヂミ', '牡蛎煎', 'oyster pancake'],
    abaloneporridge: ['전복죽', '🥣', { 'sea-abalone': 1, pot_rice: 1 }, 'あわびがゆ', '鲍鱼粥', 'abalone porridge'],
    seafoodstew: ['해물탕', '🦀', { crab: 1, 'sea-hardclam': 1, 'sea-mussel': 1, conch: 1 }, 'かいせんなべ', '海鲜锅', 'seafood stew'],
    hijiki: ['톳 무침', '🥢', { 'sea-hijiki': 2, 'min-salt': 1 }, 'ひじきのあえもの', '凉拌羊栖菜', 'hijiki salad'],
    kelpbroth: ['다시마 우동', '🍜', { 'sea-kelp': 1, gd_w2: 2 }, 'こんぶうどん', '海带乌冬面', 'kelp udon'],
    urchinbowl: ['성게 덮밥', '🍚', { 'sea-urchin': 2, 'sea-nori': 1, pot_rice: 1 }, 'うにどん', '海胆盖饭', 'sea urchin bowl'],
    // 물고기 (낚시에서 '요리 재료로 담기')
    mackerelgrill: ['고등어 구이', '🐟', { fish_mackerel: 1, 'min-salt': 1 }, 'さばのしおやき', '烤鲭鱼', 'grilled mackerel'],
    saurygrill: ['꽁치 구이', '🐟', { fish_saury: 1, 'min-salt': 1 }, 'さんまのしおやき', '烤秋刀鱼', 'grilled saury'],
    salmonsteak: ['연어 스테이크', '🍣', { fish_salmon: 1, pot_lemon: 1 }, 'サーモンステーキ', '三文鱼排', 'salmon steak'],
    tunasushi: ['참치 초밥', '🍣', { fish_tuna: 1, pot_rice: 1 }, 'マグロずし', '金枪鱼寿司', 'tuna sushi'],
    eelbowl: ['장어덮밥', '🍱', { fish_eel: 1, pot_rice: 1, pan_soy: 1 }, 'うなどん', '鳗鱼饭', 'eel rice bowl'],
    shrimpfry: ['새우튀김', '🍤', { fish_shrimp: 2, gd_w2: 1 }, 'えびフライ', '炸虾', 'fried shrimp'],
    takoyaki: ['타코야키', '🐙', { fish_octopus: 1, gd_w2: 1, 'for-nest': 1 }, 'たこやき', '章鱼烧', 'takoyaki'],
    squidgrill: ['오징어 구이', '🦑', { fish_squid: 1, 'min-salt': 1 }, 'いかやき', '烤鱿鱼', 'grilled squid'],
    fishsoup: ['매운탕', '🍲', { fish_catfish: 1, pot_pepper: 1, 'sea-kelp': 1 }, 'さかなのからいスープ', '鱼汤', 'spicy fish stew'],
    // 여러 곳의 재료를 섞어 만드는 요리
    seafoodjeon: ['해물파전', '🥘', { fish_squid: 1, 'sea-clam': 2, gd_w2: 1, 'for-nest': 1 }, 'かいせんチヂミ', '海鲜煎饼', 'seafood pancake'],
    salmonpasta: ['연어 크림 파스타', '🍝', { fish_salmon: 1, gd_m3: 1, gd_w2: 1, 'mush-white': 1 }, 'サーモンクリームパスタ', '三文鱼奶油意面', 'salmon cream pasta'],
    mushomelet: ['버섯 치즈 오믈렛', '🍳', { 'for-oyster': 1, gd_m4: 1, 'for-nest': 1 }, 'きのことチーズのオムレツ', '蘑菇芝士蛋卷', 'mushroom cheese omelet'],
    fruityogurt: ['과일 꿀 요거트', '🍨', { 'for-raspberry': 1, apple: 1, gd_m3: 1, gd_h1: 1 }, 'フルーツヨーグルト', '水果蜂蜜酸奶', 'fruit honey yogurt'],
    abalonerice: ['전복 송이 솥밥', '🍚', { 'sea-abalone': 1, 'for-matsutake': 1, pot_rice: 1 }, 'あわびとまつたけのかまめし', '鲍鱼松茸饭', 'abalone matsutake rice'],
    eelginseng: ['장어 인삼탕', '🍲', { fish_eel: 1, 'for-ginseng': 1, 'sea-kelp': 1 }, 'うなぎとにんじんのスープ', '鳗鱼人参汤', 'eel ginseng soup'],
    shrimprisotto: ['새우 토마토 리조또', '🍤', { fish_shrimp: 1, pot_tomato: 1, gd_m3: 1, gd_w2: 1 }, 'えびとトマトのリゾット', '鲜虾番茄烩饭', 'shrimp tomato risotto'],
    seapizza: ['해산물 피자', '🍕', { fish_squid: 1, 'sea-mussel': 1, pot_tomato: 1, gd_m4: 1, gd_w3: 1 }, 'シーフードピザ', '海鲜披萨', 'seafood pizza'],
    picnicbox: ['소풍 도시락', '🍱', { pot_rice: 1, 'for-nest': 1, pot_strawberry: 1, fish_mackerel: 1 }, 'ピクニックべんとう', '野餐便当', 'picnic lunch box'],
    // 셋째 묶음
    strawcake: ['딸기 케이크', '🍰', { pot_strawberry: 2, gd_w3: 1, gd_m3: 1 }, 'いちごケーキ', '草莓蛋糕', 'strawberry cake'],
    bbcheesecake: ['블루베리 치즈케이크', '🍰', { gd_b2: 1, gd_m4: 1, gd_w2: 1 }, 'ブルーベリーチーズケーキ', '蓝莓芝士蛋糕', 'blueberry cheesecake'],
    lemontart: ['레몬 타르트', '🍋', { pot_lemon: 1, gd_w3: 1, 'for-nest': 1 }, 'レモンタルト', '柠檬挞', 'lemon tart'],
    peachtea: ['복숭아 홍차', '🍑', { peach: 1, gd_c2: 1 }, 'ピーチティー', '蜜桃红茶', 'peach tea'],
    cherryparfait: ['체리 파르페', '🍒', { cherry: 2, gd_m3: 1, gd_b1: 1 }, 'チェリーパフェ', '樱桃芭菲', 'cherry parfait'],
    applehoney: ['사과 꿀차', '🍎', { apple: 1, gd_h2: 1 }, 'りんごはちみつちゃ', '苹果蜂蜜茶', 'apple honey tea'],
    baesuk: ['배숙', '🍐', { pear: 1, gd_h2: 1 }, 'なしのはちみつむし', '蜂蜜蒸梨', 'steamed pear with honey'],
    marmalade: ['오렌지잼 토스트', '🍊', { orange: 2, gd_w4: 1 }, 'マーマレードトースト', '橙子果酱吐司', 'marmalade toast'],
    montblanc: ['밤 몽블랑', '🌰', { 'for-chestnut': 2, gd_m3: 1, gd_w3: 1 }, 'モンブラン', '栗子蒙布朗', 'Mont Blanc'],
    creamsoup: ['버섯 크림 수프', '🥣', { 'mush-white': 1, 'mush-brown': 1, gd_m3: 1 }, 'きのこクリームスープ', '奶油蘑菇汤', 'cream of mushroom soup'],
    mushskewer: ['버섯 꼬치', '🍢', { 'for-enoki': 1, 'for-oyster': 1, 'mush-brown': 1, 'min-salt': 1 }, 'きのこのくしやき', '烤蘑菇串', 'mushroom skewers'],
    bibimnoodle: ['나물 비빔국수', '🍜', { 'for-fiddlehead': 1, 'for-dandelion': 1, gd_w2: 1, 'for-nest': 1 }, 'ナムルのまぜめん', '野菜拌面', 'bibim noodles'],
    honeyice: ['벌집 아이스크림', '🍦', { 'for-honeycomb': 1, gd_m3: 1 }, 'はちみつアイス', '蜂巢冰淇淋', 'honeycomb ice cream'],
    musselstew: ['홍합 토마토 스튜', '🥘', { 'sea-mussel': 2, pot_tomato: 1 }, 'ムールがいのトマトに', '番茄炖青口', 'mussel tomato stew'],
    creamclam: ['대합 크림찜', '🐚', { 'sea-hardclam': 2, gd_m3: 1 }, 'はまぐりのクリームに', '奶油焖文蛤', 'creamy clams'],
    seaweedsalad: ['해초 샐러드', '🥗', { 'sea-wakame': 1, 'sea-codium': 1, 'sea-hijiki': 1 }, 'かいそうサラダ', '海藻沙拉', 'seaweed salad'],
    conchgrill: ['소라 구이', '🐚', { conch: 2, 'min-salt': 1 }, 'さざえのつぼやき', '烤海螺', 'grilled conch'],
    crabcroquette: ['게살 크림 고로케', '🦀', { crab: 1, gd_m3: 1, gd_w3: 1 }, 'かにクリームコロッケ', '蟹肉奶油可乐饼', 'crab cream croquette'],
    breamrice: ['도미 솥밥', '🍚', { fish_seabream: 1, 'sea-kelp': 1, pot_rice: 1 }, 'たいめし', '鲷鱼饭', 'sea bream rice'],
    octosalad: ['문어 샐러드', '🐙', { fish_octopus: 1, pot_tomato: 1, pot_lemon: 1 }, 'たこのマリネ', '章鱼沙拉', 'octopus salad'],
    taiyaki: ['붕어빵', '🐟', { gd_w2: 1, gd_m2: 1, 'for-chestnut': 1 }, 'たいやき', '鲷鱼烧', 'fish-shaped bun'],
    onigiri: ['연어 주먹밥', '🍙', { fish_salmon: 1, 'sea-nori': 1, pot_rice: 1 }, 'しゃけおにぎり', '三文鱼饭团', 'salmon rice ball'],
    // 넷째 묶음: 새 화분 작물(벼·감자·당근·고추·옥수수·단호박)과 양념
    curry: ['카레라이스', '🍛', { pot_rice: 1, pot_potato: 1, pot_carrot: 1, pan_curry: 1 }, 'カレーライス', '咖喱饭', 'curry rice'],
    tteokbokki: ['떡볶이', '🌶️', { pot_rice: 2, pot_pepper: 1, pan_sugar: 1 }, 'トッポッキ', '炒年糕', 'tteokbokki'],
    bibimbap: ['비빔밥', '🍲', { pot_rice: 1, 'for-fiddlehead': 1, 'for-nest': 1, pot_pepper: 1, pan_oil: 1 }, 'ビビンバ', '拌饭', 'bibimbap'],
    potatojeon: ['감자전', '🥔', { pot_potato: 2, 'min-salt': 1, pan_oil: 1 }, 'じゃがいものチヂミ', '土豆饼', 'potato pancake'],
    butterpotato: ['감자 버터구이', '🧈', { pot_potato: 1, pan_butter: 1 }, 'じゃがバター', '黄油烤土豆', 'butter potato'],
    carrotcake: ['당근 케이크', '🥕', { pot_carrot: 2, gd_w2: 1, pan_sugar: 1 }, 'キャロットケーキ', '胡萝卜蛋糕', 'carrot cake'],
    cornsoup: ['옥수수 수프', '🌽', { pot_corn: 2, gd_m3: 1, pan_butter: 1 }, 'コーンスープ', '玉米浓汤', 'corn soup'],
    corngrill: ['버터 옥수수 구이', '🌽', { pot_corn: 1, pan_butter: 1 }, 'やきとうもろこし', '黄油烤玉米', 'grilled butter corn'],
    pumpkinjuk: ['단호박죽', '🎃', { pot_pumpkin: 1, pot_rice: 1, pan_sugar: 1 }, 'かぼちゃがゆ', '南瓜粥', 'pumpkin porridge'],
    pumpkinpie: ['단호박 파이', '🥧', { pot_pumpkin: 1, gd_w3: 1, pan_sugar: 1 }, 'かぼちゃパイ', '南瓜派', 'pumpkin pie'],
    omurice: ['오므라이스', '🍳', { pot_rice: 1, 'for-nest': 1, pot_tomato: 1 }, 'オムライス', '蛋包饭', 'omurice'],
    soymush: ['버섯 간장 볶음', '🍄', { 'for-oyster': 1, 'mush-brown': 1, pan_soy: 1 }, 'きのこのしょうゆいため', '酱油炒蘑菇', 'soy-glazed mushrooms'],
    mackerelstew: ['고등어 조림', '🐟', { fish_mackerel: 1, pot_potato: 1, pan_soy: 1 }, 'さばのにつけ', '红烧鲭鱼', 'braised mackerel'],
    friedrice: ['해물 볶음밥', '🍤', { pot_rice: 1, fish_shrimp: 1, 'sea-clam': 1, pan_oil: 1 }, 'シーフードチャーハン', '海鲜炒饭', 'seafood fried rice'],
    potatosalad: ['감자 샐러드', '🥗', { pot_potato: 1, pot_carrot: 1, 'for-nest': 1 }, 'ポテトサラダ', '土豆沙拉', 'potato salad'],
    hotteok: ['꿀 호떡', '🥞', { gd_w2: 1, pan_sugar: 1, gd_h1: 1, 'for-chestnut': 1 }, 'ホットク', '糖饼', 'sweet pancake'],
    spicysquid: ['매운 오징어볶음', '🦑', { fish_squid: 1, pot_pepper: 1, pot_carrot: 1, pan_oil: 1 }, 'いかのからいため', '辣炒鱿鱼', 'spicy stir-fried squid'],
    jjamppong: ['짬뽕', '🍜', { gd_w2: 1, pot_pepper: 1, 'sea-mussel': 1, fish_shrimp: 1 }, 'チャンポン', '炒码面', 'spicy seafood noodles'],
    spicypotato: ['매콤 감자조림', '🥔', { pot_potato: 2, pot_pepper: 1, pan_soy: 1 }, 'ピリからじゃがいもの煮物', '辣炖土豆', 'spicy braised potatoes'],
    milkpudding: ['우유 푸딩', '🍮', { gd_m3: 1, pan_sugar: 1, 'for-nest': 1 }, 'ミルクプリン', '牛奶布丁', 'milk pudding'],
    gratin: ['치즈 감자 그라탕', '🧀', { pot_potato: 1, gd_m4: 1, pan_butter: 1 }, 'ポテトグラタン', '芝士焗土豆', 'potato gratin'],
    nutbar: ['견과 강정', '🌰', { acorn: 2, 'for-chestnut': 1, gd_h2: 1 }, 'ナッツバー', '坚果糖', 'nut bar'],
    spicyclam: ['매운 조개찜', '🐚', { 'sea-clam': 2, 'sea-hardclam': 1, pot_pepper: 1 }, 'かいのピリからむし', '辣蒸蛤蜊', 'spicy steamed clams'],
    spicymush: ['매운 버섯볶음', '🍄', { 'for-enoki': 1, 'mush-brown': 1, pot_pepper: 1, pan_oil: 1 }, 'きのこのからいため', '辣炒蘑菇', 'spicy stir-fried mushrooms'],
    salmonbowl: ['연어 덮밥', '🍣', { fish_salmon: 1, pot_rice: 1, pan_soy: 1 }, 'サーモンどん', '三文鱼盖饭', 'salmon rice bowl']
  };
  // 기본 양념: 요리 화면의 '양념 가게'에서 코인으로 산다
  var PANTRY = {
    sugar: ['설탕', '🍬', 10, 'さとう', '糖|táng', 'sugar'], butter: ['버터', '🧈', 15, 'バター', '黄油|huángyóu', 'butter'],
    soy: ['간장', '🫙', 12, 'しょうゆ', '酱油|jiàngyóu', 'soy sauce'], oil: ['참기름', '🫗', 12, 'ごまあぶら', '香油|xiāngyóu', 'sesame oil'],
    curry: ['카레 가루', '🟡', 20, 'カレーこ', '咖喱粉|gālífěn', 'curry powder']
  };
  function pan() { M.P.pantry = M.P.pantry || {}; return M.P.pantry; }
  M.PANTRY = PANTRY;
  function dishIcon(id) { return '<img src="img/w/dish-' + id + '.png" alt="">'; }
  M.dishIcon = dishIcon;
  function src(k) { return k.indexOf('pot_') === 0 ? 'pot' : k.indexOf('gd_') === 0 ? 'gd' : k.indexOf('fish_') === 0 ? 'fish' : k.indexOf('pan_') === 0 ? 'pan' : 'bag'; }
  function fishOf(id) { return (M.FISH || []).filter(function (f) { return f.id === id; })[0] || { ko: id }; }
  function have(k) {
    var t = src(k);
    if (t === 'pot') { var p = M.P.pots; return p && p.fruits ? p.fruits[k.slice(4)] || 0 : 0; }
    if (t === 'gd') return M.gardenHave ? M.gardenHave(k.slice(3)) : 0;
    if (t === 'fish') return (M.P.fishBag || {})[k.slice(5)] || 0;
    if (t === 'pan') return pan()[k.slice(4)] || 0;
    var g = M.P.gather; return g && g.bag ? g.bag[k] || 0 : 0;
  }
  function take(k, n) {
    var t = src(k);
    if (t === 'pot') M.P.pots.fruits[k.slice(4)] -= n;
    else if (t === 'gd') M.gardenTake(k.slice(3), n);
    else if (t === 'fish') M.P.fishBag[k.slice(5)] -= n;
    else if (t === 'pan') pan()[k.slice(4)] -= n;
    else M.P.gather.bag[k] -= n;
  }
  function ingIcon(k) {
    var t = src(k);
    if (t === 'pot') return M.potFruitIcon(k.slice(4));
    if (t === 'pan') return '<img src="img/w/pan-' + k.slice(4) + '.png" alt="" title="' + PANTRY[k.slice(4)][0] + '">';
    return '<img src="' + ingImg(k) + '" alt="" title="' + ingName(k) + '">';
  }
  function ingImg(k) { var t = src(k); if (t === 'pot') return 'img/w/fruit-' + k.slice(4) + '.png'; if (t === 'gd') return M.gardenItemInfo(k.slice(3)).img; if (t === 'fish') return 'img/w/fish-' + k.slice(5) + '.png'; return M.GATHER.ITEMS[k].img; }
  function ingName(k) { var t = src(k); if (t === 'pot') return (M.SEEDS[k.slice(4)] || {}).name || k; if (t === 'gd') return M.gardenItemInfo(k.slice(3)).name; if (t === 'fish') return fishOf(k.slice(5)).ko; if (t === 'pan') return PANTRY[k.slice(4)][0]; return M.GATHER.ITEMS[k].ko; }
  function ingWhere(k) { var t = src(k); if (t === 'pot') return '집 화분에서 키워요'; if (t === 'gd') return '정원 가게 밭에서 합쳐 만들어요'; if (t === 'fish') return '낚시로 잡고 "요리 재료로 담기"를 눌러요'; if (t === 'pan') return '요리 화면 위의 🛒 양념 가게에서 사요'; var c = M.GATHER.ITEMS[k].cat; return { fruit: '마을 열매 나무를 흔들어요', forest: '숲 바닥에서 줍거나 나무를 흔들어요', mineral: '바위를 두드리거나 땅굴에서 캐요', sea: '모래사장에서 주워요', bug: '곤충을 잡아요', fossil: '땅을 파요' }[c] || ''; }
  // ---------- 레시피 얻기 ----------
  // 처음에는 기본 8가지만 안다. 새 재료를 처음 얻으면 그 재료로 만드는 요리 하나를 알게 되고,
  // 주민과 이야기하거나 마을에서 레시피 쪽지를 주워도 알게 된다.
  var STARTER = ['salad', 'jam', 'soup', 'pie', 'tart', 'juice', 'berrybowl', 'lemonade'];
  function R() {
    var x = X();
    if (!x.recipes) {   // 처음: 기본 요리 + 이미 만든 요리 + 지금까지 얻은 재료로 다 만들 수 있는 요리
      x.recipes = {}; STARTER.forEach(function (id) { x.recipes[id] = 1; });
      Object.keys(x.dishes || {}).forEach(function (id) { if (DISH[id]) x.recipes[id] = 1; });
      var seen = everIngs(); x.seenIng = seen;
      Object.keys(DISH).forEach(function (id) { if (Object.keys(DISH[id][2]).every(function (k) { return seen[k]; })) x.recipes[id] = 1; });
      M.save();
    }
    x.seenIng = x.seenIng || {};
    return x;
  }
  // 지금까지 한 번이라도 얻은 재료
  function everIngs() {
    var o = {}, P = M.P, g = P.gather || {}, gd = P.garden || {};
    Object.keys(g.dex || {}).forEach(function (k) { o[k] = 1; });
    Object.keys((P.pots && P.pots.fruits) || {}).forEach(function (k) { o['pot_' + k] = 1; });
    Object.keys(P.fishDex || {}).forEach(function (k) { o['fish_' + k] = 1; });
    Object.keys(P.fishBag || {}).forEach(function (k) { o['fish_' + k] = 1; });
    Object.keys(P.pantry || {}).forEach(function (k) { o['pan_' + k] = 1; });
    Object.keys(gd.found || {}).forEach(function (k) { for (var l = 1; l <= (gd.found[k] || 0); l++) o['gd_' + k + l] = 1; });
    ['f', 't', 'h', 'b', 'c', 'm', 'w'].forEach(function (k) { if (M.gardenHave) for (var l = 1; l <= 5; l++) if (M.gardenHave(k + l) > 0) o['gd_' + k + l] = 1; });
    return o;
  }
  function locked() { var x = R(); return Object.keys(DISH).filter(function (id) { return !x.recipes[id]; }); }
  function learn(id, why) {
    var x = R(); if (!id || x.recipes[id]) return null;
    x.recipes[id] = 1; M.save();
    M.fxPop({ bg: 'fx-scroll', img: 'img/w/dish-' + id + '.png', title: '📜 새 레시피: ' + DISH[id][0], sub: why || '' }); M.sfx && M.sfx('win');
    return id;
  }
  M.recipeKnown = function (id) { return !!R().recipes[id]; };
  M.recipeCount = function () { return [Object.keys(R().recipes).filter(function (id) { return DISH[id]; }).length, Object.keys(DISH).length]; };
  // 새 재료를 처음 얻었는지 살펴서 레시피를 하나씩 알려 준다
  M.recipeCheck = function () {
    var x = R(), seen = everIngs(), got = [];
    Object.keys(seen).forEach(function (k) {
      if (x.seenIng[k]) return; x.seenIng[k] = 1;
      var c = locked().filter(function (id) { return DISH[id][2][k]; });
      if (!c.length) return;
      var easy = c.filter(function (id) { return Object.keys(DISH[id][2]).every(function (q) { return seen[q]; }); });
      var id = M.pick(easy.length ? easy : c);
      if (learn(id, M.j(ingName(k), '을', '를') + ' 처음 얻었어요')) got.push(id);
    });
    M.save();
    return got;
  };
  // 레시피 쪽지·땅 파기·주민에게서 하나 배운다 (pref: 이 주민이 좋아하는 맛 우선)
  M.recipeLearnRandom = function (why, cid) {
    var L = locked(); if (!L.length) return null;
    var seen = everIngs(), pool = L;
    if (cid && M.dishReaction) { var fav = L.filter(function (id) { return M.dishReaction(cid, id) >= 2; }); if (fav.length) pool = fav; }
    var easy = pool.filter(function (id) { return Object.keys(DISH[id][2]).every(function (q) { return seen[q]; }); });
    return learn(M.pick(easy.length ? easy : pool), why);
  };
  M.recipeName = function (id) { return DISH[id] ? DISH[id][0] : ''; };

  M.cookSheet = function () {
    var x = R(); M.recipeCheck();
    var tab = 'all', TABS = [['all', '전체'], ['ok', '만들 수 있음'], ['mix', '🍱 섞어 만들기'], ['farm', '🌱 밭·화분·열매'], ['forest', '🌲 숲'], ['sea', '🐚 바다'], ['fish', '🐟 물고기']];
    var KI = { farm: '🌱', forest: '🌲', sea: '🐚', fish: '🐟' };
    var d = M.modal('<h3>🍳 요리하기 <small id="ckCount"></small></h3><p class="hint">재료 그림을 누르면 어디서 구하는지 알려 줘요. 요리를 주민에게 주면 친밀도가 올라요.</p><button class="btn wide" data-pantry>🛒 양념 가게 <small>설탕·버터·간장·참기름·카레 가루</small></button><div class="fcats" id="ckTabs"></div><div class="list" id="ckList"></div><button class="btn ghost wide" data-close>닫기</button>');
    // 요리에 들어가는 재료가 어디서 나는지 모두 모은다 (소금 같은 양념은 뺀다)
    function kinds(r) {
      var o = {};
      Object.keys(r[2]).forEach(function (k) {
        var t = src(k), c = t === 'bag' ? M.GATHER.ITEMS[k].cat : '';
        if (t === 'pot' || t === 'gd' || c === 'fruit') o.farm = 1; else if (t === 'fish') o.fish = 1; else if (c === 'sea') o.sea = 1; else if (c === 'forest') o.forest = 1;
      });
      return ['farm', 'forest', 'sea', 'fish'].filter(function (k) { return o[k]; });
    }
    function inTab(r, ok) { var ks = kinds(r); return tab === 'all' || (tab === 'ok' ? ok : tab === 'mix' ? ks.length >= 2 : ks.indexOf(tab) >= 0); }
    function paint() {
      d.querySelector('#ckTabs').innerHTML = TABS.map(function (t) { return '<button data-ct="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('');
      var ids = Object.keys(DISH).filter(function (id) { return x.recipes[id]; }).map(function (id) { var r = DISH[id]; return { id: id, ok: Object.keys(r[2]).every(function (k) { return have(k) >= r[2][k]; }) }; })
        .filter(function (o) { return inTab(DISH[o.id], o.ok); });
      ids.sort(function (a, b) { return (b.ok ? 1 : 0) - (a.ok ? 1 : 0); });
      d.querySelector('#ckList').innerHTML = ids.length ? ids.map(function (o) {
        var id = o.id, r = DISH[id], ok = o.ok;
        return '<div class="recipe' + (ok ? ' ok' : '') + '"><span class="le dishe">' + dishIcon(id) + '</span><div class="ln">' + r[0] + ' <span class="dkind">' + kinds(r).map(function (k) { return KI[k]; }).join('') + '</span>' + (x.dishes[id] ? ' <small>가진 것 ' + x.dishes[id] + '</small>' : '') + '<div class="needs">' +
          Object.keys(r[2]).map(function (k) { return '<button class="ing' + (have(k) >= r[2][k] ? ' got' : '') + '" data-ing="' + k + '">' + ingIcon(k) + '<i>' + have(k) + '/' + r[2][k] + '</i></button>'; }).join('') +
          '</div></div><div class="rbtns"><button class="btn ' + (ok ? 'primary' : 'ghost') + '" data-cook="' + id + '"' + (ok ? '' : ' disabled') + '>만들기</button>' + (x.dishes[id] ? '<button class="btn" data-eat="' + id + '">먹기</button>' + (M.Family && M.Family.canGift && M.Family.canGift() ? '<button class="btn" data-dsend="' + id + '">💌 보내기</button>' : '') : '') + '</div></div>';
      }).join('') : '<p class="hint center">지금 재료로 만들 수 있는 요리가 없어요</p>';
      var lk = locked().length;
      if (lk) d.querySelector('#ckList').innerHTML += '<div class="rlock">🔒 아직 모르는 레시피 <b>' + lk + '가지</b><small>새 재료를 처음 얻거나, 주민과 이야기하거나, 마을 풀밭의 📜 레시피 쪽지를 주우면 하나씩 알게 돼요.</small></div>';
      var hc = d.querySelector('#ckCount'); if (hc) hc.textContent = '알아낸 레시피 ' + M.recipeCount().join(' / ');
    }
    paint();
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-pantry]')) { pantrySheet(paint); return; }
      var t = e.target.closest('[data-ct]'); if (t) { tab = t.dataset.ct; paint(); return; }
      var g = e.target.closest('[data-ing]'); if (g) { var k = g.dataset.ing; M.toast(ingName(k) + ' · ' + ingWhere(k)); return; }
      var et = e.target.closest('[data-eat]'); if (et) { M.eatDish(et.dataset.eat, paint); return; }
      var ds = e.target.closest('[data-dsend]'); if (ds) { if (M.Family.sendGift({ k: 'dish', id: ds.dataset.dsend })) paint(); return; }
      var b = e.target.closest('[data-cook]'); if (!b || b.disabled) return;
      var id = b.dataset.cook, r = DISH[id]; Object.keys(r[2]).forEach(function (k) { take(k, r[2][k]); });
      x.dishes[id] = (x.dishes[id] || 0) + 1; x.cooked = (x.cooked || 0) + 1; M.save(); M.sfx('win');
      var L = M.P.lang, nm = L === 'ja' ? r[3] : L === 'zh' ? r[4] : r[5]; M.say(nm, L);
      M.modal('<div class="center"><span class="gbig dbig">' + dishIcon(id) + '</span><h3>' + r[0] + ' 완성!</h3><button class="gname lang-' + L + '" data-gsay="' + esc(nm) + '">🔊 ' + esc(nm) + '</button><p class="hint">주민에게 선물하면 친밀도가 올라요. 좋아하는 맛이면 더 많이 올라요</p><button class="btn primary wide" data-close>좋아요</button></div>'); paint();
    });
  };
  function pantrySheet(after) {
    var d = M.modal('<h3>🛒 양념 가게</h3><p class="hint">하나씩 사요. 이름을 누르면 배우는 말로 들려줘요.</p><div class="list" id="pnList"></div><button class="btn ghost wide" data-close>닫기</button>', { onClose: after });
    function paint() {
      var L = M.P.lang;
      d.querySelector('#pnList').innerHTML = Object.keys(PANTRY).map(function (k) {
        var r = PANTRY[k], z = r[4].split('|'), nm = L === 'ja' ? r[3] : L === 'zh' ? z[0] : r[5];
        return '<div class="litem"><span class="le dishe"><img src="img/w/pan-' + k + '.png" alt=""></span><span class="ln">' + r[0] + ' <button class="gname lang-' + L + '" data-gsay="' + esc(nm) + '">🔊 ' + esc(nm) + '</button><small>가진 것 ' + (pan()[k] || 0) + '</small></span><button class="btn primary" data-pbuy="' + k + '"><img class="inl" src="img/coin.png" alt="">' + r[2] + '</button></div>';
      }).join('');
    }
    paint();
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pbuy]'); if (!b) return;
      var k = b.dataset.pbuy; if (!M.spend('coins', PANTRY[k][2])) { M.toast('코인이 모자라요'); return; }
      pan()[k] = (pan()[k] || 0) + 1; M.save(); M.recipeCheck(); M.sfx('coin'); if (M.paintTop) M.paintTop(); paint();
    });
  }

  // ---------- 주민 입맛 ----------
  var TAG = { sweet: '🍯 달콤한 것', sea: '🐚 해산물', fish: '🐟 생선', mush: '🍄 버섯', veg: '🥬 채소', tea: '🍵 차', dairy: '🥛 우유·치즈', bread: '🍞 빵·밀가루', spicy: '🌶️ 매운 것', rice: '🍚 밥', nut: '🌰 견과' };
  var TASTE = {
    bear: { love: ['sweet'], like: ['fish', 'nut'], hate: ['spicy'] }, squirrel: { love: ['nut'], like: ['sweet', 'bread'], hate: ['fish'] },
    chick: { love: ['bread'], like: ['veg', 'rice'], hate: ['spicy'] }, hedgehog: { love: ['mush'], like: ['veg', 'nut'], hate: ['sweet'] },
    panda: { love: ['veg'], like: ['rice', 'tea'], hate: ['fish'] }, fox: { love: ['rice'], like: ['sea', 'fish'], hate: ['sweet'] },
    koala: { love: ['tea'], like: ['veg', 'sweet'], hate: ['dairy'] }, hamster: { love: ['nut'], like: ['bread', 'veg'], hate: ['spicy'] },
    penguin: { love: ['fish'], like: ['sea', 'rice'], hate: ['veg'] }, cat: { love: ['fish'], like: ['dairy', 'sea'], hate: ['veg'] },
    sheep: { love: ['veg'], like: ['bread', 'dairy'], hate: ['fish'] }, owl: { love: ['tea'], like: ['mush', 'bread'], hate: ['spicy'] },
    // 그림이 오면 이사 올 새 주민
    dog: { love: ['dairy'], like: ['bread', 'sweet'], hate: ['mush'] }, otter: { love: ['sea'], like: ['fish', 'spicy'], hate: ['nut'] },
    deer: { love: ['mush'], like: ['veg', 'tea'], hate: ['sea'] }, duck: { love: ['bread'], like: ['veg', 'sea'], hate: ['dairy'] },
    lion: { love: ['spicy'], like: ['fish', 'dairy'], hate: ['tea'] }, camel: { love: ['spicy'], like: ['rice', 'nut'], hate: ['bread'] },
    elephant: { love: ['nut'], like: ['sweet', 'veg'], hate: ['fish'] }, monkey: { love: ['sweet'], like: ['nut', 'spicy'], hate: ['rice'] }
  };
  M.TASTE = TASTE; M.TASTE_TAG = TAG;
  var SWEETI = /^(apple|orange|peach|pear|cherry|for-raspberry|for-wildgrape|for-honeycomb|pot_strawberry|pan_sugar|gd_h|gd_b)/;
  function dishTags(id) {
    var r = DISH[id], o = {};
    Object.keys(r[2]).forEach(function (k) {
      var t = src(k), c = t === 'bag' ? M.GATHER.ITEMS[k].cat : '';
      if (SWEETI.test(k)) o.sweet = 1;
      if (t === 'fish') o.fish = 1;
      if (c === 'sea') o.sea = 1;
      if (/mush|enoki|oyster|matsutake|^for-goldmush/.test(k) && c === 'forest') o.mush = 1;
      if (/^(pot_(tomato|potato|carrot|corn|pumpkin)|for-(fiddlehead|dandelion)|sea-(wakame|codium|hijiki))/.test(k)) o.veg = 1;
      if (/^gd_c|^pot_rose|^for-(lotus|ginseng)/.test(k)) o.tea = 1;
      if (/^gd_m|^pan_butter/.test(k)) o.dairy = 1;
      if (/^gd_w/.test(k)) o.bread = 1;
      if (/^pot_pepper|^pan_curry/.test(k)) o.spicy = 1;
      if (/^pot_rice/.test(k)) o.rice = 1;
      if (/^(acorn|for-chestnut|pot_sunflower)/.test(k)) o.nut = 1;
    });
    if (/tea$|juice|lemonade|milk|honeylemon/.test(id)) o.tea = o.tea || /tea/.test(id) ? 1 : 0;
    return Object.keys(o).filter(function (k) { return o[k]; });
  }
  M.dishTags = dishTags;
  // 3 아주 좋아함, 2 좋아함, 1 보통, 0 싫어함
  function reaction(cid, dish) {
    var T = TASTE[cid]; if (!T) return 2;
    var tg = dishTags(dish);
    if (tg.some(function (t) { return T.hate.indexOf(t) >= 0; })) return 0;
    if (tg.some(function (t) { return T.love.indexOf(t) >= 0; })) return 3;
    if (tg.some(function (t) { return T.like.indexOf(t) >= 0; })) return 2;
    return 1;
  }
  M.dishReaction = reaction;
  M.tasteLine = function (cid) { var T = TASTE[cid]; if (!T) return ''; return '<p class="taste">❤️ ' + T.love.concat(T.like).map(function (t) { return TAG[t]; }).join(' · ') + '<br>💔 ' + T.hate.map(function (t) { return TAG[t]; }).join(' · ') + '</p>'; };
  var YUM = { ja: 'おいしい！', en: 'Delicious!', zh: '好吃！' }, MEH = { ja: 'うーん…', en: 'Hmm…', zh: '嗯……' };

  // ---------- 요리 먹기: 맛에 따라 30분 동안 도움이 되는 효과 ----------
  var BUFF = {
    power: { em: '🌶️', name: '매운 힘', desc: '곤충 배틀 힘 +25%' },
    fish: { em: '🐟', name: '바다 내음', desc: '귀한 물고기 잘 물어요' },
    bug: { em: '🍵', name: '차분함', desc: '곤충이 두 배로 자주 나와요' },
    luck: { em: '🍄', name: '숲의 행운', desc: '행운의 향수 효과' }
  };
  M.BUFF = BUFF;
  function buffs() { M.P.buffs = M.P.buffs || {}; return M.P.buffs; }
  M.buffLeft = function (k) { return Math.max(0, (buffs()[k] || 0) - Date.now()); };
  M.buffOn = function (k) { return M.buffLeft(k) > 0; };
  M.buffList = function () { return Object.keys(BUFF).filter(M.buffOn).map(function (k) { return { k: k, em: BUFF[k].em, name: BUFF[k].name, desc: BUFF[k].desc, min: Math.ceil(M.buffLeft(k) / 60000) }; }); };
  M.eatDish = function (id, after) {
    var x = X(); if (!x.dishes[id]) return;
    var tg = dishTags(id), got = [], b = buffs(), now = Date.now(), add = function (k) { b[k] = Math.max(b[k] || 0, now) + 30 * 60000; got.push(BUFF[k].em + ' ' + BUFF[k].name + ' 30분 (' + BUFF[k].desc + ')'); };
    if (tg.indexOf('spicy') >= 0) add('power');
    if (tg.indexOf('fish') >= 0 || tg.indexOf('sea') >= 0) add('fish');
    if (tg.indexOf('tea') >= 0) add('bug');
    if (tg.indexOf('mush') >= 0 || tg.indexOf('veg') >= 0) add('luck');
    var water = 0;
    if (tg.indexOf('rice') >= 0 || tg.indexOf('bread') >= 0 || tg.indexOf('dairy') >= 0) { water = 8; M.give({ water: water }); got.push('💧 물방울 +' + water); }
    if (tg.indexOf('sweet') >= 0) { if (M.petExp) M.petExp(6); got.push('💗 ' + M.P.petName + ' 친밀도 +6'); }
    if (!got.length) { M.give({ water: 5 }); got.push('💧 물방울 +5'); }
    x.dishes[id]--; M.save(); M.sfx('win'); if (M.paintTop) M.paintTop();
    var L = M.P.lang; M.say(L === 'ja' ? 'いただきます！' : L === 'zh' ? '我开动了！' : "Let's eat!", L);
    M.fxPop({ bg: 'fx-hearts', img: 'img/w/dish-' + id + '.png', title: DISH[id][0] + ' 냠냠!', sub: got.join('<br>'), ms: 2800 });
    if (after) after();
  };

  // ---------- 주민 요리 주문 (게시판에 하루 2개) ----------
  M.dishOrders = function () {
    var x = X(), day = M.today();
    if (!x.orders || x.orders.day !== day) {
      var res = (M.V && M.V.residents ? M.V.residents() : []).slice(), known = Object.keys(DISH).filter(function (id) { return M.recipeKnown(id); }), list = [];
      M.shuffle(res).slice(0, 2).forEach(function (c) {
        var fav = known.filter(function (id) { return reaction(c.id, id) >= 2; });
        var pool = fav.length ? fav : known; if (!pool.length) return;
        var dish = M.pick(pool); list.push({ cid: c.id, dish: dish, coins: 60 + Object.keys(DISH[dish][2]).length * 25, done: false });
      });
      x.orders = { day: day, list: list }; M.save();
    }
    return x.orders.list;
  };
  M.dishOrderHtml = function () {
    var x = X(), list = M.dishOrders(); if (!list.length) return '';
    return '<h4>🍲 요리 주문</h4><div class="list">' + list.map(function (o, i) {
      var c = M.custOf(o.cid) || { name: o.cid }, have = (x.dishes[o.dish] || 0) > 0;
      return '<div class="reqc' + (o.done ? ' done' : '') + '"><span class="rqwho"><img src="' + (M.custImg(o.cid) || '') + '" alt=""><small>' + esc(c.name) + '</small></span><span class="rqtxt"><span class="rqdish"><img src="img/w/dish-' + o.dish + '.png" alt=""><b>' + esc(DISH[o.dish][0]) + '</b></span><small>' + (o.done ? '전달했어요 ✔' : o.coins + '코인 · ♥♥ · ' + (have ? '<span class="ok">가지고 있어요</span>' : '아직 없어요')) + '</small></span>' + (o.done ? '' : '<button class="btn primary rqgo" data-order="' + i + '"' + (have ? '' : ' disabled') + '>전달</button>') + '</div>';
    }).join('') + '</div>';
  };
  M.dishOrderDeliver = function (i) {
    var x = X(), o = M.dishOrders()[i]; if (!o || o.done || !(x.dishes[o.dish] > 0)) return false;
    x.dishes[o.dish]--; o.done = true; M.give({ coins: o.coins }); M.save(); M.sfx('win');
    M.fxPop({ bg: 'fx-hearts', img: M.custImg(o.cid, true) || 'img/w/dish-' + o.dish + '.png', title: (M.custOf(o.cid) || {}).name + ': "고마워요! 정말 맛있어요!"', sub: '+' + o.coins + '코인 · 친밀도 ♥♥' });
    M.gardenFriendUp(o.cid); M.gardenFriendUp(o.cid);
    return true;
  };

  M.dishGiftable = function (id) { var x = X(); return !x.fed[id] && Object.keys(x.dishes).some(function (k) { return x.dishes[k] > 0; }); };
  M.dishGiftSheet = function (id) {
    var x = X(), c = M.custOf(id), ks = Object.keys(x.dishes).filter(function (k) { return x.dishes[k] > 0; });
    var d = M.modal('<h3>🍲 ' + esc(M.j(c.name, '이', '')) + '에게 어떤 요리를 줄까요?</h3><div class="list">' + (M.tasteLine(id) || '') + ks.map(function (k) { var rv = reaction(id, k); return '<button class="litem" data-dish="' + k + '"><span class="le dishe">' + dishIcon(k) + '</span><span class="ln">' + DISH[k][0] + ' <small>' + ['💔', '', '❤️', '❤️❤️'][rv] + '</small></span><span class="lp own">' + x.dishes[k] + '개</span></button>'; }).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dish]'); if (!b) return;
      var dk = b.dataset.dish, rv = reaction(id, dk), L = M.P.lang; d.close();
      if (rv === 0) { M.sfx('bad'); M.say(MEH[L] || MEH.en, L); M.modal('<div class="center"><img class="mface" src="' + M.custImg(id, false) + '" alt=""><h3>' + esc(c.name) + ': "' + DISH[dk][0] + '… 미안해요, 이건 잘 못 먹어요."</h3><p class="hint">요리는 돌려받았어요. 다른 요리를 줘 보세요.</p><button class="btn primary wide" data-close>알겠어요</button></div>'); return; }
      x.dishes[dk]--; x.fed[id] = 1; M.save(); M.sfx('win'); M.say(YUM[L] || YUM.en, L); if (rv >= 2) M.fxFloat('fx-hearts', 130);
      var line = rv === 3 ? '! 제일 좋아하는 맛이에요!' : rv === 2 ? '! 정말 맛있어요!' : ', 고마워요. 잘 먹을게요.';
      M.modal('<div class="center"><img class="mface" src="' + M.custImg(id, true) + '" alt=""><h3>' + esc(c.name) + ': "' + DISH[dk][0] + line + '"</h3><p class="hint">친밀도가 ' + ['', '조금', '크게', '아주 크게'][rv] + ' 올랐어요 ' + new Array(rv + 1).join('♥') + '</p><button class="btn primary wide" data-close>좋아요</button></div>', { onClose: function () { for (var q = 0; q < rv; q++) M.gardenFriendUp(id); } });
    });
  };

  // ---------- 떠돌이 장터 ----------
  // 남편이 연 특별 장터 (가족 연결의 원격 관리에서 연다)
  M.hmarket = function () { var h = X().hmarket; return h && h.until > Date.now() ? h : null; };
  var HK = { furn: '가구', item: '재료', seed: '씨앗', pan: '양념', bait: '미끼' };
  function hInfo(k, id) {
    if (k === 'furn') { var f = (M.FURN || []).filter(function (z) { return z.id === id; })[0]; return f && { name: f.name, img: 'img/furn-' + id + '.png', base: f.price }; }
    if (k === 'item') { var it = M.GATHER.ITEMS[id]; return it && { name: it.ko, img: it.img, base: it.price }; }
    if (k === 'seed') { var sd = (M.SEEDS || {})[id]; return sd && { name: sd.name + ' 씨앗', img: sd.img ? 'img/w/fruit-' + id + '.png' : '', em: sd.fruit, base: sd.price }; }
    if (k === 'pan') { var r = PANTRY[id]; return r && { name: r[0], img: 'img/w/pan-' + id + '.png', base: r[2] }; }
    if (k === 'bait') { var B = (M.BAITS || {})[id]; return B && { name: B.name, em: B.em, base: B.price }; }
  }
  function hGive(k, id) {
    var P = M.P;
    if (k === 'furn') { P.room.owned[id] = true; P.room.placed[id] = { x: 50, y: 70 }; }
    else if (k === 'item') { P.gather = P.gather || { bag: {}, dex: {} }; P.gather.bag[id] = (P.gather.bag[id] || 0) + 1; P.gather.dex[id] = (P.gather.dex[id] || 0) + 1; }
    else if (k === 'seed') { P.pots = P.pots || { slots: 2, list: [], seeds: {}, fert: 0, fruits: {}, gifted: {}, giftDay: '' }; P.pots.seeds[id] = (P.pots.seeds[id] || 0) + 1; }
    else if (k === 'pan') pan()[id] = (pan()[id] || 0) + 1;
    else if (k === 'bait') { P.bait = P.bait || { worm: 0, fat: 0, gold: 0, use: 'worm' }; P.bait[id] = (P.bait[id] || 0) + 1; }
  }
  M.hmarketOpen = function (c) {
    var x = X();
    if (!c) { x.hmarket = null; M.save(); return; }
    var num = function (v, lo, hi) { v = parseInt(v, 10); return isNaN(v) ? lo : Math.max(lo, Math.min(hi, v)); };
    x.hmarket = { until: num(c.until, 0, Date.now() + 8 * 86400000), msg: String(c.msg || '').slice(0, 50), sold: 0, bought: 0,
      sell: (c.sell || []).slice(0, 120).map(function (s) { var k = HK[s.k] ? s.k : 'furn'; return { k: k, id: String(s.id), price: num(s.price, 1, 100000), n: k === 'furn' ? 1 : num(s.n, 1, 999) }; }).filter(function (s) { return hInfo(s.k, s.id); }),
      buy: (c.buy || []).slice(0, 60).filter(function (b) { return M.GATHER.ITEMS[b.id]; }).map(function (b) { return { id: String(b.id), price: num(b.price, 1, 100000), n: num(b.n, 1, 999) }; }) };
    M.save(); M.toast('🦝 ' + ((M.Family && M.Family.mateName()) || '남편') + ' 너구리가 마을 광장에 특별 장터를 열었어요!');
  };
  M.marketToday = function () { var n = Math.floor(Date.now() / 86400000); return n % 3 === 0 || !!M.hmarket(); };
  function hmarketSheet() {
    var h = M.hmarket(); if (!h) return;
    var who = (M.Family && M.Family.mateName()) || '남편', bag = (M.P.gather && M.P.gather.bag) || {}, I = M.GATHER.ITEMS;
    var d = M.modal('<div class="mintro"><img class="mface" src="img/w/cust-raccoon.png" alt=""><div class="msay"><b>🦝 ' + esc(who) + ' 너구리의 특별 장터</b><p>' + esc(h.msg || '어서 와요! 특별가예요~') + '</p></div></div><div id="hmBody"></div><button class="btn ghost wide" data-close>나가기</button>', { cls: 'bagsheet' });
    function paint() {
      var sell = h.sell.filter(function (s) { return s.n > 0 && !(s.k === 'furn' && (M.P.room.owned || {})[s.id]); }), buy = h.buy.filter(function (b) { return b.n > 0; });
      d.querySelector('#hmBody').innerHTML = (sell.length ? '<h4>💸 특가로 팔아요</h4><div class="list">' + sell.map(function (s, i) { var f = hInfo(s.k, s.id); return '<div class="litem"><span class="le dishe">' + (f.img ? '<img src="' + f.img + '" alt="">' : f.em) + '</span><span class="ln">' + esc(f.name) + '<small>' + HK[s.k] + ' · <s>' + f.base + '</s> → <b>' + s.price + '</b>코인' + (s.k === 'furn' ? '' : ' · ' + s.n + '개 남음') + '</small></span><button class="btn primary" data-hs="' + h.sell.indexOf(s) + '">사기</button></div>'; }).join('') + '</div>' : '') +
        (buy.length ? '<h4>💰 비싸게 사 줄게요</h4><div class="list">' + buy.map(function (b) { var it = I[b.id], have = bag[b.id] || 0; return '<div class="litem"><span class="le dishe"><img src="' + it.img + '" alt=""></span><span class="ln">' + esc(it.ko) + '<small>하나에 ' + b.price + '코인 (원래 ' + it.price + ') · ' + b.n + '개까지 · 가진 것 ' + have + '</small></span><button class="btn primary" data-hb="' + b.id + '"' + (have ? '' : ' disabled') + '>팔기</button></div>'; }).join('') + '</div>' : '') +
        (!sell.length && !buy.length ? '<p class="hint center">오늘 물건은 다 팔렸어요!</p>' : '');
    }
    paint();
    d.addEventListener('click', function (e) {
      var a = e.target.closest('[data-hs]'), b = e.target.closest('[data-hb]');
      if (a) { var s = h.sell[+a.dataset.hs], f = hInfo(s.k, s.id); if (!s || s.n <= 0) return;
        if (!M.spend('coins', s.price)) { M.toast('코인이 모자라요'); return; }
        hGive(s.k, s.id); s.n--; h.sold++; M.save(); M.sfx('coin'); if (M.paintTop) M.paintTop(); M.toast(f.name + '을(를) 샀어요!' + (s.k === 'furn' ? ' 방에 놓았어요' : '')); paint(); if (M.recipeCheck) setTimeout(M.recipeCheck, 600); return; }
      if (b && !b.disabled) { var o = h.buy.filter(function (z) { return z.id === b.dataset.hb; })[0], have = bag[o.id] || 0; if (!have || o.n <= 0) return;
        bag[o.id]--; o.n--; h.bought++; M.give({ coins: o.price }); M.sfx('coin'); M.save(); if (M.paintTop) M.paintTop(); paint(); }
    });
  }
  M.marketSheet = function () {
    if (M.hmarket()) { hmarketSheet(); return; }
    var x = X(), lang = M.P.lang, day = M.today();
    var pool = (M.FURN || []).filter(function (f) { return f.price >= 120 && !(M.P.room.owned || {})[f.id]; });
    var seed = parseInt(day.replace(/\D/g, ''), 10), pick = [];
    for (var i = 0; i < pool.length * 4 && pick.length < Math.min(4, pool.length); i++) { var f = pool[(seed * 7 + i * 5 + Math.floor(i / pool.length)) % pool.length]; if (pick.indexOf(f) < 0) pick.push(f); }
    x.marketDisc = x.marketDisc && x.marketDisc.day === day ? x.marketDisc : { day: day, rate: 1 };
    var d = M.modal('<div class="mintro"><img class="mface" src="img/w/cust-raccoon.png" alt=""><div class="msay"><b>너구리 상인 너굴</b><p>어서 와요! 오늘만 파는 귀한 물건이에요. 퀴즈를 맞히면 30% 깎아 줄게요!</p></div></div>' +
      '<div class="fgrid">' + pick.map(function (f) { var pr = Math.round(f.price * x.marketDisc.rate); return '<button class="fcard" data-mk="' + f.id + '"><img src="img/furn-' + f.id + '.png" alt=""><b>' + f.name + '</b><small class="price"><img src="img/coin.png" alt="">' + pr + '</small></button>'; }).join('') + '</div>' +
      (x.marketDisc.rate < 1 ? '<p class="hint center">🎉 오늘은 30% 할인 중!</p>' : '<button class="btn wide" data-mq>🧩 퀴즈 풀고 깎기</button>') + '<button class="btn ghost wide" data-close>나가기</button>');
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-mq]')) {
        var items = M.learnedItems(lang).filter(function (it) { return it.k && !it.kana; }); if (items.length < 3) { M.toast('낱말을 조금 더 배우고 와요!'); return; }
        var three = M.shuffle(items).slice(0, 3), t = three[0]; d.close();
        var q = M.modal('<div class="center"><img class="mface" src="img/w/cust-raccoon.png" alt=""><h3 class="lang-' + lang + '">' + esc(t.t) + ' <button class="csay mqsay" aria-label="듣기">🔊</button></h3><p>이 말의 뜻은?</p></div><div class="copts">' + M.shuffle(three).map(function (it) { return '<button class="copt" data-k="' + esc(it.k) + '">' + esc(it.k) + '</button>'; }).join('') + '</div>');
        M.say(t.say, lang); q.querySelector('.mqsay').onclick = function () { M.say(t.say, lang); };
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
