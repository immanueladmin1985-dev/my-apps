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
    var d = M.modal('<div class="center"><img class="mbx" src="img/w/mail-box.png" alt=""></div><h3>📮 우체통</h3>' + (x.mail.length ? '<div class="list">' + x.mail.slice().reverse().map(function (m, ri) {
      var i = x.mail.length - 1 - ri, c = M.custOf(m.from);
      return '<button class="litem" data-mail="' + i + '"><span class="le"><img src="img/w/mail-' + (m.read ? 'open' : 'closed') + '.png" alt=""></span><span class="ln">' + esc(c.name) + '의 편지<small>' + (m.read ? '읽음' : '✉️ 새 편지!') + '</small></span><span class="lp' + (m.read ? ' own' : '') + '">' + (m.read ? '다시 보기' : '열기') + '</span></button>';
    }).join('') + '</div>' : '<p class="hint center">아직 편지가 없어요. 내일 아침에 다시 확인해 보세요!</p>') + '<button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-mail]'); if (!b) return; d.close(); readMail(+b.dataset.mail); });
  };
  function readMail(i) {
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
    tomatopasta: ['토마토 파스타', '🍝', { pot_tomato: 2, gd_w2: 2 }, 'トマトパスタ', '番茄意面', 'tomato pasta'],
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
    chestnut: ['군밤', '🌰', { 'for-chestnut': 3 }, 'やきぐり', '烤栗子', 'roasted chestnuts'],
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
    gimbap: ['김밥', '🍙', { 'sea-nori': 1, 'for-fiddlehead': 1, 'for-nest': 1 }, 'のりまき', '紫菜包饭', 'gimbap'],
    scallopgrill: ['가리비 구이', '🐚', { scallop: 2, 'min-salt': 1 }, 'ホタテやき', '烤扇贝', 'grilled scallops'],
    oysterjeon: ['굴전', '🥘', { 'sea-oyster': 2, gd_w2: 1, 'for-nest': 1 }, 'かきのチヂミ', '牡蛎煎', 'oyster pancake'],
    abaloneporridge: ['전복죽', '🥣', { 'sea-abalone': 1, gd_w2: 1 }, 'あわびがゆ', '鲍鱼粥', 'abalone porridge'],
    seafoodstew: ['해물탕', '🦀', { crab: 1, 'sea-hardclam': 1, 'sea-mussel': 1, conch: 1 }, 'かいせんなべ', '海鲜锅', 'seafood stew'],
    hijiki: ['톳 무침', '🥢', { 'sea-hijiki': 2, 'min-salt': 1 }, 'ひじきのあえもの', '凉拌羊栖菜', 'hijiki salad'],
    kelpbroth: ['다시마 우동', '🍜', { 'sea-kelp': 1, gd_w2: 2 }, 'こんぶうどん', '海带乌冬面', 'kelp udon'],
    urchinbowl: ['성게 덮밥', '🍚', { 'sea-urchin': 2, 'sea-nori': 1 }, 'うにどん', '海胆盖饭', 'sea urchin bowl'],
    // 물고기 (낚시에서 '요리 재료로 담기')
    mackerelgrill: ['고등어 구이', '🐟', { fish_mackerel: 1, 'min-salt': 1 }, 'さばのしおやき', '烤鲭鱼', 'grilled mackerel'],
    saurygrill: ['꽁치 구이', '🐟', { fish_saury: 1, 'min-salt': 1 }, 'さんまのしおやき', '烤秋刀鱼', 'grilled saury'],
    salmonsteak: ['연어 스테이크', '🍣', { fish_salmon: 1, pot_lemon: 1 }, 'サーモンステーキ', '三文鱼排', 'salmon steak'],
    tunasushi: ['참치 초밥', '🍣', { fish_tuna: 1, 'sea-nori': 1 }, 'マグロずし', '金枪鱼寿司', 'tuna sushi'],
    eelbowl: ['장어덮밥', '🍱', { fish_eel: 1, gd_h1: 1 }, 'うなどん', '鳗鱼饭', 'eel rice bowl'],
    shrimpfry: ['새우튀김', '🍤', { fish_shrimp: 2, gd_w2: 1 }, 'えびフライ', '炸虾', 'fried shrimp'],
    takoyaki: ['타코야키', '🐙', { fish_octopus: 1, gd_w2: 1, 'for-nest': 1 }, 'たこやき', '章鱼烧', 'takoyaki'],
    squidgrill: ['오징어 구이', '🦑', { fish_squid: 1, 'min-salt': 1 }, 'いかやき', '烤鱿鱼', 'grilled squid'],
    fishsoup: ['매운탕', '🍲', { fish_catfish: 1, 'sea-kelp': 1 }, 'さかなのからいスープ', '鱼汤', 'spicy fish stew'],
    // 여러 곳의 재료를 섞어 만드는 요리
    seafoodjeon: ['해물파전', '🥘', { fish_squid: 1, 'sea-clam': 2, gd_w2: 1, 'for-nest': 1 }, 'かいせんチヂミ', '海鲜煎饼', 'seafood pancake'],
    salmonpasta: ['연어 크림 파스타', '🍝', { fish_salmon: 1, gd_m3: 1, gd_w2: 1, 'mush-white': 1 }, 'サーモンクリームパスタ', '三文鱼奶油意面', 'salmon cream pasta'],
    mushomelet: ['버섯 치즈 오믈렛', '🍳', { 'for-oyster': 1, gd_m4: 1, 'for-nest': 1 }, 'きのことチーズのオムレツ', '蘑菇芝士蛋卷', 'mushroom cheese omelet'],
    fruityogurt: ['과일 꿀 요거트', '🍨', { 'for-raspberry': 1, apple: 1, gd_m3: 1, gd_h1: 1 }, 'フルーツヨーグルト', '水果蜂蜜酸奶', 'fruit honey yogurt'],
    abalonerice: ['전복 송이 솥밥', '🍚', { 'sea-abalone': 1, 'for-matsutake': 1, gd_w2: 1 }, 'あわびとまつたけのかまめし', '鲍鱼松茸饭', 'abalone matsutake rice'],
    eelginseng: ['장어 인삼탕', '🍲', { fish_eel: 1, 'for-ginseng': 1, 'sea-kelp': 1 }, 'うなぎとにんじんのスープ', '鳗鱼人参汤', 'eel ginseng soup'],
    shrimprisotto: ['새우 토마토 리조또', '🍤', { fish_shrimp: 1, pot_tomato: 1, gd_m3: 1, gd_w2: 1 }, 'えびとトマトのリゾット', '鲜虾番茄烩饭', 'shrimp tomato risotto'],
    seapizza: ['해산물 피자', '🍕', { fish_squid: 1, 'sea-mussel': 1, pot_tomato: 1, gd_m4: 1, gd_w3: 1 }, 'シーフードピザ', '海鲜披萨', 'seafood pizza'],
    picnicbox: ['소풍 도시락', '🍱', { 'sea-nori': 1, 'for-nest': 1, pot_strawberry: 1, fish_mackerel: 1 }, 'ピクニックべんとう', '野餐便当', 'picnic lunch box'],
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
    breamrice: ['도미 솥밥', '🍚', { fish_seabream: 1, 'sea-kelp': 1, gd_w2: 1 }, 'たいめし', '鲷鱼饭', 'sea bream rice'],
    octosalad: ['문어 샐러드', '🐙', { fish_octopus: 1, pot_tomato: 1, pot_lemon: 1 }, 'たこのマリネ', '章鱼沙拉', 'octopus salad'],
    taiyaki: ['붕어빵', '🐟', { gd_w2: 1, gd_m2: 1, 'for-chestnut': 1 }, 'たいやき', '鲷鱼烧', 'fish-shaped bun'],
    onigiri: ['연어 주먹밥', '🍙', { fish_salmon: 1, 'sea-nori': 1, gd_w2: 1 }, 'しゃけおにぎり', '三文鱼饭团', 'salmon rice ball']
  };
  var DIMG = { salad: 1, jam: 1, soup: 1, pie: 1, tart: 1, juice: 1, berrybowl: 1, lemonade: 1 };   // 그림이 있는 요리 (나머지는 이모지)
  function dishIcon(id) { return DIMG[id] ? '<img src="img/w/dish-' + id + '.png" alt="">' : '<b class="demo">' + DISH[id][1] + '</b>'; }
  M.dishIcon = dishIcon;
  function src(k) { return k.indexOf('pot_') === 0 ? 'pot' : k.indexOf('gd_') === 0 ? 'gd' : k.indexOf('fish_') === 0 ? 'fish' : 'bag'; }
  function fishOf(id) { return (M.FISH || []).filter(function (f) { return f.id === id; })[0] || { ko: id }; }
  function have(k) {
    var t = src(k);
    if (t === 'pot') { var p = M.P.pots; return p && p.fruits ? p.fruits[k.slice(4)] || 0 : 0; }
    if (t === 'gd') return M.gardenHave ? M.gardenHave(k.slice(3)) : 0;
    if (t === 'fish') return (M.P.fishBag || {})[k.slice(5)] || 0;
    var g = M.P.gather; return g && g.bag ? g.bag[k] || 0 : 0;
  }
  function take(k, n) {
    var t = src(k);
    if (t === 'pot') M.P.pots.fruits[k.slice(4)] -= n;
    else if (t === 'gd') M.gardenTake(k.slice(3), n);
    else if (t === 'fish') M.P.fishBag[k.slice(5)] -= n;
    else M.P.gather.bag[k] -= n;
  }
  function ingImg(k) { var t = src(k); if (t === 'pot') return 'img/w/fruit-' + k.slice(4) + '.png'; if (t === 'gd') return M.gardenItemInfo(k.slice(3)).img; if (t === 'fish') return 'img/w/fish-' + k.slice(5) + '.png'; return M.GATHER.ITEMS[k].img; }
  function ingName(k) { var t = src(k); if (t === 'pot') return (M.SEEDS[k.slice(4)] || {}).name || k; if (t === 'gd') return M.gardenItemInfo(k.slice(3)).name; if (t === 'fish') return fishOf(k.slice(5)).ko; return M.GATHER.ITEMS[k].ko; }
  function ingWhere(k) { var t = src(k); if (t === 'pot') return '집 화분에서 키워요'; if (t === 'gd') return '정원 가게 밭에서 합쳐 만들어요'; if (t === 'fish') return '낚시로 잡고 "요리 재료로 담기"를 눌러요'; var c = M.GATHER.ITEMS[k].cat; return { fruit: '마을 열매 나무를 흔들어요', forest: '숲 바닥에서 줍거나 나무를 흔들어요', mineral: '바위를 두드리거나 땅굴에서 캐요', sea: '모래사장에서 주워요', bug: '곤충을 잡아요', fossil: '땅을 파요' }[c] || ''; }
  M.cookSheet = function () {
    var x = X();
    var tab = 'all', TABS = [['all', '전체'], ['ok', '만들 수 있음'], ['mix', '🍱 섞어 만들기'], ['farm', '🌱 밭·화분·열매'], ['forest', '🌲 숲'], ['sea', '🐚 바다'], ['fish', '🐟 물고기']];
    var KI = { farm: '🌱', forest: '🌲', sea: '🐚', fish: '🐟' };
    var d = M.modal('<h3>🍳 요리하기 <small>' + Object.keys(DISH).length + '가지</small></h3><p class="hint">재료 그림을 누르면 어디서 구하는지 알려 줘요. 요리를 주민에게 주면 친밀도가 두 칸 올라요.</p><div class="fcats" id="ckTabs"></div><div class="list" id="ckList"></div><button class="btn ghost wide" data-close>닫기</button>');
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
      var ids = Object.keys(DISH).map(function (id) { var r = DISH[id]; return { id: id, ok: Object.keys(r[2]).every(function (k) { return have(k) >= r[2][k]; }) }; })
        .filter(function (o) { return inTab(DISH[o.id], o.ok); });
      ids.sort(function (a, b) { return (b.ok ? 1 : 0) - (a.ok ? 1 : 0); });
      d.querySelector('#ckList').innerHTML = ids.length ? ids.map(function (o) {
        var id = o.id, r = DISH[id], ok = o.ok;
        return '<div class="recipe' + (ok ? ' ok' : '') + '"><span class="le dishe">' + dishIcon(id) + '</span><div class="ln">' + r[0] + ' <span class="dkind">' + kinds(r).map(function (k) { return KI[k]; }).join('') + '</span>' + (x.dishes[id] ? ' <small>가진 것 ' + x.dishes[id] + '</small>' : '') + '<div class="needs">' +
          Object.keys(r[2]).map(function (k) { return '<button class="ing' + (have(k) >= r[2][k] ? ' got' : '') + '" data-ing="' + k + '"><img src="' + ingImg(k) + '" alt="" title="' + ingName(k) + '"><i>' + have(k) + '/' + r[2][k] + '</i></button>'; }).join('') +
          '</div></div><button class="btn ' + (ok ? 'primary' : 'ghost') + '" data-cook="' + id + '"' + (ok ? '' : ' disabled') + '>만들기</button></div>';
      }).join('') : '<p class="hint center">지금 재료로 만들 수 있는 요리가 없어요</p>';
    }
    paint();
    d.addEventListener('click', function (e) {
      var t = e.target.closest('[data-ct]'); if (t) { tab = t.dataset.ct; paint(); return; }
      var g = e.target.closest('[data-ing]'); if (g) { var k = g.dataset.ing; M.toast(ingName(k) + ' · ' + ingWhere(k)); return; }
      var b = e.target.closest('[data-cook]'); if (!b || b.disabled) return;
      var id = b.dataset.cook, r = DISH[id]; Object.keys(r[2]).forEach(function (k) { take(k, r[2][k]); });
      x.dishes[id] = (x.dishes[id] || 0) + 1; M.save(); M.sfx('win');
      var L = M.P.lang, nm = L === 'ja' ? r[3] : L === 'zh' ? r[4] : r[5]; M.say(nm, L);
      M.modal('<div class="center"><span class="gbig dbig">' + dishIcon(id) + '</span><h3>' + r[0] + ' 완성!</h3><button class="gname lang-' + L + '" data-gsay="' + esc(nm) + '">🔊 ' + esc(nm) + '</button><p class="hint">주민에게 선물하면 친밀도가 두 칸 올라요</p><button class="btn primary wide" data-close>좋아요</button></div>'); paint();
    });
  };
  M.dishGiftable = function (id) { var x = X(); return !x.fed[id] && Object.keys(x.dishes).some(function (k) { return x.dishes[k] > 0; }); };
  M.dishGiftSheet = function (id) {
    var x = X(), c = M.custOf(id), ks = Object.keys(x.dishes).filter(function (k) { return x.dishes[k] > 0; });
    var d = M.modal('<h3>🍲 ' + esc(M.j(c.name, '이', '')) + '에게 어떤 요리를 줄까요?</h3><div class="list">' + ks.map(function (k) { return '<button class="litem" data-dish="' + k + '"><span class="le dishe">' + dishIcon(k) + '</span><span class="ln">' + DISH[k][0] + '</span><span class="lp own">' + x.dishes[k] + '개</span></button>'; }).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>');
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
    var d = M.modal('<div class="mintro"><img class="mface" src="img/w/cust-raccoon.png" alt=""><div class="msay"><b>너구리 상인 너굴</b><p>어서 와요! 오늘만 파는 귀한 물건이에요. 퀴즈를 맞히면 30% 깎아 줄게요!</p></div></div>' +
      '<div class="fgrid">' + pick.map(function (f) { var pr = Math.round(f.price * x.marketDisc.rate); return '<button class="fcard" data-mk="' + f.id + '"><img src="img/furn-' + f.id + '.png" alt=""><b>' + f.name + '</b><small class="price"><img src="img/coin.png" alt="">' + pr + '</small></button>'; }).join('') + '</div>' +
      (x.marketDisc.rate < 1 ? '<p class="hint center">🎉 오늘은 30% 할인 중!</p>' : '<button class="btn wide" data-mq>🧩 퀴즈 풀고 깎기</button>') + '<button class="btn ghost wide" data-close>나가기</button>');
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-mq]')) {
        var items = M.learnedItems(lang).filter(function (it) { return it.k && !it.kana; }); if (items.length < 3) { M.toast('낱말을 조금 더 배우고 와요!'); return; }
        var three = M.shuffle(items).slice(0, 3), t = three[0]; d.close();
        var q = M.modal('<div class="center"><img class="mface" src="img/w/cust-raccoon.png" alt=""><h3 class="lang-' + lang + '">' + esc(t.t) + '</h3><p>이 말의 뜻은?</p></div><div class="copts">' + M.shuffle(three).map(function (it) { return '<button class="copt" data-k="' + esc(it.k) + '">' + esc(it.k) + '</button>'; }).join('') + '</div>');
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
