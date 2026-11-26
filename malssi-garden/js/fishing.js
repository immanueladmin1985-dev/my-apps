// 낚시 (말씨정원). 강·바다의 물가에서 찌가 쑥 들어갈 때 눌러 낚는다.
// 물고기는 실제 시간대(아침·낮·저녁·밤)에 따라 다르고, 잡을 때마다 배우는 언어로 이름을 알려 준다.
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  // 미끼: 지렁이를 사서 쓰거나 잡은 작은 물고기를 쓴다. 좋은 미끼일수록 귀한 물고기가 잘 문다
  var BAITS = {
    worm: { name: '지렁이', em: '🪱', price: 5, mult: 1, desc: '보통 미끼' },
    fat: { name: '통통 지렁이', em: '🪱✨', price: 20, mult: 2.2, desc: '귀한 물고기 2배' },
    gold: { name: '황금 지렁이', em: '🌟🪱', price: 60, mult: 4.5, desc: '귀한 물고기 4배 넘게' },
    fish: { name: '작은 물고기 미끼', em: '🐟', price: 0, mult: 3.2, desc: '가방의 흔한 물고기 한 마리 · 큰 물고기가 잘 물어요' }
  };
  M.BAITS = BAITS;
  function bait() { var b = M.P.bait = M.P.bait || { worm: 3, fat: 0, gold: 0, use: 'worm' }; return b; }
  function smallFish() { var fb = M.P.fishBag || {}; return FISH.filter(function (f) { return f.r === 1 && fb[f.id] > 0; }); }
  function baitLeft(k) { return k === 'fish' ? smallFish().reduce(function (a, f) { return a + M.P.fishBag[f.id]; }, 0) : bait()[k] || 0; }
  function useBait(k) {
    if (k === 'fish') { var f = smallFish()[0]; if (!f) return false; M.P.fishBag[f.id]--; return true; }
    var b = bait(); if (!b[k]) return false; b[k]--; return true;
  }
  M.baitSheet = function (where, then) {
    var b = bait(), d = M.modal('<h3>🪱 미끼 고르기</h3><p class="hint">좋은 미끼일수록 귀한(★★★) 물고기가 잘 물어요</p><div class="list" id="bList"></div><button class="btn ghost wide" data-close>닫기</button>');
    function paint() {
      d.querySelector('#bList').innerHTML = Object.keys(BAITS).map(function (k) {
        var B = BAITS[k], n = baitLeft(k);
        return '<div class="litem' + (b.use === k ? ' on' : '') + '"><span class="le">' + B.em + '</span><span class="ln">' + B.name + ' <small>' + B.desc + ' · 가진 것 ' + n + '</small></span>' +
          (k === 'fish' ? '' : '<button class="btn" data-bb="' + k + '"><img class="inl" src="img/coin.png" alt="">' + B.price + '×3</button>') +
          '<button class="btn primary" data-bu="' + k + '"' + (n ? '' : ' disabled') + '>쓰기</button></div>';
      }).join('');
    }
    paint();
    d.addEventListener('click', function (e) {
      var bb = e.target.closest('[data-bb]'), bu = e.target.closest('[data-bu]');
      if (bb) { var k = bb.dataset.bb; if (!M.spend('coins', BAITS[k].price * 3)) { M.toast('코인이 모자라요'); return; } b[k] = (b[k] || 0) + 3; M.save(); M.sfx('coin'); paint(); return; }
      if (bu && !bu.disabled) { b.use = bu.dataset.bu; M.save(); d.close(); if (then) then(); else if (where) M.fishStart(where); }
    });
  };
  // t: 나오는 시간대 (m 아침 5~10시, d 낮 10~17시, e 저녁 17~20시, n 밤 20~5시)
  var FISH = [
    { id: 'crucian', ko: '붕어', em: '🐟', at: 'river', t: 'mden', r: 1, size: [8, 25], price: 15, ja: ['フナ', 'ふな'], en: ['crucian carp'], zh: ['鲫鱼', 'jìyú'] },
    { id: 'carp', ko: '잉어', em: '🐟', at: 'river', t: 'mde', r: 2, size: [30, 70], price: 40, ja: ['コイ', 'こい'], en: ['carp'], zh: ['鲤鱼', 'lǐyú'] },
    { id: 'catfish', ko: '메기', em: '🐟', at: 'river', t: 'en', r: 2, size: [30, 80], price: 45, ja: ['ナマズ', 'なまず'], en: ['catfish'], zh: ['鲶鱼', 'niányú'] },
    { id: 'trout', ko: '송어', em: '🐟', at: 'river', t: 'm', r: 2, size: [25, 60], price: 50, ja: ['マス', 'ます'], en: ['trout'], zh: ['鳟鱼', 'zūnyú'] },
    { id: 'crayfish', ko: '가재', em: '🦞', at: 'river', t: 'den', r: 1, size: [6, 14], price: 20, ja: ['ザリガニ', 'ざりがに'], en: ['crayfish'], zh: ['小龙虾', 'xiǎolóngxiā'] },
    { id: 'loach', ko: '미꾸라지', em: '🐟', at: 'river', t: 'mn', r: 1, size: [8, 18], price: 18, ja: ['ドジョウ', 'どじょう'], en: ['loach'], zh: ['泥鳅', 'níqiu'] },
    { id: 'mackerel', ko: '고등어', em: '🐟', at: 'sea', t: 'mde', r: 1, size: [25, 45], price: 25, ja: ['サバ', 'さば'], en: ['mackerel'], zh: ['鲭鱼', 'qīngyú'] },
    { id: 'seabream', ko: '도미', em: '🐠', at: 'sea', t: 'md', r: 2, size: [30, 60], price: 60, ja: ['タイ', 'たい'], en: ['sea bream'], zh: ['鲷鱼', 'diāoyú'] },
    { id: 'squid', ko: '오징어', em: '🦑', at: 'sea', t: 'en', r: 1, size: [20, 40], price: 30, ja: ['イカ', 'いか'], en: ['squid'], zh: ['鱿鱼', 'yóuyú'] },
    { id: 'octopus', ko: '문어', em: '🐙', at: 'sea', t: 'den', r: 2, size: [40, 90], price: 55, ja: ['タコ', 'たこ'], en: ['octopus'], zh: ['章鱼', 'zhāngyú'] },
    { id: 'puffer', ko: '복어', em: '🐡', at: 'sea', t: 'dn', r: 2, size: [15, 35], price: 50, ja: ['フグ', 'ふぐ'], en: ['pufferfish'], zh: ['河豚', 'hétún'] },
    { id: 'shrimp', ko: '새우', em: '🦐', at: 'sea', t: 'mden', r: 1, size: [5, 15], price: 15, ja: ['エビ', 'えび'], en: ['shrimp'], zh: ['虾', 'xiā'] },
    { id: 'jelly', ko: '해파리', em: '🪼', at: 'sea', t: 'n', r: 1, size: [10, 30], price: 20, ja: ['クラゲ', 'くらげ'], en: ['jellyfish'], zh: ['水母', 'shuǐmǔ'] },
    { id: 'tuna', ko: '참치', em: '🐟', at: 'sea', t: 'md', r: 3, size: [80, 200], price: 150, ja: ['マグロ', 'まぐろ'], en: ['tuna'], zh: ['金枪鱼', 'jīnqiāngyú'] },
    { id: 'ayu', ko: '은어', em: '🐟', at: 'river', t: 'md', r: 2, size: [15, 30], price: 45, ja: ['アユ', 'あゆ'], en: ['sweetfish'], zh: ['香鱼', 'xiāngyú'] },
    { id: 'mandarin', ko: '쏘가리', em: '🐟', at: 'river', t: 'en', r: 2, size: [20, 50], price: 60, ja: ['ケツギョ', 'けつぎょ'], en: ['mandarin fish'], zh: ['鳜鱼', 'guìyú'] },
    { id: 'goldfish', ko: '금붕어', em: '🐠', at: 'river', t: 'md', r: 1, size: [5, 15], price: 25, ja: ['キンギョ', 'きんぎょ'], en: ['goldfish'], zh: ['金鱼', 'jīnyú'] },
    { id: 'chub', ko: '피라미', em: '🐟', at: 'river', t: 'mde', r: 1, size: [8, 15], price: 12, ja: ['オイカワ', 'おいかわ'], en: ['pale chub'], zh: ['宽鳍鱲', 'kuānqíliè'] },
    { id: 'eel', ko: '장어', em: '🐍', at: 'river', t: 'n', r: 2, size: [40, 100], price: 80, ja: ['ウナギ', 'うなぎ'], en: ['eel'], zh: ['鳗鱼', 'mányú'] },
    { id: 'turtle', ko: '거북이', em: '🐢', at: 'river', t: 'd', r: 2, size: [15, 30], price: 70, ja: ['カメ', 'かめ'], en: ['turtle'], zh: ['乌龟', 'wūguī'] },
    { id: 'frog', ko: '개구리', em: '🐸', at: 'river', t: 'men', r: 1, size: [5, 10], price: 15, ja: ['カエル', 'かえる'], en: ['frog'], zh: ['青蛙', 'qīngwā'] },
    { id: 'tadpole', ko: '올챙이', em: '🐸', at: 'river', t: 'md', r: 1, size: [1, 3], price: 5, ja: ['オタマジャクシ', 'おたまじゃくし'], en: ['tadpole'], zh: ['蝌蚪', 'kēdǒu'] },
    { id: 'medaka', ko: '송사리', em: '🐟', at: 'river', t: 'md', r: 1, size: [2, 4], price: 8, ja: ['メダカ', 'めだか'], en: ['killifish'], zh: ['青鳉', 'qīngjiāng'] },
    { id: 'sturgeon', ko: '철갑상어', em: '🐟', at: 'river', t: 'en', r: 3, size: [100, 250], price: 250, ja: ['チョウザメ', 'ちょうざめ'], en: ['sturgeon'], zh: ['鲟鱼', 'xúnyú'] },
    { id: 'goldcarp', ko: '황금 잉어', em: '🐟', at: 'river', t: 'me', r: 3, size: [40, 80], price: 300, ja: ['キンゴイ', 'きんごい'], en: ['golden carp'], zh: ['金色鲤鱼', 'jīnsè lǐyú'] },
    { id: 'rainbow', ko: '무지개송어', em: '🐟', at: 'river', t: 'm', r: 3, size: [30, 70], price: 220, ja: ['ニジマス', 'にじます'], en: ['rainbow trout'], zh: ['虹鳟', 'hóngzūn'] },
    { id: 'flounder', ko: '광어', em: '🐟', at: 'sea', t: 'dn', r: 2, size: [30, 70], price: 60, ja: ['ヒラメ', 'ひらめ'], en: ['flounder'], zh: ['比目鱼', 'bǐmùyú'] },
    { id: 'salmon', ko: '연어', em: '🐟', at: 'sea', t: 'me', r: 2, size: [50, 90], price: 70, ja: ['サケ', 'さけ'], en: ['salmon'], zh: ['三文鱼', 'sānwényú'] },
    { id: 'hairtail', ko: '갈치', em: '🐟', at: 'sea', t: 'n', r: 2, size: [60, 120], price: 55, ja: ['タチウオ', 'たちうお'], en: ['cutlassfish'], zh: ['带鱼', 'dàiyú'] },
    { id: 'saury', ko: '꽁치', em: '🐟', at: 'sea', t: 'me', r: 1, size: [25, 35], price: 20, ja: ['サンマ', 'さんま'], en: ['Pacific saury'], zh: ['秋刀鱼', 'qiūdāoyú'] },
    { id: 'horsemack', ko: '전갱이', em: '🐟', at: 'sea', t: 'mde', r: 1, size: [15, 35], price: 18, ja: ['アジ', 'あじ'], en: ['horse mackerel'], zh: ['竹荚鱼', 'zhújiáyú'] },
    { id: 'clown', ko: '흰동가리', em: '🐠', at: 'sea', t: 'd', r: 2, size: [6, 11], price: 50, ja: ['カクレクマノミ', 'かくれくまのみ'], en: ['clownfish'], zh: ['小丑鱼', 'xiǎochǒuyú'] },
    { id: 'bluetang', ko: '블루탱', em: '🐠', at: 'sea', t: 'd', r: 2, size: [15, 30], price: 55, ja: ['ナンヨウハギ', 'なんようはぎ'], en: ['blue tang'], zh: ['蓝倒吊', 'lán dàodiào'] },
    { id: 'seahorse', ko: '해마', em: '🐠', at: 'sea', t: 'md', r: 2, size: [5, 15], price: 65, ja: ['タツノオトシゴ', 'たつのおとしご'], en: ['seahorse'], zh: ['海马', 'hǎimǎ'] },
    { id: 'ray', ko: '가오리', em: '🐟', at: 'sea', t: 'en', r: 2, size: [60, 150], price: 75, ja: ['エイ', 'えい'], en: ['stingray'], zh: ['魟鱼', 'hóngyú'] },
    { id: 'moray', ko: '곰치', em: '🐟', at: 'sea', t: 'n', r: 2, size: [60, 150], price: 70, ja: ['ウツボ', 'うつぼ'], en: ['moray eel'], zh: ['海鳗', 'hǎimán'] },
    { id: 'whaleshark', ko: '고래상어', em: '🦈', at: 'sea', t: 'd', r: 3, size: [400, 1000], price: 500, ja: ['ジンベエザメ', 'じんべえざめ'], en: ['whale shark'], zh: ['鲸鲨', 'jīngshā'] },
    { id: 'dolphin', ko: '돌고래', em: '🐬', at: 'sea', t: 'md', r: 3, size: [150, 300], price: 400, ja: ['イルカ', 'いるか'], en: ['dolphin'], zh: ['海豚', 'hǎitún'] },
    { id: 'seaturtle', ko: '바다거북', em: '🐢', at: 'sea', t: 'de', r: 3, size: [70, 150], price: 350, ja: ['ウミガメ', 'うみがめ'], en: ['sea turtle'], zh: ['海龟', 'hǎiguī'] },
    { id: 'shark', ko: '상어', em: '🦈', at: 'sea', t: 'en', r: 3, size: [100, 300], price: 200, ja: ['サメ', 'さめ'], en: ['shark'], zh: ['鲨鱼', 'shāyú'] }
  ];
  function fimg(f) { return '<img src="img/w/fish-' + f.id + '.png" alt="' + f.ko + '">'; }
  var TNAME = { m: '아침', d: '낮', e: '저녁', n: '밤' };
  M.FISH = FISH;
  function slot() { var h = new Date().getHours(); return h >= 5 && h < 10 ? 'm' : h < 17 && h >= 10 ? 'd' : h >= 17 && h < 20 ? 'e' : 'n'; }
  function dex() { M.P.fishDex = M.P.fishDex || {}; return M.P.fishDex; }
  function nameOf(f, lang) { var v = f[lang] || f.en; return { t: v[0], r: lang === 'en' ? '' : v[1] || '' }; }
  function pick(where, mult) {
    var now = slot(), pool = FISH.filter(function (f) { return f.at === where && f.t.indexOf(now) >= 0; });
    var luck = M.luckOn && M.luckOn(), mu = mult || 1, w = pool.map(function (f) { return f.r === 1 ? 10 : f.r === 2 ? 4 * Math.sqrt(mu) : (luck ? 3 : 0.8) * mu; }), sum = w.reduce(function (a, b) { return a + b; }, 0), x = Math.random() * sum;
    for (var i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) return pool[i]; }
    return pool[0];
  }

  var cur = null;
  M.fishStart = function (where) {
    if (cur) return;
    var bk = bait().use || 'worm';
    if (!baitLeft(bk) || !useBait(bk)) { M.toast(M.j(BAITS[bk].name, '이', '가') + ' 떨어졌어요. 미끼를 골라 주세요'); M.baitSheet(where); return; }
    bait().use = bk; M.save();
    var host = document.querySelector('.world'); if (!host) return;
    var el = document.createElement('div'); el.className = 'fishing ' + where; el.id = 'fishing';
    el.innerHTML = '<div class="fwater"><div class="fring"></div><div class="fbob" id="fBob">🔴</div><div class="fexcl" id="fEx">!</div></div>' +
      '<p class="fmsg" id="fMsg">' + BAITS[bk].em + ' ' + BAITS[bk].name + '(남은 것 ' + baitLeft(bk) + ')로 던졌어요… 찌가 쑥 들어가면 눌러요!</p><button class="btn primary wide fpull" id="fPull">낚아채기!</button><button class="btn ghost wide" id="fStop">그만하기</button><button class="btn ghost wide" id="fBait">🪱 미끼 바꾸기</button>';
    host.appendChild(el);
    cur = { where: where, state: 'wait', fish: pick(where, BAITS[bk].mult * (bk === 'fish' && where === 'river' ? 0.6 : 1)), timers: [], bait: bk };
    var wait = 1800 + Math.random() * 4500;
    // 입질 몇 번 (살짝 흔들림) 뒤에 진짜로 문다
    cur.timers.push(setTimeout(function () { nibble(); }, wait * 0.45));
    cur.timers.push(setTimeout(function () { bite(); }, wait));
    $('fPull').onclick = pull; $('fStop').onclick = function () { end(); }; $('fBait').onclick = function () { var w = cur.where; end(); M.baitSheet(w); };
    el.querySelector('.fwater').onclick = pull;
  };
  function nibble() { if (!cur || cur.state !== 'wait') return; var b = $('fBob'); if (b) { b.classList.remove('nib'); void b.offsetWidth; b.classList.add('nib'); } M.buzz(10); }
  function bite() {
    if (!cur || cur.state !== 'wait') return;
    cur.state = 'bite'; cur.biteAt = Date.now();
    $('fBob').classList.add('down'); $('fEx').classList.add('on'); $('fMsg').textContent = '지금이에요!'; M.buzz([30, 20, 30]); M.sfx('pop');
    var win = cur.fish.r === 3 ? 650 : cur.fish.r === 2 ? 800 : 1000;   // 귀한 물고기일수록 짧다
    cur.timers.push(setTimeout(function () { if (cur && cur.state === 'bite') { cur.state = 'miss'; $('fMsg').textContent = '앗, 물고기가 미끼만 먹고 갔어요…'; $('fBob').classList.remove('down'); $('fEx').classList.remove('on'); M.sfx('bad'); retry(); } }, win));
  }
  function pull() {
    if (!cur) return;
    if (cur.state === 'wait') { cur.state = 'miss'; cur.timers.forEach(clearTimeout); $('fMsg').textContent = '너무 일찍 당겼어요! 물고기가 도망갔어요'; M.sfx('bad'); retry(); return; }
    if (cur.state !== 'bite') return;
    cur.state = 'got'; cur.timers.forEach(clearTimeout); M.sfx('ok');
    caught(cur.fish);
  }
  function retry() {
    var b = $('fPull'); if (!b) return;
    b.textContent = '다시 던지기 (' + BAITS[cur.bait].em + ')';
    b.onclick = function () { var w = cur.where; end(true); M.fishStart(w); };
    var fw = document.querySelector('#fishing .fwater'); if (fw) fw.onclick = null;
  }
  function end() { if (cur) cur.timers.forEach(clearTimeout); cur = null; var el = $('fishing'); if (el) el.remove(); }

  function caught(f) {
    var d = dex(), first = !d[f.id], lang = M.P.lang, nm = nameOf(f, lang);
    var size = Math.round(f.size[0] + Math.pow(Math.random(), 1.6) * (f.size[1] - f.size[0]));
    var known = FISH.filter(function (x) { return d[x.id]; });
    var el = $('fishing'); if (!el) return;
    function show(bonus) {
      size = Math.round(size * (bonus ? 1.2 : 1));
      var rec = d[f.id] || { n: 0, max: 0 }; rec.n++; var best = size > rec.max; rec.max = Math.max(rec.max, size); d[f.id] = rec;
      var price = Math.round(f.price * (0.7 + 0.6 * (size - f.size[0]) / (f.size[1] - f.size[0] || 1)));
      M.save(); M.quest && M.quest('fish', 1);
      el.innerHTML = '<div class="fcatch"><div class="fbig">' + fimg(f) + '</div><h3>' + f.ko + (first ? ' <span class="newtag">처음!</span>' : '') + '</h3><p class="rar r' + M.rarity(f.price, f.r).n + '">' + M.rarity(f.price, f.r).stars + ' ' + M.rarity(f.price, f.r).name + '</p>' +
        '<button class="fname lang-' + lang + '" data-fsay="' + esc(nm.t) + '">🔊 <b>' + esc(nm.t) + '</b>' + (nm.r ? '<small>' + esc(nm.r) + '</small>' : '') + '</button>' +
        '<p>' + size + 'cm' + (best && !first ? ' · 최고 기록!' : '') + (bonus ? ' · 이름 맞힘 보너스 +20%' : '') + '</p>' +
        '<div class="row2"><button class="btn" id="fRel">놓아주기</button><button class="btn primary" id="fSell">팔기 <img class="inl" src="img/coin.png" alt="">' + price + '</button></div>' +
        '<button class="btn wide" id="fKeep">🧺 가방에 넣기</button><button class="btn wide" id="fAgain">한 번 더 (' + BAITS[cur ? cur.bait : 'worm'].em + ')</button><button class="btn ghost wide" id="fQuit">그만하기</button><p class="hint">박물관 물고기 도감에 기록했어요</p></div>';
      M.say(nm.t, lang);
      el.querySelector('[data-fsay]').onclick = function () { M.say(nm.t, lang); };
      $('fRel').onclick = function () { M.toast(f.em + ' 잘 가!'); M.give({ water: 1 }); end(); };
      $('fSell').onclick = function () { M.give({ coins: price }); M.sfx('coin'); end(); };
      $('fKeep').onclick = function () { var fb = M.P.fishBag = M.P.fishBag || {}; fb[f.id] = (fb[f.id] || 0) + 1; M.save(); if (M.recipeCheck) setTimeout(M.recipeCheck, 600); M.toast('🧺 ' + M.j(f.ko, '을', '를') + ' 가방에 넣었어요'); end(); };
      $('fQuit').onclick = function () { M.toast(f.em + ' 놓아줬어요'); end(); };
      $('fAgain').onclick = function () { var w = cur ? cur.where : f.at; M.give({ coins: price }); end(); M.fishStart(w); };
      M.sfx('win');
    }
    // 세 종류 이상 잡았으면 이름 맞히기 (맞히면 크기 보너스)
    if (known.length >= 3 && !first) {
      var opts = M.shuffle([f].concat(M.shuffle(known.filter(function (x) { return x !== f; })).slice(0, 2)));
      el.innerHTML = '<div class="fcatch"><div class="fbig">' + fimg(f) + '</div><h3>' + M.j(f.ko, '을', '를') + ' 낚았어요!</h3><p>이 물고기를 배우는 말로 뭐라고 할까요?</p><div class="copts">' +
        opts.map(function (x, i) { var n2 = nameOf(x, lang); return '<div class="coptrow"><button class="csay" data-s="' + i + '" aria-label="듣기">🔊</button><button class="copt lang-' + lang + '" data-i="' + i + '">' + esc(n2.t) + (n2.r && n2.r !== n2.t ? ' <small>' + esc(n2.r) + '</small>' : '') + '</button></div>'; }).join('') + '</div><p class="hint">🔊를 누르면 소리를 들을 수 있어요</p></div>';
      Array.prototype.forEach.call(el.querySelectorAll('.csay'), function (b) { b.onclick = function () { M.say(nameOf(opts[+b.dataset.s], lang).t, lang); }; });
      Array.prototype.forEach.call(el.querySelectorAll('.copt'), function (b) {
        b.onclick = function () { var ok = opts[+b.dataset.i] === f; M.sfx(ok ? 'ok' : 'bad'); show(ok); };
      });
    } else show(false);
  }

  // 박물관 물고기 도감
  M.fishDexSheet = function () {
    var d = dex(), lang = M.P.lang, n = FISH.filter(function (f) { return d[f.id]; }).length;
    M.modal('<h3>🐟 물고기 도감 <small>' + n + ' / ' + FISH.length + '</small></h3><p class="hint">지금은 <b>' + TNAME[slot()] + '</b>이에요. 시간대마다 나오는 물고기가 달라요.</p><div class="fdex">' + FISH.map(function (f) {
      var r = d[f.id], nm = nameOf(f, lang);
      return '<div class="fd' + (r ? '' : ' unk') + '"' + (r ? ' data-fcard="' + f.id + '"' : '') + '><span class="fde">' + fimg(f) + '</span><b>' + (r ? f.ko : '???') + '</b>' + (r ? '<small class="lang-' + lang + '">' + esc(nm.t) + '</small><small>최고 ' + r.max + 'cm · ' + r.n + '마리</small>' : '') +
        '<small>' + (f.at === 'river' ? '강' : '바다') + ' · ' + f.t.split('').map(function (k) { return TNAME[k]; }).join('·') + '</small></div>';
    }).join('') + '</div><p class="hint center">잡은 물고기를 누르면 세 나라 말로 들을 수 있어요</p><button class="btn primary wide" data-close>닫기</button>');
  };
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-fcard]'); if (!c) return;
    var f = FISH.filter(function (x) { return x.id === c.dataset.fcard; })[0], r = dex()[f.id];
    M.dexCard('img/w/fish-' + f.id + '.png', f.ko, { ja: [f.ja[0], f.ja[1]], en: [f.en[0], ''], zh: [f.zh[0], f.zh[1]] }, M.rarity(f.price, f.r).stars + ' ' + M.rarity(f.price, f.r).name + ' · 최고 ' + r.max + 'cm · ' + r.n + '마리 · ' + (f.at === 'river' ? '강' : '바다'));
  });
  M.fishTest = { pick: pick, caught: function (id) { cur = cur || { where: 'river', timers: [] }; caught(FISH.filter(function (f) { return f.id === id; })[0]); }, bite: function () { if (cur) { cur.timers.forEach(clearTimeout); bite(); } }, slot: slot };
})();
