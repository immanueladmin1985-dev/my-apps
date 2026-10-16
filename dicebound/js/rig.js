/* 관절 움직임(리그): 한 장짜리 캐릭터 그림을 WebGL 격자에 입히고, 허리·가슴·목·어깨를 기준으로 부위마다 휘게 한다.
 * 그림을 조각내지 않으므로 이음매나 빈틈이 생기지 않는다.
 * - 관절 위치는 그림의 투명도(알파)를 읽어 자동으로 정한다. 머리 꼭대기와 몸 중심선을 찾고, 그 사이를 사람 비율로 나눈다.
 * - data.js 의 적·주인공 정의에서 rig: { kind, float, headSide, still, arms } 로 바꿀 수 있다.
 *   arms 는 팔 움직임 크기(기본 1). 손이 허벅지에 붙어 있는 그림은 작게 해야 손이 늘어나 보이지 않는다.
 *   kind: human(사람형, 기본) / beast(네발 짐승, 머리가 옆) / blob(슬라임) / crawler(거미처럼 다리가 많은 것)
 * - flip 이면 그림을 좌우로 뒤집어 그린다. dir 은 화면에서 상대가 있는 쪽(-1 왼쪽, +1 오른쪽)이다.
 * - WebGL 을 쓸 수 없거나(file:// 로 연 경우 포함) 연출 줄이기를 켜면 원래 <img> 를 그대로 둔다. */
(function (root) {
  'use strict';
  const DB = root.DB;
  const Rig = DB.rig = { reduced: () => false };
  const GX = 32, GY = 44;                 // 격자 칸 수 (가로 × 세로). 촘촘할수록 손·무기 경계의 늘어짐이 줄어든다
  const PADX = 0.32, PADT = 0.16, PADB = 0.04; // 그림 밖으로 휘어져 나갈 여유 (그림 높이 기준)
  const rigs = new Set();
  const cache = new Map();                // 그림 주소 → 관절 분석 결과
  let raf = 0;

  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  // 키 [시각(0~1), 값] 사이를 부드럽게 잇는다
  function track(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const k0 = keys[i - 1], k1 = keys[i];
        return k0[1] + (k1[1] - k0[1]) * ss(0, 1, (t - k0[0]) / (k1[0] - k0[0]));
      }
    }
    return keys[keys.length - 1][1];
  }

  /* ---------- 동작 ----------
   * 각도는 라디안. lean(허리)·chest(가슴)·head(목)는 +면 상대 쪽으로 숙이고, armF(상대 쪽 팔)·armB(반대쪽 팔)는 +면 들어 올린다.
   * tilt 는 발목 기준으로 몸 전체를 기울인다. 허리에서만 꺾으면 땅에 짚은 칼·지팡이가 휘어 보이므로 숙이는 양을 둘로 나눈다.
   * sx·sy 는 발밑 기준 늘이기(0이 원래 크기), tx·ty 는 이동, shear 는 위쪽을 상대 쪽으로 기울이기. */
  const ENTER = { dur: 520, k: { sy: [[0, 0.08], [0.45, -0.07], [0.75, 0.02], [1, 0]], sx: [[0, -0.05], [0.45, 0.05], [0.75, -0.01], [1, 0]] } };
  const ACT = {
    human: {
      attack: { dur: 560, k: {
        lean: [[0, 0], [0.28, -0.09], [0.42, 0.13], [0.62, 0.08], [1, 0]],
        tilt: [[0, 0], [0.28, -0.06], [0.42, 0.08], [0.62, 0.05], [1, 0]],
        chest: [[0, 0], [0.28, -0.06], [0.42, 0.08], [1, 0]],
        head: [[0, 0], [0.28, -0.06], [0.42, 0.08], [1, 0]],
        armF: [[0, 0], [0.28, 0.35], [0.42, -0.3], [0.65, -0.18], [1, 0]],
        armB: [[0, 0], [0.28, 0.15], [0.42, -0.1], [1, 0]],
        sy: [[0, 0], [0.28, -0.05], [0.42, 0.05], [0.65, 0]],
        sx: [[0, 0], [0.28, 0.03], [0.42, -0.03], [0.65, 0]] } },
      cast: { dur: 600, k: {
        lean: [[0, 0], [0.3, -0.06], [0.5, 0.06], [1, 0]],
        tilt: [[0, 0], [0.3, -0.04], [0.5, 0.04], [1, 0]],
        chest: [[0, 0], [0.3, -0.05], [0.5, 0.05], [1, 0]],
        head: [[0, 0], [0.3, -0.06], [0.5, 0.05], [1, 0]],
        armF: [[0, 0], [0.3, 0.3], [0.5, 0.14], [1, 0]],
        armB: [[0, 0], [0.3, 0.22], [0.5, 0.1], [1, 0]],
        sy: [[0, 0], [0.3, 0.04], [0.5, -0.02], [0.8, 0]] } },
      hurt: { dur: 480, k: {
        lean: [[0, 0], [0.12, -0.1], [0.35, 0.03], [0.6, -0.02], [1, 0]],
        tilt: [[0, 0], [0.12, -0.06], [0.35, 0.02], [1, 0]],
        head: [[0, 0], [0.1, -0.14], [0.3, 0.06], [1, 0]],
        armF: [[0, 0], [0.12, 0.15], [0.5, -0.04], [1, 0]],
        armB: [[0, 0], [0.12, 0.15], [0.5, -0.04], [1, 0]],
        sy: [[0, 0], [0.12, -0.05], [0.4, 0.02], [1, 0]] } },
      buff: { dur: 650, k: {
        lean: [[0, 0], [0.4, -0.04], [1, 0]],
        tilt: [[0, 0], [0.4, -0.02], [1, 0]],
        breath: [[0, 0], [0.4, 0.05], [1, 0]],
        armF: [[0, 0], [0.4, 0.22], [1, 0]],
        armB: [[0, 0], [0.4, 0.22], [1, 0]],
        sy: [[0, 0], [0.4, 0.03], [1, 0]] } },
      die: { dur: 900, hold: true, k: {
        lean: [[0, 0], [0.2, -0.09], [1, 0.12]],
        tilt: [[0, 0], [0.2, -0.05], [1, 0.08]],
        chest: [[0, 0], [1, 0.1]],
        head: [[0, 0], [0.2, -0.1], [1, 0.25]],
        armF: [[0, 0], [1, -0.15]], armB: [[0, 0], [1, -0.15]],
        sy: [[0, 0], [1, -0.1]] } }
    },
    beast: {
      attack: { dur: 560, k: {
        head: [[0, 0], [0.28, 0.3], [0.42, -0.25], [0.7, -0.1], [1, 0]],
        rear: [[0, 0], [0.28, 0.1], [0.42, -0.06], [1, 0]],
        tail: [[0, 0], [0.3, 0.3], [0.6, -0.2], [1, 0]],
        sy: [[0, 0], [0.28, 0.04], [0.42, -0.06], [0.7, 0]] } },
      hurt: { dur: 480, k: {
        head: [[0, 0], [0.12, 0.3], [0.4, -0.05], [1, 0]],
        rear: [[0, 0], [0.12, 0.08], [0.5, 0]],
        sy: [[0, 0], [0.12, -0.06], [0.4, 0.02], [1, 0]] } },
      buff: { dur: 700, k: {
        head: [[0, 0], [0.4, 0.4], [0.8, 0.3], [1, 0]],
        rear: [[0, 0], [0.4, 0.1], [1, 0]],
        tail: [[0, 0], [0.4, 0.4], [1, 0]] } },
      die: { dur: 900, hold: true, k: {
        head: [[0, 0], [1, -0.35]], rear: [[0, 0], [1, -0.05]],
        sy: [[0, 0], [1, -0.25]], sx: [[0, 0], [1, 0.06]] } }
    },
    blob: {
      attack: { dur: 560, k: {
        sy: [[0, 0], [0.28, 0.22], [0.45, -0.2], [0.7, 0.05], [1, 0]],
        sx: [[0, 0], [0.28, -0.12], [0.45, 0.18], [0.7, -0.03], [1, 0]],
        shear: [[0, 0], [0.28, -0.08], [0.45, 0.25], [1, 0]] } },
      hurt: { dur: 520, k: {
        sy: [[0, 0], [0.12, -0.18], [0.3, 0.1], [0.5, -0.05], [1, 0]],
        sx: [[0, 0], [0.12, 0.14], [0.3, -0.08], [0.5, 0.03], [1, 0]],
        shear: [[0, 0], [0.12, -0.12], [0.4, 0.05], [1, 0]] } },
      buff: { dur: 650, k: { sy: [[0, 0], [0.4, 0.15], [1, 0]], sx: [[0, 0], [0.4, -0.08], [1, 0]] } },
      die: { dur: 900, hold: true, k: { sy: [[0, 0], [1, -0.45]], sx: [[0, 0], [1, 0.3]] } }
    },
    crawler: {
      attack: { dur: 560, k: {
        rear: [[0, 0], [0.28, 0.16], [0.45, -0.08], [1, 0]],
        ty: [[0, 0], [0.28, -0.04], [0.45, 0.02], [1, 0]],
        sy: [[0, 0], [0.28, 0.04], [0.45, -0.04], [0.8, 0]] } },
      hurt: { dur: 480, k: { rear: [[0, 0], [0.12, -0.07], [0.5, 0.01], [1, 0]], ty: [[0, 0], [0.12, 0.03], [1, 0]] } },
      buff: { dur: 650, k: { rear: [[0, 0], [0.4, 0.08], [1, 0]], ty: [[0, 0], [0.4, -0.04], [1, 0]] } },
      die: { dur: 900, hold: true, k: { ty: [[0, 0], [1, 0.05]], sy: [[0, 0], [1, -0.15]], rear: [[0, 0], [1, -0.05]] } }
    }
  };
  // 마법(원거리) 동작이 따로 없는 종류는 공격 동작을 쓴다
  ['beast', 'blob', 'crawler'].forEach(k => { ACT[k].cast = ACT[k].attack; });
  Object.keys(ACT).forEach(k => { ACT[k].enter = ENTER; });

  // 가만히 있을 때: 숨쉬기와 작은 흔들림 (은은하게)
  const IDLE = {
    human(p, t, ph) {
      p.breath = 0.012 * (0.5 + 0.5 * Math.sin(t * 1.9 + ph));
      p.lean = 0.008 * Math.sin(t * 0.9 + ph);
      p.tilt = 0.005 * Math.sin(t * 0.9 + ph + 0.3);
      p.chest = 0.01 * Math.sin(t * 0.9 + ph - 0.6);
      p.head = 0.02 * Math.sin(t * 0.9 + ph - 1.2) + 0.008 * Math.sin(t * 1.7 + ph);
      p.armF = 0.03 * Math.sin(t * 1.9 + ph + 0.4);
      p.armB = 0.03 * Math.sin(t * 1.9 + ph + 1.1);
    },
    beast(p, t, ph) {
      p.breath = 0.02 * (0.5 + 0.5 * Math.sin(t * 2.2 + ph));
      p.head = 0.04 * Math.sin(t * 1.3 + ph);
      p.tail = 0.08 * Math.sin(t * 2.2 + ph);
    },
    blob(p, t, ph) {
      p.sy = 0.035 * Math.sin(t * 2.2 + ph);
      p.sx = -0.6 * p.sy;
      p.shear = 0.03 * Math.sin(t * 1.5 + ph);
    },
    crawler(p, t, ph) {
      p.ty = 0.01 * Math.sin(t * 2.6 + ph);
      p.rear = 0.012 * Math.sin(t * 1.3 + ph);
    }
  };
  const ZERO = { lean: 0, tilt: 0, chest: 0, head: 0, armF: 0, armB: 0, breath: 0, sx: 0, sy: 0, tx: 0, ty: 0, shear: 0, tail: 0, rear: 0 };

  /* ---------- 관절 위치 자동 분석 ----------
   * 좌표 단위: 그림 높이를 1로 둔다(x 는 0 ~ 가로세로비). */
  function analyze(img) {
    const asp = img.naturalWidth / img.naturalHeight;
    const def = { top: 0, foot: 1, left: 0, right: asp, cx: asp / 2, head: 0.02, asp };
    try {
      const H = 96, W = Math.max(8, Math.round(H * asp));
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, W, H);
      const d = g.getImageData(0, 0, W, H).data;
      const A = (x, y) => d[(y * W + x) * 4 + 3] / 255;
      let top = -1, bot = -1, left = W, right = -1;
      const rowC = [];
      for (let y = 0; y < H; y++) {
        let sum = 0, sx = 0;
        for (let x = 0; x < W; x++) {
          const a = A(x, y);
          if (a > 0.15) { sum += a; sx += a * x; if (x < left) left = x; if (x > right) right = x; }
        }
        rowC[y] = sum > 0.5 ? sx / sum : null;
        if (sum > 0.5) { if (top < 0) top = y; bot = y; }
      }
      if (top < 0) return def;
      // 몸 중심: 다리 쪽(아래 60~90%) 줄들의 무게중심 가운데값. 한쪽으로 든 무기에 덜 끌려간다
      const fh = bot - top + 1, cs = [];
      for (let y = Math.round(top + fh * 0.6); y <= Math.round(top + fh * 0.9); y++) if (rowC[y] != null) cs.push(rowC[y]);
      cs.sort((a, b) => a - b);
      const cx = cs.length ? cs[cs.length >> 1] : W / 2;
      // 머리 꼭대기: 몸 중심 근처 기둥에 처음으로 그림이 차는 줄 (머리 위로 든 지팡이·활은 옆에 있으므로 건너뛴다)
      const half = Math.max(1, Math.round(H * 0.035));
      let head = top;
      for (let y = top; y < bot; y++) {
        let s = 0, n = 0;
        for (let x = Math.max(0, Math.round(cx) - half); x <= Math.min(W - 1, Math.round(cx) + half); x++) { s += A(x, y); n++; }
        if (s / n > 0.35) { head = y; break; }
      }
      // 줄마다 몸 중심에서 바깥으로 나가며 처음 만나는 덩어리(다리·치마)의 끝을 잰다.
      // 그 바깥에 떨어져 있는 것은 손에 든 칼·지팡이처럼 팔을 따라 움직여야 하는 부분이다
      const limL = new Float32Array(H), limR = new Float32Array(H), c0 = Math.round(cx);
      for (let y = 0; y < H; y++) {
        for (const side of [-1, 1]) {
          let x = c0;
          const inside = q => q >= 0 && q < W;
          while (inside(x) && A(x, y) < 0.2) x += side;
          while (inside(x) && (A(x, y) >= 0.2 || (inside(x + side) && A(x + side, y) >= 0.2))) x += side;
          (side < 0 ? limL : limR)[y] = Math.abs(x - c0) / H;
        }
      }
      return { top: top / H, foot: (bot + 1) / H, left: left / H, right: (right + 1) / H, cx: (cx + 0.5) / H, head: head / H, asp, limL, limR, rows: H };
    } catch (e) {
      return def; // file:// 처럼 그림 픽셀을 읽을 수 없는 경우
    }
  }

  /* ---------- 격자와 가중치 ---------- */
  function buildMesh(info, opts) {
    const n = (GX + 1) * (GY + 1);
    const m = {
      n, x0: new Float32Array(n), y0: new Float32Array(n),
      wHip: new Float32Array(n), wChest: new Float32Array(n), wHead: new Float32Array(n),
      wAL: new Float32Array(n), wAR: new Float32Array(n), wFl: new Float32Array(n), wBx: new Float32Array(n),
      wTail: new Float32Array(n), wBody: new Float32Array(n), wTilt: new Float32Array(n), uv: new Float32Array(n * 2)
    };
    const asp = m.asp = info.asp, kind = opts.kind;
    const foot = info.foot, cx = info.cx;
    const FH = Math.max(0.3, foot - info.head);
    const L = m.L = { cx, foot, head: info.head, neck: info.head + 0.15 * FH, sh: info.head + 0.21 * FH, chest: info.head + 0.31 * FH, hip: info.head + 0.52 * FH, th: 0.11 * FH, FH };
    // 네발 짐승: 머리 쪽 목, 꼬리 뿌리, 뒷다리 위치
    const W = info.right - info.left, hs = opts.headSide || -1;
    L.hs = hs;
    L.neckX = hs < 0 ? info.left + 0.33 * W : info.right - 0.33 * W;
    L.neckY = info.top + 0.5 * (foot - info.top);
    L.tailX = hs < 0 ? info.right - 0.22 * W : info.left + 0.22 * W;
    L.tailY = info.top + 0.35 * (foot - info.top);
    L.hindX = hs < 0 ? info.right - 0.3 * W : info.left + 0.3 * W;
    let i = 0;
    for (let gy = 0; gy <= GY; gy++) {
      for (let gx = 0; gx <= GX; gx++, i++) {
        const x = gx / GX * asp, y = gy / GY;
        m.x0[i] = x; m.y0[i] = y;
        m.uv[i * 2] = gx / GX; m.uv[i * 2 + 1] = gy / GY;
        const ax = Math.abs(x - cx);
        const planted = 1 - ss(foot - 0.15 * FH, foot, y);
        m.wFl[i] = ss(0.12 * FH, 0.3 * FH, ax) * planted;
        if (kind === 'human') {
          // 허리 아래에서 다리 바깥에 떨어져 있는 무기: 허리·팔을 따라가되 땅에 닿은 끝은 붙여 둔다 (곧게 펴지도록 직선으로 줄인다)
          let follow = 0;
          if (info.limL && y > L.hip - 0.02 * FH) {
            const r = Math.min(info.rows - 1, Math.max(0, Math.floor(y * info.rows)));
            const lim = (x < cx ? info.limL : info.limR)[r];
            const lin = clamp01((foot - 0.08 * FH - y) / Math.max(0.01, foot - 0.08 * FH - L.hip));
            follow = ss(lim + 0.004, lim + 0.03, ax) * lin;
          }
          m.wHip[i] = Math.max(ss(L.hip + 0.1 * FH, L.hip - 0.05 * FH, y), follow);
          m.wTilt[i] = ss(foot, foot - 0.1 * FH, y); // 발바닥과 발밑 땅은 그대로 둔다
          m.wChest[i] = ss(L.chest + 0.08 * FH, L.chest - 0.03 * FH, y);
          m.wHead[i] = ss(L.neck + 0.04 * FH, L.neck - 0.03 * FH, y) * (1 - ss(0.08 * FH, 0.14 * FH, ax));
          m.wBx[i] = 1 - ss(0, 0.12 * FH, Math.abs(y - L.chest));
          // 팔: 몸통 밖으로 벗어난 부분. 몸통 폭은 줄마다 그림에서 잰 값(중심에서 처음 끊기는 곳)을 쓰므로
          // 넓은 골반·허벅지는 몸통으로 남고, 몸에서 떨어져 있는 팔·무기·날개만 어깨를 따라 돈다.
          // 머리 높이에서는 머리카락을 피하도록 기준 폭을 넓히고, 허리 아래는 허리를 지나면서 서서히 0으로 줄인다
          const base = L.th * (1 - 0.35 * ss(L.sh - 0.05 * FH, L.sh + 0.05 * FH, y));
          const tL = Math.max(base, torso(info, y, 'L', L)), tR = Math.max(base, torso(info, y, 'R', L));
          const wv = Math.max(1 - ss(L.hip - 0.02 * FH, L.hip + 0.1 * FH, y), follow);
          m.wAL[i] = ss(tL, tL + 0.06 * FH, cx - x) * wv;
          m.wAR[i] = ss(tR, tR + 0.06 * FH, x - cx) * wv;
          // still: 그림 안에서 사람 관절을 따라가면 안 되는 영역(예: 사냥꾼 옆의 늑대). [왼, 위, 오른, 아래] 비율
          if (opts.still) {
            const u = x / asp, e = 0.03;
            let k = 0;
            for (const r of opts.still) {
              const kx = (r[0] > 0 ? ss(r[0] - e, r[0] + e, u) : 1) * (r[2] < 1 ? 1 - ss(r[2] - e, r[2] + e, u) : 1);
              const ky = (r[1] > 0 ? ss(r[1] - e, r[1] + e, y) : 1) * (r[3] < 1 ? 1 - ss(r[3] - e, r[3] + e, y) : 1);
              k = Math.max(k, kx * ky);
            }
            const f = 1 - k;
            m.wHip[i] *= f; m.wChest[i] *= f; m.wHead[i] *= f; m.wAL[i] *= f; m.wAR[i] *= f; m.wFl[i] *= f; m.wTilt[i] *= f; m.wBx[i] *= f;
          }
        } else if (kind === 'beast') {
          const dH = (x - L.neckX) * hs, dT = (x - L.tailX) * -hs;
          m.wHead[i] = ss(-0.02, 0.1, dH) * (1 - ss(foot - 0.14 * FH, foot - 0.02 * FH, y));
          m.wTail[i] = ss(0, 0.1, dT) * (1 - ss(foot - 0.1 * FH, foot, y));
          m.wBody[i] = ss(foot, foot - 0.3 * FH, y);
        } else {
          m.wBody[i] = kind === 'crawler' ? ss(foot - 0.02 * FH, foot - 0.4 * FH, y) : 1;
        }
      }
    }
    const idx = [];
    for (let gy = 0; gy < GY; gy++) {
      for (let gx = 0; gx < GX; gx++) {
        const a = gy * (GX + 1) + gx, b = a + 1, c = a + GX + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    m.idx = new Uint16Array(idx);
    m.out = new Float32Array(n * 2);
    return m;
  }

  // 몸통 반폭: 어깨 아래 ~ 허리 아래 구간에서 그림으로 잰 값. 위아래 두 줄씩 평균하고, 팔·망토가 붙어 너무 넓으면 0.22FH 로 자른다
  function torso(info, y, side, L) {
    if (!info.limL || y < L.sh || y > L.hip + 0.15 * L.FH) return 0;
    const arr = side === 'L' ? info.limL : info.limR, n = info.rows, r0 = Math.floor(y * n);
    let sum = 0, cnt = 0;
    for (let r = r0 - 2; r <= r0 + 2; r++) if (r >= 0 && r < n) { sum += arr[r]; cnt++; }
    return Math.min(0.22 * L.FH, cnt ? sum / cnt : 0);
  }

  // 점 (x, y) 를 (px, py) 기준으로 a 만큼 돌린다
  let RX = 0, RY = 0;
  function rot(x, y, px, py, a) {
    if (!a) { RX = x; RY = y; return; }
    const c = Math.cos(a), s = Math.sin(a), dx = x - px, dy = y - py;
    RX = px + dx * c - dy * s; RY = py + dx * s + dy * c;
  }

  // 자세 p 로 격자 꼭짓점을 옮긴다. 결과는 그림 높이 단위 좌표
  function deform(m, p, kind, fwd, t, ph) {
    const L = m.L, cx = L.cx, foot = L.foot, out = m.out;
    for (let i = 0; i < m.n; i++) {
      const x0 = m.x0[i], y0 = m.y0[i];
      let x = x0, y = y0;
      if (kind === 'human') {
        // 팔 → 머리 → 숨쉬기 → 가슴 → 허리 순서로, 끝부분부터 몸통 쪽으로 쌓는다
        const wl = m.wAL[i], wr = m.wAR[i];
        if (wl) { rot(x, y, cx - L.th, L.sh, (fwd < 0 ? p.armF : p.armB) * wl); x = RX; y = RY; }
        if (wr) { rot(x, y, cx + L.th, L.sh, -(fwd > 0 ? p.armF : p.armB) * wr); x = RX; y = RY; }
        if (m.wHead[i]) { rot(x, y, cx, L.neck, p.head * fwd * m.wHead[i]); x = RX; y = RY; }
        if (p.breath && y0 < L.hip) {
          y = L.hip + (y - L.hip) * (1 + p.breath * m.wHip[i]);
          x = cx + (x - cx) * (1 + p.breath * 0.6 * m.wBx[i]);
        }
        if (m.wChest[i]) { rot(x, y, cx, L.chest, p.chest * fwd * m.wChest[i]); x = RX; y = RY; }
        if (m.wHip[i]) { rot(x, y, cx, L.hip, p.lean * fwd * m.wHip[i]); x = RX; y = RY; }
        if (p.tilt) { rot(x, y, cx, foot, p.tilt * fwd * m.wTilt[i]); x = RX; y = RY; }
        x += 0.006 * Math.sin(t * 2.1 + y0 * 7 + ph) * m.wFl[i];
      } else if (kind === 'beast') {
        if (m.wHead[i]) { rot(x, y, L.neckX, L.neckY, -L.hs * p.head * m.wHead[i]); x = RX; y = RY; }
        if (m.wTail[i]) { rot(x, y, L.tailX, L.tailY, L.hs * p.tail * m.wTail[i]); x = RX; y = RY; }
        if (p.breath) y = foot + (y - foot) * (1 + p.breath * m.wBody[i]);
        if (p.rear) { rot(x, y, L.hindX, foot, -L.hs * p.rear * m.wBody[i]); x = RX; y = RY; }
        x += 0.005 * Math.sin(t * 2.1 + y0 * 7 + ph) * m.wFl[i];
      } else if (kind === 'crawler') {
        if (p.rear) { rot(x, y, cx, foot, p.rear * fwd * m.wBody[i]); x = RX; y = RY; }
        y += p.ty * m.wBody[i];
      } else {
        x += 0.008 * Math.sin(t * 2.4 + y0 * 9 + ph) * m.wFl[i];
      }
      // 발밑 기준 늘이기·기울이기·이동
      x = cx + (x - cx) * (1 + p.sx);
      y = foot + (y - foot) * (1 + p.sy);
      x += p.shear * fwd * (foot - y0) + p.tx * fwd;
      if (kind !== 'crawler') y += p.ty;
      out[i * 2] = x; out[i * 2 + 1] = y;
    }
    return out;
  }

  /* ---------- WebGL ---------- */
  const VS = 'attribute vec2 p;attribute vec2 t;varying vec2 v;void main(){v=t;gl_Position=vec4(p,0.,1.);}';
  const FS = 'precision mediump float;varying vec2 v;uniform sampler2D s;void main(){gl_FragColor=texture2D(s,v);}';
  function program(gl) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    return pr;
  }

  function Puppet(mon, img, opts) {
    this.mon = mon; this.img = img;
    this.opts = Object.assign({ kind: 'human', flip: false, dir: -1, float: false }, opts || {});
    if (!ACT[this.opts.kind]) this.opts.kind = 'human';
    this.ph = Math.random() * 6.28;
    this.action = null; this.ready = false; this.dead = false; this.last = 0; this.dirty = true;
    const cv = this.canvas = document.createElement('canvas');
    cv.className = 'rig';
    cv.setAttribute('aria-hidden', 'true');
    const attrs = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false };
    let gl = null;
    try { gl = cv.getContext('webgl2', attrs); this.gl2 = !!gl; if (!gl) gl = cv.getContext('webgl', attrs) || cv.getContext('experimental-webgl', attrs); } catch (e) { gl = null; }
    if (!gl) { this.dead = true; return; }
    this.gl = gl;
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.dispose(); });
    mon.insertBefore(cv, mon.firstChild);
    const go = () => { if (!this.dead) this.init(); };
    if (img.complete && img.naturalWidth) go();
    else img.addEventListener('load', go, { once: true });
  }
  Puppet.prototype.init = function () {
    const gl = this.gl, img = this.img;
    try {
      if (!this.prog) {
        this.prog = program(gl);
        this.bPos = gl.createBuffer(); this.bUv = gl.createBuffer(); this.bIdx = gl.createBuffer();
        this.tex = gl.createTexture();
      }
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); // file:// 그림이면 여기서 보안 오류
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (this.gl2) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
      else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    } catch (e) { this.dispose(); return; }
    const src = img.currentSrc || img.src;
    let info = cache.get(src);
    if (!info) { info = analyze(img); cache.set(src, info); }
    this.mesh = buildMesh(info, this.opts);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bUv); gl.bufferData(gl.ARRAY_BUFFER, this.mesh.uv, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos); gl.bufferData(gl.ARRAY_BUFFER, this.mesh.n * 2 * 4, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.mesh.idx, gl.STATIC_DRAW);
    this.clip = new Float32Array(this.mesh.n * 2);
    if (!this.ro && root.ResizeObserver) { this.ro = new ResizeObserver(() => { this.layout(); this.dirty = true; }); this.ro.observe(this.mon); }
    this.layout();
    this.ready = true; this.dirty = true;
    this.mon.classList.add('rigged');
    this.mon._rig = this;
    rigs.add(this);
    kick();
  };
  Puppet.prototype.layout = function () {
    const img = this.img, w = img.offsetWidth, h = img.offsetHeight;
    if (!w || !h) return;
    const px = Math.round(h * PADX), pt = Math.round(h * PADT), pb = Math.round(h * PADB);
    const CW = w + 2 * px, CH = h + pt + pb;
    const st = this.canvas.style;
    st.left = (img.offsetLeft - px) + 'px'; st.top = (img.offsetTop - pt) + 'px';
    st.width = CW + 'px'; st.height = CH + 'px';
    const dpr = Math.min(2, root.devicePixelRatio || 1);
    const bw = Math.round(CW * dpr), bh = Math.round(CH * dpr);
    if (this.canvas.width !== bw || this.canvas.height !== bh) { this.canvas.width = bw; this.canvas.height = bh; }
    Object.assign(this, { w, h, px, pt, CW, CH });
  };
  // 동작 재생. opts.dur 로 길이를 바꿀 수 있다
  Puppet.prototype.play = function (name, opts) {
    if (this.dead || Rig.reduced()) return;
    const a = ACT[this.opts.kind][name];
    if (!a) return;
    this.action = { a, start: performance.now(), dur: (opts && opts.dur) || a.dur };
    kick();
  };
  // 같은 인물의 다른 그림(예: 전사 부상 모습)으로 바꾼다
  Puppet.prototype.setImage = function (src) {
    const img = this.img;
    if (img.getAttribute('src') === src) return;
    img.setAttribute('src', src);
    if (this.dead || !this.prog) return;
    this.ready = false;
    img.addEventListener('load', () => { if (!this.dead) this.init(); }, { once: true });
  };
  Puppet.prototype.frame = function (now) {
    if (!this.canvas.isConnected) { this.dispose(); return; }
    if (!this.ready || !this.h) return;
    const act = this.action;
    if (!act && !this.dirty && (Rig.reduced() || now - this.last < 33)) return; // 가만히 있을 때는 초당 30장
    this.last = now; this.dirty = false;
    const p = Object.assign({}, ZERO), kind = this.opts.kind, t = now / 1000;
    if (!Rig.reduced()) {
      IDLE[kind](p, t, this.ph);
      if (this.opts.float) p.ty += 0.012 * Math.sin(t * 1.4 + this.ph);
    }
    if (act) {
      const u = Math.min(1, (now - act.start) / act.dur);
      const k = act.a.k;
      for (const key in k) p[key] += track(k[key], u);
      if (u >= 1 && !act.a.hold) this.action = null;
    }
    if (this.opts.arms != null) { p.armF *= this.opts.arms; p.armB *= this.opts.arms; }
    // 그림 공간에서 상대 쪽 방향: 뒤집어 그리면 반대가 된다
    const flip = this.opts.flip, fwd = this.opts.dir * (flip ? -1 : 1);
    const pos = deform(this.mesh, p, kind, fwd, t, this.ph), clip = this.clip;
    const h = this.h, asp = this.mesh.asp, CW = this.CW, CH = this.CH, px = this.px, pt = this.pt;
    for (let i = 0; i < this.mesh.n; i++) {
      const x = flip ? asp - pos[i * 2] : pos[i * 2];
      clip[i * 2] = (px + x * h) / CW * 2 - 1;
      clip[i * 2 + 1] = 1 - (pt + pos[i * 2 + 1] * h) / CH * 2;
    }
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const lp = gl.getAttribLocation(this.prog, 'p'), lt = gl.getAttribLocation(this.prog, 't');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, clip);
    gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bUv);
    gl.enableVertexAttribArray(lt); gl.vertexAttribPointer(lt, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.drawElements(gl.TRIANGLES, this.mesh.idx.length, gl.UNSIGNED_SHORT, 0);
  };
  Puppet.prototype.dispose = function () {
    if (this.dead && !this.canvas.parentNode) return;
    this.dead = true; this.ready = false;
    rigs.delete(this);
    if (this.ro) this.ro.disconnect();
    try { const ext = this.gl && this.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) { /* 무시 */ }
    this.canvas.remove();
    this.mon.classList.remove('rigged');
    if (this.mon._rig === this) this.mon._rig = null;
  };

  function loop(now) {
    raf = 0;
    rigs.forEach(r => r.frame(now));
    if (rigs.size) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && rigs.size) raf = requestAnimationFrame(loop); }

  /* ---------- 밖에서 쓰는 함수 ----------
   * Rig.attach(.mon 요소, { kind, flip, dir, float, headSide }) → 리그. WebGL 을 못 쓰면 아무 일도 하지 않는 리그를 돌려준다.
   * Rig.get(.mon 요소 또는 id) → 붙어 있는 리그 */
  const NOOP = { play() {}, setImage() {}, dispose() {}, dead: true };
  Rig.attach = function (mon, opts) {
    const img = mon && mon.querySelector('img');
    if (!img) return NOOP;
    if (mon._rig) mon._rig.dispose();
    const p = new Puppet(mon, img, opts);
    if (p.dead) return NOOP;
    mon._rig = p;
    return p;
  };
  Rig.get = function (el) {
    const m = typeof el === 'string' ? document.getElementById(el) : el;
    return (m && m._rig && !m._rig.dead) ? m._rig : NOOP;
  };
  // 테스트용: 지금 살아 있는 리그 수
  Rig.count = () => rigs.size;
})(typeof window !== 'undefined' ? window : globalThis);
