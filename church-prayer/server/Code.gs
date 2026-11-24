/**
 * 우리교회 기도 앱 서버 (구글 시트 + Apps Script)
 *
 * 설치
 * 1) 성도님 기도시간 응답이 들어오는 구글 시트에서 [확장 프로그램 → Apps Script] 를 열고 이 코드를 통째로 붙여 넣습니다.
 * 2) 위쪽 함수 목록에서 setup 을 골라 ▶실행 → 권한 허용.
 *    '설정'·'기도기록'·'기도제목'·'공지'·'기기'·'특별기도'·'기도대상'… 시트가 생기고, 설문지 응답이 '기도기록'으로 옮겨집니다.
 *    특별기도가 하나도 없으면 '학생부·청년부 겨울 대확장'(2026.11.22~2027.2.28)을 만들어 둡니다.
 * 3) '설정' 시트 B3 칸의 마스터 암호를 바꿉니다(바꾸면 바로 적용).
 * 4) [배포 → 새 배포 → 유형: 웹 앱] 실행: 나, 액세스 권한: 모든 사용자 → 배포 → 나온 웹 앱 주소를 앱에 넣습니다.
 *    코드를 바꾼 뒤에는 [배포 → 배포 관리 → ✏️ → 버전: 새 버전 → 배포] 를 해야 적용됩니다.
 *
 * 규칙
 * - 매일 기도: 같은 사람·같은 날짜는 마지막에 저장한 값이 최종입니다(지우려면 0시간 0분으로 저장).
 * - 설정 B7 날짜(비우면 2026-08-30) 이전 설문지 기록은 그날 입력한 것을 모두 더하고, 그 뒤로는 그날 마지막 응답만 씁니다.
 * - 서버 판(SERVER_VER)이 바뀌어 처음 열릴 때 설문지 응답을 한 번 다시 옮깁니다.
 * - 특별기도: 기간(시작~끝)마다 기도 대상(학생 등)·한 사람이 고를 수·기도표·일정·예배 인원을 따로 관리합니다.
 *   매일 기도 기록과는 섞이지 않습니다.
 * - 권한: 마스터(모두) · 공지(공지 올리기) · 교사(기도 대상 사진·이름 올리기, 일정, 예배 인원).
 *   마스터가 '교사명단'에 이름과 부서를 넣어 두면, 그 이름으로 들어온 기기는 자동으로 그 부서 교사가 됩니다.
 * - 출석부: '명단'(부서·이름·태어난 해·학교·연락처·비고·사진) · '출석' · '심방' 시트.
 *   연락처·학교·비고·심방·출석은 그 부서 교사, 마스터, 담임목사 기기에만 보냅니다.
 *   학년·나이는 태어난 해로 해마다 저절로 바뀝니다(청년부: 20세 = 1년차).
 *   특별기도의 기도 대상은 명단에서 '대상'(부서·학년)에 맞는 사람입니다.
 * - 학생 사진은 '사진' 시트에만 있고, 이름을 넣은 기기에만 보냅니다.
 */

var SERVER_VER = 7;
var SUM_BEFORE = '2026-08-30';   // 이 날짜 전 설문 기록은 그날 것을 모두 더함 (설정 B7 이 있으면 그 날짜)
var APP_NAME = '교회기도';
var FORM_SHEET = '설문지 응답 시트1';
var SH = {
  rec:    { name: '기도기록', cols: ['저장 시각', '날짜', '이름', '분', '기기ID', '출처', '기도 시간'] },
  prayer: { name: '기도제목', cols: ['이름', '기도제목', '고친 시각', '기기ID'] },
  notice: { name: '공지',     cols: ['ID', '내용', '올린 시각', '올린 사람', '지움'] },
  dev:    { name: '기기',     cols: ['기기ID', '열쇠(암호화)', '이름', '권한', '기기 정보', '처음 접속', '마지막 접속', '입장'] },
  alias:  { name: '이름바꿈', cols: ['원래 이름', '바른 이름', '바꾼 시각'] },
  comment:{ name: '댓글',     cols: ['ID', '기도제목 주인', '쓴 사람', '내용', '쓴 시각', '기기ID', '지움'] },
  react:  { name: '반응',     cols: ['기도제목 주인', '누른 사람', '종류', '누른 시각', '기기ID'] },
  church: { name: '소속',     cols: ['이름', '소속', '고친 시각', '직책'] },
  // ---- 특별기도 ----
  camp:   { name: '특별기도',   cols: ['ID', '제목', '시작', '끝', '목표', '방법', '1인 선택 수', '목표 인원', '만든 시각', '지움', '대상'] },
  target: { name: '기도대상',   cols: ['ID', '특별기도ID', '이름', '학년', '메모', '사진 판', '올린 사람', '고친 시각', '지움', '순서'] },
  photo:  { name: '사진',       cols: ['명단ID', '판', '그림'] },
  pick:   { name: '선택',       cols: ['특별기도ID', '기도자', '기도대상ID', '고른 시각', '기기ID'] },
  sp:     { name: '특별기도표', cols: ['저장 시각', '특별기도ID', '날짜', '이름', '기도함', '기기ID'] },
  event:  { name: '일정',       cols: ['ID', '특별기도ID', '날짜', '제목', '지움'] },
  join:   { name: '참석',       cols: ['일정ID', '이름', '누른 시각', '기기ID'] },
  att:    { name: '예배인원',   cols: ['특별기도ID', '날짜', '인원', '메모', '고친 시각', '고친 사람'] },
  teacher:{ name: '교사명단',   cols: ['이름', '넣은 시각', '부서', '역할'] },
  ctarget:{ name: '특별기도대상', cols: ['특별기도ID', '명단ID', '넣은 사람', '넣은 시각'] },
  // ---- 출석부 ----
  member: { name: '명단', cols: ['ID', '부서', '이름', '태어난 해', '학년 조정', '학년(직접)', '학교', '연락처', '보호자 연락처', '비고', '기도 메모', '상태', '사진 판', '등록일', '고친 시각', '고친 사람', '지움'] },
  attend: { name: '출석', cols: ['저장 시각', '날짜', '명단ID', '출석', '출처', '기기ID'] },
  visit:  { name: '심방', cols: ['ID', '명단ID', '날짜', '내용', '쓴 사람', '쓴 시각', '지움'] }
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
// 소속: 정해진 목록에서 고름 · 직책: 직접 적음(집사, 권사 …)
var GROUPS = ['유치부', '주일학교', '학생부', '청년부', '1남선교회', '2남선교회', '3남선교회', '4남선교회', '1여선교회', '2여선교회', '3여선교회', '4여선교회'];
function cleanChurch(s) { s = String(s == null ? '' : s).replace(/\s+/g, '').trim(); return GROUPS.indexOf(s) >= 0 ? s : ''; }
function cleanTitle(s) { return String(s == null ? '' : s).replace(/\s+/g, '').trim().slice(0, 10); }
// church/title 이 null 이면 그대로 둠
function setChurch(name, church, title) {
  var old = null, list = rows('church').filter(function (r) { if (r[0] && String(r[0]) === name) { old = r; return false; } return !!r[0]; });
  var c = church == null ? (old ? String(old[1]) : '') : church, t = title == null ? (old ? String(old[3] || '') : '') : title;
  if (c || t) list.push([name, c, String(Date.now()), t]);
  writeAll('church', list);
}
var REACTS = ['heart', 'like', 'smile', 'pray'];
// 권한: '마스터'(모두) · '담임목사'(공지 + 모든 부서 출석부 보기) · '공지'(공지 올리기·내리기, 댓글 관리) · '교사'(자기 부서 출석부, 일정·예배 인원)
var ROLES = ['마스터', '담임목사', '공지', '교사'];
function isStaff(me) { return me.role === '마스터' || me.role === '공지' || me.role === '담임목사'; }
// 교사명단: { 이름: [부서…] }
// 출석부 권한 명단: { 이름: [부서…] } · 역할 '교사'(기본) 또는 '임원'(출석 관리만, 교사 칸에 넣지 않음)
function staffRows() {
  var out = [];
  rows('teacher').forEach(function (r) {
    var n = cleanName(r[0]); if (!n) return;
    var ds = String(r[2] || '').split(/[\s,·/]+/).filter(function (d) { return GROUPS.indexOf(d) >= 0; });
    out.push({ name: n, depts: ds, role: String(r[3] || '').trim() === '임원' ? '임원' : '교사' });
  });
  return out;
}
function teacherMap() { var m = {}; staffRows().forEach(function (x) { m[x.name] = (m[x.name] || []).concat(x.depts); }); return m; }
function teacherNames() { var o = {}; staffRows().forEach(function (x) { if (x.role === '교사') o[x.name] = 1; }); return o; }
// 출석부를 볼 수 있는 부서
function accessDepts(me) {
  var r = effRole(me);
  if (r === '마스터' || r === '담임목사') return GROUPS.slice();
  if (!me.name) return [];
  var ds = teacherMap()[me.name] || [];
  return GROUPS.filter(function (g) { return ds.indexOf(g) >= 0; });
}
// 실제 권한: 시트의 권한, 없으면 교사명단에 이름이 있을 때 '교사'
function effRole(me) { if (ROLES.indexOf(me.role) >= 0) return me.role; if (!me.name) return ''; var s = staffRows().filter(function (x) { return x.name === me.name; })[0]; return s ? s.role : ''; }
function isTeacher(me) { var r = effRole(me); return r === '마스터' || r === '교사'; }

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function tz() { try { return ss().getSpreadsheetTimeZone() || 'Asia/Seoul'; } catch (e) { return 'Asia/Seoul'; } }

function setup() {
  var book = ss();
  var st = book.getSheetByName('설정') || book.insertSheet('설정');
  st.getRange('B3:B7').setNumberFormat('@');
  if (!st.getRange('A1').getValue()) {
    st.getRange('A1:B7').setValues([
      ['교회 기도 앱 설정', ''],
      ['', ''],
      ['마스터 암호', 'pray1234'],
      ['안내', 'B3 마스터 암호를 꼭 바꾸세요. 바꾸면 바로 적용돼요. 다른 시트는 앱이 씁니다.'],
      ['교회 이름', '임마누엘교회'],
      ['', ''],
      ['설문 더하기 기준일', SUM_BEFORE]
    ]);
    st.getRange('C7').setValue('← 이 날짜 전 설문지 기록은 그날 것을 모두 더해요. 그 뒤로는 그날 마지막 응답만 써요.');
    st.setColumnWidth(1, 140); st.setColumnWidth(2, 360);
  }
  Object.keys(SH).forEach(function (k) { sheet(k); });
  importForm();
  seedCamp();
  // 설문지로 새 응답이 들어오면 바로 옮김 (한 번만 등록)
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'onFormRow'; });
  if (!has) { try { ScriptApp.newTrigger('onFormRow').forSpreadsheet(book).onFormSubmit().create(); } catch (e) {} }
  Logger.log('준비 끝. 기도기록 ' + (sheet('rec').getLastRow() - 1) + '줄');
}
// 첫 특별기도(광고 내용)를 만들어 둠 — 특별기도가 하나도 없을 때만
function seedCamp() {
  if (rows('camp').some(function (r) { return r[0]; })) return;
  var now = String(Date.now()), id = 'c' + now;
  append('camp', [[id, '학생부·청년부 겨울 대확장', '2026-11-22', '2027-02-28',
    '학생부·청년부 예배 인원 50명 이상 달성',
    '① 겨울수련회까지 예비청년·청년 1년차·학생부의 성령 체험을 위해 모든 성도님이 1인 3명의 학생을 정해 기도\n② 온 성도가 겨울수련회에 참여하여 함께 기도해서 꼭 성령 받게 함\n③ 매번의 헌신예배 시간에도 다 참여하여 기도하며 격려하기',
    '3', '50', now, '', '학생부:*|청년부:예비청년,1년차']]);
  append('event', [['e' + now, id, '', '겨울수련회', '']]);
  bump();
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
function churchName() { return setting(5) || '임마누엘교회'; }
function cleanName(s) { return String(s == null ? '' : s).replace(/\s+/g, '').replace(/님$/, '').slice(0, 12); }
function hm(min) { min = Number(min) || 0; var h = Math.floor(min / 60), m = min % 60; return h ? h + '시간' + (m ? ' ' + m + '분' : '') : m + '분'; }
function todayStr() { return Utilities.formatDate(new Date(), tz(), 'yyyy-MM-dd'); }
function isDay(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s)); }
function newId(p) { return p + Date.now() + Math.floor(Math.random() * 1000); }

// 주소를 그냥 열면 서버 상태(판 번호, 기록 줄 수, 설문지 탭을 찾았는지)를 보여 줌
function doGet() {
  var o = { ok: true, app: APP_NAME, ver: SERVER_VER, msg: '교회 기도 서버가 작동 중입니다. 이 주소를 앱에 넣으세요.' };
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
// 설문지 칸: 타임스탬프 · 이름 · 날짜 · 시간 · 분
function importForm() {
  var fs = formSheet();
  if (!fs || fs.getLastRow() < 2) return 0;
  var z = tz(), w = Math.min(5, fs.getLastColumn()), data = fs.getRange(2, 1, fs.getLastRow() - 1, w).getValues(), agg = {}, alias = aliases();
  var sumBefore = setting(7);
  if (!isDay(sumBefore)) sumBefore = SUM_BEFORE;
  data.forEach(function (r) {
    var stamp = r[0], name = cleanName(r[1]), d = r[2];
    if (alias[name]) name = alias[name];
    if (!name || !d) return;
    var day = d instanceof Date ? Utilities.formatDate(d, z, 'yyyy-MM-dd') : String(d).trim();
    if (!isDay(day)) return;
    var ts = stamp instanceof Date ? stamp.getTime() : 0, key = name + '|' + day, a = agg[key];
    if (sumBefore && day < sumBefore) {   // 예전 방식: 그날 것을 모두 더함
      if (!a) a = agg[key] = { name: name, day: day, min: 0, ts: 0 };
      a.min += parseMin(r[3]) + parseMin(r[4]); a.ts = Math.max(a.ts, ts);
    } else {                               // 그날 마지막 응답의 시간+분
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

// 모두에게 같은 자료: 사람별·날짜별 분, 기도제목, 공지, 특별기도
function shared() {
  var hit = cacheGet();
  if (hit) return JSON.parse(hit);
  var last = {}, names = {};
  rows('rec').forEach(function (r) {
    var name = String(r[2]), day = String(r[1]), ts = Number(r[0]) || 0;
    if (!name || !isDay(day)) return;
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
  var churches = {}, titles = {};
  rows('church').forEach(function (r) { if (!r[0]) return; if (r[1]) churches[String(r[0])] = String(r[1]); if (r[3]) titles[String(r[0])] = String(r[3]); });
  var out = { names: Object.keys(names).sort(), data: data, prayers: prayers, notices: notices, comments: comments, reacts: reacts, churches: churches, titles: titles, groups: GROUPS };
  var mem = liveMembers();
  out.mem = mem;                        // 개인 정보 — state() 에서 권한대로 걸러서 보냄
  out.attBy = attendByDept(mem);        // { 부서: { 날짜: [ID…] } }
  out.vis = liveVisits();
  out.cnt = {};                         // 공개: { 부서: { 날짜: 출석 인원 } } — 특별기도 목표 인원용이라 교사는 세지 않음
  var tnm = teacherNames(), isTch = {};
  mem.forEach(function (m) { if (m.status === '교사' || tnm[m.name]) isTch[m.id] = 1; });
  Object.keys(out.attBy).forEach(function (d) { var o = out.cnt[d] = {}; Object.keys(out.attBy[d]).forEach(function (k) { o[k] = out.attBy[d][k].filter(function (id) { return !isTch[id]; }).length; }); });
  out.sp = specialShared(mem);
  cachePut(JSON.stringify(out));
  return out;
}

/* ---------- 특별기도 자료 ---------- */
function liveCamps() {
  return rows('camp').filter(function (r) { return r[0] && String(r[9]) !== '1'; }).map(function (r) {
    return { id: String(r[0]), title: String(r[1]), start: String(r[2]), end: String(r[3]), goal: String(r[4]), how: String(r[5]),
      picks: Math.max(1, Math.min(10, Number(r[6]) || 3)), goalN: Number(r[7]) || 0, at: Number(r[8]) || 0, scope: parseScope(r[10]) };
  });
}
function liveTargets() {
  return rows('target').filter(function (r) { return r[0] && String(r[2]).trim() && String(r[8]) !== '1'; }).map(function (r) {
    return { id: String(r[0]), camp: String(r[1]), name: String(r[2]).trim(), grade: String(r[3]).trim(), note: String(r[4]), pv: String(r[5] || ''), at: Number(r[7]) || 0, ord: Number(r[9]) || 0 };
  });
}
// 대상: '학생부:*|청년부:예비청년,1년차' → { 학생부: '*', 청년부: ['예비청년', '1년차'] }
function parseScope(s) {
  var o = {};
  String(s || '').split('|').forEach(function (part) {
    var i = part.indexOf(':'), d = (i < 0 ? part : part.slice(0, i)).trim(), l = i < 0 ? '*' : part.slice(i + 1).trim();
    if (GROUPS.indexOf(d) < 0) return;
    o[d] = !l || l === '*' ? '*' : l.split(',').map(function (x) { return x.trim(); }).filter(String);
  });
  return o;
}
function scopeStr(o) { return Object.keys(o || {}).filter(function (d) { return GROUPS.indexOf(d) >= 0; }).map(function (d) { return d + ':' + (o[d] === '*' ? '*' : [].concat(o[d]).join(',')); }).join('|'); }
function inScope(sc, m) { var v = sc[m.dept]; return !!v && (v === '*' || v.indexOf(m.label) >= 0); }
function specialShared(mem) {
  // 기도 대상: 교사가 출석부에서 ⭐로 넣은 사람 ('특별기도대상' 시트)
  var camps = liveCamps(), targets = [], tIds = {}, byId = {}, live = {};
  mem.forEach(function (m) { byId[m.id] = m; });
  camps.forEach(function (c) { live[c.id] = 1; });
  rows('ctarget').forEach(function (r) {
    var c = String(r[0]), m = byId[String(r[1])];
    if (!live[c] || !m || tIds[c + '|' + m.id]) return;
    targets.push({ id: m.id, camp: c, name: m.name, grade: m.status === '교사' ? '교사' : m.label, dept: m.dept, gk: m.y == null ? 999 : m.y, note: m.memo, pv: m.pv, by: String(r[2]) });
    tIds[c + '|' + m.id] = 1;
  });
  var picks = {};   // { 기간: { 기도자: [대상ID…] } }
  rows('pick').forEach(function (r) {
    var c = String(r[0]), n = String(r[1]), t = String(r[2]);
    if (!c || !n || !tIds[c + '|' + t]) return;
    var o = picks[c] = picks[c] || {}, a = o[n] = o[n] || [];
    if (a.indexOf(t) < 0) a.push(t);
  });
  var last = {};   // 특별기도표: 같은 사람·날짜는 마지막 값
  rows('sp').forEach(function (r) {
    var k = String(r[1]) + '|' + String(r[3]) + '|' + String(r[2]), ts = Number(r[0]) || 0;
    if (!r[1] || !r[3] || !isDay(r[2])) return;
    if (!last[k] || ts >= last[k].ts) last[k] = { ts: ts, v: String(r[4]) === '1' };
  });
  var log = {};   // { 기간: { 이름: { 날짜: 1 } } }
  Object.keys(last).forEach(function (k) {
    if (!last[k].v) return;
    var p = k.split('|'), o = log[p[0]] = log[p[0]] || {}, m = o[p[1]] = o[p[1]] || {};
    m[p[2]] = 1;
  });
  var joins = {};
  rows('join').forEach(function (r) { if (r[0] && r[1]) { var a = joins[String(r[0])] = joins[String(r[0])] || []; if (a.indexOf(String(r[1])) < 0) a.push(String(r[1])); } });
  var events = rows('event').filter(function (r) { return r[0] && String(r[4]) !== '1'; }).map(function (r) {
    return { id: String(r[0]), camp: String(r[1]), date: String(r[2]), title: String(r[3]), going: joins[String(r[0])] || [] };
  });
  var att = {};   // { 기간: { 날짜: { n, note } } }
  rows('att').forEach(function (r) {
    if (!r[0] || !isDay(r[1])) return;
    var o = att[String(r[0])] = att[String(r[0])] || {};
    if (r[2] === '' || r[2] == null) delete o[String(r[1])];
    else o[String(r[1])] = { n: Number(r[2]) || 0, note: String(r[3] || '') };
  });
  return { camps: camps, targets: targets, picks: picks, log: log, events: events, att: att };
}

/* ---------- 기기 ---------- */
function readDevs() {
  return rows('dev').map(function (r, i) {
    return { row: i + 2, id: String(r[0]), keyHash: String(r[1]), name: String(r[2]), role: String(r[3]), desc: String(r[4]), first: String(r[5]), last: String(r[6]), ok: String(r[7]) };
  }).filter(function (d) { return d.id; });
}
function writeDev(d) {
  var sh = sheet('dev'), row = [d.id, d.keyHash, d.name || '', d.role || '', d.desc || '', d.first || '', d.last || '', d.ok || ''];
  if (d.row) sh.getRange(d.row, 1, 1, row.length).setValues([row]);
  else { sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setNumberFormat('@').setValues([row]); d.row = sh.getLastRow(); }
}
function failTry(key, ok, what) {
  var c = CacheService.getScriptCache(), n = Number(c.get(key) || 0);
  if (n >= 8) return what + '를 여러 번 틀려서 10분 동안 막혔어요';
  if (!ok) { c.put(key, String(n + 1), 600); return what + '가 맞지 않아요'; }
  c.remove(key); return '';
}

// 서버 판이 바뀌면 처음 한 번 설문지 응답을 다시 옮김 (더하기 규칙 등이 바뀌었을 때)
function importOnce() {
  var pp = PropertiesService.getScriptProperties();
  if (pp.getProperty('IMPORTED') === String(SERVER_VER)) return;
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try { if (pp.getProperty('IMPORTED') !== String(SERVER_VER)) { fixHeaders(); repairIds('target', 2, 't'); migrateTargets(); syncTeachers(); migrateCampTargets(); importForm(); pp.setProperty('IMPORTED', String(SERVER_VER)); } } finally { lock.releaseLock(); }
}
// 새 칸이 생긴 시트의 제목 줄을 맞춤
function fixHeaders() {
  Object.keys(SH).forEach(function (k) { var sh = sheet(k), c = SH[k].cols; sh.getRange(1, 1, 1, c.length).setValues([c]).setFontWeight('bold'); });
}
// 시트에 직접 넣은 줄: ID 가 비었거나 겹치면 새 ID (이름 칸이 빈 줄은 건너뜀)
function needIdFix(all, nameCol) {
  var seen = {}, need = false;
  all.forEach(function (r) { if (!String(r[nameCol]).trim()) return; var id = String(r[0]).trim(); if (!id || seen[id]) need = true; seen[id] = 1; });
  return need;
}
function repairIds(k, nameCol, prefix) {
  var all = rows(k); if (!needIdFix(all, nameCol)) return false;
  var seen = {}, base = Date.now();
  all.forEach(function (r, i) {
    if (!String(r[nameCol]).trim()) return;
    var id = String(r[0]).trim();
    if (!id || seen[id]) { id = prefix + base + '_' + i; r[0] = id; }
    seen[id] = 1;
  });
  writeAll(k, all); bump(); return true;
}
// 예전 '기도대상' 시트의 사람을 '명단'으로 옮김 (ID·사진·선택은 그대로) — 한 번만
function migrateTargets() {
  var pp = PropertiesService.getScriptProperties();
  if (pp.getProperty('MIGR_MEMBER') === '1') return;
  var old = liveTargets(), Y = yearNow(), have = {}, add = [], scopes = {};
  rows('member').forEach(function (r) { if (r[0]) have[String(r[0])] = 1; });
  var camps = {}; rows('camp').forEach(function (r) { if (r[0]) camps[String(r[0])] = 1; });
  var cs0 = Object.keys(camps);
  old.forEach(function (t) {
    if (!camps[t.camp]) t.camp = cs0[cs0.length - 1] || '';   // 특별기도ID 가 빈 줄은 가장 최근 특별기도로
    var g = t.grade.replace(/\s+/g, ''), dept = '', y = null, manual = '', si = SCHOOL.indexOf(g), m;
    if (/^(중|고)\d$/.test(g)) { dept = '학생부'; y = si + 7; }
    else if (/^초\d$/.test(g)) { dept = '주일학교'; y = si + 7; }
    else if (g === '예비청년') { dept = '청년부'; y = 18; }
    else if ((m = g.match(/^청년(\d+)년차$/)) || (m = g.match(/^(\d+)년차$/))) { dept = '청년부'; y = 18 + Number(m[1]); }
    else if (/청년|년차/.test(g)) { dept = '청년부'; manual = g; }
    else { dept = '학생부'; manual = g; }
    var label = y == null ? manual : labelFor(dept, y, '');
    var sc = scopes[t.camp] = scopes[t.camp] || {};
    if (dept === '학생부') sc[dept] = '*';
    else if (sc[dept] !== '*') { sc[dept] = sc[dept] || []; if (sc[dept].indexOf(label) < 0) sc[dept].push(label); }
    if (have[t.id]) return;
    have[t.id] = 1;
    add.push([t.id, dept, t.name.replace(/\s+/g, ''), y == null ? '' : String(Y - y), '0', manual, '', '', '', '', t.note, '', t.pv, todayStr(), String(Date.now()), '기도대상에서 옮김', '']);
  });
  append('member', add);
  var cr = rows('camp');
  cr.forEach(function (r) { if (r[0] && !String(r[10] || '').trim() && scopes[String(r[0])]) r[10] = scopeStr(scopes[String(r[0])]); });
  writeAll('camp', cr);
  pp.setProperty('MIGR_MEMBER', '1');
}

// 교사 명단의 교사를 맡은 부서 명단에 넣어 둠 (구분: 교사) — 다른 부서에 있던 정보(태어난 해·연락처)는 복사
function syncTeachers() {
  var all = rows('member').filter(function (r) { return r[0]; }), now = Date.now(), add = [];
  var live = all.filter(function (r) { return String(r[16]) !== '1' && String(r[2]).trim(); });
  // 예전에 다른 부서 정보(태어난 해·학교)를 복사해 만든 교사 줄은 비움
  all.forEach(function (r) { if (String(r[15]) === '교사 명단' && String(r[11]) === '교사' && (r[3] !== '' || r[6] !== '')) { r[3] = ''; r[4] = '0'; r[6] = ''; add.push(null); } });
  staffRows().forEach(function (x, i) {
    if (x.role !== '교사') return;
    x.depts.forEach(function (d, j) {
      var here = live.filter(function (r) { return String(r[2]).replace(/\s+/g, '') === x.name && String(r[1]) === d; })[0];
      if (here) { if (String(here[11]) !== '교사') { here[11] = '교사'; add.push(null); } return; }
      var src = live.filter(function (r) { return String(r[2]).replace(/\s+/g, '') === x.name; })[0] || [];
      add.push(['m' + now + '_t' + i + '_' + j, d, x.name, '', '0', '', '', src[7] || '', '', '', '', '교사', src[12] || '', todayStr(), String(now), '교사 명단', '']);
    });
  });
  if (!add.length) return;
  writeAll('member', all.concat(add.filter(Boolean)));
}

// 처음 한 번: 예전에 교사가 넣은 기도 대상 + 이미 누가 고른 사람으로 '특별기도대상'을 채움
function migrateCampTargets() {
  var pp = PropertiesService.getScriptProperties();
  if (pp.getProperty('MIGR_CT') === '1') return;
  var camps = liveCamps(), alive = {}, have = {}, add = [], now = String(Date.now());
  liveMembers().forEach(function (m) { alive[m.id] = 1; });
  rows('ctarget').forEach(function (r) { have[String(r[0]) + '|' + String(r[1])] = 1; });
  var put = function (c, id) { var k = c + '|' + id; if (!c || !alive[id] || have[k]) return; have[k] = 1; add.push([c, id, '예전 기도 대상', now]); };
  var last = camps.length ? camps[camps.length - 1].id : '';
  liveTargets().forEach(function (t) { put(camps.some(function (c) { return c.id === t.camp; }) ? t.camp : last, t.id); });
  rows('pick').forEach(function (r) { put(String(r[0]), String(r[2])); });
  append('ctarget', add);
  pp.setProperty('MIGR_CT', '1');
}

/* ---------- 출석부: 명단 · 출석 · 심방 ---------- */
var SCHOOL = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
var SPECIAL = ['군복무', '유학·타지', '쉬는 중', '전출'];
var STATUS = ['교사'].concat(SPECIAL);   // 명단의 '구분': 교사 칸 · 따로 보기
function yearNow() { return Number(todayStr().slice(0, 4)); }
// 학년·나이 이름: y = 올해 − 태어난 해 (+ 조정) · 청년부는 19세 예비청년, 20세 1년차 (한국식 나이)
function labelFor(dept, y, manual) {
  if (y == null) return manual || '';
  if (dept === '청년부') { if (y === 18) return '예비청년'; if (y >= 19) return (y - 18) + '년차'; }
  if (y >= 7 && y <= 18) return SCHOOL[y - 7];
  return (y + 1) + '세';
}
function liveMembers() {
  var Y = yearNow();
  return rows('member').filter(function (r) { return r[0] && String(r[2]).trim() && String(r[16]) !== '1'; }).map(function (r) {
    var birth = Number(r[3]) || 0, adj = Number(r[4]) || 0, y = birth ? Y - birth + adj : null, dept = String(r[1]).trim();
    return { id: String(r[0]).trim(), dept: dept, name: String(r[2]).replace(/\s+/g, ''), birth: birth || '', adj: adj, grade: String(r[5]).trim(),
      school: String(r[6]), phone: String(r[7]), phone2: String(r[8]), note: String(r[9]), memo: String(r[10]), status: String(r[11]).trim(),
      pv: String(r[12] || ''), reg: String(r[13] || ''), y: y, label: labelFor(dept, y, String(r[5]).trim()) };
  });
}
function attendByDept(mem) {
  var dept = {}; mem.forEach(function (m) { dept[m.id] = m.dept; });
  var last = {};
  rows('attend').forEach(function (r) {
    var d = String(r[1]), id = String(r[2]); if (!isDay(d) || !dept[id]) return;
    var k = d + '|' + id, ts = Number(r[0]) || 0;
    if (!last[k] || ts >= last[k].ts) last[k] = { ts: ts, v: String(r[3]) === '1' };
  });
  var by = {};
  Object.keys(last).forEach(function (k) {
    if (!last[k].v) return;
    var i = k.indexOf('|'), d = k.slice(0, i), id = k.slice(i + 1), o = by[dept[id]] = by[dept[id]] || {};
    (o[d] = o[d] || []).push(id);
  });
  return by;
}
function liveVisits() {
  return rows('visit').filter(function (r) { return r[0] && r[1] && String(r[6]) !== '1'; }).map(function (r) {
    return { id: String(r[0]), pid: String(r[1]), date: String(r[2]), text: String(r[3]), by: String(r[4]), at: Number(r[5]) || 0 };
  });
}
// 권한이 있는 부서의 명단·출석·심방만 붙임 (출석은 명단 순서 번호를 36진수로 줄여 보냄)
function attachRoster(o, me) {
  var acc = accessDepts(me), mem = o.mem || [], attBy = o.attBy || {}, vis = o.vis || [];
  delete o.mem; delete o.attBy; delete o.vis;
  o.me.depts = acc;
  if (!acc.length) return;
  // 교사: { 이름: [맡은 부서…] } — 맡은 부서 출석부의 '교사' 칸에만 나오고, 다른 부서 명단에서는 숨김
  o.tdepts = {}; staffRows().forEach(function (x) { if (x.role === '교사') o.tdepts[x.name] = (o.tdepts[x.name] || []).concat(x.depts); });
  var ok = {}; acc.forEach(function (d) { ok[d] = 1; });
  var mine = mem.filter(function (m) { return ok[m.dept]; }), ids = {};
  o.roster = mine;
  o.ratt = {};
  acc.forEach(function (d) {
    var list = mine.filter(function (m) { return m.dept === d; }), idx = {};
    list.forEach(function (m, i) { idx[m.id] = i.toString(36); });
    var dd = {}, src = attBy[d] || {};
    Object.keys(src).forEach(function (day) { dd[day] = src[day].map(function (id) { return idx[id]; }).filter(function (x) { return x != null; }).join(','); });
    o.ratt[d] = { ids: list.map(function (m) { return m.id; }), d: dd };
  });
  mine.forEach(function (m) { ids[m.id] = 1; });
  o.visits = vis.filter(function (v) { return ids[v.pid]; });
}
function cleanPhone(s) { return String(s == null ? '' : s).replace(/[^\d\-+ ]/g, '').trim().slice(0, 20); }
function clip(s, n, multi) { s = String(s == null ? '' : s).replace(/\r/g, ''); if (!multi) s = s.replace(/\s+/g, ' '); return s.trim().slice(0, n); }
function memberRow(all, id) { return all.filter(function (r) { return String(r[0]) === String(id) && String(r[16]) !== '1'; })[0] || null; }
// 이름 칸: '임동현(19)' · '이 훈' · '김민수(30대)'
function parseNameCell(v) {
  var t = String(v == null ? '' : v).trim().replace(/\u3000/g, ' ');
  var m = t.match(/^([가-힣A-Za-z][가-힣A-Za-z\s]{0,8}?)\s*(?:\(\s*(\d{1,2})\s*(대)?\s*\))?\s*$/);
  if (!m) return null;
  var name = m[1].replace(/\s+/g, '');
  if (name.length < 2) return null;
  return { name: name, age: m[2] && !m[3] ? Number(m[2]) : null };
}
// 월별 출석 시트 한 장: '이 름' 칸 오른쪽의 날짜(일) 칸들, 그 아래로 '이름(나이)'와 ○ 표시
function parseMonth(v, y, mo) {
  var out = [], norm = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ''); }, pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  for (var r = 0; r < v.length; r++) for (var c = 0; c < v[r].length; c++) {
    if (norm(v[r][c]) !== '이름') continue;
    var dcols = [];
    for (var j = c + 1; j < v[r].length; j++) {
      var t = norm(v[r][j]).replace(/일$/, '');
      if (!/^\d{1,2}$/.test(t)) break;
      var dn = Number(t), dt = new Date(y, mo - 1, dn);
      if (dn < 1 || dt.getMonth() !== mo - 1) break;
      dcols.push({ c: j, date: y + '-' + pad2(mo) + '-' + pad2(dn) });
    }
    if (!dcols.length) continue;
    var title = r >= 2 ? norm(v[r - 2][c]) : '';
    for (var i = r + 1; i < v.length; i++) {
      var raw = v[i][c], k = norm(raw);
      if (!k) continue;
      if (k === '합계' || k === '주차' || k === '이름' || /^출석/.test(k)) break;
      var nm = parseNameCell(raw); if (!nm) continue;
      var dates = dcols.filter(function (dc) { var x = norm(v[i][dc.c]); return x && !/^(0|-|x|X|×|결)$/.test(x); }).map(function (dc) { return dc.date; });
      out.push({ name: nm.name, age: nm.age, y: y, mo: mo, title: title, dates: dates, first: dcols[0].date });
    }
  }
  return out;
}
// 구글 시트(월별 시트 26.11, 26.10 …)에서 명단·출석 가져오기. 다시 해도 같은 결과(예전에 가져온 것은 지우고 새로)
function importAttendSheet(url, dept, me) {
  var book;
  try { book = SpreadsheetApp.openByUrl(String(url || '').trim()); }
  catch (e) { throw new Error('시트를 열지 못했어요. 주소가 맞는지, 이 서버를 만든 구글 계정으로 볼 수 있는 시트인지 확인해 주세요'); }
  var recs = [], used = [];
  book.getSheets().forEach(function (sh) {
    var nm = String(sh.getName()).trim(), m = nm.match(/^(\d{2}|\d{4})[.\-_/ ](\d{1,2})(?!\d)/);
    if (!m || nm.indexOf('사본') >= 0) return;
    var y = m[1].length === 2 ? 2000 + Number(m[1]) : Number(m[1]), mo = Number(m[2]);
    if (mo < 1 || mo > 12) return;
    var got = parseMonth(sh.getDataRange().getDisplayValues(), y, mo);
    if (got.length) { used.push(nm); recs = recs.concat(got); }
  });
  if (!recs.length) throw new Error("'26.11' 같은 이름의 월별 시트에서 '이 름' 칸을 찾지 못했어요");
  var all = rows('member').filter(function (r) { return r[0]; }), now = Date.now(), Y = yearNow();
  var people = all.filter(function (r) { return String(r[1]) === dept && String(r[16]) !== '1'; });
  // 사람마다 가장 최근 시트의 나이로 태어난 해를 정함
  var groups = {};
  recs.forEach(function (rc) {
    var by = rc.age ? rc.y - rc.age + 1 : 0, key = rc.name + '|' + (by || '');
    var g = groups[key] = groups[key] || { name: rc.name, by: by, ym: 0, title: '', first: '9999', dates: {} };
    var ym = rc.y * 100 + rc.mo;
    if (ym >= g.ym) { g.ym = ym; g.title = rc.title; }
    if (rc.first < g.first) g.first = rc.first;
    rc.dates.forEach(function (d) { g.dates[d] = 1; });
  });
  // 나이 없이 적힌 줄은 같은 이름이 하나뿐이면 그 사람으로 합침
  Object.keys(groups).forEach(function (k) {
    var g = groups[k]; if (g.by) return;
    var same = Object.keys(groups).filter(function (x) { return x !== k && groups[x].name === g.name && groups[x].by; });
    if (same.length === 1) { var t = groups[same[0]]; Object.keys(g.dates).forEach(function (d) { t.dates[d] = 1; }); if (g.first < t.first) t.first = g.first; delete groups[k]; }
  });
  var added = 0, matched = 0, marks = [], idOf = {};
  Object.keys(groups).forEach(function (k, gi) {
    var g = groups[k];
    var cands = people.filter(function (r) { return String(r[2]).replace(/\s+/g, '') === g.name; });
    var row = cands.length <= 1 ? cands[0] : cands.slice().sort(function (a, b) { return Math.abs((Number(a[3]) || 0) - g.by) - Math.abs((Number(b[3]) || 0) - g.by); })[0];
    if (row && g.by && Number(row[3]) && Math.abs(Number(row[3]) - g.by) > 1 && cands.length === 1) row = null;   // 이름만 같은 다른 사람
    var t = g.title, st = /군인|군복무|직업군인/.test(t) ? '군복무' : /유학/.test(t) ? '유학·타지' : '';
    if (!row) {
      row = ['m' + now + '_i' + gi, dept, g.name, g.by ? String(g.by) : '', '0', '', '', '', '', '', '', st, '', g.first, String(now), me.name + '(시트 가져오기)', ''];
      all.push(row); people.push(row); added++;
    } else {
      matched++;
      if (!Number(row[3]) && g.by) row[3] = String(g.by);
      if (st && !String(row[11])) row[11] = st;
      if (!String(row[13]) || g.first < String(row[13])) row[13] = g.first;
    }
    Object.keys(g.dates).forEach(function (d) { marks.push(d + '|' + row[0]); });
    idOf[k] = row[0];
  });
  writeAll('member', all);
  var deptIds = {}; people.forEach(function (r) { deptIds[String(r[0])] = 1; });
  var keep = rows('attend').filter(function (r) { return r[0] !== '' && !(String(r[4]) === '시트' && deptIds[String(r[2])]); });
  var seen = {};
  marks.forEach(function (x) { if (seen[x]) return; seen[x] = 1; var i = x.indexOf('|'); keep.push(['1', x.slice(0, i), x.slice(i + 1), '1', '시트', '']); });
  writeAll('attend', keep);
  bump();
  return { added: added, matched: matched, marks: Object.keys(seen).length, sheets: used.length };
}

function handle(p) {
  importOnce();
  if (p.action !== 'logo' && needIdFix(rows('member'), 2)) {   // 시트에 직접 넣은 명단 줄 고치기
    var lk = LockService.getScriptLock(); lk.waitLock(25000);
    try { repairIds('member', 2, 'm'); } finally { lk.releaseLock(); }
  }
  if (p.action === 'logo') return { ok: true, logo: logoOpts(), data: logoData() };   // 로고 그림은 누구나 (첫 화면에도 보여야 해서)
  if (p.action === 'load' || p.action === 'photos') {   // 읽기는 잠그지 않음 (새 기기만 잠그고 등록)
    var devs = readDevs(), me = find(devs, p.dev);
    if (me) {
      if (me.keyHash !== hash(p.key || '')) return { ok: false, error: 'key' };
      return p.action === 'photos' ? photos(me, p.ids) : state(me, devs);
    }
  }
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try { return locked(p); } finally { lock.releaseLock(); }
}
function find(devs, id) { for (var i = 0; i < devs.length; i++) if (devs[i].id === String(id || '')) return devs[i]; return null; }
function state(me, devs) {
  var now = Date.now();
  if (now - Number(me.last || 0) > 60 * 60000) { me.last = String(now); try { writeDev(me); } catch (e) {} }
  var o = shared();
  o.ok = true; o.ver = SERVER_VER; o.today = todayStr(); o.church = churchName(); o.logo = logoOpts();
  o.me = { name: me.name, role: effRole(me) };
  attachRoster(o, me);
  if (String(me.ok || '').indexOf('claim:') === 0) {
    var cn = String(me.ok).slice(6);
    if (!(devs || readDevs()).some(function (d) { return d.id !== me.id && d.name === cn; })) { me.name = cn; me.ok = ''; try { writeDev(me); } catch (e) {} o.me.name = cn; }   // 그 이름을 쓰는 기기가 없으면 승인 없이
    else o.me.claim = cn;
  }
  if (me.role === '마스터') {
    o.teachers = staffRows().sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    var ch = {}, ti = {}; rows('church').forEach(function (r) { if (r[0]) { ch[String(r[0])] = String(r[1]); ti[String(r[0])] = String(r[3] || ''); } });
    var dv0 = devs || readDevs();
    o.claims = dv0.filter(function (d) { var cn2 = String(d.ok || ''); return cn2.indexOf('claim:') === 0 && dv0.some(function (x) { return x.id !== d.id && x.name === cn2.slice(6); }); }).map(function (d) {
      var nm = String(d.ok).slice(6), olds = (devs || []).filter(function (x) { return x.name === nm; });
      return { id: d.id, name: nm, desc: d.desc, at: Number(d.first) || 0, church: ch[nm] || '', title: ti[nm] || '', others: olds.map(function (x) { return x.desc + ' · ' + (Number(x.last) || 0); }) };
    });
  }
  return o;
}
// 기도 대상 사진 (이름을 넣은 기기만)
function photos(me, ids) {
  if (!me.name) return { ok: false, error: '먼저 이름을 넣어 주세요' };
  var want = {}; (ids || []).slice(0, 60).forEach(function (i) { want[String(i)] = 1; });
  var out = {};
  rows('photo').forEach(function (r) { if (want[String(r[0])] && r[2]) out[String(r[0])] = { v: String(r[1]), data: String(r[2]) }; });
  return { ok: true, photos: out };
}
function savePhoto(id, data) {
  var list = rows('photo').filter(function (r) { return r[0] && String(r[0]) !== id; });
  var v = data ? String(Date.now()) : '';
  if (data) list.push([id, v, data]);
  writeAll('photo', list);
  return v;
}
function campOf(id) { var c = liveCamps().filter(function (x) { return x.id === String(id || ''); })[0]; if (!c) throw new Error('특별기도를 찾지 못했어요'); return c; }

function locked(p) {
  var devs = readDevs(), me = find(devs, p.dev), now = Date.now();
  if (!p.dev || String(p.dev).length < 16 || !p.key || String(p.key).length < 16) return { ok: false, error: '잘못된 요청' };
  if (me && me.keyHash !== hash(p.key)) return { ok: false, error: 'key' };
  if (!me) {   // 처음 온 기기는 바로 등록 (승인 없음)
    if (devs.length > 3000) return { ok: false, error: '기기가 너무 많아요. 관리자에게 알려 주세요' };
    me = { id: String(p.dev), keyHash: hash(p.key), name: '', role: '', desc: String(p.desc || '').slice(0, 120), first: String(now), last: String(now), ok: '' };
    writeDev(me); devs.push(me);
  }
  var master = me.role === '마스터';

  switch (p.action) {
    case 'load': return state(me, devs);
    case 'photos': return photos(me, p.ids);
    case 'master': {
      var pass = String(p.mpass || '').trim();
      var err = failTry('mfail', pass !== '' && pass === setting(3), '마스터 암호');
      if (err) return { ok: false, error: err };
      me.role = '마스터'; writeDev(me);
      return state(me, devs);
    }
    case 'cancelClaim': { me.ok = ''; writeDev(me); bump(); return state(me, devs); }
    case 'setName': {
      var name = cleanName(p.name);
      if (name.length < 2) return { ok: false, error: '이름을 두 글자 이상 넣어 주세요' };
      var old = me.name;
      // 이미 있는 이름: 본인(폰 바꿈)이면 마스터 승인, 동명이인이면 소속·직책을 붙인 새 이름
      if (name !== old) {
        // 이미 다른 기기가 쓰고 있는 이름만 (설문지로만 기록한 분은 처음 들어올 때 그냥 그 이름으로)
        var taken = function (n) { return devs.some(function (d) { return d.id !== me.id && d.name === n; }); };
        if (taken(name)) {
          if (p.mode === 'claim') {
            me.ok = 'claim:' + name; me.desc = String(p.desc || me.desc || '').slice(0, 120); me.last = String(now);
            writeDev(me); bump(); return state(me, devs);
          }
          if (p.mode === 'new') {
            var tag = cleanChurch(p.church) || cleanTitle(p.title) || '', base = name + (tag ? '(' + tag + ')' : ''), cand = base, k = 2;
            if (!tag) cand = name + k++;
            while (taken(cand)) cand = (tag ? base : name) + k++;
            name = cand;
          } else {
            var crow = rows('church').filter(function (r) { return String(r[0]) === name; })[0];
            return { ok: false, error: 'exists', exist: { name: name, church: crow ? String(crow[1]) : '', title: crow ? String(crow[3] || '') : '' } };
          }
        }
      }
      if (String(me.ok || '').indexOf('claim:') === 0) me.ok = '';
      if (old && old !== name) renameMine(me.id, old, name);
      if (p.church != null || p.title != null) setChurch(name, p.church == null ? null : cleanChurch(p.church), p.title == null ? null : cleanTitle(p.title));   // 비워도 됨
      me.name = name; me.desc = String(p.desc || me.desc || '').slice(0, 120); me.last = String(now);
      writeDev(me); bump();
      return state(me, devs);
    }
  }

  switch (p.action) {
    case 'save': {
      var who = me.name;
      if (p.name && cleanName(p.name) !== me.name) { if (!master) return { ok: false, error: '본인 기록만 저장할 수 있어요' }; who = cleanName(p.name); }
      if (!who) return { ok: false, error: '먼저 이름을 정해 주세요' };
      var day = String(p.date || '');
      if (!isDay(day)) return { ok: false, error: '날짜가 잘못됐어요' };
      if (day > todayStr()) return { ok: false, error: '앞으로의 날짜는 저장할 수 없어요' };
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

  // 특별기도: 누구나 (이름을 정한 기기)
  switch (p.action) {
    case 'pick': {   // 기도 대상 고르기·빼기 (on: true/false)
      if (!me.name) return { ok: false, error: '먼저 이름을 정해 주세요' };
      var pc = campOf(p.camp), pwho = me.name;
      if (p.name && cleanName(p.name) !== me.name) { if (!master) return { ok: false, error: '본인 것만 고를 수 있어요' }; pwho = cleanName(p.name); }
      if (todayStr() > pc.end) return { ok: false, error: '끝난 특별기도예요' };
      var inCamp = {}, alive = {}; liveMembers().forEach(function (m) { alive[m.id] = 1; });
      rows('ctarget').forEach(function (r) { if (String(r[0]) === pc.id && alive[String(r[1])]) inCamp[String(r[1])] = 1; });
      var tg = inCamp[String(p.target)] ? { id: String(p.target) } : null;
      if (!tg) return { ok: false, error: '기도 대상을 찾지 못했어요' };
      var pr = rows('pick').filter(function (r) { return r[0]; });
      var mine = pr.filter(function (r) { return String(r[0]) === pc.id && String(r[1]) === pwho; });
      var has = mine.some(function (r) { return String(r[2]) === tg.id; });
      if (p.on && !has) {
        var cnt = mine.filter(function (r) { return inCamp[String(r[2])]; }).length;
        if (cnt >= pc.picks) return { ok: false, error: pc.picks + '명까지 고를 수 있어요. 먼저 한 명을 빼 주세요' };
        append('pick', [[pc.id, pwho, tg.id, String(now), me.id]]);
      } else if (!p.on && has) {
        writeAll('pick', pr.filter(function (r) { return !(String(r[0]) === pc.id && String(r[1]) === pwho && String(r[2]) === tg.id); }));
      }
      bump(); return state(me, devs);
    }
    case 'spCheck': {   // 특별기도표: 그날 기도했어요 (on)
      if (!me.name) return { ok: false, error: '먼저 이름을 정해 주세요' };
      var sc = campOf(p.camp), swho = me.name, sd = String(p.date || '');
      if (p.name && cleanName(p.name) !== me.name) { if (!master) return { ok: false, error: '본인 기록만 저장할 수 있어요' }; swho = cleanName(p.name); }
      if (!isDay(sd) || sd < sc.start || sd > sc.end) return { ok: false, error: '특별기도 기간 안의 날짜만 넣을 수 있어요' };
      if (sd > todayStr()) return { ok: false, error: '앞으로의 날짜는 저장할 수 없어요' };
      append('sp', [[String(now), sc.id, sd, swho, p.on ? '1' : '0', me.id]]);
      bump(); return state(me, devs);
    }
    case 'join': {   // 일정 참석 (on)
      if (!me.name) return { ok: false, error: '먼저 이름을 정해 주세요' };
      var ev = rows('event').filter(function (r) { return String(r[0]) === String(p.event) && String(r[4]) !== '1'; })[0];
      if (!ev) return { ok: false, error: '일정을 찾지 못했어요' };
      var js = rows('join').filter(function (r) { return r[0] && !(String(r[0]) === String(p.event) && String(r[1]) === me.name); });
      if (p.on) js.push([String(p.event), me.name, String(now), me.id]);
      writeAll('join', js); bump(); return state(me, devs);
    }
  }

  // 출석부: 그 부서 교사 · 마스터 · 담임목사
  var acc = accessDepts(me), can = function (d) { return acc.indexOf(String(d)) >= 0; };
  switch (p.action) {
    case 'person': {   // 사람 넣기·고치기 (photo: 'data:image/…' 새 사진, '' 지우기, 없으면 그대로)
      var pdept = cleanChurch(p.dept);
      if (!pdept || !can(pdept)) return { ok: false, error: '이 부서는 권한이 없어요' };
      var pn = String(p.name || '').replace(/\s+/g, '').slice(0, 12);
      if (pn.length < 1) return { ok: false, error: '이름을 넣어 주세요' };
      var pb = String(p.birth == null ? '' : p.birth).trim();
      if (pb && !(Number(pb) >= 1900 && Number(pb) <= yearNow())) return { ok: false, error: '태어난 해를 확인해 주세요 (예: 2010)' };
      var mall = rows('member').filter(function (r) { return r[0]; }), prow = null;
      if (p.id) { prow = memberRow(mall, p.id); if (!prow) return { ok: false, error: '명단에서 찾지 못했어요' }; if (!can(prow[1])) return { ok: false, error: '이 부서는 권한이 없어요' }; }
      else { prow = [newId('m'), '', '', '', '0', '', '', '', '', '', '', '', '', todayStr(), '', '', '']; mall.push(prow); }
      if (p.photo != null) {
        var ppd = String(p.photo);
        if (ppd && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(ppd) || ppd.length > 48000)) return { ok: false, error: '사진이 너무 크거나 형식이 맞지 않아요' };
        prow[12] = savePhoto(String(prow[0]), ppd);
      }
      prow[1] = pdept; prow[2] = pn; prow[3] = pb; prow[4] = String(Math.max(-3, Math.min(3, Math.round(Number(p.adj) || 0))));
      prow[5] = clip(p.grade, 12); prow[6] = clip(p.school, 30); prow[7] = cleanPhone(p.phone); prow[8] = cleanPhone(p.phone2);
      prow[9] = clip(p.note, 1000, true); prow[10] = clip(p.memo, 200, true); prow[11] = STATUS.indexOf(String(p.status)) >= 0 ? String(p.status) : '';
      prow[14] = String(now); prow[15] = me.name;
      writeAll('member', mall); bump();
      var ps0 = state(me, devs); ps0.savedId = String(prow[0]); return ps0;
    }
    case 'people': {   // 여러 명 한번에: list [{ name, birth }] (같은 부서에 같은 이름·태어난 해가 있으면 건너뜀)
      var bd = cleanChurch(p.dept);
      if (!bd || !can(bd)) return { ok: false, error: '이 부서는 권한이 없어요' };
      var ball = rows('member').filter(function (r) { return r[0]; }), bhave = {}, badd = [];
      ball.forEach(function (r) { if (String(r[1]) === bd && String(r[16]) !== '1') { bhave[String(r[2]).replace(/\s+/g, '') + '|' + (Number(r[3]) || '')] = 1; bhave[String(r[2]).replace(/\s+/g, '') + '|'] = 1; } });
      (p.list || []).slice(0, 300).forEach(function (x, i) {
        var nm2 = String(x && x.name || '').replace(/\s+/g, '').slice(0, 12), by2 = Number(x && x.birth) || '';
        if (nm2.length < 2 || bhave[nm2 + '|']) return;   // 같은 부서에 같은 이름이 있으면 건너뜀 (동명이인은 한 명씩 넣기로)
        bhave[nm2 + '|'] = 1;
        bhave[nm2 + '|' + by2] = 1;
        badd.push(['m' + now + '_b' + i, bd, nm2, by2 ? String(by2) : '', '0', clip(x.grade, 12), '', '', '', '', '', '', '', todayStr(), String(now), me.name, '']);
      });
      append('member', badd); bump();
      var bs0 = state(me, devs); bs0.added = badd.length; return bs0;
    }
    case 'delPerson': {
      var dall = rows('member'), drow = memberRow(dall, p.id);
      if (!drow) return { ok: false, error: '명단에서 찾지 못했어요' };
      if (!can(drow[1])) return { ok: false, error: '이 부서는 권한이 없어요' };
      drow[16] = '1'; writeAll('member', dall); savePhoto(String(p.id), ''); bump();
      return state(me, devs);
    }
    case 'marks': {   // 출석 표시 모아 보내기: list [{ id, date, on }] — 가볍게 결과만 돌려줌
      var md0 = {}; liveMembers().forEach(function (m) { md0[m.id] = m.dept; });
      var today0 = todayStr(), add0 = [];
      (p.list || []).slice(0, 500).forEach(function (x) {
        var id0 = String(x && x.id || ''), d0 = String(x && x.date || '');
        if (!md0[id0] || !can(md0[id0]) || !isDay(d0) || d0 > today0) return;
        add0.push([String(now), d0, id0, x.on ? '1' : '0', '앱', me.id]);
      });
      append('attend', add0); bump();
      return { ok: true, saved: add0.length };
    }
    case 'visit': {   // 심방 기록 넣기·고치기
      var vall = rows('member'), vrow = memberRow(vall, p.pid);
      if (!vrow || !can(vrow[1])) return { ok: false, error: '이 부서는 권한이 없어요' };
      var vd = String(p.date || ''), vt = clip(p.text, 2000, true);
      if (!isDay(vd)) return { ok: false, error: '날짜를 확인해 주세요' };
      if (!vt) return { ok: false, error: '심방 내용을 적어 주세요' };
      var vs = rows('visit').filter(function (r) { return r[0]; }), vr = p.id ? vs.filter(function (r) { return String(r[0]) === String(p.id); })[0] : null;
      if (!vr) { vr = [newId('v'), String(p.pid), '', '', me.name, String(now), '']; vs.push(vr); }
      vr[2] = vd; vr[3] = vt;
      vs.sort(function (a, b) { return String(a[2]) < String(b[2]) ? -1 : 1; });
      writeAll('visit', vs); bump(); return state(me, devs);
    }
    case 'delVisit': {
      var dvs = rows('visit').filter(function (r) { return r[0]; }), mem2 = {}; liveMembers().forEach(function (m) { mem2[m.id] = m.dept; });
      dvs.forEach(function (r) { if (String(r[0]) === String(p.id)) { if (!can(mem2[String(r[1])])) throw new Error('이 부서는 권한이 없어요'); r[6] = '1'; } });
      writeAll('visit', dvs); bump(); return state(me, devs);
    }
    case 'campTarget': {   // ⭐ 특별기도 기도 대상 넣기·빼기: camp, ids, on
      var ctc = campOf(p.camp), cmem = {}; liveMembers().forEach(function (m) { cmem[m.id] = m; });
      var cids = (p.ids || []).slice(0, 500).map(String).filter(function (id) { return cmem[id] && can(cmem[id].dept); });
      if (!cids.length) return { ok: false, error: '넣을 수 있는 사람이 없어요(부서 권한 확인)' };
      var cset = {}; cids.forEach(function (id) { cset[id] = 1; });
      var crows = rows('ctarget').filter(function (r) { return r[0] && !(String(r[0]) === ctc.id && cset[String(r[1])]); });
      if (p.on) cids.forEach(function (id) { crows.push([ctc.id, id, me.name, String(now)]); });
      writeAll('ctarget', crows); bump();
      var ct0 = state(me, devs); ct0.changed = cids.length; return ct0;
    }
    case 'bulkPerson': {   // 여러 명 한번에 고치기: ids + (status | dept | del)
      var ball2 = rows('member'), want = {}; (p.ids || []).slice(0, 500).forEach(function (x) { want[String(x)] = 1; });
      var nd = p.dept != null ? cleanChurch(p.dept) : null;
      if (p.dept != null && (!nd || !can(nd))) return { ok: false, error: '옮길 부서의 권한이 없어요' };
      var nst = p.status != null ? (STATUS.indexOf(String(p.status)) >= 0 ? String(p.status) : '') : null, cnt2 = 0;
      ball2.forEach(function (r) {
        if (!want[String(r[0])] || String(r[16]) === '1' || !can(r[1])) return;
        if (p.del) { r[16] = '1'; }
        if (nst != null) r[11] = nst;
        if (nd) r[1] = nd;
        r[14] = String(now); r[15] = me.name; cnt2++;
      });
      writeAll('member', ball2); bump();
      var bp = state(me, devs); bp.changed = cnt2; return bp;
    }
    case 'importSheet': {   // 구글 시트 출석부 가져오기 (마스터만)
      var idp = cleanChurch(p.dept);
      if (!master) return { ok: false, error: '시트 가져오기는 마스터만 할 수 있어요' };
      if (!idp || !can(idp)) return { ok: false, error: '이 부서는 권한이 없어요' };
      var res = importAttendSheet(p.url, idp, me);
      var is0 = state(me, devs); is0.imported = res; return is0;
    }
  }

  // 교사·마스터: 일정, 예배 인원
  if (isTeacher(me)) switch (p.action) {
    case 'event': {   // 일정 넣기·고치기 (날짜는 비워도 됨 = 추후 공지)
      var ec = campOf(p.camp), et = String(p.title || '').trim().slice(0, 60), ed = String(p.date || '');
      if (!et) return { ok: false, error: '일정 이름을 넣어 주세요' };
      if (ed && !isDay(ed)) return { ok: false, error: '날짜가 잘못됐어요' };
      var evs = rows('event').filter(function (r) { return r[0]; }), er = null;
      if (p.id) er = evs.filter(function (r) { return String(r[0]) === String(p.id); })[0];
      if (!er) { er = [newId('e'), ec.id, '', '', '']; evs.push(er); }
      er[2] = ed; er[3] = et;
      writeAll('event', evs); bump(); return state(me, devs);
    }
    case 'delEvent': {
      writeAll('event', rows('event').filter(function (r) { return r[0]; }).map(function (r) { if (String(r[0]) === String(p.id)) r[4] = '1'; return r; }));
      bump(); return state(me, devs);
    }
    case 'att': {   // 예배 인원 (n 을 비우면 지움)
      var ac = campOf(p.camp), adt = String(p.date || '');
      if (!isDay(adt)) return { ok: false, error: '날짜가 잘못됐어요' };
      var an = p.n === '' || p.n == null ? '' : Math.round(Number(p.n));
      if (an !== '' && !(an >= 0 && an <= 9999)) return { ok: false, error: '인원을 숫자로 넣어 주세요' };
      var at = rows('att').filter(function (r) { return r[0] && !(String(r[0]) === ac.id && String(r[1]) === adt); });
      if (an !== '') at.push([ac.id, adt, String(an), String(p.note || '').trim().slice(0, 60), String(now), me.name]);
      at.sort(function (a, b) { return String(a[1]) < String(b[1]) ? -1 : 1; });
      writeAll('att', at); bump(); return state(me, devs);
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

  if (!master) return { ok: false, error: '이 일은 권한이 있어야 할 수 있어요' };
  switch (p.action) {
    case 'unmaster': me.role = ''; writeDev(me); return state(me, devs);
    case 'approve': {   // 폰 바꿈 승인: yes 면 그 기기를 그 이름으로
      var ad = find(devs, p.target);
      if (!ad || String(ad.ok || '').indexOf('claim:') !== 0) return { ok: false, error: '승인할 기기를 찾지 못했어요' };
      if (p.yes) ad.name = String(ad.ok).slice(6);
      ad.ok = ''; writeDev(ad); bump();
      return state(me, devs);
    }
    case 'setInfo': {   // 마스터가 다른 분의 직책·소속을 고침
      var inm = cleanName(p.name);
      if (!inm) return { ok: false, error: '이름을 확인해 주세요' };
      setChurch(inm, cleanChurch(p.church), cleanTitle(p.title)); bump();
      return state(me, devs);
    }
    case 'teachers': {   // 교사명단: [{ name, depts }] — 이 이름으로 들어온 기기는 자동으로 그 부서 교사
      var seen = {}, tl = [];
      (p.list || (p.names || []).map(function (n) { return { name: n, depts: [] }; })).forEach(function (x) {
        var n = cleanName(x && x.name); if (n.length < 2 || seen[n]) return; seen[n] = 1;
        var ds = (x.depts || []).filter(function (d) { return GROUPS.indexOf(d) >= 0; });
        tl.push([n, String(now), ds.join(' '), x.role === '임원' ? '임원' : '교사']);
      });
      if (tl.length > 300) return { ok: false, error: '이름이 너무 많아요' };
      writeAll('teacher', tl); syncTeachers(); bump();
      return state(me, devs);
    }
    case 'camp': {   // 특별기도 만들기·고치기
      var title = String(p.title || '').trim().slice(0, 60), st = String(p.start || ''), en = String(p.end || '');
      if (!title) return { ok: false, error: '제목을 넣어 주세요' };
      if (!isDay(st) || !isDay(en) || en < st) return { ok: false, error: '기간을 확인해 주세요' };
      var picks = Math.max(1, Math.min(10, Math.round(Number(p.picks) || 3))), gn = Math.max(0, Math.round(Number(p.goalN) || 0));
      var cr = rows('camp').filter(function (r) { return r[0]; }), crow = null;
      if (p.id) crow = cr.filter(function (r) { return String(r[0]) === String(p.id); })[0];
      var isNew = !crow;
      if (isNew) { crow = [newId('c'), '', '', '', '', '', '', '', String(now), '', '']; cr.push(crow); }
      crow[1] = title; crow[2] = st; crow[3] = en; crow[4] = String(p.goal || '').trim().slice(0, 300);
      crow[5] = String(p.how || '').replace(/\r/g, '').trim().slice(0, 2000); crow[6] = String(picks); crow[7] = String(gn);
      if (p.scope != null) crow[10] = scopeStr(p.scope);
      writeAll('camp', cr);
      bump(); var cs0 = state(me, devs); cs0.savedId = String(crow[0]); return cs0;
    }
    case 'delCamp': {
      writeAll('camp', rows('camp').filter(function (r) { return r[0]; }).map(function (r) { if (String(r[0]) === String(p.id)) r[9] = '1'; return r; }));
      bump(); return state(me, devs);
    }
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
      s0.devices = devList(devs);
      return s0;
    }
    case 'setRole': {
      var tg2 = find(devs, p.target);
      if (!tg2) return { ok: false, error: '기기를 찾지 못했어요' };
      if (tg2.id === me.id) return { ok: false, error: '지금 쓰는 기기의 권한은 바꿀 수 없어요' };
      tg2.role = ROLES.indexOf(p.role) >= 0 ? p.role : '';
      writeDev(tg2);
      var s1 = state(me, devs);
      s1.devices = devList(devs);
      return s1;
    }
    case 'rename': {   // 이름 고치기·합치기: 모든 기록·기도제목·기기·특별기도의 이름을 바꿈
      var from = cleanName(p.from), to2 = cleanName(p.to);
      if (!from || to2.length < 2) return { ok: false, error: '이름을 확인해 주세요' };
      writeAll('rec', rows('rec').map(function (r) { if (String(r[2]) === from) r[2] = to2; return r; }));
      var al = rows('alias').filter(function (r) { return r[0] && String(r[0]) !== from && String(r[0]) !== to2; })
        .map(function (r) { if (String(r[1]) === from) r[1] = to2; return r; });
      al.push([from, to2, String(now)]);
      writeAll('alias', al);
      var prr = rows('prayer'), hasTo = prr.some(function (r) { return String(r[0]) === to2 && r[1]; });
      writeAll('prayer', prr.filter(function (r) { return !(String(r[0]) === from && hasTo); }).map(function (r) { if (String(r[0]) === from) r[0] = to2; return r; }));
      devs.forEach(function (d) { if (d.name === from) { d.name = to2; writeDev(d); } });
      var chs = rows('church'), toHas = chs.some(function (r) { return String(r[0]) === to2 && r[1]; });
      writeAll('church', chs.filter(function (r) { return r[0] && !(String(r[0]) === from && toHas); }).map(function (r) { if (String(r[0]) === from) r[0] = to2; return r; }));
      writeAll('comment', rows('comment').map(function (r) { if (String(r[1]) === from) r[1] = to2; if (String(r[2]) === from) r[2] = to2; return r; }));
      writeAll('react', dedupe(rows('react').map(function (r) { if (String(r[0]) === from) r[0] = to2; if (String(r[1]) === from) r[1] = to2; return r; }), [0, 1, 2]));
      renameSpecial(from, to2, null);
      bump(); return state(me, devs);
    }
    case 'reimport': { var n = importForm(); var s = state(me, devs); s.imported = n; return s; }
  }
  return { ok: false, error: '모르는 요청' };
}
function devList(devs) {
  var tn = teacherNames();
  return devs.filter(function (d) { return d.name; }).map(function (d) { return { id: d.id, name: d.name, role: d.role, listed: !!tn[d.name], desc: d.desc, last: Number(d.last) || 0 }; });
}
function dedupe(list, cols) {
  var seen = {};
  return list.filter(function (r) { var k = cols.map(function (c) { return r[c]; }).join('|'); if (!r[0] || seen[k]) return false; seen[k] = 1; return true; });
}
// 특별기도의 이름(선택·기도표·참석)을 바꿈. devId 가 있으면 그 기기에서 한 것만
function renameSpecial(from, to, devId) {
  writeAll('pick', dedupe(rows('pick').map(function (r) { if (String(r[1]) === from && (!devId || String(r[4]) === devId)) r[1] = to; return r; }), [0, 1, 2]));
  writeAll('sp', rows('sp').filter(function (r) { return r[0]; }).map(function (r) { if (String(r[3]) === from && (!devId || String(r[5]) === devId)) r[3] = to; return r; }));
  writeAll('join', dedupe(rows('join').map(function (r) { if (String(r[1]) === from && (!devId || String(r[3]) === devId)) r[1] = to; return r; }), [0, 1]));
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
  var chs = rows('church'), toHas = chs.some(function (r) { return String(r[0]) === to && r[1]; });
  if (!toHas) writeAll('church', chs.map(function (r) { if (String(r[0]) === from) r[0] = to; return r; }));
  writeAll('comment', rows('comment').map(function (r) {
    if (String(r[2]) === from && String(r[5]) === devId) r[2] = to;
    if (pc && !hasTo && String(r[1]) === from) r[1] = to;
    return r;
  }));
  writeAll('react', dedupe(rows('react').map(function (r) {
    if (String(r[1]) === from && String(r[4]) === devId) r[1] = to;
    if (pc && !hasTo && String(r[0]) === from) r[0] = to;
    return r;
  }), [0, 1, 2]));
  renameSpecial(from, to, devId);
}
