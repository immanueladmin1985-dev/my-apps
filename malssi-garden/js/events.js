// 마을 행사 (말씨정원): 주민 생일, 주말 대회(토요일 낚시·일요일 곤충), 사진 찍기.
(function () {
  var M = window.M, esc = M.esc, $ = function (id) { return document.getElementById(id); };

  // ========== 주민 생일 ==========
  // 생일은 주민 이름표(id)로 정해진다. 두 폰이 같고, 해마다 같은 날이다
  M.bdayOf = function (id) {
    var h = 7; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100003;
    return [1 + h % 12, 1 + Math.floor(h / 12) % 28];
  };
  M.isBday = function (id) { var b = M.bdayOf(id), d = M.now(); return d.getMonth() + 1 === b[0] && d.getDate() === b[1]; };
  function bdKey(id) { return M.now().getFullYear() + ':' + id; }
  function celebrated(id) { return !!(M.P.bday || {})[bdKey(id)]; }
  M.bdayToday = function () { return M.V ? M.V.residents().filter(function (c) { return M.isBday(c.id); }) : []; };
  var HB = { ja: ['おたんじょうび、おめでとう！', '생일 축하해요!'], en: ['Happy birthday!', '생일 축하해요!'], zh: ['生日快乐！', '생일 축하해요!'] };
  // 주민 창에 넣을 줄과 단추
  M.bdayLine = function (id) {
    var b = M.bdayOf(id);
    if (!M.isBday(id)) return '<p class="bdline">🎂 생일 ' + b[0] + '월 ' + b[1] + '일</p>';
    return '<p class="bdline today">🎂 오늘은 생일이에요!</p>' + (celebrated(id) ? '' : '<button class="btn primary wide" data-bday>🎉 생일 축하하기 <small>· 친밀도 ♥ 크게</small></button>');
  };
  M.bdayCelebrate = function (id) {
    if (celebrated(id) || !M.isBday(id)) return;
    var c = M.custOf(id), L = M.P.lang, g = HB[L] || HB.en;
    var d = M.modal('<div class="center"><div class="bdcake"><img src="img/w/dish-strawcake.png" alt=""><img class="bdface" src="' + M.custImg(id, true) + '" alt=""></div><h3>' + esc(M.j(c.name, '에게', '에게')) + ' 생일 인사를 해 볼까요?</h3>' +
      '<button class="fname lang-' + L + '" data-bsay>🔊 <b>' + esc(g[0]) + '</b><small>' + esc(g[1]) + '</small></button><p class="hint">소리를 듣고 따라 말해 보세요</p><button class="btn primary wide" data-bgo>🎉 축하해요!</button></div>');
    M.say(g[0], L);
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-bsay]')) { M.say(g[0], L); return; }
      if (!e.target.closest('[data-bgo]')) return;
      var st = M.P.bday = M.P.bday || {}; st[bdKey(id)] = 1;
      Object.keys(st).forEach(function (k) { if (k.indexOf(M.now().getFullYear() + ':') !== 0) delete st[k]; });
      M.give({ coins: 60, water: 10 }); M.save(); M.sfx('win');
      setTimeout(function () { for (var i = 0; i < 4; i++) M.gardenFriendUp(id); }, 3300);   // 하트 한 칸 (축하 장면이 끝난 뒤 반영)
      d.close();
      M.fxPop({ bg: 'fx-burst', img: M.custImg(id, true) || 'img/w/dish-strawcake.png', title: '🎂 ' + M.j(c.name, '이', '가') + ' 정말 기뻐해요!', sub: '친밀도 ♥ 한 칸 · 답례 선물 💧10 · 60코인', ms: 3200 });
    });
  };

  // ========== 주말 대회 ==========
  // 토요일은 낚시 대회(가장 큰 물고기), 일요일은 곤충 대회(잡은 곤충 점수 합계). 다음 날 처음 마을에 오면 상을 준다
  var BUGPT = function (w) { return w >= 3 ? 1 : w >= 2 ? 2 : w >= 1 ? 4 : 10; };
  function evToday() { var d = M.now().getDay(); return d === 6 ? 'fish' : d === 0 ? 'bug' : ''; }
  // 대회 주 이름표: 토·일은 그 주말의 토요일, 평일은 다가오는 토요일 (그래서 월요일이 되면 지난 주말 대회가 끝난다)
  function wkKey() { var d = M.now().getDay(); return M.addDays(M.today(), d === 0 ? -1 : 6 - d); }
  function C() { var c = M.P.cup = M.P.cup || { wk: '', fish: null, bug: null, paid: {} }; c.paid = c.paid || {}; return c; }
  M.cupNow = evToday;
  var NAME = { fish: '🎣 낚시 대회', bug: '🦋 곤충 대회' };
  function pushCup() { if (M.Family && M.Family.pushCup) { var c = C(); M.Family.pushCup({ wk: c.wk, fish: c.fish, bug: c.bug }); } }
  function settle() {
    var c = C(), wk = wkKey(), ev = evToday(), out = [];
    ['fish', 'bug'].forEach(function (k) {
      var over = c.wk !== wk || (k === 'fish' && ev === 'bug');   // 끝난 대회
      if (!over || c.paid[k] || !c[k]) return;
      c.paid[k] = 1;
      var mine = k === 'fish' ? c.fish.s : c.bug.p, mc = M.Family && M.Family.mateCup ? M.Family.mateCup() : null, theirs = mc && mc.wk === c.wk && mc[k] ? (k === 'fish' ? mc[k].s : mc[k].p) : 0;
      var win = theirs > 0 && mine > theirs, coins = 50 + Math.min(150, Math.round(k === 'fish' ? mine : mine * 6)) + (win ? 100 : 0);
      M.give({ coins: coins, fp: win ? 5 : 1 }); out.push({ k: k, mine: mine, theirs: theirs, win: win, coins: coins });
    });
    if (c.wk !== wk) { c.wk = wk; c.fish = null; c.bug = null; c.paid = {}; }
    if (out.length) {
      M.save();
      var unit = function (k, v) { return k === 'fish' ? v + 'cm' : v + '점'; };
      M.fxPop({ bg: 'fx-burst', img: 'img/w/bb-trophy.png', title: '🏆 주말 대회 결과', sub: out.map(function (o) { return NAME[o.k] + ' ' + unit(o.k, o.mine) + (o.theirs ? ' (' + esc(M.Family.mateName()) + ' ' + unit(o.k, o.theirs) + ')' : '') + ' · ' + (o.win ? '🥇 우승 ' : '참가 상 ') + '+' + o.coins + '코인'; }).join('<br>'), ms: 3800 });
    }
  }
  M.cupFish = function (f, size) {
    if (evToday() !== 'fish' || M.visiting) return '';
    settle(); var c = C(); if (c.fish && c.fish.s >= size) return '';
    var first = !c.fish; c.fish = { s: size, id: f.id }; M.save(); pushCup();
    return first ? '🏆 대회 기록 ' + size + 'cm' : '🏆 대회 새 기록!';
  };
  M.cupBug = function (id) {
    if (evToday() !== 'bug' || M.visiting) return;
    settle(); var c = C(), w = ((M.GATHER.BUGS[id] || [])[2]) || 3, pt = BUGPT(w);
    c.bug = c.bug || { p: 0, n: 0 }; c.bug.p += pt; c.bug.n++; M.save(); pushCup();
    M.toast('🏆 곤충 대회 +' + pt + '점 (모두 ' + c.bug.p + '점)');
  };
  M.cupSheet = function () {
    settle();
    var c = C(), ev = evToday(), mc = M.Family && M.Family.mateCup ? M.Family.mateCup() : null, mate = M.Family && M.Family.canGift && M.Family.canGift();
    var fishName = function (r) { var f = r && (M.FISH || []).filter(function (x) { return x.id === r.id; })[0]; return f ? f.ko + ' ' : ''; };
    var rec = function (k, r) { return !r ? '<i>아직 없어요</i>' : k === 'fish' ? fishName(r) + '<b>' + r.s + 'cm</b>' : '<b>' + r.p + '점</b> <small>(' + r.n + '마리)</small>'; };
    var row = function (k) {
      var mine = c[k], theirs = mc && mc.wk === c.wk ? mc[k] : null;
      return '<div class="cuprow' + (ev === k ? ' on' : '') + '"><h4>' + NAME[k] + (ev === k ? ' <span class="newtag">진행 중</span>' : '') + '</h4><p>' + (k === 'fish' ? '토요일 하루 동안 잡은 <b>가장 큰 물고기</b>로 겨뤄요' : '일요일 하루 동안 잡은 곤충 점수를 더해요 · 흔한 곤충 1점, 귀할수록 2·4·10점') + '</p>' +
        '<div class="cupvs"><div><small>나</small>' + rec(k, mine) + '</div>' + (mate ? '<div><small>' + esc(M.Family.mateName()) + '</small>' + rec(k, theirs) + '</div>' : '') + '</div></div>';
    };
    M.modal('<div class="center"><img class="cupimg" src="img/w/bb-trophy.png" alt=""><h3>주말 대회</h3></div>' + row('fish') + row('bug') +
      '<p class="hint">대회가 끝난 다음 날 마을에 오면 상을 받아요. 참가하면 50코인부터, ' + (mate ? esc(M.Family.mateName()) + '보다 기록이 좋으면 우승 상 +100코인과 꽃 포인트를 더 받아요.' : '가족을 연결하면 서로 기록을 겨룰 수 있어요.') + '</p><button class="btn primary wide" data-close>닫기</button>', { cls: 'bagsheet' });
  };

  // ========== 마을 화면 옆 단추 (사진·대회·생일) ==========
  M.villageSide = function (host) {
    if (!host || M.visiting) { if (host) Array.prototype.forEach.call(host.querySelectorAll('.wside,.wfaces'), function (x) { x.remove(); }); return; }
    settle();
    var ev = evToday(), bd = M.bdayToday().filter(function (c) { return !celebrated(c.id); });
    var box = host.querySelector('.wside'); if (!box) { box = document.createElement('div'); box.className = 'wside'; host.appendChild(box); }
    box.innerHTML = '<button class="wsb" data-wphoto aria-label="사진 찍기">📷</button>' +
      (ev ? '<button class="wsb chip" data-wcup><img src="img/w/bb-trophy.png" alt=""><span>' + (ev === 'fish' ? '낚시 대회' : '곤충 대회') + '</span></button>' : '') +
      (bd.length ? '<button class="wsb chip bd" data-wbd="' + bd[0].id + '"><img src="img/w/dish-strawcake.png" alt=""><span>' + esc(bd[0].name) + ' 생일</span></button>' : '');
    // 왼쪽 세로 줄: 부탁이 있거나 생일인 주민 얼굴 (누르면 그 집으로 간다)
    var fl = host.querySelector('.wfaces'); if (!fl) { fl = document.createElement('div'); fl.className = 'wfaces'; host.appendChild(fl); }
    var hot = M.V.residents().filter(function (c) { return (M.miniAvail && M.miniAvail(c.id)) || (M.isBday(c.id) && !celebrated(c.id)); }).slice(0, 5);
    fl.innerHTML = hot.map(function (c) { var bdc = M.isBday(c.id) && !celebrated(c.id); return '<button class="wface" data-wbd="' + c.id + '" aria-label="' + esc(c.name) + '"><img src="' + M.custImg(c.id) + '" alt=""><i>' + (bdc ? '🎂' : '❗') + '</i></button>'; }).join('');
    var bdKeyDay = 'bd' + M.today();
    M.P.ui = M.P.ui || {};
    if (bd.length && M.P.ui.bdToast !== bdKeyDay) { M.P.ui.bdToast = bdKeyDay; M.save(); setTimeout(function () { M.toast('🎂 오늘은 ' + M.j(bd[0].name, '의', '의') + ' 생일이에요! 집에 찾아가 축하해 주세요'); }, 1200); }
  };
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;
    if (t.closest('[data-wphoto]')) { M.photoVillage(); return; }
    if (t.closest('[data-wcup]')) { M.cupSheet(); return; }
    if (t.closest('[data-rcam]')) { M.photoRoom(); return; }
    var b = t.closest('[data-wbd]'); if (b && M.World && M.World.goToResident) { M.World.goToResident(b.dataset.wbd); return; }
  });

  // ========== 사진 찍기 ==========
  // 마을: 지금 보이는 캔버스를 그대로 담는다. 방: 방 안의 그림들을 위치·뒤집기·색 효과까지 맞춰 다시 그린다
  var ALBUM = 'malssi-photos', MAXP = 12;
  function album() { try { return JSON.parse(localStorage.getItem(ALBUM) || '[]'); } catch (e) { return []; } }
  // 저장 공간이 모자라면 오래된 사진부터 덜어 낸다
  function saveAlbum(a) { while (true) { try { localStorage.setItem(ALBUM, JSON.stringify(a)); return true; } catch (e) { if (!a.length) return false; a = a.slice(1); } } }
  function addPhoto(url, cap) { var a = album(); a.push({ u: url, c: cap, at: Date.now() }); a = a.slice(-MAXP); saveAlbum(a); }
  M.photoAdd = addPhoto;
  // 폴라로이드 틀에 넣고 글씨를 쓴다
  function frame(src, cap) {
    var maxW = 720, sc = Math.min(1, maxW / src.width), w = Math.round(src.width * sc), h = Math.round(src.height * sc), pad = 18, foot = 58;
    var c = document.createElement('canvas'); c.width = w + pad * 2; c.height = h + pad + foot;
    var g = c.getContext('2d'); g.fillStyle = '#fffdf7'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(src, pad, pad, w, h);
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 2; g.strokeRect(pad, pad, w, h);
    g.fillStyle = '#6b4e3d'; g.font = '700 22px Jua, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(cap, c.width / 2, h + pad + foot / 2);
    return c.toDataURL('image/jpeg', 0.82);
  }
  function capText(where) { var d = M.now(); return '🐰 ' + M.P.petName + '네 ' + where + ' · ' + d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate(); }
  function flash() { var f = document.createElement('div'); f.className = 'camflash'; document.body.appendChild(f); setTimeout(function () { f.remove(); }, 450); M.sfx && M.sfx('pop'); }
  M.photoVillage = function () {
    var cv = $('wCanvas'); if (!cv) return;
    var url; try { url = frame(cv, capText('마을')); } catch (e) { M.toast('사진을 찍지 못했어요'); return; }
    flash(); setTimeout(function () { photoSheet(url, capText('마을')); }, 380);
  };
  function loadImg(src) { return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; }); }
  function bgUrl(cs) { var m = /url\(["']?([^"')]+)["']?\)/.exec(cs.backgroundImage || ''); return m ? m[1] : ''; }
  function maskUrl(cs) { var v = cs.webkitMaskImage || cs.maskImage || ''; var m = /url\(["']?([^"')]+)["']?\)/.exec(v); return m ? m[1] : ''; }
  // 그림 하나를 상자(bw×bh) 안에 cover 로 맞춰 그린다
  // pos 는 CSS background-position 값("50% 100%"). 방 그림은 아래쪽에 맞춰져 있다
  function fr(v) { if (/%$/.test(v)) return parseFloat(v) / 100; return v === 'left' || v === 'top' ? 0 : v === 'right' || v === 'bottom' ? 1 : 0.5; }
  function cover(g, im, x, y, bw, bh, pos) { var s = Math.max(bw / im.naturalWidth, bh / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s, p = String(pos || '50% 50%').split(/\s+/); g.drawImage(im, x + (bw - w) * fr(p[0]), y + (bh - h) * fr(p[1] || '50%'), w, h); }
  M.photoRoom = function () {
    var room = $('room'); if (!room) return;
    var R = room.getBoundingClientRect(), dpr = 2, c = document.createElement('canvas'); c.width = Math.round(R.width * dpr); c.height = Math.round(R.height * dpr);
    var g = c.getContext('2d'); g.scale(dpr, dpr);
    var els = [room].concat(Array.prototype.slice.call(room.querySelectorAll('*'))).filter(function (el) {
      if (el.closest('.bubble,.edithint,.helpbtn,.ftools,.roomcam')) return false;
      var cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05;
    });
    // 쌓이는 순서: 가장 가까운 z-index 를 가진 조상의 값 → 문서 순서
    var zOf = function (el) { for (var e = el; e && e !== room; e = e.parentElement) { var z = parseInt(getComputedStyle(e).zIndex, 10); if (!isNaN(z)) return z; } return 0; };
    var list = els.map(function (el, i) { return { el: el, z: el === room ? -9999 : zOf(el), i: i }; }).sort(function (a, b) { return a.z - b.z || a.i - b.i; });
    var srcs = {}; list.forEach(function (o) { var cs = getComputedStyle(o.el); [o.el.tagName === 'IMG' ? o.el.currentSrc || o.el.src : '', bgUrl(cs), maskUrl(cs)].forEach(function (u) { if (u) srcs[u] = 1; }); });
    Promise.all(Object.keys(srcs).map(function (u) { return loadImg(u).then(function (im) { srcs[u] = im; }); })).then(function () {
      list.forEach(function (o) {
        var el = o.el, cs = getComputedStyle(el), r = el.getBoundingClientRect(), x = r.left - R.left, y = r.top - R.top, w = r.width, h = r.height;
        if (w < 1 || h < 1) return;
        var bg = bgUrl(cs), mk = maskUrl(cs), isImg = el.tagName === 'IMG', col = cs.backgroundColor, hasCol = col && col !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(col);
        if (!isImg && !bg && !(mk && hasCol)) return;   // 글씨 이름표 같은 색 상자는 담지 않는다
        g.save();
        // 조상 중 뒤집힌(scaleX(-1)) 것이 있으면 같이 뒤집는다
        var flip = false; for (var e = el; e && e !== room; e = e.parentElement) { var tm = getComputedStyle(e).transform; if (tm && tm !== 'none') { var m = tm.match(/matrix\(([^)]+)\)/); if (m && parseFloat(m[1].split(',')[0]) < 0) flip = !flip; } }
        if (flip) { g.translate(x * 2 + w, 0); g.scale(-1, 1); }
        g.globalAlpha = +cs.opacity;
        if (cs.filter && cs.filter !== 'none') g.filter = cs.filter;
        if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') g.globalCompositeOperation = cs.mixBlendMode;
        if (mk && srcs[mk]) {   // 색 덧칠 층: 색을 칠하고 그림 모양만 남긴다
          var t = document.createElement('canvas'); t.width = Math.ceil(w * dpr); t.height = Math.ceil(h * dpr); var q = t.getContext('2d'); q.scale(dpr, dpr);
          q.fillStyle = col; q.fillRect(0, 0, w, h); q.globalCompositeOperation = 'destination-in'; cover(q, srcs[mk], 0, 0, w, h, cs.webkitMaskPosition || cs.maskPosition);
          g.drawImage(t, x, y, w, h);
        } else {
          if (bg && srcs[bg]) cover(g, srcs[bg], x, y, w, h, cs.backgroundPosition);
          if (isImg && srcs[el.currentSrc || el.src]) g.drawImage(srcs[el.currentSrc || el.src], x, y, w, h);
        }
        g.restore();
      });
      var url; try { url = frame(c, capText('집')); } catch (e) { M.toast('사진을 찍지 못했어요'); return; }
      flash(); setTimeout(function () { photoSheet(url, capText('집')); }, 380);
    }).catch(function (e) { if (window.console) console.error(e); M.toast('사진을 찍지 못했어요'); });
  };
  function download(url, name) { var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function shareOrSave(url) {
    var name = 'malssi-' + M.today() + '.jpg';
    try {
      if (navigator.canShare && window.fetch) {
        fetch(url).then(function (r) { return r.blob(); }).then(function (b) {
          var f = new File([b], name, { type: 'image/jpeg' });
          if (navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: '말씨정원 사진' }).catch(function () {});
          download(url, name);
        }).catch(function () { download(url, name); });
        return;
      }
    } catch (e) {}
    download(url, name);
  }
  function photoSheet(url, cap) {
    var mate = M.Family && M.Family.canGift && M.Family.canGift();
    var d = M.modal('<h3>📷 사진을 찍었어요</h3><img class="photo" src="' + url + '" alt="' + esc(cap) + '">' +
      '<div class="row2"><button class="btn" data-pkeep>🗂️ 사진첩에 넣기</button><button class="btn" data-psave>💾 기기에 저장</button></div>' +
      (mate ? '<button class="btn primary wide" data-psend>💌 ' + esc(M.Family.mateName()) + '에게 보내기</button>' : '') +
      '<button class="btn ghost wide" data-palbum>사진첩 보기</button><button class="btn ghost wide" data-close>닫기</button>', { cls: 'bagsheet' });
    var kept = false;
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-pkeep]')) { if (!kept) { addPhoto(url, cap); kept = true; } M.toast('🗂️ 사진첩에 넣었어요 (최근 ' + MAXP + '장까지)'); return; }
      if (e.target.closest('[data-psave]')) { shareOrSave(url); return; }
      if (e.target.closest('[data-psend]')) { if (M.Family.sendPhoto(url, cap)) { if (!kept) { addPhoto(url, cap); kept = true; } } return; }
      if (e.target.closest('[data-palbum]')) { d.close(); M.photoAlbum(); }
    });
  }
  M.photoAlbum = function () {
    var a = album().slice().reverse();
    var d = M.modal('<h3>🗂️ 사진첩</h3>' + (a.length ? '<div class="palbum">' + a.map(function (p, i) { return '<button data-pi="' + i + '"><img src="' + p.u + '" alt=""></button>'; }).join('') + '</div>' : '<p class="hint">아직 사진이 없어요. 마을이나 집에서 📷 단추를 눌러 찍어 보세요.</p>') + '<button class="btn ghost wide" data-close>닫기</button>', { cls: 'bagsheet' });
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pi]'); if (!b) return; var p = a[+b.dataset.pi];
      var v = M.modal('<img class="photo" src="' + p.u + '" alt=""><p class="hint center">' + esc(p.c || '') + '</p><div class="row2"><button class="btn" data-psave>💾 기기에 저장</button><button class="btn" data-pdel>🗑️ 지우기</button></div><button class="btn ghost wide" data-close>닫기</button>', { cls: 'bagsheet' });
      v.addEventListener('click', function (e2) {
        if (e2.target.closest('[data-psave]')) shareOrSave(p.u);
        if (e2.target.closest('[data-pdel]')) { saveAlbum(album().filter(function (x) { return x.at !== p.at; })); v.close(); d.close(); M.photoAlbum(); }
      });
    });
  };
})();
