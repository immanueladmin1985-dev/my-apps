// 낚시 (말씨정원). 강·바다의 물가에서 찌가 쑥 들어갈 때 눌러 낚는다.
// 물고기는 실제 시간대(아침·낮·저녁·밤)에 따라 다르고, 잡을 때마다 배우는 언어로 이름을 알려 준다.
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  var BAIT = 2;   // 미끼: 물방울
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
    { id: 'shark', ko: '상어', em: '🦈', at: 'sea', t: 'en', r: 3, size: [100, 300], price: 200, ja: ['サメ', 'さめ'], en: ['shark'], zh: ['鲨鱼', 'shāyú'] }
  ];
  function fimg(f) { return '<img src="img/w/fish-' + f.id + '.png" alt="' + f.ko + '">'; }
  var TNAME = { m: '아침', d: '낮', e: '저녁', n: '밤' };
  M.FISH = FISH;
  function slot() { var h = new Date().getHours(); return h >= 5 && h < 10 ? 'm' : h < 17 && h >= 10 ? 'd' : h >= 17 && h < 20 ? 'e' : 'n'; }
  function dex() { M.P.fishDex = M.P.fishDex || {}; return M.P.fishDex; }
  function nameOf(f, lang) { var v = f[lang] || f.en; return { t: v[0], r: lang === 'en' ? '' : v[1] || '' }; }
  function pick(where) {
    var now = slot(), pool = FISH.filter(function (f) { return f.at === where && f.t.indexOf(now) >= 0; });
    var w = pool.map(function (f) { return f.r === 1 ? 10 : f.r === 2 ? 4 : 1; }), sum = w.reduce(function (a, b) { return a + b; }, 0), x = Math.random() * sum;
    for (var i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) return pool[i]; }
    return pool[0];
  }

  var cur = null;
  M.fishStart = function (where) {
    if (cur) return;
    if (!M.spend('water', BAIT)) { M.toast('미끼(💧' + BAIT + ')가 모자라요. 레슨을 하면 물방울을 받아요'); return; }
    var host = document.querySelector('.world'); if (!host) return;
    var el = document.createElement('div'); el.className = 'fishing ' + where; el.id = 'fishing';
    el.innerHTML = '<div class="fwater"><div class="fring"></div><div class="fbob" id="fBob">🔴</div><div class="fexcl" id="fEx">!</div></div>' +
      '<p class="fmsg" id="fMsg">찌를 던졌어요… 찌가 쑥 들어가면 눌러요!</p><button class="btn primary wide fpull" id="fPull">낚아채기!</button><button class="btn ghost wide" id="fStop">그만하기</button>';
    host.appendChild(el);
    cur = { where: where, state: 'wait', fish: pick(where), timers: [] };
    var wait = 1800 + Math.random() * 4500;
    // 입질 몇 번 (살짝 흔들림) 뒤에 진짜로 문다
    cur.timers.push(setTimeout(function () { nibble(); }, wait * 0.45));
    cur.timers.push(setTimeout(function () { bite(); }, wait));
    $('fPull').onclick = pull; $('fStop').onclick = function () { end(); };
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
    b.textContent = '다시 던지기 (💧' + BAIT + ')';
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
      el.innerHTML = '<div class="fcatch"><div class="fbig">' + fimg(f) + '</div><h3>' + f.ko + (first ? ' <span class="newtag">처음!</span>' : '') + '</h3>' +
        '<button class="fname lang-' + lang + '" data-fsay="' + esc(nm.t) + '">🔊 <b>' + esc(nm.t) + '</b>' + (nm.r ? '<small>' + esc(nm.r) + '</small>' : '') + '</button>' +
        '<p>' + size + 'cm' + (best && !first ? ' · 최고 기록!' : '') + (bonus ? ' · 이름 맞힘 보너스 +20%' : '') + '</p>' +
        '<div class="row2"><button class="btn" id="fRel">놓아주기</button><button class="btn primary" id="fSell">팔기 <img class="inl" src="img/coin.png" alt="">' + price + '</button></div>' +
        '<button class="btn wide" id="fAgain">한 번 더 (💧' + BAIT + ')</button><p class="hint">박물관 물고기 도감에 기록했어요</p></div>';
      M.say(nm.t, lang);
      el.querySelector('[data-fsay]').onclick = function () { M.say(nm.t, lang); };
      $('fRel').onclick = function () { M.toast(f.em + ' 잘 가!'); M.give({ water: 1 }); end(); };
      $('fSell').onclick = function () { M.give({ coins: price }); M.sfx('coin'); end(); };
      $('fAgain').onclick = function () { var w = cur ? cur.where : f.at; M.give({ coins: price }); end(); M.fishStart(w); };
      M.sfx('win');
    }
    // 세 종류 이상 잡았으면 이름 맞히기 (맞히면 크기 보너스)
    if (known.length >= 3 && !first) {
      var opts = M.shuffle([f].concat(M.shuffle(known.filter(function (x) { return x !== f; })).slice(0, 2)));
      el.innerHTML = '<div class="fcatch"><div class="fbig">' + fimg(f) + '</div><h3>' + M.j(f.ko, '을', '를') + ' 낚았어요!</h3><p>이 물고기를 배우는 말로 뭐라고 할까요?</p><div class="copts">' +
        opts.map(function (x, i) { var n2 = nameOf(x, lang); return '<button class="copt lang-' + lang + '" data-i="' + i + '">' + esc(n2.t) + (n2.r && n2.r !== n2.t ? ' <small>' + esc(n2.r) + '</small>' : '') + '</button>'; }).join('') + '</div></div>';
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
    M.dexCard('img/w/fish-' + f.id + '.png', f.ko, { ja: [f.ja[0], f.ja[1]], en: [f.en[0], ''], zh: [f.zh[0], f.zh[1]] }, '최고 ' + r.max + 'cm · ' + r.n + '마리 · ' + (f.at === 'river' ? '강' : '바다'));
  });
  M.fishTest = { pick: pick, caught: function (id) { cur = cur || { where: 'river', timers: [] }; caught(FISH.filter(function (f) { return f.id === id; })[0]); }, bite: function () { if (cur) { cur.timers.forEach(clearTimeout); bite(); } }, slot: slot };
})();
