/* 자료 보관(IndexedDB) 과 구글 시트 주고받기 */
(function () {
  'use strict';
  const TABLES = ['dongs', 'rounds', 'units', 'visits'];
  const NUM = { rounds: ['no'], units: ['seq'], visits: ['no'] };
  const SCHEMA = 2;

  /* ---------- 설정 (localStorage) ---------- */
  const CFG_KEY = 'evangelism-cfg';
  const cfg = Object.assign({ server: '', name: '', role: '', status: '', code: '', since: 0, autoFS: true, installDismissed: false, font: 0, theme: 'light', active: {}, waiting: 0, schema: 0, tutorialSeen: false, report: null },
    (() => { try { return JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch (e) { return {}; } })());
  if (!cfg.server && window.EV_SERVER) cfg.server = window.EV_SERVER;
  function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} }

  /* ---------- 이 기기의 번호와 열쇠 ---------- */
  // 브라우저는 휴대폰 고유번호를 읽을 수 없어서, 처음 열 때 앱이 만든 번호를 이 기기에 저장해 두고 씀
  const DEV_KEY = 'evangelism-device';
  const rnd = n => { const a = new Uint8Array(n); (window.crypto || window.msCrypto).getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); };
  let device = (() => { try { return JSON.parse(localStorage.getItem(DEV_KEY) || 'null'); } catch (e) { return null; } })();
  function saveDevice() { try { localStorage.setItem(DEV_KEY, JSON.stringify(device)); } catch (e) {} kvSet('device', device); }
  async function ensureDevice() {
    if (!device || !device.id) device = (await kvGet('device')) || null;   // localStorage 가 지워졌으면 IndexedDB 에서 되살림
    if (!device || !device.id) device = { id: rnd(16), key: rnd(24) };
    saveDevice();
    return device;
  }
  async function deviceDesc() {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let os = ios ? (/iPad/.test(ua) || !/iPhone/.test(ua) ? '아이패드' : '아이폰') : /Android/.test(ua) ? '안드로이드' : /Windows/.test(ua) ? '윈도우 PC' : /Mac/.test(ua) ? '맥' : '기기';
    const br = /SamsungBrowser/.test(ua) ? '삼성 인터넷' : /KAKAOTALK/i.test(ua) ? '카카오톡' : /NAVER/.test(ua) ? '네이버' : /Edg\//.test(ua) ? '엣지' : /CriOS|Chrome\//.test(ua) ? '크롬' : /Safari/.test(ua) ? '사파리' : '브라우저';
    let model = '';
    try { if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) model = (await navigator.userAgentData.getHighEntropyValues(['model'])).model || ''; } catch (e) {}
    if (!model) { const m = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\sBuild|\))/); if (m && !/^K$/.test(m[1].trim())) model = m[1].trim(); }
    return [os + (model ? ' ' + model : ''), br, `${screen.width}×${screen.height}`].join(' · ');
  }

  /* ---------- IndexedDB ---------- */
  let dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      try {
        const r = indexedDB.open('evangelism', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
    return dbp;
  }
  async function kvGet(k) {
    try { const db = await idb(); return await new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
    catch (e) { return undefined; }
  }
  async function kvSet(k, v) {
    try { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
    catch (e) {}
  }

  /* ---------- 자료 ---------- */
  let data = { dongs: new Map(), rounds: new Map(), units: new Map(), visits: new Map() };
  let real = null;     // 사용법 둘러보기 동안 진짜 자료를 잠시 치워 둠
  let outbox = [];     // 아직 구글 시트에 못 보낸 것 [{t, d}]
  let localLog = [];   // 이 기기에서 고친 것 (서버가 없을 때 '고친 기록'에 씀)
  const listeners = [];
  let ver = 0;         // 자료가 바뀔 때마다 늘어남(화면 다시 그리기·색인 계산용)

  function norm(t, o) {
    const d = Object.assign({}, o);
    (NUM[t] || []).forEach(k => { if (d[k] !== '' && d[k] != null) d[k] = Number(d[k]); });
    ['by', 'deleted', 'updatedAt'].forEach(k => { if (d[k] == null) d[k] = ''; });
    return d;
  }
  function changed(why) { ver++; listeners.forEach(f => { try { f(why); } catch (e) { console.error(e); } }); }

  let saveTimer = null;
  function persist() {
    if (real) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const o = {}; TABLES.forEach(t => o[t] = [...data[t].values()]);
      kvSet('data', o); kvSet('outbox', outbox); kvSet('log', localLog.slice(-500));
    }, 300);
  }

  async function load() {
    await ensureDevice();
    const o = await kvGet('data');
    if (o) TABLES.forEach(t => (o[t] || []).forEach(d => data[t].set(String(d.id), norm(t, d))));
    outbox = (await kvGet('outbox')) || [];
    localLog = (await kvGet('log')) || [];
    // 서버 판이 바뀌어 예전 자료를 한 번 새로 받아야 할 때
    if (cfg.schema !== SCHEMA) { if (cfg.server) { cfg.since = 0; TABLES.forEach(t => data[t].clear()); } cfg.schema = SCHEMA; saveCfg(); }
    changed('load');
  }

  // 한 건 저장: 화면에 바로 반영하고 보낼 목록에 넣음
  function put(t, d) {
    const id = String(d.id);
    const before = data[t].get(id);
    const rec = norm(t, Object.assign({}, before || {}, d, { id, by: cfg.name, updatedAt: String(Date.now()) }));
    data[t].set(id, rec);
    if (!real) {
      outbox = outbox.filter(x => !(x.t === t && String(x.d.id) === id));
      outbox.push({ t, d: rec });
      localLog.push({ time: Date.now(), by: cfg.name, t, id, before: before ? JSON.stringify(before) : '', after: JSON.stringify(rec) });
      persist(); scheduleSync(800);
    }
    changed('put');
    return rec;
  }
  function del(t, id) { return put(t, { id, deleted: '1' }); }

  function replaceAll(o) {
    TABLES.forEach(t => { data[t].clear(); (o[t] || []).forEach(d => data[t].set(String(d.id), norm(t, d))); });
    outbox = []; persist(); changed('import');
  }

  // 사용법 둘러보기: 연습 자료로 바꿔 두고, 끝나면 진짜 자료로 되돌림(아무것도 저장·전송하지 않음)
  function sandbox(demo) {
    if (demo) {
      if (!real) real = data;
      data = { dongs: new Map(), rounds: new Map(), units: new Map(), visits: new Map() };
      TABLES.forEach(t => (demo[t] || []).forEach(d => data[t].set(String(d.id), norm(t, d))));
    } else if (real) { data = real; real = null; }
    api.data = data;
    changed('import');
  }

  /* ---------- 서버 ---------- */
  const approved = () => cfg.status === '승인';
  const online = () => !!(cfg.server && approved());
  let state = { busy: false, error: '', lastOk: 0 };

  async function call(action, extra, timeoutMs) {
    if (!cfg.server) throw new Error('서버 주소가 없어요');
    await ensureDevice();
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), timeoutMs || 60000);
    try {
      let r;
      try { r = await fetch(cfg.server, { method: 'POST', body: JSON.stringify(Object.assign({ action, dev: device.id, key: device.key }, extra || {})), signal: ctl ? ctl.signal : undefined, redirect: 'follow' }); }
      catch (x) {
        const off = navigator.onLine === false, slow = x && x.name === 'AbortError';
        const e = new Error(off ? '인터넷이 연결되어 있지 않아요' : slow ? '구글 시트가 너무 늦게 답해요' : '구글 시트 주소에 닿지 못했어요'); e.code = off ? 'offline' : slow ? 'slow' : 'net'; throw e;
      }
      let j;
      try { j = await r.json(); } catch (x) { const e = new Error('구글 시트가 앱 대신 다른 화면(로그인 등)을 보냈어요'); e.code = 'notjson'; throw e; }
      if (!j.ok) {
        const msg = { pass: '구글 시트의 서버 코드가 예전 판이에요. 관리자에게 알려 주세요', mpass: '마스터 암호가 맞지 않아요', locked: '마스터 암호를 여러 번 틀려서 10분 동안 막혔어요', master: '관리자(마스터)만 할 수 있어요', setup: '구글 시트에서 setup 을 아직 실행하지 않았어요', device: '승인되지 않은 기기예요', pending: '아직 승인을 기다리는 중이에요', revoked: '이 기기는 사용이 끊겼어요', key: '기기 정보가 맞지 않아요' }[j.error];
        const e = new Error(msg || (j.error || '실패')); e.code = j.error; e.res = j; throw e;
      }
      if (j.status) { cfg.status = j.status; }
      if (j.name) cfg.name = j.name;
      if (j.role) cfg.role = j.role;
      if (j.code) cfg.code = j.code;
      if (j.waiting != null) cfg.waiting = j.waiting;
      saveCfg();
      return j;
    } finally { clearTimeout(tm); }
  }
  // 승인이 풀렸거나 기다리는 중이면 화면을 로그인 쪽으로
  function authFail(e) {
    if (['device', 'pending', 'revoked', 'key'].includes(e.code)) {
      cfg.status = e.code === 'pending' ? '대기' : e.code === 'revoked' ? ((e.res && e.res.status) || '끊김') : e.code === 'key' ? '열쇠' : '';
      if (e.res && e.res.code) cfg.code = e.res.code;
      saveCfg(); changed('auth'); return true;
    }
    return false;
  }

  let syncTimer = null, syncing = null;
  function scheduleSync(ms) { clearTimeout(syncTimer); if (online() && !real) syncTimer = setTimeout(sync, ms || 0); }

  // 보낼 것을 보내고 바뀐 것을 받는 일을 한 번의 요청으로 함
  async function sync() {
    if (!online() || real) return;
    if (syncing) return syncing;
    syncing = (async () => {
      state.busy = true; changed('sync');
      const tgt = data;   // 도중에 사용법 둘러보기가 시작돼도 진짜 자료에 넣음
      try {
        let more = true;
        while (more) {
          const batch = outbox.slice(0, 150);
          const j = await call('sync', { records: batch, since: Math.max(0, (cfg.since || 0) - 120000) }, 90000);
          const sent = new Set(batch.map(x => x.t + '|' + x.d.id + '|' + x.d.updatedAt));
          outbox = outbox.filter(x => !sent.has(x.t + '|' + x.d.id + '|' + x.d.updatedAt));
          const pending = new Set(outbox.map(x => x.t + '|' + x.d.id));
          let n = 0;
          TABLES.forEach(t => (j.rows[t] || []).forEach(d => {
            const id = String(d.id); if (pending.has(t + '|' + id)) return;
            const cur = tgt[t].get(id);
            if (cur && String(cur.updatedAt) === String(d.updatedAt) && cur.by === d.by) return;
            tgt[t].set(id, norm(t, d)); n++;
          }));
          cfg.since = j.now; saveCfg();
          persist();
          if (n || batch.length) changed('pull');
          more = outbox.length > 0;
        }
        state.error = ''; state.lastOk = Date.now();
      } catch (e) {
        if (!authFail(e)) state.error = e.message || '연결 안 됨';
      } finally {
        state.busy = false; syncing = null; changed('sync');
      }
    })();
    return syncing;
  }

  async function fullReload() { cfg.since = 0; saveCfg(); TABLES.forEach(t => data[t].clear()); await sync(); persist(); changed('import'); }

  async function serverImport(o) {
    // 표마다 나눠 보냄(한 번에 너무 크면 구글이 거절함)
    for (const t of TABLES) await call('import', { part: t, data: { [t]: o[t] } }, 300000);
    cfg.since = 0; saveCfg(); outbox = [];
    TABLES.forEach(t => data[t].clear());
    await sync();
  }

  const api = {
    TABLES, cfg, saveCfg, data, load, put, del, replaceAll, sandbox, sync, scheduleSync, fullReload, serverImport, call, online, approved, authFail,
    ensureDevice, deviceDesc,
    get device() { return device; }, get sandboxed() { return !!real; },
    get state() { return state; }, get outbox() { return outbox; }, get localLog() { return localLog; }, get ver() { return ver; },
    on(f) { listeners.push(f); }
  };
  window.Store = api;
})();
