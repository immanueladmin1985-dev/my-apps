// 그림일기 (말씨정원): 하루 공부를 마치면 날씨를 고르고, 배운 문장 하나를 낱말 조각으로 맞추고, 그림 도장을 찍어 일기 한 쪽을 쓴다.
// 일기는 P.diary 에 { d, lang, wx, t, k, say, st: [그림 글자] } 로 모은다 (최대 120쪽).
(function () {
  var M = window.M, $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var WX = [
    { id: 'sun', e: '☀️', ko: '맑음', ja: 'はれ', en: 'sunny', zh: '晴天' },
    { id: 'cloud', e: '☁️', ko: '흐림', ja: 'くもり', en: 'cloudy', zh: '阴天' },
    { id: 'rain', e: '🌧️', ko: '비', ja: 'あめ', en: 'rainy', zh: '下雨' },
    { id: 'snow', e: '❄️', ko: '눈', ja: 'ゆき', en: 'snowy', zh: '下雪' }
  ];
  function wxLine(lang, w) {
    if (lang === 'ja') return 'きょうは' + w.ja + 'でした。';
    if (lang === 'zh') return '今天' + w.zh + '。';
    return 'It was ' + w.en + ' today.';
  }
  var STAMPS = ['🌸', '🍰', '☕', '🐶', '🐱', '🎵', '📚', '🍙', '🌈', '💖', '⭐', '🍜'];
  function list() { var P = M.P; if (!Array.isArray(P.diary)) P.diary = []; return P.diary; }
  function todayPage() { var t = M.today(); return list().filter(function (p) { return p.d === t; })[0]; }
  // 오늘 레슨을 한 판 이상 했고 아직 일기를 안 썼으면 알림 점을 띄운다
  M.diaryReady = function () { try { return ((M.P.log[M.today()] || {}).l || 0) > 0 && !todayPage() ? 1 : 0; } catch (e) { return 0; } };

  // 오늘 배운(처음 본) 낱말이 든 문장을 먼저 고른다
  function candidates(lang) {
    var L = window.LANGS[lang], all = [], P = M.P, t0 = new Date(M.today().replace(/-/g, '/')).getTime();
    L.stages.forEach(function (st) { if (P.prog[lang][st.id] && !st.kana) (st.sents || []).forEach(function (x) { if (x.w && x.w.length >= 2 && x.w.length <= 7) all.push(x); }); });
    // 아직 문장 단계를 안 배웠으면 첫 문장 단계들의 쉬운 문장으로 쓴다
    if (all.length < 3) L.stages.filter(function (st) { return !st.kana; }).slice(0, 8).forEach(function (st) { (st.sents || []).forEach(function (x) { if (x.w && x.w.length >= 2 && x.w.length <= 6 && all.indexOf(x) < 0) all.push(x); }); });
    if (!all.length) return [];
    var fresh = M.learnedItems(lang).filter(function (it) { var s = P.srs[M.itemKey(it)]; return s && (s[3] >= t0 || (s[4] || 0) >= t0); }).map(function (it) { return it.t; });
    var hit = all.filter(function (x) { return fresh.some(function (w) { return w && x.t.indexOf(w) >= 0; }); });
    var pick = M.shuffle(hit).slice(0, 3);
    M.shuffle(all).forEach(function (x) { if (pick.length < 3 && pick.indexOf(x) < 0) pick.push(x); });
    return pick;
  }
  function pageHtml(p) {
    var w = WX.filter(function (x) { return x.id === p.wx; })[0] || WX[0], L = window.LANGS[p.lang] || {};
    var dd = p.d.split('-');
    return '<div class="dypage"><div class="dyhead"><b>' + (+dd[1]) + '월 ' + (+dd[2]) + '일</b><span>' + w.e + ' ' + w.ko + '</span><small>' + (L.flag || '') + '</small></div>' +
      '<div class="dyart">' + (p.st || []).map(function (s, i) { return '<span class="dyst s' + i + '">' + s + '</span>'; }).join('') + '</div>' +
      '<button class="dytext lang-' + p.lang + '" data-dysay="' + esc(wxLine(p.lang, w) + ' ' + p.say) + '" data-dylang="' + p.lang + '"><span>' + M.fz(wxLine(p.lang, w), p.lang) + '</span><b>' + M.fz(p.t, p.lang) + '</b><small>' + esc(w.ko + '. ' + p.k) + '</small></button>' + (p.rp && M.P.diary && M.P.diary.indexOf(p) >= 0 ? '<div class="dyrp">💌 ' + esc(M.Family && M.Family.mateName ? M.Family.mateName() : M.who('A')) + ': ' + (p.rp.h ? '❤️ ' : '') + esc(p.rp.m || '') + '</div>' : '') + '</div>';
  }

  M.diaryPageHtml = pageHtml;
  M.diaryWrite = function () {
    var lang = M.P.lang === 'math' ? 'kor' : M.P.lang, cands = candidates(lang);   // 수학 시간에는 국어 문장으로 일기를 쓴다
    if (!cands.length) { M.toast('문장을 조금 더 배우면 일기를 쓸 수 있어요'); return; }
    if (todayPage()) { M.toast('오늘 일기는 이미 썼어요. 일기장에서 볼 수 있어요'); M.diaryBook(); return; }
    var st = { wx: null, sn: null, stamps: [] };
    var desk = M.isNinja && M.isNinja() ? 'img/w/ch-' + M.look().ch + '-desk' : '';   // 닌자는 책상에 앉아 일기를 쓴다
    var d = M.modal('<h3>📔 오늘의 그림일기' + (desk ? '<img class="dydesk" id="dyDesk" src="' + desk + '.png" alt="">' : '') + '</h3><div id="dyBody"></div>', { cls: 'bagsheet dysheet' });
    var body = d.querySelector('#dyBody');
    function step1() {
      body.innerHTML = '<p class="dyq">1. 오늘 날씨는 어땠나요?</p><div class="dywx">' + WX.map(function (w) { return '<button data-wx="' + w.id + '"><span>' + w.e + '</span><b class="lang-' + lang + '">' + esc(w[lang]) + '</b><small>' + w.ko + '</small></button>'; }).join('') + '</div><button class="btn ghost wide" data-close>다음에 쓸게요</button>';
    }
    function step2() {
      body.innerHTML = '<p class="dyq">2. 오늘 하고 싶은 말을 골라요</p><div class="dycands">' + cands.map(function (x, i) { return '<button data-sn="' + i + '"><b>' + esc(x.k) + '</b></button>'; }).join('') + '</div>';
    }
    function step3() {
      var sn = st.sn, picked = [], tiles = M.shuffle(sn.w.map(function (w, i) { return { w: w, id: i }; })), sp = lang === 'en' ? ' ' : '';
      body.innerHTML = '<p class="dyq">3. 낱말 조각을 차례대로 눌러 문장을 만들어요</p><div class="dykhint">' + esc(sn.k) + '</div><div class="dyslots lang-' + lang + '" id="dyS"></div>' +
        '<div class="dytiles lang-' + lang + '">' + tiles.map(function (t) { return '<button class="tile" data-ti="' + t.id + '">' + M.fz(t.w, lang) + '</button>'; }).join('') + '</div>' +
        '<div class="dyrow"><button class="btn ghost" id="dyUndo">하나 지우기</button><button class="btn ghost" id="dyHear">🔊 듣기</button></div><p class="hint center" id="dyMsg"></p>';
      function paint() { $('dyS').innerHTML = picked.map(function (t) { return '<span>' + M.fz(t.w, lang) + '</span>'; }).join(sp ? ' ' : '') || '<em>여기에 문장이 만들어져요</em>'; }
      paint();
      $('dyHear').onclick = function () { M.say(sn.say, lang); };
      $('dyUndo').onclick = function () { var t = picked.pop(); if (t) { t.b.disabled = false; t.b.classList.remove('used'); paint(); } };
      Array.prototype.forEach.call(body.querySelectorAll('[data-ti]'), function (b) {
        b.onclick = function () {
          if (b.disabled) return;
          var t = tiles.filter(function (x) { return x.id === +b.dataset.ti; })[0]; picked.push({ w: t.w, b: b }); b.disabled = true; b.classList.add('used'); paint(); M.sfx && M.sfx('tap');
          if (picked.length === sn.w.length) {
            if (picked.map(function (x) { return x.w; }).join('|') === sn.w.join('|')) { M.sfx && M.sfx('ok'); M.say(sn.say, lang); $('dyS').classList.add('ok'); setTimeout(step4, 900); }
            else { M.sfx && M.sfx('bad'); $('dyMsg').textContent = '순서가 조금 달라요. 🔊로 듣고 다시 맞춰 봐요'; setTimeout(function () { picked.forEach(function (x) { x.b.disabled = false; x.b.classList.remove('used'); }); picked = []; paint(); }, 800); }
          }
        };
      });
    }
    function step4() {
      var fromWords = [];
      M.learnedItems(lang).forEach(function (it) { if (it.e && !/[❌⭕✅❓❗➡⬅👉👈🙅🙆✋👌]/.test(it.e) && fromWords.indexOf(it.e) < 0 && st.sn.t.indexOf(it.t) >= 0) fromWords.push(it.e); });
      var pool = fromWords.concat(STAMPS.filter(function (s) { return fromWords.indexOf(s) < 0; })).slice(0, 12);
      body.innerHTML = '<p class="dyq">4. 그림 도장을 두 개까지 찍어요</p><div class="dystamps">' + pool.map(function (s) { return '<button data-stp="' + s + '">' + s + '</button>'; }).join('') + '</div><button class="btn primary wide" id="dyDone">일기 완성!</button>';
    }
    body.addEventListener('click', function (e) {
      var b = e.target.closest('[data-wx]'); if (b) { st.wx = b.dataset.wx; var w = WX.filter(function (x) { return x.id === st.wx; })[0]; M.say(wxLine(lang, w), lang); step2(); return; }
      b = e.target.closest('[data-sn]'); if (b) { st.sn = cands[+b.dataset.sn]; step3(); return; }
      b = e.target.closest('[data-stp]');
      if (b) {
        var s = b.dataset.stp, i = st.stamps.indexOf(s);
        if (i >= 0) st.stamps.splice(i, 1); else { if (st.stamps.length >= 2) st.stamps.shift(); st.stamps.push(s); }
        Array.prototype.forEach.call(body.querySelectorAll('[data-stp]'), function (x) { x.classList.toggle('on', st.stamps.indexOf(x.dataset.stp) >= 0); });
        return;
      }
      if (e.target.closest('#dyDone')) {
        if (!st.stamps.length) st.stamps.push(STAMPS[0]);
        var page = { d: M.today(), lang: lang, wx: st.wx, t: st.sn.t, k: st.sn.k, say: st.sn.say || st.sn.t, st: st.stamps.slice() };
        var L = list(); L.push(page); if (L.length > 120) L.splice(0, L.length - 120);
        M.give({ water: 10, coins: 20 }); M.save();
        if (desk && $('dyDesk')) $('dyDesk').src = desk + 'happy.png';
        body.innerHTML = '<p class="dyq center">🎉 일기 한 쪽을 완성했어요! <small>물방울 +10 · 코인 +20</small></p>' + pageHtml(page) + '<button class="btn primary wide" id="dyBook">📔 일기장 보기</button><button class="btn ghost wide" data-close>닫기</button>';
        if (M.render) M.render();
        return;
      }
      if (e.target.closest('#dyBook')) { d.close(); M.diaryBook(); return; }
      b = e.target.closest('[data-dysay]'); if (b) M.say(b.dataset.dysay, b.dataset.dylang);
    });
    step1();
  };

  M.diaryBook = function () {
    var L = list().slice().reverse();
    var d = M.modal('<h3>📔 그림일기장</h3><p class="hint">지금까지 ' + L.length + '쪽을 썼어요. 문장을 누르면 읽어 줘요.</p>' +
      (todayPage() ? '' : '<button class="btn primary wide" id="dyNew">✏️ 오늘 일기 쓰기</button>') +
      (L.length ? '<div class="dybook">' + L.map(pageHtml).join('') + '</div>' : '<p class="hint center">아직 쓴 일기가 없어요.</p>') +
      '<button class="btn ghost wide" data-close>닫기</button>', { cls: 'bagsheet dysheet' });
    d.addEventListener('click', function (e) {
      if (e.target.closest('#dyNew')) { d.close(); M.diaryWrite(); return; }
      var b = e.target.closest('[data-dysay]'); if (b) M.say(b.dataset.dysay, b.dataset.dylang);
    });
  };
})();
