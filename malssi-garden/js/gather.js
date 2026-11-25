// 채집 (말씨정원). 마을에서 나무 흔들기·바위 두드리기·줍기·화석 캐기·곤충 잡기로 모은 것을 가방에 담는다.
// 주울 때마다 배우는 말로 이름을 알려 주고, 박물관 도감에 기록한다. 재료(나뭇가지·통나무·돌·점토·금)는 집 넓히기에 쓴다.
(function () {
  var M = window.M, $ = M.$, esc = M.esc, H = 3600 * 1000;
  // id: [한국어, 분류, 값, ja, zh(글자|병음), en]
  var RAW = {
    apple: ['사과', 'fruit', 12, 'りんご', '苹果|píngguǒ', 'apple'], orange: ['오렌지', 'fruit', 12, 'オレンジ', '橙子|chéngzi', 'orange'],
    peach: ['복숭아', 'fruit', 14, 'もも', '桃子|táozi', 'peach'], pear: ['배', 'fruit', 14, 'なし', '梨|lí', 'pear'], cherry: ['체리', 'fruit', 16, 'さくらんぼ', '樱桃|yīngtáo', 'cherry'],
    branch: ['나뭇가지', 'forest', 3, 'えだ', '树枝|shùzhī', 'branch'], log: ['통나무', 'forest', 10, 'まるた', '木头|mùtou', 'log'], acorn: ['도토리', 'forest', 5, 'どんぐり', '橡子|xiàngzi', 'acorn'],
    pinecone: ['솔방울', 'forest', 5, 'まつぼっくり', '松果|sōngguǒ', 'pinecone'], leaf: ['낙엽', 'forest', 2, 'おちば', '落叶|luòyè', 'fallen leaf'],
    'mush-red': ['빨간 버섯', 'forest', 15, 'あかいきのこ', '红蘑菇|hóng mógu', 'red mushroom'], 'mush-brown': ['표고버섯', 'forest', 12, 'しいたけ', '香菇|xiānggū', 'shiitake'],
    'mush-white': ['양송이', 'forest', 10, 'マッシュルーム', '白蘑菇|bái mógu', 'white mushroom'], flowers: ['들꽃 다발', 'forest', 8, 'はなたば', '花束|huāshù', 'bouquet'],
    clover: ['네잎클로버', 'forest', 40, 'よつばのクローバー', '四叶草|sìyècǎo', 'four-leaf clover'],
    stone: ['돌', 'mineral', 4, 'いし', '石头|shítou', 'stone'], pebble: ['조약돌', 'mineral', 6, 'こいし', '小石子|xiǎo shízǐ', 'pebble'], clay: ['점토', 'mineral', 6, 'ねんど', '黏土|niántǔ', 'clay'],
    gold: ['금광석', 'mineral', 120, 'きん', '金子|jīnzi', 'gold'], gem: ['보석', 'mineral', 200, 'ほうせき', '宝石|bǎoshí', 'gem'],
    scallop: ['가리비', 'sea', 8, 'ほたて', '扇贝|shànbèi', 'scallop'], conch: ['소라', 'sea', 12, 'まきがい', '海螺|hǎiluó', 'conch'], coral: ['산호', 'sea', 25, 'さんご', '珊瑚|shānhú', 'coral'],
    starfish: ['불가사리', 'sea', 15, 'ひとで', '海星|hǎixīng', 'starfish'], pearl: ['진주 조개', 'sea', 150, 'しんじゅ', '珍珠|zhēnzhū', 'pearl'], sanddollar: ['모래 달러', 'sea', 10, 'カシパン', '沙钱|shāqián', 'sand dollar'],
    glass: ['바다 유리', 'sea', 18, 'シーグラス', '海玻璃|hǎi bōli', 'sea glass'], crab: ['게', 'sea', 20, 'かに', '螃蟹|pángxiè', 'crab'], bottle: ['유리병 편지', 'sea', 60, 'ボトルメール', '漂流瓶|piāoliúpíng', 'message in a bottle'],
    seaweed: ['해초', 'sea', 4, 'かいそう', '海草|hǎicǎo', 'seaweed'],
    yellowbf: ['노랑나비', 'bug', 25, 'きいろいちょうちょ', '黄蝴蝶|huáng húdié', 'yellow butterfly'], bluebf: ['파랑나비', 'bug', 35, 'あおいちょうちょ', '蓝蝴蝶|lán húdié', 'blue butterfly'],
    ladybug: ['무당벌레', 'bug', 20, 'てんとうむし', '瓢虫|piáochóng', 'ladybug'], bee: ['꿀벌', 'bug', 30, 'みつばち', '蜜蜂|mìfēng', 'bee'], dragonfly: ['잠자리', 'bug', 30, 'とんぼ', '蜻蜓|qīngtíng', 'dragonfly'],
    beetle: ['장수풍뎅이', 'bug', 80, 'カブトムシ', '独角仙|dújiǎoxiān', 'rhinoceros beetle'], stag: ['사슴벌레', 'bug', 90, 'クワガタ', '锹形虫|qiāoxíngchóng', 'stag beetle'],
    firefly: ['반딧불이', 'bug', 60, 'ほたる', '萤火虫|yínghuǒchóng', 'firefly'], cicada: ['매미', 'bug', 25, 'セミ', '蝉|chán', 'cicada'], snail: ['달팽이', 'bug', 15, 'かたつむり', '蜗牛|wōniú', 'snail'],
    bone: ['뼈 화석', 'fossil', 80, 'ほねのかせき', '骨头化石|gǔtou huàshí', 'bone fossil'], ammonite: ['암모나이트', 'fossil', 100, 'アンモナイト', '菊石|júshí', 'ammonite'],
    footprint: ['발자국 화석', 'fossil', 90, 'あしあとのかせき', '脚印化石|jiǎoyìn huàshí', 'footprint fossil'], trilobite: ['삼엽충', 'fossil', 110, 'さんようちゅう', '三叶虫|sānyèchóng', 'trilobite'],
    tooth: ['이빨 화석', 'fossil', 120, 'きばのかせき', '牙齿化石|yáchǐ huàshí', 'tooth fossil'], leaffos: ['나뭇잎 화석', 'fossil', 70, 'このはのかせき', '叶子化石|yèzi huàshí', 'leaf fossil'],
    diamond: ['다이아몬드', 'mineral', 300, 'ダイヤモンド', '钻石|zuànshí', 'diamond'], ruby: ['루비', 'mineral', 220, 'ルビー', '红宝石|hóngbǎoshí', 'ruby'],
    sapphire: ['사파이어', 'mineral', 220, 'サファイア', '蓝宝石|lánbǎoshí', 'sapphire'], silver: ['은광석', 'mineral', 60, 'ぎん', '银|yín', 'silver'],
    oldkey: ['낡은 열쇠', 'fossil', 90, 'ふるいかぎ', '旧钥匙|jiù yàoshi', 'old key'], skull: ['공룡 두개골', 'fossil', 400, 'きょうりゅうのずがいこつ', '恐龙头骨|kǒnglóng tóugǔ', 'dinosaur skull'],
    mammoth: ['매머드 이빨', 'fossil', 250, 'マンモスのきば', '猛犸象牙|měngmǎ xiàngyá', 'mammoth tusk'],
    amber: ['호박', 'fossil', 150, 'こはく', '琥珀|hǔpò', 'amber'], coin: ['옛날 동전', 'fossil', 130, 'ふるいコイン', '古钱币|gǔ qiánbì', 'old coin']
  };
  var IMG = { apple: 'it-apple', orange: 'it-orange', peach: 'it-peach', pear: 'it-pear', cherry: 'it-cherry', branch: 'it-branch', log: 'it-log', acorn: 'it-acorn', pinecone: 'it-pinecone', leaf: 'it-leaf',
    'mush-red': 'it-mush-red', 'mush-brown': 'it-mush-brown', 'mush-white': 'it-mush-white', flowers: 'it-flowers', clover: 'it-clover', stone: 'it-stone', pebble: 'it-pebble', clay: 'it-clay', gold: 'it-gold', gem: 'it-gem',
    bone: 'fos-bone', ammonite: 'fos-ammonite', footprint: 'fos-footprint', trilobite: 'fos-trilobite', tooth: 'fos-tooth', leaffos: 'fos-leaf', amber: 'fos-amber', coin: 'fos-coin', diamond: 'dg-diamond', ruby: 'dg-ruby', sapphire: 'dg-sapphire', silver: 'dg-silver', oldkey: 'dg-key', skull: 'dg-skull', mammoth: 'dg-mammoth' };
  var ITEMS = {};
  Object.keys(RAW).forEach(function (id) {
    var r = RAW[id], z = r[4].split('|');
    ITEMS[id] = { id: id, ko: r[0], cat: r[1], price: r[2], ja: [r[3], ''], zh: [z[0], z[1]], en: [r[5], ''], img: 'img/w/' + (IMG[id] || (r[1] === 'sea' ? 'sea-' + id : r[1] === 'bug' ? 'bug-' + id : 'it-' + id)) + '.png' };
  });
  // 곤충이 나오는 때와 곳: m 아침, d 낮, e 저녁, n 밤 / flower 꽃·풀, tree 나무, water 물가
  var BUGS = { yellowbf: ['md', 'flower', 3], bluebf: ['d', 'flower', 2], ladybug: ['md', 'flower', 3], bee: ['md', 'flower', 2], dragonfly: ['de', 'water', 2], beetle: ['en', 'tree', 1], stag: ['n', 'tree', 1], firefly: ['n', 'water', 2], cicada: ['d', 'tree', 2], snail: ['me', 'flower', 2] };
  var CATS = { fruit: '🍎 열매', forest: '🌲 숲', mineral: '🪨 광물', sea: '🐚 바다', bug: '🦋 곤충', fossil: '🦴 화석' };
  M.GATHER = { ITEMS: ITEMS, BUGS: BUGS };

  function S() {
    var g = M.P.gather = M.P.gather || { bag: {}, dex: {}, trees: {}, rocks: {}, picked: {}, day: '' };
    if (g.day !== M.today()) { g.day = M.today(); g.picked = {}; g.rocks = {}; g.wood = {}; }
    g.wood = g.wood || {};
    return g;
  }
  function slot() { var h = new Date().getHours(); return h >= 5 && h < 10 ? 'm' : h >= 10 && h < 17 ? 'd' : h >= 17 && h < 20 ? 'e' : 'n'; }
  function pickW(list) { var s = list.reduce(function (a, x) { return a + x[1]; }, 0), r = Math.random() * s; for (var i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; } return list[0][0]; }
  function nm(it) { var L = M.P.lang, v = it[L] || it.en; return v; }

  // ---------- 얻기 ----------
  var popT = 0;
  M.gatherGot = function (id, n) {
    n = n || 1; var it = ITEMS[id], g = S(); if (!it) return;
    var first = !g.dex[id]; g.bag[id] = (g.bag[id] || 0) + n; g.dex[id] = (g.dex[id] || 0) + n; M.save();
    var host = document.querySelector('.world') || document.body, el = document.getElementById('gPop');
    if (!el) { el = document.createElement('div'); el.id = 'gPop'; el.className = 'gpop'; host.appendChild(el); }
    var v = nm(it), lang = M.P.lang;
    el.innerHTML = '<img src="' + it.img + '" alt=""><div><b>' + it.ko + (n > 1 ? ' ×' + n : '') + (first ? ' <span class="newtag">처음!</span>' : '') + '</b><button class="gname lang-' + lang + '" data-gsay="' + esc(v[0]) + '">🔊 ' + esc(v[0]) + (v[1] ? ' <small>' + esc(v[1]) + '</small>' : '') + '</button></div>';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    M.say(v[0], lang); M.sfx(first ? 'win' : 'pop');
    clearTimeout(popT); popT = setTimeout(function () { el.classList.remove('show'); }, 2600);
    if (M.quest) M.quest('gather', 1);
  };
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-gsay]'); if (b) M.say(b.dataset.gsay, M.P.lang); });

  // 열매 나무: 열매는 6시간마다 다시 열린다
  M.fruitReady = function (key) { var t = S().trees[key]; return !t || Date.now() - t >= 6 * H; };
  M.fruitLeft = function (key) { var t = S().trees[key]; return t ? Math.max(0, 6 * H - (Date.now() - t)) : 0; };
  M.shakeFruitTree = function (key, kind) {
    var g = S();
    if (M.fruitReady(key)) { g.trees[key] = Date.now(); M.save(); M.gatherGot(kind, 3); return true; }
    if (!g.wood[key]) { g.wood[key] = 1; M.save(); if (Math.random() < 0.5) { M.gatherGot(Math.random() < 0.7 ? 'branch' : 'leaf'); return true; } }
    var m = Math.ceil(M.fruitLeft(key) / 60000); M.toast('열매가 다시 열리려면 ' + (m >= 60 ? Math.floor(m / 60) + '시간 ' : '') + (m % 60) + '분 남았어요');
    return false;
  };
  // 일반 나무: 하루 한 번 흔들면 나뭇가지·통나무·도토리 등
  M.shakeTree = function (key, pine) {
    var g = S(); if (g.wood[key]) { M.toast('오늘은 이 나무에서 다 주웠어요. 내일 또 와요!'); return false; }
    g.wood[key] = 1; M.save();
    var id = pickW([['branch', 45], ['log', 18], [pine ? 'pinecone' : 'acorn', 20], ['leaf', 12], ['nothing', 15]]);
    if (id === 'nothing') { M.toast('나뭇잎만 살랑살랑… 아무것도 안 떨어졌어요'); return true; }
    M.gatherGot(id, id === 'branch' ? 2 : 1); return true;
  };
  // 바위: 하루 3번
  M.hitRock = function (key) {
    var g = S(), n = g.rocks[key] || 0;
    if (n >= 3) { M.toast('이 바위는 오늘 더 캘 게 없어요. 내일 또 와요!'); return false; }
    g.rocks[key] = n + 1; M.save();
    M.gatherGot(pickW([['stone', 50], ['clay', 22], ['pebble', 18], ['gold', 6], ['gem', 2.5]]));
    return true;
  };
  // 오늘 마을에 놓일 물건들 (매일 바뀐다)
  // 행운의 향수: 30분 동안 곤충이 두 배로 자주 나오고, 바닥 물건이 한 번 더 생긴다
  var LUCK_MS = 30 * 60000, LUCK_PRICE = 80;
  M.luckLeft = function () { var g = S(); return Math.max(0, (g.luckAt || 0) + LUCK_MS - Date.now()); };
  M.luckOn = function () { return M.luckLeft() > 0; };
  M.luckBuy = function () {
    if (!M.spend('coins', LUCK_PRICE)) { M.toast('코인이 모자라요'); return false; }
    var g = S(); g.luckAt = Date.now(); g.luckSeed = Date.now() % 100000 + 1; M.save(); M.sfx('win');
    M.toast('✨ 행운의 향수! 30분 동안 곤충과 물건이 두 배로 나와요'); return true;
  };
  M.gatherDaily = function (cands, extra) {
    var g = S(), seed = (extra || parseInt(M.today().replace(/\D/g, ''), 10)) % 2147483646 + 1, rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var out = [];
    function place(list, n, type, table) {
      var used = {};
      for (var i = 0; i < n && list.length; i++) {
        var k = Math.floor(rnd() * list.length), c = list[k], key = (extra ? 'L' + extra : '') + type + c[0] + ',' + c[1]; if (used[key]) continue; used[key] = 1;
        var s = table.reduce(function (a, x) { return a + x[1]; }, 0), r = rnd() * s, id = table[0][0];
        for (var j = 0; j < table.length; j++) { r -= table[j][1]; if (r <= 0) { id = table[j][0]; break; } }
        if (!g.picked[key]) out.push({ key: key, type: type, id: id, x: c[0], y: c[1] });
      }
    }
    place(cands.grass, 4, 'f', [['mush-red', 12], ['mush-brown', 14], ['mush-white', 14], ['flowers', 18], ['acorn', 12], ['pinecone', 10], ['leaf', 12], ['clover', 3]]);
    place(cands.sand, 4, 's', [['scallop', 22], ['conch', 16], ['sanddollar', 16], ['seaweed', 14], ['starfish', 10], ['glass', 8], ['coral', 6], ['crab', 5], ['bottle', 2], ['pearl', 1]]);
    place(cands.grass, 2, 'd', [['dig', 1]]);
    return out;
  };
  M.gatherPick = function (o) {
    var g = S(); g.picked[o.key] = 1; M.save();
    if (o.type === 'd') M.gatherGot(pickW([['bone', 16], ['ammonite', 14], ['footprint', 13], ['trilobite', 12], ['tooth', 10], ['leaffos', 15], ['amber', 8], ['coin', 8], ['stone', 30], ['clay', 20]]));
    else M.gatherGot(o.id);
  };
  // 곤충: 지금 시간대에 나올 수 있는 것
  M.bugNow = function (where) {
    var t = slot(), list = Object.keys(BUGS).filter(function (k) { return BUGS[k][0].indexOf(t) >= 0 && BUGS[k][1] === where; }).map(function (k) { return [k, BUGS[k][2]]; });
    return list.length ? pickW(list) : null;
  };

  // ---------- 가방 ----------
  M.gatherBag = function () {
    var g = S(), tab = 'all';
    var d = M.modal('<h3>🧺 채집 가방</h3><div id="gbLuck"></div><div class="fcats" id="gbCats"></div><div class="gbag" id="gbList"></div><p class="hint">누르면 팔 수 있어요. 나뭇가지·통나무·돌·점토·금광석은 집 넓히기 재료예요.</p><button class="btn ghost wide" data-close>닫기</button>');
    function paint() {
      var ll = M.luckLeft();
      d.querySelector('#gbLuck').innerHTML = ll ? '<p class="luckon">✨ 행운의 향수 남은 시간 ' + Math.ceil(ll / 60000) + '분</p>' : '<button class="btn wide" data-luck>✨ 행운의 향수 <small>30분 동안 곤충·물건 두 배</small> <img class="inl" src="img/coin.png" alt="">' + LUCK_PRICE + '</button>';
      d.querySelector('#gbCats').innerHTML = '<button data-gc="all" class="' + (tab === 'all' ? 'on' : '') + '">전체</button>' + Object.keys(CATS).map(function (c) { return '<button data-gc="' + c + '" class="' + (tab === c ? 'on' : '') + '">' + CATS[c] + '</button>'; }).join('');
      var ks = Object.keys(g.bag).filter(function (k) { return g.bag[k] > 0 && ITEMS[k] && (tab === 'all' || ITEMS[k].cat === tab); });
      d.querySelector('#gbList').innerHTML = ks.length ? ks.map(function (k) { var it = ITEMS[k]; return '<button class="gbi" data-gi="' + k + '"><img src="' + it.img + '" alt=""><b>' + it.ko + '</b><i>' + g.bag[k] + '</i></button>'; }).join('') : '<p class="hint center">아직 비어 있어요. 마을에서 나무를 흔들거나 바닥을 살펴보세요!</p>';
    }
    paint();
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-luck]')) { if (M.luckBuy()) paint(); return; }
      var c = e.target.closest('[data-gc]'); if (c) { tab = c.dataset.gc; paint(); return; }
      var b = e.target.closest('[data-gi]'); if (!b) return;
      var it = ITEMS[b.dataset.gi], v = nm(it), n = g.bag[it.id];
      var s = M.modal('<div class="center"><img class="gbig" src="' + it.img + '" alt=""><h3>' + it.ko + '</h3><button class="gname lang-' + M.P.lang + '" data-gsay="' + esc(v[0]) + '">🔊 ' + esc(v[0]) + (v[1] ? ' <small>' + esc(v[1]) + '</small>' : '') + '</button><p>' + n + '개 · 하나에 <img class="inl" src="img/coin.png" alt="">' + it.price + '</p></div><div class="row2"><button class="btn" data-s1>1개 팔기</button><button class="btn primary" data-sa>모두 팔기</button></div><button class="btn ghost wide" data-close>닫기</button>');
      s.addEventListener('click', function (e2) {
        var m = e2.target.closest('[data-s1]') ? 1 : e2.target.closest('[data-sa]') ? g.bag[it.id] : 0; if (!m) return;
        g.bag[it.id] -= m; M.give({ coins: it.price * m }); M.sfx('coin'); M.save(); s.close(); paint();
      });
    });
  };
  // ---------- 박물관 도감 ----------
  M.gatherDex = function (cat) {
    var cs = cat === 'forest' ? ['fruit', 'forest', 'mineral'] : [cat], title = cat === 'forest' ? '🌲 숲·열매·광물' : CATS[cat];
    var g = S(), lang = M.P.lang, ks = Object.keys(ITEMS).filter(function (k) { return cs.indexOf(ITEMS[k].cat) >= 0; }), n = ks.filter(function (k) { return g.dex[k]; }).length;
    var tn = { m: '아침', d: '낮', e: '저녁', n: '밤' }, wn = { flower: '꽃·풀밭', tree: '나무', water: '물가' };
    M.modal('<h3>' + title + ' 도감 <small>' + n + ' / ' + ks.length + '</small></h3>' + (cat === 'bug' ? '<p class="hint">시간대마다 나오는 곤충이 달라요</p>' : '') + '<div class="fdex">' + ks.map(function (k) {
      var it = ITEMS[k], got = g.dex[k], v = nm(it), b = BUGS[k];
      return '<div class="fd' + (got ? '' : ' unk') + '"' + (got ? ' data-card="' + k + '"' : '') + '><span class="fde"><img src="' + it.img + '" alt=""></span><b>' + (got ? it.ko : '???') + '</b>' + (got ? '<small class="lang-' + lang + '">' + esc(v[0]) + '</small>' : '') + (b ? '<small>' + wn[b[1]] + ' · ' + b[0].split('').map(function (x) { return tn[x]; }).join('·') + '</small>' : '') + '</div>';
    }).join('') + '</div><p class="hint center">찾은 것을 누르면 세 나라 말로 들을 수 있어요</p><button class="btn primary wide" data-close>닫기</button>');
  };
  // 도감 카드: 누르면 크게 보이고 일본어·영어·중국어로 들을 수 있다
  M.dexCard = function (img, ko, names, extra) {
    var L = [['ja', '日本語'], ['en', 'English'], ['zh', '中文']];
    var d = M.modal('<div class="dcard"><img src="' + img + '" alt=""><h3>' + esc(ko) + '</h3>' + (extra ? '<p class="hint">' + extra + '</p>' : '') +
      '<div class="dnames">' + L.map(function (l) { var v = names[l[0]] || ['']; return '<div class="dn"><span class="dlang lang-' + l[0] + '"><b>' + esc(v[0]) + '</b>' + (v[1] ? '<small>' + esc(v[1]) + '</small>' : '') + '</span><button class="dsay" data-dl="' + l[0] + '" data-dt="' + esc(v[0]) + '">🔊 ' + l[1] + '</button></div>'; }).join('') + '</div></div><button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-dl]'); if (b) M.say(b.dataset.dt, b.dataset.dl); });
    M.say((names[M.P.lang] || names.en)[0], M.P.lang);
  };
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-card]'); if (!c) return;
    var it = ITEMS[c.dataset.card]; if (it) M.dexCard(it.img, it.ko, { ja: it.ja, en: it.en, zh: it.zh });
  });

  // ---------- 집 넓히기 ----------
  var HOUSE = [null,
    { name: '작은 집', pots: 3, need: {} },
    { name: '오두막', pots: 4, coins: 300, need: { branch: 10, stone: 5 } },
    { name: '아늑한 집', pots: 5, coins: 800, need: { log: 6, stone: 10, clay: 6 } },
    { name: '큰 집', pots: 6, coins: 2000, need: { log: 12, clay: 10, gold: 2, branch: 15 } }];
  M.houseLv = function () { return (M.P.house && M.P.house.lv) || 1; };
  M.houseInfo = function () { return HOUSE[M.houseLv()]; };
  M.houseSheet = function () {
    var lv = M.houseLv(), nx = HOUSE[lv + 1], g = S();
    if (!nx) { M.modal('<div class="center"><div class="tbig">🏡</div><h3>' + HOUSE[lv].name + '</h3><p>집을 끝까지 넓혔어요!</p><button class="btn primary wide" data-close>좋아요</button></div>'); return; }
    var ok = Object.keys(nx.need).every(function (k) { return (g.bag[k] || 0) >= nx.need[k]; }) && M.P.coins >= nx.coins;
    var d = M.modal('<h3>🔨 집 넓히기</h3><p>' + HOUSE[lv].name + ' → <b>' + nx.name + '</b> · 화분 자리 ' + nx.pots + '칸까지</p><div class="hneed">' +
      Object.keys(nx.need).map(function (k) { var have = g.bag[k] || 0, it = ITEMS[k]; return '<div class="hn' + (have >= nx.need[k] ? ' ok' : '') + '"><img src="' + it.img + '" alt=""><b>' + it.ko + '</b><small>' + have + ' / ' + nx.need[k] + '</small></div>'; }).join('') +
      '<div class="hn' + (M.P.coins >= nx.coins ? ' ok' : '') + '"><img src="img/coin.png" alt=""><b>코인</b><small>' + M.P.coins + ' / ' + nx.coins + '</small></div></div>' +
      '<p class="hint">재료는 마을에서 나무를 흔들고 바위를 두드려 모아요</p><button class="btn primary wide" data-hup' + (ok ? '' : ' disabled') + '>넓히기</button><button class="btn ghost wide" data-close>닫기</button>');
    d.querySelector('[data-hup]').onclick = function () {
      if (!M.spend('coins', nx.coins)) return;
      Object.keys(nx.need).forEach(function (k) { g.bag[k] -= nx.need[k]; });
      M.P.house = M.P.house || {}; M.P.house.lv = lv + 1; M.save(); d.close(); M.sfx('win');
      M.modal('<div class="center"><div class="tbig">🏡✨</div><h3>' + nx.name + '이 됐어요!</h3><p>화분을 ' + nx.pots + '개까지 놓을 수 있어요.</p><button class="btn primary wide" data-close>좋아요</button></div>', { onClose: function () { if (M.render) M.render(); } });
    };
  };
})();
