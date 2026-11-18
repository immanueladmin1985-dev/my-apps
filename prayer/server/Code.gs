/**
 * 기도시간 앱 서버 (구글 시트 + Apps Script)
 *
 * 설치
 * 1) 기도시간 응답이 들어오는 구글 시트에서 [확장 프로그램 → Apps Script] 를 열고 이 코드를 통째로 붙여 넣습니다.
 * 2) 위쪽 함수 목록에서 setup 을 골라 ▶실행 → 권한 허용.
 *    '설정'·'기도기록'·'기도제목'·'공지'·'기기' 시트가 생기고, 설문지 응답이 '기도기록'으로 옮겨집니다.
 * 3) '설정' 시트 B3 칸에 마스터 암호를 적습니다(바꾸면 바로 적용).
 * 4) [배포 → 새 배포 → 유형: 웹 앱] 실행: 나, 액세스 권한: 모든 사용자 → 배포 → 나온 웹 앱 주소를 앱에 넣습니다.
 *    코드를 바꾼 뒤에는 [배포 → 배포 관리 → ✏️ → 버전: 새 버전 → 배포] 를 해야 적용됩니다.
 *
 * 규칙
 * - 같은 사람·같은 날짜는 마지막에 저장한 값이 최종입니다(지우려면 0시간 0분으로 저장).
 * - 2026-08-30 이전 설문지 기록은 예전 수식처럼 그날 입력한 것을 모두 더합니다.
 * - 설문지로 새 응답이 들어와도 자동으로 '기도기록'에 반영됩니다(옮기는 동안 두 방식을 같이 써도 됨).
 * - 기기마다 앱이 만든 기기 번호와 열쇠로 들어옵니다. 승인 없이 이름만 고르면 됩니다.
 */

var SERVER_VER = 4;
var FORM_SHEET = '설문지 응답 시트1';
var OLD_RULE_BEFORE = '2026-08-30';   // 이 날짜 전 설문 기록은 그날 것을 모두 더함
var SH = {
  rec:    { name: '기도기록', cols: ['저장 시각', '날짜', '이름', '분', '기기ID', '출처', '기도 시간'] },
  prayer: { name: '기도제목', cols: ['이름', '기도제목', '고친 시각', '기기ID'] },
  notice: { name: '공지',     cols: ['ID', '내용', '올린 시각', '올린 사람', '지움'] },
  dev:    { name: '기기',     cols: ['기기ID', '열쇠(암호화)', '이름', '권한', '기기 정보', '처음 접속', '마지막 접속'] },
  alias:  { name: '이름바꿈', cols: ['원래 이름', '바른 이름', '바꾼 시각'] },
  comment:{ name: '댓글',     cols: ['ID', '기도제목 주인', '쓴 사람', '내용', '쓴 시각', '기기ID', '지움'] },
  react:  { name: '반응',     cols: ['기도제목 주인', '누른 사람', '종류', '누른 시각', '기기ID'] },
  church: { name: '소속',     cols: ['이름', '교회(소속)', '고친 시각'] }
};
// 로고: 그림은 '로고' 시트에 조각으로, 보이는 곳 설정은 스크립트 속성에
var LOGO_SHEET = '로고';
function logoOpts() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('LOGO') || 'null') || { v: '' }; } catch (e) { return { v: '' }; }
}
function saveLogoOpts(o) { PropertiesService.getScriptProperties().setProperty('LOGO', JSON.stringify(o)); }
function logoData() {
  var sh = ss().getSheetByName(LOGO_SHEET); if (!sh || sh.getLastRow() < 1) return '';
  return sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(function (r) { return String(r[0]); }).join('');
}
function saveLogoData(d) {
  var sh = ss().getSheetByName(LOGO_SHEET) || ss().insertSheet(LOGO_SHEET);
  sh.clearContents();
  if (!d) return;
  var parts = []; for (var i = 0; i < d.length; i += 40000) parts.push([d.slice(i, i + 40000)]);
  sh.getRange(1, 1, parts.length, 1).setNumberFormat('@').setValues(parts);
}
function cleanChurch(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, 30); }
function setChurch(name, church) {
  var list = rows('church').filter(function (r) { return r[0] && String(r[0]) !== name; });
  if (church) list.push([name, church, String(Date.now())]);
  writeAll('church', list);
}
var REACTS = ['heart', 'like', 'smile', 'pray'];
// 권한: '마스터'(모두) · '공지'(담임목사님 등: 공지 올리기·내리기, 댓글 관리)
function isStaff(me) { return me.role === '마스터' || me.role === '공지'; }

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function tz() { try { return ss().getSpreadsheetTimeZone() || 'Asia/Seoul'; } catch (e) { return 'Asia/Seoul'; } }

function setup() {
  var book = ss();
  var st = book.getSheetByName('설정') || book.insertSheet('설정');
  st.getRange('B3').setNumberFormat('@');
  if (!st.getRange('A1').getValue()) {
    st.getRange('A1:B4').setValues([
      ['기도시간 앱 설정', ''],
      ['', ''],
      ['마스터 암호', 'pray1234'],
      ['안내', 'B3 칸의 마스터 암호를 꼭 바꾸세요. 바꾸면 바로 적용돼요. 다른 시트(기도기록·기도제목·공지·기기)는 앱이 씁니다.']
    ]);
    st.setColumnWidth(1, 120); st.setColumnWidth(2, 480);
  }
  Object.keys(SH).forEach(function (k) { sheet(k); });
  importForm();
  // 설문지로 새 응답이 들어오면 바로 옮김 (한 번만 등록)
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'onFormRow'; });
  if (!has) ScriptApp.newTrigger('onFormRow').forSpreadsheet(book).onFormSubmit().create();
  Logger.log('준비 끝. 기도기록 ' + (sheet('rec').getLastRow() - 1) + '줄');
}

function sheet(k) {
  var d = SH[k], book = ss(), sh = book.getSheetByName(d.name);
  if (!sh) {
    sh = book.insertSheet(d.name);
    sh.getRange(1, 1, 1, d.cols.length).setValues([d.cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:Z').setNumberFormat('@');   // 날짜·숫자가 바뀌지 않게 글자로 저장
  }
  return sh;
}
function rows(k) {
  var sh = sheet(k), n = sh.getLastRow() - 1, w = SH[k].cols.length;
  return n > 0 ? sh.getRange(2, 1, n, w).getValues() : [];
}
function writeAll(k, data) {
  var sh = sheet(k), w = SH[k].cols.length, n = sh.getLastRow() - 1;
  if (n > 0) sh.getRange(2, 1, n, w).clearContent();
  if (data.length) sh.getRange(2, 1, data.length, w).setNumberFormat('@').setValues(data);
}
function append(k, data) {
  if (!data.length) return;
  var sh = sheet(k), w = SH[k].cols.length;
  sh.getRange(sh.getLastRow() + 1, 1, data.length, w).setNumberFormat('@').setValues(data);
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function hash(s) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)); }
function setting(row) { var st = ss().getSheetByName('설정'); return st ? String(st.getRange(row, 2).getDisplayValue()).trim() : ''; }
function cleanName(s) { return String(s == null ? '' : s).replace(/\s+/g, '').replace(/목사(님)?$/, '').slice(0, 12); }
function hm(min) { min = Number(min) || 0; var h = Math.floor(min / 60), m = min % 60; return h ? h + '시간' + (m ? ' ' + m + '분' : '') : m + '분'; }
function todayStr() { return Utilities.formatDate(new Date(), tz(), 'yyyy-MM-dd'); }

// 주소를 그냥 열면 서버 상태(판 번호, 기록 줄 수, 설문지 탭을 찾았는지)를 보여 줌
function doGet() {
  var o = { ok: true, app: '기도시간', ver: SERVER_VER, msg: '기도시간 서버가 작동 중입니다. 이 주소를 앱에 넣으세요.' };
  try {
    var r = ss().getSheetByName(SH.rec.name), f = formSheet();
    o.records = r ? Math.max(0, r.getLastRow() - 1) : -1;   // -1: setup 을 아직 안 함
    o.formSheet = f ? f.getName() : '';
    o.formRows = f ? Math.max(0, f.getLastRow() - 1) : 0;
  } catch (e) { o.check = String(e && e.message || e); }
  return json(o);
}
function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: '잘못된 요청' }); }
  try { return json(handle(p)); }
  catch (err) { return json({ ok: false, error: String(err && err.message || err) }); }
}

/* ---------- 설문지 응답 옮기기 ---------- */
function onFormRow() {
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try { importForm(); } finally { lock.releaseLock(); }
}
function parseMin(v) {
  if (v === '' || v == null) return 0;
  if (typeof v === 'number') return Math.round(v * 60);   // 숫자만 적힌 칸은 '시간'으로 봄
  var s = String(v), h = s.match(/(\d+(?:\.\d+)?)\s*시간/), m = s.match(/(\d+)\s*분/);
  if (!h && !m && /^\d+(\.\d+)?$/.test(s.trim())) return Math.round(Number(s) * 60);
  return Math.round((h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0));
}
// 설문지 응답 탭: 이름이 맞으면 그 탭, 아니면 A1 칸이 '타임스탬프'인 탭
function formSheet() {
  var book = ss(), s = book.getSheetByName(FORM_SHEET);
  if (s) return s;
  var all = book.getSheets();
  for (var i = 0; i < all.length; i++) {
    try { if (String(all[i].getRange('A1').getValue()).trim() === '타임스탬프' && all[i].getLastRow() > 1) return all[i]; } catch (e) {}
  }
  return null;
}
// 설문지 응답 전체를 다시 읽어 '출처=설문' 줄을 새로 만듦 (몇 번 실행해도 결과가 같음)
function importForm() {
  var fs = formSheet();
  if (!fs || fs.getLastRow() < 2) return 0;
  var z = tz(), data = fs.getRange(2, 1, fs.getLastRow() - 1, 5).getValues(), agg = {}, alias = aliases();
  data.forEach(function (r) {
    var stamp = r[0], name = cleanName(r[1]), d = r[2];
    if (alias[name]) name = alias[name];
    if (!name || !d) return;
    var day = d instanceof Date ? Utilities.formatDate(d, z, 'yyyy-MM-dd') : String(d).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    var ts = stamp instanceof Date ? stamp.getTime() : 0, key = name + '|' + day, a = agg[key];
    if (day < OLD_RULE_BEFORE) {   // 예전 수식: 그날 '시간' 칸을 모두 더함
      if (!a) a = agg[key] = { name: name, day: day, min: 0, ts: 0 };
      a.min += parseMin(r[3]); a.ts = Math.max(a.ts, ts);
    } else {                        // 새 수식: 그날 마지막 응답의 시간+분
      var min = parseMin(r[3]) + parseMin(r[4]);
      if (!a || ts >= a.ts) agg[key] = { name: name, day: day, min: min, ts: ts };
    }
  });
  var keep = rows('rec').filter(function (r) { return String(r[5]) !== '설문' && r[0] !== ''; });
  Object.keys(agg).forEach(function (k) {
    var a = agg[k];
    keep.push([String(a.ts), a.day, a.name, String(a.min), '', '설문', hm(a.min)]);
  });
  keep.sort(function (a, b) { return Number(a[0]) - Number(b[0]); });
  writeAll('rec', keep);
  bump();
  return Object.keys(agg).length;
}

// 마스터가 고친 이름 (설문지 응답을 다시 옮길 때도 적용)
function aliases() {
  var m = {};
  rows('alias').forEach(function (r) { if (r[0] && r[1]) m[String(r[0])] = String(r[1]); });
  Object.keys(m).forEach(function (k) { var v = m[k], n = 0; while (m[v] && m[v] !== k && n++ < 20) v = m[v]; m[k] = v; });
  return m;
}

/* ---------- 캐시 (읽기를 빠르게) ---------- */
// 캐시 이름에 서버 판 번호를 넣어, 코드를 새로 배포하면 예전 캐시를 쓰지 않음
function bump() { CacheService.getScriptCache().put('ver' + SERVER_VER, String(Date.now()), 21600); }
function cacheGet() {
  var c = CacheService.getScriptCache(), ver = c.get('ver' + SERVER_VER);
  if (!ver) return null;
  var head = c.get('st_' + ver + '_n'); if (!head) return null;
  var keys = []; for (var i = 0; i < Number(head); i++) keys.push('st_' + ver + '_' + i);
  var got = c.getAll(keys), s = '';
  for (var j = 0; j < keys.length; j++) { if (got[keys[j]] == null) return null; s += got[keys[j]]; }
  return s;
}
function cachePut(s) {
  var c = CacheService.getScriptCache(), ver = c.get('ver' + SERVER_VER);
  if (!ver) { ver = String(Date.now()); c.put('ver' + SERVER_VER, ver, 21600); }
  var o = {}, n = 0;
  for (var i = 0; i < s.length; i += 90000) o['st_' + ver + '_' + (n++)] = s.slice(i, i + 90000);
  o['st_' + ver + '_n'] = String(n);
  try { c.putAll(o, 21600); } catch (e) {}
}

// 모두에게 같은 자료: 사람별·날짜별 분, 기도제목, 공지
function shared() {
  var hit = cacheGet();
  if (hit) return JSON.parse(hit);
  var last = {}, names = {};
  rows('rec').forEach(function (r) {
    var name = String(r[2]), day = String(r[1]), ts = Number(r[0]) || 0;
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    names[name] = 1;
    var k = name + '|' + day;
    if (!last[k] || ts >= last[k].ts) last[k] = { ts: ts, min: Number(r[3]) || 0 };
  });
  var data = {};
  Object.keys(last).forEach(function (k) {
    if (!last[k].min) return;
    var i = k.indexOf('|'), n = k.slice(0, i);
    (data[n] = data[n] || {})[k.slice(i + 1)] = last[k].min;
  });
  var prayers = rows('prayer').filter(function (r) { return r[0] && r[1]; }).map(function (r) {
    names[String(r[0])] = 1; return { name: String(r[0]), text: String(r[1]), at: Number(r[2]) || 0 };
  });
  rows('dev').forEach(function (r) { if (r[2]) names[String(r[2])] = 1; });
  var notices = rows('notice').filter(function (r) { return r[0] && String(r[4]) !== '1'; }).map(function (r) {
    return { id: String(r[0]), text: String(r[1]), at: Number(r[2]) || 0, by: String(r[3]) };
  }).reverse();
  var comments = rows('comment').filter(function (r) { return r[0] && String(r[6]) !== '1' && r[3]; }).map(function (r) {
    return { id: String(r[0]), to: String(r[1]), by: String(r[2]), text: String(r[3]), at: Number(r[4]) || 0 };
  });
  var reacts = {};   // { 주인: { heart: [이름…], … } }
  rows('react').forEach(function (r) {
    if (!r[0] || !r[1] || REACTS.indexOf(String(r[2])) < 0) return;
    var o = reacts[String(r[0])] = reacts[String(r[0])] || {};
    (o[String(r[2])] = o[String(r[2])] || []).push(String(r[1]));
  });
  var churches = {};
  rows('church').forEach(function (r) { if (r[0] && r[1]) churches[String(r[0])] = String(r[1]); });
  var out = { names: Object.keys(names).sort(), data: data, prayers: prayers, notices: notices, comments: comments, reacts: reacts, churches: churches };
  cachePut(JSON.stringify(out));
  return out;
}

/* ---------- 기기 ---------- */
function readDevs() {
  return rows('dev').map(function (r, i) {
    return { row: i + 2, id: String(r[0]), keyHash: String(r[1]), name: String(r[2]), role: String(r[3]), desc: String(r[4]), first: String(r[5]), last: String(r[6]) };
  }).filter(function (d) { return d.id; });
}
function writeDev(d) {
  var sh = sheet('dev'), row = [d.id, d.keyHash, d.name || '', d.role || '', d.desc || '', d.first || '', d.last || ''];
  if (d.row) sh.getRange(d.row, 1, 1, row.length).setValues([row]);
  else { sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setNumberFormat('@').setValues([row]); d.row = sh.getLastRow(); }
}
function masterTry(ok) {
  var c = CacheService.getScriptCache(), n = Number(c.get('mfail') || 0);
  if (n >= 8) return '마스터 암호를 여러 번 틀려서 10분 동안 막혔어요';
  if (!ok) { c.put('mfail', String(n + 1), 600); return '마스터 암호가 맞지 않아요'; }
  c.remove('mfail'); return '';
}

function handle(p) {
  if (p.action === 'logo') return { ok: true, logo: logoOpts(), data: logoData() };   // 로고 그림은 누구나 (첫 화면에도 보여야 해서)
  if (p.action === 'load') {   // 읽기는 잠그지 않음 (새 기기만 잠그고 등록)
    var devs = readDevs(), me = find(devs, p.dev);
    if (me) { if (me.keyHash !== hash(p.key || '')) return { ok: false, error: 'key' }; return state(me, devs); }
  }
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try { return locked(p); } finally { lock.releaseLock(); }
}
function find(devs, id) { for (var i = 0; i < devs.length; i++) if (devs[i].id === String(id || '')) return devs[i]; return null; }
function state(me, devs) {
  var now = Date.now();
  if (now - Number(me.last || 0) > 60 * 60000) { me.last = String(now); try { writeDev(me); } catch (e) {} }
  var o = shared();
  o.ok = true; o.ver = SERVER_VER; o.today = todayStr();
  o.logo = logoOpts();   // 그림은 빼고 판 번호·보이는 곳만 (그림은 'logo' 요청으로 따로 받음)
  o.me = { name: me.name, role: me.role === '마스터' || me.role === '공지' ? me.role : '' };
  return o;
}

function locked(p) {
  var devs = readDevs(), me = find(devs, p.dev), now = Date.now();
  if (!p.dev || String(p.dev).length < 16 || !p.key || String(p.key).length < 16) return { ok: false, error: '잘못된 요청' };
  if (me && me.keyHash !== hash(p.key)) return { ok: false, error: 'key' };
  if (!me) {   // 처음 온 기기는 바로 등록 (승인 없음)
    if (devs.length > 3000) return { ok: false, error: '기기가 너무 많아요. 관리자에게 알려 주세요' };
    me = { id: String(p.dev), keyHash: hash(p.key), name: '', role: '', desc: String(p.desc || '').slice(0, 120), first: String(now), last: String(now) };
    writeDev(me); devs.push(me);
  }
  var master = me.role === '마스터';

  switch (p.action) {
    case 'load': return state(me, devs);

    case 'setName': {
      var name = cleanName(p.name);
      if (name.length < 2) return { ok: false, error: '이름을 두 글자 이상 넣어 주세요' };
      var old = me.name;
      if (old && old !== name) renameMine(me.id, old, name);
      if (p.church != null) setChurch(name, cleanChurch(p.church));   // 소속(교회 이름)은 비워도 됨
      me.name = name; me.desc = String(p.desc || me.desc || '').slice(0, 120); me.last = String(now);
      writeDev(me); bump();
      return state(me, devs);
    }

    case 'save': {
      var who = me.name;
      if (p.name && cleanName(p.name) !== me.name) { if (!master) return { ok: false, error: '본인 기록만 저장할 수 있어요' }; who = cleanName(p.name); }
      if (!who) return { ok: false, error: '먼저 이름을 정해 주세요' };
      var day = String(p.date || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, error: '날짜가 잘못됐어요' };
      var today = todayStr();
      if (day > today) return { ok: false, error: '앞으로의 날짜는 저장할 수 없어요' };
      var min = Math.round(Number(p.min));
      if (!(min >= 0 && min <= 1439)) return { ok: false, error: '기도 시간은 23시간 59분까지 넣을 수 있어요' };
      append('rec', [[String(now), day, who, String(min), me.id, master && who !== me.name ? '마스터' : '앱', min ? hm(min) : '지움']]);
      bump();
      return state(me, devs);
    }

    case 'prayer': {
      if (!me.name) return { ok: false, error: '먼저 이름을 정해 주세요' };
      var target = me.name;
      if (p.name && cleanName(p.name) !== me.name) { if (!master) return { ok: false, error: '본인 기도제목만 고칠 수 있어요' }; target = cleanName(p.name); }
      var text = String(p.text || '').replace(/\r/g, '').trim().slice(0, 1500);
      var list = rows('prayer').filter(function (r) { return r[0] && String(r[0]) !== target; });
      if (text) list.push([target, text, String(now), me.id]);
      writeAll('prayer', list); bump();
      return state(me, devs);
    }

    case 'master': {
      var pass = String(p.mpass || '').trim();
      var err = masterTry(pass !== '' && pass === setting(3));
      if (err) return { ok: false, error: err };
      me.role = '마스터'; writeDev(me);
      return state(me, devs);
    }
  }

  // 댓글·반응 (이름을 정한 기기 누구나)
  switch (p.action) {
    case 'comment': {
      if (!me.name) return { ok: false, error: '먼저 이름을 정해 주세요' };
      var to = cleanName(p.to), ct = String(p.text || '').replace(/\r/g, '').trim().slice(0, 500);
      if (!to) return { ok: false, error: '잘못된 요청' };
      if (!ct) return { ok: false, error: '댓글 내용을 넣어 주세요' };
      append('comment', [[String(now) + Math.floor(Math.random() * 1000), to, me.name, ct, String(now), me.id, '']]);
      bump(); return state(me, devs);
    }
    case 'delComment': {
      var found = false, cs = rows('comment').map(function (r) {
        if (String(r[0]) === String(p.id)) {
          if (String(r[5]) !== me.id && String(r[2]) !== me.name && String(r[1]) !== me.name && !isStaff(me)) throw new Error('본인 댓글만 지울 수 있어요');
          r[6] = '1'; found = true;
        }
        return r;
      });
      if (found) { writeAll('comment', cs); bump(); }
      return state(me, devs);
    }
    case 'react': {   // 한 번 누르면 켜지고, 다시 누르면 꺼짐
      if (!me.name) return { ok: false, error: '먼저 이름을 정해 주세요' };
      var rt = cleanName(p.to), kind = String(p.kind);
      if (!rt || REACTS.indexOf(kind) < 0) return { ok: false, error: '잘못된 요청' };
      var had = false, rr = rows('react').filter(function (r) {
        if (r[0] && String(r[0]) === rt && String(r[1]) === me.name && String(r[2]) === kind) { had = true; return false; }
        return !!r[0];
      });
      if (!had) rr.push([rt, me.name, kind, String(now), me.id]);
      writeAll('react', rr); bump(); return state(me, devs);
    }
  }

  // 공지 (마스터 · 공지 권한)
  if (isStaff(me)) switch (p.action) {
    case 'notice': {
      var t = String(p.text || '').replace(/\r/g, '').trim().slice(0, 3000);
      if (!t) return { ok: false, error: '공지 내용을 넣어 주세요' };
      append('notice', [[String(now), t, String(now), me.name || '마스터', '']]);
      bump(); return state(me, devs);
    }
    case 'delNotice': {
      var ns = rows('notice').map(function (r) { if (String(r[0]) === String(p.id)) r[4] = '1'; return r; });
      writeAll('notice', ns); bump(); return state(me, devs);
    }
  }

  if (!master) return { ok: false, error: '마스터만 할 수 있어요' };
  switch (p.action) {
    case 'unmaster': me.role = ''; writeDev(me); return state(me, devs);
    case 'setLogo': {   // data: 'data:image/...;base64,...' (비우면 지움), 보이는 곳 설정
      var lo = logoOpts(), opt = p.opts || {};
      if (p.data != null) {
        var dd = String(p.data);
        if (dd && (!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(dd) || dd.length > 900000)) return { ok: false, error: '그림이 너무 크거나 형식이 맞지 않아요' };
        saveLogoData(dd); lo.v = dd ? String(now) : '';
      }
      ['header', 'welcome', 'title'].forEach(function (k) { if (opt[k] != null) lo[k] = !!opt[k]; });
      if (opt.size) lo.size = ['s', 'm', 'l'].indexOf(opt.size) >= 0 ? opt.size : 'm';
      saveLogoOpts(lo);
      return state(me, devs);
    }
    case 'devices': {
      var s0 = state(me, devs);
      s0.devices = devs.filter(function (d) { return d.name; }).map(function (d) { return { id: d.id, name: d.name, role: d.role, desc: d.desc, last: Number(d.last) || 0 }; });
      return s0;
    }
    case 'setRole': {
      var tg = find(devs, p.target);
      if (!tg) return { ok: false, error: '기기를 찾지 못했어요' };
      if (tg.id === me.id) return { ok: false, error: '지금 쓰는 기기의 권한은 바꿀 수 없어요' };
      tg.role = p.role === '공지' ? '공지' : p.role === '마스터' ? '마스터' : '';
      writeDev(tg);
      var s1 = state(me, devs);
      s1.devices = devs.filter(function (d) { return d.name; }).map(function (d) { return { id: d.id, name: d.name, role: d.role, desc: d.desc, last: Number(d.last) || 0 }; });
      return s1;
    }
    case 'rename': {   // 이름 고치기·합치기: 모든 기록·기도제목·기기의 이름을 바꿈
      var from = cleanName(p.from), to = cleanName(p.to);
      if (!from || to.length < 2) return { ok: false, error: '이름을 확인해 주세요' };
      var rs = rows('rec').map(function (r) { if (String(r[2]) === from) r[2] = to; return r; });
      writeAll('rec', rs);
      var al = rows('alias').filter(function (r) { return r[0] && String(r[0]) !== from && String(r[0]) !== to; })
        .map(function (r) { if (String(r[1]) === from) r[1] = to; return r; });
      al.push([from, to, String(now)]);
      writeAll('alias', al);
      var pr = rows('prayer'), hasTo = pr.some(function (r) { return String(r[0]) === to && r[1]; });
      pr = pr.filter(function (r) { return !(String(r[0]) === from && hasTo); }).map(function (r) { if (String(r[0]) === from) r[0] = to; return r; });
      writeAll('prayer', pr);
      devs.forEach(function (d) { if (d.name === from) { d.name = to; writeDev(d); } });
      var chs = rows('church'), toHas = chs.some(function (r) { return String(r[0]) === to && r[1]; });
      writeAll('church', chs.filter(function (r) { return r[0] && !(String(r[0]) === from && toHas); }).map(function (r) { if (String(r[0]) === from) r[0] = to; return r; }));
      writeAll('comment', rows('comment').map(function (r) { if (String(r[1]) === from) r[1] = to; if (String(r[2]) === from) r[2] = to; return r; }));
      var seen = {};
      writeAll('react', rows('react').map(function (r) { if (String(r[0]) === from) r[0] = to; if (String(r[1]) === from) r[1] = to; return r; })
        .filter(function (r) { var k = r[0] + '|' + r[1] + '|' + r[2]; if (!r[0] || seen[k]) return false; seen[k] = 1; return true; }));
      bump(); return state(me, devs);
    }
    case 'reimport': { var n = importForm(); var s = state(me, devs); s.imported = n; return s; }
  }
  return { ok: false, error: '모르는 요청' };
}

// 이 기기에서 쓴 기록·기도제목만 새 이름으로 옮김 (설문지 기록은 마스터가 '이름 합치기'로)
function renameMine(devId, from, to) {
  var changed = false;
  var rs = rows('rec').map(function (r) { if (String(r[2]) === from && String(r[4]) === devId) { r[2] = to; changed = true; } return r; });
  if (changed) writeAll('rec', rs);
  var pr = rows('prayer'), hasTo = pr.some(function (r) { return String(r[0]) === to && r[1]; });
  var pc = false;
  pr = pr.filter(function (r) {
    if (String(r[0]) === from && String(r[3]) === devId) { pc = true; if (hasTo) return false; r[0] = to; }
    return true;
  });
  if (pc) writeAll('prayer', pr);
  // 소속도 새 이름으로 (새 이름에 이미 소속이 있으면 그대로)
  var chs = rows('church'), toHas = chs.some(function (r) { return String(r[0]) === to && r[1]; });
  if (!toHas) writeAll('church', chs.map(function (r) { if (String(r[0]) === from) r[0] = to; return r; }));
  // 이 기기에서 쓴 댓글·반응, 그리고 옮긴 기도제목에 달린 댓글·반응
  writeAll('comment', rows('comment').map(function (r) {
    if (String(r[2]) === from && String(r[5]) === devId) r[2] = to;
    if (pc && !hasTo && String(r[1]) === from) r[1] = to;
    return r;
  }));
  var seen = {};
  writeAll('react', rows('react').map(function (r) {
    if (String(r[1]) === from && String(r[4]) === devId) r[1] = to;
    if (pc && !hasTo && String(r[0]) === from) r[0] = to;
    return r;
  }).filter(function (r) { var k = r[0] + '|' + r[1] + '|' + r[2]; if (!r[0] || seen[k]) return false; seen[k] = 1; return true; }));
}
