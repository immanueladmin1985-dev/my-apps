// 약점 공책 (말씨정원): 자주 틀린 낱말을 모아 보고, 듣고, 그 낱말만으로 놀이를 한다.
(function () {
  var M = window.M, $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // 낱말로 하는 놀이 중에서 고른다 (약점 낱말이 먼저 나온다)
  var GAMES = ['fetch', 'banana', 'fish', 'shell', 'spicy', 'memory', 'dict'];
  M.weakBook = function () {
    var lang = M.P.lang, list = M.missedItems(lang, 30), HAN = /[一-鿿]/;
    if (!list.length) { M.toast('자주 틀린 낱말이 아직 없어요. 아주 잘하고 있어요! 👏'); return; }
    function row(it, i) {
      var s = M.P.srs[M.itemKey(it)] || [], lv = Math.min(4, s[0] || 0);
      return '<div class="wkrow"><button class="wksay" data-wks="' + i + '" aria-label="듣기">🔊</button><div class="wkw"><b class="lang-' + lang + '">' + esc(it.t) + '</b>' +
        (it.r && it.r !== it.t && (lang !== 'ja' || HAN.test(it.t)) ? '<small>' + esc(it.r.split(' · ')[0]) + '</small>' : '') + '<em>' + (it.e ? it.e + ' ' : '') + esc(it.k) + '</em></div>' +
        '<div class="wkn"><span class="wkmiss">틀림 ' + (s[2] || 0) + '번</span><span class="wklv">' + [0, 1, 2, 3].map(function (k) { return '<i class="' + (k < lv ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
        '<button class="wkok" data-wko="' + i + '">알아요</button></div>';
    }
    var d = M.modal('<h3>📓 약점 공책</h3><p class="hint">자주 틀린 낱말을 모았어요. 복습에서 네 번 넘게 맞히면 공책에서 빠져요. 이미 확실히 아는 낱말은 "알아요"를 눌러 빼 주세요.</p>' +
      '<div class="wkbtns"><button class="btn primary" data-wkplay><span>🎮</span> 약점 낱말로 놀이</button><button class="btn" data-wkrv' + (list.length >= 3 ? '' : ' disabled') + '><span>🎯</span> 부엉이 복습</button></div>' +
      '<div class="wklist" id="wkList">' + list.map(row).join('') + '</div><button class="btn ghost wide" data-close>닫기</button>', { cls: 'bagsheet wkbook' });
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-wks]'); if (b) { var it = list[+b.dataset.wks]; M.say(it.say || it.t, lang); return; }
      b = e.target.closest('[data-wko]');
      if (b) {
        var it2 = list[+b.dataset.wko], s = M.P.srs[M.itemKey(it2)];
        if (s) { s[2] = 0; M.save(); }
        var r = b.closest('.wkrow'); r.classList.add('gone'); setTimeout(function () { r.remove(); if (!d.querySelector('.wkrow')) { d.close(); M.toast('약점 공책을 다 비웠어요! 🎉'); } }, 300);
        M.sfx && M.sfx('ok'); return;
      }
      if (e.target.closest('[data-wkrv]')) { d.close(); M.reviewGame(); return; }
      if (e.target.closest('[data-wkplay]')) {
        var X = M.MG; if (!X || !X.byId) return;
        var id = M.pick(GAMES.filter(function (g) { return X.byId(g); })), m = X.byId(id);
        d.close(); M.toast('📓 ' + m.icon + ' ' + m.name + ': 약점 낱말이 먼저 나와요');
        X.start(m, { focus: M.missedItems(lang, 30) });
      }
    });
  };
})();
