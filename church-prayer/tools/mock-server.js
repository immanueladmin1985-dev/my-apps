// 내 컴퓨터 시험용: server/Code.gs 를 가짜 구글 시트 위에서 그대로 돌리고, 앱 파일도 함께 보여 줌
// 실행: node tools/mock-server.js [포트]   →  http://localhost:8790/?s=http://localhost:8790/exec
// (진짜 구글 시트에는 아무것도 쓰지 않음. 자료는 실행하는 동안 메모리에만 있음)
const http = require('http'), fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..'), PORT = +process.argv[2] || 8790;

function makeSheet(name) {
  const grid = [];   // grid[r][c] (0부터)
  const sh = {
    getName: () => name,
    getLastRow: () => { for (let r = grid.length - 1; r >= 0; r--) if ((grid[r] || []).some(v => v !== '' && v != null)) return r + 1; return 0; },
    getLastColumn: () => Math.max(0, ...grid.map(r => (r || []).length)),
    getRange(a, b, nr, nc) {
      let r0, c0;
      if (typeof a === 'string') {
        const m = a.match(/^([A-Z]+)(\d+)?(?::([A-Z]+)(\d+)?)?$/);
        const col = s => s.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
        c0 = col(m[1]); r0 = m[2] ? +m[2] : 1;
        nc = m[3] ? col(m[3]) - c0 + 1 : 1; nr = m[4] ? +m[4] - r0 + 1 : (m[2] ? 1 : 1);
      } else { r0 = a; c0 = b; nr = nr || 1; nc = nc || 1; }
      const rg = {
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => { const v = (grid[r0 - 1 + i] || [])[c0 - 1 + j]; return v == null ? '' : v; })),
        getValue: () => rg.getValues()[0][0],
        getDisplayValue: () => String(rg.getValue()),
        setValues(v) { v.forEach((row, i) => row.forEach((x, j) => { grid[r0 - 1 + i] = grid[r0 - 1 + i] || []; grid[r0 - 1 + i][c0 - 1 + j] = typeof x === 'number' ? String(x) : x; })); return rg; },
        setValue(x) { return rg.setValues([[x]]); },
        clearContent() { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (grid[r0 - 1 + i]) grid[r0 - 1 + i][c0 - 1 + j] = ''; return rg; },
        setNumberFormat: () => rg, setFontWeight: () => rg
      };
      return rg;
    },
    setFrozenRows() {}, setColumnWidth() {}, clearContents() { grid.length = 0; }
  };
  return sh;
}
const sheets = {};
const book = {
  getSheetByName: n => sheets[n] || null,
  insertSheet: n => (sheets[n] = makeSheet(n)),
  getSheets: () => Object.values(sheets),
  getSpreadsheetTimeZone: () => 'Asia/Seoul'
};
const cache = {}, props = {};
const pad = n => String(n).padStart(2, '0');
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => book },
  CacheService: { getScriptCache: () => ({ get: k => cache[k] == null ? null : cache[k], put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; }, getAll: ks => Object.fromEntries(ks.filter(k => k in cache).map(k => [k, cache[k]])), putAll: o => Object.assign(cache, o) }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ forSpreadsheet: () => ({ onFormSubmit: () => ({ create() {} }) }) }) },
  Utilities: {
    base64Encode: b => Buffer.from(b).toString('base64'),
    computeDigest: (_a, s) => [...crypto.createHash('sha256').update(String(s)).digest()],
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    formatDate: d => { const k = new Date(d.getTime() + 9 * 3600000); return k.getUTCFullYear() + '-' + pad(k.getUTCMonth() + 1) + '-' + pad(k.getUTCDate()); }
  },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  Logger: { log: m => console.log('[GAS]', m) }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'server/Code.gs'), 'utf8'), ctx);
ctx.setup();
sheets['설정'].getRange(3, 2).setValue('test');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/exec') {
    const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    if (req.method === 'GET') { res.writeHead(200, cors); res.end(ctx.doGet().s); return; }
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      setTimeout(() => { res.writeHead(200, cors); res.end(ctx.doPost({ postData: { contents: body } }).s); }, 150);
    });
    return;
  }
  let p = path.join(ROOT, decodeURIComponent(url.pathname)); if (p.endsWith(path.sep) || url.pathname === '/') p = path.join(p, 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); res.end('없음'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(p).pipe(res);
}).listen(PORT, () => console.log('시험 서버: http://localhost:' + PORT + '/?s=http://localhost:' + PORT + '/exec'));
