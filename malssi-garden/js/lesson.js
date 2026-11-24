// 말씨정원 레슨: 문제 만들기와 푸는 화면
// 읽어 주기 규칙
//  - 외국어 글자(배우기 카드, 짝 맞추기 왼쪽, 문장 조각)는 누르면 언제나 읽어 준다.
//  - 뜻 고르기·듣고 고르기·따라 말하기는 문제가 나올 때 읽어 준다.
//  - 말 고르기(한국어 → 외국어)는 소리가 답이 되므로, 답을 고른 뒤에 정답을 읽어 준다.
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  var S = null;   // 지금 풀고 있는 레슨

  // ---------- 문제 만들기 ----------
  function pool(lang, kana) {
    var out = [];
    window.LANGS[lang].stages.forEach(function (s) { if (!!s.kana === !!kana) out = out.concat(s.items); });
    return out;
  }
  function stageOf(it) {
    var L = window.LANGS[it.lang];
    for (var i = 0; i < L.stages.length; i++) if (L.stages[i].id === it.sid) return L.stages[i];
    return null;
  }
  // 정답 하나와 보기 셋. 보기는 문제가 나오는 순간에 "이미 배운 것"(이 단계에서 방금 배운 것 포함,
  // 지금 단계보다 뒤 단계는 제외)으로만 만든다. 같은 단계 것을 먼저 쓴다.
  function taught(x) { return !!M.P.srs[M.itemKey(x)]; }
  function options(it, field) {
    var seen = {}; seen[it[field]] = 1;
    var out = [it], st = stageOf(it);
    var add = function (list) { M.shuffle(list).forEach(function (x) { if (out.length < 4 && !seen[x[field]] && taught(x)) { seen[x[field]] = 1; out.push(x); } }); };
    add(st.items);
    add(pool(it.lang, it.kana).filter(function (x) { var s2 = stageOf(x); return s2 && s2.idx <= st.idx; }));
    return M.shuffle(out);
  }
  function pickQ(it, type) {
    if (type === 'listen' && !M.ttsOK()) type = 'target';
    return { type: type, item: it, opts: null };   // 보기는 show() 에서 만든다
  }
  function buildQ(sent, lang) {
    var have = {}; sent.w.forEach(function (w) { have[w] = 1; });
    var st = stageOf(sent), others = [];
    window.LANGS[lang].stages.forEach(function (s) {
      if (!!s.kana !== !!st.kana || s.idx > st.idx) return;   // 아직 배우지 않은 단계의 낱말은 섞지 않는다
      s.sents.forEach(function (x) { x.w.forEach(function (w) { if (!have[w]) others.push(w); }); });
      if (s.kana) s.items.forEach(function (it) { if (!have[it.t] && it.t.length <= 4) others.push(it.t); });
    });
    var extra = [], seen = {};
    M.shuffle(others).forEach(function (w) { if (extra.length < (sent.w.length > 3 ? 3 : 2) && !seen[w]) { seen[w] = 1; extra.push(w); } });
    var tiles = M.shuffle(sent.w.concat(extra)).map(function (w, i) { return { w: w, id: i }; });
    // 병음 조각은 기계 음성이 제대로 못 읽으므로 조각 하나씩은 읽지 않는다
    return { type: 'build', sent: sent, tiles: tiles, mute: !!(st.kana && lang === 'zh') };
  }
  function speakable(stage, lang) {
    var c = stage.nospeak ? [] : stage.items.slice();
    if (lang !== 'ja' && !stage.kana) c = c.concat(stage.sents.map(function (s) { return { t: s.t, say: s.say, r: '', k: s.k, alt: [], lang: lang, sid: s.sid, sent: true }; }));
    return c;
  }
  // 처음 보는 문장은 낱말 뜻과 어순을 먼저 보여 준다
  function sentKey(s) { return 'S:' + s.lang + ':' + s.t; }
  function sentPair(s, lang) { var b = buildQ(s, lang); return M.P.srs[sentKey(s)] ? b : [{ type: 'steach', sent: s }, b]; }
  function flat(a) { var o = []; a.forEach(function (x) { if (Array.isArray(x)) o = o.concat(x); else o.push(x); }); return o; }
  function gloss(w, lang) {
    var n = w.toLowerCase().replace(/[,.?!，。？！]/g, '');
    var L = window.LANGS[lang], hit = '';
    L.stages.forEach(function (s) { s.items.forEach(function (it) { if (!hit && it.t.toLowerCase() === n) hit = it.k; }); });
    var G = (window.GLOSS || {})[lang] || {};
    return hit || G[n] || G[w] || '';
  }
  M.buildLesson = function (lang, stage) {
    var qs = [];
    var canSpeak = M.P.set.speak && M.speechOK();
    if (stage) {
      var items = M.shuffle(stage.items);
      var isNew = function (it) { return !M.P.srs[M.itemKey(it)]; };
      var fresh = items.filter(isNew), known = items.filter(function (it) { return !isNew(it); });
      var cyc = stage.ear ? ['listen', 'listen', 'target'] : stage.kana ? ['listen', 'meaning', 'target'] : ['meaning', 'listen', 'target'];
      var n = 0;
      // 새 단어는 2개씩 먼저 보여 주고 바로 문제로 확인한다
      for (var i = 0; i < fresh.length; i += 2) {
        var chunk = fresh.slice(i, i + 2);
        chunk.forEach(function (it) { qs.push({ type: 'teach', item: it }); });
        chunk.forEach(function (it) { qs.push(pickQ(it, cyc[n++ % 3])); });
      }
      known.forEach(function (it) { qs.push(pickQ(it, cyc[n++ % 3])); });
      qs.push({ type: 'match', items: M.shuffle(stage.items).slice(0, 5) });   // 짝 맞추기는 모두 배운 뒤에
      // 다른 단어도 한 번 더 (같은 단계 안에서 반대 방향으로)
      M.shuffle(stage.items).slice(0, 2).forEach(function (it) { qs.push(pickQ(it, stage.ear ? 'listen' : 'target')); });
      var rest = [];
      M.shuffle(stage.sents).slice(0, 2).forEach(function (s) { rest.push(sentPair(s, lang)); });
      var sp = speakable(stage, lang);
      if (canSpeak && sp.length) rest.push({ type: 'speak', item: M.pick(sp) });
      var prev = M.learnedItems(lang).filter(function (it) { return it.sid !== stage.id; });
      var due = M.dueItems(lang).filter(function (it) { return it.sid !== stage.id; });
      M.shuffle(due.length >= 2 ? due : prev).slice(0, 2).forEach(function (it) { rest.push(pickQ(it, M.pick(['meaning', 'target', 'listen']))); });
      qs = qs.concat(flat(M.shuffle(rest)));
    } else {
      // 복습: 때가 된 단어와 틀렸던 단어 위주
      var due2 = M.shuffle(M.dueItems(lang));
      var all = M.shuffle(M.learnedItems(lang));
      var its = due2.concat(all.filter(function (x) { return due2.indexOf(x) < 0; })).slice(0, 8);
      var types = ['meaning', 'target', 'listen'];
      qs = its.map(function (it, k) { return pickQ(it, types[k % 3]); });
      if (its.length >= 4) qs.splice(3, 0, { type: 'match', items: M.shuffle(its).slice(0, 5) });
      var ss = [];
      window.LANGS[lang].stages.forEach(function (s) { if (M.P.prog[lang][s.id]) ss = ss.concat(s.sents); });
      M.shuffle(ss).slice(0, 2).forEach(function (s, k) { var pr = sentPair(s, lang); qs.splice.apply(qs, [Math.min(qs.length, 5 + k * 3), 0].concat(Array.isArray(pr) ? pr : [pr])); });
      if (canSpeak) {
        var sp2 = its.filter(function (it) { return !stageOf(it).nospeak; });
        if (sp2.length) qs.splice(Math.min(qs.length, 7), 0, { type: 'speak', item: M.pick(sp2) });
      }
    }
    return qs;
  };

  // ---------- 화면 ----------
  M.startLesson = function (lang, stage) {
    if (stage) { M.P.last = M.P.last || {}; M.P.last[lang] = stage.id; M.save(); }
    var qs = M.buildLesson(lang, stage);
    S = { lang: lang, stage: stage, review: !stage, qs: qs, total: qs.length, i: 0, done: 0, mistakes: 0, combo: 0, best: 0, listenOK: 0, speakOK: 0, correct: 0, answered: false, t0: Date.now() };
    $('lesson').classList.remove('hidden');
    document.body.classList.add('in-lesson');
    if (M.wake) M.wake.on();
    show();
  };
  M.lessonState = function () { return S; };

  function bar() {
    $('lBar').style.width = Math.round(S.done / S.total * 100) + '%';
    var c = $('lCombo');
    c.textContent = S.combo >= 2 ? '🔥 ' + S.combo : '';
  }
  function sayBtn(text, big) {
    if (!M.ttsOK()) return '';
    return '<button class="say' + (big ? ' big' : '') + '" data-say="' + esc(text) + '" aria-label="발음 듣기">🔊</button>' +
      (big ? '<button class="say slow" data-say="' + esc(text) + '" data-slow="1" aria-label="천천히 듣기">🐢</button>' : '');
  }
  // 긴 낱말은 글씨를 줄여서 잘리지 않게 한다
  function sizeCls(t) { var n = String(t).replace(/\s/g, '').length; return n > 9 ? ' xl' : n > 5 ? ' lg' : n > 3 ? ' md' : ''; }
  var HAN = /[\u4e00-\u9fff]/;
  function jaKanji(o) { return o.lang === 'ja' && o.r && HAN.test(o.t); }   // 한자 단어는 읽는 법을 같이 보여 준다
  function foot(html, cls) { var f = $('lFoot'); f.className = 'lfoot' + (cls ? ' ' + cls : ''); f.innerHTML = html; }
  var TITLES = { steach: '문장을 배워요', teach: '새로 배워요', meaning: '뜻을 골라 보세요', target: '알맞은 말을 골라 보세요', listen: '잘 듣고 골라 보세요', match: '짝을 맞춰 보세요', build: '순서대로 눌러 만들어 보세요', speak: '소리 내어 따라 말해 보세요' };

  function show() {
    var q = S.qs[S.i]; S.answered = false; q.pick = null; bar();
    if (q.item && !q.opts && (q.type === 'meaning' || q.type === 'target' || q.type === 'listen')) {
      q.opts = options(q.item, q.type === 'meaning' ? 'k' : 't');
      if (q.opts.length < 2) {   // 배운 것이 모자라면 같은 단계의 다른 낱말로 채운다 (보기가 하나뿐이면 안 되므로)
        var f = q.type === 'meaning' ? 'k' : 't', seen = {}; q.opts.forEach(function (o) { seen[o[f]] = 1; });
        M.shuffle(stageOf(q.item).items).forEach(function (x) { if (q.opts.length < 3 && !seen[x[f]]) { seen[x[f]] = 1; q.opts.push(x); } });
        q.opts = M.shuffle(q.opts); M.lowOpts = (M.lowOpts || 0) + 1;
      }
    }
    var body = $('lBody');
    var h = '<div class="qt">' + TITLES[q.type] + '</div>';
    var it = q.item;
    if (q.type === 'teach') {
      var tip = it.lang === 'ja' && it.kana && window.TIPS[it.t];
      h = '<div class="qt"><span class="newtag">새로 배워요</span></div><div class="teach lang-' + it.lang + '">' +
        (it.e ? '<div class="bigE">' + it.e + '</div>' : '') +
        '<button class="tt' + sizeCls(it.t) + '" data-say="' + esc(it.say) + '">' + esc(it.t) + '</button>' +
        (it.r ? '<div class="tr">' + esc(it.r) + '</div>' : '') +
        '<div class="tk">' + esc(it.k) + '</div>' +
        '<div class="tsay">' + sayBtn(it.say, true) + '</div>' +
        (tip ? '<div class="tip">💡 ' + esc(tip) + '</div>' : '') + '</div>';
    } else if (q.type === 'steach') {
      var sn = q.sent, stg = stageOf(sn);
      h = '<div class="qt"><span class="newtag">문장을 배워요</span></div><div class="teach steach lang-' + sn.lang + '">' +
        '<div class="tk">' + esc(sn.k) + '</div>' +
        '<button class="tt sm" data-say="' + esc(sn.say) + '">' + esc(sn.t) + '</button>' +
        '<div class="gls">' + sn.w.map(function (w) { var g = gloss(w, sn.lang); return '<button class="gl" data-say="' + esc(stg.kana && sn.lang === 'zh' ? '' : w) + '"><b>' + esc(w) + '</b><small>' + esc(g || '·') + '</small></button>'; }).join('') + '</div>' +
        '<div class="tsay">' + sayBtn(sn.say, true) + '</div>' +
        (!stg.kana && window.ORDER_TIP ? '<div class="tip">💡 ' + esc(window.ORDER_TIP[sn.lang]) + '</div>' : '') + '</div>';
    } else if (q.type === 'meaning') {
      h += '<div class="qcard"><div class="face lang-' + it.lang + '"><div class="ft' + sizeCls(it.t) + '">' + esc(it.t) + '</div>' + (it.r && !it.kana ? '<div class="fr">' + esc(it.r) + '</div>' : '') + '</div>' + sayBtn(it.say) + '</div>';
      h += '<div class="opts">' + q.opts.map(function (o, i) { return '<button class="opt" data-i="' + i + '">' + (o.e ? '<span class="oe">' + o.e + '</span>' : '') + '<span>' + esc(o.k) + '</span></button>'; }).join('') + '</div>';
    } else if (q.type === 'target') {
      h += '<div class="qcard ko">' + (it.e ? '<div class="bigE">' + it.e + '</div>' : '') + '<div class="fk">' + esc(it.k) + '</div></div>';
      h += '<div class="opts">' + q.opts.map(function (o, i) { return '<button class="opt tgt lang-' + o.lang + '" data-i="' + i + '"><span class="ot">' + esc(o.t) + '</span>' + (o.lang === 'zh' && !o.kana ? '<small>' + esc(o.r.split(' · ')[0]) + '</small>' : jaKanji(o) ? '<small>' + esc(o.r) + '</small>' : '') + '</button>'; }).join('') + '</div>';
    } else if (q.type === 'listen') {
      h += '<div class="qcard listen">' + sayBtn(it.say, true) + '</div>';
      h += '<div class="opts">' + q.opts.map(function (o, i) { return '<button class="opt tgt lang-' + o.lang + '" data-i="' + i + '"><span class="ot">' + esc(jaKanji(o) ? o.r : o.t) + '</span>' + (jaKanji(o) ? '<small>' + esc(o.t) + '</small>' : '') + '</button>'; }).join('') + '</div>';
    } else if (q.type === 'match') {
      var left = M.shuffle(q.items), right = M.shuffle(q.items);
      h += '<div class="match"><div class="mcol">' + left.map(function (x) { return '<button class="mt lang-' + x.lang + '" data-side="l" data-k="' + esc(x.t) + '" data-say="' + esc(x.say) + '">' + esc(x.t) + (jaKanji(x) ? '<small class="mr">' + esc(x.r) + '</small>' : '') + '</button>'; }).join('') + '</div>' +
        '<div class="mcol">' + right.map(function (x) { return '<button class="mt" data-side="r" data-k="' + esc(x.t) + '">' + (x.e ? x.e + ' ' : '') + esc(x.k) + '</button>'; }).join('') + '</div></div>';
      q.left = q.items.length; q.sel = null;
    } else if (q.type === 'build') {
      h += '<div class="qcard ko small"><div class="fk">' + esc(q.sent.k) + '</div></div>';
      h += '<div class="slots lang-' + S.lang + '" id="bSlots"></div><div class="tiles lang-' + S.lang + '" id="bTiles">' + q.tiles.map(function (t) { return '<button class="tile" data-id="' + t.id + '">' + esc(t.w) + '</button>'; }).join('') + '</div>';
      q.chosen = [];
    } else if (q.type === 'speak') {
      h += '<div class="qcard"><div class="face lang-' + it.lang + '"><div class="ft' + sizeCls(it.t) + '">' + esc(it.t) + '</div>' + (it.r ? '<div class="fr">' + esc(it.r) + '</div>' : '') + '</div><div class="fk sm">' + esc(it.k) + '</div>' + sayBtn(it.say) + '</div>';
      h += '<div class="speak"><button class="mic" id="mic">🎤</button><div class="heard" id="heard">마이크를 누르고 말해 보세요</div></div>';
      q.fails = q.fails || 0;
    }
    body.innerHTML = h; body.scrollTop = 0;
    if (q.type === 'teach' || q.type === 'steach') foot('<button class="btn primary wide" id="tNext">알겠어요</button>');
    else if (q.opts) foot('<button class="btn primary wide" id="oCheck" disabled>확인</button>');
    else if (q.type === 'build') foot('<button class="btn primary wide" id="bCheck" disabled>확인</button>');
    else if (q.type === 'speak') foot('<button class="btn ghost wide" id="sSkip">지금은 말할 수 없어요</button>');
    else foot('');
    if (q.type === 'steach') setTimeout(function () { if (S && S.qs[S.i] === q) M.say(q.sent.say, S.lang); }, M.fast ? 0 : 250);
    var auto = q.type === 'teach' || q.type === 'listen' || (M.P.set.autoAudio && (q.type === 'meaning' || q.type === 'speak'));
    if (auto) setTimeout(function () { if (S && S.qs[S.i] === q) M.say(it.say, S.lang); }, M.fast ? 0 : 250);
  }

  // 정답·오답 처리
  function judge(ok, q, info, sayText) {
    if (S.answered) return; S.answered = true;
    if (ok) {
      S.combo++; S.best = Math.max(S.best, S.combo); S.correct++; S.done++;
      if (q.type === 'listen') S.listenOK++;
      if (q.type === 'speak') S.speakOK++;
      M.sfx('ok'); M.buzz(15);
    } else {
      S.combo = 0; S.mistakes++;
      M.sfx('bad'); M.buzz([40, 60, 40]);
      // 틀린 문제는 뒤에 다시 나온다
      if (!q.again) { var c = JSON.parse(JSON.stringify(q)); c.again = true; if (c.opts) c.opts = null; if (c.tiles) c.tiles = M.shuffle(q.tiles); S.qs.push(c); S.total++; }
      else S.done++;
    }
    if (q.item && !q.item.sent) M.srsHit(q.item, ok);
    bar();
    var cheer = ['좋아요!', '정답이에요!', '훌륭해요!', '딱 맞아요!', '잘했어요!'];
    foot('<div class="fb"><div class="fbt">' + (ok ? '🎉 ' + M.pick(cheer) + (S.combo >= 3 ? ' <b>' + S.combo + '연속</b>' : '') : '😢 아쉬워요') + '</div>' +
      (info ? '<div class="fbs">' + info + (sayText && M.ttsOK() ? ' <button class="say mini" data-say="' + esc(sayText) + '">🔊</button>' : '') + '</div>' : '') +
      '</div><button class="btn wide ' + (ok ? 'primary' : 'danger') + '" id="lNext">계속</button>', ok ? 'good' : 'bad');
    if (sayText) M.say(sayText, S.lang);
  }
  function answerInfo(it) {
    return (it.e ? it.e + ' ' : '') + '<b class="lang-' + it.lang + '">' + esc(it.t) + '</b>' + (it.r ? ' <small>' + esc(it.r) + '</small>' : '') + ' = ' + esc(it.k);
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
    if (t.closest('#lNext')) { next(); return; }
    if (t.closest('#tNext')) { var tq = S.qs[S.i]; S.done++; if (tq.item) M.srsHit(tq.item, true); else M.P.srs[sentKey(tq.sent)] = [1, Date.now()]; next(); return; }
    var q = S.qs[S.i];
    var mt = t.closest('.mt');
    if (mt && !mt.classList.contains('gone')) { matchTap(q, mt); return; }
    var sayB = t.closest('[data-say]');
    if (sayB) { M.say(sayB.dataset.say, S.lang, !!sayB.dataset.slow); return; }
    var opt = t.closest('.opt');
    if (opt && !S.answered) {   // 먼저 고르기만 한다 (외국어 보기는 소리를 들려준다)
      q.pick = +opt.dataset.i;
      Array.prototype.forEach.call(document.querySelectorAll('.opt'), function (b) { b.classList.toggle('pick', b === opt); });
      if (q.type !== 'meaning') M.say(q.opts[q.pick].say, S.lang); else M.sfx('tap');
      $('oCheck').disabled = false;
      return;
    }
    if (t.closest('#oCheck') && !S.answered && q.pick != null) {
      opt = document.querySelector('.opt[data-i="' + q.pick + '"]');
      var o = q.opts[q.pick], ok = o.t === q.item.t;
      opt.classList.remove('pick');
      opt.classList.add(ok ? 'right' : 'wrong');
      if (!ok) Array.prototype.forEach.call(document.querySelectorAll('.opt'), function (b) { if (q.opts[+b.dataset.i].t === q.item.t) b.classList.add('right'); });
      judge(ok, q, answerInfo(q.item), q.item.say);
      return;
    }
    var tile = t.closest('.tile');
    if (tile && !S.answered && q.type === 'build') { buildTap(q, tile); return; }
    if (t.closest('#bCheck') && !S.answered) {
      var got = q.chosen.map(function (id) { return tileOf(q, id).w; }).join('\u0001');
      var ok2 = got === q.sent.w.join('\u0001');
      judge(ok2, q, (ok2 ? '' : '정답: ') + '<b class="lang-' + S.lang + '">' + esc(q.sent.t) + '</b> = ' + esc(q.sent.k), q.sent.say);
      return;
    }
    if (t.closest('#mic')) { speak(q); return; }
    if (t.closest('#sSkip')) { S.done++; next(); return; }
  }
  function matchTap(q, b) {
    if (b.dataset.side === 'l') M.say(b.dataset.say, S.lang); else M.sfx('tap');
    if (!q.sel || q.sel.dataset.side === b.dataset.side) {
      if (q.sel) q.sel.classList.remove('sel');
      q.sel = b; b.classList.add('sel'); return;
    }
    var a = q.sel; q.sel = null; a.classList.remove('sel');
    if (a.dataset.k === b.dataset.k) {
      a.classList.add('gone'); b.classList.add('gone'); q.left--; M.sfx('pop');
      if (q.left === 0) {
        q.items.forEach(function (it) { M.srsHit(it, true); });
        setTimeout(function () { judge(true, { type: 'match' }, '모두 맞췄어요!'); }, M.fast ? 0 : 250);
      }
    } else {
      a.classList.add('shakeX'); b.classList.add('shakeX'); M.sfx('bad'); M.buzz(40);
      S.mistakes++; S.combo = 0; bar();
      setTimeout(function () { a.classList.remove('shakeX'); b.classList.remove('shakeX'); }, 400);
    }
  }
  function tileOf(q, id) { for (var i = 0; i < q.tiles.length; i++) if (q.tiles[i].id === id) return q.tiles[i]; return { w: '' }; }
  function buildTap(q, tile) {
    var id = +tile.dataset.id;
    var inSlot = tile.parentNode.id === 'bSlots';
    if (inSlot) { q.chosen.splice(q.chosen.indexOf(id), 1); $('bTiles').querySelector('[data-id="' + id + '"]').classList.remove('used'); tile.parentNode.removeChild(tile); M.sfx('tap'); }
    else {
      if (tile.classList.contains('used')) return;
      q.chosen.push(id); tile.classList.add('used');
      var w = tileOf(q, id).w;
      var c = document.createElement('button'); c.className = 'tile'; c.dataset.id = id; c.textContent = w;
      $('bSlots').appendChild(c);
      if (q.mute) M.sfx('tap'); else M.say(w, S.lang);
    }
    $('bCheck').disabled = q.chosen.length === 0;
  }
  function speak(q) {
    var mic = $('mic'), heard = $('heard');
    if (mic.classList.contains('on')) { try { M._rec.stop(); } catch (e) {} return; }
    mic.classList.add('on'); heard.textContent = '듣고 있어요… 말해 보세요';
    var targets = [q.item.t, q.item.say].concat(q.item.alt || []);
    var skipBtn = function () { foot('<button class="btn ghost wide" id="sSkip">넘어가기</button>'); };
    M.listen(S.lang).then(function (res) {
      mic.classList.remove('on');
      if (!S || S.qs[S.i] !== q) return;
      if (!res.length) { heard.textContent = '소리가 들리지 않았어요. 다시 눌러 보세요'; return; }
      var score = M.similar(res, targets, S.lang);
      heard.innerHTML = '들린 말: <b>' + esc(res[0]) + '</b>';
      if (score >= 0.6) { M.P.stats.speak++; judge(true, q, '발음이 좋아요! ' + Math.round(score * 100) + '점'); }
      else {
        q.fails++;
        heard.innerHTML += '<br>조금 다르게 들렸어요. 🔊로 다시 듣고 한 번 더 해 볼까요?';
        M.sfx('bad');
        if (q.fails >= 2) skipBtn();
      }
    }).catch(function (err) {
      mic.classList.remove('on');
      var m = String(err && err.message);
      heard.textContent = m === 'not-allowed' || m === 'service-not-allowed' ? '마이크 사용을 허용해야 말하기 연습을 할 수 있어요.' : '음성 인식이 잘 안 됐어요. 다시 눌러 보세요.';
      q.fails++;
      if (q.fails >= 2) skipBtn();
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
    M.sfx('win');
    $('lBar').style.width = '100%'; $('lCombo').textContent = '';
    $('lBody').innerHTML = '<div class="result">' +
      '<img class="rpet popin" src="' + M.petImg('happy') + '" alt="">' +
      '<h2>' + (S.review ? '복습 완료!' : first ? '새 단계 완료!' : '레슨 완료!') + '</h2>' +
      '<div class="stars">' + [1, 2, 3].map(function (i) { return '<span class="st' + (i <= stars ? ' on' : '') + '" style="animation-delay:' + (i * 0.18) + 's">★</span>'; }).join('') + '</div>' +
      '<div class="rstats"><div><b>' + acc + '%</b><small>정확도</small></div><div><b>' + S.best + '</b><small>최고 연속</small></div><div><b>' + mins + '분</b><small>걸린 시간</small></div></div>' +
      '<div class="rws big">' + M.rewardHtml(o) + '</div>' +
      (bonus ? '<p class="hint">' + esc(M.j(P.petName, '이', '')) + ' 보너스로 물방울 +' + bonus + '</p>' : '') +
      (grew ? '<p class="streakMsg">🔥 연속 ' + P.streak + '일째 공부했어요!</p>' : '') +
      (goalHit ? '<p class="streakMsg">🎯 오늘 목표를 달성했어요!</p>' : '') +
      '</div>';
    var nextSt = st ? window.LANGS[lang].stages[st.idx + 1] : null;
    foot(nextSt ? '<div class="row2 fin"><button class="btn" id="lDone">지도로</button><button class="btn primary" id="lGo">다음 단계 ▶<br><small>' + esc(nextSt.title) + '</small></button></div>'
      : '<button class="btn primary wide" id="lDone">계속하기</button>');
    var done = S; S = null;
    var after = function () {
      if (goalHit && M.queuePopup) M.queuePopup(function () { return M.openChest(M.rollChest(false), '오늘 목표 달성 상자'); });
      if (M.afterLesson) M.afterLesson(done, first);
    };
    $('lDone').addEventListener('click', function () { closeLesson(); after(); });
    if (nextSt) $('lGo').addEventListener('click', function () { after(); M.startLesson(lang, nextSt); });
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

  // 자동 점검용: 지금 문제를 맞게(또는 틀리게) 푼다
  M.autoSolve = function (wrong) {
    if (!S) return 'none';
    var q = S.qs[S.i];
    if (S.answered) { $('lNext').click(); return 'next'; }
    if (q.type === 'teach' || q.type === 'steach') { $('tNext').click(); return q.type; }
    if (q.type === 'meaning' || q.type === 'target' || q.type === 'listen') {
      var idx = q.opts.findIndex(function (o) { return wrong ? o.t !== q.item.t : o.t === q.item.t; });
      if (idx < 0) idx = q.opts.findIndex(function (o) { return o.t === q.item.t; });
      document.querySelector('.opt[data-i="' + idx + '"]').click();
      $('oCheck').click();
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
