/* 반주 구조 자동 인식
   소리를 음높이(12음) 특징으로 바꾼 뒤, 같은 음악이 일정한 간격(한 절 길이)으로 되풀이되는 곳을 찾는다.
   - 여러 절: 1절과 2절…이 같은 반주이므로 "한 절 길이"만큼 떨어진 두 곳이 오래 비슷하다.
     → 1절 시작 ~ 마지막 절 끝을 반복 구간으로 삼는다(마지막 절 끝 → 1절 시작은 절 사이 넘어가는 것과 같은 소리).
   - 한 절: 전주가 보통 마지막 소절과 같으므로, 전주와 절 끝이 비슷한 곳을 찾아 전주 끝 ~ 절 끝을 쓴다. */
(function () {
  'use strict';
  const HOP = 0.05;          // 특징 간격(초)

  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2;
          const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }

  // 오디오 → 프레임별 12음 특징, 소리 크기
  function features(buf) {
    const sr0 = buf.sampleRate, ch = buf.numberOfChannels, len0 = buf.length;
    const f = Math.max(1, Math.round(sr0 / 11025)), sr = sr0 / f, len = Math.floor(len0 / f);
    const mono = new Float32Array(len), chans = [];
    for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
    for (let i = 0; i < len; i++) {
      let s = 0; const o = i * f;
      for (let c = 0; c < ch; c++) { const d = chans[c]; for (let k = 0; k < f; k++) s += d[o + k]; }
      mono[i] = s / (f * ch);
    }
    const N = 4096, hop = Math.round(sr * HOP), nf = Math.max(1, Math.floor((len - N) / hop) + 1);
    const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    const binPc = new Int8Array(N / 2); // 주파수 칸 → 음이름(0~11), 범위 밖은 -1
    for (let k = 0; k < N / 2; k++) {
      const hz = k * sr / N;
      binPc[k] = (hz < 65 || hz > 2100) ? -1 : ((Math.round(12 * Math.log2(hz / 440)) % 12) + 12 + 9) % 12;
    }
    const chroma = new Float32Array(nf * 12), rms = new Float32Array(nf);
    const re = new Float32Array(N), im = new Float32Array(N);
    for (let t = 0; t < nf; t++) {
      const o = t * hop; let e = 0;
      for (let i = 0; i < N; i++) { const v = mono[o + i]; e += v * v; re[i] = v * win[i]; im[i] = 0; }
      rms[t] = Math.sqrt(e / N);
      fft(re, im);
      const c = chroma.subarray(t * 12, t * 12 + 12);
      for (let k = 1; k < N / 2; k++) { const p = binPc[k]; if (p >= 0) c[p] += Math.log1p(1000 * Math.hypot(re[k], im[k]) / N); }
    }
    return { chroma, rms, nf, dur: len0 / sr0 };
  }

  // 0.5초 평균을 내고, 평균을 빼고, 크기를 1로 (조성이 같아도 화음이 다르면 구분되게)
  function normalize(chroma, nf, smooth) {
    const out = new Float32Array(nf * 12), h = smooth >> 1;
    for (let t = 0; t < nf; t++) {
      const a = Math.max(0, t - h), b = Math.min(nf - 1, t + h), v = new Float64Array(12);
      for (let u = a; u <= b; u++) for (let p = 0; p < 12; p++) v[p] += chroma[u * 12 + p];
      let m = 0; for (let p = 0; p < 12; p++) m += v[p]; m /= 12;
      let n = 0; for (let p = 0; p < 12; p++) { v[p] -= m; n += v[p] * v[p]; }
      n = Math.sqrt(n) || 1;
      for (let p = 0; p < 12; p++) out[t * 12 + p] = v[p] / n;
    }
    return out;
  }

  // 간격 L 에서 "비슷함이 오래 이어지는 구간"을 찾는다 (2초 평균이 기준 이상, 짧은 끊김은 허용)
  function bestRun(C, nf, L, lo, hi, thr, step) {
    const W = Math.round(2 / (HOP * step)); let best = null;
    const n = Math.floor((hi - L - lo) / step); if (n <= W) return null;
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = lo + i * step; let d = 0;
      for (let p = 0; p < 12; p++) d += C[t * 12 + p] * C[(t + L) * 12 + p];
      s[i] = d;
    }
    let acc = 0, start = -1, gap = 0, last = -1; const maxGap = Math.round(1.5 / (HOP * step));
    for (let i = 0; i < n; i++) {
      acc += s[i]; if (i >= W) acc -= s[i - W];
      const ok = i >= W - 1 && acc / W > thr;
      const c = i - (W >> 1);
      if (ok) { if (start < 0) start = c; last = c; gap = 0; }
      else if (start >= 0 && ++gap > maxGap) {
        if (!best || last - start > best.b - best.a) best = { a: start, b: last }; start = -1;
      }
    }
    if (start >= 0 && (!best || last - start > best.b - best.a)) best = { a: start, b: last };
    if (!best) return null;
    let m = 0; for (let i = best.a; i <= best.b; i++) m += s[Math.min(n - 1, Math.max(0, i))];
    return { a: lo + best.a * step, b: lo + best.b * step, mean: m / (best.b - best.a + 1) };
  }

  // 박자 맞추기용: 1/1000초 단위로 "소리가 커지는 순간"
  function onsets(buf) {
    const sr = buf.sampleRate, hop = Math.round(sr * 0.001), chans = [];
    for (let c = 0; c < buf.numberOfChannels; c++) chans.push(buf.getChannelData(c));
    const nf = Math.floor(buf.length / hop), sm = new Float32Array(nf), on = new Float32Array(nf);
    let acc = 0; const env = new Float32Array(nf);
    for (let t = 0; t < nf; t++) {
      let e = 0;
      for (let i = t * hop, j = i + hop; i < j; i++) { let v = 0; for (const d of chans) v += d[i]; e += v * v; }
      env[t] = Math.sqrt(e / hop);
      acc += env[t]; if (t >= 10) acc -= env[t - 10]; sm[t] = acc / 10;
      if (t) on[t] = Math.max(0, sm[t] - sm[t - 1]);
    }
    return on;
  }
  // 연주 속도가 조금씩 흔들리므로, 넘어가는 바로 그 부분(5초)만 겹쳐서 정확한 간격을 찾는다
  function localLag(on, aSec, lenSec, L0Sec, RSec) {
    const a = Math.max(0, Math.round(aSec * 1000)), b = a + Math.round(lenSec * 1000), L0 = Math.round(L0Sec * 1000), R = Math.round(RSec * 1000);
    let bestL = L0, bestS = -1;
    for (let L = L0 - R; L <= L0 + R; L++) {
      let s = 0; for (let t = a; t < b && t + L < on.length; t++) s += on[t] * on[t + L];
      if (s > bestS) { bestS = s; bestL = L; }
    }
    return bestL / 1000;
  }

  function analyze(buf) {
    const F = features(buf), nf = F.nf;
    // 소리가 나는 처음과 끝
    let peak = 0; for (let t = 0; t < nf; t++) peak = Math.max(peak, F.rms[t]);
    const quiet = peak * 0.03; let s0 = 0, e0 = nf - 1;
    while (s0 < nf - 1 && F.rms[s0] < quiet) s0++;
    while (e0 > s0 && F.rms[e0] < quiet) e0--;
    const C = normalize(F.chroma, nf, 10);
    const step = 2, minLag = Math.round(10 / HOP), maxLag = Math.round((e0 - s0) * 0.85);
    // 1단계: 여러 절이 되풀이되는 간격 찾기
    const cands = [];
    for (let L = minLag; L <= maxLag; L += step) {
      const r = bestRun(C, nf, L, s0, e0, 0.62, step);
      if (r) cands.push({ L, ...r, len: r.b - r.a });
    }
    let res = null;
    cands.sort((x, y) => y.len - x.len);
    // 절이 되풀이되는 곳은 전주 바로 뒤(앞쪽)에서 시작해야 한다. 곡 중간의 후렴 반복은 빼고 본다
    const early = Math.max(30, F.dur * 0.25) / HOP;
    const top = cands.find(c => c.a - s0 <= early);
    if (top && top.len * HOP >= 15) {
      // 같은 길이로 이어지는 후보 중 가장 짧은 간격(=한 절). 2절 간격(2배)보다 1절 간격을 고른다
      let pick = top;
      for (const c of cands) {
        if (c.L < pick.L && c.len >= top.len * 0.55 && c.mean > 0.55 && c.a - s0 <= early) {
          const k = pick.L / c.L; if (Math.abs(k - Math.round(k)) < 0.06 && Math.round(k) >= 2) pick = c;
        }
      }
      const P0 = pick.L * HOP, startA = pick.a * HOP, endB = (pick.b + pick.L) * HOP;
      // 2초 평균 때문에 끝이 조금 짧게 잡힐 수 있어 0.25절은 봐 준다
      const k = Math.max(1, Math.floor((endB - startA) / P0 + 0.25));
      // 시작이 전주 쪽으로 넘어가지 않게, 반복되는 구간 안으로 조금(최대 0.5초) 들여서 자른다
      const m = Math.max(0, Math.min(0.5, endB - startA - k * P0));
      const S = startA + m, on = onsets(buf);
      // 끝 → 시작은 "1절 끝 → 2절 시작"과 같은 소리여야 한다:
      //   D2 = 1절 시작과 2절 시작의 간격, D1 = 1절 끝과 마지막 절 끝의 간격 → 끝 = 시작 + D2 + D1
      const D2 = localLag(on, S, 5, P0, 0.15);
      const D1 = k > 1 ? localLag(on, S + D2 - 5, 5, (k - 1) * P0, 0.15) : 0;
      // 절마다 시작 시각(속도가 흔들리므로 1절 시작과 박자를 겹쳐서 하나씩): 어느 절로 건너뛰어도 자연스럽게
      const bounds = [S];
      for (let j = 1; j < k; j++) bounds.push(j === 1 ? S + D2 : S + localLag(on, S, 5, j * P0, 0.15));
      bounds.push(S + D2 + D1);
      res = { mode: 'verses', period: D2, verses: k, bounds, introEnd: startA, loopStart: S, loopEnd: S + D2 + D1, score: pick.mean, runSec: pick.len * HOP };
    }
    // 2단계: 한 절뿐이면 전주(처음)와 같은 부분을 뒤에서 찾기
    const introC = [];
    if (!res) {
      let best = null;
      // 한 절이 곡의 40% 이상은 되어야 한다(전주가 절 중간 소절과 같은 경우는 버림)
      for (const c of cands) if (Math.abs(c.a - s0) * HOP < 3 && c.len * HOP >= 4 && c.L >= (e0 - s0) * 0.4) introC.push(c);
      introC.sort((x, y) => x.L - y.L);
      for (const c of introC) if (!best || c.len > best.len) best = c;
      if (best) {
        // 전주 끝과 절 끝이 같은 소리이므로, 전주 끝 5초를 겹쳐 정확한 간격을 찾는다
        const P = localLag(onsets(buf), Math.max(0, best.b * HOP - 5), Math.min(5, best.b * HOP), best.L * HOP, 0.15);
        res = { mode: 'intro', period: P, verses: 1, bounds: [best.b * HOP, best.b * HOP + P], introEnd: best.b * HOP, loopStart: best.b * HOP, loopEnd: best.b * HOP + P, score: best.mean, runSec: best.len * HOP };
      }
    }
    const info = { dur: F.dur, musicStart: s0 * HOP, musicEnd: e0 * HOP, introC: introC.map(c => [+(c.L * HOP).toFixed(1), +(c.len * HOP).toFixed(1), +c.mean.toFixed(2)]), cands: cands.slice(0, 12).map(c => ({ L: +(c.L * HOP).toFixed(2), a: +(c.a * HOP).toFixed(2), b: +(c.b * HOP).toFixed(2), len: +(c.len * HOP).toFixed(1), mean: +c.mean.toFixed(3) })) };
    return res ? Object.assign(res, { info }) : { mode: 'none', info };
  }

  window.HymnAnalyze = { analyze };
})();
