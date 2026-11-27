// 레벨 테스트 (말씨정원): 아직 닿지 않은 수준부터 시작하고 싶을 때, 건너뛸 단계들의 낱말로 15문제를 낸다.
// 12개 이상 맞히면 그 앞 단계들을 끝낸 것으로 하고, 그 낱말들은 "이미 아는 낱말"로 복습 일정에 넣는다(한꺼번에 복습이 쏟아지지 않게 날짜를 흩어 둔다).
(function () {
  var M = window.M, esc = M.esc, N = 15, PASS = 12;
  function lvOf(L, s) { return L.units[s.unit].level || 'base'; }
  var SIDE = { GR: 1, CV: 1, CO: 1, RD: 1, PR: 1 };
  M.levelTest = function (lang, lv, after) {
    var L = window.LANGS[lang], prog = M.P.prog[lang];
    var first = L.stages.findIndex(function (s) { return lvOf(L, s) === lv; });
    var skip = L.stages.filter(function (s) { return s.idx < first && !prog[s.id] && !SIDE[lvOf(L, s)]; });
    var pool = []; skip.forEach(function (s) { if (!s.kana) s.items.forEach(function (it) { if (it.k && it.t) pool.push(it); }); });
    if (!skip.length) { M.toast('건너뛸 단계가 없어요'); return; }
    if (pool.length < N) skip.forEach(function (s) { s.items.forEach(function (it) { if (it.k && pool.indexOf(it) < 0) pool.push(it); }); });
    // 앞쪽·뒤쪽 단계가 고르게 나오도록 구간을 나눠 고른다
    var qs = [], step = pool.length / N;
    for (var i = 0; i < N && i * step < pool.length; i++) qs.push(pool[Math.floor(i * step + Math.random() * step)] || pool[Math.floor(i * step)]);
    var lvName = { N5: 'JLPT N5', N4: 'JLPT N4', N3: 'JLPT N3', HSK1: 'HSK 1급', HSK2: 'HSK 2급', HSK3: 'HSK 3급', A1: '생활 영어' }[lv] || lv;
    var d = M.modal('<div class="lt" id="ltBox"></div>', { cls: 'full', sticky: true }), box = d.querySelector('#ltBox'), k = 0, ok = 0;
    function intro() {
      box.innerHTML = '<h3>🚀 레벨 테스트</h3><p><b>' + esc(lvName) + '</b>부터 시작하려면 앞의 <b>' + skip.length + '단계</b>를 건너뛰어야 해요.</p><p class="hint">그 단계들의 낱말로 ' + N + '문제를 내요. ' + PASS + '개 이상 맞히면 건너뛰고, 그 낱말들은 이미 아는 낱말로 복습 일정에 들어가요.</p><button class="btn primary wide" data-lgo>시작하기</button><button class="btn ghost wide" data-close>그만두기</button>';
      box.querySelector('[data-lgo]').onclick = ask;
    }
    function ask() {
      if (k >= qs.length) return result();
      var it = qs[k], opts = M.shuffle([it].concat(M.shuffle(pool.filter(function (x) { return x.k !== it.k; })).slice(0, 3)));
      box.innerHTML = '<div class="ltbar"><i style="width:' + Math.round(k / qs.length * 100) + '%"></i></div><p class="hint">' + (k + 1) + ' / ' + qs.length + ' · 뜻을 골라요</p>' +
        '<button class="lttop lang-' + lang + '" data-say="' + esc(it.say) + '">' + M.fz(it.t, lang) + (it.r && lang !== 'en' ? '<small>' + esc(it.r.split(' · ')[0]) + '</small>' : '') + '</button>' +
        '<div class="ltopts">' + opts.map(function (o, i) { return '<button class="opt" data-i="' + i + '">' + esc(o.k) + '</button>'; }).join('') + '</div><button class="btn ghost wide" data-lskip>모르겠어요</button>';
      box.dataset.ans = it.k;   // 자동 점검용
      box.querySelector('.lttop').onclick = function () { M.say(it.say, lang); };
      var pick = function (right, b) {
        Array.prototype.forEach.call(box.querySelectorAll('.opt'), function (x) { x.disabled = true; if (opts[+x.dataset.i] === it) x.classList.add('right'); });
        if (b && !right) b.classList.add('wrong');
        if (right) { ok++; M.sfx('ok'); } else M.sfx('bad');
        k++; setTimeout(ask, M.fast ? 0 : 650);
      };
      Array.prototype.forEach.call(box.querySelectorAll('.opt'), function (b) { b.onclick = function () { pick(opts[+b.dataset.i] === it, b); }; });
      box.querySelector('[data-lskip]').onclick = function () { pick(false, null); };
    }
    function result() {
      var pass = ok >= PASS;
      if (pass) {
        var now = Date.now(), DAY = 86400000;
        skip.forEach(function (s) {
          prog[s.id] = prog[s.id] || 1;
          s.items.forEach(function (it, j) { var key = M.itemKey(it); if (!M.P.srs[key]) M.P.srs[key] = [3, now + (3 + (j * 7 + s.idx) % 25) * DAY, 0, now, 0]; });
        });
        M.P.ui.lv = M.P.ui.lv || {}; M.P.ui.lv[lang] = lv; M.save(); M.sfx('win');
      }
      box.innerHTML = '<div class="center"><div class="tbig">' + (pass ? '🎉' : '🌱') + '</div><h3>' + ok + ' / ' + qs.length + '</h3><p>' + (pass ? '합격이에요! 앞의 ' + skip.length + '단계를 건너뛰고 <b>' + esc(lvName) + '</b>부터 시작해요.' : '조금만 더 연습하고 다시 도전해요. 지금 단계부터 차근차근 가 봐요!') + '</p><button class="btn primary wide" data-close>' + (pass ? '시작하기' : '닫기') + '</button></div>';
    }
    d.addEventListener('click', function (e) { if (e.target.closest('[data-close]') && after) setTimeout(after, 50); });
    intro();
  };
})();
