/* 원래 엑셀(동별 시트)을 앱 자료로 정리하는 코드. 브라우저와 node 에서 같이 씀 */
(function (G) {
  'use strict';

  const STATUS = ['대상', '특별', '교인', '장결', '거부', '부재', '교회', '성당', '이사', '기타'];
  const STATUS_ALIAS = { '특별대상': '특별', '장기결석': '장결', '타교회': '교회', '천주교': '성당', '거절': '거부' };

  const clean = s => String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').trim();
  const oneLine = s => clean(s).replace(/\n+/g, ' ');

  function normStatus(v) {
    const s = oneLine(v).replace(/\s/g, '');
    if (!s) return '기타';
    if (STATUS_ALIAS[s]) return STATUS_ALIAS[s];
    for (const k of STATUS) if (s.indexOf(k) === 0) return k;
    return '기타';
  }

  // "19.4.8.월. 오전 …" → "2019-04-08" (해만 있거나 날이 없으면 있는 만큼)
  function parseDate(t) {
    const m = String(t).match(/^\s*(\d{2})\s*\.\s*(\d{1,2})\s*\.?\s*(\d{1,2})?/);
    if (!m) return '';
    const y = 2000 + +m[1], mo = +m[2], d = m[3] ? +m[3] : 0;
    if (mo < 1 || mo > 12) return '';
    return y + '-' + String(mo).padStart(2, '0') + (d >= 1 && d <= 31 ? '-' + String(d).padStart(2, '0') : '');
  }
  const GIFTS = ['선물세트', '두부과자', '게발선인장', '개발선인장', '가랑꼬에', '가랑꼬', '베고니아', '배고니야', '카네이션', '순두부', '연두부', '도토리묵', '콩나물', '초청장', '마스크', '수세미', '비맥스', '덴드롱', '목캔디', '호박죽', '갈비', '달력', '계란', '달걀', '화분', '호야', '철쭉', '한과', '파스', '채칼', '잡곡', '찐빵', '과자', '두부', '고추', '행주', '빵', '꽃', '묵', '김', '약', '떡'];
  function parseGift(t) {
    const s = ' ' + String(t).replace(/\([^()]*\)/g, ' ') + ' ';   // (홍길동) 같은 이름은 빼고 찾음
    let best = '', at = 1e9;
    GIFTS.forEach(g => {
      const re = g.length === 1 ? new RegExp('[\\s,.\\-~/·]' + g + '(?=[\\s,.\\d/·]|전달|드림)') : new RegExp(g);
      const m = s.match(re); if (!m) return;
      const i = m.index + (g.length === 1 ? 1 : 0);
      if (i < at || (i === at && g.length > best.length)) { best = g; at = i; }
    });
    return best;
  }
  function parsePeople(t) {
    const m = String(t).match(/\(([^()]*[가-힣]{2,}[^()]*)\)/);
    return m ? m[1].replace(/\s*,\s*|\s{2,}/g, ', ').trim() : '';
  }

  // 한 칸에 이어 쓴 "14.부재 15.거부 <<달력>> 25.전달" 을 회차별로 나눔
  function splitResult(raw, known, maxNo) {
    let text = clean(raw).replace(/<{2,}[^<>]*>+|<+[^<>]*>{2,}/g, ' ').replace(/<([^<>\d][^<>]*)>/g, ' [$1] ')
      .replace(/(^|[^\d.])(\d{1,3})\.\s?\2\./g, '$1$2.');   // "8.8.40대" → "8.40대"
    // 번호 뒤에 숫자가 와도 되지만("1.60대"), "21.5.3"·"20. 11. 8." 처럼 번호가 이어지면 날짜로 봄
    const re = /(\d{1,3})\s*\./g;
    const ok = [];
    let m, chainEnd = -1;
    while ((m = re.exec(text))) {
      const s = m.index, e = s + m[0].length;
      if (s > 0 && /\d/.test(text[s - 1])) continue;
      if (chainEnd >= 0 && text.slice(chainEnd, s).trim() === '') { chainEnd = e; continue; }
      chainEnd = -1;
      if (/^\s?\d+\s?\./.test(text.slice(e))) { chainEnd = e; continue; }
      const n = +m[1];
      if (n < 1 || n > maxNo) continue;
      ok.push({ n, s, e });
    }
    const head = clean(ok.length ? text.slice(0, ok[0].s) : text);
    const items = new Map();
    ok.forEach((a, i) => {
      const body = oneLine(text.slice(a.e, ok[i + 1] ? ok[i + 1].s : text.length)).replace(/^[\s.,]+|[\s,]+$/g, '');
      if (!body) return;
      const cur = items.get(a.n);
      if (!cur) items.set(a.n, body);
      else if (cur !== body) items.set(a.n, cur + ' / ' + body);
    });
    return { head, items };
  }

  function guessResult(t) {
    const s = String(t).replace(/\s/g, '');
    if (/^\(?부재|^안계심|^안나옴|^문안열/.test(s) || (/부재/.test(s) && s.length <= 8)) return '부재';
    if (/이사/.test(s) && s.length <= 10) return '이사';
    if (/안받|거부|거절/.test(s)) return '거부';
    if (/받|전달|드림|드렸|고마|감사/.test(s)) return '만남';
    if (/필요없|오지말|됐다고|됐어요|싫|소리지/.test(s)) return '거부';
    return '만남';
  }

  const isDongName = n => /^\s*\d{3}\s*(동)?\s*$/.test(n);

  function parseDongSheet(XLSX, ws, sheetName, warn) {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
    const dong = sheetName.replace(/\D/g, '');
    const complex = dong[0];
    // 담당자: "주공101동( 홍길동 김영희)" 또는 B1 "담당자 : 홍길동"
    let managers = '';
    let mm = null;
    (rows[0] || []).map(oneLine).forEach(v => { mm = mm || v.match(/담당자\s*[:：]?\s*([가-힣 ,·]+)$/) || v.match(/동\s*\(\s*([^)]*)\)/); });
    if (mm) managers = mm[1].replace(/\s*[,·]\s*/g, ' ').replace(/\s+/g, ' ').trim();

    // 표 머리글(순번·호수) 찾기
    let hr = -1, cHo = -1, cSt = -1, cRes = -1;
    for (let r = 0; r < rows.length && hr < 0; r++) {
      const row = rows[r].map(oneLine);
      const i = row.indexOf('순번');
      if (i >= 0 && row[i + 1] === '호수') { hr = r; cHo = i + 1; cSt = row.indexOf('구분'); cRes = row.indexOf('결과'); }
    }
    if (hr < 0) { warn.push(sheetName + ': 호수 표를 찾지 못했어요'); return null; }
    const markCols = [];
    rows[hr].forEach((v, c) => { if (c > cRes && oneLine(v)) markCols.push([c, oneLine(v)]); });

    // 회차 목록: 표 머리글 위쪽의 "N차" 칸
    const rounds = [];
    let event = '';
    for (let r = 0; r < hr; r++) {
      const row = rows[r];
      for (let c = 0; c <= 3; c++) {
        const m = oneLine(row[c]).match(/^(\d{1,3})\s*차$/);
        if (!m) continue;
        const text = oneLine(row[c + 1]);
        let ev = '';
        for (let k = c + 2; k <= c + 4 && !ev; k++) ev = oneLine(row[k]);
        if (ev) event = ev.replace(/^\d+\s*차\s*/, '').trim() || ev;
        if (!text) break;   // 비워 둔 칸(앞으로 쓸 회차)은 건너뜀
        rounds.push({ no: +m[1], text, event, date: parseDate(text), people: parsePeople(text) });
        break;
      }
    }
    // 같은 번호가 두 번 나오면 뒤의 것을 씀
    const byNo = new Map(); rounds.forEach(x => byNo.set(x.no, x));
    const known = new Set(byNo.keys());
    const maxNo = Math.max(0, ...known) + 3;

    const units = [], visits = [];
    const seenHo = {};
    let seq = 0;
    for (let r = hr + 1; r < rows.length; r++) {
      const row = rows[r];
      const ho = String(row[cHo] == null ? '' : row[cHo]).replace(/\D/g, '');
      if (!ho || ho.length < 3) continue;
      seq++;
      seenHo[ho] = (seenHo[ho] || 0) + 1;
      const id = dong + '-' + ho + (seenHo[ho] > 1 ? '-' + seenHo[ho] : '');
      if (seenHo[ho] > 1) warn.push(dong + '동 ' + ho + '호가 두 번 있어서 따로 두었어요(' + id + ')');
      const { head, items } = splitResult(row[cRes], known, maxNo);
      const marks = markCols.filter(([c]) => oneLine(row[c])).map(([, l]) => l).join(',');
      units.push({ id, dong, ho, seq, status: normStatus(row[cSt]), simbang: '', memo: head, marks });
      items.forEach((t, n) => {
        if (!byNo.has(n)) byNo.set(n, { no: n, text: '', event: '', date: '', people: '' });
        visits.push({ id: id + '-r' + n, unit: id, dong, no: n, res: guessResult(t), text: t });
      });
    }
    const roundList = [...byNo.values()].sort((a, b) => a.no - b.no)
      .map(x => ({ id: dong + '-' + x.no, dong, no: x.no, date: x.date, text: x.text, gift: parseGift(x.text) || parseGift(x.event), people: x.people, event: x.event }));
    return { dong: { dong, complex, managers }, rounds: roundList, units, visits };
  }

  // 심방대상 시트: "101동"(또는 103) 줄 다음에 순번·호수·결과
  function parseSimbang(XLSX, ws) {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
    const out = [];
    let dong = '';
    rows.forEach(r => {
      const a = oneLine(r[0]);
      if (/^\d{3}\s*동?$/.test(a) && !oneLine(r[1])) { dong = a.replace(/\D/g, ''); return; }
      const ho = String(r[1]).replace(/\D/g, '');
      if (dong && /^\d+$/.test(a) && ho.length >= 3) out.push(dong + '-' + ho);
    });
    return out;
  }

  // 엑셀 한 파일 → { dongs, rounds, units, visits, warn }
  function parseWorkbook(XLSX, wb) {
    const warn = [], out = { dongs: [], rounds: [], units: [], visits: [], warn };
    let simbang = [];
    wb.SheetNames.forEach(name => {
      const ws = wb.Sheets[name];
      if (/심방/.test(name)) { simbang = parseSimbang(XLSX, ws); return; }
      if (!isDongName(name)) return;
      const r = parseDongSheet(XLSX, ws, name, warn);
      if (!r) return;
      out.dongs.push(r.dong); out.rounds.push(...r.rounds); out.units.push(...r.units); out.visits.push(...r.visits);
    });
    const ids = new Set(out.units.map(u => u.id));
    simbang.forEach(id => { if (ids.has(id)) out.units.find(u => u.id === id).simbang = '1'; });
    return out;
  }

  const api = { parseWorkbook, splitResult, normStatus, parseDate, guessResult, parseGift, STATUS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else G.EvParse = api;
})(typeof window !== 'undefined' ? window : globalThis);
