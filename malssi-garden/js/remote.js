// 원격 관리: 아내 폰(플레이어)과 남편 폰(관리자)을 Firebase Realtime Database 로 잇는다.
// SDK 없이 REST 로만 쓴다. 데이터 모양: rooms/<방>/{meta:{player,admin}, state, cmds/<id>}
// 플레이어만 state 를 쓰고, 관리자만 cmds 를 만들고, 플레이어가 cmds 를 반영한 뒤 지운다(보안 규칙으로 막는다).
(function () {
  var M = window.M, esc = M.esc;
  var FB = {
    apiKey: 'AIzaSyBypTxoZ9SWkGsPhwzykflH55MTuYHbKOI',
    db: 'https://speak-garden-default-rtdb.asia-southeast1.firebasedatabase.app',
    auth: 'https://identitytoolkit.googleapis.com/v1/accounts:signUp',
    refresh: 'https://securetoken.googleapis.com/v1/token'
  };
  var KEY = 'malssi-remote';
  var R = load();   // { uid, rt(refresh token), player: room, admin: room, seen }
  var tok = '', tokExp = 0;
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(R)); } catch (e) {} }
  M.Remote = { cfg: FB, state: function () { return R; } };

  function RemoteError(code, msg) { var e = new Error(msg); e.code = code; return e; }
  function explain(e) {
    var c = String((e && (e.code || e.message)) || '');
    if (/CONFIGURATION_NOT_FOUND|OPERATION_NOT_ALLOWED|ADMIN_ONLY_OPERATION/.test(c)) return '파이어베이스에서 익명 로그인이 아직 켜져 있지 않아요. Authentication › 로그인 방법에서 "익명"을 사용 설정해 주세요.';
    if (/denied|401|403/i.test(c)) return '데이터베이스가 요청을 막았어요. Realtime Database 규칙을 알려 드린 대로 넣었는지 확인해 주세요. 이미 다른 폰이 관리자로 연결된 방일 수도 있어요.';
    if (/net|fetch|Failed|offline/i.test(c)) return '인터넷에 연결되지 않았어요. 잠시 뒤에 다시 해 주세요.';
    return '연결하지 못했어요 (' + esc(c.slice(0, 80)) + ')';
  }
  M.Remote.explain = explain;

  // ---------- 로그인 (익명) ----------
  function token() {
    if (tok && Date.now() < tokExp - 60000) return Promise.resolve(tok);
    var p;
    if (R.rt) {
      p = fetch(FB.refresh + '?key=' + FB.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(R.rt) })
        .then(function (r) { return r.json(); }).then(function (j) {
          if (!j.id_token) throw RemoteError((j.error && j.error.message) || 'refresh', 'refresh');
          return { id: j.id_token, rt: j.refresh_token, uid: j.user_id, exp: +j.expires_in };
        });
    } else {
      p = fetch(FB.auth + '?key=' + FB.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' })
        .then(function (r) { return r.json(); }).then(function (j) {
          if (!j.idToken) throw RemoteError((j.error && j.error.message) || 'signup', 'signup');
          return { id: j.idToken, rt: j.refreshToken, uid: j.localId, exp: +j.expiresIn };
        });
    }
    return p.then(function (t) {
      tok = t.id; tokExp = Date.now() + (t.exp || 3600) * 1000;
      if (R.uid && R.uid !== t.uid) { R.player = ''; R.admin = ''; }   // 다른 계정이 되었으면 예전 방은 못 쓴다
      R.uid = t.uid; R.rt = t.rt; store();
      return tok;
    });
  }
  function db(method, path, body) {
    return token().then(function (t) {
      return fetch(FB.db + '/' + path + '.json?auth=' + encodeURIComponent(t), { method: method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    }).then(function (r) {
      return r.text().then(function (txt) {
        var j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
        if (!r.ok) throw RemoteError((j && j.error) || String(r.status), 'db');
        return j;
      });
    });
  }
  M.Remote.db = db;
  function newRoom() { var a = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (x, i) { a[i] = Math.random() * 256; }); return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(36)).slice(-2); }).join(''); }
  function linkFor(room) { return location.origin + location.pathname + '#remote=' + room; }
  function roomFrom(text) { var m = String(text || '').match(/remote=([a-z0-9]{16,40})/i) || String(text || '').trim().match(/^([a-z0-9]{16,40})$/i); return m ? m[1].toLowerCase() : ''; }

  // =====================================================================
  // 아내 폰(플레이어)
  // =====================================================================
  function snapshot() {
    var P = M.P, out = [], t = M.today();
    for (var i = 13; i >= 0; i--) { var dd = M.addDays(t, -i); out.push({ d: dd, l: (P.log[dd] || {}).l || 0 }); }
    var cp = function (c) { return { id: c.id, e: c.e, name: c.name, price: c.price, at: c.at, status: c.status, doneAt: c.doneAt || 0 }; };
    var learned = {}; ['ja', 'en', 'zh'].forEach(function (c) { try { learned[c] = M.learnedCount(c); } catch (e) { learned[c] = 0; } });
    var W = {}; try { W = M.weekState(); } catch (e) {}
    return {
      pet: P.petName, fp: P.fp, coins: P.coins, streak: P.streak, best: P.best, lessons: (P.stats && P.stats.lessons) || 0, week: W.days || 0,
      learned: learned, days: out,
      coupons: P.coupons.filter(function (c) { return c.status === 'wait'; }).map(cp).concat(P.coupons.filter(function (c) { return c.status !== 'wait'; }).slice(-10).map(cp)),
      requests: (P.requests || []).filter(function (q) { return q.status === 'wait'; }).map(function (q) { return { id: q.id, e: q.e, name: q.name, won: q.won || 0, link: q.link || '', at: q.at }; }),
      rewards: P.rewards.map(function (r) { return { id: r.id, e: r.e, name: r.name, price: r.price }; }),
      rate: P.admin.rate || 10, weekBonus: P.admin.weekBonus || 0
    };
  }
  var lastSent = '', busy = false, giftWait = [];
  function sync(force) {
    if (!R.player || busy) return Promise.resolve();
    busy = true;
    return db('GET', 'rooms/' + R.player + '/cmds').then(function (cmds) {
      var ids = Object.keys(cmds || {}).sort(function (a, b) { return ((cmds[a] || {}).at || 0) - ((cmds[b] || {}).at || 0); });
      var chain = Promise.resolve();
      ids.forEach(function (id) { chain = chain.then(function () { apply(cmds[id]); return db('DELETE', 'rooms/' + R.player + '/cmds/' + id); }); });
      return chain.then(function () { if (ids.length) { M.save(); if (M.paintTop) M.paintTop(); if (M.render && !document.querySelector('.dim')) M.render(); } });
    }).then(function () {
      var s = snapshot(), j = JSON.stringify(s);
      if (!force && j === lastSent) return;
      s.at = Date.now();
      return db('PUT', 'rooms/' + R.player + '/state', s).then(function () { lastSent = j; R.syncAt = Date.now(); store(); });
    }).catch(function (e) { R.err = String(e.code || e.message); store(); })
      .then(function () { busy = false; showGiftsLater(); });
  }
  M.Remote.sync = sync;
  function findBy(list, id) { return (list || []).filter(function (x) { return x.id === id; })[0]; }
  function apply(c) {
    var P = M.P; if (!c || typeof c.t !== 'string') return;
    var num = function (v, lo, hi, d) { v = parseInt(v, 10); return isNaN(v) ? d : Math.max(lo, Math.min(hi, v)); };
    if (c.t === 'give') {
      var cp = findBy(P.coupons, c.id); if (!cp || cp.status !== 'wait') return;
      cp.status = 'done'; cp.doneAt = Date.now(); M.toast('🎁 남편이 "' + cp.name + '" 지급을 완료했어요');
    } else if (c.t === 'cancel') {
      var cc = findBy(P.coupons, c.id); if (!cc || cc.status !== 'wait') return;
      cc.status = 'cancel'; cc.doneAt = Date.now(); P.fp += cc.price; M.toast('"' + cc.name + '" 쿠폰이 취소되어 ' + cc.price + '점을 돌려받았어요');
    } else if (c.t === 'qok') {
      var q = findBy(P.requests, c.id); if (!q || q.status !== 'wait') return;
      q.status = 'ok'; P.rewards.push({ id: 'r' + Date.now() + Math.floor(Math.random() * 99), e: q.e, name: q.name, price: num(c.pts, 1, 1000000, 100), link: q.link, won: q.won });
      M.toast('💌 신청한 "' + q.name + '"이(가) 선물 목록에 올라왔어요');
    } else if (c.t === 'qno') {
      var q2 = findBy(P.requests, c.id); if (!q2 || q2.status !== 'wait') return; q2.status = 'no';
    } else if (c.t === 'gift') {
      giftWait.push({ fp: num(c.fp, 1, 5000, 10), msg: String(c.msg || '수고했어요!').slice(0, 60) });
    } else if (c.t === 'rewards' && Array.isArray(c.list)) {
      // 남편이 목록을 고치는 사이 새로 생긴 선물(신청 승인 등)은 남긴다
      var base = Array.isArray(c.base) ? c.base : [], extra = P.rewards.filter(function (r) { return base.indexOf(r.id) < 0 && !findBy(c.list, r.id); });
      P.rewards = c.list.slice(0, 60).map(function (r) {
        var old = findBy(P.rewards, r && r.id) || {};
        return { id: String((r && r.id) || 'r' + Date.now() + Math.random()).slice(0, 40), e: String((r && r.e) || '🎁').slice(0, 4), name: String((r && r.name) || '선물').slice(0, 30), price: num(r && r.price, 1, 1000000, 100), link: old.link, won: old.won };
      }).concat(extra);
      M.toast('🎁 남편이 선물 목록을 바꿨어요');
    } else if (c.t === 'settings') {
      P.admin.rate = num(c.rate, 1, 1000, P.admin.rate || 10); P.admin.weekBonus = num(c.weekBonus, 0, 1000, P.admin.weekBonus || 0);
    }
  }
  // 칭찬 선물은 다른 창이나 레슨이 없을 때 연다
  function showGiftsLater() {
    if (!giftWait.length) return;
    var L = document.getElementById('lesson');
    if (document.querySelector('.dim') || (L && !L.classList.contains('hidden')) || !M.P.started) { setTimeout(showGiftsLater, 3000); return; }
    M.P.gifts.push(giftWait.shift()); M.save();
    var d = M.showGifts && M.showGifts();
    if (d && giftWait.length) { var t = setInterval(function () { if (!d.isConnected) { clearInterval(t); showGiftsLater(); } }, 800); }
  }
  // 아내 폰: 관리자 메뉴 › 설정 › 원격 관리 연결
  M.Remote.playerSheet = function () {
    var linked = !!R.player;
    var d = M.modal('<h3>📡 남편 폰으로 원격 관리</h3>' +
      (linked ? '<p>남편 폰과 연결할 수 있는 상태예요. 아래 링크를 남편 폰에서 한 번 열면 연결돼요.</p>' +
        '<div class="rlink">' + esc(linkFor(R.player)) + '</div>' +
        '<div class="row2"><button class="btn primary" data-r="share">링크 보내기</button><button class="btn" data-r="copy">복사</button></div>' +
        '<p class="hint">' + (R.syncAt ? '마지막 동기화: ' + new Date(R.syncAt).toLocaleString('ko-KR') : '아직 동기화하지 않았어요') + (R.err ? '<br>최근 오류: ' + esc(explain({ code: R.err })) : '') + '</p>' +
        '<button class="btn wide" data-r="sync">지금 동기화</button><button class="btn danger wide" data-r="off">연결 끊기</button>'
        : '<p>연결하면 남편 폰에서 쿠폰 승인, 신청 선물 승인, 선물 목록 관리, 칭찬 선물 보내기, 공부 현황 보기를 할 수 있어요.</p><p class="hint">공부 기록 요약과 선물 목록만 인터넷(파이어베이스)에 올라가요.</p>' +
        '<button class="btn primary wide" data-r="make">연결 링크 만들기</button>') +
      '<p class="rmsg hint"></p><button class="btn ghost wide" data-close>닫기</button>');
    var msg = d.querySelector('.rmsg');
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-r]'); if (!b) return; var a = b.dataset.r;
      if (a === 'make') {
        b.disabled = true; msg.textContent = '연결하는 중…';
        var room = newRoom();
        token().then(function () { return db('PUT', 'rooms/' + room + '/meta/player', R.uid); })
          .then(function () { R.player = room; R.err = ''; store(); lastSent = ''; return sync(true); })
          .then(function () { d.close(); M.Remote.playerSheet(); startLoop(); })
          .catch(function (err) { b.disabled = false; msg.innerHTML = explain(err); });
      } else if (a === 'share') {
        var u = linkFor(R.player);
        if (navigator.share) navigator.share({ title: '말씨정원 원격 관리', text: '이 링크를 열면 말씨정원 원격 관리가 연결돼요', url: u }).catch(function () {});
        else copy(u);
      } else if (a === 'copy') copy(linkFor(R.player));
      else if (a === 'sync') { msg.textContent = '동기화하는 중…'; sync(true).then(function () { msg.innerHTML = R.err ? explain({ code: R.err }) : '동기화했어요'; }); }
      else if (a === 'off') M.confirm('연결 끊기', '남편 폰의 원격 관리가 더 이상 동작하지 않아요. 다시 연결하려면 새 링크를 만들어야 해요.', '끊기', function () { R.player = ''; store(); d.close(); }, true);
    });
  };
  function copy(t) {
    var done = function () { M.toast('링크를 복사했어요'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { fallback(); });
    else fallback();
    function fallback() { var x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); done(); } catch (e) {} x.remove(); }
  }

  // =====================================================================
  // 남편 폰(관리자)
  // =====================================================================
  var view = null;   // 열린 관리 창
  function fmtDate(t) { var d = new Date(t || 0); return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function joinRoom(room) {
    return token().then(function () { return db('PUT', 'rooms/' + room + '/meta/admin', R.uid); })
      .catch(function (e) {
        // 이미 이 폰이 관리자인 방이면 읽기가 된다
        return db('GET', 'rooms/' + room + '/meta').then(function (m) { if (!m || m.admin !== R.uid) throw e; });
      })
      .then(function () { R.admin = room; R.seen = 0; store(); });
  }
  M.Remote.joinRoom = joinRoom;
  function send(cmd) { cmd.at = Date.now(); return db('POST', 'rooms/' + R.admin + '/cmds', cmd); }
  M.Remote.adminPanel = function () {
    if (!R.admin) return M.Remote.joinSheet();
    if (view && view.isConnected) return;
    var tab = 'coupon', S = null, pend = {}, edits = null, base = [];
    var d = view = M.modal('<div class="admin"><h3>💌 원격 관리</h3><p class="rsub hint center">불러오는 중…</p><div class="tabs">' +
      [['coupon', '쿠폰 승인'], ['req', '신청 선물'], ['reward', '선물 관리'], ['praise', '칭찬 선물'], ['stats', '공부 현황'], ['etc', '설정']].map(function (t) { return '<button data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') +
      '</div><div class="abody"></div><button class="btn ghost wide" data-close>닫기</button></div>', { cls: 'full', onClose: function () { clearInterval(iv); view = null; } });
    var body = d.querySelector('.abody'), sub = d.querySelector('.rsub');
    var pendList = function () { return Object.keys(pend).map(function (k) { return pend[k]; }); };
    var isPend = function (t, id) { return pendList().some(function (c) { return c.t === t && c.id === id; }); };
    var T = {
      coupon: function () {
        var w = S.coupons.filter(function (c) { return c.status === 'wait' && !isPend('give', c.id) && !isPend('cancel', c.id); });
        var h = w.length ? w.map(function (c) {
          return '<div class="acoupon"><span class="ce">' + esc(c.e) + '</span><div class="an"><b>' + esc(c.name) + '</b><small>' + fmtDate(c.at) + ' · ' + M.fmt(c.price) + '점</small></div>' +
            '<button class="btn primary" data-x="give" data-id="' + esc(c.id) + '">지급 완료</button><button class="btn ghost" data-x="cancel" data-id="' + esc(c.id) + '">취소</button></div>';
        }).join('') + '<p class="hint">취소하면 쓴 꽃 포인트를 돌려줘요.</p>' : '<p class="hint center">기다리는 쿠폰이 없어요.</p>';
        var done = S.coupons.filter(function (c) { return c.status !== 'wait'; }).slice(-5).reverse();
        if (done.length) h += '<h4>지난 쿠폰</h4>' + done.map(function (c) { return '<div class="acoupon"><span class="ce">' + esc(c.e) + '</span><div class="an"><b>' + esc(c.name) + '</b><small>' + (c.status === 'done' ? '지급 완료 ' : '취소 ') + fmtDate(c.doneAt) + '</small></div></div>'; }).join('');
        return h;
      },
      req: function () {
        var rate = S.rate || 10, list = S.requests.filter(function (q) { return !isPend('qok', q.id) && !isPend('qno', q.id); });
        if (!list.length) return '<p class="hint center">신청한 선물이 없어요.</p>';
        return '<p class="hint">포인트는 가격 ÷ ' + rate + '원으로 계산했어요. 고쳐서 승인할 수 있어요.</p>' + list.map(function (q) {
          var link = /^https?:\/\/[^\s<>"']+$/i.test(q.link || '') ? q.link : '';
          return '<div class="acoupon req" data-qid="' + esc(q.id) + '"><span class="ce">' + esc(q.e) + '</span><div class="an"><b>' + esc(q.name) + '</b><small>' + (q.won ? M.fmt(q.won) + '원' : '가격 모름') + ' · ' + fmtDate(q.at) + (link ? ' · <a class="lnk" href="' + esc(link) + '" target="_blank" rel="noopener">🔗 링크</a>' : '') + '</small>' +
            '<label class="ptl">필요 포인트 <input class="qpts" type="number" inputmode="numeric" min="1" value="' + Math.max(1, Math.round((q.won || 3000) / rate)) + '"></label></div>' +
            '<button class="btn primary" data-x="qok" data-id="' + esc(q.id) + '">승인</button><button class="btn ghost" data-x="qno" data-id="' + esc(q.id) + '">거절</button></div>';
        }).join('');
      },
      reward: function () {
        var list = edits || S.rewards;
        return '<p class="hint">하루에 레슨 5판 정도 하면 꽃 포인트를 대략 25~35점 모아요.</p>' + list.map(function (r) {
          return '<div class="aedit" data-rid="' + esc(r.id) + '"><input class="ae" value="' + esc(r.e) + '" maxlength="4" aria-label="그림"><input class="an" value="' + esc(r.name) + '" maxlength="30" aria-label="이름"><input class="ap" type="number" inputmode="numeric" min="1" value="' + r.price + '" aria-label="가격"><button class="btn ghost" data-x="rdel" data-id="' + esc(r.id) + '">🗑</button></div>';
        }).join('') + '<div class="row2"><button class="btn" data-x="radd">+ 선물 추가</button><button class="btn primary" data-x="rsave">저장해서 보내기</button></div>';
      },
      praise: function () {
        return '<p>칭찬과 함께 꽃 포인트를 보내 보세요. 아내 폰에서 앱을 열면 선물 상자가 열려요.</p>' +
          '<label class="fld">꽃 포인트<input id="gAmt" type="number" inputmode="numeric" min="1" max="5000" value="20"></label>' +
          '<label class="fld">한마디<input id="gMsg" maxlength="60" value="오늘도 공부하느라 수고했어요!"></label>' +
          '<button class="btn primary wide" data-x="gift">선물 보내기</button>';
      },
      stats: function () {
        var mx = Math.max(1, Math.max.apply(null, S.days.map(function (x) { return x.l; })));
        return '<div class="astats"><div><b>' + S.streak + '일</b><small>연속 공부</small></div><div><b>' + S.best + '일</b><small>최고 기록</small></div><div><b>' + S.week + '/7</b><small>이번 주</small></div><div><b>' + S.lessons + '판</b><small>전체 레슨</small></div></div>' +
          '<h4>최근 2주 레슨 수</h4><div class="chart">' + S.days.map(function (x) { return '<div class="cb"><i style="height:' + Math.round(x.l / mx * 100) + '%"></i><span>' + (x.l || '') + '</span><small>' + (+String(x.d).slice(8)) + '</small></div>'; }).join('') + '</div>' +
          '<h4>익힌 단어</h4><div class="astats">' + ['ja', 'en', 'zh'].map(function (c) { var L = window.LANGS[c]; return '<div><b>' + ((S.learned || {})[c] || 0) + '개</b><small>' + L.flag + ' ' + L.name + '</small></div>'; }).join('') + '</div>' +
          '<p class="hint">보유 꽃 포인트 ' + M.fmt(S.fp) + '점 · 코인 ' + M.fmt(S.coins) + '</p>';
      },
      etc: function () {
        return '<label class="fld">꽃 포인트 1점 = 몇 원?<input id="wRate" type="number" inputmode="numeric" min="1" max="1000" value="' + (S.rate || 10) + '"></label>' +
          '<label class="fld">주간 목표(주 5일 공부) 보너스 꽃 포인트<input id="wBonus" type="number" inputmode="numeric" min="0" max="1000" value="' + (S.weekBonus || 0) + '"></label>' +
          '<button class="btn wide" data-x="saveW">저장해서 보내기</button>' +
          '<button class="btn danger wide" data-x="unlink">이 폰의 원격 관리 연결 끊기</button>';
      }
    };
    function collect() {
      if (tab !== 'reward' || !edits) return;
      Array.prototype.forEach.call(body.querySelectorAll('.aedit'), function (row) {
        var r = findBy(edits, row.dataset.rid); if (!r) return;
        r.e = row.querySelector('.ae').value.trim() || '🎁'; r.name = row.querySelector('.an').value.trim() || '선물'; r.price = Math.max(1, parseInt(row.querySelector('.ap').value, 10) || 1);
      });
    }
    function paint() {
      Array.prototype.forEach.call(d.querySelectorAll('[data-tab]'), function (b) {
        var n = b.dataset.tab === 'coupon' ? S && S.coupons.filter(function (c) { return c.status === 'wait' && !isPend('give', c.id) && !isPend('cancel', c.id); }).length : b.dataset.tab === 'req' ? S && S.requests.filter(function (q) { return !isPend('qok', q.id) && !isPend('qno', q.id); }).length : 0;
        b.classList.toggle('on', b.dataset.tab === tab); b.textContent = b.textContent.replace(/ 🔴$/, '') + (n ? ' 🔴' : '');
      });
      if (!S) return;
      var pl = pendList().length;
      sub.innerHTML = esc(S.pet || '') + ' · 마지막 소식 ' + fmtDate(S.at) + (pl ? '<br>아내 폰에 반영을 기다리는 요청 ' + pl + '개 (앱이 열려 있으면 곧 반영돼요)' : '');
      if (tab === 'reward' && document.activeElement && body.contains(document.activeElement)) return;   // 고치는 중에는 다시 그리지 않는다
      body.innerHTML = T[tab]();
    }
    function refresh() {
      return Promise.all([db('GET', 'rooms/' + R.admin + '/state'), db('GET', 'rooms/' + R.admin + '/cmds')]).then(function (a) {
        if (!a[0]) { sub.textContent = '아내 폰에서 아직 정보를 보내지 않았어요. 아내 폰에서 앱을 한 번 열어 주세요.'; return; }
        S = a[0]; S.coupons = S.coupons || []; S.requests = S.requests || []; S.rewards = S.rewards || []; S.days = S.days || [];
        pend = a[1] || {};
        R.seen = S.coupons.filter(function (c) { return c.status === 'wait'; }).length + S.requests.length; store();
        paint();
      }).catch(function (e) { sub.innerHTML = explain(e); });
    }
    var iv = setInterval(function () { if (document.visibilityState === 'visible') refresh(); }, 8000);
    refresh();
    d.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]'); if (t) { collect(); tab = t.dataset.tab; if (tab === 'reward' && S) { edits = JSON.parse(JSON.stringify(S.rewards)); base = S.rewards.map(function (r) { return r.id; }); } paint(); return; }
      var b = e.target.closest('[data-x]'); if (!b || !S) return;
      var x = b.dataset.x, id = b.dataset.id, cmd = null, ok = '';
      if (x === 'give') { cmd = { t: 'give', id: id }; ok = '지급 완료를 보냈어요'; }
      else if (x === 'cancel') { var c = findBy(S.coupons, id); M.confirm('쿠폰 취소', esc(c ? c.name : '') + ' 쿠폰을 취소하고 포인트를 돌려줄까요?', '취소하기', function () { go({ t: 'cancel', id: id }, '취소를 보냈어요'); }, true); return; }
      else if (x === 'qok') { var row = body.querySelector('[data-qid="' + id + '"] .qpts'); cmd = { t: 'qok', id: id, pts: Math.max(1, parseInt(row && row.value, 10) || 1) }; ok = '승인을 보냈어요'; }
      else if (x === 'qno') { cmd = { t: 'qno', id: id }; ok = '거절을 보냈어요'; }
      else if (x === 'radd') { collect(); edits.push({ id: 'r' + Date.now(), e: '🎁', name: '새 선물', price: 300 }); body.innerHTML = T.reward(); var l = body.querySelectorAll('.aedit .an'); if (l.length) { l[l.length - 1].focus(); l[l.length - 1].select(); } return; }
      else if (x === 'rdel') { collect(); edits = edits.filter(function (r) { return r.id !== id; }); body.innerHTML = T.reward(); return; }
      else if (x === 'rsave') { collect(); cmd = { t: 'rewards', list: edits, base: base }; ok = '선물 목록을 보냈어요'; S.rewards = JSON.parse(JSON.stringify(edits)); }
      else if (x === 'gift') { cmd = { t: 'gift', fp: Math.max(1, Math.min(5000, parseInt(body.querySelector('#gAmt').value, 10) || 0)), msg: body.querySelector('#gMsg').value.trim() || '수고했어요!' }; ok = '💝 칭찬 선물을 보냈어요'; }
      else if (x === 'saveW') { cmd = { t: 'settings', rate: parseInt(body.querySelector('#wRate').value, 10) || 10, weekBonus: parseInt(body.querySelector('#wBonus').value, 10) || 0 }; S.rate = cmd.rate; S.weekBonus = cmd.weekBonus; ok = '설정을 보냈어요'; }
      else if (x === 'unlink') { M.confirm('연결 끊기', '이 폰에서 원격 관리를 끊어요. 다시 하려면 아내 폰에서 새 링크를 만들어야 해요.', '끊기', function () { R.admin = ''; store(); d.close(); }, true); return; }
      if (cmd) go(cmd, ok);
    });
    function go(cmd, ok) {
      send(cmd).then(function (r) { if (r && r.name) pend[r.name] = cmd; M.toast(ok); M.sfx && M.sfx('pop'); if (tab === 'reward') { body.innerHTML = T.reward(); } paint(); })
        .catch(function (e) { M.toast('보내지 못했어요'); sub.innerHTML = explain(e); });
    }
  };
  // 남편 폰: 링크나 코드로 연결
  M.Remote.joinSheet = function (room) {
    var d = M.modal('<h3>💌 원격 관리 연결</h3><p>아내 폰의 <b>관리자 메뉴 › 설정 › 원격 관리 연결</b>에서 만든 링크를 열거나, 링크를 아래에 붙여 넣어 주세요.</p>' +
      '<label class="fld">연결 링크<input id="rjoin" value="' + esc(room ? linkFor(room) : '') + '" placeholder="https://…#remote=…"></label>' +
      '<p class="rmsg hint"></p><div class="row2"><button class="btn ghost" data-close>닫기</button><button class="btn primary" data-r="join">연결하기</button></div>');
    var msg = d.querySelector('.rmsg');
    d.addEventListener('click', function (e) {
      if (!e.target.closest('[data-r="join"]')) return;
      var r = roomFrom(d.querySelector('#rjoin').value);
      if (!r) { msg.textContent = '링크 모양이 맞지 않아요'; return; }
      if (r === R.player) { msg.textContent = '이 폰이 아내 폰이에요. 남편 폰에서 열어 주세요.'; return; }
      msg.textContent = '연결하는 중…';
      joinRoom(r).then(function () { d.close(); M.toast('💌 원격 관리가 연결됐어요'); M.Remote.adminPanel(); }).catch(function (err) { msg.innerHTML = explain(err); });
    });
    return d;
  };
  // 남편 폰: 새 쿠폰·신청이 있는지 가끔 확인해서 알려 준다
  function adminPeek() {
    if (!R.admin || (view && view.isConnected)) return;
    db('GET', 'rooms/' + R.admin + '/state').then(function (s) {
      if (!s) return;
      var n = (s.coupons || []).filter(function (c) { return c.status === 'wait'; }).length + (s.requests || []).length;
      if (n > (R.seen || 0)) M.toast('💌 아내가 새 쿠폰이나 선물 신청을 보냈어요 (설정 › 원격 관리)');
      M.Remote.waiting = n; R.seen = Math.min(R.seen || 0, n); store();
    }).catch(function () {});
  }

  // ---------- 시작 ----------
  var loopOn = false, saveT = 0;
  function startLoop() {
    if (loopOn) return; loopOn = true;
    setInterval(function () { if (document.visibilityState !== 'visible') return; if (R.player) sync(); }, 15000);
    setInterval(function () { if (document.visibilityState === 'visible') adminPeek(); }, 60000);
    document.addEventListener('visibilitychange', function () { if (R.player) sync(); if (document.visibilityState === 'visible') adminPeek(); });
    var save0 = M.save;   // 기록이 바뀌면 조금 뒤에 올린다
    M.save = function () { save0.apply(M, arguments); if (R.player) { clearTimeout(saveT); saveT = setTimeout(function () { sync(); }, 4000); } };
  }
  function fromHash() {
    var h = roomFrom((location.hash || '').indexOf('remote=') >= 0 ? location.hash : '');
    if (!h) return;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (h === R.admin) setTimeout(M.Remote.adminPanel, 300);
    else if (h === R.player) M.toast('이 폰이 아내 폰이에요. 링크는 남편 폰에서 열어 주세요.');
    else setTimeout(function () { M.Remote.joinSheet(h); }, 300);
  }
  M.Remote.start = function () {
    fromHash(); window.addEventListener('hashchange', fromHash);
    if (R.player || R.admin) { startLoop(); if (R.player) setTimeout(sync, 1500); if (R.admin) setTimeout(adminPeek, 2500); }
  };
})();
