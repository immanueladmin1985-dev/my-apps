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
    var same = function (x) { return field === 't' && x.k === it.k; };   // 답이 같은 다른 문제(3+4, 5+2)는 보기에 넣지 않는다
    var add = function (list) { M.shuffle(list).forEach(function (x) { if (out.length < 4 && !seen[x[field]] && !same(x) && taught(x)) { seen[x[field]] = 1; out.push(x); } }); };
    add(st.items);
    add(pool(it.lang, it.kana).filter(function (x) { var s2 = stageOf(x); return s2 && s2.idx <= st.idx; }));
    // 처음 몇 단계는 배운 낱말이 적어서 보기가 2개뿐일 수 있다. 같은 단계의 아직 안 배운 낱말로 3개까지 채운다
    if (out.length < 3) M.shuffle(st.items).forEach(function (x) { if (out.length < 3 && !seen[x[field]] && !same(x)) { seen[x[field]] = 1; out.push(x); } });
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
  // 읽기 글: 문장마다 눌러서 듣고, 뜻은 눌러서 펼친다
  function readHtml(st, open) {
    return '<div class="rdcard lang-' + st.lang + '"><h3>' + esc(st.title) + '</h3>' + st.lines.map(function (l) {
      return '<p class="rdl"><button class="rds" data-who="N" data-say="' + esc(l.t) + '">' + M.fz(l.t, st.lang) + (l.r ? '<span class="dr">' + esc(l.r) + '</span>' : '') + '</button><small class="rdk' + (open ? '' : ' hid') + '">' + esc(l.k) + '</small></p>';
    }).join('') + (open ? '' : '<button class="say mini rdshow" data-rdk="1">뜻 보기</button>') + '</div>';
  }
  function xformQ(x, lang) {
    var alts = (x.alts || []).map(function (a) { return { t: a.t, say: a.t, k: a.k, r: a.r, lang: lang, ok: true }; });
    var opts = [x.item].concat(alts, x.w.slice(0, 3 - alts.length).map(function (w) { return { t: w, say: w, k: '', lang: lang }; }));
    return { type: 'xform', item: x.item, p: x.p, di: x.di, pw: x.pw, aw: x.aw, opts: M.shuffle(opts) };
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
    if (stage && stage.read) {
      // 읽기: 글 카드 → 내용 문제 (글은 문제 위에 접어서 다시 볼 수 있다)
      qs.push({ type: 'readcard', stage: stage });
      stage.rq.forEach(function (r) {
        var item = { t: r.a, k: '', lang: 'ko', say: '', sid: stage.id, sent: true };
        qs.push({ type: 'xform', read: stage.id, item: item, p: r.q, opts: M.shuffle([item].concat(r.w.map(function (w) { return { t: w, k: '', lang: 'ko', say: '' }; }))) });
      });
      return qs;
    }
    if (stage && stage.conv) {
      // 회화: 대화 카드 → 알맞은 대답 고르기 → 듣고 대답 고르기
      qs.push({ type: 'dialog', stage: stage });
      if (stage.rule) qs.push({ type: 'rule', stage: stage });   // 첫걸음 회화: 대화 다음에 학습 포인트
      // 역할극: 앞 대화가 채팅처럼 쌓이고, 내 차례에 알맞은 대사를 고른다
      // 나는 늘 B 역할을 맡는다(문제마다 역할이 바뀌면 헷갈리므로). A 쪽 대답은 듣고 고르기로 낸다
      var mine = stage.xf.filter(function (x) { return stage.dlg[x.di].who === 'B'; }), other = stage.xf.filter(function (x) { return stage.dlg[x.di].who !== 'B'; });
      mine.forEach(function (x) { var q = xformQ(x, lang); q.sub = x.pk; q.pr = x.pr; q.chat = stage.dlg.slice(0, x.di).map(function (d, i) { return { i: i, t: d.t, k: d.k, r: d.r, me: d.who === 'B' }; }); qs.push(q); });
      other.concat(M.shuffle(mine).slice(0, Math.max(0, 3 - other.length))).forEach(function (x) { var q = xformQ(x, lang); q.audio = x.p; qs.push(q); });
      // 말로 대답하기: 마이크가 되면 내 대사 두 개를 직접 소리 내어 말한다 (정답 대사나 다른 맞는 대사 어느 쪽이든 인정)
      if (canSpeak && !stage.nospeak) M.shuffle(mine).slice(0, 2).forEach(function (x) {
        var it = { t: x.item.t, say: x.item.say || x.item.t, k: x.item.k, r: x.item.r || '', lang: lang, alt: (x.alts || []).map(function (a) { return a.t; }) };
        qs.push({ type: 'speak', item: it, talk: true, chat: stage.dlg.slice(0, x.di).map(function (d, i) { return { i: i, t: d.t, k: d.k, r: d.r, me: d.who === 'B' }; }) });
      });
      return qs;
    }
    if (stage && stage.ear === 2) {
      // L/R 같은 짝 소리: 짝 비교 카드 → 둘 중 무엇인지 듣고 고르기를 여러 번
      var prs = [];
      for (var pi = 0; pi + 1 < stage.items.length; pi += 2) prs.push([stage.items[pi], stage.items[pi + 1]]);
      prs.forEach(function (pr, k) {
        qs.push({ type: 'pairteach', pair: pr, item: pr[0] });
        [0, 1, 0, 1].forEach(function () { var it = M.pick(pr); qs.push({ type: 'listen', item: it, opts: M.shuffle(pr.slice()), fixed: true }); });
      });
      for (var r = 0; r < 8; r++) { var pr2 = M.pick(prs), it2 = M.pick(pr2); qs.push({ type: 'listen', item: it2, opts: M.shuffle(pr2.slice()), fixed: true }); }
      qs.push({ type: 'match', items: M.shuffle(stage.items).slice(0, 6) });
      return qs;
    }
    if (stage && stage.gram) {
      // 문법: 규칙 카드 → 바꿔 쓰기 → 예문 카드·문장 만들기
      qs.push({ type: 'rule', stage: stage });
      M.shuffle(stage.xf).forEach(function (x) { qs.push(xformQ(x, lang)); });
      M.shuffle(stage.sents).forEach(function (s) { var pr = sentPair(s, lang); qs = qs.concat(Array.isArray(pr) ? pr : [pr]); });
      return qs;
    }
    if (stage && stage.drill) {
      // 학습지(아이 수학): 알아 두기 카드 → 10문제 (대부분 답 고르기, 가끔 거꾸로) → 짝 맞추기
      if (stage.tip) qs.push({ type: 'rule', stage: stage });
      var di = M.shuffle(stage.items), ten = [];
      while (ten.length < 10 && di.length) ten = ten.concat(M.shuffle(di));
      ten.slice(0, 10).forEach(function (it, k) { qs.push(pickQ(it, k === 4 || k === 8 ? 'target' : 'meaning')); });
      var dk = {}, mt = M.shuffle(stage.items).filter(function (x) { if (dk[x.k]) return false; dk[x.k] = 1; return true; }).slice(0, 5);
      if (mt.length >= 4) qs.splice(Math.min(qs.length, 7), 0, { type: 'match', items: mt });
      return qs;
    }
    if (stage && stage.tip && !stage.gram) qs.push({ type: 'rule', stage: stage });   // 아이 과목: 알아 두기 카드
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
      var due2 = M.shuffle(M.wrongMode ? M.wrongItems(lang) : M.dueItems(lang));
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
  // 마지막으로 풀 때 틀린 낱말 (간격 반복 단계가 0인 것)
  M.wrongItems = function (lang) { return M.learnedItems(lang).filter(function (it) { var r = M.P.srs[M.itemKey(it)]; return r && r[0] === 0; }); };
  M.startLesson = function (lang, stage, wrong) {
    M.wrongMode = !!wrong;
    if (stage) { M.P.last = M.P.last || {}; M.P.last[lang] = stage.id; M.P.ui.lv = M.P.ui.lv || {}; M.P.ui.lv[lang] = window.LANGS[lang].units[stage.unit].level || 'base'; M.save(); }
    var qs = M.buildLesson(lang, stage);
    S = { lang: lang, stage: stage, review: !stage, qs: qs, total: qs.length, i: 0, done: 0, mistakes: 0, combo: 0, best: 0, listenOK: 0, speakOK: 0, correct: 0, answered: false, t0: Date.now() };
    $('lesson').classList.remove('hidden');
    document.body.classList.add('in-lesson');
    if (M.wake) M.wake.on();
    show();
  };
  M.lessonState = function () { return S; };
  M.lessonShow = function () { show(); };   // 자동 점검용

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
  // 한자 낱말 하나: 읽기 전체를 위에 단다 (食べる → たべる)
  function rubyW(it) { var r = String(it.r).split(' · ')[0]; if (M.P.set.furi === false) return esc(it.t) + '<small class="fr2">' + esc(r) + '</small>'; return '<ruby>' + esc(it.t) + '<rt>' + esc(r) + '</rt></ruby>'; }
  function foot(html, cls) { var f = $('lFoot'); f.className = 'lfoot' + (cls ? ' ' + cls : ''); f.innerHTML = html; }
  // 혀 위치 단면도 (오른쪽을 보는 옆얼굴). L: 혀끝이 윗잇몸에 닿음, R: 혀끝을 말아 어디에도 닿지 않음 + 입술 동그랗게
  function mouthSvg(kind) {
    var R = kind === 'R';
    var tongue = R ? 'M36 128 Q42 96 78 84 Q100 77 112 74 Q116 64 124 66 Q128 70 122 76 Q120 84 132 92 Q146 100 149 128 Z'
      : 'M36 128 Q42 100 80 92 Q116 86 132 78 Q138 70 143 67 Q149 70 147 84 Q146 104 149 128 Z';
    var lips = R ? '<path d="M150 58 Q176 60 174 74 Q172 80 156 80" fill="#f4a7a7" stroke="#c46b6b" stroke-width="2"/><path d="M156 88 Q172 88 174 96 Q174 108 150 110" fill="#f4a7a7" stroke="#c46b6b" stroke-width="2"/>'
      : '<path d="M150 60 Q166 62 166 74 Q160 79 152 79" fill="#f4a7a7" stroke="#c46b6b" stroke-width="2"/><path d="M152 89 Q162 90 165 97 Q162 108 150 108" fill="#f4a7a7" stroke="#c46b6b" stroke-width="2"/>';
    return '<svg class="mouth" viewBox="0 0 190 140" role="img" aria-label="' + (R ? 'R 혀 위치' : 'L 혀 위치') + '">' +
      '<path d="M20 40 Q60 20 130 34 Q150 40 152 58 L150 112 Q140 132 100 134 L20 134 Z" fill="#fde6d6" stroke="#d9a98c" stroke-width="2"/>' +
      '<path d="M146 66 Q140 56 120 54 Q80 50 30 62" fill="none" stroke="#b07a62" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="140" y="64" width="9" height="13" rx="2" fill="#fff" stroke="#bbb"/><rect x="140" y="90" width="9" height="12" rx="2" fill="#fff" stroke="#bbb"/>' +
      lips + '<path d="' + tongue + '" fill="#f08a9a" stroke="#c4566a" stroke-width="2"/>' +
      (R ? '<circle cx="121" cy="63" r="7" fill="none" stroke="#e5484d" stroke-width="2" stroke-dasharray="3 2"/>' : '<circle cx="141" cy="66" r="6" fill="none" stroke="#2a9d6f" stroke-width="2.5"/>') +
      '</svg><span class="mcap">' + (R ? '혀끝을 뒤로 말고, 어디에도 닿지 않아요 · 입술은 “우”' : '혀끝이 윗니 뒤 잇몸에 딱 닿아요') + '</span>';
  }
  var TITLES = { pairteach: '두 소리를 비교해요', dialog: '대화를 들어 봐요', rule: '문법을 배워요', xform: '알맞게 바꿔 보세요', steach: '문장을 배워요', teach: '새로 배워요', meaning: '뜻을 골라 보세요', target: '알맞은 말을 골라 보세요', listen: '잘 듣고 골라 보세요', match: '짝을 맞춰 보세요', build: '순서대로 눌러 만들어 보세요', speak: '소리 내어 따라 말해 보세요' };

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
    var kidT = { math: { meaning: '답을 골라 보세요', target: '이 답이 나오는 것을 골라 보세요', match: '문제와 답을 짝지어 보세요' }, kor: { meaning: '알맞은 것을 골라 보세요', target: '알맞은 낱말을 골라 보세요', listen: '잘 듣고 낱말을 골라 보세요' }, ken: { meaning: '뜻을 골라 보세요', target: '알맞은 영어를 골라 보세요' } }[S.lang] || {};
    var h = '<div class="qt">' + (kidT[q.type] || TITLES[q.type]) + '</div>';
    var it = q.item;
    if (q.type === 'teach') {
      var tip = it.lang === 'ja' && it.kana && window.TIPS[it.t];
      h = '<div class="qt"><span class="newtag">새로 배워요</span></div><div class="teach lang-' + it.lang + '">' +
        (it.e ? '<div class="bigE">' + it.e + '</div>' : '') +
        '<button class="tt' + sizeCls(it.t) + '" data-say="' + esc(it.say) + '">' + (jaKanji(it) ? rubyW(it) : esc(it.t)) + '</button>' +
        (it.r && !jaKanji(it) ? '<div class="tr">' + esc(it.r) + '</div>' : jaKanji(it) && it.r.indexOf(' · ') > 0 ? '<div class="tr">' + esc(it.r) + '</div>' : '') +
        '<div class="tk">' + esc(it.k) + '</div>' +
        '<div class="tsay">' + sayBtn(it.say, true) + '</div>' +
        (tip ? '<div class="tip">💡 ' + esc(tip) + '</div>' : '') + '</div>';
    } else if (q.type === 'pairteach') {
      var pa = q.pair;
      h = '<div class="qt"><span class="newtag">두 소리를 비교해요</span></div><div class="pairt lang-' + pa[0].lang + '">' + pa.map(function (x) {
        return '<button class="pw" data-say="' + esc(x.say) + '">' + (x.e ? '<span class="bigE">' + x.e + '</span>' : '') + '<b>' + esc(x.t) + '</b><small>' + esc(x.k) + '</small><em>' + esc(x.r) + '</em>' + (/^\[(R|L)\]/.test(x.r) ? '<span class="mbox">' + mouthSvg(x.r.charAt(1)) + '</span>' : '') + '</button>';
      }).join('') + '</div><div class="tsay"><button class="btn" data-pairplay="1">▶ 번갈아 듣기</button><button class="btn ghost" data-pairplay="slow">🐢 천천히</button></div>';
    } else if (q.type === 'dialog') {
      var dg = q.stage;
      h = '<div class="qt"><span class="newtag">대화를 들어 봐요</span> <button class="say mini" data-sayall="1">▶ 전체 듣기</button></div><div class="dlg lang-' + dg.lang + '"><h3>' + esc(dg.title) + '</h3><p class="dlgme">오른쪽 초록 말풍선이 내 역할이에요. 잘 듣고 내 대사를 익혀 두세요</p>' +
        dg.dlg.map(function (d, i) { return '<button class="dl ' + (d.who === 'A' ? 'a' : 'b') + '" data-say="' + esc(d.t) + '" data-who="' + d.who + '" data-dl="' + i + '"><b>' + M.fz(d.t, dg.lang) + '</b>' + (d.r ? '<span class="dr">' + esc(d.r) + '</span>' : '') + '<small>' + esc(d.k) + '</small></button>' +
          d.alts.map(function (a) { return '<button class="dl b alt" data-say="' + esc(a.t) + '" data-who="' + d.who + '"><em>또는</em><b>' + M.fz(a.t, dg.lang) + '</b>' + (a.r ? '<span class="dr">' + esc(a.r) + '</span>' : '') + '<small>' + esc(a.k) + '</small></button>'; }).join(''); }).join('') + '</div>';
    } else if (q.type === 'readcard') {
      var rs = q.stage;
      h = '<div class="qt"><span class="newtag">글을 읽어 봐요</span> <button class="say mini" data-readall="1">▶ 전체 듣기</button></div>' + readHtml(rs, true);
    } else if (q.type === 'rule' && !q.stage.xf && !q.stage.conv) {
      h = '<div class="qt"><span class="newtag">알아 두기</span></div><div class="rule kidtip lang-' + q.stage.lang + '"><h3>' + esc(q.stage.title) + '</h3>' + (q.stage.std ? '<p class="kstd">📘 교과서 연결 ' + esc(q.stage.std) + '</p>' : '') + '<p>💡 ' + esc(q.stage.tip || '') + '</p></div>';
    } else if (q.type === 'rule') {
      var g = q.stage;
      h = '<div class="qt"><span class="newtag">문법을 배워요</span></div><div class="rule lang-' + g.lang + '"><h3>' + esc(g.title) + '</h3>' + g.rule +
        (g.conv ? '' : '<div class="rex">') + (g.conv ? [] : g.xf).slice(0, 3).map(function (x) { return '<button class="rx" data-say="' + esc(x.item.say) + '"><span>' + M.fz(x.p, g.lang) + '</span><b>' + M.fz(x.item.t, g.lang) + '</b><small>' + esc(x.item.k) + '</small></button>'; }).join('') + (g.conv ? '' : '</div>') + '</div>';
    } else if (q.type === 'xform') {
      if (q.read) { var rst = window.LANGS[S.lang].stages.filter(function (x) { return x.id === q.read; })[0]; h = '<details class="rdfold" open><summary>📖 글 (눌러서 접기)</summary>' + readHtml(rst, false) + '</details><div class="qcard ko small rdq"><div class="fk">' + esc(q.p) + '</div></div>'; }
      else if (q.audio) h = '<div class="qt">잘 듣고 알맞은 대답을 골라 보세요</div><div class="qcard listen">' + sayBtn(q.audio, true) + '</div>';
      else if (q.chat) h = '<div class="qt">대화를 이어 가 보세요 <small class="sub">내 차례예요</small></div><div class="chat lang-' + q.item.lang + '" id="chatBox">' + q.chat.map(function (d) { d = (S.alt && S.alt[d.i]) || d; return '<button class="cb ' + (d.me ? 'me' : 'you') + '" data-say="' + esc(d.t) + '" data-who="' + (d.me ? 'B' : 'A') + '"><b>' + M.fz(d.t, q.item.lang) + '</b>' + (d.r ? '<span class="dr">' + esc(d.r) + '</span>' : '') + '<small>' + esc(d.k) + '</small></button>'; }).join('') + '<div class="cb me wait">…</div></div>';
      else if (q.sub != null) h = '<div class="qt">알맞은 대답을 골라 보세요</div><div class="qcard"><div class="face lang-' + q.item.lang + '"><div class="ft lg">' + M.fz(q.p, q.item.lang) + '</div>' + (q.pr ? '<div class="fr">' + esc(q.pr) + '</div>' : '') + '</div><div class="fk sm">' + esc(q.sub) + '</div>' + sayBtn(q.p) + '</div>';
      else h += '<div class="qcard ko"><div class="fk lang-' + q.item.lang + '">' + M.fz(q.p, q.item.lang) + '</div><div class="fk sm">' + esc(q.item.k) + '</div></div>';
      h += '<div class="opts xf">' + q.opts.map(function (o, i) { return '<button class="opt tgt lang-' + o.lang + '" data-i="' + i + '"><span class="ot">' + M.fz(o.t, o.lang) + '</span></button>'; }).join('') + '</div>';
    } else if (q.type === 'steach') {
      var sn = q.sent, stg = stageOf(sn);
      h = '<div class="qt"><span class="newtag">문장을 배워요</span></div><div class="teach steach lang-' + sn.lang + '">' +
        '<div class="tk">' + esc(sn.k) + '</div>' +
        '<button class="tt sm" data-say="' + esc(sn.say) + '">' + M.fz(sn.t, sn.lang) + '</button>' +
        '<div class="gls">' + sn.w.map(function (w, wi) { var g = (sn.g && sn.g[wi]) || gloss(w, sn.lang); return '<button class="gl" data-say="' + esc(stg.kana && sn.lang === 'zh' ? '' : w) + '"><b>' + M.fz(w, sn.lang) + '</b><small>' + esc(g || '·') + '</small></button>'; }).join('') + '</div>' +
        '<div class="tsay">' + sayBtn(sn.say, true) + '</div>' +
        (!stg.kana && window.ORDER_TIP && window.ORDER_TIP[sn.lang] ? '<div class="tip">💡 ' + esc(window.ORDER_TIP[sn.lang]) + '</div>' : '') + '</div>';
    } else if (q.type === 'meaning') {
      h += '<div class="qcard"><div class="face lang-' + it.lang + '"><div class="ft' + sizeCls(it.t) + '">' + (jaKanji(it) ? rubyW(it) : esc(it.t)) + '</div>' + (it.r && !it.kana && !jaKanji(it) ? '<div class="fr">' + esc(it.r) + '</div>' : '') + '</div>' + sayBtn(it.say) + '</div>';
      h += '<div class="opts">' + q.opts.map(function (o, i) { return '<button class="opt" data-i="' + i + '">' + (o.e ? '<span class="oe">' + o.e + '</span>' : '') + '<span>' + esc(o.k) + '</span></button>'; }).join('') + '</div>';
    } else if (q.type === 'target') {
      h += '<div class="qcard ko">' + (it.e ? '<div class="bigE">' + it.e + '</div>' : '') + '<div class="fk">' + esc(it.k) + '</div></div>';
      h += '<div class="opts">' + q.opts.map(function (o, i) { return '<button class="opt tgt lang-' + o.lang + '" data-i="' + i + '"><span class="ot">' + (jaKanji(o) ? rubyW(o) : esc(o.t)) + '</span>' + (o.lang === 'zh' && !o.kana ? '<small>' + esc(o.r.split(' · ')[0]) + '</small>' : '') + '</button>'; }).join('') + '</div>';
    } else if (q.type === 'listen') {
      h += '<div class="qcard listen">' + sayBtn(it.say, true) + '</div>';
      h += '<div class="opts">' + q.opts.map(function (o, i) { return '<button class="opt tgt lang-' + o.lang + '" data-i="' + i + '"><span class="ot">' + esc(jaKanji(o) ? o.r : o.t) + '</span>' + (jaKanji(o) ? '<small>' + esc(o.t) + '</small>' : '') + '</button>'; }).join('') + '</div>';
    } else if (q.type === 'match') {
      var left = M.shuffle(q.items), right = M.shuffle(q.items);
      h += '<div class="match"><div class="mcol">' + left.map(function (x) { return '<button class="mt lang-' + x.lang + '" data-side="l" data-k="' + esc(x.t) + '" data-say="' + esc(x.say) + '">' + (jaKanji(x) ? rubyW(x) : esc(x.t)) + '</button>'; }).join('') + '</div>' +
        '<div class="mcol">' + right.map(function (x) { return '<button class="mt" data-side="r" data-k="' + esc(x.t) + '">' + (x.e ? x.e + ' ' : '') + esc(x.k) + '</button>'; }).join('') + '</div></div>';
      q.left = q.items.length; q.sel = null;
    } else if (q.type === 'build') {
      h += '<div class="qcard ko small"><div class="fk">' + esc(q.sent.k) + '</div></div>';
      h += '<div class="slots lang-' + S.lang + '" id="bSlots"></div><div class="tiles lang-' + S.lang + '" id="bTiles">' + q.tiles.map(function (t) { return '<button class="tile" data-id="' + t.id + '">' + M.fz(t.w, S.lang) + '</button>'; }).join('') + '</div>';
      q.chosen = [];
    } else if (q.type === 'speak' && q.talk) {
      // 회화 말하기: 앞 대화를 채팅으로 보여 주고, 내 대사는 뜻만 보여 준다 (힌트를 누르면 문장이 보인다)
      h = '<div class="qt">말로 대답해 보세요 <small class="sub">내 차례예요 🎤</small></div><div class="chat lang-' + it.lang + '" id="chatBox">' + q.chat.slice(-4).map(function (d) { return '<button class="cb ' + (d.me ? 'me' : 'you') + '" data-say="' + esc(d.t) + '" data-who="' + (d.me ? 'B' : 'A') + '"><b>' + M.fz(d.t, it.lang) + '</b>' + (d.r ? '<span class="dr">' + esc(d.r) + '</span>' : '') + '<small>' + esc(d.k) + '</small></button>'; }).join('') +
        '<div class="cb me wait talkme"><small>하고 싶은 말</small><b class="ko">' + esc(it.k) + '</b><span class="talkhint hid" id="talkHint">' + M.fz(it.t, it.lang) + (it.r ? '<span class="dr">' + esc(it.r) + '</span>' : '') + '</span></div></div>' +
        '<div class="speak"><button class="mic" id="mic">🎤</button><div class="heard" id="heard">마이크를 누르고 대답해 보세요</div><button class="btn ghost talkshow" id="talkShow">💡 문장 보기</button></div>';
      q.fails = q.fails || 0;
    } else if (q.type === 'speak') {
      h += '<div class="qcard"><div class="face lang-' + it.lang + '"><div class="ft' + sizeCls(it.t) + '">' + (jaKanji(it) ? rubyW(it) : esc(it.t)) + '</div>' + (it.r && !jaKanji(it) ? '<div class="fr">' + esc(it.r) + '</div>' : '') + '</div><div class="fk sm">' + esc(it.k) + '</div>' + sayBtn(it.say) + '</div>';
      h += '<div class="speak"><button class="mic" id="mic">🎤</button><div class="heard" id="heard">마이크를 누르고 말해 보세요</div></div>';
      q.fails = q.fails || 0;
    }
    body.innerHTML = h; body.scrollTop = 0;
    Array.prototype.forEach.call(body.querySelectorAll('.opts:not(.xf)'), function (o) {   // 긴 보기는 한 줄에 하나씩
      var long = Array.prototype.some.call(o.querySelectorAll('.opt'), function (b) { var t = (b.querySelector('.ot') || b).textContent.trim(), cjk = /[\u3040-\u30ff\u4e00-\u9fff]/.test(t); return t.length > (cjk ? 7 : 16); });
      if (long) o.classList.add('one');
    });
    var cbx = $('chatBox'); if (cbx) cbx.scrollTop = cbx.scrollHeight;
    if (q.type === 'teach' || q.type === 'steach' || q.type === 'rule' || q.type === 'dialog' || q.type === 'pairteach' || q.type === 'readcard') foot('<button class="btn primary wide" id="tNext">알겠어요</button>');
    else if (q.opts) foot('<button class="btn primary wide" id="oCheck" disabled>확인</button>');
    else if (q.type === 'build') foot('<button class="btn primary wide" id="bCheck" disabled>확인</button>');
    else if (q.type === 'speak') foot('<button class="btn ghost wide" id="sSkip">지금은 말할 수 없어요</button>');
    else foot('');
    if (q.type === 'steach') setTimeout(function () { if (S && S.qs[S.i] === q) M.say(q.sent.say, S.lang); }, M.fast ? 0 : 250);
    if (q.type === 'rule' && q.stage.tip && M.P.kid) setTimeout(function () { if (S && S.qs[S.i] === q) M.say(q.stage.tip, 'kor'); }, M.fast ? 0 : 300);   // 아이 모드: 알아 두기를 소리 내어 읽어 준다
    var auto = !q.talk && (q.type === 'teach' || q.type === 'listen' || (M.P.set.autoAudio && (q.type === 'meaning' || q.type === 'speak')));
    if ($('talkShow')) $('talkShow').onclick = function () { var th = $('talkHint'); if (th) th.classList.remove('hid'); this.remove(); q.hinted = true; M.say(it.say, it.lang, false, false, 'B'); };
    if (q.talk && q.chat.length) { var lastYou = q.chat[q.chat.length - 1]; if (!lastYou.me) setTimeout(function () { if (S && S.qs[S.i] === q) M.say(lastYou.t, S.lang, false, false, 'A'); }, M.fast ? 0 : 250); }
    var convSay = q.type === 'xform' && (q.audio || q.sub != null) ? (q.audio || q.p) : null;   // 회화: 상대 말을 읽어 준다
    if (convSay) setTimeout(function () { if (S && S.qs[S.i] === q) M.say(convSay, S.lang, false, false, q.pw); }, M.fast ? 0 : 250);
    else if (auto) setTimeout(function () { if (S && S.qs[S.i] === q) M.say(it.say, S.lang); }, M.fast ? 0 : 250);
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
      if (!q.again) { var c = JSON.parse(JSON.stringify(q)); c.again = true; if (c.opts && c.type !== 'xform' && !c.fixed) c.opts = null; else if (c.opts) c.opts = M.shuffle(q.opts); if (c.tiles) c.tiles = M.shuffle(q.tiles); S.qs.push(c); S.total++; }
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
    if (t.closest('#tNext')) { var tq = S.qs[S.i]; S.done++; if (tq.type === 'rule' || tq.type === 'dialog' || tq.type === 'readcard') { next(); return; } if (tq.pair) { tq.pair.forEach(function (x) { M.srsHit(x, true); }); next(); return; } if (tq.item) M.srsHit(tq.item, true); else M.P.srs[sentKey(tq.sent)] = [1, Date.now()]; next(); return; }
    var q = S.qs[S.i];
    var mt = t.closest('.mt');
    if (mt && !mt.classList.contains('gone')) { matchTap(q, mt); return; }
    var pp = t.closest('[data-pairplay]');
    if (pp) { var w2 = q.pair.map(function (x) { return x.say; }); if (pp.dataset.pairplay === 'slow') { M.say(w2[0], S.lang, true); setTimeout(function () { M.say(w2[1], S.lang, true); }, 1400); } else M.sayList(w2.concat(w2), S.lang); return; }
    if (t.closest('[data-readall]')) { M.sayList(q.stage.lines.map(function (d) { return d.t; }), S.lang, q.stage.lines.map(function () { return 'N'; })); return; }
    if (t.closest('[data-rdk]')) { var rc = t.closest('.rdcard'); Array.prototype.forEach.call(rc.querySelectorAll('.rdk'), function (k) { k.classList.toggle('hid'); }); return; }
    if (t.closest('[data-sayall]')) { M.sayList(q.stage.dlg.map(function (d) { return d.t; }), S.lang, q.stage.dlg.map(function (d) { return d.who; })); return; }
    var sayB = t.closest('[data-say]');
    if (sayB) { M.say(sayB.dataset.say, S.lang, !!sayB.dataset.slow, false, sayB.dataset.who || (q.pw && q.audio && sayB.dataset.say === q.audio ? q.pw : q.pw && sayB.dataset.say === q.p ? q.pw : undefined)); return; }
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
      var o = q.opts[q.pick], ok = o.t === q.item.t || !!o.ok;
      opt.classList.remove('pick');
      opt.classList.add(ok ? 'right' : 'wrong');
      if (!ok) Array.prototype.forEach.call(document.querySelectorAll('.opt'), function (b) { var oo = q.opts[+b.dataset.i]; if (oo.t === q.item.t || oo.ok) b.classList.add('right'); });
      var others = q.opts.filter(function (oo) { return (oo.t === q.item.t || oo.ok) && oo !== (ok ? o : q.item); });
      if (q.di != null) { S.alt = S.alt || {}; S.alt[q.di] = ok ? { t: o.t, k: o.k || q.item.k, r: o.r || '', me: true } : null; }   // 고른 대답대로 다음 대화를 보여 준다
      var shown = ok ? (o.ok ? o : q.item) : q.item;
      if (q.read) { judge(ok, q, '정답: <b>' + esc(q.item.t) + '</b>'); return; }
      judge(ok, q, answerInfo(shown) + (others.length ? '<br><small>' + (ok ? '이렇게도 말할 수 있어요' : '이것도 정답') + ': <b class="lang-' + S.lang + '">' + esc(others[0].t) + '</b> = ' + esc(others[0].k) + '</small>' : ''), shown.say);
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
      var c = document.createElement('button'); c.className = 'tile'; c.dataset.id = id; c.innerHTML = M.fz(w, S.lang);
      $('bSlots').appendChild(c);
      if (q.mute) M.sfx('tap'); else M.say(w, S.lang);
    }
    $('bCheck').disabled = q.chosen.length === 0;
  }
  // 정답과 들린 말을 맞춰 보고, 정답에서 들리지 않은 부분을 빨갛게 표시한다 (영어는 낱말, 나머지는 글자 단위)
  function speakDiff(target, heardText, lang) {
    var word = lang === 'en';
    var tu = word ? target.split(/\s+/) : Array.from(target), hu = word ? heardText.split(/\s+/) : Array.from(heardText);
    var nz = function (x) { return M.norm(x, lang); };
    var tn = tu.map(nz), hn = hu.map(nz), m = tn.length, n = hn.length, L = [];
    for (var i = 0; i <= m; i++) { L[i] = []; for (var j = 0; j <= n; j++) L[i][j] = 0; }
    for (i = m - 1; i >= 0; i--) for (j = n - 1; j >= 0; j--) L[i][j] = tn[i] && tn[i] === hn[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var ok = [], a = 0, b = 0;
    while (a < m && b < n) { if (tn[a] && tn[a] === hn[b]) { ok[a] = 1; a++; b++; } else if (L[a + 1][b] >= L[a][b + 1]) a++; else b++; }
    return '정답: ' + tu.map(function (u, k) { var punct = !tn[k]; return '<span class="' + (punct || ok[k] ? 'sok' : 'sbad') + '">' + esc(u) + '</span>'; }).join(word ? ' ' : '');
  }
  // 영어에서 L과 R이 바뀌어 들렸는지 찾는다
  function lrTip(target, heardText) {
    var tw = M.norm(target, 'en') && target.toLowerCase().split(/\s+/).map(function (w) { return w.replace(/[^a-z']/g, ''); }),
      hw = heardText.toLowerCase().split(/\s+/).map(function (w) { return w.replace(/[^a-z']/g, ''); });
    var key = function (w) { return w.replace(/[lr]/g, '#'); };
    for (var i = 0; i < tw.length; i++) {
      var w = tw[i]; if (!/[lr]/.test(w) || hw.indexOf(w) >= 0) continue;
      var h = hw.filter(function (x) { return x !== w && key(x) === key(w); })[0];
      if (!h) continue;
      for (var k = 0; k < w.length; k++) if (w[k] !== h[k] && /[lr]/.test(w[k])) {
        return '‘' + w + '’의 ' + w[k].toUpperCase() + '가 ' + h[k].toUpperCase() + '처럼 들렸어요. ' + (w[k] === 'r' ? 'R은 혀끝을 어디에도 대지 않고 살짝 뒤로 말고, 입술을 “우” 하듯 동그랗게 해요.' : 'L은 혀끝을 윗니 뒤 잇몸에 꼭 댄 채로 소리 내요.');
      }
    }
    return '';
  }
  function speak(q) {
    var mic = $('mic'), heard = $('heard');
    if (mic.classList.contains('on')) { try { M._rec.stop(); } catch (e) {} return; }
    mic.classList.add('on'); heard.textContent = '듣고 있어요… 말해 보세요';
    var targets = [q.item.t, q.item.say].concat(q.item.alt || []);
    if (q.item.r && S.lang === 'ja') targets.push(q.item.r.split(' · ')[0]);   // 한자 단어는 읽기(가나)로도 비교한다
    var skipBtn = function () { foot('<button class="btn ghost wide" id="sSkip">넘어가기</button>'); };
    M.listen(S.lang).then(function (res) {
      mic.classList.remove('on');
      if (!S || S.qs[S.i] !== q) return;
      if (!res.length) { heard.textContent = '소리가 들리지 않았어요. 다시 눌러 보세요'; return; }
      var bm = M.bestMatch(res, targets, S.lang), score = bm.s;
      if (q.talk && $('talkHint')) $('talkHint').classList.remove('hid');
      heard.innerHTML = '들린 말: <b>' + esc(bm.h) + '</b>' + (score < 0.98 ? '<div class="sdiff lang-' + S.lang + '">' + speakDiff(bm.t, bm.h, S.lang) + '</div>' : '');
      var lr = S.lang === 'en' ? lrTip(bm.t, bm.h) : '';
      if (lr) heard.innerHTML += '<small class="sdtip lrtip">' + lr + '</small>';
      if (score >= 0.42) { M.P.stats.speak++; judge(true, q, '발음이 좋아요! ' + Math.round(score * 100) + '점'); }
      else {
        q.fails++;
        heard.innerHTML += '<small class="sdtip">빨간 부분이 다르게 들렸어요. 🔊로 그 부분을 잘 듣고 한 번 더 해 볼까요?' + (S.lang === 'ja' && /[\u4e00-\u9fff]/.test(bm.h) && !/[\u4e00-\u9fff]/.test(bm.t) ? '<br>※ 기계가 한자로 받아 적으면 맞게 말해도 다르게 보일 수 있어요.' : '') + '</small>';
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
    if (M.digReward) M.digReward();
    P.xp += 10 + stars * 2;
    P.stats.lessons++; P.stats.correct += S.correct; if (stars === 3) P.stats.perfect++;
    var before = (P.log[M.today()] || {}).l || 0;
    M.logDay({ l: 1, xp: 10 + stars * 2, w: o.water });
    var grew = M.markStudy();
    M.give(o);
    // 공부가 마을 놀이로 이어지게: 하루 처음 세 번은 낚시 미끼, 오늘 목표를 채우면 행운의 향수를 선물한다
    var perk = [];
    if (before < 3) { var bt = P.bait = P.bait || { worm: 3, fat: 0, gold: 0, use: 'worm' }; if (before === 2) { bt.fat = (bt.fat || 0) + 1; perk.push('<img class="inl" src="img/w/it-worm-fat.png" alt="">통통 지렁이 +1'); } else { bt.worm = (bt.worm || 0) + 2; perk.push('<img class="inl" src="img/w/it-worm.png" alt="">지렁이 미끼 +2'); } }
    var goalNow = before < P.set.goal && before + 1 >= P.set.goal;
    if (goalNow) { P.luckTix = (P.luckTix || 0) + 1; perk.push('<img class="inl" src="img/w/it-perfume.png" alt="">행운의 향수 +1'); }
    M.quest('lesson', 1);
    if (S.mistakes === 0) M.quest('perfect', 1);
    if (S.listenOK) M.quest('listen', S.listenOK);
    if (S.speakOK) M.quest('speak', S.speakOK);
    M.quest('combo', S.best);
    if (S.review) { M.quest('review', 1); if (!M.wrongMode) M.reviewDone(S.qs.filter(function (q) { return q.item && !q.again; }).length); }
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
      (perk.length ? '<p class="perk">🏡 마을 선물: ' + perk.join(' · ') + '</p>' : '') +
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
    if (q.type === 'teach' || q.type === 'steach' || q.type === 'rule' || q.type === 'dialog' || q.type === 'pairteach' || q.type === 'readcard') { $('tNext').click(); return q.type; }
    if (q.type === 'meaning' || q.type === 'target' || q.type === 'listen' || q.type === 'xform') {
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
