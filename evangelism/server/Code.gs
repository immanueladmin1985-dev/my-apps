/**
 * 전도현황 앱 서버 (구글 시트 + Apps Script)
 *
 * 설치 방법은 앱의 [설정 → 관리자 → 구글 시트 연결 방법] 또는 README 를 보세요.
 * 1) 새 구글 시트를 만들고 [확장 프로그램 → Apps Script] 에 이 코드를 붙여 넣습니다.
 * 2) 위쪽에서 setup 을 골라 ▶실행 → 권한 허용. '설정' 시트가 생깁니다.
 * 3) '설정' 시트 B2 에 교회 암호, B3 에 관리자 암호를 적습니다.
 * 4) [배포 → 새 배포 → 웹 앱] 실행: 나, 액세스: 모든 사용자 → 나온 주소를 앱에 넣습니다.
 */

var TABLES = {
  dongs:  { sheet: '동',      cols: [['id','동'],['complex','단지'],['managers','담당자'],['note','메모'],['by','고친 사람'],['updatedAt','고친 시각'],['deleted','지움']] },
  rounds: { sheet: '회차',    cols: [['id','회차ID'],['dong','동'],['no','회차'],['date','날짜'],['gift','선물'],['event','행사'],['people','함께 간 사람'],['text','내용'],['by','고친 사람'],['updatedAt','고친 시각'],['deleted','지움']] },
  units:  { sheet: '세대',    cols: [['id','세대ID'],['dong','동'],['ho','호수'],['seq','순번'],['status','구분'],['simbang','심방대상'],['memo','기본 메모'],['marks','옛 선물 표시'],['by','고친 사람'],['updatedAt','고친 시각'],['deleted','지움']] },
  visits: { sheet: '방문기록', cols: [['id','기록ID'],['unit','세대ID'],['dong','동'],['no','회차'],['res','결과'],['text','내용'],['by','쓴 사람'],['updatedAt','고친 시각'],['deleted','지움']] }
};
var LOG_SHEET = '변경기록';

// 시트에서 연 Apps Script 면 그 시트를, 따로 만든 프로젝트면 setup 때 새로 만든 시트를 씀
function book() {
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (ss) return ss;
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  throw new Error('setup');
}

function setup() {
  var has = null;
  try { has = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (!has && !PropertiesService.getScriptProperties().getProperty('SHEET_ID')) {
    var made = SpreadsheetApp.create('전도현황');
    PropertiesService.getScriptProperties().setProperty('SHEET_ID', made.getId());
    Logger.log('새 구글 시트를 만들었어요: ' + made.getUrl());
  }
  var ss = book();
  var st = ss.getSheetByName('설정') || ss.insertSheet('설정', 0);
  st.getRange('B2:B3').setNumberFormat('@');   // "0410" 같은 암호의 앞자리 0이 사라지지 않게
  if (!st.getRange('A1').getValue()) {
    st.getRange('A1:B4').setValues([
      ['전도현황 앱 설정', ''],
      ['교회 암호', '1234'],
      ['관리자 암호', 'admin1234'],
      ['안내', 'B2·B3 칸의 암호를 바꾼 뒤 [배포 → 새 배포 → 웹 앱]을 하세요. 다른 시트는 앱이 씁니다.']
    ]);
    st.setColumnWidth(1, 120); st.setColumnWidth(2, 420);
  }
  Object.keys(TABLES).forEach(function (t) { sheetOf(t); });
  var lg = ss.getSheetByName(LOG_SHEET) || ss.insertSheet(LOG_SHEET);
  if (lg.getLastRow() === 0) { lg.appendRow(['시각', '사람', '표', 'ID', '바꾸기 전', '바꾼 뒤']); lg.setFrozenRows(1); }
}

function sheetOf(t) {
  var ss = book(), d = TABLES[t];
  var sh = ss.getSheetByName(d.sheet);
  if (!sh) {
    sh = ss.insertSheet(d.sheet);
    sh.getRange(1, 1, 1, d.cols.length).setValues([d.cols.map(function (c) { return c[1]; })]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:Z').setNumberFormat('@');   // "=" 로 시작하는 메모도 글자로 저장
  }
  return sh;
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function setting(row) {
  var st = book().getSheetByName('설정');
  if (!st) throw new Error('setup');
  return String(st.getRange(row, 2).getDisplayValue()).trim();
}

// 주소를 브라우저에서 그냥 열면 서버가 작동하는지 보여 줌
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!p.action) return json({ ok: true, app: '전도현황', msg: '전도현황 서버가 작동 중입니다. 이 주소를 앱의 구글 시트 연결 주소에 넣으세요.' });
  return handle(p);
}
function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: '잘못된 요청' }); }
  return handle(p);
}

function handle(p) {
  try {
    if (!p.pass || String(p.pass).trim() !== setting(2)) return json({ ok: false, error: 'pass' });
    var admin = p.admin && String(p.admin).trim() === setting(3);
    switch (p.action) {
      case 'hello': return json({ ok: true, admin: !!admin, now: Date.now() });
      case 'pull':  return json({ ok: true, now: Date.now(), rows: pull(Number(p.since) || 0) });
      case 'push':  return json({ ok: true, now: Date.now(), saved: push(p.records || [], p.name || '') });
      case 'log':   return json({ ok: true, rows: readLog(Number(p.limit) || 200) });
      case 'import':
        if (!admin) return json({ ok: false, error: 'admin' });
        return json({ ok: true, now: Date.now(), count: importAll(p.data || {}, p.name || '', p.part || 'all') });
    }
    return json({ ok: false, error: '모르는 요청' });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

function rowToObj(t, r) {
  var o = {};
  TABLES[t].cols.forEach(function (c, i) { o[c[0]] = r[i] === '' || r[i] == null ? '' : String(r[i]); });
  return o;
}
function objToRow(t, o) { return TABLES[t].cols.map(function (c) { return o[c[0]] == null ? '' : String(o[c[0]]); }); }

function pull(since) {
  var out = {};
  Object.keys(TABLES).forEach(function (t) {
    var sh = sheetOf(t), n = sh.getLastRow() - 1, list = [];
    if (n > 0) {
      var ui = TABLES[t].cols.map(function (c) { return c[0]; }).indexOf('updatedAt');
      sh.getRange(2, 1, n, TABLES[t].cols.length).getValues().forEach(function (r) {
        if (r[0] !== '' && Number(r[ui]) > since) list.push(rowToObj(t, r));
      });
    }
    out[t] = list;
  });
  return out;
}

// 받은 기록마다 같은 ID 줄을 고치거나 새로 붙이고, 변경기록에 바꾸기 전·뒤를 남김
function push(records, name) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var now = Date.now(), saved = 0, logs = [], byT = {};
    records.forEach(function (rec) { if (TABLES[rec.t] && rec.d && rec.d.id) (byT[rec.t] = byT[rec.t] || []).push(rec.d); });
    Object.keys(byT).forEach(function (t) {
      var sh = sheetOf(t), w = TABLES[t].cols.length, n = sh.getLastRow() - 1;
      var data = n > 0 ? sh.getRange(2, 1, n, w).getValues() : [];
      var idx = {}; data.forEach(function (r, i) { idx[String(r[0])] = i; });
      var appends = [], appIdx = {};
      byT[t].forEach(function (d) {
        d.updatedAt = String(now++); d.by = d.by || name;
        var id = String(d.id), row = objToRow(t, d), at = idx[id];
        var before = at != null ? JSON.stringify(rowToObj(t, data[at])) : '';
        if (at != null) { sh.getRange(at + 2, 1, 1, w).setValues([row]); data[at] = row; }
        else if (appIdx[id] != null) appends[appIdx[id]] = row;
        else { appIdx[id] = appends.length; appends.push(row); }
        logs.push([new Date(), name, t, String(d.id), before, JSON.stringify(d)]);
        saved++;
      });
      if (appends.length) sh.getRange(sh.getLastRow() + 1, 1, appends.length, w).setNumberFormat('@').setValues(appends);
    });
    if (logs.length) {
      var lg = book().getSheetByName(LOG_SHEET);
      lg.getRange(lg.getLastRow() + 1, 1, logs.length, 6).setValues(logs);
    }
    return saved;
  } finally { lock.releaseLock(); }
}

function readLog(limit) {
  var lg = book().getSheetByName(LOG_SHEET);
  var n = lg.getLastRow() - 1; if (n <= 0) return [];
  var k = Math.min(limit, n);
  return lg.getRange(n - k + 2, 1, k, 6).getValues().reverse().map(function (r) {
    return { time: r[0] instanceof Date ? r[0].getTime() : String(r[0]), by: String(r[1]), t: String(r[2]), id: String(r[3]), before: String(r[4]), after: String(r[5]) };
  });
}

// 처음 엑셀 불러오기: 표를 비우고 통째로 씀 (part 로 표 하나씩 나눠 보낼 수 있음)
function importAll(data, name, part) {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var now = Date.now(), count = 0;
    Object.keys(TABLES).forEach(function (t) {
      if (part !== 'all' && part !== t) return;
      var list = data[t] || [], sh = sheetOf(t), w = TABLES[t].cols.length;
      if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, w).clearContent();
      if (!list.length) return;
      var rows = list.map(function (d) { d.updatedAt = String(now); d.by = d.by || name; return objToRow(t, d); });
      for (var i = 0; i < rows.length; i += 5000) {
        var chunk = rows.slice(i, i + 5000);
        sh.getRange(2 + i, 1, chunk.length, w).setNumberFormat('@').setValues(chunk);
      }
      count += rows.length;
    });
    var lg = book().getSheetByName(LOG_SHEET);
    lg.appendRow([new Date(), name, part, '엑셀 불러오기', '', count + '줄']);
    return count;
  } finally { lock.releaseLock(); }
}
