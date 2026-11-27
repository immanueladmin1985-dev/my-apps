// 말씨정원 화면 전환, 지도, 처음 화면, 퀘스트, 설정, 설치·전체화면
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  // Artifact 로 게시하면 head 태그가 body 로 들어가므로 다시 옮긴다
  Array.prototype.forEach.call(document.querySelectorAll('body meta, body link[rel]'), function (n) { document.head.appendChild(n); });
  var BOOT_STANDALONE = false;
  try { BOOT_STANDALONE = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches; } catch (e) {}
  function isStandalone() {
    if (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) return true;
    if (document.fullscreenElement || document.webkitFullscreenElement) return BOOT_STANDALONE;
    return BOOT_STANDALONE || matchMedia('(display-mode: fullscreen)').matches;
  }
  var inFrame = false; try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }

  M.load();
  var P = M.P, tab = 'learn';

  // ---------- 그리기 ----------
  M.render = function () {
    P = M.P;
    M.paintTop();
    if (!P.started) { intro(); return; }
    $('intro').classList.add('hidden');
    $('app').classList.remove('hidden');
    ['learn', 'garden', 'home', 'shop'].forEach(function (t) {
      $(t + 'View').classList.toggle('hidden', t !== tab);
      var b = document.querySelector('#nav [data-tab="' + t + '"]'); if (b) b.classList.toggle('on', t === tab);
    });
    if (tab === 'learn') renderMap($('learnView'));
    else if (tab === 'garden') (M.renderVillage || M.renderGarden)($('gardenView'));
    else if (tab === 'home') M.renderHome($('homeView'));
    else if (tab === 'shop') M.renderShop($('shopView'));
    if (tab !== 'garden') { var sec = $(tab + 'View'), hb = document.createElement('button'); hb.className = 'helpbtn float'; hb.dataset.help = tab; hb.textContent = '?'; hb.setAttribute('aria-label', '도움말'); var room = tab === 'home' && $('room'); if (room) { hb.className = 'helpbtn inroom'; room.appendChild(hb); } else sec.insertBefore(hb, sec.firstChild); }
    paintInstall();
    M.paintBadges();
  };
  M.go = function (t) {
    if (t === tab) return;
    if (M.stopEditing) M.stopEditing();
    tab = t; $('view').scrollTop = 0; M.render();
    var tipsOld = { garden: ['seenGarden', '🏪 정원 가게', '<b>① 생산기 누르기</b>: 밭에 있는 👝 씨앗 주머니, 🪵 도토리 바구니를 누르면 재료가 나와요(물방울 5). 꾹 누르면 계속 나와요.<br><b>② 합치기</b>: 같은 것끼리 끌어다 겹치면 한 단계 자라요.<br><b>③ 손님 의뢰</b>: 위에 온 손님이 원하는 것을 만들어 <b>주기</b>를 누르면 코인, <img class="inl" src="img/flower-point.png" alt="">꽃 포인트, 가게 경험치를 받아요.<br><br>가게 레벨이 오르면 새 생산기, 새 손님, 작업대가 열리고 밭도 넓힐 수 있어요.'],
      home: ['seenHome', '🏠 ' + esc(P.petName) + '의 집', '코인으로 먹이를 주면 ' + esc(M.j(P.petName, '이가', '가')) + ' 자라요. 레벨이 오를수록 레슨에서 <b>물방울을 더</b> 받아요.<br><br>가구 상점에서 가구를 사서 방을 꾸며 보세요.'],
      shop: ['seenShop', '🎁 상점', '<b>꽃 포인트</b>를 모아 남편이 등록한 <b>진짜 선물</b>로 바꿀 수 있어요. 바꾸면 쿠폰이 생기고, 남편이 확인하면 선물을 받아요.'] };
  };
  // 도움말: 저절로 띄우지 않고, 화면 오른쪽 위 작은 ? 버튼을 눌렀을 때만 보여 준다
  M.help = function (t) {
    if (t === 'garden') { M.gardenHelp(); return; }
    var H = {
      learn: ['📖 배우기', '<ul class="unl"><li>위 탭에서 <b>기초 / N5 / N4</b>처럼 수준을 고르면 그 단원만 보여요.</li><li><b>▶ 이어서 하기</b>는 마지막으로 하던 단계부터 시작해요.</li><li>끝낸 단계를 누르면 <b>다시 하기</b>를 할 수 있어요. 끝낸 단원은 눌러서 접고 펼쳐요.</li><li><b>✏️ 틀린 것</b>은 마지막에 틀린 낱말만 다시 풀어요. <b>🔁 복습</b>은 잊을 때가 된 낱말을 풀어요.</li><li>🎯 <b>복습 놀이</b>는 자주 틀린 낱말만 모아 뜻 고르기로 다시 풀어요. 맞히면 틀린 횟수가 줄어요.</li><li>📊 <b>리포트</b>에서 이번 주 공부한 날, 새로 배운 낱말, 자주 틀리는 낱말을 봐요. 가족을 연결하면 남편 폰에서도 볼 수 있어요.</li><li>레슨을 하면 <b>물방울</b>을 받아 정원에서 써요. 하루 처음 세 번은 마을에서 쓸 <b>낚시 미끼</b>도, 오늘 목표를 채우면 <b>행운의 향수</b>도 받아요.</li></ul>'],
      home: ['🏠 ' + esc(P.petName) + '의 집', '<ul class="unl"><li>코인으로 <b>먹이</b>를 주면 ' + esc(M.j(P.petName, '이가', '가')) + ' 자라요. 레벨이 오를수록 레슨에서 물방울을 더 받아요.</li><li><b>꾸미기 상점</b>에서 가구·벽지를 사요. <b>👗 옷장</b>에서는 모자, 옷, 가방·도구, 장식을 사서 입혀요. 옷은 사기 전에 입은 모습을 미리 볼 수 있고, 모자와는 같이 쓰지 않아요.</li><li>방 왼쪽 위 📷 단추로 방 사진을 찍어요.</li><li><b>✏️ 꾸미기</b>를 누르면 가구를 끌어서 옮겨요.</li></ul>'],
      shop: ['🎁 상점', '<ul class="unl"><li><b>꽃 포인트</b>를 모아 남편이 등록한 <b>진짜 선물</b>로 바꿔요. 바꾸면 쿠폰이 생기고, 남편이 확인하면 받아요.</li><li>갖고 싶은 물건은 <b>선물 신청</b>으로 이름·가격·링크를 보내요.</li><li>꽃 포인트는 정원 손님 의뢰, 퀘스트, 주간 목표에서 받아요.</li></ul>']
    }[t];
    if (H) M.modal('<h3>' + H[0] + '</h3>' + H[1] + '<button class="btn primary wide" data-close>닫기</button>');
  };
  M.paintBadges = function () {
    var set = function (t, v) { var b = document.querySelector('#nav [data-tab="' + t + '"] .badge'); if (b) { b.textContent = v || ''; b.classList.toggle('hidden', !v); } };
    var g = P.garden, golden = false, free = 0;
    for (var i = 0; i < g.open; i++) { var it = g.cells[i]; if (it && it.l === 5) golden = true; if (!it) free++; }
    set('learn', '');
    var qb = document.querySelector('#navQuest .badge'); if (qb) { var qr = M.questReady(); qb.textContent = qr || ''; qb.classList.toggle('hidden', !qr); }
    set('garden', M.gardenOrderReady && M.gardenOrderReady() ? '📦' : (P.water >= 25 && free ? '💧' : ''));
    set('home', M.petFull() < 30 ? '!' : (M.potAlert && M.potAlert()) || '');
    set('shop', P.rewards.some(function (r) { return P.fp >= r.price; }) ? '🎁' : '');
  };

  // ---------- 배우기 지도 ----------
  var SHIFT = [0, 1, 0, -1];
  // 문법 단원(GR)은 단어 단계와 따로 진행한다 (단어를 다 끝내지 않아도 시작할 수 있다)
  function gr(s) { var lv = window.LANGS[s.lang].units[s.unit].level || ''; return lv === 'GR' || lv === 'CV' || lv === 'CO' || lv === 'RD' || lv === 'PR'; }
  function firstOpen(L, prog, wantGr) { var i = L.stages.findIndex(function (s) { return !prog[s.id] && gr(s) === wantGr; }); return i < 0 ? L.stages.length : i; }
  var LVNAME = { PR: '발음', RD: '읽기', CO: '첫걸음', CV: '회화', GR: '문법', base: '기초', N5: 'JLPT N5', N4: 'JLPT N4', N3: 'JLPT N3', HSK1: 'HSK 1급', HSK2: 'HSK 2급', HSK3: 'HSK 3급', A1: '생활 영어' };
  function renderMap(root) {
    var L = window.LANGS[P.lang], prog = P.prog[P.lang];
    var cur = firstOpen(L, prog, false);
    var D = M.dailyState(), today = (P.log[M.today()] || {}).l || 0;
    var goalPct = Math.min(100, Math.round(today / P.set.goal * 100));
    var ready = M.questReady();
    var dueAll = M.dueItems(P.lang).length, revLeft = M.reviewLeft(), due = Math.min(dueAll, revLeft), revDone = dueAll > 0 && revLeft === 0, wrongN = M.wrongItems(P.lang).length;
    // 수준별 탭: 기초 / N5 / N4 처럼 나눈다. 고른 탭이 없으면 지금 배우는 단계가 있는 탭
    var levels = []; L.units.forEach(function (u) { var lv = u.level || 'base'; if (levels.indexOf(lv) < 0) levels.push(lv); });
    var lvOf = function (s) { return L.units[s.unit].level || 'base'; };
    P.ui.lv = P.ui.lv || {};
    var tab = P.ui.lv[P.lang]; if (levels.indexOf(tab) < 0) tab = cur < L.stages.length ? lvOf(L.stages[cur]) : levels[levels.length - 1];
    var h = '<div class="map theme-' + P.lang + '">' +
      '<div class="langbar">' + ['ja', 'en', 'zh'].map(function (c) { var X = window.LANGS[c]; return '<button data-lang="' + c + '" class="' + (c === P.lang ? 'on' : '') + '">' + X.flag + ' ' + X.name + '</button>'; }).join('') + '</div>' +
      '<div class="mleft">' +
      // 오늘 카드: 오늘 목표·연속 기록·이어서 하기를 한 장에 모은다
      '<div class="todaycard"><img class="tscene" src="img/bg-map-' + P.lang + '.png" alt="">' +
      '<button class="tgoal" id="dGoal"><div class="ring" style="--p:' + goalPct + '"><span>' + today + '/' + P.set.goal + '</span></div><span class="tgt"><b>' + (today >= P.set.goal ? '오늘 목표 달성! 🎉' : '오늘 목표 ' + P.set.goal + '판') + '</b><small>🔥 ' + (P.streak || 0) + '일 연속 공부 중</small>' + (due ? '<small>🔁 오늘 복습 ' + due + '개 남음</small>' : revDone ? '<small>✔ 오늘 복습 끝</small>' : '') + '</span></button>' +
      '<div class="tchips"><button class="tchip" id="dQuest">' + (ready ? '<i class="dot">' + ready + '</i>' : '') + '<img src="img/chest-closed.png" alt="" class="' + (ready ? 'wiggle' : '') + '">퀘스트</button><button class="tchip" id="dWords"><span>📒</span>단어장</button><button class="tchip" id="dDiary">' + (M.diaryReady && M.diaryReady() ? '<i class="dot">!</i>' : '') + '<span>📔</span>일기</button></div>' +
      contBtn(L, prog, cur) + '</div>' +
      '<div class="acts">' +
      '<button class="act" id="dReview"' + (M.learnedCount(P.lang) < 4 ? ' disabled' : '') + '><span class="ae">🔁</span><b>복습</b><small>' + (revDone ? '오늘 복습 끝 ✔' : due ? '오늘 ' + due + '개' + (dueAll > due ? ' (쌓인 ' + dueAll + ')' : '') : '잊기 전에 다시') + '</small></button>' +
      '<button class="act" id="dWrong"' + (wrongN ? '' : ' disabled') + '>' + (wrongN ? '<i class="dot">' + wrongN + '</i>' : '') + '<span class="ae">✏️</span><b>틀린 것</b><small>' + (wrongN ? wrongN + '개 다시 풀기' : '틀린 낱말이 없어요') + '</small></button>' +
      (function () { var wk = M.missedItems(P.lang, 30).length; return '<button class="act" id="dGame"' + (wk ? '' : ' disabled') + '><span class="ae">📓</span><b>약점 공책</b><small>' + (wk ? '헷갈리는 낱말 ' + wk + '개' : '아직 없어요') + '</small></button>'; })() +
      '<button class="act" id="dReport"><span class="ae">📊</span><b>리포트</b><small>이번 주 공부</small></button>' +
      '</div></div><div class="mright">' +
      '<div class="lvtabs">' + levels.map(function (lv) {
        var us = L.stages.filter(function (s) { return lvOf(s) === lv; }), dn = us.filter(function (s) { return prog[s.id]; }).length;
        return '<button data-lv="' + esc(lv) + '" class="' + (lv === tab ? 'on' : '') + '"><b>' + esc((lv === 'CO' && P.lang === 'en' ? 'A2 회화' : LVNAME[lv]) || lv) + '</b><small>' + dn + '/' + us.length + '</small></button>';
      }).join('') + '</div>' + (function () {
        // 아직 닿지 않은 수준: 레벨 테스트로 앞 단계를 건너뛸 수 있다
        if (gr({ lang: P.lang, unit: L.units.findIndex(function (u) { return (u.level || 'base') === tab; }) })) return '';
        var first = L.stages.findIndex(function (s) { return lvOf(s) === tab; });
        if (first < 0 || first <= cur) return '';
        return '<button class="lvtest" data-lvtest="' + esc(tab) + '"><b>🚀 ' + esc(LVNAME[tab] || tab) + '부터 시작하고 싶다면?</b><small>레벨 테스트 15문제 · 12개 이상 맞히면 앞 단계를 건너뛰어요</small></button>';
      })() + '<div class="path">';
    var n = 0;
    L.units.forEach(function (u, ui) {
      if ((u.level || 'base') !== tab) return;   // 고른 수준의 단원만 보여 준다
      var unum = L.units.slice(0, ui + 1).filter(function (x) { return (x.level || 'base') === tab; }).length;
      var us = L.stages.filter(function (s) { return s.unit === ui; });
      var got = us.reduce(function (a, s) { return a + (prog[s.id] || 0); }, 0);
      var udone = us.every(function (s) { return prog[s.id]; }), ukey = P.lang + ':' + ui;
      var open = !udone || (P.ui.open || {})[ukey];
      h += '<button class="unit' + (udone ? ' udone' : '') + '"' + (udone ? ' data-unit="' + ukey + '"' : '') + '><b>' + (udone ? '✔ ' : '') + unum + '단원 · ' + esc(u.title) + '</b><small>★ ' + got + '/' + us.length * 3 + (udone ? (open ? ' ▲' : ' ▼') : '') + '</small></button>';
      if (!open) { n += us.length; return; }
      us.forEach(function (s) {
        var cT = (tab === 'GR' || tab === 'CV' || tab === 'CO' || tab === 'RD' || tab === 'PR') ? L.stages.findIndex(function (x) { return !prog[x.id] && lvOf(x) === tab; }) : cur; if (cT < 0) cT = L.stages.length;
        var st = prog[s.id] || 0, state = st ? 'done' : (s.idx === cT ? 'cur' : (s.idx < cT ? 'done' : 'lock'));
        var x = SHIFT[n % 4] * 62; n++;
        var DECO = { ja: ['🌸', '🗻', '🍡', '⛩️'], en: ['🎈', '🏰', '🌷', '☕'], zh: ['🎋', '🏮', '🐼', '🥟'] }[P.lang];
        var deco = n % 3 === 1 ? '<span class="deco" style="' + (x > 0 ? 'left:-' : x < 0 ? 'right:-' : (n % 2 ? 'left:-' : 'right:-')) + '95px">' + DECO[(n >> 1) % 4] + '</span>' : '';
        h += '<div class="nodewrap" style="transform:translateX(' + x + 'px)">' + deco +
          (state === 'cur' ? '<img class="mpet" src="' + M.petImg('happy') + '" alt=""><span class="go">시작!</span>' : '') +
          '<button class="node ' + state + (st === 3 ? ' perfect' : '') + '" data-sid="' + s.id + '">' + (state === 'lock' ? '🔒' : state === 'cur' ? '▶' : (s.kana ? s.items[0].t : '★')) + '</button>' +
          '<div class="nstars">' + (st ? [1, 2, 3].map(function (i) { return '<i class="' + (i <= st ? 'on' : '') + '">★</i>'; }).join('') : '') + '</div>' +
          '<div class="nname">' + esc(s.title) + '</div></div>';
      });
    });
    h += '</div>' + (cur >= L.stages.length ? '<div class="card center">🎉 ' + L.name + ' 초급을 모두 끝냈어요! 복습으로 실력을 다져 보세요.<br><small>다음 단계 내용은 곧 추가될 예정이에요.</small></div>' : '') +
      '<button class="btn ghost wide inst-btn" id="hInst">📲 홈 화면에 설치하기</button></div></div>';
    root.innerHTML = h;
    if (!mapScrolled) {
      mapScrolled = true;
      var c = root.querySelector('.node.cur');
      if (c) setTimeout(function () { var v = $('view'); v.scrollTop = Math.max(0, c.offsetTop - v.clientHeight / 2); }, 30);
    }
  }
  var mapScrolled = false;
  // 마지막으로 하던 단계(끝내지 않았으면 그 단계, 끝냈으면 다음 단계)에서 바로 시작
  function contTarget(L, prog, cur) {
    var last = (P.last || {})[P.lang], ls = last && L.stages.filter(function (x) { return x.id === last; })[0];
    if (ls && !prog[ls.id]) return ls;
    return cur < L.stages.length ? L.stages[cur] : null;
  }
  function contBtn(L, prog, cur) {
    var t = contTarget(L, prog, cur); if (!t) return '';
    return '<button class="btn primary wide cont" id="dCont">▶ ' + (P.stats.lessons ? '이어서 하기' : '첫 레슨 시작') + ' <small>' + esc(t.title) + '</small></button>';
  }
  function stageSheet(sid) {
    var L = window.LANGS[P.lang], s = L.stages.filter(function (x) { return x.id === sid; })[0];
    var prog = P.prog[P.lang], slv = L.units[s.unit].level || 'base', cur = gr(s) ? L.stages.findIndex(function (x) { return !prog[x.id] && (L.units[x.unit].level || 'base') === slv; }) : firstOpen(L, prog, false); if (cur < 0) cur = L.stages.length;
    if (s.idx > cur) { M.toast('🔒 앞 단계를 먼저 끝내 주세요'); M.buzz(30); return; }
    var st = prog[s.id] || 0;
    var d = M.modal('<div class="ssheet"><small>' + L.flag + ' ' + esc(L.units[s.unit].title) + '</small><h3>' + esc(s.title) + '</h3>' +
      (st ? '<div class="stars sm">' + [1, 2, 3].map(function (i) { return '<span class="st' + (i <= st ? ' on' : '') + '">★</span>'; }).join('') + '</div>' : '') +
      '<p class="hint">' + (st ? (st < 3 ? '실수 없이 풀면 별 3개를 받아요' : '별을 다 모았어요! 다시 풀어도 물방울을 받아요') : '처음 끝내면 물방울 보너스 +15') + '</p>' +
      '<div class="chips">' + s.items.map(function (it) { return '<button class="chip lang-' + it.lang + '" data-say="' + esc(it.t) + '"><b>' + esc(it.t) + '</b><small>' + esc(it.k) + '</small></button>'; }).join('') + '</div>' +
      '<button class="btn primary wide big" id="sGo">' + (st ? '다시 하기' : '시작하기') + '</button></div>');
    d.addEventListener('click', function (e) {
      var c = e.target.closest('[data-say]'); if (c) { M.say(c.dataset.say, P.lang); return; }
      if (e.target.closest('#sGo')) { d.close(); M.startLesson(P.lang, s); }
    });
  }
  function wordBook() {
    var L = window.LANGS[P.lang], now = Date.now();
    var ss = L.stages.filter(function (s) { return P.prog[P.lang][s.id]; });
    var h = '<h3>📒 ' + L.flag + ' ' + L.name + ' 단어장</h3><p class="hint">누르면 발음을 들려줘요. 점은 얼마나 잘 외웠는지 보여 줘요.</p><div class="wbook">';
    if (!ss.length) h += '<p class="hint center">첫 단계를 끝내면 단어가 여기에 모여요.</p>';
    ss.forEach(function (s) {
      h += '<h4>' + esc(s.title) + '</h4><div class="wbsec">' + s.items.map(function (it) {
        var r = P.srs[M.itemKey(it)] || [0, 0], lv = Math.min(5, r[0]);
        var long = String(it.t).length > (it.lang === 'en' ? 14 : 6) || String(it.k).length > 12;
        return '<button class="wrow' + (long ? ' long' : '') + ' lang-' + it.lang + '" data-say="' + esc(it.t) + '"><span class="wt">' + esc(it.t) + '</span><span class="wr">' + esc(it.r) + '</span><span class="wk">' + (it.e ? it.e + ' ' : '') + esc(it.k) + '</span><span class="wl">' + '●●●●●'.slice(0, lv) + '<i>' + '●●●●●'.slice(lv) + '</i></span></button>';
      }).join('') + '</div>';
    });
    var d = M.modal(h + '</div><button class="btn ghost wide" data-close>닫기</button>', { cls: 'full' });
    d.addEventListener('click', function (e) { var c = e.target.closest('[data-say]'); if (c) M.say(c.dataset.say, P.lang); });
  }

  // ---------- 주간 리포트 ----------
  M.reportHtml = function (r, who) {
    var W = ['월', '화', '수', '목', '금', '토', '일'], mx = Math.max(1, Math.max.apply(null, r.days)), L = window.LANGS[r.lang];
    return '<div class="wrep"><p class="hint">' + esc(r.week) + ' 주 · ' + L.flag + ' ' + L.name + (who ? ' · ' + esc(who) : '') + '</p>' +
      '<div class="astats"><div><b>' + r.studyDays + '/7</b><small>공부한 날</small></div><div><b>' + r.lessons + '판</b><small>레슨</small></div><div><b>+' + r.fresh + '</b><small>새 낱말</small></div><div><b>' + r.strong + '</b><small>잘 외운 낱말</small></div></div>' +
      '<div class="chart">' + r.days.map(function (x, i) { return '<div class="cb"><i style="height:' + Math.round(x / mx * 100) + '%"></i><span>' + (x || '') + '</span><small>' + W[i] + '</small></div>'; }).join('') + '</div>' +
      (r.freshList.length ? '<h4>🌱 이번 주 새로 배운 낱말</h4><p class="wlist lang-' + r.lang + '">' + r.freshList.map(esc).join(' · ') + '</p>' : '') +
      (r.missed.length ? '<h4>✏️ 자주 틀리는 낱말</h4><div class="wmiss">' + r.missed.map(function (m) { return '<span class="lang-' + r.lang + '"><b>' + esc(m.t) + '</b>' + (m.r && m.r !== m.t ? '<small>' + esc(m.r) + '</small>' : '') + '<em>' + esc(m.k) + ' · ' + m.n + '번</em></span>'; }).join('') + '</div>' : '<p class="hint">자주 틀리는 낱말이 없어요. 아주 잘하고 있어요! 👏</p>') + '</div>';
  };
  M.openReport = function () {
    var d = M.modal('<h3>📊 이번 주 공부 리포트</h3>' + M.reportHtml(M.weekReport()) + (M.missedItems(P.lang).length >= 3 ? '<button class="btn primary wide" data-rv>🎯 틀린 낱말 복습 놀이</button>' : '') + '<button class="btn ghost wide" data-close>닫기</button>', { cls: 'bagsheet' });
    d.addEventListener('click', function (e) { if (e.target.closest('[data-rv]')) { d.close(); M.reviewGame(); } });
  };
  // ---------- 퀘스트 ----------
  M.openQuests = function () { quests(); };
  function quests() {
    var d = M.modal('<div id="qBody"></div><button class="btn ghost wide" data-close>닫기</button>', { onClose: M.render });
    var paint = function () {
      var D = M.dailyState(), W = M.weekState(), all = D.quests.every(function (q) { return q.claimed; });
      var ms = M.pendingMilestone(), nextMs = M.milestones.filter(function (m) { return !P.miles[m[0]]; })[0];
      var h = '<h3>📋 오늘의 퀘스트</h3><div class="quests">' + D.quests.map(function (q, i) {
        var Q = M.QUESTS[q.id], done = q.have >= q.need;
        return '<div class="quest' + (q.claimed ? ' claimed' : done ? ' done' : '') + '"><span class="qi">' + Q.icon + '</span><div class="qn"><b>' + esc(Q.text(q.need)) + '</b><div class="mbar"><i style="width:' + Math.round(q.have / q.need * 100) + '%"></i></div><small>' + q.have + '/' + q.need + '</small></div>' +
          (q.claimed ? '<span class="qok">✔</span>' : '<button class="btn ' + (done ? 'primary' : 'ghost') + '" data-q="' + i + '"' + (done ? '' : ' disabled') + '><img src="img/chest-closed.png" alt=""></button>') + '</div>';
      }).join('') + '</div>' +
        '<div class="quest big' + (D.bigClaimed ? ' claimed' : all ? ' done' : '') + '"><span class="qi">🏆</span><div class="qn"><b>퀘스트 3개 모두 끝내기</b><small>큰 상자에서 꽃 포인트가 나와요</small></div>' +
        (D.bigClaimed ? '<span class="qok">✔</span>' : '<button class="btn ' + (all ? 'primary' : 'ghost') + '" data-big="1"' + (all ? '' : ' disabled') + '><img src="img/chest-open.png" alt=""></button>') + '</div>' +
        '<h3>📅 이번 주 목표</h3><div class="week">' + ['월', '화', '수', '목', '금', '토', '일'].map(function (w, i) {
          var dd = M.addDays(M.weekStart(M.today()), i), on = (P.log[dd] || {}).l > 0;
          return '<div class="wd' + (on ? ' on' : '') + (dd === M.today() ? ' today' : '') + '"><span>' + (on ? '🌸' : '·') + '</span><small>' + w + '</small></div>';
        }).join('') + '</div>' +
        '<div class="quest' + (W.claimed ? ' claimed' : W.days >= W.need ? ' done' : '') + '"><span class="qi">🗓️</span><div class="qn"><b>일주일에 5일 공부하기</b><div class="mbar"><i style="width:' + Math.min(100, Math.round(W.days / W.need * 100)) + '%"></i></div><small>' + W.days + '/5일 · 보상 꽃 포인트 ' + W.bonus + '</small></div>' +
        (W.claimed ? '<span class="qok">✔</span>' : '<button class="btn ' + (W.days >= W.need ? 'primary' : 'ghost') + '" data-week="1"' + (W.days >= W.need ? '' : ' disabled') + '>받기</button>') + '</div>' +
        '<h3>🔥 연속 공부 ' + P.streak + '일 <small class="hint">최고 ' + P.best + '일 · 보호권 🧊' + P.freeze + '</small></h3>' +
        (ms ? '<div class="quest done"><span class="qi">🔥</span><div class="qn"><b>' + ms[0] + '일 연속 달성!</b><small>꽃 포인트 ' + ms[1] + '</small></div><button class="btn primary" data-ms="1">받기</button></div>' :
          nextMs ? '<p class="hint">' + nextMs[0] + '일 연속으로 공부하면 꽃 포인트 ' + nextMs[1] + '점을 받아요.</p>' : '');
      d.querySelector('#qBody').innerHTML = h;
    };
    paint();
    d.addEventListener('click', function (e) {
      var D = M.dailyState();
      var q = e.target.closest('[data-q]');
      if (q) { var Q = D.quests[+q.dataset.q]; if (Q.claimed || Q.have < Q.need) return; Q.claimed = true; M.save(); M.openChest(M.rollChest(false), '퀘스트 상자'); paint(); return; }
      if (e.target.closest('[data-big]')) { if (D.bigClaimed) return; D.bigClaimed = true; M.save(); M.openChest(M.rollChest(true), '오늘의 큰 상자'); paint(); return; }
      if (e.target.closest('[data-week]')) { var W = M.weekState(); if (W.claimed || W.days < W.need) return; P.week.claimed = true; M.save(); M.openChest({ fp: W.bonus, coins: 50 }, '주간 목표 상자'); paint(); return; }
      if (e.target.closest('[data-ms]')) { var m = M.pendingMilestone(); if (!m) return; P.miles[m[0]] = true; M.save(); M.openChest({ fp: m[1] }, '🔥 ' + m[0] + '일 연속 선물'); paint(); }
    });
  }

  // ---------- 처음 화면 ----------
  var introStep = 0, introData = { lang: 'ja', name: '말랑이', goal: 2 };
  function intro() {
    $('app').classList.add('hidden');
    var el = $('intro'); el.classList.remove('hidden');
    $('view').insertBefore($('banner'), $('view').firstChild);   // 다시 그리기 전에 안내 띠를 꺼내 둔다
    var h = '<div class="banner-slot"></div>';
    if (introStep === 0) {
      h += '<img class="ilogo popin" src="img/pet-1-happy.png" alt=""><h1>말씨정원</h1><p>말을 배우면 씨앗이 자라요.<br>매일 조금씩 배우고, 정원을 키우고,<br><b>진짜 선물</b>로 바꿔 보세요!</p>' +
        '<div class="ifeat"><span>📖 3분 레슨</span><span>🌱 머지 정원</span><span>🐰 토끼 키우기</span><span>🎁 선물 교환</span></div>' +
        '<button class="btn primary wide big" data-next>시작하기</button>';
    } else if (introStep === 1) {
      h += '<h2>어떤 말부터 배울까요?</h2><p class="hint">언제든 바꿀 수 있고, 세 가지를 함께 배워도 돼요.</p><div class="ilangs">' + ['ja', 'en', 'zh'].map(function (c) {
        var L = window.LANGS[c]; return '<button class="ilang' + (introData.lang === c ? ' on' : '') + '" data-il="' + c + '"><span>' + L.flag + '</span><b>' + L.name + '</b><small>' + esc(L.hello) + '</small></button>';
      }).join('') + '</div><button class="btn primary wide big" data-next>다음</button>';
    } else if (introStep === 2) {
      h += '<img class="ilogo" src="img/pet-1-normal.png" alt=""><h2>토끼 이름을 지어 주세요</h2><p class="hint">함께 공부하고 자라는 친구예요.</p><input class="iname" id="iName" maxlength="8" value="' + esc(introData.name) + '">' +
        '<h3>하루 목표</h3><div class="goals">' + [[1, '가볍게'], [2, '보통'], [3, '열심히'], [5, '아주 열심히']].map(function (g) {
          return '<button class="' + (introData.goal === g[0] ? 'on' : '') + '" data-goal="' + g[0] + '"><b>' + g[0] + '판</b><small>' + g[1] + '</small></button>';
        }).join('') + '</div><p class="hint">레슨 한 판은 3~5분 걸려요.</p><button class="btn primary wide big" data-next>시작!</button>';
    }
    el.innerHTML = '<div class="iwrap">' + h + '</div>';
    var slot = el.querySelector('.banner-slot'); slot.appendChild($('banner'));
    paintInstall();
  }
  $('intro').addEventListener('click', function (e) {
    var t = e.target;
    var il = t.closest('[data-il]'); if (il) { introData.lang = il.dataset.il; M.say(window.LANGS[il.dataset.il].hello, il.dataset.il); intro(); return; }
    var g = t.closest('[data-goal]'); if (g) { introData.name = ($('iName') || {}).value || introData.name; introData.goal = +g.dataset.goal; intro(); return; }
    if (t.closest('[data-next]')) {
      if (introStep === 2) {
        P.petName = (($('iName') || {}).value || '').trim() || '말랑이';
        P.lang = introData.lang; P.set.goal = introData.goal; P.started = true;
        $('view').insertBefore($('banner'), $('view').firstChild);
        M.save(); M.render();
        M.modal('<div class="center"><img class="bigpet popin" src="img/pet-1-happy.png" alt=""><h3>' + esc(M.j(P.petName, '과', '와')) + ' 함께 시작해요!</h3><p>첫 레슨을 끝내면 물방울을 받아요.<br>물방울로 정원에 씨앗을 뿌려 보세요 🌱</p><button class="btn primary wide" data-close>좋아요</button></div>');
        dayCheck();
        return;
      }
      introStep++; intro();
    }
  });

  // ---------- 설정 ----------
  function fontSel(kind, key, label, sample, lang) {
    var cur = P.set[key] || M.FONTS[kind][0][0];
    return '<label class="sel"><span>' + label + '</span><select data-font="' + key + '" data-kind="' + kind + '">' + M.FONTS[kind].map(function (f) { return '<option value="' + f[0] + '"' + (f[0] === cur ? ' selected' : '') + '>' + f[2] + '</option>'; }).join('') + '</select></label>' +
      '<p class="fprev' + (lang ? ' lang-' + lang : '') + '" data-prev="' + key + '">' + sample + '</p>';
  }
  function settings() {
    var tg = function (k, label, sub) { return '<label class="tg"><span>' + label + (sub ? '<small>' + sub + '</small>' : '') + '</span><input type="checkbox" data-s="' + k + '"' + (P.set[k] ? ' checked' : '') + '><i></i></label>'; };
    var h = '<h3>⚙️ 설정</h3>' +
      tg('sound', '효과음') +
      '<label class="sel"><span>효과음 느낌</span><select data-sfx>' + M.SFX_THEMES.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select></label>' +
      tg('autoAudio', '발음 자동으로 듣기') +
      tg('furi', '한자 위에 읽기(후리가나) 표시', '일본어 한자 위에 히라가나를 작게 달아요') +
      tg('speak', '따라 말하기 문제', M.speechOK() ? '마이크로 발음을 확인해요' : '이 브라우저는 음성 인식을 지원하지 않아요') +
      '<label class="sel"><span>발음 빠르기</span><select data-v="rate"><option value="0.7">느리게</option><option value="0.9">보통</option><option value="1.05">빠르게</option></select></label>' +
      '<label class="sel"><span>하루 목표</span><select data-v="goal"><option value="1">1판</option><option value="2">2판</option><option value="3">3판</option><option value="5">5판</option></select></label>' +
      '<label class="sel"><span>토끼 이름</span><input data-name maxlength="8" value="' + esc(P.petName) + '"></label>' +
      '<h4>글꼴</h4>' + fontSel('ui', 'fontUI', '화면 글꼴', '안녕하세요! 말씨정원 123') + fontSel('ja', 'fontJa', '일본어 글꼴', 'こんにちは 日本語 カタカナ', 'ja') + fontSel('zh', 'fontZh', '중국어 글꼴', '你好 学习 nǐ hǎo', 'zh') +
      '<label class="sel"><span>글자 크기</span><select data-fs>' + M.FONT_SIZES.map(function (x) { return '<option value="' + x[0] + '"' + (P.set.fontSize === x[0] ? ' selected' : '') + '>' + x[2] + '</option>'; }).join('') + '</select></label>' +
      '<h4>화면</h4>' + tg('autoFS', '자동 전체화면', '화면을 처음 누르면 전체화면으로 바꿔요') + tg('wake', '레슨 중 화면 켜 두기') +
      (isStandalone() ? '' : '<button class="btn wide" data-a="fs">' + (FS.on() ? '전체화면 끄기' : '전체화면 켜기') + '</button><button class="btn wide" data-a="inst">📲 홈 화면에 설치하기</button>') +
      '<h4>기록</h4><button class="btn wide" data-a="move">📱 다른 기기에서 이어하기 (핀)</button><button class="btn wide" data-a="export">💾 백업 파일 저장하기</button><button class="btn wide" data-a="import">📂 백업 파일 불러오기 (관리자)</button>' +
      '<p class="hint">기록은 이 폰에만 저장돼요. 폰을 바꾸거나 브라우저 데이터를 지우기 전에 백업 파일을 저장해 두세요.</p>' +
      '<button class="btn wide" data-a="admin">🔒 관리자 메뉴</button>' +
      '<button class="btn wide" data-a="stk">🏅 스티커 앨범</button>' +
      '<button class="btn wide" data-a="family">👨‍👩 가족 연결' + (M.Family && M.Family.state().ready ? ' ✔' : '') + '</button>' +
      (M.Family && M.Family.isHusband() ? '<button class="btn wide" data-a="remote">💌 원격 관리 (' + esc(M.Family.mateName() || '아내') + ' 폰)' + (M.Family.waiting ? ' 🔴' : '') + '</button>' : '') +
      '<button class="btn danger wide" data-a="reset">모든 기록 지우기</button>' +
      '<button class="btn primary wide" data-close>닫기</button>';
    var d = M.modal(h, { onClose: M.render });
    d.querySelector('[data-v="rate"]').value = String(P.set.rate);
    d.querySelector('[data-sfx]').value = M.sfxTheme();
    d.querySelector('[data-v="goal"]').value = String(P.set.goal);
    d.addEventListener('change', function (e) {
      var s = e.target.dataset.s, v = e.target.dataset.v;
      if (s) { P.set[s] = e.target.checked; if (s === 'autoFS' && P.set.autoFS) FS.userExit = false; }
      if (v) P.set[v] = parseFloat(e.target.value);
      if (e.target.dataset.name !== undefined) P.petName = e.target.value.trim() || '말랑이';
      if (e.target.dataset.font) { P.set[e.target.dataset.font] = e.target.value; M.applyFonts(); }
      if (e.target.dataset.fs !== undefined) { P.set.fontSize = e.target.value; M.applyFonts(); }
      if (e.target.dataset.sfx !== undefined) { P.set.sfx = e.target.value; M.save(); M.sfx('win'); setTimeout(function () { M.sfx('win'); }, 400); }   // 처음엔 불러오는 중이라 한 번 더 들려준다
      M.save();
    });
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.dataset.a;
      if (a === 'fs') { d.close(); FS.toggle(); }
      else if (a === 'inst') { d.close(); installSheet(); }
      else if (a === 'export') exportBackup();
      else if (a === 'import') { d.close(); M.askPin('백업 불러오기', M.pickBackup); }
      else if (a === 'admin') { d.close(); M.openAdmin(); }
      else if (a === 'remote') { d.close(); M.Family.adminPanel(); }
      else if (a === 'family') { d.close(); M.Family.sheet(); }
      else if (a === 'stk') { d.close(); M.stickerAlbum(); }
      else if (a === 'move') { d.close(); M.Family.transferSheet(); }
      else if (a === 'reset') {
        d.close();
        var doReset = function () { M.confirm('모든 기록을 지울까요?', '배운 단계, 정원, 토끼, 꽃 포인트, 쿠폰이 모두 사라지고 되돌릴 수 없어요.', '모두 지우기', function () { M.reset(); location.reload(); }, true); };
        if (P.admin.pin) M.askPin('기록 지우기', doReset); else doReset();
      }
    });
  }
  function exportBackup() {
    try {
      var blob = new Blob([M.exportData()], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '말씨정원-백업-' + M.today() + '.json';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      M.toast('백업 파일을 저장했어요 (다운로드 폴더)');
    } catch (e) { M.toast('저장하지 못했어요'); }
  }
  M.pickBackup = function () {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try { M.importData(String(r.result)); P = M.P; M.toast('백업을 불러왔어요'); M.render(); }
        catch (e) { M.modal('<h3>불러오지 못했어요</h3><p>말씨정원 백업 파일이 맞는지 확인해 주세요.</p><button class="btn primary wide" data-close>확인</button>'); }
      };
      r.readAsText(f);
    };
    inp.click();
  };

  // ---------- 화면 꺼짐 방지 ----------
  M.wake = {
    lock: null, want: false,
    on: function () {
      M.wake.want = true;
      if (!P.set.wake || M.wake.lock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      try { navigator.wakeLock.request('screen').then(function (l) { M.wake.lock = l; l.addEventListener('release', function () { M.wake.lock = null; }); }).catch(function () {}); } catch (e) {}
    },
    off: function () { M.wake.want = false; if (M.wake.lock) { try { M.wake.lock.release(); } catch (e) {} M.wake.lock = null; } }
  };
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { if (M.wake.want) M.wake.on(); dayCheck(); }
    else M.save();
  });
  window.addEventListener('pagehide', function () { M.save(); });

  // ---------- 전체화면·홈 화면 설치 ----------
  var FS = {
    userExit: false,
    supported: function () { var d = document.documentElement; return !!(d.requestFullscreen || d.webkitRequestFullscreen) && !isStandalone() && !inFrame; },
    on: function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
    enter: function () {
      var d = document.documentElement;
      try { var r = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : (d.webkitRequestFullscreen && d.webkitRequestFullscreen()); if (r && r.catch) r.catch(function () {}); } catch (e) {}
    },
    exit: function () {
      try { var r = document.exitFullscreen ? document.exitFullscreen() : (document.webkitExitFullscreen && document.webkitExitFullscreen()); if (r && r.catch) r.catch(function () {}); } catch (e) {}
    },
    toggle: function () {
      if (!FS.supported()) { installSheet(); return; }   // 아이폰·iframe 처럼 전체화면이 막힌 곳은 설치 방법 안내
      if (FS.on()) { FS.userExit = true; FS.exit(); } else { FS.userExit = false; FS.enter(); }
    }
  };
  var installEvt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; paintInstall(); });
  window.addEventListener('appinstalled', function () { installEvt = null; P.ui.installDismissed = true; M.save(); paintInstall(); M.toast('홈 화면에 설치했어요'); });
  function paintInstall() {
    var sa = isStandalone(), onFirst = !P.started || tab === 'learn';
    $('banner').classList.toggle('hidden', sa || inFrame || P.ui.installDismissed || !onFirst);
    $('bFs').classList.toggle('hidden', !FS.supported());
    var hi = $('hInst'); if (hi) hi.classList.toggle('hidden', sa);
    var top = $('bFsTop');
    if (top) {
      top.classList.toggle('hidden', sa);
      top.innerHTML = FS.on() ? '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
      top.setAttribute('aria-label', FS.on() ? '전체화면 끄기' : '전체화면 켜기');
    }
  }
  function doInstall() {
    var ev = installEvt; installEvt = null;
    try {
      ev.prompt();
      ev.userChoice.then(function (r) { if (r && r.outcome === 'accepted') { P.ui.installDismissed = true; M.save(); } paintInstall(); }).catch(function () {});
    } catch (e) { installSheet(); }
  }
  function installSheet() {
    if (isStandalone()) { M.toast('이미 홈 화면 앱으로 실행 중이에요'); return; }
    if (installEvt) { doInstall(); return; }
    var ua = navigator.userAgent;
    var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var samsung = /SamsungBrowser/i.test(ua), inapp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(ua);
    var mobile = /Android|Mobi/i.test(ua) || ios;
    var kbd = function (t) { return '<span class="kbd">' + t + '</span>'; };
    var how;
    if (location.protocol === 'file:') how = '<p>지금은 파일로 열려 있어서 설치할 수 없어요. 휴대폰 크롬에서 아래 주소로 열어 주세요.</p><p><b>immanueladmin1985-dev.github.io/my-apps/malssi-garden/</b></p>';
    else if (inapp) how = '<ol><li>오른쪽 아래(또는 위) ' + kbd('⋮') + ' 메뉴를 누르세요</li><li><b>다른 브라우저로 열기</b>(크롬)를 누르세요</li><li>열린 화면에서 다시 <b>설치하기</b>를 누르세요</li></ol>';
    else if (ios) how = '<ol><li>사파리 아래(아이패드는 위) ' + kbd('공유 ⬆') + ' 단추를 누르세요</li><li>메뉴를 올려 <b>홈 화면에 추가</b>를 누르세요</li><li>오른쪽 위 <b>추가</b>를 누르세요</li></ol><p>아이폰·아이패드는 홈 화면 앱으로 열어야 주소창 없이 넓게 보여요.</p>';
    else if (samsung) how = '<ol><li>아래 ' + kbd('≡') + ' 메뉴를 누르세요</li><li><b>현재 페이지 추가</b> → <b>홈 화면</b>을 누르세요</li></ol>';
    else if (mobile) how = '<ol><li>오른쪽 위 ' + kbd('⋮') + ' 메뉴를 누르세요</li><li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누르세요</li><li>뜨는 창에서 <b>설치</b>를 누르세요</li></ol>';
    else how = '<ol><li>크롬·엣지 주소창 오른쪽의 ' + kbd('설치 ⊕') + ' 아이콘을 누르세요</li><li>없으면 ' + kbd('⋮') + ' 메뉴 → <b>앱 설치</b>(또는 <b>앱</b> → <b>이 사이트를 앱으로 설치</b>)를 누르세요</li></ol>';
    M.modal('<h3>홈 화면에 설치하기</h3><p>설치하면 아이콘으로 바로 열리고, 주소창 없이 화면을 넓게 쓸 수 있어요.</p>' + how + '<button class="btn primary wide" data-close>알겠어요</button>');
  }
  $('bInst').addEventListener('click', installSheet);
  $('bFs').addEventListener('click', FS.toggle);
  $('bLater').addEventListener('click', function () { P.ui.installDismissed = true; M.save(); paintInstall(); M.toast('첫 화면 아래와 설정에서 언제든 설치할 수 있어요'); });
  $('bFsTop').addEventListener('click', FS.toggle);
  document.addEventListener('click', function (e) {
    if (!P.set.autoFS || FS.userExit || FS.on() || !FS.supported()) return;
    if (e.target.closest && e.target.closest('#banner, #bFsTop')) return;
    FS.enter();
  }, true);
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (n) { document.addEventListener(n, paintInstall); });

  // 길게 누를 때 뜨는 이미지 복사·저장 메뉴를 막는다 (글자 입력칸은 그대로 둔다)
  document.addEventListener('contextmenu', function (e) { if (!e.target.closest('input, textarea')) e.preventDefault(); });

  // ---------- 누르기 ----------
  document.addEventListener('click', function (e) {
    var t = e.target;
    var hp = t.closest('[data-help]'); if (hp) { M.help(hp.dataset.help); return; }
    var nb = t.closest('#nav [data-tab]'); if (nb) { M.sfx('tap'); M.go(nb.dataset.tab); return; }
    if (t.closest('#navQuest')) { M.sfx('tap'); quests(); return; }
    if (t.closest('#bSet')) { settings(); return; }
    if (t.closest('#tStreakBox')) { quests(); return; }
    if (!t.closest('#learnView')) return;
    var lb = t.closest('[data-lang]'); if (lb) { P.lang = lb.dataset.lang; M.save(); mapScrolled = false; M.render(); return; }
    var nd = t.closest('.node'); if (nd) { stageSheet(nd.dataset.sid); return; }
    var ub = t.closest('[data-unit]'); if (ub) { P.ui.open = P.ui.open || {}; P.ui.open[ub.dataset.unit] = !P.ui.open[ub.dataset.unit]; M.save(); M.render(); return; }
    if (t.closest('#dCont')) { var L0 = window.LANGS[P.lang], pr0 = P.prog[P.lang], c0 = firstOpen(L0, pr0, false); var tg = contTarget(L0, pr0, c0); if (tg) M.startLesson(P.lang, tg); return; }
    if (t.closest('#dQuest') || t.closest('#dGoal')) { quests(); return; }
    var lt = t.closest('[data-lvtest]'); if (lt) { M.levelTest(P.lang, lt.dataset.lvtest, function () { mapScrolled = false; renderMap($('learnView')); }); return; }
    if (t.closest('#dReview')) { if (M.learnedCount(P.lang) >= 4) M.startLesson(P.lang, null); return; }
    if (t.closest('#dGame')) { M.weakBook(); return; }
    if (t.closest('#dReport')) { M.openReport(); return; }
    if (t.closest('#dWrong')) { if (M.wrongItems(P.lang).length) M.startLesson(P.lang, null, true); return; }
    var lvb = t.closest('[data-lv]'); if (lvb) { P.ui.lv = P.ui.lv || {}; P.ui.lv[P.lang] = lvb.dataset.lv; M.save(); mapScrolled = false; M.render(); return; }
    if (t.closest('#dWords')) { wordBook(); return; }
    if (t.closest('#dDiary')) { if (M.diaryReady && M.diaryReady()) M.diaryWrite(); else M.diaryBook(); return; }
    if (t.closest('#hInst')) installSheet();
  });

  // 레슨이 끝난 뒤
  M.afterLesson = function (S, first) {
    var ms = M.pendingMilestone();
    if (ms) M.toast('🔥 ' + ms[0] + '일 연속! 퀘스트에서 선물을 받아요');
    if (first && S.stage) {
      var L = window.LANGS[S.lang], last = L.stages.filter(function (s) { return s.unit === S.stage.unit; }).pop();
      if (last.id === S.stage.id) M.toast('🎉 ' + (S.stage.unit + 1) + '단원을 끝냈어요!');
    }
    if (false) M.queuePopup(function () {   // 자동 안내 창은 띄우지 않는다 (도움말 버튼으로 본다)   // 다음 레슨을 바로 이어서 하면 레슨이 끝난 뒤에 뜬다
      var d = M.modal('<div class="center"><img class="bigpet popin" src="img/water.png" alt=""><h3>첫 물방울을 받았어요!</h3><p>아래 <b>🌱 정원</b>에서 생산기를 눌러 재료를 만들고 손님 의뢰를 채워 보세요.</p><div class="row2"><button class="btn ghost" data-close>나중에</button><button class="btn primary" data-close data-goto="garden">정원 가기</button></div></div>');
      d.querySelector('[data-goto]').addEventListener('click', function () { M.go('garden'); });
      return d;
    });
  };

  // ---------- 하루가 바뀔 때 알림 차례대로 ----------
  var queue = [];
  M.queuePopup = function (f) { queue.push(f); setTimeout(runQueue, M.fast ? 0 : 300); };
  function runQueue() {
    if (document.querySelector('.dim') || document.body.classList.contains('in-lesson') || document.body.classList.contains('in-mini')) { setTimeout(runQueue, 400); return; }
    var f = queue.shift(); if (!f) return;
    f();
    setTimeout(runQueue, M.fast ? 0 : 400);   // 띄운 창이 닫힐 때까지 기다렸다가 다음 것을 띄운다
  }
  var lastCheck = '';
  function dayCheck() {
    if (!P.started) return;
    var t = M.today(); if (lastCheck === t) return; lastCheck = t;
    var s = M.checkStreak();
    if (s && s.kind === 'saved') queue.push(function () { return M.modal('<div class="center"><div class="tbig">🧊</div><h3>보호권이 연속 기록을 지켰어요</h3><p>보호권 ' + s.n + '개를 써서 <b>' + P.streak + '일</b> 연속 기록이 이어져요.</p><button class="btn primary wide" data-close>고마워요</button></div>'); });
    if (s && s.kind === 'lost') queue.push(function () { return M.modal('<div class="center"><img class="bigpet" src="' + M.petImg('sad') + '" alt=""><h3>연속 기록이 끊겼어요</h3><p>' + s.n + '일 연속 기록이 끝났어요. 괜찮아요, 오늘부터 다시 시작해요!</p><p class="hint">상점에서 연속 보호권을 사 두면 하루 빠져도 기록이 이어져요.</p><button class="btn primary wide" data-close>다시 시작하기</button></div>'); });
    M.dailyState();
    if (!P.daily.gift) queue.push(function () {
      P.daily.gift = true; M.save();
      return M.openChest({ water: 15, coins: 10 }, '오늘의 출석 선물');
    });
    P.gifts.forEach(function () { queue.push(function () { return M.showGifts(); }); });
    M.render();
    setTimeout(runQueue, M.fast ? 0 : 400);
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  M.render();
  dayCheck();
  if (M.Family && M.Family.start) M.Family.start();
  // 자동 점검용
  window.__malssi = M;
})();
