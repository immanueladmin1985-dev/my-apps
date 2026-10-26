/* 엑셀로 받기 — 현황표, 심방대상, 전체 기록, 동별 시트 */
(function () {
  'use strict';
  const STATUS = ['교회', '성당', '거부', '부재', '대상', '특별', '교인', '장결', '이사', '기타'];

  function sheet(rows, widths, merges) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    if (widths) ws['!cols'] = widths.map(w => ({ wch: w }));
    if (merges) ws['!merges'] = merges;
    return ws;
  }

  // ix: app.js 의 색인, f: 글자 만드는 함수들 { roundLabel, visitLine, statusLabel, resLabel }
  function build(ix, f, opt) {
    const wb = XLSX.utils.book_new();
    const dongs = ix.dongs.filter(d => !opt.dongs || opt.dongs.includes(d.id));

    // 1. 현황표
    const head = ['구분', ...dongs.map(d => d.id + '동'), '합계', '비율'];
    const rows = [['<전도 현황표> ' + opt.today], [], head];
    let total = 0;
    const cnt = STATUS.map(s => dongs.map(d => (ix.unitsByDong.get(d.id) || []).filter(u => u.status === s).length));
    cnt.forEach(r => r.forEach(n => total += n));
    STATUS.forEach((s, i) => {
      const sum = cnt[i].reduce((a, b) => a + b, 0);
      if (!sum && (s === '기타' || s === '이사')) return;
      rows.push([f.statusLabel(s), ...cnt[i], sum, total ? Math.round(sum / total * 1000) / 10 + '%' : '']);
    });
    rows.push(['합계', ...dongs.map(d => (ix.unitsByDong.get(d.id) || []).length), total, '100%']);
    XLSX.utils.book_append_sheet(wb, sheet(rows, [10, ...dongs.map(() => 8), 8, 8]), '현황표');

    // 2. 심방대상
    const sb = [['<심방대상>'], [], ['동', '호수', '구분', '기본 메모', '최근 기록 1', '최근 기록 2']];
    dongs.forEach(d => (ix.unitsByDong.get(d.id) || []).filter(u => u.simbang === '1' || u.status === '특별').forEach(u => {
      const vs = ix.visitsByUnit.get(u.id) || [];
      sb.push([d.id + '동', u.ho, f.statusLabel(u.status), u.memo, vs[0] ? f.visitLine(vs[0]) : '', vs[1] ? f.visitLine(vs[1]) : '']);
    }));
    XLSX.utils.book_append_sheet(wb, sheet(sb, [7, 7, 9, 40, 45, 45]), '심방대상');

    // 3. 전체 기록 (한 줄에 한 번 방문 — 엑셀에서 거르기 좋게)
    const all = [['동', '호수', '구분', '회차', '날짜', '선물', '행사', '결과', '내용', '쓴 사람']];
    dongs.forEach(d => (ix.unitsByDong.get(d.id) || []).forEach(u => {
      (ix.visitsByUnit.get(u.id) || []).slice().reverse().forEach(v => {
        const r = ix.roundById.get(d.id + '-' + v.no) || {};
        all.push([d.id, u.ho, f.statusLabel(u.status), v.no, r.date || '', r.gift || '', r.event || '', f.resLabel(v.res), v.text, v.by || '']);
      });
    }));
    XLSX.utils.book_append_sheet(wb, sheet(all, [6, 7, 9, 6, 11, 10, 14, 9, 60, 9]), '전체 기록');

    // 4. 동별: 위에는 회차, 아래에는 호수별 기록
    dongs.forEach(d => {
      const rs = ix.roundsByDong.get(d.id) || [];
      const out = [['주공 ' + d.id + '동' + (d.managers ? ' (담당: ' + d.managers + ')' : '')], [], ['회차', '날짜', '선물', '행사', '함께 간 사람', '내용']];
      rs.forEach(r => out.push([r.no + '차', r.date || '', r.gift || '', r.event || '', r.people || '', r.text || '']));
      out.push([], ['순번', '호수', '구분', '기본 메모', '최근 기록 1', '최근 기록 2', '전체 기록 (회차.내용)']);
      (ix.unitsByDong.get(d.id) || []).forEach((u, i) => {
        const vs = ix.visitsByUnit.get(u.id) || [];
        const joined = vs.slice().reverse().map(v => v.no + '.' + (v.res && v.res !== '만남' ? '[' + f.resLabel(v.res) + '] ' : '') + v.text).join('  ');
        out.push([i + 1, u.ho, f.statusLabel(u.status), u.memo, vs[0] ? f.visitLine(vs[0]) : '', vs[1] ? f.visitLine(vs[1]) : '', joined]);
      });
      XLSX.utils.book_append_sheet(wb, sheet(out, [6, 11, 10, 30, 30, 30, 90]), d.id + '동');
    });
    return wb;
  }

  function download(ix, f, opt) {
    const wb = build(ix, f, opt);
    XLSX.writeFile(wb, opt.filename || '전도현황.xlsx', { compression: true });
  }

  window.Export = { build, download };
})();
