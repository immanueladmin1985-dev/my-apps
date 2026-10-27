/**
 * 전도현황 앱 서버 (구글 시트 + Apps Script)
 *
 * 설치 방법은 앱의 [설정 → 관리자 → 구글 시트 연결 방법] 또는 README 를 보세요.
 * 1) 구글 시트에서 [확장 프로그램 → Apps Script] 에 이 코드를 붙여 넣습니다.
 * 2) 위쪽에서 setup 을 골라 ▶실행 → 권한 허용. '설정' 시트가 생깁니다.
 * 3) '설정' 시트 B3 에 마스터(관리자) 암호를 적습니다.
 * 4) [배포 → 새 배포 → 웹 앱] 실행: 나, 액세스: 모든 사용자 → 나온 주소를 앱에 넣습니다.
 *    코드를 바꾼 뒤에는 [배포 관리 → ✏️ → 버전: 새 버전 → 배포] 를 해야 적용됩니다.
 *
 * 로그인 방식: 휴대폰마다 앱이 만든 기기 번호와 열쇠로 들어옵니다.
 * 처음 쓰는 휴대폰은 이름을 넣어 승인을 요청하고, 마스터가 승인하면 열립니다.
 * 마스터 암호를 넣은 기기는 마스터가 됩니다(휴대폰을 바꿨을 때도 이렇게 들어옴).
 */

var TABLES = {
  dongs:  { sheet: '동',      cols: [['id','동'],['complex','단지'],['managers','담당자'],['note','메모'],['by','고친 사람'],['updatedAt','고친 시각'],['deleted','지움']] },
  rounds: { sheet: '회차',    cols: [['id','회차ID'],['dong','동'],['no','회차'],['date','날짜'],['gift','선물'],['event','행사'],['people','함께 간 사람'],['text','내용'],['by','고친 사람'],['updatedAt','고친 시각'],['deleted','지움']] },
  units:  { sheet: '세대',    cols: [['id','세대ID'],['dong','동'],['ho','호수'],['seq','순번'],['status','구분'],['simbang','심방대상'],['memo','기본 메모'],['marks','옛 선물 표시'],['by','고친 사람'],['updatedAt','고친 시각'],['deleted','지움']] },
  visits: { sheet: '방문기록', cols: [['id','기록ID'],['unit','세대ID'],['dong','동'],['no','회차'],['res','결과'],['text','내용'],['by','쓴 사람'],['updatedAt','고친 시각'],['deleted','지움']] }
};
var DEV = { sheet: '기기', cols: ['기기ID', '열쇠(암호화)', '이름', '기기 정보', '확인 번호', '상태', '권한', '요청 시각', '승인한 사람', '마지막 접속'] };
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
      ['(안 씀)', ''],
      ['마스터 암호', 'admin1234'],
      ['안내', 'B3 칸의 마스터 암호를 바꾸세요. 암호는 바꾸면 바로 적용돼요(다시 배포하지 않아도 됨). 다른 시트는 앱이 씁니다.']
    ]);
    st.setColumnWidth(1, 120); st.setColumnWidth(2, 460);
  } else {
    // 예전 판(교회 암호 + 관리자 암호)에서 바뀐 것: 관리자 암호가 마스터 암호가 됨
    if (String(st.getRange('A2').getValue()) === '교회 암호') st.getRange('A2').setValue('(안 씀) 예전 교회 암호');
    if (String(st.getRange('A3').getValue()) === '관리자 암호') st.getRange('A3').setValue('마스터 암호');
    st.getRange('B4').setValue('B3 칸의 마스터 암호를 바꾸세요. 암호는 바꾸면 바로 적용돼요(다시 배포하지 않아도 됨). 다른 시트는 앱이 씁니다.');
  }
  Object.keys(TABLES).forEach(function (t) { sheetOf(t); });
  devSheet();
  fixImportedBy();
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
function devSheet() {
  var ss = book(), sh = ss.getSheetByName(DEV.sheet);
  if (!sh) {
    sh = ss.insertSheet(DEV.sheet);
    sh.getRange(1, 1, 1, DEV.cols.length).setValues([DEV.cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:Z').setNumberFormat('@');
  }
  return sh;
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function setting(row) {
  var st = book().getSheetByName('설정');
  if (!st) throw new Error('setup');
  return String(st.getRange(row, 2).getDisplayValue()).trim();
}
function hash(s) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8));
}

// 주소를 브라우저에서 그냥 열면 서버가 작동하는지 보여 줌
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!p.action) return json({ ok: true, app: '전도현황', ver: 2, msg: '전도현황 서버가 작동 중입니다. 이 주소를 앱의 구글 시트 연결 주소에 넣으세요.' });
  return json({ ok: false, error: '앱에서만 쓸 수 있어요' });
}
function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: '잘못된 요청' }); }
  try { return json(handle(p)); }
  catch (err) { return json({ ok: false, error: String(err && err.message || err) }); }
}

/* ---------- 기기 ---------- */
function readDevices() {
  var sh = devSheet(), n = sh.getLastRow() - 1;
  var rows = n > 0 ? sh.getRange(2, 1, n, DEV.cols.length).getValues() : [];
  return rows.map(function (r, i) {
    return { row: i + 2, id: String(r[0]), keyHash: String(r[1]), name: String(r[2]), desc: String(r[3]), code: String(r[4]), status: String(r[5]), role: String(r[6]), requested: String(r[7]), approvedBy: String(r[8]), lastSeen: String(r[9]) };
  }).filter(function (d) { return d.id; });
}
function writeDevice(d) {
  var sh = devSheet();
  var row = [d.id, d.keyHash, d.name, d.desc, d.code, d.status, d.role || '일반', d.requested, d.approvedBy || '', d.lastSeen || ''];
  if (d.row) sh.getRange(d.row, 1, 1, row.length).setValues([row]);
  else { sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setNumberFormat('@').setValues([row]); d.row = sh.getLastRow(); }
}
function pubDevice(d) { return { id: d.id, name: d.name, desc: d.desc, code: d.code, status: d.status, role: d.role, requested: d.requested, approvedBy: d.approvedBy, lastSeen: d.lastSeen }; }
function cleanName(s) { return String(s || '').replace(/\s+/g, '').slice(0, 20); }

// 마스터 암호를 여러 번 틀리면 10분 동안 막음
function masterTry(ok) {
  var c = CacheService.getScriptCache(), n = Number(c.get('mfail') || 0);
  if (n >= 8) return 'locked';
  if (!ok) { c.put('mfail', String(n + 1), 600); return 'mpass'; }
  c.remove('mfail'); return '';
}

function handle(p) {
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try { return handleLocked(p); } finally { lock.releaseLock(); }
}

function handleLocked(p) {
  var devs = readDevices();
  var me = null;
  devs.forEach(function (d) { if (d.id === String(p.dev || '')) me = d; });
  if (me && me.keyHash !== hash(p.key || '')) return { ok: false, error: 'key' };
  var now = Date.now();

  // 승인 요청 (아직 승인 안 된 기기도 할 수 있음)
  if (p.action === 'join') {
    var name = cleanName(p.name);
    if (name.length < 2) return { ok: false, error: '이름을 두 글자 이상 넣어 주세요' };
    if (!p.dev || String(p.dev).length < 16 || !p.key || String(p.key).length < 16) return { ok: false, error: '잘못된 요청' };
    if (me && me.status === '승인') return { ok: true, status: me.status, name: me.name, role: me.role, code: me.code };
    if (!me) {
      var waiting = devs.filter(function (d) { return d.status === '대기'; }).length;
      if (waiting >= 60) return { ok: false, error: '승인을 기다리는 요청이 너무 많아요. 관리자에게 알려 주세요' };
      me = { id: String(p.dev), keyHash: hash(p.key), requested: String(now), role: '일반' };
    }
    me.name = name; me.desc = String(p.desc || '').slice(0, 120); me.status = '대기';
    me.code = me.code || String(Math.floor(1000 + Math.random() * 9000));
    writeDevice(me);
    return { ok: true, status: '대기', name: me.name, role: me.role, code: me.code };
  }

  // 마스터 암호로 들어오기: 이 기기를 마스터로 저장
  if (p.action === 'master') {
    var r = masterTry(String(p.mpass || '').trim() !== '' && String(p.mpass || '').trim() === setting(3));
    if (r) return { ok: false, error: r };
    if (!p.dev || String(p.dev).length < 16 || !p.key || String(p.key).length < 16) return { ok: false, error: '잘못된 요청' };
    if (!me) me = { id: String(p.dev), keyHash: hash(p.key), requested: String(now) };
    me.name = cleanName(p.name) || me.name || '관리자';
    me.desc = String(p.desc || me.desc || '').slice(0, 120);
    me.status = '승인'; me.role = '마스터'; me.approvedBy = '마스터 암호'; me.lastSeen = String(now);
    me.code = me.code || String(Math.floor(1000 + Math.random() * 9000));
    writeDevice(me);
    return { ok: true, status: me.status, name: me.name, role: me.role, code: me.code };
  }

  if (!me) return { ok: false, error: 'device' };
  if (me.status !== '승인') return { ok: false, error: me.status === '대기' ? 'pending' : 'revoked', status: me.status, code: me.code, name: me.name };
  if (now - Number(me.lastSeen || 0) > 30 * 60000) { me.lastSeen = String(now); writeDevice(me); }
  var master = me.role === '마스터';
  var info = { name: me.name, role: me.role, status: me.status, waiting: master ? devs.filter(function (d) { return d.status === '대기'; }).length : 0 };

  switch (p.action) {
    case 'hello': return merge({ ok: true, now: now }, info);
    case 'sync': {
      var saved = push(p.records || [], me.name);
      return merge({ ok: true, now: Date.now(), saved: saved, rows: pull(Number(p.since) || 0) }, info);
    }
    case 'log': return { ok: true, rows: readLog(Number(p.limit) || 200) };
  }
  if (!master) return { ok: false, error: 'master' };
  switch (p.action) {
    case 'devices': return { ok: true, devices: devs.map(pubDevice) };
    case 'approve': case 'reject': case 'revoke': case 'rename': case 'role': {
      var t = null; devs.forEach(function (d) { if (d.id === String(p.target)) t = d; });
      if (!t) return { ok: false, error: '기기를 찾지 못했어요' };
      if (p.action === 'approve') {
        t.status = '승인'; t.approvedBy = me.name; if (p.name) t.name = cleanName(p.name);
        if (p.replace) devs.forEach(function (d) { if (d.id !== t.id && d.name === t.name && d.status === '승인' && d.role !== '마스터') { d.status = '끊김'; writeDevice(d); } });
      }
      if (p.action === 'reject') t.status = '거절';
      if (p.action === 'revoke') { if (t.id === me.id) return { ok: false, error: '지금 쓰는 기기는 끊을 수 없어요' }; t.status = '끊김'; }
      if (p.action === 'rename') t.name = cleanName(p.name) || t.name;
      if (p.action === 'role') { if (t.id === me.id) return { ok: false, error: '지금 쓰는 기기의 권한은 바꿀 수 없어요' }; t.role = p.role === '마스터' ? '마스터' : '일반'; }
      writeDevice(t);
      return { ok: true, devices: readDevices().map(pubDevice) };
    }
    case 'import': return { ok: true, now: Date.now(), count: importAll(p.data || {}, me.name, p.part || 'all') };
  }
  return { ok: false, error: '모르는 요청' };
}
function merge(a, b) { for (var k in b) a[k] = b[k]; return a; }

/* ---------- 자료 ---------- */
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
// 쓴 사람은 앱이 보낸 이름이 아니라 승인된 기기의 이름으로 남김
function push(records, name) {
  var now = Date.now(), saved = 0, logs = [], byT = {};
  records.forEach(function (rec) { if (TABLES[rec.t] && rec.d && rec.d.id) (byT[rec.t] = byT[rec.t] || []).push(rec.d); });
  Object.keys(byT).forEach(function (t) {
    var sh = sheetOf(t), w = TABLES[t].cols.length, n = sh.getLastRow() - 1;
    var data = n > 0 ? sh.getRange(2, 1, n, w).getValues() : [];
    var idx = {}; data.forEach(function (r, i) { idx[String(r[0])] = i; });
    var appends = [], appIdx = {};
    byT[t].forEach(function (d) {
      d.updatedAt = String(now++); d.by = name;
      var id = String(d.id), row = objToRow(t, d), at = idx[id];
      var before = at != null ? JSON.stringify(rowToObj(t, data[at])) : '';
      if (at != null) { sh.getRange(at + 2, 1, 1, w).setValues([row]); data[at] = row; }
      else if (appIdx[id] != null) appends[appIdx[id]] = row;
      else { appIdx[id] = appends.length; appends.push(row); }
      logs.push([new Date(), name, t, id, before, JSON.stringify(d)]);
      saved++;
    });
    if (appends.length) sh.getRange(sh.getLastRow() + 1, 1, appends.length, w).setNumberFormat('@').setValues(appends);
  });
  if (logs.length) {
    var lg = book().getSheetByName(LOG_SHEET);
    lg.getRange(lg.getLastRow() + 1, 1, logs.length, 6).setValues(logs);
  }
  return saved;
}

function readLog(limit) {
  var lg = book().getSheetByName(LOG_SHEET);
  var n = lg.getLastRow() - 1; if (n <= 0) return [];
  var k = Math.min(limit, n);
  return lg.getRange(n - k + 2, 1, k, 6).getValues().reverse().map(function (r) {
    return { time: r[0] instanceof Date ? r[0].getTime() : String(r[0]), by: String(r[1]), t: String(r[2]), id: String(r[3]), before: String(r[4]), after: String(r[5]) };
  });
}

// 예전 판은 엑셀에서 옮긴 기록에도 불러온 사람 이름을 적었음 → 같은 시각에 한꺼번에 들어간 줄은 이름을 비움
function fixImportedBy() {
  Object.keys(TABLES).forEach(function (t) {
    var sh = sheetOf(t), w = TABLES[t].cols.length, n = sh.getLastRow() - 1;
    if (n < 50) return;
    var keys = TABLES[t].cols.map(function (c) { return c[0]; }), ui = keys.indexOf('updatedAt'), bi = keys.indexOf('by');
    var data = sh.getRange(2, 1, n, w).getValues(), cnt = {}, top = '', topN = 0;
    data.forEach(function (r) { var k = String(r[ui]); cnt[k] = (cnt[k] || 0) + 1; if (cnt[k] > topN) { topN = cnt[k]; top = k; } });
    if (topN < 50) return;
    var col = data.map(function (r) { return [String(r[ui]) === top ? '' : r[bi]]; });
    sh.getRange(2, bi + 1, n, 1).setValues(col);
  });
}

// 처음 엑셀 불러오기: 표를 비우고 통째로 씀 (part 로 표 하나씩 나눠 보낼 수 있음)
function importAll(data, name, part) {
  var now = Date.now(), count = 0;
  Object.keys(TABLES).forEach(function (t) {
    if (part !== 'all' && part !== t) return;
    var list = data[t] || [], sh = sheetOf(t), w = TABLES[t].cols.length;
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, w).clearContent();
    if (!list.length) return;
    var rows = list.map(function (d) { d.updatedAt = String(now); d.by = d.by || ''; return objToRow(t, d); });
    for (var i = 0; i < rows.length; i += 5000) {
      var chunk = rows.slice(i, i + 5000);
      sh.getRange(2 + i, 1, chunk.length, w).setNumberFormat('@').setValues(chunk);
    }
    count += rows.length;
  });
  var lg = book().getSheetByName(LOG_SHEET);
  lg.appendRow([new Date(), name, part, '엑셀 불러오기', '', count + '줄']);
  return count;
}
