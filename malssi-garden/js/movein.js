// 이사 장면 (말씨정원). 가게 레벨이 올라 새 주민이 생기면, 다음에 마을에 들어올 때
// 이삿짐 트럭이 와서 주민이 내리고 배우는 말로 인사한다. 환영해 주면 친밀도와 코인을 받는다.
(function () {
  var M = window.M, esc = M.esc;
  var HELLO = {
    ja: ['はじめまして！今日から となりに すみます。', '처음 뵙겠습니다! 오늘부터 이웃에 살아요.', 'よろしくね！', '잘 부탁해!'],
    zh: ['你好！我今天搬到这里了。', '안녕하세요! 오늘 여기로 이사 왔어요.', '以后请多关照！', '앞으로 잘 부탁해요!'],
    en: ['Hi! I just moved in next door.', '안녕하세요! 방금 옆집으로 이사 왔어요.', 'Nice to meet you, neighbor!', '만나서 반가워요, 이웃!']
  };
  function st() { var v = M.P.village = M.P.village || {}; return v; }
  // 처음 이 기능을 만났을 때 이미 살고 있던 주민은 환영한 것으로 친다
  function welcomed() {
    var v = st();
    if (!v.welcomed) { v.welcomed = {}; M.V.residents().forEach(function (c) { v.welcomed[c.id] = 1; }); M.save(); }
    return v.welcomed;
  }
  M.moveInCheck = function () {
    if (!M.V || document.querySelector('.dim') || document.getElementById('movein')) return;
    var w = welcomed(), c = M.V.residents().filter(function (x) { return !w[x.id]; })[0];
    if (c) setTimeout(function () { play(c); }, M.fast ? 0 : 600);
  };
  function play(c) {
    if (document.getElementById('movein')) return;
    var lang = M.P.lang, h = HELLO[lang] || HELLO.en, W = 'img/w/';
    var el = document.createElement('div'); el.id = 'movein'; el.className = 'movein';
    el.innerHTML = '<div class="mvstage"><img class="mvarch" src="' + W + 'm-arch.png" alt=""><img class="mvhouse" src="' + W + 'h-' + c.id + '.png" alt="">' +
      '<img class="mvtruck" src="' + W + 'm-truck.png" alt=""><img class="mvboxes" src="' + W + 'm-boxes.png" alt="">' +
      '<img class="mvch" src="' + W + 'ch-' + c.id + '-side.png" alt=""><div class="mvsay"></div></div>' +
      '<div class="mvtext"><b>🚚 새로운 친구가 이사 왔어요!</b><small>누구일까요?</small></div>' +
      '<button class="btn primary wide mvbtn" disabled>🎉 환영해요!</button>';
    document.body.appendChild(el);
    var q = function (s) { return el.querySelector(s); }, ch = q('.mvch'), say = q('.mvsay'), btn = q('.mvbtn');
    var T = M.fast ? function (f) { f(); } : function (f, ms) { setTimeout(f, ms); };
    M.sfx('pop');
    T(function () { el.classList.add('s1'); }, 50);                    // 트럭이 들어온다
    T(function () { el.classList.add('s2'); M.sfx('merge'); }, 1500);  // 짐 상자를 내린다
    T(function () { el.classList.add('s3'); }, 2100);                   // 주민이 걸어 나온다
    T(function () {
      el.classList.add('s4'); ch.src = W + 'ch-' + c.id + '-happy.png';
      say.innerHTML = '<button class="mvline lang-' + lang + '" data-say="' + esc(h[0]) + '"><b>' + esc(h[0]) + '</b><small>' + esc(h[1]) + '</small></button>';
      M.say(h[0], lang, false, false, 'A'); M.sfx('win'); btn.disabled = false; q('.mvtext').innerHTML = '<b>🚚 새로운 친구가 이사 왔어요!</b><small>' + esc(M.j(c.name, '이에요', '예요')) + '</small>';
    }, 3500);
    el.addEventListener('click', function (e) { var s = e.target.closest('[data-say]'); if (s) M.say(s.dataset.say, lang, false, false, 'A'); });
    btn.onclick = function () {
      welcomed()[c.id] = 1; M.give({ coins: 50 }); M.save();
      say.innerHTML = '<button class="mvline lang-' + lang + '" data-say="' + esc(h[2]) + '"><b>' + esc(h[2]) + '</b><small>' + esc(h[3]) + '</small></button>';
      M.say(h[2], lang, false, false, 'A');
      q('.mvtext').innerHTML = '<b>' + esc(M.j(c.name, '과', '와')) + ' 친구가 됐어요 ♥</b>' + M.rewardHtml({ coins: 50 });
      btn.textContent = '마을로 돌아가기'; btn.onclick = function () { el.remove(); M.gardenFriendUp(c.id); if (M.render) M.render(); setTimeout(M.moveInCheck, 400); };
    };
  }
  M.moveInPlay = function (id) { play(M.custOf(id)); };   // 자동 점검용
})();
