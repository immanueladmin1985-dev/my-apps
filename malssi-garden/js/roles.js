// 가족 호칭 (말씨정원): 배우는 사람(L)과 관리하는 사람(A)을 무엇이라 부를지 정한다. 기본은 아내·남편.
// 예: 아빠와 아들이 쓰면 L = 아들, A = 아빠. 앱 문구는 M.who('L'), M.whoJ('A', '이', '가') 로 쓴다.
(function () {
  var M = window.M;
  var ICON = { '아내': '👩', '남편': '👨', '아빠': '👨', '엄마': '👩', '아들': '👦', '딸': '👧', '할머니': '👵', '할아버지': '👴', '선생님': '🧑‍🏫' };
  M.ROLE_L = ['아내', '아들', '딸', '남편'];
  M.ROLE_A = ['남편', '아빠', '엄마', '아내'];
  M.who = function (k) { var w = (M.P && M.P.who) || {}; var v = k === 'A' ? w.A : w.L; return v || (k === 'A' ? '남편' : '아내'); };
  M.whoJ = function (k, a, b) { return M.j(M.who(k), a, b); };
  M.whoIcon = function (k) { return ICON[M.who(k)] || '🙂'; };
  M.roleOf = function (role) { return M.who(role === 'wife' ? 'L' : 'A'); };
  M.isCouple = function () { return M.who('L') === '아내' && M.who('A') === '남편'; };
  M.quizWord = function () { return M.isCouple() ? '부부' : '가족'; };
  M.setWho = function (L, A) { M.P.who = { L: String(L || '아내').slice(0, 8), A: String(A || '남편').slice(0, 8) }; M.save(); };

  // ---------- 캐릭터 고르기 ----------
  var LNAME = { rabbit: '자라는 토끼', rabbit1: '아기 토끼', rabbit2: '어린이 토끼', rabbit3: '큰 토끼', dog: '강아지', cat: '고양이', bear: '곰', panda: '판다', fox: '여우', penguin: '펭귄', lion: '사자', monkey: '원숭이', elephant: '코끼리', koala: '코알라', hamster: '햄스터', squirrel: '다람쥐', chick: '병아리', duck: '오리', owl: '부엉이', otter: '수달', deer: '사슴', sheep: '양', hedgehog: '고슴도치', camel: '낙타', mole: '두더지' };
  var LEM = { dog: '🐶', cat: '🐱', bear: '🐻', panda: '🐼', fox: '🦊', penguin: '🐧', lion: '🦁', monkey: '🐵', elephant: '🐘', koala: '🐨', hamster: '🐹', squirrel: '🐿️', chick: '🐥', duck: '🦆', owl: '🦉', otter: '🦦', deer: '🦌', sheep: '🐑', hedgehog: '🦔', camel: '🐫', mole: '🐭' };
  M.lookEmoji = function (ch) { return LEM[ch] || '🐰'; };
  M.lookName = function (ch) { return LNAME[ch] || ch; };
  M.lookImg = function (ch) { var m = /^rabbit(\d)?$/.exec(ch); return m ? 'img/pet-' + (m[1] || 1) + '-happy.png' : 'img/w/ch-' + ch + '-front.png'; };
  M.lookGrid = function (sel) {
    return '<div class="lkgrid">' + (M.LOOKS || ['rabbit']).map(function (ch) { return '<button class="lk' + (ch === sel ? ' on' : '') + '" data-look="' + ch + '"><img src="' + M.lookImg(ch) + '" alt="">' + (ch === 'rabbit' ? '<i>🌱</i>' : '') + '<small>' + LNAME[ch] + '</small></button>'; }).join('') + '</div>';
  };
  function chips(list, cur, key) {
    var custom = list.indexOf(cur) < 0;
    return '<div class="whochips">' + list.map(function (w) { return '<button data-' + key + '="' + w + '" class="' + (w === cur ? 'on' : '') + '">' + (ICON[w] || '') + ' ' + w + '</button>'; }).join('') +
      '<input data-' + key + 'in maxlength="8" placeholder="직접 쓰기" value="' + (custom ? M.esc(cur) : '') + '"></div>';
  }
  // 설정 › 가족 호칭과 캐릭터
  M.whoSheet = function (after) {
    var st = { L: M.who('L'), A: M.who('A'), ch: M.look().ch };
    var d = M.modal('<h3>👨‍👦 가족 호칭과 캐릭터</h3>' +
      '<h4>배우는 사람 (이 앱으로 공부하는 사람)</h4>' + chips(M.ROLE_L, st.L, 'wl') +
      '<h4>관리하는 사람 (선물을 주고 확인하는 사람)</h4>' + chips(M.ROLE_A, st.A, 'wa') +
      '<p class="hint">앱 안의 문구가 이 호칭으로 바뀌어요. 예: “아빠가 선물을 확인했어요”. 가족을 연결하면 상대 폰에도 같은 호칭이 보여요.</p>' +
      '<h4>내 캐릭터</h4><p class="hint">🌱 자라는 토끼만 레벨이 오르면 모습이 바뀌어요. 다른 캐릭터는 모습은 그대로이고 레벨만 올라요.</p>' + M.lookGrid(st.ch) +
      '<button class="btn primary wide" data-whosave>저장하기</button><button class="btn ghost wide" data-close>닫기</button>', { cls: 'bagsheet' });
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-wl],[data-wa]');
      if (b) { var k = b.dataset.wl != null ? 'L' : 'A'; st[k] = b.dataset.wl || b.dataset.wa; Array.prototype.forEach.call(b.parentNode.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); }); var inp = b.parentNode.querySelector('input'); if (inp) inp.value = ''; return; }
      var lk = e.target.closest('[data-look]'); if (lk) { st.ch = lk.dataset.look; Array.prototype.forEach.call(d.querySelectorAll('[data-look]'), function (x) { x.classList.toggle('on', x === lk); }); return; }
      if (e.target.closest('[data-whosave]')) {
        var il = d.querySelector('[data-wlin]').value.trim(), ia = d.querySelector('[data-wain]').value.trim();
        M.setWho(il || st.L, ia || st.A);
        M.P.look = { ch: st.ch, grow: st.ch === 'rabbit' }; M.save();
        if (M.Family && M.Family.pushState) try { M.Family.pushState(); } catch (er) {}
        d.close(); M.toast('저장했어요: ' + M.who('L') + ' · ' + M.who('A') + ' · ' + M.lookName(st.ch)); if (M.render) M.render(); if (after) after();
      }
    });
    d.addEventListener('input', function (e) { if (e.target.matches('[data-wlin],[data-wain]') && e.target.value) Array.prototype.forEach.call(e.target.parentNode.querySelectorAll('button'), function (x) { x.classList.remove('on'); }); });
  };
})();
