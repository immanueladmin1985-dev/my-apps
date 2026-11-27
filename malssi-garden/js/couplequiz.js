// 부부 퀴즈 (말씨정원): 남편 폰에서 고른 낱말로 아내 폰에서 푸는 퀴즈. 결과는 가족 연결로 남편 폰에 간다.
(function () {
  var M = window.M, esc = M.esc;
  M.coupleQuizNotice = function () {
    var q = M.P.quizIn; if (!q || q.done) return;
    var show = function () {
      var name = M.Family && M.Family.mateName ? M.Family.mateName() : '남편';
      var d = M.modal('<div class="center"><div class="tbig">💌</div><h3>' + esc(name) + '의 퀴즈가 도착했어요!</h3>' + (q.msg ? '<p class="qmsg">“' + esc(q.msg) + '”</p>' : '') + '<p class="hint">낱말 ' + q.words.length + '개 · 맞힌 만큼 꽃 포인트를 받아요</p><button class="btn primary wide" data-qgo>지금 풀기</button><button class="btn ghost wide" data-close>나중에</button></div>');
      d.querySelector('[data-qgo]').onclick = function () { d.close(); M.coupleQuiz(); };
    };
    if (M.queuePopup) M.queuePopup(show); else show();
  };
  M.coupleQuiz = function () {
    var q = M.P.quizIn; if (!q || q.done) { M.toast('지금 기다리는 퀴즈가 없어요'); return; }
    var lang = q.lang, words = M.shuffle(q.words.slice()), k = 0, ok = 0, wrong = [];
    var extra = []; try { extra = M.learnedItems(lang).filter(function (it) { return it.k; }).map(function (it) { return it.k; }); } catch (e) {}
    var d = M.modal('<div class="lt" id="cqBox"></div>', { cls: 'full', sticky: true }), box = d.querySelector('#cqBox');
    function ask() {
      if (k >= words.length) return done();
      var w = words[k], others = M.shuffle(words.map(function (x) { return x.k; }).concat(extra).filter(function (x, i, a) { return x !== w.k && a.indexOf(x) === i; })).slice(0, 3), opts = M.shuffle([w.k].concat(others));
      box.innerHTML = '<div class="ltbar"><i style="width:' + Math.round(k / words.length * 100) + '%"></i></div><p class="hint">💌 부부 퀴즈 ' + (k + 1) + ' / ' + words.length + '</p>' +
        '<button class="lttop lang-' + lang + '" data-cqs>' + M.fz(w.t, lang) + (w.r && lang !== 'en' ? '<small>' + esc(w.r.split(' · ')[0]) + '</small>' : '') + '</button>' +
        '<div class="ltopts">' + opts.map(function (o, i) { return '<button class="opt" data-i="' + i + '">' + esc(o) + '</button>'; }).join('') + '</div>';
      box.dataset.ans = w.k;
      box.querySelector('[data-cqs]').onclick = function () { M.say(w.t, lang); };
      if (M.P.set.autoAudio) M.say(w.t, lang);
      Array.prototype.forEach.call(box.querySelectorAll('.opt'), function (b) {
        b.onclick = function () {
          var right = opts[+b.dataset.i] === w.k;
          Array.prototype.forEach.call(box.querySelectorAll('.opt'), function (x) { x.disabled = true; if (opts[+x.dataset.i] === w.k) x.classList.add('right'); });
          if (right) { ok++; M.sfx('ok'); } else { b.classList.add('wrong'); wrong.push(w.t); M.sfx('bad'); }
          k++; setTimeout(ask, M.fast ? 0 : 700);
        };
      });
    }
    function done() {
      var fp = ok * 2;
      q.done = true; M.P.quizRes = { at: Date.now(), ok: ok, n: words.length, wrong: wrong.slice(0, 10) };
      M.give({ fp: fp }); M.save(); M.sfx('win');
      if (M.Family && M.Family.pushState) M.Family.pushState();
      box.innerHTML = '<div class="center"><div class="tbig">' + (ok === words.length ? '🏆' : '💕') + '</div><h3>' + ok + ' / ' + words.length + '</h3><p>' + (ok === words.length ? '모두 맞혔어요! 결과를 보냈어요.' : '결과를 보냈어요. 틀린 낱말은 다시 한 번 봐 두세요.') + '</p>' + (wrong.length ? '<p class="hint">틀린 낱말: ' + wrong.map(esc).join(', ') + '</p>' : '') + '<div class="center">' + M.rewardHtml({ fp: fp }) + '</div><button class="btn primary wide" data-close>닫기</button></div>';
    }
    ask();
  };
  // 앱을 열었을 때 풀지 않은 퀴즈가 있으면 알려 준다
  setTimeout(function () { if (M.P && M.P.quizIn && !M.P.quizIn.done) M.coupleQuizNotice(); }, 2500);
})();
