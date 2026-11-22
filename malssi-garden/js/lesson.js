// 말씨정원 레슨: 문제 만들기와 푸는 화면
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  var S = null;   // 지금 풀고 있는 레슨

  // ---------- 문제 만들기 ----------
  function pool(lang, kana) {
    var out = [];
    window.LANGS[lang].stages.forEach(function (s) { if (!!s.kana === !!kana) out = out.concat(s.items); });
    return out;
  }
  // 정답 하나와 헷갈릴 만한 보기 셋. 같은 단계 것을 먼저 쓴다.
  function options(it, field, near) {
    var seen = {}; seen[it[field]] = 1;
    var out = [it];
    var tryAdd = function (list) {
      M.shuffle(list).forEach(function (x) { if (out.length < 4 && !seen[x[field]]) { seen[x[field]] = 1; out.push(x); } });
    };
    tryAdd(near); tryAdd(pool(it.lang, it.kana));
    return M.shuffle(out);
  }
  function stageOf(it) {
    var L = window.LANGS[it.lang];
    for (var i = 0; i < L.stages.length; i++) if (L.stages[i].id === it.sid) return L.stages[i];
    return null;
  }
  function pickQ(it, type, isNew) {
    if (type === 'listen' && !M.ttsOK()) type = 'target';
    var near = stageOf(it).items;
    return { type: type, item: it, isNew: !!isNew, opts: options(it, type === 'meaning' ? 'k' : 't', near) };
  }
  function buildQ(sent, lang) {
    var have = {}; sent.w.forEach(function (w) { have[w] = 1; });
    var others = [];
    window.LANGS[lang].stages.forEach(function (s) { s.sents.forEach(function (x) { x.w.forEach(function (w) { if (!have[w]) others.push(w); }); }); });
    var extra = [], seen = {};
    M.shuffle(others).forEach(function (w) { if (extra.length < (sent.w.length > 3 ? 3 : 2) && !seen[w]) { seen[w] = 1; extra.push(w); } });
    var tiles = M.shuffle(sent.w.concat(extra)).map(function (w, i) { return { w: w, id: i }; });
    return { type: 'build', sent: sent, tiles: tiles };
  }
  function speakable(stage, lang) {
    var c = stage ? stage.items.filter(function (it) { return !stageOf(it).nospeak; }) : [];
    if (lang !== 'ja' && stage) c = c.concat(stage.sents.map(function (s) { return { t: s.t, r: '', k: s.k, alt: [], lang: lang, sid: s.sid, sent: true }; }));
    return c;
  }
  M.buildLesson = function (lang, stage) {
    var qs = [], items, sents = [];
    var canSpeak = M.P.set.speak && M.speechOK();
    if (stage) {
      items = stage.items;
      var cyc = stage.kana ? ['meaning', 'listen', 'target'] : ['meaning', 'target', 'listen'];
      var seenKey = function (it) { return !!M.P.srs[M.itemKey(it)]; };
      var picks = M.shuffle(items).map(function (it, i) { return pickQ(it, cyc[i % 3], !seenKey(it)); });
      var match = { type: 'match', items: M.shuffle(items).slice(0, 5) };
      sents = M.shuffle(stage.sents).slice(0, 2).map(function (s) { return buildQ(s, lang); });
      var others = [];
      var sp = speakable(stage, lang);
      if (canSpeak && sp.length) others.push({ type: 'speak', item: M.pick(sp) });
      var prev = M.learnedItems(lang).filter(function (it) { return it.sid !== stage.id; });
      var due = M.dueItems(lang).filter(function (it) { return it.sid !== stage.id; });
      M.shuffle(due.length >= 2 ? due : prev).slice(0, 2).forEach(function (it) { others.push(pickQ(it, M.pick(['meaning', 'target', 'listen']))); });
      var rest = M.shuffle(sents.concat(others));
      qs = picks.slice(0, 3).concat([match]);
      var more = picks.slice(3);
      while (more.length || rest.length) {
        if (more.length) qs.push(more.shift());
        if (rest.length) qs.push(rest.shift());
      }
    } else {
      // 복습: 때가 된 단어와 틀렸던 단어 위주
      var due2 = M.shuffle(M.dueItems(lang));
      var all = M.shuffle(M.learnedItems(lang));
      items = due2.concat(all.filter(function (x) { return due2.indexOf(x) < 0; })).slice(0, 8);
      var types = ['meaning', 'target', 'listen'];
      qs = items.map(function (it, i) { return pickQ(it, types[i % 3]); });
      if (items.length >= 4) qs.splice(3, 0, { type: 'match', items: M.shuffle(items).slice(0, 5) });
      var ss = [];
      window.LANGS[lang].stages.forEach(function (s) { if (M.P.prog[lang][s.id]) ss = ss.concat(s.sents); });
      M.shuffle(ss).slice(0, 2).forEach(function (s, i) { qs.splice(5 + i * 3, 0, buildQ(s, lang)); });
      if (canSpeak) {
        var sp2 = items.filter(function (it) { return !stageOf(it).nospeak; });
        if (sp2.length) qs.splice(Math.min(qs.length, 7), 0, { type: 'speak', item: M.pick(sp2) });
      }
    }
    return qs;
  };

  // ---------- 화면 ----------
  M.startLesson = function (lang, stage) {
    var qs = M.buildLesson(lang, stage);
    S = { lang: lang, stage: stage, review: !stage, qs: qs, total: qs.length, i: 0, done: 0, mistakes: 0, combo: 0, best: 0, listenOK: 0, speakOK: 0, correct: 0, retries: 0, answered: false, t0: Date.now() };
    M.$('lesson').classList.remove('hidden');
    document.body.classList.add('in-lesson');
    if (M.wake) M.wake.on();
    show();
  };
  M.lessonState = function () { return S; };

  function bar() {
    $('lBar').style.width = Math.round(S.done / S.total * 100) + '%';
    var c = $('lCombo');
    c.textContent = S.combo >= 2 ? '🔥 ' + S.combo : '';
    c.classList.toggle('hot', S.combo >= 5);
  }
  function itemFace(it, opt) {
    opt = opt || {};
    var L = window.LANGS[it.lang];
    var showR = opt.reading !== false && it.r && !(it.kana && opt.hideKanaR);
    return '<div class="face lang-' + it.lang + '"><div class="ft">' + esc(it.t) + '</div>' + (showR ? '<div class="fr">' + esc(it.r) + '</div>' : '') + '</div>';
  }
  function audioBtn(text, lang, big) {
    if (!M.ttsOK()) return '';
    return '<button class="say' + (big ? ' big' : '') + '" data-say="' + esc(text) + '" aria-label="발음 듣기">🔊</button>' +
      (big ? '<button class="say slow" data-say="' + esc(text) + '" data-slow="1" aria-label="천천히 듣기">🐢</button>' : '');
  }
  var TITLES = { meaning: '뜻을 골라 보세요', target: '알맞은 말을 골라 보세요', listen: '잘 듣고 골라 보세요', match: '짝을 맞춰 보세요', build: '문장을 만들어 보세요', speak: '소리 내어 따라 말해 보세요' };

  function show() {
    var q = S.qs[S.i]; S.answered = false; bar();
    var body = $('lBody'), foot = $('lFoot');
    foot.className = 'lfoot'; foot.innerHTML = '';
    var h = '<div class="qt">' + (q.isNew ? '<span class="newtag">새 단어</span>' : '') + TITLES[q.type] + '</div>';
    var L = window.LANGS[S.lang];
    if (q.type === 'meaning') {
      h += '<div class="qcard">' + itemFace(q.item, { hideKanaR: true }) + audioBtn(q.item.t, q.item.lang) + '</div>';
      h += '<div class="opts">' + q.opts.map(function (o, i) { return '<button class="opt" data-i="' + i + '">' + (o.e ? '<span class="oe">' + o.e + '</span>' : '') + '<span>' + esc(o.k) + '</span></button>'; }).join('') + '</div>';
    } else if (q.type === 'target') {
      h += '<div class="qcard ko">' + (q.item.e ? '<div class="bigE">' + q.item.e + '</div>' : '') + '<div class="fk">' + esc(q.item.k) + '</div></div>';
      h += '<div class="opts">' + q.opts.map(function (o, i) { return '<button class="opt tgt lang-' + o.lang + '" data-i="' + i + '"><span class="ot">' + esc(o.t) + '</span>' + (o.lang === 'zh' ? '<small>' + esc(o.r.split(' · ')[0]) + '</small>' : '') + '</button>'; }).join('') + '</div>';
    } else if (q.type === 'listen') {
      h += '<div class="qcard listen">' + audioBtn(q.item.t, q.item.lang, true) + '</div>';
      h += '<div class="opts">' + q.opts.map(function (o, i) { return '<button class="opt tgt lang-' + o.lang + '" data-i="' + i + '"><span class="ot">' + esc(o.t) + '</span></button>'; }).join('') + '</div>';
    } else if (q.type === 'match') {
      var left = M.shuffle(q.items), right = M.shuffle(q.items);
      h += '<div class="match"><div class="mcol">' + left.map(function (it) { return '<button class="mt lang-' + it.lang + '" data-side="l" data-k="' + esc(it.t) + '">' + esc(it.t) + '</button>'; }).join('') + '</div>' +
        '<div class="mcol">' + right.map(function (it) { return '<button class="mt" data-side="r" data-k="' + esc(it.t) + '">' + (it.e ? it.e + ' ' : '') + esc(it.k) + '</button>'; }).join('') + '</div></div>';
      q.left = q.items.length; q.sel = null;
    } else if (q.type === 'build') {
      h += '<div class="qcard ko small"><div class="fk">' + esc(q.sent.k) + '</div></div>';
      h += '<div class="slots lang-' + S.lang + '" id="bSlots"></div><div class="tiles lang-' + S.lang + '" id="bTiles">' + q.tiles.map(function (t) { return '<button class="tile" data-id="' + t.id + '">' + esc(t.w) + '</button>'; }).join('') + '</div>';
      q.chosen = [];
    } else if (q.type === 'speak') {
      var it = q.item;
      h += '<div class="qcard">' + itemFace(it) + '<div class="fk sm">' + esc(it.k) + '</div>' + audioBtn(it.t, it.lang) + '</div>';
      h += '<div class="speak"><button class="mic" id="mic">🎤</button><div class="heard" id="heard">마이크를 누르고 말해 보세요</div></div>';
      q.fails = q.fails || 0;
    }
    body.innerHTML = h; body.scrollTop = 0;
    if (q.type === 'build') foot.innerHTML = '<button class="btn primary wide" id="bCheck" disabled>확인</button>';
    if (q.type === 'speak') foot.innerHTML = '<button class="btn ghost wide" id="sSkip">지금은 말할 수 없어요</button>';
    // 소리 자동 재생
    var auto = (q.type === 'listen') || (M.P.set.autoAudio && (q.type === 'meaning' || q.type === 'speak'));
    if (auto) setTimeout(function () { if (S && S.qs[S.i] === q) M.say(q.type === 'speak' ? q.item.t : q.item.t, S.lang); }, M.fast ? 0 : 250);
  }

  // 정답·오답 처리
  function judge(ok, q, info) {
    if (S.answered) return; S.answered = true;
    var foot = $('lFoot');
    if (ok) {
      S.combo++; S.best = Math.max(S.best, S.combo); S.correct++; S.done++;
      if (q.type === 'listen') S.listenOK++;
      if (q.type === 'speak') S.speakOK++;
      M.sfx('ok'); M.buzz(15);
    } else {
      S.combo = 0; S.mistakes++;
      M.sfx('bad'); M.buzz([40, 60, 40]);
      // 틀린 문제는 뒤에 다시 나온다
      if (!q.again) { var c = JSON.parse(JSON.stringify(q)); c.again = true; c.isNew = false; if (c.opts) c.opts = M.shuffle(q.opts); if (c.tiles) c.tiles = M.shuffle(q.tiles); S.qs.push(c); S.total++; }
      else S.done++;
    }
    if (q.item && !q.item.sent) M.srsHit(q.item, ok);
    bar();
    var cheer = ['좋아요!', '정답이에요!', '훌륭해요!', '딱 맞아요!', '잘했어요!'];
    var right = info || '';
    foot.className = 'lfoot ' + (ok ? 'good' : 'bad');
    foot.innerHTML = '<div class="fb"><div class="fbt">' + (ok ? '🎉 ' + M.pick(cheer) + (S.combo >= 3 ? ' <b>' + S.combo + '연속</b>' : '') : '😢 아쉬워요') + '</div>' +
      (right ? '<div class="fbs">' + right + '</div>' : '') + '</div><button class="btn wide ' + (ok ? 'primary' : 'danger') + '" id="lNext">계속</button>';
  }
  function answerInfo(it) {
    return '<span class="lang-' + it.lang + '">' + esc(it.t) + '</span>' + (it.r ? ' <small>' + esc(it.r) + '</small>' : '') + ' · ' + esc(it.k);
  }
  function next() {
    S.i++;
    if (S.i >= S.qs.length) { finish(); return; }
    show();
  }

  // ---------- 누르기 ----------
  function onTap(e) {
    if (!S) return;
    var t = e.target;
    var sayB = t.closest('[data-say]');
    if (sayB) { M.say(sayB.dataset.say, S.lang, !!sayB.dataset.slow); return; }
    if (t.closest('#lNext')) { next(); return; }
    var q = S.qs[S.i];
    var opt = t.closest('.opt');
    if (opt && !S.answered) {
      var o = q.opts[+opt.dataset.i], ok = o.t === q.item.t;
      opt.classList.add(ok ? 'right' : 'wrong');
      if (!ok) Array.prototype.forEach.call(document.querySelectorAll('.opt'), function (b) { if (q.opts[+b.dataset.i].t === q.item.t) b.classList.add('right'); });
      if (q.type !== 'listen' || ok) M.say(q.item.t, S.lang);
      judge(ok, q, answerInfo(q.item));
      return;
    }
    var mt = t.closest('.mt');
    if (mt && !mt.classList.contains('gone')) { matchTap(q, mt); return; }
    var tile = t.closest('.tile');
    if (tile && !S.answered && q.type === 'build') { buildTap(q, tile); return; }
    if (t.closest('#bCheck') && !S.answered) {
      var got = q.chosen.map(function (id) { return q.tiles[id].w; }).join('\u0001');
      var ok2 = got === q.sent.w.join('\u0001');
      M.say(q.sent.t, S.lang);
      judge(ok2, q, (ok2 ? '' : '정답: ') + '<span class="lang-' + S.lang + '">' + esc(q.sent.t) + '</span>');
      return;
    }
    if (t.closest('#mic')) { speak(q); return; }
    if (t.closest('#sSkip')) { S.done++; next(); return; }
  }
  function matchTap(q, b) {
    M.sfx('tap');
    if (b.dataset.side === 'l') M.say(b.dataset.k, S.lang);
    if (!q.sel || q.sel.dataset.side === b.dataset.side) {
      if (q.sel) q.sel.classList.remove('sel');
      q.sel = b; b.classList.add('sel'); return;
    }
    var a = q.sel; q.sel = null; a.classList.remove('sel');
    if (a.dataset.k === b.dataset.k) {
      a.classList.add('gone'); b.classList.add('gone'); q.left--; M.sfx('pop');
      if (q.left === 0) {
        q.items.forEach(function (it) { M.srsHit(it, true); });
        setTimeout(function () { judge(true, { type: 'match' }, ''); }, M.fast ? 0 : 250);
      }
    } else {
      a.classList.add('shakeX'); b.classList.add('shakeX'); M.sfx('bad'); M.buzz(40);
      S.mistakes++; S.combo = 0; bar();
      setTimeout(function () { a.classList.remove('shakeX'); b.classList.remove('shakeX'); }, 400);
    }
  }
  function buildTap(q, tile) {
    var id = +tile.dataset.id;
    M.sfx('tap');
    var inSlot = tile.parentNode.id === 'bSlots';
    if (inSlot) { q.chosen.splice(q.chosen.indexOf(id), 1); $('bTiles').querySelector('[data-id="' + id + '"]').classList.remove('used'); tile.remove(); }
    else {
      if (tile.classList.contains('used')) return;
      q.chosen.push(id); tile.classList.add('used');
      var c = document.createElement('button'); c.className = 'tile'; c.dataset.id = id; c.textContent = q.tiles[id].w;
      $('bSlots').appendChild(c);
      if (S.lang !== 'en') M.say(q.tiles[id].w, S.lang);
    }
    $('bCheck').disabled = q.chosen.length === 0;
  }
  function speak(q) {
    var mic = $('mic'), heard = $('heard');
    if (mic.classList.contains('on')) { try { M._rec.stop(); } catch (e) {} return; }
    mic.classList.add('on'); heard.textContent = '듣고 있어요… 말해 보세요';
    var targets = [q.item.t].concat(q.item.alt || []);
    M.listen(S.lang).then(function (res) {
      mic.classList.remove('on');
      if (!S || S.qs[S.i] !== q) return;
      if (!res.length) { heard.textContent = '소리가 들리지 않았어요. 다시 눌러 보세요'; return; }
      var score = M.similar(res, targets, S.lang);
      heard.innerHTML = '들린 말: <b>' + esc(res[0]) + '</b>';
      if (score >= 0.6) { M.P.stats.speak++; judge(true, q, '발음이 좋아요! ' + Math.round(score * 100) + '점'); }
      else {
        q.fails++;
        heard.innerHTML += '<br>조금 다르게 들렸어요. 한 번 더 해 볼까요?';
        M.sfx('bad');
        if (q.fails >= 2) $('lFoot').innerHTML = '<button class="btn ghost wide" id="sSkip">넘어가기</button>';
      }
    }).catch(function (err) {
      mic.classList.remove('on');
      var m = String(err && err.message);
      heard.textContent = m === 'not-allowed' || m === 'service-not-allowed' ? '마이크 사용을 허용해야 말하기 연습을 할 수 있어요.' : '음성 인식이 잘 안 됐어요. 다시 눌러 보세요.';
      q.fails++;
      if (q.fails >= 2) $('lFoot').innerHTML = '<button class="btn ghost wide" id="sSkip">넘어가기</button>';
    });
  }

  // ---------- 끝 ----------
  function finish() {
    var P = M.P, st = S.stage, lang = S.lang;
    var stars = S.mistakes === 0 ? 3 : S.mistakes <= 2 ? 2 : 1;
    var first = st && !P.prog[lang][st.id];
    var prevStars = st ? (P.prog[lang][st.id] || 0) : 0;
    var water = (S.review ? 25 : 20) + stars * 5 + (first ? 15 : 0) + Math.floor(S.best / 5) * 3;
    var bonus = Math.round(water * M.petBonus() / 100);
    var o = { water: water + bonus, coins: 5 + stars * 2 };
    if (st) P.prog[lang][st.id] = Math.max(prevStars, stars);
    P.xp += 10 + stars * 2;
    P.stats.lessons++; P.stats.correct += S.correct; if (stars === 3) P.stats.perfect++;
    var before = (P.log[M.today()] || {}).l || 0;
    M.logDay({ l: 1, xp: 10 + stars * 2, w: o.water });
    var grew = M.markStudy();
    M.give(o);
    M.quest('lesson', 1);
    if (S.mistakes === 0) M.quest('perfect', 1);
    if (S.listenOK) M.quest('listen', S.listenOK);
    if (S.speakOK) M.quest('speak', S.speakOK);
    M.quest('combo', S.best);
    if (S.review) M.quest('review', 1);
    M.save();
    var goalHit = before < P.set.goal && before + 1 >= P.set.goal;
    var acc = Math.round(S.correct / Math.max(1, S.correct + S.mistakes) * 100);
    var mins = Math.max(1, Math.round((Date.now() - S.t0) / 60000));
    var stg = P.pet.lv >= 10 ? 3 : P.pet.lv >= 5 ? 2 : 1;
    M.sfx('win');
    $('lFoot').className = 'lfoot'; $('lBar').style.width = '100%'; $('lCombo').textContent = '';
    $('lBody').innerHTML = '<div class="result">' +
      '<img class="rpet popin" src="img/pet-' + stg + '-happy.png" alt="">' +
      '<h2>' + (S.review ? '복습 완료!' : first ? '새 단계 완료!' : '레슨 완료!') + '</h2>' +
      '<div class="stars">' + [1, 2, 3].map(function (i) { return '<span class="st' + (i <= stars ? ' on' : '') + '" style="animation-delay:' + (i * 0.18) + 's">★</span>'; }).join('') + '</div>' +
      '<div class="rstats"><div><b>' + acc + '%</b><small>정확도</small></div><div><b>' + S.best + '</b><small>최고 연속</small></div><div><b>' + mins + '분</b><small>걸린 시간</small></div></div>' +
      '<div class="rws big">' + M.rewardHtml(o) + '</div>' +
      (bonus ? '<p class="hint">' + esc(P.petName) + ' 보너스로 물방울 +' + bonus + '</p>' : '') +
      (grew ? '<p class="streakMsg">🔥 연속 ' + P.streak + '일째 공부했어요!</p>' : '') +
      (goalHit ? '<p class="streakMsg">🎯 오늘 목표를 달성했어요!</p>' : '') +
      '</div>';
    $('lFoot').innerHTML = '<button class="btn primary wide" id="lDone">계속하기</button>';
    var done = S; S = null;
    $('lFoot').querySelector('#lDone').addEventListener('click', function () {
      closeLesson();
      if (goalHit) M.openChest(M.rollChest(false), '오늘 목표 달성 상자');
      if (M.afterLesson) M.afterLesson(done, first);
    });
  }
  function closeLesson() {
    S = null;
    $('lesson').classList.add('hidden');
    document.body.classList.remove('in-lesson');
    if (M.wake) M.wake.off();
    try { speechSynthesis.cancel(); } catch (e) {}
    if (M.render) M.render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('lesson').addEventListener('click', onTap);
    $('lQuit').addEventListener('click', function () {
      if (!S) { closeLesson(); return; }
      M.confirm('레슨을 그만할까요?', '지금까지 푼 문제는 저장되지 않아요.', '그만하기', closeLesson, true);
    });
  });

  // 자동 점검용: 지금 문제를 맞게 푼다
  M.autoSolve = function (wrong) {
    if (!S) return 'none';
    var q = S.qs[S.i];
    if (S.answered) { $('lNext').click(); return 'next'; }
    if (q.type === 'meaning' || q.type === 'target' || q.type === 'listen') {
      var idx = q.opts.findIndex(function (o) { return wrong ? o.t !== q.item.t : o.t === q.item.t; });
      document.querySelector('.opt[data-i="' + idx + '"]').click();
    } else if (q.type === 'match') {
      q.items.forEach(function (it) {
        var k = it.t.replace(/"/g, '\\"');
        document.querySelector('.mt[data-side="l"][data-k="' + k + '"]').click();
        document.querySelector('.mt[data-side="r"][data-k="' + k + '"]').click();
      });
    } else if (q.type === 'build') {
      var used = {};
      (wrong ? q.sent.w.slice().reverse() : q.sent.w).forEach(function (w) {
        var t = q.tiles.filter(function (x) { return x.w === w && !used[x.id]; })[0]; used[t.id] = 1;
        document.querySelector('#bTiles [data-id="' + t.id + '"]').click();
      });
      $('bCheck').click();
    } else if (q.type === 'speak') {
      $('sSkip').click();
    }
    return q.type;
  };
})();
