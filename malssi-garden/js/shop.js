// 말씨정원 상점: 꽃 포인트를 실제 선물로 바꾸고, 남편(관리자)이 승인한다
(function () {
  var M = window.M, $ = M.$, esc = M.esc;
  var ITEMS = [
    { id: 'freeze', e: '🧊', name: '연속 보호권', desc: '하루 빠져도 연속 기록을 지켜 줘요 (최대 3개)', price: 80 },
    { id: 'water', e: '💧', name: '물방울 30개', desc: '정원에 씨앗을 더 뿌릴 수 있어요', price: 50 }
  ];
  function fmtDate(t) { var d = new Date(t); return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  M.renderShop = function (root) {
    var P = M.P;
    var wait = P.coupons.filter(function (c) { return c.status === 'wait'; });
    var h = '<div class="shop">' +
      '<div class="card fpcard"><img src="img/flower-point.png" alt=""><div><small>내 꽃 포인트</small><b>' + M.fmt(P.fp) + '</b></div></div>';
    if (wait.length) {
      h += '<h3 class="sec">🎟️ 받을 선물 <small>남편에게 보여 주세요</small></h3>' + wait.map(function (c) {
        return '<div class="coupon"><span class="ce">' + c.e + '</span><div><b>' + esc(c.name) + '</b><small>' + fmtDate(c.at) + ' 교환 · 지급 기다리는 중</small></div></div>';
      }).join('');
    }
    h += '<h3 class="sec">🎁 선물 교환</h3><div class="list">' + P.rewards.map(function (r) {
      var pct = Math.min(100, Math.round(P.fp / r.price * 100)), ok = P.fp >= r.price;
      return '<div class="reward' + (ok ? ' ok' : '') + '"><span class="re">' + r.e + '</span><div class="rn"><b>' + esc(r.name) + '</b>' +
        '<div class="mbar"><i style="width:' + pct + '%"></i></div><small>' + (ok ? '지금 바꿀 수 있어요!' : (r.price - P.fp) + '점 더 모으면 돼요') + '</small></div>' +
        '<button class="btn ' + (ok ? 'primary' : 'ghost') + '" data-redeem="' + r.id + '"><img src="img/flower-point.png" alt="">' + M.fmt(r.price) + '</button></div>';
    }).join('') + (P.rewards.length ? '' : '<p class="hint">아직 등록된 선물이 없어요. 남편에게 등록을 부탁해 보세요.</p>') + '</div>';
    h += '<h3 class="sec">🛒 아이템</h3><div class="list">' + ITEMS.map(function (it) {
      return '<button class="litem" data-buy="' + it.id + '"><span class="le">' + it.e + '</span><span class="ln">' + it.name + (it.id === 'freeze' ? ' <small class="own">' + P.freeze + '개 있음</small>' : '') + '<small>' + it.desc + '</small></span><span class="lp"><img src="img/coin.png" alt="">' + it.price + '</span></button>';
    }).join('') + '</div>';
    var done = P.coupons.filter(function (c) { return c.status !== 'wait'; }).slice(-5).reverse();
    if (done.length) h += '<h3 class="sec">📜 지난 선물</h3>' + done.map(function (c) {
      return '<div class="hist">' + c.e + ' ' + esc(c.name) + ' <small>' + (c.status === 'done' ? '받음 ' + fmtDate(c.doneAt) : '취소됨 (포인트 돌려받음)') + '</small></div>';
    }).join('');
    h += '<button class="btn ghost wide admin-btn" id="sAdmin">🔒 관리자 메뉴 (선물 등록·승인)</button></div>';
    root.innerHTML = h;
  };
  function rerender() { var r = $('shopView'); if (r) M.renderShop(r); }

  function redeem(id) {
    var P = M.P, r = P.rewards.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    if (P.fp < r.price) { M.toast('꽃 포인트가 ' + (r.price - P.fp) + '점 부족해요. 황금 꽃을 키워 보세요 🌸'); return; }
    M.confirm(r.e + ' ' + esc(r.name), '<img class="inl" src="img/flower-point.png" alt="">' + M.fmt(r.price) + '점으로 바꿀까요?<br>바꾼 뒤 남편에게 쿠폰을 보여 주면 선물을 받을 수 있어요.', '바꾸기', function () {
      if (!M.spend('fp', r.price)) return;
      P.coupons.push({ id: 'c' + Date.now(), rid: r.id, e: r.e, name: r.name, price: r.price, at: Date.now(), status: 'wait' });
      M.save(); M.sfx('win'); M.buzz([30, 40, 30]);
      M.modal('<div class="center ticket"><div class="tbig">' + r.e + '</div><h3>' + esc(r.name) + '</h3><p>쿠폰이 생겼어요! 🎉<br>남편에게 이 화면을 보여 주세요.</p><p class="hint">남편이 관리자 메뉴에서 ‘지급 완료’를 누르면 끝나요.</p><button class="btn primary wide" data-close>확인</button></div>');
      rerender();
    });
  }
  function buy(id) {
    var P = M.P, it = ITEMS.filter(function (x) { return x.id === id; })[0];
    if (id === 'freeze' && P.freeze >= 3) { M.toast('보호권은 3개까지만 가질 수 있어요'); return; }
    if (!M.spend('coins', it.price)) { M.toast('코인이 부족해요'); return; }
    if (id === 'freeze') M.give({ freeze: 1 }); else M.give({ water: 30 });
    M.sfx('coin'); M.toast(it.e + ' ' + M.j(it.name, '을', '를') + ' 샀어요'); rerender();
  }

  // ---------- 관리자 PIN ----------
  M.askPin = function (title, fn) {
    var P = M.P;
    if (!P.admin.pin) { makePin(fn); return; }
    pinPad(title || '관리자 PIN', '남편이 정한 4자리 숫자를 넣어 주세요', function (v, d) {
      if (M.hashPin(v) === P.admin.pin) { d.close(); fn(); return true; }
      return false;
    });
  };
  function makePin(fn) {
    pinPad('관리자 PIN 만들기', '남편만 아는 4자리 숫자를 정해 주세요.<br>선물 등록과 지급 승인에 써요.', function (v1, d1) {
      d1.close();
      pinPad('한 번 더 입력', '같은 숫자를 다시 넣어 주세요', function (v2, d2) {
        if (v1 !== v2) return false;
        M.P.admin.pin = M.hashPin(v1); M.save(); d2.close(); M.toast('PIN을 만들었어요'); fn(); return true;
      });
      return true;
    });
  }
  function pinPad(title, sub, check) {
    var v = '';
    var d = M.modal('<h3>' + title + '</h3><p class="hint">' + sub + '</p><div class="pins">' + [0, 1, 2, 3].map(function () { return '<i></i>'; }).join('') + '</div><p class="pinerr hidden">숫자가 맞지 않아요</p>' +
      '<div class="pad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, '취소', 0, '⌫'].map(function (k) { return '<button data-k="' + k + '">' + k + '</button>'; }).join('') + '</div>');
    var dots = d.querySelectorAll('.pins i');
    var paint = function () { Array.prototype.forEach.call(dots, function (x, i) { x.classList.toggle('on', i < v.length); }); };
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b) return;
      var k = b.dataset.k;
      if (k === '취소') { d.close(); return; }
      if (k === '⌫') { v = v.slice(0, -1); paint(); return; }
      if (v.length >= 4) return;
      v += k; paint(); M.sfx('tap');
      if (v.length === 4) setTimeout(function () {
        if (!check(v, d)) { d.querySelector('.pinerr').classList.remove('hidden'); d.querySelector('.pins').classList.add('shakeX'); M.buzz(60); v = ''; setTimeout(function () { paint(); d.querySelector('.pins').classList.remove('shakeX'); }, 350); }
      }, M.fast ? 0 : 120);
    });
    return d;
  }

  // ---------- 관리자 메뉴 ----------
  var tab = 'coupon';
  M.openAdmin = function () { M.askPin('관리자 메뉴', adminPanel); };
  function adminPanel() {
    var d = M.modal('<div class="admin"><h3>🔒 관리자 메뉴</h3><div class="tabs">' +
      [['coupon', '쿠폰 승인'], ['reward', '선물 관리'], ['praise', '칭찬 선물'], ['stats', '공부 현황'], ['etc', '설정']].map(function (t) { return '<button data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') +
      '</div><div class="abody" id="aBody"></div><button class="btn ghost wide" data-close>닫기</button></div>', { cls: 'full', onClose: function () { if (M.render) M.render(); if (M.showGifts) M.showGifts(); } });
    var body = d.querySelector('#aBody');
    var paint = function () {
      Array.prototype.forEach.call(d.querySelectorAll('[data-tab]'), function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
      body.innerHTML = ADMIN[tab]();
    };
    paint();
    d.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; paint(); return; }
      var a = e.target.closest('[data-act]'); if (!a) return;
      ACT[a.dataset.act](a.dataset.id, body, paint, d);
    });
  }
  function days14() {
    var out = [], t = M.today();
    for (var i = 13; i >= 0; i--) { var dd = M.addDays(t, -i); out.push({ d: dd, l: (M.P.log[dd] || {}).l || 0 }); }
    return out;
  }
  var ADMIN = {
    coupon: function () {
      var P = M.P, wait = P.coupons.filter(function (c) { return c.status === 'wait'; });
      if (!wait.length) return '<p class="hint center">기다리는 쿠폰이 없어요.</p>';
      return wait.map(function (c) {
        return '<div class="acoupon"><span class="ce">' + c.e + '</span><div class="an"><b>' + esc(c.name) + '</b><small>' + fmtDate(c.at) + ' · ' + M.fmt(c.price) + '점</small></div>' +
          '<button class="btn primary" data-act="give" data-id="' + c.id + '">지급 완료</button><button class="btn ghost" data-act="cancel" data-id="' + c.id + '">취소</button></div>';
      }).join('') + '<p class="hint">취소하면 쓴 꽃 포인트를 돌려줘요.</p>';
    },
    reward: function () {
      var P = M.P;
      return '<p class="hint">하루에 레슨 5판 정도 하면 꽃 포인트를 대략 25~35점 모아요. 가격을 정할 때 참고하세요.</p>' +
        P.rewards.map(function (r) {
          return '<div class="aedit" data-rid="' + r.id + '"><input class="ae" value="' + esc(r.e) + '" maxlength="4" aria-label="그림"><input class="an" value="' + esc(r.name) + '" maxlength="30" aria-label="이름"><input class="ap" type="number" inputmode="numeric" min="1" value="' + r.price + '" aria-label="가격"><button class="btn ghost" data-act="del" data-id="' + r.id + '">🗑</button></div>';
        }).join('') +
        '<div class="row2"><button class="btn" data-act="add">+ 선물 추가</button><button class="btn primary" data-act="saveR">저장</button></div>';
    },
    praise: function () {
      return '<p>칭찬과 함께 꽃 포인트를 선물해 보세요. 관리자 메뉴를 닫으면 바로 선물 상자가 열려요.</p>' +
        '<label class="fld">꽃 포인트<input id="gAmt" type="number" inputmode="numeric" min="1" max="5000" value="20"></label>' +
        '<label class="fld">한마디<input id="gMsg" maxlength="60" value="오늘도 공부하느라 수고했어요!"></label>' +
        '<button class="btn primary wide" data-act="gift">선물 보내기</button>';
    },
    stats: function () {
      var P = M.P, ds = days14(), mx = Math.max(1, Math.max.apply(null, ds.map(function (x) { return x.l; })));
      var W = M.weekState();
      return '<div class="astats"><div><b>' + P.streak + '일</b><small>연속 공부</small></div><div><b>' + P.best + '일</b><small>최고 기록</small></div><div><b>' + W.days + '/7</b><small>이번 주</small></div><div><b>' + P.stats.lessons + '판</b><small>전체 레슨</small></div></div>' +
        '<h4>최근 2주 레슨 수</h4><div class="chart">' + ds.map(function (x) {
          return '<div class="cb"><i style="height:' + Math.round(x.l / mx * 100) + '%"></i><span>' + (x.l || '') + '</span><small>' + (+x.d.slice(8)) + '</small></div>';
        }).join('') + '</div>' +
        '<h4>익힌 단어</h4><div class="astats">' + ['ja', 'en', 'zh'].map(function (c) { var L = window.LANGS[c]; return '<div><b>' + M.learnedCount(c) + '개</b><small>' + L.flag + ' ' + L.name + '</small></div>'; }).join('') + '</div>' +
        '<p class="hint">지금까지 받은 꽃 포인트 상황: 보유 ' + M.fmt(P.fp) + '점, 지급한 선물 ' + P.coupons.filter(function (c) { return c.status === 'done'; }).length + '개</p>';
    },
    etc: function () {
      var P = M.P;
      return '<label class="fld">주간 목표(주 5일 공부) 보너스 꽃 포인트<input id="wBonus" type="number" inputmode="numeric" min="0" max="1000" value="' + P.admin.weekBonus + '"></label>' +
        '<button class="btn wide" data-act="saveW">보너스 저장</button>' +
        '<button class="btn wide" data-act="pin">PIN 바꾸기</button>' +
        '<button class="btn wide" data-act="import">백업 파일 불러오기</button>' +
        '<p class="hint">백업 파일을 불러오면 지금 기록이 그 파일 내용으로 바뀌어요.</p>';
    }
  };
  var ACT = {
    give: function (id, body, paint) {
      var c = M.P.coupons.filter(function (x) { return x.id === id; })[0]; if (!c) return;
      c.status = 'done'; c.doneAt = Date.now(); M.save(); M.sfx('win'); M.toast('🎁 ' + c.name + ' 지급 완료!'); paint();
    },
    cancel: function (id, body, paint) {
      var c = M.P.coupons.filter(function (x) { return x.id === id; })[0]; if (!c) return;
      M.confirm('쿠폰 취소', esc(c.name) + ' 쿠폰을 취소하고 ' + c.price + '점을 돌려줄까요?', '취소하기', function () {
        c.status = 'cancel'; c.doneAt = Date.now(); M.P.fp += c.price; M.save(); M.paintTop(); paint();
      }, true);
    },
    del: function (id, body, paint) {
      collectRewards(body);
      M.P.rewards = M.P.rewards.filter(function (r) { return r.id !== id; }); M.save(); paint();
    },
    add: function (id, body, paint) {
      collectRewards(body);
      M.P.rewards.push({ id: 'r' + Date.now(), e: '🎁', name: '새 선물', price: 300 }); M.save(); paint();
      var last = body.querySelectorAll('.aedit .an'); if (last.length) { last[last.length - 1].focus(); last[last.length - 1].select(); }
    },
    saveR: function (id, body, paint) { collectRewards(body); M.save(); M.toast('선물 목록을 저장했어요'); paint(); },
    gift: function (id, body) {
      var n = Math.max(1, Math.min(5000, parseInt(body.querySelector('#gAmt').value, 10) || 0));
      var msg = body.querySelector('#gMsg').value.trim() || '수고했어요!';
      M.P.gifts.push({ fp: n, msg: msg }); M.save(); M.toast('선물을 준비했어요. 메뉴를 닫으면 열려요 💝');
    },
    saveW: function (id, body) { M.P.admin.weekBonus = Math.max(0, Math.min(1000, parseInt(body.querySelector('#wBonus').value, 10) || 0)); M.save(); M.toast('저장했어요'); },
    pin: function (id, body, paint, d) { d.close(); M.P.admin.pin = ''; M.save(); M.askPin('', adminPanel); },
    import: function (id, body, paint, d) { d.close(); M.pickBackup(); }
  };
  function collectRewards(body) {
    Array.prototype.forEach.call(body.querySelectorAll('.aedit'), function (row) {
      var r = M.P.rewards.filter(function (x) { return x.id === row.dataset.rid; })[0]; if (!r) return;
      r.e = row.querySelector('.ae').value.trim() || '🎁';
      r.name = row.querySelector('.an').value.trim() || '선물';
      r.price = Math.max(1, parseInt(row.querySelector('.ap').value, 10) || 1);
    });
  }

  // 남편이 보낸 칭찬 선물
  M.showGifts = function () {
    var g = M.P.gifts.shift(); if (!g) return;
    M.save();
    var d = M.openChest({ fp: g.fp }, '💝 남편이 보낸 칭찬 선물');
    var p = document.createElement('p'); p.className = 'gmsg'; p.textContent = '“' + g.msg + '”';
    d.querySelector('h3').after(p);
    return d;
  };

  document.addEventListener('click', function (e) {
    var r = e.target.closest('[data-redeem]'); if (r) { redeem(r.dataset.redeem); return; }
    var b = e.target.closest('[data-buy]'); if (b) { buy(b.dataset.buy); return; }
    if (e.target.closest('#sAdmin')) M.openAdmin();
  });
})();
