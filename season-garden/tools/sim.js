// 컴퓨터(힌트 로직)로 여러 판을 끝까지 두어 점수·버틴 기간을 살펴봄: node tools/sim.js [판 수] [모드]
const G = require('../js/game.js');
const N = +process.argv[2] || 30, mode = process.argv[3] || 'classic';
const res = [];
for (let g = 0; g < N; g++) {
  const st = G.newGame(mode, { seed: 1000 + g });
  let guard = 0;
  while (!st.over && guard++ < 5000) {
    const m = G.bestMove(st);
    if (!m) { st.over = true; break; }
    if (m.swap) G.swapBasket(st);
    const r = G.place(st, m.cell);
    if (!r.ok) throw new Error('bad move');
    if (r.full) {
      if (st.items.glove > 0) { // 가장 낮은 타일 하나 뽑기
        let c = st.board.findIndex(k => k === 'w1') ; if (c < 0) c = st.board.findIndex(k => k === 's1'); if (c < 0) c = st.board.findIndex(k => k === 'p1');
        if (c < 0) c = 0; G.useGlove(st, c);
      } else st.over = true;
    }
  }
  res.push({ score: st.score, turn: st.turn, year: G.yearOf(st.turn), best: G.TILES[st.stats.best].name, chain: st.stats.maxChain });
}
res.sort((a, b) => a.score - b.score);
const avg = k => Math.round(res.reduce((s, r) => s + r[k], 0) / res.length);
console.log('mode', mode, 'avg score', avg('score'), 'avg turns', avg('turn'));
console.log('min', res[0], '\nmed', res[res.length >> 1], '\nmax', res[res.length - 1]);
const bests = {}; res.forEach(r => bests[r.best] = (bests[r.best] || 0) + 1); console.log(bests);
