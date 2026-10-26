/* 자료 보관(IndexedDB) 과 구글 시트 주고받기 */
(function () {
  'use strict';
  const TABLES = ['dongs', 'rounds', 'units', 'visits'];
  const NUM = { rounds: ['no'], units: ['seq'], visits: ['no'] };

  /* ---------- 설정 (localStorage) ---------- */
  const CFG_KEY = 'evangelism-cfg';
  const cfg = Object.assign({ server: '', pass: '', admin: '', name: '', since: 0, autoFS: true, installDismissed: false, font: 0, active: {}, lastStatus: {} },
    (() => { try { return JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch (e) { return {}; } })());
  if (!cfg.server && window.EV_SERVER) cfg.server = window.EV_SERVER;
  function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} }

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
  const data = { dongs: new Map(), rounds: new Map(), units: new Map(), visits: new Map() };
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
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const o = {}; TABLES.forEach(t => o[t] = [...data[t].values()]);
      kvSet('data', o); kvSet('outbox', outbox); kvSet('log', localLog.slice(-500));
    }, 300);
  }

  async function load() {
    const o = await kvGet('data');
    if (o) TABLES.forEach(t => (o[t] || []).forEach(d => data[t].set(String(d.id), norm(t, d))));
    outbox = (await kvGet('outbox')) || [];
    localLog = (await kvGet('log')) || [];
    changed('load');
  }

  // 한 건 저장: 화면에 바로 반영하고 보낼 목록에 넣음
  function put(t, d) {
    const id = String(d.id);
    const before = data[t].get(id);
    const rec = norm(t, Object.assign({}, before || {}, d, { id, by: cfg.name, updatedAt: String(Date.now()) }));
    data[t].set(id, rec);
    outbox = outbox.filter(x => !(x.t === t && String(x.d.id) === id));
    outbox.push({ t, d: rec });
    localLog.push({ time: Date.now(), by: cfg.name, t, id, before: before ? JSON.stringify(before) : '', after: JSON.stringify(rec) });
    persist(); changed('put'); scheduleSync(800);
    return rec;
  }
  function del(t, id) { return put(t, { id, deleted: '1' }); }

  function replaceAll(o) {
    TABLES.forEach(t => { data[t].clear(); (o[t] || []).forEach(d => data[t].set(String(d.id), norm(t, d))); });
    outbox = []; persist(); changed('import');
  }

  /* ---------- 서버 ---------- */
  const online = () => !!(cfg.server && cfg.pass);
  let state = { busy: false, error: '', lastOk: 0 };

  async function call(action, extra, timeoutMs) {
    if (!cfg.server) throw new Error('서버 주소가 없어요');
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), timeoutMs || 60000);
    try {
      let r;
      try { r = await fetch(cfg.server, { method: 'POST', body: JSON.stringify(Object.assign({ action, pass: cfg.pass, admin: cfg.admin, name: cfg.name }, extra || {})), signal: ctl ? ctl.signal : undefined, redirect: 'follow' }); }
      catch (x) { const e = new Error(navigator.onLine === false ? '인터넷이 연결되어 있지 않아요' : '구글 시트 주소에 닿지 못했어요'); e.code = navigator.onLine === false ? 'offline' : 'net'; throw e; }
      let j;
      try { j = await r.json(); } catch (x) { const e = new Error('구글 시트가 앱 대신 다른 화면(로그인 등)을 보냈어요'); e.code = 'notjson'; throw e; }
      if (!j.ok) {
        const msg = { pass: '교회 암호가 맞지 않아요', admin: '관리자 암호가 맞지 않아요', setup: '구글 시트에서 setup 을 아직 실행하지 않았어요' }[j.error];
        const e = new Error(msg || (j.error || '실패')); e.code = j.error; throw e;
      }
      return j;
    } finally { clearTimeout(tm); }
  }

  let syncTimer = null, syncing = null;
  function scheduleSync(ms) { clearTimeout(syncTimer); if (online()) syncTimer = setTimeout(sync, ms || 0); }

  async function sync() {
    if (!online()) return;
    if (syncing) return syncing;
    syncing = (async () => {
      state.busy = true; changed('sync');
      try {
        while (outbox.length) {
          const batch = outbox.slice(0, 150);
          await call('push', { records: batch });
          const sent = new Set(batch.map(x => x.t + '|' + x.d.id + '|' + x.d.updatedAt));
          outbox = outbox.filter(x => !sent.has(x.t + '|' + x.d.id + '|' + x.d.updatedAt));
          persist();
        }
        const j = await call('pull', { since: Math.max(0, (cfg.since || 0) - 120000) }, 90000);
        const pending = new Set(outbox.map(x => x.t + '|' + x.d.id));
        let n = 0;
        TABLES.forEach(t => (j.rows[t] || []).forEach(d => {
          const id = String(d.id); if (pending.has(t + '|' + id)) return;
          const cur = data[t].get(id);
          if (cur && String(cur.updatedAt) === String(d.updatedAt)) return;
          data[t].set(id, norm(t, d)); n++;
        }));
        cfg.since = j.now; saveCfg();
        state.error = ''; state.lastOk = Date.now();
        if (n) { persist(); changed('pull'); }
      } catch (e) {
        state.error = e.code === 'pass' ? 'pass' : (e.message || '연결 안 됨');
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

  window.Store = {
    TABLES, cfg, saveCfg, data, load, put, del, replaceAll, sync, scheduleSync, fullReload, serverImport, call, online,
    get state() { return state; }, get outbox() { return outbox; }, get localLog() { return localLog; }, get ver() { return ver; },
    on(f) { listeners.push(f); }
  };
})();
