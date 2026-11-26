// 가족 연결 (말씨정원): 아내 폰과 남편 폰을 잇는다. 폰마다 익명 계정이 자동으로 생기고, 처음 한 번만 핀 번호(6자리)로 같은 가족 방에 들어간다.
//  - 아내 폰은 공부 기록 요약을 올리고, 남편 폰이 보낸 승인·선물을 바로 반영한다.
//  - 둘 다 마을에 있으면 서로의 토끼가 보이고, 인사하거나 같이 놀 수 있다.
// Firebase Realtime Database 의 families/<가족>/ 아래에 쓴다. 가족 방의 식구만 읽고 쓸 수 있게 보안 규칙으로 막는다.
(function () {
  var M = window.M, esc = M.esc;
  var CFG = {
    apiKey: 'AIzaSyBypTxoZ9SWkGsPhwzykflH55MTuYHbKOI',
    authDomain: 'speak-garden.firebaseapp.com',
    databaseURL: 'https://speak-garden-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'speak-garden',
    appId: '1:257269885853:web:a7913d2156ad34ebb99d74'
  };
  var KEY = 'malssi-family';
  var L = load();   // { seen, asked }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) {} }
  M.Family = {};

  // ---------- 연결 도구 (자동 점검에서는 window.__FBMOCK 으로 바꿔 끼운다) ----------
  function realFx() {
    if (!window.firebase) return null;
    var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(CFG), auth = app.auth(), db = app.database();
    return {
      onUser: function (cb) { return auth.onAuthStateChanged(function (u) { cb(u ? { uid: u.uid } : null); }); },
      signIn: function () { return auth.signInAnonymously(); },
      get: function (p) { return db.ref(p).once('value').then(function (s) { return s.val(); }); },
      set: function (p, v) { return db.ref(p).set(v); },
      update: function (p, v) { return db.ref(p).update(v); },
      push: function (p, v) { var r = db.ref(p).push(); return r.set(v).then(function () { return r.key; }); },
      remove: function (p) { return db.ref(p).remove(); },
      on: function (p, cb) { var r = db.ref(p), h = function (s) { cb(s.val()); }; r.on('value', h, function (e) { M.Family.lastErr = e; }); return function () { r.off('value', h); }; },
      onDisconnectRemove: function (p) { try { db.ref(p).onDisconnect().remove(); } catch (e) {} },
      now: function () { return Date.now(); }
    };
  }
  var FX0 = window.__FBMOCK || realFx(), FX = null;
  if (FX0) {   // 'family/…' 경로는 지금 가족 방(families/<fid>/…)으로 바꿔 쓴다
    var map = function (p) { return p.indexOf('family/') === 0 ? 'families/' + F.fid + '/' + p.slice(7) : p; };
    FX = { onUser: FX0.onUser, now: FX0.now, signIn: FX0.signIn || function () { return Promise.resolve(); } };
    ['get', 'set', 'update', 'push', 'remove', 'on', 'onDisconnectRemove'].forEach(function (k) { FX[k] = function (p, v) { return FX0[k](map(p), v); }; });
  }
  M.Family.ok = !!FX;
  function explain(e) {
    var c = String((e && (e.code || e.message)) || '');
    if (/operation-not-allowed|admin-restricted|configuration/i.test(c)) return '파이어베이스 Authentication › 로그인 방법에서 "익명"을 사용 설정해 주세요.';
    if (/permission|denied|PERMISSION/i.test(c)) return '데이터베이스 규칙이 막았어요. 알려 드린 규칙을 그대로 넣었는지 확인해 주세요.';
    if (/nopin/.test(c)) return '핀 번호가 맞지 않거나 시간이 지났어요. 상대 폰에서 새 핀을 받아 주세요.';
    if (/network/i.test(c)) return '인터넷에 연결되지 않았어요.';
    return '연결하지 못했어요 (' + esc(c.slice(0, 80)) + ')';
  }
  M.Family.explain = explain;

  // ---------- 상태 ----------
  var F = { user: null, uid: '', fid: '', role: '', name: '', mateUid: '', mate: null, mateOnline: false, ready: false };
  function P(sub) { return 'families/' + F.fid + '/' + sub; }
  M.Family.state = function () { return F; };
  M.Family.isHusband = function () { return F.ready && F.role === 'husband'; };
  M.Family.mateName = function () { return F.mate ? F.mate.name || (F.mate.role === 'wife' ? '아내' : '남편') : ''; };
  var offs = [];
  function stopAll() { offs.forEach(function (f) { try { f(); } catch (e) {} }); offs = []; }

  function begin(u, err) {
    stopAll(); F.user = u; F.uid = u ? u.uid : ''; F.ready = false; F.mate = null; F.mateUid = ''; F.err = err || null;
    if (!u) { if (M.World && M.World.setMate) M.World.setMate(null); return; }
    F.fid = L.fid || '';
    if (!F.fid) return;   // 아직 가족 방에 들어가지 않았다 (설정 › 가족 연결)
    FX.get(P('members')).then(function (all) {
      all = all || {}; var me = all[F.uid];
      if (me && me.role) start(me, all); else { L.fid = ''; store(); F.fid = ''; }
    }).catch(function (e) { M.Family.lastErr = e; });
  }
  function newId(n, digits) { var a = new Uint8Array(n); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (x) { return digits ? String(x % 10) : ('0' + x.toString(36)).slice(-2); }).join(''); }
  function roleName(r) { return r === 'wife' ? '아내' : '남편'; }
  // 가족 방 만들기: 역할을 고르면 핀 번호가 나온다. 상대 폰이 핀을 넣고 들어오면 끝
  function createFamily(role, after) {
    var fid = newId(12), pin = newId(6, true), me = { role: role, name: roleName(role), at: FX.now() };
    F.fid = fid;
    return FX.set(P('members/' + F.uid), me)
      .then(function () { return FX.set('pins/' + pin, { fid: fid, by: F.uid, role: role, at: FX.now() }); })
      .then(function () {
        L.fid = fid; store();
        var d = M.modal('<div class="center"><h3>👨‍👩 가족 방을 만들었어요</h3><p>' + roleName(role === 'wife' ? 'husband' : 'wife') + ' 폰에서 <b>설정 › 가족 연결 › 핀 번호로 들어가기</b>를 누르고 이 번호를 넣어 주세요.</p><div class="fpin">' + pin.slice(0, 3) + ' ' + pin.slice(3) + '</div><p class="hint">15분 동안 쓸 수 있어요. 연결되면 이 창이 저절로 닫혀요.</p></div><button class="btn ghost wide" data-close>닫기</button>', { onClose: function () { off(); } });
        var off = FX.on(P('members'), function (v) {
          if (v && Object.keys(v).length >= 2 && d.isConnected) { FX.remove('pins/' + pin); d.close(); M.toast('💕 가족 연결이 끝났어요!'); M.sfx && M.sfx('win'); }
        });
        start(me, {}); if (after) after();
      });
  }
  function joinFamily(pin) {
    return FX.get('pins/' + pin).then(function (p) {
      if (!p || !p.fid || FX.now() - (p.at || 0) > 15 * 60000) { var e = new Error('nopin'); e.code = 'nopin'; throw e; }
      F.fid = p.fid;
      var role = p.role === 'wife' ? 'husband' : 'wife', me = { role: role, name: roleName(role), pin: pin, at: FX.now() };
      return FX.set(P('members/' + F.uid), me).then(function () { L.fid = p.fid; store(); return FX.get(P('members')); }).then(function (all) { start(me, all || {}); M.toast('💕 가족 연결이 끝났어요! 이 폰은 ' + roleName(role) + ' 폰이에요'); M.sfx && M.sfx('win'); });
    });
  }
  function start(me, all) {
    F.role = me.role; F.name = me.name; F.ready = true;
    // 접속 표시
    FX.set('family/online/' + F.uid, FX.now()); FX.onDisconnectRemove('family/online/' + F.uid);
    FX.onDisconnectRemove('family/presence/' + F.uid);
    offs.push(FX.on('family/members', function (v) {
      v = v || {}; var other = Object.keys(v).filter(function (k) { return k !== F.uid; })[0];
      F.mateUid = other || ''; F.mate = other ? v[other] : null;
      watchMate();
    }));
    offs.push(FX.on('family/game', onGame));
    offs.push(FX.on('family/inbox/' + F.uid, onInbox));
    if (F.role === 'wife') {
      offs.push(FX.on('family/cmds/' + F.uid, onCmds));
      setTimeout(pushState, 800);
    }
    if (M.World && M.World.announce) setTimeout(M.World.announce, 300);
  }
  var mateOffs = [], watching = '';
  function watchMate() {
    if (watching === F.mateUid) return; watching = F.mateUid;
    mateOffs.forEach(function (f) { f(); }); mateOffs = [];
    if (!F.mateUid) return;
    mateOffs.push(FX.on('family/online/' + F.mateUid, function (v) { F.mateOnline = !!v && FX.now() - v < 36 * 3600 * 1000; }));
    mateOffs.push(FX.on('family/presence/' + F.mateUid, function (v) {
      var fresh = v && v.place === 'village' && FX.now() - (v.at || 0) < 120000;
      if (fresh && F.role === 'husband' && !M.visiting) fresh = false;   // 남편 폰은 아내 마을에 들어갔을 때만 아내가 보인다
      if (M.World && M.World.setMate) M.World.setMate(fresh ? { x: v.x, y: v.y, d: v.d, stage: v.stage || 1, av: v.av || '', rd: v.rd, name: v.av === 'raccoon' ? M.Family.mateName() + ' 너구리' : M.Family.mateName() } : null);
      lastMateP = v;
    }));
    var lastEmote = 0;
    mateOffs.push(FX.on('family/emote/' + F.mateUid, function (v) {
      if (!v || v.at <= lastEmote) return; lastEmote = v.at;
      if (FX.now() - v.at > 15000) return;
      if (M.World && M.World.emote) M.World.emote('mate', v.t, v.k);
      if (v.t === '💕') { M.sfx && M.sfx('pop'); M.fxFloat('fx-hearts', 120); }
    }));
    if (F.role === 'husband') mateOffs.push(FX.on('family/state/' + F.mateUid, function (s) {
      if (!s) return;
      var n = (s.coupons || []).filter(function (c) { return c.status === 'wait'; }).length + (s.requests || []).length;
      if (n > (L.seen || 0) && !(view && view.isConnected)) M.toast('💌 ' + M.j(M.Family.mateName(), '이', '가') + ' 새 쿠폰이나 선물 신청을 보냈어요 (설정 › 원격 관리)');
      M.Family.waiting = n; L.seen = Math.min(L.seen || 0, n); store();
    }));
  }
  M.Family.mateOnline = function () { return F.mateOnline; };
  // ---------- 선물 주고받기 (채집물·물고기·요리) ----------
  M.Family.canGift = function () { return F.ready && !!F.mateUid; };
  function giftInfo(g) {
    if (g.k === 'item') { var it = M.GATHER.ITEMS[g.id]; return it && { name: it.ko, img: it.img }; }
    if (g.k === 'fish') { var f = (M.FISH || []).filter(function (x) { return x.id === g.id; })[0]; return f && { name: f.ko, img: 'img/w/fish-' + f.id + '.png' }; }
    if (g.k === 'dish') { var nm = M.recipeName && M.recipeName(g.id); return nm && { name: nm, img: 'img/w/dish-' + g.id + '.png' }; }
  }
  M.Family.sendGift = function (g) {
    if (!M.Family.canGift()) return false;
    var P = M.P, info = giftInfo(g); if (!info) return false;
    if (g.k === 'item') { if (!(P.gather.bag[g.id] > 0)) return false; P.gather.bag[g.id]--; }
    else if (g.k === 'fish') { if (!((P.fishBag || {})[g.id] > 0)) return false; P.fishBag[g.id]--; }
    else if (g.k === 'dish') { var x = P.extra; if (!(x.dishes[g.id] > 0)) return false; x.dishes[g.id]--; }
    M.save();
    FX.push('family/inbox/' + F.mateUid, { k: g.k, id: g.id, from: F.name || '', at: FX.now() });
    M.toast('💌 ' + M.j(info.name, '을', '를') + ' ' + M.Family.mateName() + '에게 보냈어요'); M.fxFloat('fx-hearts', 110); M.sfx && M.sfx('pop');
    return true;
  };
  function onInbox(v) {
    if (!v) return;
    Object.keys(v).forEach(function (id) {
      var g = v[id], info = g && giftInfo(g); FX.remove('family/inbox/' + F.uid + '/' + id); if (!info) return;
      var P = M.P;
      if (g.k === 'item') { P.gather = P.gather || { bag: {}, dex: {} }; P.gather.bag[g.id] = (P.gather.bag[g.id] || 0) + 1; P.gather.dex[g.id] = (P.gather.dex[g.id] || 0) + 1; }
      else if (g.k === 'fish') { P.fishBag = P.fishBag || {}; P.fishBag[g.id] = (P.fishBag[g.id] || 0) + 1; }
      else if (g.k === 'dish') { P.extra = P.extra || { mailDay: '', mail: [], dishes: {}, fed: {}, fedDay: '', marketBought: {} }; P.extra.dishes = P.extra.dishes || {}; P.extra.dishes[g.id] = (P.extra.dishes[g.id] || 0) + 1; }
      M.save();
      M.fxPop({ bg: 'fx-hearts', img: info.img, title: '💌 ' + M.Family.mateName() + '의 선물: ' + info.name, sub: g.k === 'dish' ? '요리 화면에서 먹거나 주민에게 줄 수 있어요' : '가방에 넣었어요', ms: 3000 });
      if (M.recipeCheck) setTimeout(M.recipeCheck, 3200);
    });
  }
  var lastMateP = null;
  // 남편: 너구리 모습으로 아내 마을에 들어간다 (주민 수도 아내 마을과 같게 보인다)
  M.Family.visit = function (on) {
    if (!F.ready || F.role !== 'husband') return;
    M.visiting = !!on;
    if (on) FX.get('family/state/' + F.mateUid).then(function (s) { M.visitLv = (s && s.glv) || 1; M.inVillage = false; if (M.World && M.World.resetNpcs) M.World.resetNpcs(); M.go('garden'); M.render(); if (lastMateP) { var v = lastMateP; if (v.place === 'village' && FX.now() - v.at < 120000 && M.World.setMate) M.World.setMate({ x: v.x, y: v.y, d: v.d, stage: v.stage || 1, name: M.Family.mateName() }); } M.toast('🦝 너구리가 되어 ' + M.Family.mateName() + '의 마을에 왔어요'); });
    else { M.visitLv = 0; if (M.World) { M.World.setMate(null); if (M.World.resetNpcs) M.World.resetNpcs(); } M.render(); M.toast('내 마을로 돌아왔어요'); }
    lastPos = ''; if (M.World && M.World.announce) setTimeout(M.World.announce, 400);
  };

  // ---------- 아내 폰: 기록 올리기, 명령 반영 ----------
  var lastSent = '', pushT = 0;
  function pushState() {
    if (!F.ready || F.role !== 'wife') return;
    var s = snapshot(), j = JSON.stringify(s); if (j === lastSent) return;
    s.at = FX.now(); FX.set('family/state/' + F.uid, s).then(function () { lastSent = j; }).catch(function (e) { M.Family.lastErr = e; });
  }
  M.Family.pushState = pushState;
  function onCmds(v) {
    if (!v) return;
    var ids = Object.keys(v).sort(function (a, b) { return ((v[a] || {}).at || 0) - ((v[b] || {}).at || 0); });
    ids.forEach(function (id) { apply(v[id]); FX.remove('family/cmds/' + F.uid + '/' + id); });
    if (ids.length) { M.save(); if (M.paintTop) M.paintTop(); if (M.render && !document.querySelector('.dim')) M.render(); setTimeout(pushState, 300); }
    showGiftsLater();
  }

  // ---------- 마을에서 만나기 ----------
  var posT = 0, lastPos = '', inVillage = false, beatT = 0;
  M.Family.myPos = function (x, y, d, rd) {
    if (!F.ready) return;
    inVillage = true;
    var k = x + ',' + y + ',' + d, now = FX.now(); if (k === lastPos && now - posT < 25000) return;
    if (rd && now - posT < 250) return;   // 자전거로 달릴 때는 너무 자주 보내지 않는다
    lastPos = k; posT = now;
    FX.set('family/presence/' + F.uid, { x: x, y: y, d: d || 'down', stage: M.petStage ? M.petStage() : 1, place: M.visiting ? 'village' : (F.role === 'husband' ? 'own' : 'village'), av: M.visiting ? 'raccoon' : '', rd: !!rd, at: now });
    clearTimeout(beatT); beatT = setTimeout(function () { if (inVillage) { lastPos = ''; M.Family.myPos(x, y, d); } }, 30000);
  };
  M.Family.leaveVillage = function () {
    if (!F.ready || !inVillage) return; inVillage = false; lastPos = ''; clearTimeout(beatT);
    FX.update('family/presence/' + F.uid, { place: '', at: FX.now() });
  };
  M.Family.emote = function (t, k) {
    if (!F.ready) return;
    FX.set('family/emote/' + F.uid, { t: t, k: k || '', at: FX.now() });
    if (M.World && M.World.emote) M.World.emote('me', t, k);
  };
  var HELLO = { ja: ['やっほー！', '안녕!'], en: ['Hi there!', '안녕!'], zh: ['你好呀！', '안녕!'] };
  M.Family.mateSheet = function () {
    var nm = M.Family.mateName(), lang = M.P.lang, h = HELLO[lang] || HELLO.en;
    var d = M.modal('<h3>💕 ' + esc(nm) + '</h3><p class="hint">' + esc(nm) + '도 지금 마을에 있어요.</p>' +
      '<div class="row2"><button class="btn" data-m="hi">👋 ' + esc(h[0]) + '</button><button class="btn" data-m="heart">💕 하트</button></div>' +
      (M.hmarket && M.hmarket() && F.role === 'wife' ? '<button class="btn primary wide" data-m="shop">🦝 특별 장터 보기</button>' : '') +
      '<button class="btn primary wide" data-m="quiz">⚡ 같이 놀기: 단어 빨리 맞히기</button><button class="btn primary wide" data-m="pairs">🃏 같이 놀기: 둘이서 짝 맞추기</button><button class="btn primary wide" data-m="bugs">🪲 같이 놀기: 곤충 배틀</button>' +
      '<button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return; var m = b.dataset.m;
      if (m === 'hi') { M.Family.emote(h[0], h[1]); M.say(h[0], lang); d.close(); }
      else if (m === 'heart') { M.Family.emote('💕', ''); M.fxFloat('fx-hearts', 120); d.close(); }
      else if (m === 'shop') { d.close(); M.marketSheet(); }
      else { d.close(); invite(m); }
    });
  };

  // ---------- 설정 화면 ----------
  M.Family.sheet = function () {
    if (!FX) { M.modal('<h3>👨‍👩 가족 연결</h3><p>연결 도구를 불러오지 못했어요. 인터넷을 확인하고 앱을 다시 열어 주세요.</p><button class="btn ghost wide" data-close>닫기</button>'); return; }
    var nm = M.Family.mateName();
    var body = !F.ready ? '<p>아내 폰과 남편 폰을 처음 한 번만 이어 주세요. 그다음부터는 앱을 열면 자동으로 이어져요.</p>' +
        '<ol class="unl"><li>한쪽 폰에서 <b>가족 방 만들기</b>를 누르면 6자리 핀 번호가 나와요.</li><li>다른 폰에서 <b>핀 번호로 들어가기</b>를 누르고 그 번호를 넣으면 끝이에요.</li></ol>' +
        '<button class="btn primary wide" data-f="mk-wife">👩 아내 폰으로 가족 방 만들기</button><button class="btn primary wide" data-f="mk-husband">👨 남편 폰으로 가족 방 만들기</button>' +
        '<button class="btn wide" data-f="join">🔢 핀 번호로 들어가기</button>'
      : '<p>' + (F.role === 'wife' ? '👩 아내' : '👨 남편') + ' 폰으로 연결됐어요</p>' +
        (F.mateUid ? '<p>' + (F.role === 'wife' ? '👨 ' : '👩 ') + esc(nm) + ' · ' + (F.mateOnline ? '🟢 접속 중' : '⚪ 쉬는 중') + '</p>' : '<p class="hint">상대 폰이 아직 들어오지 않았어요.</p><button class="btn wide" data-f="repin">🔢 새 핀 번호 받기</button>') +
        (F.role === 'husband' && F.mateUid ? '<button class="btn primary wide" data-f="admin">💌 ' + esc(nm) + ' 원격 관리' + (M.Family.waiting ? ' 🔴' : '') + '</button><button class="btn primary wide" data-f="visit">' + (M.visiting ? '🏠 내 마을로 돌아가기' : '🦝 너구리로 ' + esc(nm) + ' 마을 가기') + '</button>' : '') +
        (F.mateUid ? '<button class="btn wide" data-f="quiz">⚡ 같이 놀기: 단어 빨리 맞히기</button><button class="btn wide" data-f="pairs">🃏 같이 놀기: 둘이서 짝 맞추기</button><button class="btn wide" data-f="bugs">🪲 같이 놀기: 곤충 배틀</button>' : '') +
        '<button class="btn ghost wide" data-f="leave">이 폰의 가족 연결 끊기</button>';
    var d = M.modal('<h3>👨‍👩 가족 연결</h3>' + body + '<p class="fmsg hint"></p><button class="btn ghost wide" data-close>닫기</button>');
    var msg = d.querySelector('.fmsg');
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return; var a = b.dataset.f;
      if (a === 'mk-wife' || a === 'mk-husband') { b.disabled = true; msg.textContent = '방을 만드는 중…'; ensureUser().then(function () { return createFamily(a.slice(3), function () { d.close(); }); }).catch(function (err) { b.disabled = false; msg.innerHTML = explain(err); }); }
      else if (a === 'repin') { var pin = newId(6, true); FX.set('pins/' + pin, { fid: F.fid, by: F.uid, role: F.role, at: FX.now() }).then(function () { msg.innerHTML = '상대 폰에서 이 번호를 넣어 주세요<div class="fpin">' + pin.slice(0, 3) + ' ' + pin.slice(3) + '</div>'; }); }
      else if (a === 'join') { msg.textContent = '준비하는 중…'; ensureUser().then(function () { d.close(); pinPad(); }).catch(function (err) { msg.innerHTML = explain(err); }); }
      else if (a === 'leave') M.confirm('가족 연결 끊기', '이 폰은 가족 방에서 나가요. 다시 이으려면 핀 번호가 필요해요.', '끊기', function () { M.Family.leaveVillage(); FX.remove('family/members/' + F.uid); stopAll(); L.fid = ''; store(); F.fid = ''; F.ready = false; F.mateUid = ''; F.mate = null; if (M.World && M.World.setMate) M.World.setMate(null); d.close(); }, true);
      else if (a === 'admin') { d.close(); M.Family.adminPanel(); }
      else if (a === 'visit') { d.close(); M.Family.visit(!M.visiting); }
      else { d.close(); invite(a); }
    });
  };
  // 이 폰의 익명 계정이 없으면 만든다 (가족 연결을 처음 쓸 때만)
  function ensureUser() {
    if (F.user) return Promise.resolve(F.user);
    return new Promise(function (res, rej) {
      var done = false, t = setInterval(function () { if (F.user && !done) { done = true; clearInterval(t); res(F.user); } }, 200);
      FX.signIn().catch(function (e) { done = true; clearInterval(t); rej(e); });
      setTimeout(function () { if (!done) { done = true; clearInterval(t); rej(new Error('network')); } }, 15000);
    });
  }
  function pinPad() {
    var v = '';
    var d = M.modal('<h3>🔢 핀 번호로 들어가기</h3><p class="hint">상대 폰에 나온 6자리 번호를 넣어 주세요</p><div class="fpin" id="fpIn">___ ___</div><p class="fmsg hint center"></p><div class="pad">' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9, '취소', 0, '⌫'].map(function (k) { return '<button data-k="' + k + '">' + k + '</button>'; }).join('') + '</div>');
    var paint = function () { d.querySelector('#fpIn').textContent = (v + '______').slice(0, 6).replace(/(...)(...)/, '$1 $2'); };
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b) return; var k = b.dataset.k;
      if (k === '취소') { d.close(); return; }
      if (k === '⌫') v = v.slice(0, -1); else if (v.length < 6) v += k;
      paint();
      if (v.length === 6) { d.querySelector('.fmsg').textContent = '들어가는 중…'; joinFamily(v).then(function () { d.close(); }).catch(function (err) { v = ''; paint(); d.querySelector('.fmsg').innerHTML = explain(err); }); }
    });
  }
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
      rate: P.admin.rate || 10, weekBonus: P.admin.weekBonus || 0, glv: (P.garden && P.garden.lv) || 1,
      bag: (function () { var b = (P.gather && P.gather.bag) || {}, o = {}; Object.keys(b).filter(function (k) { return b[k] > 0 && k !== 'recipe'; }).sort(function (a, c) { return b[c] - b[a]; }).slice(0, 40).forEach(function (k) { o[k] = b[k]; }); return o; })(),
      owned: Object.keys((P.room && P.room.owned) || {}),
      inv: { item: (P.gather && P.gather.bag) || {}, seed: (P.pots && P.pots.seeds) || {}, pan: P.pantry || {}, bait: P.bait || {} },
      hmarket: M.hmarket ? M.hmarket() : null
    };
  }
  var giftWait = [];
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
    } else if (c.t === 'market' && M.hmarketOpen) {
      M.hmarketOpen(c);
    } else if (c.t === 'marketClose' && M.hmarketOpen) {
      M.hmarketOpen(null);
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

  var view = null;   // 열린 관리 창
  function fmtDate(t) { var d = new Date(t || 0); return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  M.Family.adminPanel = function () {
    if (!F.mateUid || F.role !== 'husband') return M.Family.sheet();
    if (view && view.isConnected) return;
    var tab = 'coupon', S = null, pend = {}, edits = null, base = [], mkState = { cat: 'item', lack: true, q: '', pick: {}, msg: '오늘만 특별가! 너굴너굴~' };
    var d = view = M.modal('<div class="admin"><h3>💌 원격 관리</h3><p class="rsub hint center">불러오는 중…</p><div class="tabs">' +
      [['coupon', '쿠폰 승인'], ['req', '신청 선물'], ['market', '🦝 장터'], ['reward', '선물 관리'], ['praise', '칭찬 선물'], ['stats', '공부 현황'], ['etc', '설정']].map(function (t) { return '<button data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') +
      '</div><div class="abody"></div><button class="btn ghost wide" data-close>닫기</button></div>', { cls: 'full', onClose: function () { offs.forEach(function (f) { f(); }); view = null; } });
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
      market: function () {
        var hm = S.hmarket, inv = S.inv || {}, I = (M.GATHER && M.GATHER.ITEMS) || {}, mk = mkState;
        var cur = hm ? '<div class="hmcur"><b>🦝 지금 장터가 열려 있어요</b><small>' + fmtDate(hm.until) + '까지 · 팔린 것 ' + (hm.sold || 0) + '개 · 사 준 것 ' + (hm.bought || 0) + '개</small><button class="btn ghost" data-x="mclose">장터 닫기</button></div>' : '';
        var cats = [['furn', '🛋️ 가구'], ['item', '🧺 재료'], ['seed', '🌱 씨앗'], ['pan', '🧂 양념'], ['bait', '🪱 미끼'], ['buy', '💰 사 주기']];
        var rows = [], have = function (k, id) { return ((inv[k] || {})[id]) || 0; };
        if (mk.cat === 'furn') (M.FURN || []).forEach(function (f) { if ((S.owned || []).indexOf(f.id) < 0) rows.push({ k: 'furn', id: f.id, img: 'img/furn-' + f.id + '.png', name: f.name, base: f.price, have: 0, n: 1 }); });
        if (mk.cat === 'item' || mk.cat === 'buy') Object.keys(I).forEach(function (id) { var it = I[id]; if (id === 'recipe') return; var h = have('item', id); if (mk.cat === 'buy' && !h) return; rows.push({ k: 'item', id: id, img: it.img, name: it.ko, base: it.price, have: h, cat: it.cat }); });
        if (mk.cat === 'seed') Object.keys(M.SEEDS || {}).forEach(function (id) { var sd = M.SEEDS[id]; rows.push({ k: 'seed', id: id, img: sd.img ? 'img/w/fruit-' + id + '.png' : '', em: sd.fruit, name: sd.name + ' 씨앗', base: sd.price, have: have('seed', id) }); });
        if (mk.cat === 'pan') Object.keys(M.PANTRY || {}).forEach(function (id) { var r = M.PANTRY[id]; rows.push({ k: 'pan', id: id, img: 'img/w/pan-' + id + '.png', name: r[0], base: r[2], have: have('pan', id) }); });
        if (mk.cat === 'bait') Object.keys(M.BAITS || {}).forEach(function (id) { if (id === 'fish') return; var B = M.BAITS[id]; rows.push({ k: 'bait', id: id, em: B.em, name: B.name, base: B.price, have: have('bait', id) }); });
        if (mk.lack && mk.cat !== 'buy') rows = rows.filter(function (r) { return !r.have; });
        if (mk.q) rows = rows.filter(function (r) { return r.name.indexOf(mk.q) >= 0; });
        var buy = mk.cat === 'buy';
        return cur + '<p class="hint">너구리 상인이 되어 ' + esc(M.Family.mateName()) + '의 마을 광장에 특별 장터를 열어요. 고른 물건은 아래 "장터 열기"를 누를 때 함께 올라가요 (지금 ' + Object.keys(mk.pick).length + '개 고름).</p>' +
          '<div class="fcats">' + cats.map(function (c) { return '<button data-mc="' + c[0] + '" class="' + (mk.cat === c[0] ? 'on' : '') + '">' + c[1] + '</button>'; }).join('') + '</div>' +
          '<div class="hmtools"><input id="hmQ" placeholder="이름 찾기" value="' + esc(mk.q || '') + '">' + (buy ? '' : '<label><input type="checkbox" id="hmLack"' + (mk.lack ? ' checked' : '') + '> 없는 것만</label>') + '</div>' +
          '<div class="hmlist">' + (rows.length ? rows.slice(0, 120).map(function (r) {
            var key = (buy ? 'buy:' : r.k + ':') + r.id, p = mk.pick[key];
            return '<div class="hmrow" data-key="' + key + '"><input type="checkbox" class="hmc"' + (p ? ' checked' : '') + '>' + (r.img ? '<img src="' + r.img + '" alt="">' : '<span class="hme">' + r.em + '</span>') +
              '<span>' + esc(r.name) + '<small>원래 ' + r.base + (r.k === 'furn' ? '' : ' · 가진 것 ' + r.have) + '</small></span>' +
              '<input type="number" inputmode="numeric" class="hmp" value="' + (p ? p.price : buy ? r.base * 3 : Math.max(1, Math.round(r.base / 2))) + '" title="값">' +
              (r.k === 'furn' ? '<span></span>' : '<input type="number" inputmode="numeric" class="hmn" value="' + (p ? p.n : buy ? Math.min(5, r.have) : 5) + '" title="개수">') + '</div>';
          }).join('') : '<p class="hint center">해당하는 물건이 없어요</p>') + '</div>' +
          '<label class="fld">너구리 한마디<input id="hmMsg" maxlength="50" value="' + esc(mk.msg) + '"></label>' +
          '<label class="sel"><span>여는 기간</span><select id="hmDays"><option value="1">오늘 하루</option><option value="3">3일</option><option value="7">일주일</option></select></label>' +
          '<button class="btn primary wide" data-x="mopen">🦝 장터 열기 (' + Object.keys(mk.pick).length + '개)</button>';
      },
      etc: function () {
        return '<label class="fld">꽃 포인트 1점 = 몇 원?<input id="wRate" type="number" inputmode="numeric" min="1" max="1000" value="' + (S.rate || 10) + '"></label>' +
          '<label class="fld">주간 목표(주 5일 공부) 보너스 꽃 포인트<input id="wBonus" type="number" inputmode="numeric" min="0" max="1000" value="' + (S.weekBonus || 0) + '"></label>' +
          '<button class="btn wide" data-x="saveW">저장해서 보내기</button>' +
          ''; 
      }
    };
    function mkCollect() {
      if (tab !== 'market') return;
      var m = body.querySelector('#hmMsg'); if (m) mkState.msg = m.value.trim();
      var q = body.querySelector('#hmQ'); if (q) mkState.q = q.value.trim();
      Array.prototype.forEach.call(body.querySelectorAll('.hmrow'), function (r) {
        var key = r.dataset.key, on = r.querySelector('.hmc').checked;
        if (!on) { delete mkState.pick[key]; return; }
        var pv = Math.max(1, parseInt(r.querySelector('.hmp').value, 10) || 1), nv = r.querySelector('.hmn') ? Math.max(1, parseInt(r.querySelector('.hmn').value, 10) || 1) : 1;
        mkState.pick[key] = { price: pv, n: nv };
      });
    }
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
      if ((tab === 'reward' || tab === 'market') && document.activeElement && body.contains(document.activeElement)) return;   // 고치는 중에는 다시 그리지 않는다
      if (tab === 'market') mkCollect();
      body.innerHTML = T[tab]();
    }
    var offs = [
      FX.on('family/state/' + F.mateUid, function (v) {
        if (!v) { sub.textContent = '아내 폰에서 아직 정보를 보내지 않았어요. 아내 폰에서 앱을 한 번 열어 주세요.'; return; }
        S = v; S.coupons = S.coupons || []; S.requests = S.requests || []; S.rewards = S.rewards || []; S.days = S.days || [];
        L.seen = S.coupons.filter(function (c) { return c.status === 'wait'; }).length + S.requests.length; store();
        paint();
      }),
      FX.on('family/cmds/' + F.mateUid, function (v) { pend = v || {}; if (S) paint(); })
    ];
    d.addEventListener('change', function (e) { if (e.target.id === 'hmQ') { mkCollect(); body.innerHTML = T.market(); } });
    d.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]'); if (t) { collect(); mkCollect(); tab = t.dataset.tab; if (tab === 'reward' && S) { edits = JSON.parse(JSON.stringify(S.rewards)); base = S.rewards.map(function (r) { return r.id; }); } paint(); return; }
      var mc = e.target.closest('[data-mc]'); if (mc) { mkCollect(); mkState.cat = mc.dataset.mc; body.innerHTML = T.market(); return; }
      if (e.target.id === 'hmLack') { mkCollect(); mkState.lack = e.target.checked; body.innerHTML = T.market(); return; }
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
      else if (x === 'mopen') {
        mkCollect();
        var sell = [], buy = [];
        Object.keys(mkState.pick).forEach(function (key) { var p = mkState.pick[key], kk = key.split(':'); if (kk[0] === 'buy') buy.push({ id: kk[1], price: p.price, n: p.n }); else sell.push({ k: kk[0], id: kk[1], price: p.price, n: p.n }); });
        if (!sell.length && !buy.length) { M.toast('팔 물건이나 사 줄 물건을 하나 이상 골라 주세요'); return; }
        var days = parseInt(body.querySelector('#hmDays').value, 10) || 1, end = new Date(); end.setHours(23, 59, 0, 0); end.setDate(end.getDate() + days - 1);
        cmd = { t: 'market', sell: sell, buy: buy, until: end.getTime(), msg: mkState.msg.slice(0, 50) }; ok = '🦝 장터를 열었어요'; mkState.pick = {};
      }
      else if (x === 'mclose') { cmd = { t: 'marketClose' }; ok = '장터를 닫았어요'; }
      else if (x === 'saveW') { cmd = { t: 'settings', rate: parseInt(body.querySelector('#wRate').value, 10) || 10, weekBonus: parseInt(body.querySelector('#wBonus').value, 10) || 0 }; S.rate = cmd.rate; S.weekBonus = cmd.weekBonus; ok = '설정을 보냈어요'; }
      if (cmd) go(cmd, ok);
    });
    function go(cmd, ok) {
      cmd.at = Date.now();
      FX.push('family/cmds/' + F.mateUid, cmd).then(function () { M.toast(ok); M.sfx && M.sfx('pop'); if (tab === 'reward') { body.innerHTML = T.reward(); } paint(); })
        .catch(function (e) { M.toast('보내지 못했어요'); sub.innerHTML = explain(e); });
    }
  };
  // 남편 폰: 링크나 코드로 연결
  // ---------- 같이 하는 놀이 ----------
  // family/game 하나에 놀이 상태를 두고 두 폰이 함께 본다. 초대한 쪽(host)이 문제를 만들고 판정한다.
  var GNAME = { quiz: '⚡ 단어 빨리 맞히기', pairs: '🃏 둘이서 짝 맞추기', bugs: '🪲 곤충 배틀' };
  function pool(n) {
    var lang = M.P.lang, ok = function (it) { return it.k && it.t && it.t.length <= 12 && !it.kana; };
    var src = (M.learnedItems ? M.learnedItems(lang) : []).filter(ok);
    if (src.length < n) window.LANGS[lang].stages.forEach(function (st) { if (!st.kana && !st.gram && src.length < n * 3) src = src.concat(st.items.filter(ok)); });
    var seen = {}, out = [];
    M.shuffle(src).forEach(function (it) { if (out.length < n && !seen[it.k] && !seen[it.t]) { seen[it.k] = seen[it.t] = 1; out.push({ t: it.t, k: it.k, say: it.say || it.t, lang: it.lang || lang, r: it.r || '' }); } });
    return out;
  }
  function invite(type) {
    if (!F.ready || !F.mateUid) { M.toast('상대 폰이 아직 연결되지 않았어요'); return; }
    var g = { id: 'g' + FX.now(), type: type, host: F.uid, guest: F.mateUid, status: 'invite', at: FX.now(), lang: M.P.lang, scores: {} };
    g.scores[F.uid] = 0; g.scores[F.mateUid] = 0;
    if (type === 'quiz') {
      var ws = pool(14);
      g.qs = ws.slice(0, 10).map(function (w) {
        var opts = M.shuffle([w.k].concat(M.shuffle(ws.filter(function (x) { return x.k !== w.k; })).slice(0, 3).map(function (x) { return x.k; })));
        return { t: w.t, r: w.r, say: w.say, lang: w.lang, opts: opts, a: opts.indexOf(w.k) };
      });
      g.r = 0;
    } else if (type === 'bugs') {
      g.phase = 'pick'; g.bugs = {}; g.r = 0;
    } else {
      var six = pool(6), cards = [];
      six.forEach(function (w, i) { cards.push({ p: i, side: 'w', t: w.t, say: w.say, lang: w.lang }); cards.push({ p: i, side: 'k', t: w.k }); });
      g.cards = M.shuffle(cards); g.open = {}; g.flip = []; g.turn = F.mateUid; g.flips = 0;   // 초대받은 쪽이 먼저
    }
    FX.set('family/game', g).then(function () { M.toast('💌 ' + M.Family.mateName() + '에게 같이 놀자고 했어요'); }).catch(function (e) { M.toast(explain(e)); });
  }
  M.Family.invite = invite;
  var G = null, askDlg = null, waitDlg = null, lastR = -1, resolved = {}, roundT = 0, seenFlip = '';
  function closeDlg(d) { if (d && d.close) d.close(); }
  function onGame(g) {
    G = g;
    if (!g || (g.host !== F.uid && g.guest !== F.uid)) { closeDlg(askDlg); closeDlg(waitDlg); closeCoop(); return; }
    var fresh = FX.now() - (g.at || 0) < 90000;
    if (g.status === 'invite') {
      if (!fresh) return;
      if (g.guest === F.uid && !(askDlg && askDlg.isConnected)) {
        askDlg = M.modal('<div class="center"><div class="tbig">💌</div><h3>' + esc(M.j(M.Family.mateName(), '이', '가')) + ' 같이 놀재요!</h3><p>' + GNAME[g.type] + '</p></div><div class="row2"><button class="btn ghost" data-g="no">다음에</button><button class="btn primary" data-g="yes">좋아요!</button></div>', { sticky: true });
        askDlg.addEventListener('click', function (e) {
          var b = e.target.closest('[data-g]'); if (!b) return; closeDlg(askDlg);
          FX.update('family/game', { status: b.dataset.g === 'yes' ? 'play' : 'cancel', at: FX.now() });
        });
        M.sfx && M.sfx('pop');
      }
      if (g.host === F.uid && !(waitDlg && waitDlg.isConnected)) {
        waitDlg = M.modal('<div class="center"><div class="tbig">⏳</div><h3>' + esc(M.Family.mateName()) + '의 대답을 기다리는 중…</h3><p>' + GNAME[g.type] + '</p></div><button class="btn ghost wide" data-g="cancel">취소</button>', { sticky: true });
        waitDlg.addEventListener('click', function (e) { if (e.target.closest('[data-g]')) { closeDlg(waitDlg); FX.update('family/game', { status: 'cancel', at: FX.now() }); } });
      }
      return;
    }
    closeDlg(askDlg); closeDlg(waitDlg);
    if (g.status === 'cancel') { if (fresh && g.host === F.uid && !g.quit) M.toast(M.j(M.Family.mateName(), '이', '가') + ' 다음에 하재요'); if (g.quit && g.quit !== F.uid && $('coop')) M.toast(M.j(M.Family.mateName(), '이', '가') + ' 놀이를 그만뒀어요'); closeCoop(); return; }
    if (g.status === 'play' || g.status === 'end') { openCoop(g); if (g.type === 'quiz') quiz(g); else if (g.type === 'bugs') bugs(g); else pairs(g); }
  }
  function $(id) { return document.getElementById(id); }
  function openCoop(g) {
    if ($('coop')) return;
    var el = document.createElement('div'); el.id = 'coop'; el.className = 'mgame coop';
    el.innerHTML = '<div class="mhead"><button class="ib" id="cQuit" aria-label="그만하기">✕</button><span class="mgt">' + GNAME[g.type] + '</span><span class="mscore" id="cScore"></span></div><div class="mbody" id="cBody"></div>';
    document.body.appendChild(el); document.body.classList.add('in-mini');
    $('cQuit').onclick = function () {
      if (G && G.status === 'end') { closeCoop(); return; }
      M.confirm('그만할까요?', '둘 다 놀이가 끝나요.', '그만하기', function () { FX.update('family/game', { status: 'cancel', quit: F.uid, at: FX.now() }); closeCoop(); });
    };
    lastR = -1; seenFlip = ''; resolved = {}; lastLog = -1;
  }
  function closeCoop() { var el = $('coop'); if (el) el.remove(); document.body.classList.remove('in-mini'); clearTimeout(roundT); }
  function names(uid) { return uid === F.uid ? '나' : M.Family.mateName(); }
  function scoreLine(g) { var s = g.scores || {}; return '나 ' + (s[F.uid] || 0) + ' : ' + (s[F.mateUid] || 0) + ' ' + esc(M.Family.mateName()); }
  function reward(g, coins, water) {
    L.rew = L.rew || {}; if (L.rew[g.id]) return ''; L.rew[g.id] = 1; store();
    M.give({ coins: coins, water: water }); M.sfx && M.sfx('win');
    return M.rewardHtml({ coins: coins, water: water });
  }
  function endView(g, title, line, coins, water) {
    var rw = reward(g, coins, water);
    $('cBody').innerHTML = '<div class="center coopend"><div class="tbig">🎉</div><h3>' + title + '</h3><p>' + line + '</p>' + (rw ? '<div>' + rw + '</div>' : '') +
      '<button class="btn primary wide" id="cAgain">한 판 더</button><button class="btn ghost wide" id="cClose">닫기</button></div>';
    $('cAgain').onclick = function () { closeCoop(); invite(g.type); };
    $('cClose').onclick = function () { closeCoop(); };
  }

  // 단어 빨리 맞히기: 같은 낱말을 보고 뜻을 먼저 맞히는 쪽이 1점 (10문제)
  function quiz(g) {
    var qs = g.qs || [], r = g.r || 0, q = qs[r], body = $('cBody'); if (!body) return;
    $('cScore').textContent = (r + 1) + '/' + qs.length;
    if (g.status === 'end') {
      var s = g.scores || {}, me = s[F.uid] || 0, you = s[F.mateUid] || 0;
      endView(g, me > you ? '내가 이겼어요!' : me < you ? esc(M.j(M.Family.mateName(), '이', '가')) + ' 이겼어요!' : '비겼어요!', scoreLine(g), 15 + me * 4, 10);
      return;
    }
    if (!q) return;
    var ans = (g.ans && g.ans[r]) || {}, mine = ans[F.uid], rev = g.rev && g.rev.r === r ? g.rev : null;
    if (r !== lastR) { lastR = r; setTimeout(function () { M.say(q.say, q.lang); }, 200); }
    body.innerHTML = '<div class="rq"><small>' + scoreLine(g) + '</small><div class="rword"><b class="w1 lang-' + q.lang + '">' + esc(q.t) + '</b>' + (q.r && q.r !== q.t && q.lang === 'ja' ? '<small>' + esc(q.r) + '</small>' : '') + '</div><button class="btn" id="cSay">🔊 듣기</button></div>' +
      '<div class="ropts">' + q.opts.map(function (o, i) {
        var cls = rev ? (i === q.a ? ' ok' : '') : (mine && mine.i === i ? ' miss' : '');
        return '<button class="ropt' + cls + '" data-i="' + i + '"' + (rev || mine ? ' disabled' : '') + '><b>' + esc(o) + '</b></button>';
      }).join('') + '</div><p class="center hint">' + (rev ? (rev.w ? '⚡ ' + (rev.w === F.uid ? '내가' : esc(M.j(names(rev.w), '이', '가'))) + ' 먼저 맞혔어요!' : '아무도 못 맞혔어요') : mine ? '틀렸어요… 상대를 기다려요' : '먼저 맞히면 1점!') + '</p>';
    $('cSay').onclick = function () { M.say(q.say, q.lang); };
    Array.prototype.forEach.call(body.querySelectorAll('.ropt'), function (b) {
      b.onclick = function () {
        if (b.disabled) return; var i = +b.dataset.i, ok = i === q.a;
        M.sfx && M.sfx(ok ? 'ok' : 'bad');
        FX.set('family/game/ans/' + r + '/' + F.uid, { i: i, ok: ok, at: FX.now() });
      };
    });
    // 판정은 초대한 쪽만 한다
    if (g.host === F.uid && !rev && !resolved[r]) {
      var keys = Object.keys(ans), oks = keys.filter(function (k) { return ans[k].ok; }).sort(function (a, b) { return ans[a].at - ans[b].at; });
      var decide = function (w) {
        if (resolved[r]) return; resolved[r] = 1; clearTimeout(roundT);
        var up = { rev: { r: r, w: w || '' } }; if (w) up['scores/' + w] = ((g.scores || {})[w] || 0) + 1;
        FX.update('family/game', up);
        setTimeout(function () { if (r + 1 < qs.length) FX.update('family/game', { r: r + 1 }); else FX.update('family/game', { status: 'end' }); }, 1700);
      };
      if (oks.length) decide(oks[0]);
      else if (keys.length >= 2) decide('');
      else { clearTimeout(roundT); roundT = setTimeout(function () { if (G && G.r === r) decide(''); }, 15000); }
    }
  }

  // 둘이서 짝 맞추기: 번갈아 카드 두 장을 뒤집어 낱말과 뜻의 짝을 찾는다. 다 찾으면 둘 다 보상
  function pairs(g) {
    var cards = g.cards || [], open = g.open || {}, flip = g.flip || [], body = $('cBody'); if (!body) return;
    var found = Object.keys(open).length / 2, mineN = Object.keys(open).filter(function (k) { return open[k] === F.uid; }).length / 2;
    $('cScore').textContent = found + '/' + cards.length / 2;
    if (g.status === 'end') { endView(g, '모두 찾았어요! 👏', '뒤집은 횟수 ' + (g.flips || 0) + '번 · 내가 찾은 짝 ' + mineN + '개', 25 + mineN * 3, 15); return; }
    var fk = flip.join(','); if (fk !== seenFlip) { seenFlip = fk; var last = cards[flip[flip.length - 1]]; if (last && last.side === 'w') M.say(last.say, last.lang); }
    var myTurn = g.turn === F.uid;
    body.innerHTML = '<p class="center ' + (myTurn ? 'cturn' : 'hint') + '">' + (myTurn ? '내 차례예요! 카드 두 장을 뒤집어요' : esc(M.Family.mateName()) + '의 차례예요…') + '</p><div class="cgrid">' + cards.map(function (c, i) {
      var up = open[i] || flip.indexOf(i) >= 0;
      var len = String(c.t).length, cjk = /[\u3040-\u30ff\u4e00-\u9fff]/.test(c.t), sz = len <= (cjk ? 3 : 6) ? 'l' : len <= (cjk ? 6 : 12) ? 'm' : 's';
      return '<button class="ccard' + (up ? ' up' : '') + (open[i] ? ' done' : '') + (c.side === 'w' ? ' w' : '') + '" data-i="' + i + '"><span class="cin sz-' + sz + (c.side === 'w' ? ' lang-' + c.lang : '') + '">' + (up ? esc(c.t) : '🌸') + '</span></button>';
    }).join('') + '</div>';
    Array.prototype.forEach.call(body.querySelectorAll('.ccard'), function (b) {
      b.onclick = function () {
        var i = +b.dataset.i; if (!myTurn || open[i] || flip.indexOf(i) >= 0 || flip.length >= 2) return;
        var nf = flip.concat(i); M.sfx && M.sfx('pop');
        FX.update('family/game', { flip: nf, flips: (g.flips || 0) + (nf.length === 2 ? 1 : 0) });
        if (nf.length === 2) setTimeout(function () {
          var a = cards[nf[0]], c = cards[nf[1]], up = { flip: [] };
          if (a.p === c.p && a.side !== c.side) {
            up['open/' + nf[0]] = F.uid; up['open/' + nf[1]] = F.uid; M.sfx && M.sfx('ok');
            if (Object.keys(open).length + 2 >= cards.length) up.status = 'end';
          } else up.turn = F.mateUid;
          FX.update('family/game', up);
        }, 1100);
      };
    });
  }

  // 부부 곤충 배틀: 각자 가방의 곤충을 골라 기술을 동시에 고른다. 초대한 쪽이 판정한다
  var BMV = { ram: { em: '💥', ko: '들이받기', beats: 'grab', ja: 'たいあたり', en: 'Tackle', zh: '冲撞' }, grab: { em: '🦀', ko: '붙잡기', beats: 'fly', ja: 'つかむ', en: 'Grab', zh: '抓住' }, fly: { em: '🌪️', ko: '날아오르기', beats: 'ram', ja: 'とびあがる', en: 'Fly up', zh: '飞起' } };
  var bbT0 = performance.now(), bbPow = 0.5, bbRaf = 0, lastLog = -1;
  function bugs(g) {
    var body = $('cBody'); if (!body) return;
    var B = g.bugs || {}, mine = B[F.uid], other = B[F.mateUid], I = M.GATHER.ITEMS, lang = M.P.lang;
    $('cScore').textContent = g.phase === 'fight' ? (g.r + 1) + '턴' : '';
    if (g.status === 'end') {
      var win = g.winner === F.uid;
      if (win && mine) { var bb = M.P.bugBattle = M.P.bugBattle || { rank: 0, lv: {}, day: '', won: {} }; L.bwin = L.bwin || {}; if (!L.bwin[g.id]) { L.bwin[g.id] = 1; bb.lv[mine.id] = Math.min(20, (bb.lv[mine.id] || 1) + 1); M.save(); } }
      endView(g, win ? '내 곤충이 이겼어요! 🏆' : esc(M.j(M.Family.mateName(), '이', '가')) + ' 이겼어요!', (mine ? esc(I[mine.id].ko) : '') + ' vs ' + (other ? esc(I[other.id].ko) : ''), win ? 40 : 15, 10);
      return;
    }
    if (g.phase === 'pick') {
      if (mine) { body.innerHTML = '<p class="center">' + esc(I[mine.id].ko) + '로 정했어요! ' + esc(M.Family.mateName()) + '를 기다려요…</p><img class="bbimg" style="display:block;margin:20px auto" src="' + I[mine.id].img + '" alt="">'; }
      else {
        var bag = (M.P.gather && M.P.gather.bag) || {}, list = Object.keys(bag).filter(function (k) { return bag[k] > 0 && I[k] && I[k].cat === 'bug'; });
        if (!list.length) list = ['ladybug'];
        var lv = ((M.P.bugBattle || {}).lv) || {};
        body.innerHTML = '<p class="center">어떤 곤충으로 싸울까요?' + (Object.keys(bag).some(function (k) { return bag[k] > 0 && I[k] && I[k].cat === 'bug'; }) ? '' : ' <small>(곤충이 없어서 무당벌레를 빌려줘요)</small>') + '</p><div class="list">' + list.map(function (k) { var s = M.bugStats(k, lv[k]); return '<button class="litem" data-pb="' + k + '"><span class="le dishe"><img src="' + I[k].img + '" alt=""></span><span class="ln">' + esc(I[k].ko) + '<small>Lv.' + s.lv + ' · 체력 ' + s.hp + ' · 힘 ' + Math.round(s.atk) + ' · 특기 ' + BMV[s.style].em + BMV[s.style].ko + '</small></span></button>'; }).join('') + '</div>';
        Array.prototype.forEach.call(body.querySelectorAll('[data-pb]'), function (b) { b.onclick = function () { var k = b.dataset.pb, s = M.bugStats(k, lv[k]); FX.update('family/game/bugs/' + F.uid, { id: k, lv: s.lv, hp: s.hp, max: s.hp, atk: s.atk * (M.buffOn && M.buffOn('power') ? 1.25 : 1), style: s.style }); }; });
      }
      if (g.host === F.uid && mine && other) FX.update('family/game', { phase: 'fight', r: 0 });
      return;
    }
    // 대결
    var r = g.r || 0, mv = (g.moves && g.moves[r]) || {}, my = mv[F.uid], log = g.log;
    if (log && log.r !== lastLog) { lastLog = log.r; var a1 = log.a[F.uid], a2 = log.a[F.mateUid]; if (a1) M.say(BMV[a1][lang] || BMV[a1].en, lang); if (a2) setTimeout(function () { M.say(BMV[a2][lang] || BMV[a2].en, lang); }, 900); }
    var hpb = function (b) { return '<div class="bbhp"><i style="width:' + Math.max(0, b.hp / b.max * 100) + '%"></i></div>'; };
    var nm = function (k) { return '<b class="lang-' + lang + '">' + esc(BMV[k][lang] || BMV[k].en) + '</b>'; };
    body.innerHTML = '<div class="cbb"><div class="bbside op"><div class="bbinfo"><b>' + esc(I[other.id].ko) + '</b><small>' + esc(M.Family.mateName()) + ' · Lv.' + other.lv + '</small>' + hpb(other) + '</div><img class="bbimg" src="' + I[other.id].img + '" alt=""></div>' +
      '<div class="bbmsg">' + (log ? '나: ' + BMV[log.a[F.uid]].em + ' ' + nm(log.a[F.uid]) + ' vs ' + BMV[log.a[F.mateUid]].em + ' ' + nm(log.a[F.mateUid]) + '<br>' + (log.d[F.mateUid] ? '내가 ' + log.d[F.mateUid] + ' 피해를 줬어요 ' : '') + (log.d[F.uid] ? log.d[F.uid] + ' 피해를 받았어요' : '') : '기술을 골라요! 막대가 ★일 때 세게 들어가요') + (my ? '<br><small>' + esc(M.Family.mateName()) + '의 선택을 기다려요…</small>' : '') + '</div>' +
      '<div class="bbside me"><img class="bbimg" src="' + I[mine.id].img + '" alt=""><div class="bbinfo"><b>' + esc(I[mine.id].ko) + '</b><small>나 · Lv.' + mine.lv + '</small>' + hpb(mine) + '</div></div></div>' +
      '<div class="bbpow"><i id="cbPow"></i><span class="bbstar">★</span></div><div class="bbmoves">' + ['ram', 'grab', 'fly'].map(function (k) { return '<button class="bbmove' + (k === mine.style ? ' fav' : '') + '" data-cm="' + k + '"' + (my ? ' disabled' : '') + '><img class="bbic" src="img/w/bb-' + k + '.png" alt=""><b class="lang-' + lang + '">' + esc(BMV[k][lang] || BMV[k].en) + '</b><small>' + BMV[k].ko + '</small></button>'; }).join('') + '</div>';
    cancelAnimationFrame(bbRaf);
    (function loop() { var e = $('cbPow'); if (!e) return; bbPow = (Math.sin((performance.now() - bbT0) / 380) + 1) / 2; e.style.left = (bbPow * 100) + '%'; bbRaf = requestAnimationFrame(loop); })();
    Array.prototype.forEach.call(body.querySelectorAll('[data-cm]'), function (b) { b.onclick = function () { if (b.disabled) return; FX.set('family/game/moves/' + r + '/' + F.uid, { m: b.dataset.cm, pow: bbPow }); M.sfx && M.sfx('pop'); }; });
    if (g.host === F.uid && mv[F.uid] && mv[F.mateUid] && !resolved['b' + r]) {
      resolved['b' + r] = 1;
      var A = mv[F.uid], Bm = mv[F.mateUid], me2 = B[F.uid], ot = B[F.mateUid];
      var res = BMV[A.m].beats === Bm.m ? 1 : BMV[Bm.m].beats === A.m ? -1 : 0;
      var dmg = function (atk, st, m, pw, side) { var acc = 1 - Math.abs(pw - 0.5) * 2, mult = acc > 0.8 ? 1.5 : acc > 0.5 ? 1.15 : 0.9; return Math.round(atk * mult * (m === st ? 1.3 : 1) * (side === 1 ? 1.6 : side === 0 ? 0.5 : 0)); };
      var dToOther = dmg(me2.atk, me2.style, A.m, A.pow, res), dToMe = dmg(ot.atk, ot.style, Bm.m, Bm.pow, -res);
      var up = { r: r + 1, log: { r: r, a: {}, d: {} } }; up.log.a[F.uid] = A.m; up.log.a[F.mateUid] = Bm.m; up.log.d[F.mateUid] = dToOther; up.log.d[F.uid] = dToMe;
      var hpMe = me2.hp - dToMe, hpOt = ot.hp - dToOther;
      up['bugs/' + F.uid + '/hp'] = hpMe; up['bugs/' + F.mateUid + '/hp'] = hpOt;
      if (hpMe <= 0 || hpOt <= 0) { up.status = 'end'; up.winner = hpOt <= 0 && hpMe > 0 ? F.uid : hpMe <= 0 && hpOt > 0 ? F.mateUid : (hpMe >= hpOt ? F.uid : F.mateUid); }
      setTimeout(function () { FX.update('family/game', up); }, 400);
    }
  }

  // ---------- 시작 ----------
  M.Family.start = function () {
    if (!FX) return;
    FX.onUser(function (u) { if (!u && L.fid) FX.signIn().catch(function (e) { M.Family.lastErr = e; F.err = e; }); begin(u); });
    document.addEventListener('visibilitychange', function () { if (F.ready && document.visibilityState === 'visible') { FX.set('family/online/' + F.uid, FX.now()); pushState(); } });
    setInterval(function () { if (F.ready && document.visibilityState === 'visible') pushState(); }, 60000);
    var save0 = M.save;
    M.save = function () { save0.apply(M, arguments); if (F.ready && F.role === 'wife') { clearTimeout(pushT); pushT = setTimeout(pushState, 4000); } };
  };
})();
