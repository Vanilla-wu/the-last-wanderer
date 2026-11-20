/**
 * Sprites —— 程序化像素美術
 *
 * 第一階段不依賴外部圖片：角色、敵人、圖塊與場景道具都在載入時以程式繪製到離屏 Canvas，
 * 再組成 Sprite Sheet 交給 Animation System。之後若改用 Aseprite 匯出的 PNG，
 * 只需讓 SpriteSheet 改讀圖片，其他系統不必修改。
 */

const PAL = {
  outline: '#0a0d17',
  armor: '#c7d1dd', armorLight: '#eef3f8', armorShade: '#8692a8', armorDark: '#566079',
  scarf: '#1f3d78', scarfLight: '#3563b0', scarfDark: '#132650',
  cloth: '#2a2f46', clothDark: '#1c2033', clothLight: '#3a4160',
  wrap: '#6c7088', wrapDark: '#4a4d63', sandal: '#191820',
  skin: '#d8c3b0', hair: '#14141d', eye: '#c9f7ff',
  blade: '#e9eff6', bladeEdge: '#9eb0c6', hiltWrap: '#4d3f63', guard: '#b48d45',
  obi: '#5e2a35',
  snow: '#dfe9f0', frost: '#a7bccb'
};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
}

function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

/** 像素繪圖工具：所有座標都四捨五入成整數，保持銳利像素 */
const Px = {
  rect(g, x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  },

  /** 粗線：沿線段蓋正方形 */
  line(g, x0, y0, x1, y1, thickness, color) {
    g.fillStyle = color;
    const t = Math.max(1, Math.round(thickness));
    const dx = x1 - x0, dy = y1 - y0;
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
    for (let i = 0; i <= n; i++) {
      const x = x0 + dx * i / n, y = y0 + dy * i / n;
      g.fillRect(Math.round(x - t / 2), Math.round(y - t / 2), t, t);
    }
  },

  circle(g, cx, cy, r, color) {
    g.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.round(Math.sqrt(r * r - dy * dy));
      g.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
    }
  },

  template(g, rows, palette, ox, oy, s = 1) {
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const color = palette[rows[y][x]];
        if (!color) continue;
        g.fillStyle = color;
        g.fillRect(ox + x * s, oy + y * s, s, s);
      }
    }
  }
};

function tintCanvas(src, color) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** 先畫本體，再自動產生 1px 外框 */
function outlined(w, h, draw, color = PAL.outline) {
  const body = makeCanvas(w, h);
  draw(body.getContext('2d'));
  const sil = tintCanvas(body, color);
  const out = makeCanvas(w, h);
  const g = out.getContext('2d');
  g.drawImage(sil, 1, 0);
  g.drawImage(sil, -1, 0);
  g.drawImage(sil, 0, 1);
  g.drawImage(sil, 0, -1);
  g.drawImage(body, 0, 0);
  return out;
}

function buildSheet({ frameWidth, frameHeight, anchorX, anchorY, animations, drawFrame }) {
  const rows = Math.max(...Object.values(animations).map((a) => a.row)) + 1;
  const cols = Math.max(...Object.values(animations).map((a) => a.frames));
  const image = makeCanvas(cols * frameWidth, rows * frameHeight);
  const g = image.getContext('2d');
  for (const [name, anim] of Object.entries(animations)) {
    for (let f = 0; f < anim.frames; f++) {
      const cell = outlined(frameWidth, frameHeight, (cg) => drawFrame(cg, name, f, anim.frames));
      g.drawImage(cell, f * frameWidth, anim.row * frameHeight);
    }
  }
  return new SpriteSheet({
    image,
    variants: { flash: tintCanvas(image, '#ffffff'), ghost: tintCanvas(image, '#6fc8ff') },
    frameWidth, frameHeight, anchorX, anchorY, animations
  });
}

/* ------------------------------------------------------------------ */
/* 主角：獨眼流浪劍客                                                  */
/* ------------------------------------------------------------------ */

const PLAYER_FRAME = { width: 144, height: 128, cx: 72, feet: 120 };

const PLAYER_ANIMS = {
  idle: { row: 0, frames: 6, fps: 6, loop: true },
  run: { row: 1, frames: 8, fps: 13, loop: true },
  jump: { row: 2, frames: 2, fps: 10, loop: false },
  fall: { row: 3, frames: 2, fps: 8, loop: true },
  attack: { row: 4, frames: 5, fps: 1 / 0.06, loop: false },
  hurt: { row: 5, frames: 2, fps: 10, loop: false },
  death: { row: 6, frames: 6, fps: 7, loop: false },
  dodge: { row: 7, frames: 3, fps: 15, loop: false },
  attackUp: { row: 8, frames: 5, fps: 1 / 0.06, loop: false },
  attackDown: { row: 9, frames: 5, fps: 1 / 0.06, loop: false },
  charge: { row: 10, frames: 2, fps: 6, loop: true },
  attack2: { row: 12, frames: 5, fps: 1 / 0.06, loop: false },
  attack3: { row: 13, frames: 6, fps: 1 / 0.065, loop: false },
  scarf: { row: 14, frames: 2, fps: 10, loop: true }
};

function playerPose(name, f, n) {
  const base = {
    hx: 0, hy: 0, lean: 0, torsoDY: 0, headDX: 0, headDY: 0, headTilt: 0,
    legF: { a: 0.15, b: 0.08 }, legB: { a: -0.18, b: 0.05 },
    hand: [7, 15], handB: [-3, 16], twoHand: false, sword: 0.55, dropSword: false,
    scarfT: f / n, scarfLift: 0, scarfLen: 1
  };
  const stance = { legF: { a: 0.5, b: 0.25 }, legB: { a: -0.5, b: 0.1 } };

  switch (name) {
    case 'idle':
      return { ...base, torsoDY: [0, 0, 1, 1, 1, 0][f] };

    case 'run': {
      const phi = f / n * Math.PI * 2;
      const leg = (p) => ({ a: 0.78 * Math.sin(p), b: 0.25 + 1.05 * Math.max(0, Math.cos(p)) });
      return {
        ...base, lean: 5, hy: Math.round(Math.abs(Math.sin(phi)) * 2) - 1,
        legF: leg(phi), legB: leg(phi + Math.PI),
        hand: [-3, 14], sword: 2.75, handB: [-4 + Math.sin(phi) * 6, 12],
        scarfLift: 0.5, scarfLen: 1.2
      };
    }

    case 'jump':
      return { ...base, lean: 2, hy: -2, legF: { a: 0.8, b: 1.4 }, legB: { a: 0.15, b: 1.0 }, hand: [6, 8], sword: 2.4, handB: [-7, 6], scarfLift: -0.8 };

    case 'fall':
      return { ...base, lean: 1, legF: { a: 0.35, b: 0.5 }, legB: { a: -0.25, b: 0.25 }, hand: [9, 2], sword: 0.1, handB: [-8, 2], scarfLift: 1.4 + f * 0.3 };

    case 'attack': {
      const frames = [
        { lean: -3, hy: 2, hand: [-5, -9], sword: -2.3 },
        { lean: 2, hy: 2, hand: [5, -10], sword: -1.1 },
        { lean: 7, hy: 3, hand: [15, 3], sword: 0.15, legF: { a: 0.6, b: 0.3 }, legB: { a: -0.55, b: 0.05 } },
        { lean: 7, hy: 3, hand: [13, 11], sword: 0.85, legF: { a: 0.6, b: 0.3 }, legB: { a: -0.55, b: 0.05 } },
        { lean: 4, hy: 2, hand: [9, 14], sword: 0.7 }
      ];
      return { ...base, ...stance, twoHand: f < 4, scarfLift: 0.3, scarfLen: 1.1, ...frames[f] };
    }

    case 'attack2': {
      // 連段第二擊：由前下方反手往上撩
      const frames = [
        { lean: 5, hy: 3, hand: [12, 12], sword: 0.95 },
        { lean: 4, hy: 2, hand: [15, 2], sword: 0.1 },
        { lean: 2, hy: 1, hand: [12, -8], sword: -0.75, headTilt: -0.1 },
        { lean: 0, hy: 1, hand: [8, -13], sword: -1.25, headTilt: -0.15 },
        { lean: 1, hy: 2, hand: [5, -8], sword: -1.0 }
      ];
      return { ...base, ...stance, twoHand: f < 4, scarfLift: 0.3, scarfLen: 1.1, ...frames[f] };
    }

    case 'attack3': {
      // 連段第三擊（收尾）：刀收到身後蓄勢，踏步向前橫掃
      const lunge = { legF: { a: 1.0, b: 0.6 }, legB: { a: -0.95, b: 0.2 } };
      const frames = [
        { lean: -4, hy: 4, hand: [-8, 2], sword: 3.0 },
        { lean: -2, hy: 5, hand: [-6, 0], sword: 2.85 },
        { lean: 8, hy: 6, hand: [12, 0], sword: -0.05, ...lunge },
        { lean: 10, hy: 6, hand: [17, 4], sword: 0.15, ...lunge },
        { lean: 8, hy: 5, hand: [15, 9], sword: 0.45, ...lunge },
        { lean: 4, hy: 3, hand: [9, 14], sword: 0.7 }
      ];
      return { ...base, ...stance, twoHand: f > 1 && f < 5, scarfLift: 0.2, scarfLen: 1.35, ...frames[f] };
    }

    case 'attackUp': {
      // 上劈：由前下方往頭頂後方揮，視線跟著刀抬向斜上方
      const frames = [
        { lean: 2, hy: 2, hand: [10, 10], sword: 0.9, headTilt: -0.15 },
        { lean: 1, hy: 1, hand: [8, -8], sword: -0.8, headTilt: -0.4, headDX: -1 },
        { lean: -1, hy: 0, hand: [3, -16], sword: -1.55, headTilt: -0.55, headDX: -1 },
        { lean: -3, hy: 1, hand: [-3, -14], sword: -2.4, headTilt: -0.5, headDX: -1 },
        { lean: -1, hy: 2, hand: [0, -6], sword: -2.1, headTilt: -0.3 }
      ];
      return { ...base, ...stance, twoHand: f < 4, scarfLift: 0.2, ...frames[f] };
    }

    case 'attackDown': {
      // 下劈（空中）：收腿，刀尖朝正下方
      const frames = [
        { lean: -2, hand: [-2, -10], sword: -1.9 },
        { lean: 3, hand: [8, 2], sword: 0.6 },
        { lean: 4, hand: [5, 14], sword: 1.45 },
        { lean: 4, hand: [3, 16], sword: 1.6 },
        { lean: 3, hand: [4, 14], sword: 1.5 }
      ];
      return { ...base, legF: { a: 0.8, b: 1.4 }, legB: { a: 0.15, b: 1.0 }, twoHand: f > 0 && f < 4, handB: [-7, 4], scarfLift: 1.2, ...frames[f] };
    }

    case 'charge':
      // 居合架勢：壓低重心，刀收在身後
      return {
        ...base, hy: 6, lean: 3, torsoDY: f, headTilt: 0.08,
        legF: { a: 0.65, b: 0.55 }, legB: { a: -0.6, b: 0.2 },
        hand: [-6, 14], sword: 2.9, handB: [-2, 12], scarfLift: 0.6, scarfT: f * 0.5
      };

    case 'hurt':
      return { ...base, lean: -5, headDX: -2, legF: { a: 0.3, b: 0.2 }, legB: { a: -0.35, b: 0.15 }, hand: [-3, 12], sword: 2.3, handB: [-8, 4], scarfLift: 0.8 };

    case 'death': {
      const frames = [
        { lean: -5, headDX: -2, legF: { a: 0.3, b: 0.2 }, legB: { a: -0.35, b: 0.15 }, hand: [-3, 12], sword: 2.3 },
        { lean: -3, hy: 4, legF: { a: 0.5, b: 0.9 }, legB: { a: -0.2, b: 0.7 }, hand: [4, 16], sword: 1.6 },
        { lean: 5, hy: 13, headDY: 2, legF: { a: 1.3, b: 1.3 }, legB: { a: -0.1, b: 1.47 }, hand: [10, 16], sword: 1.45 },
        { lean: 10, hy: 14, headDY: 4, headDX: 2, legF: { a: 1.3, b: 1.3 }, legB: { a: -0.1, b: 1.47 }, hand: [12, 18], sword: 1.5 },
        { lean: 18, hy: 18, headDY: 3, legF: { a: -0.6, b: -0.4 }, legB: { a: -0.9, b: -0.2 }, hand: [8, 10], dropSword: true },
        { lean: 24, hy: 23, headDY: 2, legF: { a: -1.4, b: 0.05 }, legB: { a: -1.5, b: 0 }, hand: [8, 6], dropSword: true }
      ];
      return { ...base, scarfLift: 1.6, scarfT: 0.2, ...frames[f] };
    }

    case 'scarf':
      // 風縛：空出的手指向目標，圍巾從頸間延伸出去（尾端收短）
      return {
        ...base, ...stance, lean: 4, hy: 1, headTilt: -0.1,
        hand: [-3, 14], sword: 2.75, handB: [16, -4 - f], scarfLen: 0.35, scarfLift: 0.2
      };

    case 'dodge':
      return { ...base, hy: 10, lean: 9, legF: { a: 1.0, b: 1.6 }, legB: { a: -0.9, b: 0.4 }, hand: [-6, 10], sword: 2.95, handB: [-10, 8], scarfLift: 0.1, scarfLen: 1.4 };

    default:
      return base;
  }
}

/* ---------------- pixelfx 招式：姿勢轉套到劍客身上 ---------------- */

/**
 * 三連擊、旋風斬、衝刺斬的動作取自 pixelfx（data/swordmoves.js）。
 * pixelfx 的姿勢只說「手、腳該在哪裡、刀的角度、蹲低、前傾與轉身」，
 * 單位是它約 38px 高的假人，腳底為原點、y 往上為負。劍客約 80px，所以座標放大 COMBO_SCALE 倍；
 * 刀的角度兩邊定義相同（畫面座標，0 = 朝前）。腳用兩段式 IK 算出大腿與小腿的角度。
 * 刀與手舉起時會超出一般的畫格，所以這些招式另用較大的 COMBO_FRAME。
 * 劍客是 2D 骨架沒有轉身的軸：轉身（yaw）以前後方向的壓縮來表現，轉到背面時整張圖左右鏡像。
 */
const COMBO_SCALE = 2;
const COMBO_FRAME = { width: 240, height: 160, cx: 120, feet: 150 };
const LEG = 17;   // 與 drawLeg 的大腿、小腿長度相同

function legTo(dx, dy) {
  const d = Math.min(Math.hypot(dx, dy), LEG * 2 - 0.01);
  const bend = Math.acos(d / (LEG * 2)), dir = Math.atan2(dx, dy);
  return { a: dir + bend, b: bend * 2 };
}

function comboPose(q, f, n) {
  const yaw = q.yaw || 0, S = Math.max(0.3, Math.abs(Math.cos(yaw)));   // 側身時前後方向縮短
  const K = COMBO_SCALE, KX = K * S;
  // pixelfx 的 x 是整個人前後移動（蓄勢時後退、出刀時前衝），劍客原地揮刀，只保留上下（小跳）
  const ox = 0, oy = q.y * K;
  const hx = ox, hy = q.crouch * K + oy;
  const lean = Math.max(-24, Math.min(24, q.lean * KX));
  const sinT = lean / 26, cosT = Math.sqrt(1 - sinT * sinT);
  const hipY = -34 + hy, shX = hx + lean, shY = hipY - 26 * cosT;
  // 腳離地的高度：pixelfx 站姿的腳踝在 -4，沒寫就是踩在地上
  const lift = (v) => (v ? Math.min(0, v + 4) * K : 0);
  return {
    hx, hy, lean, torsoDY: 0, headDX: 0, headDY: 0, headTilt: 0,
    hand: [ox + q.fx * KX - (shX + 2), oy + q.fy * K - (shY + 4)],
    handB: [ox + q.bx * KX - (shX - 2), oy + q.by * K - (shY + 5)],
    twoHand: !!q.two, dropSword: false,
    // 刀的方向也跟著轉身壓縮前後分量
    sword: Math.atan2(Math.sin(q.sa), Math.cos(q.sa) * S),
    legF: legTo(ox + q.ffx * KX - (hx + 2), oy + lift(q.ffy) - hipY),
    legB: legTo(ox + q.fbx * KX - (hx - 2), oy + lift(q.fby) - hipY),
    scarfT: f / n, scarfLift: 0.4, scarfLen: 1.3,
    mirror: Math.cos(yaw) < -0.01   // 轉到背面
  };
}

const SWORD_MOVE_ANIMS = (window.SWORD_MOVES && window.SWORD_MOVES.anims) || {};
const COMBO_SHEET_ANIMS = Object.fromEntries(Object.entries(SWORD_MOVE_ANIMS).map(([name, a], i) => [
  name, { row: i, frames: a.frames.length, fps: window.SWORD_MOVES.fps, loop: false }
]));

/** 畫一格 pixelfx 招式；轉到背面時左右鏡像 */
function drawMoveFrame(g, name, f, n) {
  const p = comboPose(SWORD_MOVE_ANIMS[name].frames[f], f, n);
  if (p.mirror) {
    g.translate(COMBO_FRAME.cx * 2, 0);
    g.scale(-1, 1);
  }
  drawWanderer(g, p, COMBO_FRAME);
}

/*
 * 劍客的畫法：斗笠浪人（從三版草稿中選定，作業流程同 pixelfx：草稿 → 算圖 → 看圖 → 修正）
 * 骨架（髖、肩、手、腳、刀角度）由 playerPose / comboPose 給，這裡只負責「怎麼畫」：
 * 有明暗的布料（左上受光：亮一階、主色、暗一階）、袖子、袴的褶線、綁腿與草鞋、側臉、壓低的斗笠，
 * 刀是微彎的打刀（編繩刀柄、圓鍔、刃紋與刀背）。外框由 buildSheet 的 outlined() 統一加上。
 */
const WANDERER = {
  coat: { base: '#4a5878', light: '#6b7c9e', dark: '#2f3a55' },
  pants: { base: '#252a3b', light: '#363d55', dark: '#171a26' },
  inner: '#d9d2c3', obi: '#7a2f36', obiLight: '#c95a5a',
  wrap: '#b9b2a2', wrapLight: '#e8e1d0', wrapDark: '#857f72',
  skin: '#e2c9b0', skinDark: '#b8987e', hair: '#16161f', hairLight: '#2c2c3c',
  hat: ['#8f7a52', '#6e5b38', '#4a3c22', '#2e2514'],   // 斗笠：受光面、主色、陰影、帽頂與繩（調暗過）
  scarf: { base: PAL.scarf, light: PAL.scarfLight, dark: PAL.scarfDark },
  steel: '#c7d3e0', edge: '#f4f8fc', spine: '#7d8ea6', tsuba: '#8a6a32', tsubaLight: '#e0bd6e',
  ito: ['#2a2236', '#5b4c73'], sheath: '#1a1622'
};

/** 硬邊多邊形：逐列填滿、不反鋸齒，保持像素銳利 */
function pxPoly(g, pts, color) {
  g.fillStyle = color;
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > yc) !== (yj > yc)) xs.push(xi + (yc - yi) / (yj - yi) * (xj - xi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.round(xs[k]), b = Math.round(xs[k + 1]);
      if (b > a) g.fillRect(a, y, b - a, 1);
    }
  }
}

/** 由 a 到 b 的梯形（寬 wa → wb）的四個角 */
function pxBand(ax, ay, bx, by, wa, wb) {
  const d = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / d, ny = (bx - ax) / d;
  return [[ax + nx * wa / 2, ay + ny * wa / 2], [bx + nx * wb / 2, by + ny * wb / 2], [bx - nx * wb / 2, by - ny * wb / 2], [ax - nx * wa / 2, ay - ny * wa / 2]];
}

/** 有明暗的肢段：主色，朝左上的那一側亮一條、另一側暗一條 */
function pxLimb(g, ax, ay, bx, by, wa, wb, c) {
  pxPoly(g, pxBand(ax, ay, bx, by, wa, wb), c.base);
  const d = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / d, ny = (bx - ax) / d;
  const s = (nx * -0.7 + ny * -0.7) > 0 ? 1 : -1, o = (w) => s * (w / 2 - 1.2);
  pxPoly(g, pxBand(ax + nx * o(wa), ay + ny * o(wa), bx + nx * o(wb), by + ny * o(wb), 2, 2), c.light);
  pxPoly(g, pxBand(ax - nx * o(wa), ay - ny * o(wa), bx - nx * o(wb), by - ny * o(wb), 2, 2), c.dark);
}

function pxDot(g, x, y, c, w = 1, h = 1) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}

/** 腳的兩段：髖 → 膝 → 腳（大腿、小腿各 LEG） */
function legJoints(hx, hy, leg) {
  const kx = hx + Math.sin(leg.a) * LEG, ky = hy + Math.cos(leg.a) * LEG;
  return { kx, ky, fx: kx + Math.sin(leg.a - leg.b) * LEG, fy: ky + Math.cos(leg.a - leg.b) * LEG };
}

/** 袴：大腿到小腿中段都是寬褲管，之後收進綁腿，穿草鞋 */
function drawLeg(g, hx, hy, leg, back) {
  const W = WANDERER;
  const { kx, ky, fx, fy } = legJoints(hx, hy, leg);
  const P = back ? { base: W.pants.dark, light: W.pants.base, dark: '#0f1119' } : W.pants;
  pxLimb(g, hx, hy, kx, ky, 11, 11, P);
  const mx = kx + (fx - kx) * 0.55, my = ky + (fy - ky) * 0.55;
  pxLimb(g, kx, ky, mx, my, 11, 9, P);
  pxLimb(g, mx, my, fx, fy - 1, 5, 4, back ? { base: W.wrapDark, light: W.wrap, dark: W.wrapDark } : { base: W.wrap, light: W.wrapLight, dark: W.wrapDark });
  if (!back) for (let k = 0.2; k < 0.9; k += 0.3) pxDot(g, mx + (fx - mx) * k - 2, my + (fy - my) * k, W.wrapDark, 4, 1);
  pxPoly(g, [[fx - 3, fy - 2], [fx + 6, fy - 1], [fx + 6, fy + 1], [fx - 3, fy + 1]], back ? '#121119' : '#262330');
  pxDot(g, fx - 2, fy - 2, back ? '#262330' : '#4a4252', 3, 1);
  if (!back) {
    for (let i = 1; i < 3; i++) {
      const t = i / 3;
      pxDot(g, hx + (kx - hx) * t, hy + (ky - hy) * t + 1, P.dark);
      pxDot(g, kx + (mx - kx) * t, ky + (my - ky) * t, P.dark);
    }
  }
}

/** 手臂：袖子在手肘處張開，前臂纏護手，露出手 */
function drawArm(g, sx, sy, hx, hy, back) {
  const W = WANDERER;
  const dx = hx - sx, dy = hy - sy, len = Math.hypot(dx, dy) || 1;
  let px = -dy / len, py = dx / len;
  if (py < 0) { px = -px; py = -py; }
  const bend = Math.max(1.5, (24 - len) * 0.45);
  const ex = (sx + hx) / 2 + px * bend, ey = (sy + hy) / 2 + py * bend;
  const C = back ? { base: W.coat.dark, light: W.coat.base, dark: '#151a2c' } : W.coat;
  if (!back) pxPoly(g, pxBand(sx, sy, ex, ey, 8, 11), '#141826');   // 墊一圈深色，和同色的身體分開
  pxLimb(g, sx, sy, ex, ey, 6, 9, C);
  if (!back) {
    pxDot(g, sx + (ex - sx) * 0.55 + 1, sy + (ey - sy) * 0.55, C.dark, 2, 1);
    pxDot(g, sx + (ex - sx) * 0.8, sy + (ey - sy) * 0.8 + 1, C.dark, 2, 1);
  }
  pxLimb(g, ex, ey, hx, hy, 5, 4, back ? { base: W.wrapDark, light: W.wrap, dark: W.wrapDark } : { base: W.wrap, light: W.wrapLight, dark: W.wrapDark });
  pxPoly(g, pxBand(ex, ey, ex + (hx - ex) * 0.25, ey + (hy - ey) * 0.25, 8, 6), C.base);   // 袖口
  pxDot(g, hx - 2, hy - 2, back ? W.skinDark : W.skin, 4, 4);
  pxDot(g, hx - 2, hy + 1, W.skinDark, 4, 1);
}

/** 打刀：編繩刀柄與柄頭、圓鍔，刀身微微往刀背彎，刃紋亮、刀背暗，切先斜收 */
function drawSword(g, hx, hy, c, s) {
  const W = WANDERER;
  const nx = -s, ny = c;   // 刀刃那一側
  for (let i = -10; i <= 1; i++) pxDot(g, hx + c * i - 1, hy + s * i - 1, W.ito[i & 1], 3, 3);
  pxDot(g, hx - c * 11 - 1, hy - s * 11 - 1, PAL.guard, 3, 3);
  const gx = hx + c * 3, gy = hy + s * 3;
  pxPoly(g, pxBand(gx - nx * 3.5, gy - ny * 3.5, gx + nx * 3.5, gy + ny * 3.5, 3, 3), W.tsuba);
  pxDot(g, gx - nx * 2 - 0.5, gy - ny * 2 - 0.5, W.tsubaLight);
  const L = 42, base = 5, edge = [], back = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12, along = base + (L - base) * u;
    const curve = 3 * Math.sin(Math.PI * u * 0.5) * u, w = 2.6 - 0.8 * u;
    const cx = hx + c * along - nx * curve, cy = hy + s * along - ny * curve;
    edge.push([cx + nx * w * 0.5, cy + ny * w * 0.5]);
    back.push([cx - nx * w * 0.5, cy - ny * w * 0.5]);
  }
  const tip = back[back.length - 1];
  pxPoly(g, [...edge, [tip[0] + c * 2.5, tip[1] + s * 2.5], ...back.slice().reverse()], W.steel);
  for (let i = 1; i < edge.length; i++) pxDot(g, edge[i][0] - nx * 0.6, edge[i][1] - ny * 0.6, W.edge);
  for (let i = 1; i < back.length - 1; i++) pxDot(g, back[i][0] + nx * 0.4, back[i][1] + ny * 0.4, W.spine);
  pxDot(g, tip[0] + c * 1.5, tip[1] + s * 1.5, '#ffffff');
}

/**
 * 頭部可傾斜（tilt < 0 = 抬頭看向斜上方）。
 * 先畫到小畫布，再以最近鄰取樣逐像素旋轉，保持像素銳利不模糊。斗笠很寬，所以小畫布開到 40px。
 */
function drawHead(g, x, y, tilt = 0) {
  if (!tilt) {
    drawHeadRaw(g, x, y);
    return;
  }
  const S = 40, c = 20;
  const tmp = makeCanvas(S, S);
  const tg = tmp.getContext('2d');
  drawHeadRaw(tg, c, c);
  const src = tg.getImageData(0, 0, S, S).data;
  const pivotX = c - 1, pivotY = c + 5;          // 以頸部為軸心
  const cos = Math.cos(-tilt), sin = Math.sin(-tilt);
  const ox = Math.round(x) - c, oy = Math.round(y) - c;
  for (let dy = 0; dy < S; dy++) {
    for (let dx = 0; dx < S; dx++) {
      const rx = dx - pivotX, ry = dy - pivotY;
      const sx = Math.round(pivotX + rx * cos - ry * sin);
      const sy = Math.round(pivotY + rx * sin + ry * cos);
      if (sx < 0 || sy < 0 || sx >= S || sy >= S) continue;
      const i = (sy * S + sx) * 4;
      if (src[i + 3] < 128) continue;
      g.fillStyle = `rgb(${src[i]},${src[i + 1]},${src[i + 2]})`;
      g.fillRect(ox + dx, oy + dy, 1, 1);
    }
  }
}

/** 側臉朝右、後頸束起的短髮尾、眼罩與舊傷，頭上壓著寬邊斗笠 */
function drawHeadRaw(g, x, y) {
  const W = WANDERER, H = W.hat;
  const hx = Math.round(x), hy = Math.round(y);
  pxPoly(g, pxBand(hx - 5, hy + 1, hx - 9, hy + 9, 4, 2), W.hair);   // 髮尾
  pxPoly(g, [[hx - 5, hy - 4], [hx + 5, hy - 5], [hx + 6, hy - 2], [hx + 7, hy + 1], [hx + 5, hy + 2], [hx + 5, hy + 4], [hx + 2, hy + 6], [hx - 2, hy + 6], [hx - 5, hy + 3]], W.skin);
  pxPoly(g, [[hx - 5, hy + 1], [hx - 1, hy + 5], [hx + 2, hy + 6], [hx - 2, hy + 6], [hx - 5, hy + 3]], W.skinDark);
  pxDot(g, hx - 3, hy - 1, W.skinDark, 2, 3);     // 耳朵
  pxDot(g, hx + 5, hy + 2, W.skinDark);           // 鼻下
  pxDot(g, hx + 3, hy + 4, '#9c6f62', 2, 1);      // 嘴
  // 亂髮，前髮垂到眼睛上方
  pxPoly(g, [[hx - 8, hy - 2], [hx - 6, hy - 8], [hx + 1, hy - 10], [hx + 7, hy - 7], [hx + 8, hy - 3], [hx + 5, hy - 4], [hx + 4, hy - 1], [hx + 2, hy - 4], [hx - 3, hy - 3], [hx - 4, hy + 3], [hx - 8, hy + 2]], W.hair);
  pxDot(g, hx - 4, hy - 8, W.hairLight, 5, 1);
  pxDot(g, hx + 1, hy - 7, W.hairLight, 3, 1);
  // 眼罩遮住看得見的這隻眼，繩子斜繞過頭；眼罩下拖出一道舊傷，下緣透出一點冰藍冷光
  pxPoly(g, pxBand(hx - 5, hy - 5, hx + 5, hy - 2, 1, 1), '#0e0e14');
  pxPoly(g, [[hx + 1, hy - 3], [hx + 5, hy - 3], [hx + 5, hy + 1], [hx + 2, hy + 1]], '#0e0e14');
  pxDot(g, hx + 2, hy - 3, '#3a3446', 2, 1);
  pxDot(g, hx + 1, hy + 2, '#b0766a', 1, 2);
  pxDot(g, hx + 4, hy + 1, PAL.eye);
  // 斗笠：寬邊圓錐，壓得很低；左上受光、帽簷下緣是陰影，竹篾一道道
  pxPoly(g, [[hx - 14, hy - 3], [hx + 1, hy - 13], [hx + 15, hy - 3], [hx + 12, hy - 1], [hx - 11, hy - 1]], H[1]);
  pxPoly(g, [[hx - 12, hy - 3], [hx + 1, hy - 12], [hx - 2, hy - 3]], H[0]);
  pxPoly(g, [[hx - 11, hy - 1], [hx + 12, hy - 1], [hx + 15, hy - 3], [hx + 13, hy]], H[2]);
  for (let i = -9; i <= 10; i += 4) pxDot(g, hx + i, hy - 3 - (10 - Math.abs(i - 1)) * 0.55, H[2], 1, 2);
  pxDot(g, hx + 1, hy - 13, H[3], 2, 1);
  pxDot(g, hx - 3, hy + 2, H[3], 1, 4);           // 繫繩
}

/** 深藍圍巾的兩條尾巴：前條亮、後條暗，隨 scarfT 飄動 */
function drawScarfTails(g, x, y, p) {
  const C = WANDERER.scarf;
  for (let k = 0; k < 2; k++) {
    let px = x, py = y + k * 3;
    for (let i = 1; i <= 7; i++) {
      const wave = Math.sin(p.scarfT * Math.PI * 2 + i * 0.9 + k * 1.4) * i * 0.55;
      const nx = x - i * 4.6 * p.scarfLen, ny = y + k * 3 + i * (1.7 - p.scarfLift) + wave;
      const w = Math.max(2, 6 - i * 0.6 - k);
      pxPoly(g, pxBand(px, py, nx, ny, w + 0.5, Math.max(1.5, w - 0.4)), k ? C.dark : i < 3 ? C.light : C.base);
      if (!k && i < 6) pxDot(g, (px + nx) / 2, (py + ny) / 2 + w / 2 - 1, C.dark);
      px = nx;
      py = ny;
    }
    pxDot(g, px - 2, py, k ? C.dark : C.base, 2, 1);
  }
}

function drawWanderer(g, p, frame = PLAYER_FRAME) {
  const W = WANDERER;
  const hipX = frame.cx + p.hx, hipY = frame.feet - 34 + p.hy;
  const lean = Math.max(-24, Math.min(24, p.lean));
  const sinT = lean / 26, cosT = Math.sqrt(1 - sinT * sinT);
  const shX = hipX + lean, shY = hipY - 26 * cosT + p.torsoDY;
  const headX = shX + sinT * 9 + p.headDX, headY = shY - cosT * 9 + p.headDY;
  const c = Math.cos(p.sword), s = Math.sin(p.sword);
  const handX = shX + 2 + p.hand[0], handY = shY + 4 + p.hand[1];

  if (p.dropSword) drawSword(g, hipX - 30, frame.feet - 2, -1, 0);
  drawScarfTails(g, shX - 3, shY - 1, p);

  const bhx = p.twoHand ? handX - c * 6 : shX - 2 + p.handB[0];
  const bhy = p.twoHand ? handY - s * 6 : shY + 5 + p.handB[1];
  drawArm(g, shX - 2, shY + 5, bhx, bhy, true);

  // 羽織的後襬：垂到大腿中段，隨兩腳張開
  const lf = legJoints(hipX + 2, hipY, p.legF), lb = legJoints(hipX - 2, hipY, p.legB);
  const hem = hipY + 15;
  pxPoly(g, [[hipX - 9, hipY - 6], [hipX + 8, hipY - 6], [Math.min(lf.kx, lb.kx) + 12 + Math.max(0, lean * 0.3), hem], [Math.min(lb.kx, lf.kx) - 8, hem + 1]], W.coat.dark);
  drawLeg(g, hipX - 2, hipY, p.legB, true);

  // 軀幹：肩寬腰窄，左上受光、右下背光，腋下往腰帶兩道衣褶
  const tl = [shX - 8, shY + 2], tr = [shX + 8, shY + 3], br = [hipX + 7, hipY - 1], bl = [hipX - 7, hipY - 1];
  pxPoly(g, [tl, [shX - 3, shY], [shX + 4, shY], tr, [shX + 9, shY + 9], br, bl, [shX - 9, shY + 10]], W.coat.base);
  pxPoly(g, [tl, [shX - 3, shY], [shX - 3, shY + 4], [hipX - 4, hipY - 1], bl, [shX - 9, shY + 10]], W.coat.light);
  pxPoly(g, [[shX + 5, shY + 3], tr, [shX + 9, shY + 9], br, [hipX + 4, hipY - 1]], W.coat.dark);
  for (const [a, b] of [[0.3, -4], [0.55, -1]]) {
    const x0 = shX - 6 + lean * a, y0 = shY + 6 + 18 * a;
    pxPoly(g, pxBand(x0, y0, x0 + 4 + b * 0.3, y0 + 6, 1, 1), W.coat.dark);
  }
  // 交領：內衣的白領從頸口斜到腰帶
  pxPoly(g, [[shX - 1, shY + 1], [shX + 3, shY + 1], [hipX + 4, hipY - 6], [hipX + 1, hipY - 6]], W.inner);
  pxPoly(g, [[shX + 3, shY + 1], [shX + 5, shY + 2], [hipX + 5, hipY - 6], [hipX + 4, hipY - 6]], W.coat.dark);

  // 腰帶、插在左腰斜向後下的刀鞘
  const obX = hipX + lean * 0.15, obY = hipY - 26 * cosT * 0.15 - 4;
  pxPoly(g, [[obX - 9, obY], [obX + 9, obY], [obX + 9, obY + 4], [obX - 9, obY + 4]], W.obi);
  pxDot(g, obX - 9, obY, W.obiLight, 18, 1);
  pxPoly(g, pxBand(obX - 2, obY + 2, obX - 20, obY + 12, 3, 3), W.sheath);
  pxDot(g, obX - 4, obY + 2, PAL.guard, 2, 2);

  // 羽織的前片垂到大腿中段
  const hemF = hipY + 12;
  pxPoly(g, [[hipX - 8, obY + 4], [hipX + 9, obY + 4], [Math.max(lf.kx, hipX + 4) + 3, hemF], [hipX - 6, hemF]], W.coat.base);
  pxPoly(g, [[hipX + 4, obY + 4], [hipX + 9, obY + 4], [Math.max(lf.kx, hipX + 4) + 3, hemF], [hipX + 4, hemF]], W.coat.dark);
  pxDot(g, hipX - 6, hemF - 1, W.coat.dark, 10, 1);

  drawLeg(g, hipX + 2, hipY, p.legF, false);
  drawHead(g, headX, headY, p.headTilt);

  // 圍巾在頸部的那一圈、羽織的肩線
  pxPoly(g, [[shX - 7, shY - 4], [shX + 6, shY - 5], [shX + 7, shY + 2], [shX - 6, shY + 2]], W.scarf.base);
  pxPoly(g, [[shX - 7, shY - 4], [shX + 6, shY - 5], [shX + 6, shY - 3], [shX - 7, shY - 2]], W.scarf.light);
  pxDot(g, shX - 6, shY + 1, W.scarf.dark, 12, 1);
  pxPoly(g, [[shX - 2, shY + 1], [shX + 6, shY + 1], [shX + 8, shY + 7], [shX - 1, shY + 7]], W.coat.base);
  pxDot(g, shX - 1, shY + 2, W.coat.light, 6, 1);

  if (!p.dropSword) drawSword(g, handX, handY, c, s);
  drawArm(g, shX + 2, shY + 4, handX, handY, false);
}

/* ------------------------------------------------------------------ */
/* 敵人：森林妖怪（Forest Spirit）                                      */
/* ------------------------------------------------------------------ */

const SPIRIT_ANIMS = {
  walk: { row: 0, frames: 4, fps: 6, loop: true },
  hurt: { row: 1, frames: 1, fps: 1, loop: false }
};

function drawSpirit(g, name, f) {
  const hurt = name === 'hurt';
  const bob = hurt ? -1 : [0, -1, 0, 1][f];
  const cx = 24, cy = 30 + bob;
  // 樹根腳
  const legs = [-8, -3, 3, 8];
  legs.forEach((lx, i) => {
    const lift = !hurt && ((i + f) % 2 === 0) ? 2 : 0;
    Px.rect(g, cx + lx - 1, cy + 10, 3, 6 - lift - bob, '#2a3a24');
  });
  // 苔蘚身體
  Px.circle(g, cx, cy, 13, '#2d4a33');
  Px.circle(g, cx - 2, cy - 2, 10, '#3c6142');
  const r = mulberry32(77);
  for (let i = 0; i < 12; i++) {
    const a = r() * Math.PI * 2, d = r() * 10;
    Px.rect(g, cx - 2 + Math.cos(a) * d, cy - 2 + Math.sin(a) * d, 2, 1, i % 3 ? '#5a8a55' : '#24402b');
  }
  // 木製面具
  Px.circle(g, cx + 4, cy + 1, 7, '#a88b63');
  Px.rect(g, cx - 1, cy - 4, 8, 1, '#c4a77c');
  Px.rect(g, cx + 1, cy - 2, 4, 4, '#3a2a1c');
  Px.rect(g, cx + 6, cy - 2, 4, 4, '#3a2a1c');
  const eye = hurt ? '#ffffff' : '#ffc850';
  Px.rect(g, cx + 2, cy - 1, 2, 2, eye);
  Px.rect(g, cx + 7, cy - 1, 2, 2, eye);
  Px.rect(g, cx + 3, cy + 4, hurt ? 5 : 4, hurt ? 2 : 1, '#3a2a1c');
  // 頭頂嫩芽
  Px.line(g, cx - 2, cy - 12, cx - 6, cy - 18, 2, '#5f9c5a');
  Px.rect(g, cx - 9, cy - 20, 4, 3, '#78b56f');
  Px.line(g, cx + 3, cy - 12, cx + 6, cy - 17, 2, '#5f9c5a');
  Px.rect(g, cx + 5, cy - 20, 4, 3, '#8fc785');
}

/* ------------------------------------------------------------------ */
/* 圖塊                                                                */
/* ------------------------------------------------------------------ */

// mask bits：1 = 上方外露，2 = 左側外露，4 = 右側外露
function drawFrostTop(g, r, mask, thick) {
  Px.rect(g, 0, 0, 32, thick, '#34503f');
  Px.rect(g, 0, thick - 2, 32, 2, '#2a4034');
  for (let x = 0; x < 32; x += 2) Px.rect(g, x, thick, 2, r() * 4 | 0, '#24382e');
  Px.rect(g, 0, 0, 32, 2, '#d4e0e8');
  for (let x = 0; x < 32; x++) if (r() < 0.5) Px.rect(g, x, 2, 1, 1 + (r() * 2 | 0), PAL.frost);
  for (let i = 0; i < 4; i++) Px.rect(g, r() * 30 | 0, 3 + (r() * 3 | 0), 2, 1, '#4a6b55');
  if (mask & 2) { Px.rect(g, 0, 0, 2, thick + 2, '#2a4034'); Px.rect(g, 0, 0, 3, 2, '#eef4f8'); }
  if (mask & 4) { Px.rect(g, 30, 0, 2, thick + 2, '#2a4034'); Px.rect(g, 29, 0, 3, 2, '#eef4f8'); }
}

function drawGroundTile(g, mask, v) {
  const r = mulberry32(1000 + v * 97 + mask * 13);
  Px.rect(g, 0, 0, 32, 32, '#2b2532');
  for (let i = 0; i < 18; i++) Px.rect(g, r() * 32 | 0, r() * 32 | 0, 2, 1, '#372f40');
  for (let i = 0; i < 10; i++) Px.rect(g, r() * 32 | 0, r() * 32 | 0, 1, 1, '#1f1a26');
  for (let i = 0; i < 2; i++) {
    const x = 4 + r() * 22 | 0, y = (mask & 1 ? 12 : 4) + r() * 14 | 0, w = 3 + r() * 4 | 0;
    Px.rect(g, x, y, w, 3, '#423d4e');
    Px.rect(g, x + 1, y, w - 2, 1, '#585369');
  }
  if (mask & 2) Px.rect(g, 0, 0, 2, 32, '#1a1620');
  if (mask & 4) Px.rect(g, 30, 0, 2, 32, '#1a1620');
  if (mask & 1) drawFrostTop(g, r, mask, 8);
}

function drawStoneTile(g, mask, v) {
  const r = mulberry32(5000 + v * 31 + mask * 7);
  Px.rect(g, 0, 0, 32, 32, '#2a2e3c');
  for (let row = 0; row < 4; row++) {
    const off = (row % 2) * 8 + (v % 2) * 4;
    for (let bx = -16; bx < 32; bx += 16) {
      const x = bx + off;
      const shade = ['#444a5e', '#4b5268', '#3f4558'][r() * 3 | 0];
      Px.rect(g, x + 1, row * 8 + 1, 14, 6, shade);
      Px.rect(g, x + 1, row * 8 + 1, 14, 1, '#5a627a');
    }
  }
  for (let i = 0; i < 2; i++) Px.rect(g, r() * 28 | 0, 8 + r() * 22 | 0, 3 + (r() * 3 | 0), 2, '#34503f');
  if (mask & 2) Px.rect(g, 0, 0, 2, 32, '#20232e');
  if (mask & 4) Px.rect(g, 30, 0, 2, 32, '#20232e');
  if (mask & 1) drawFrostTop(g, r, mask, 5);
}

/** 冰壁：半透明感的淡藍冰塊，帶裂紋與高光 */
function drawIceTile(g, mask, v) {
  const r = mulberry32(7000 + v * 13 + mask);
  Px.rect(g, 0, 0, 32, 32, '#6aa8cf');
  Px.rect(g, 2, 2, 28, 28, '#8cc4e4');
  Px.rect(g, 4, 4, 10, 22, '#a8d8f0');
  Px.line(g, 6, 6, 12, 2, 1, '#e6f7ff');
  Px.line(g, 5, 12, 9, 8, 1, '#e6f7ff');
  let x = 10 + r() * 12, y = 4;
  while (y < 28) {
    const nx = x + (r() - 0.5) * 10, ny = y + 4 + r() * 5;
    Px.line(g, x, y, nx, ny, 1, '#4a86b0');
    x = nx; y = ny;
  }
  Px.rect(g, 22 + (r() * 4 | 0), 18, 3, 3, '#d4eefa');
  if (mask & 1) { Px.rect(g, 0, 0, 32, 3, PAL.snow); Px.rect(g, 0, 0, 32, 1, '#ffffff'); }
  if (mask & 2) Px.rect(g, 0, 0, 2, 32, '#3f7aa3');
  if (mask & 4) Px.rect(g, 30, 0, 2, 32, '#3f7aa3');
}

/** 石門：深色木柵，鐵箍補強 */
function drawGateTile(g, mask) {
  Px.rect(g, 0, 0, 32, 32, '#1c1a22');
  for (let x = 2; x < 32; x += 8) {
    Px.rect(g, x, 0, 5, 32, '#4a3a2c');
    Px.rect(g, x, 0, 1, 32, '#6a5440');
  }
  Px.rect(g, 0, 6, 32, 3, '#5a6074');
  Px.rect(g, 0, 22, 32, 3, '#5a6074');
  Px.rect(g, 0, 6, 32, 1, '#7d849a');
  Px.rect(g, 0, 22, 32, 1, '#7d849a');
  for (let x = 4; x < 32; x += 8) { Px.rect(g, x, 7, 1, 1, '#c3ccd8'); Px.rect(g, x, 23, 1, 1, '#c3ccd8'); }
  if (mask & 1) Px.rect(g, 0, 0, 32, 2, PAL.snow);
}

function drawPlatformTile(g, mask, v) {
  const r = mulberry32(9000 + v);
  Px.rect(g, 0, 0, 32, 9, '#6a4a34');
  Px.rect(g, 0, 0, 32, 2, '#8c6748');
  Px.rect(g, 0, 7, 32, 2, '#3d2a1f');
  Px.rect(g, 4 + r() * 10 | 0, 4, 8, 1, '#56392a');
  Px.rect(g, 16 + r() * 8 | 0, 5, 6, 1, '#56392a');
  Px.rect(g, 3, 3, 2, 2, '#2a1d16');
  Px.rect(g, 27, 3, 2, 2, '#2a1d16');
  for (let x = 0; x < 32; x++) if (r() < 0.35) Px.rect(g, x, 0, 1, 1, PAL.snow);
  Px.rect(g, 13, 9, 6, 3, '#3d2a1f');
  if (mask & 2) { Px.rect(g, 1, 9, 2, 6, '#8a7a5a'); Px.rect(g, 0, 0, 1, 9, '#3d2a1f'); }
  if (mask & 4) { Px.rect(g, 29, 9, 2, 6, '#8a7a5a'); Px.rect(g, 31, 0, 1, 9, '#3d2a1f'); }
}

function drawSpikeTile(g) {
  Px.rect(g, 0, 28, 32, 4, '#2a2b36');
  Px.rect(g, 0, 28, 32, 1, '#3d3f4e');
  for (let i = 0; i < 3; i++) {
    const cx = 5.5 + i * 10.5;
    for (let y = 12; y < 28; y++) {
      const w = Math.max(1, Math.round((y - 12) / 16 * 9));
      const x = Math.round(cx - w / 2);
      Px.rect(g, x, y, w, 1, '#7d889c');
      Px.rect(g, x, y, Math.ceil(w / 2), 1, '#c3ccd8');
    }
    Px.rect(g, Math.round(cx) - 1, 12, 1, 2, '#eef3f7');
  }
}

/** 過去的木橋：與木板相同的造型，覆上一層淡紫的殘影色，橋下垂著繩索 */
function drawPastTile(g, mask, v) {
  drawPlatformTile(g, mask, v);
  for (let x = 0; x < 32; x++) Px.rect(g, x, 11 + Math.round(Math.sin((x + v * 8) / 32 * Math.PI) * 3), 1, 1, '#8c7a5a');
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(190,170,255,0.55)';
  g.fillRect(0, 0, 32, 32);
  g.globalCompositeOperation = 'source-over';
  Px.rect(g, 0, 0, 32, 1, '#f3eeff');
}

/** 現在的世界：崩塌木橋留在橋頭的殘骸（dir = -1 左橋頭、1 右橋頭） */
function drawPastRuin(g, dir) {
  const flip = (x, w) => (dir < 0 ? x : 32 - x - w);
  // 斷裂下垂的木板
  for (let i = 0; i < 4; i++) {
    const x = 1 + i * 4;
    Px.rect(g, flip(x, 4), i * 2, 4, 6, i % 2 ? '#56392a' : '#6a4a34');
    Px.rect(g, flip(x, 4), i * 2, 4, 1, '#8c6748');
  }
  Px.rect(g, flip(15, 2), 8, 2, 3, '#3d2a1f');
  // 斷掉的繩索
  Px.line(g, flip(1, 1), 9, flip(4, 1), 22, 1, '#8a7a5a');
  Px.line(g, flip(8, 1), 12, flip(9, 1), 27, 1, '#7a6a4c');
  Px.rect(g, flip(0, 2), 0, 2, 10, '#3d2a1f');
}

/* ------------------------------------------------------------------ */
/* 場景道具                                                            */
/* ------------------------------------------------------------------ */

function drawLantern(g, lit) {
  const stone = '#5a6074', dark = '#3d4253', light = '#767d93';
  Px.rect(g, 4, 42, 18, 6, dark);
  Px.rect(g, 5, 41, 16, 2, stone);
  Px.rect(g, 10, 28, 6, 14, stone);
  Px.rect(g, 10, 28, 2, 14, light);
  Px.rect(g, 5, 24, 16, 4, stone);
  Px.rect(g, 5, 24, 16, 1, light);
  Px.rect(g, 7, 13, 12, 11, stone);
  Px.rect(g, 9, 15, 8, 7, lit ? '#ffd27a' : '#161924');
  if (lit) Px.rect(g, 11, 16, 4, 5, '#fff2c4');
  Px.rect(g, 1, 10, 24, 3, dark);
  Px.rect(g, 4, 7, 18, 3, stone);
  Px.rect(g, 8, 5, 10, 2, stone);
  Px.rect(g, 11, 1, 4, 4, stone);
  Px.rect(g, 2, 9, 22, 1, PAL.snow);
  Px.rect(g, 5, 6, 16, 1, PAL.snow);
  Px.rect(g, 11, 1, 4, 1, PAL.snow);
}

function drawSign(g) {
  Px.rect(g, 12, 12, 4, 24, '#4a3426');
  Px.rect(g, 2, 4, 24, 12, '#7a5a3c');
  Px.rect(g, 2, 4, 24, 2, '#93704d');
  Px.rect(g, 2, 14, 24, 2, '#5a3f2a');
  Px.rect(g, 6, 8, 10, 1, '#4a3426');
  Px.rect(g, 8, 11, 13, 1, '#4a3426');
  Px.rect(g, 2, 3, 24, 1, PAL.snow);
}

function drawJizo(g) {
  Px.rect(g, 2, 24, 16, 4, '#5a6074');
  Px.rect(g, 5, 11, 10, 14, '#7c8293');
  Px.rect(g, 5, 11, 3, 14, '#8f95a6');
  Px.circle(g, 10, 7, 5, '#8b91a2');
  Px.rect(g, 7, 7, 2, 1, '#4d5262');
  Px.rect(g, 11, 7, 2, 1, '#4d5262');
  Px.rect(g, 4, 12, 12, 6, '#8d2a2a');
  Px.rect(g, 5, 17, 10, 2, '#6b1f1f');
  Px.rect(g, 6, 2, 8, 2, PAL.snow);
  Px.rect(g, 3, 23, 14, 1, PAL.snow);
}

function drawRock(g) {
  Px.circle(g, 22, 24, 17, '#434858');
  Px.circle(g, 18, 22, 11, '#525869');
  Px.rect(g, 12, 9, 6, 2, '#666d80');
  Px.rect(g, 15, 7, 14, 2, PAL.snow);
  Px.rect(g, 10, 9, 6, 1, PAL.frost);
}

function drawPine(g, v) {
  const r = mulberry32(300 + v * 17);
  const cx = 42;
  Px.rect(g, cx - 3, 70, 7, 130, '#1b1a22');
  Px.rect(g, cx - 3, 70, 2, 130, '#26242e');
  for (let i = 0; i < 7; i++) {
    const ty = 14 + i * 22;
    const half = 9 + i * 4.6;
    for (let y = 0; y < 26; y++) {
      const w = half * (y / 26) + 2;
      const jitter = (r() - 0.5) * 2;
      Px.rect(g, cx - w + jitter, ty + y, w * 2, 1, y < 3 ? '#1f2d44' : '#152030');
    }
    for (let k = 0; k < 6; k++) {
      const sx = cx + (r() - 0.5) * half * 1.4;
      const sy = ty + 4 + r() * 6;
      Px.rect(g, sx, sy, 3, 1, '#a9bccb');
    }
  }
  Px.rect(g, cx - 1, 6, 2, 10, '#152030');
  Px.rect(g, cx - 1, 6, 2, 2, PAL.snow);
}

function drawTorii(g) {
  const red = '#8b2f2a', redDark = '#5e1d1b', redLight = '#a8443a', black = '#1c1416';
  const r = mulberry32(42);
  for (const x of [24, 116]) {
    Px.rect(g, x, 30, 10, 110, red);
    Px.rect(g, x, 30, 3, 110, redLight);
    Px.rect(g, x + 7, 30, 3, 110, redDark);
    for (let i = 0; i < 6; i++) Px.rect(g, x + 1 + r() * 7, 60 + r() * 60, 2, 3 + r() * 6, redDark);
    Px.rect(g, x - 2, 128, 14, 12, black);
  }
  Px.rect(g, 12, 46, 126, 8, red);
  Px.rect(g, 12, 52, 126, 2, redDark);
  Px.rect(g, 68, 30, 14, 16, black);
  Px.rect(g, 70, 32, 10, 12, '#3a2a20');
  Px.rect(g, 6, 24, 138, 7, red);
  Px.rect(g, 6, 29, 138, 2, redDark);
  Px.rect(g, 0, 14, 150, 10, black);
  Px.rect(g, 0, 10, 10, 6, black);
  Px.rect(g, 140, 10, 10, 6, black);
  Px.rect(g, 2, 12, 146, 2, PAL.snow);
  Px.rect(g, 0, 9, 8, 1, PAL.snow);
  Px.rect(g, 142, 9, 8, 1, PAL.snow);
  Px.rect(g, 12, 45, 126, 1, PAL.snow);
}

function drawShrine(g) {
  const wood = '#3a2a22', woodDark = '#261b16', paper = '#9d9073', paperLit = '#e8d39a';
  const roof = '#2b303d', roofLight = '#3c4354', stone = '#4b5164';
  const r = mulberry32(7);
  Px.rect(g, 0, 108, 176, 16, stone);
  Px.rect(g, 0, 108, 176, 2, '#6a7088');
  Px.rect(g, 62, 102, 52, 6, stone);
  Px.rect(g, 62, 102, 52, 1, '#6a7088');
  Px.rect(g, 20, 58, 136, 44, wood);
  Px.rect(g, 28, 64, 30, 38, paper);
  Px.rect(g, 66, 64, 44, 38, paperLit);
  Px.rect(g, 118, 64, 30, 38, paper);
  for (let x = 28; x < 148; x += 7) Px.rect(g, x, 64, 1, 38, woodDark);
  for (let y = 64; y < 102; y += 8) Px.rect(g, 28, y, 120, 1, woodDark);
  for (const x of [20, 60, 110, 150]) Px.rect(g, x, 58, 6, 44, woodDark);
  // 注連繩與紙垂
  Px.rect(g, 24, 58, 128, 5, '#c9b27a');
  for (let x = 26; x < 150; x += 4) Px.rect(g, x, 59, 2, 1, '#8f7a48');
  for (const x of [48, 87, 126]) {
    Px.rect(g, x, 63, 3, 3, '#f2f2f2');
    Px.rect(g, x + 2, 66, 3, 3, '#f2f2f2');
    Px.rect(g, x, 69, 3, 3, '#f2f2f2');
  }
  Px.rect(g, 87, 63, 2, 8, '#c9b27a');
  Px.circle(g, 88, 74, 3, '#c8a24a');
  // 屋頂
  for (let y = 22; y < 56; y++) {
    const t = (y - 22) / 34;
    const half = 50 + t * 38;
    Px.rect(g, 88 - half, y, half * 2, 1, y % 4 === 0 ? roofLight : roof);
  }
  Px.rect(g, 0, 54, 176, 5, woodDark);
  Px.rect(g, 30, 16, 116, 6, roof);
  Px.rect(g, 24, 10, 8, 8, roof);
  Px.rect(g, 144, 10, 8, 8, roof);
  Px.rect(g, 30, 14, 116, 3, PAL.snow);
  Px.rect(g, 24, 9, 8, 2, PAL.snow);
  Px.rect(g, 144, 9, 8, 2, PAL.snow);
  for (let i = 0; i < 40; i++) {
    const y = 22 + r() * 30;
    const half = 50 + (y - 22) / 34 * 38;
    Px.rect(g, 88 + (r() - 0.5) * half * 2, y, 4 + r() * 6, 1, PAL.snow);
  }
}

function drawTuft(g, v) {
  const r = mulberry32(600 + v);
  for (let i = 0; i < 7; i++) {
    const x = r() * 30 | 0, h = 3 + (r() * 6 | 0);
    Px.rect(g, x, 10 - h, 1, h, i % 2 ? '#3f5e52' : '#4d6f5f');
    Px.rect(g, x, 10 - h, 1, 1, '#c8d8e2');
  }
}

/* ------------------------------------------------------------------ */
/* 可擊破的物件                                                        */
/* ------------------------------------------------------------------ */

function drawPot(g) {
  // 陶罐：圓肚、細頸，腰間繫著草繩，罐口積了一點雪
  const dark = '#5e3022', body = '#8a4a32', mid = '#a85d3c', light = '#c8784e';
  Px.circle(g, 11, 16, 9, body);
  Px.circle(g, 10, 15, 7, mid);
  Px.rect(g, 6, 10, 3, 6, light);
  Px.rect(g, 5, 24, 12, 2, dark);
  Px.rect(g, 7, 4, 8, 5, body);
  Px.rect(g, 8, 4, 3, 5, mid);
  Px.rect(g, 5, 2, 12, 3, mid);
  Px.rect(g, 5, 2, 12, 1, light);
  Px.rect(g, 3, 13, 16, 2, '#b89a5c');
  Px.rect(g, 3, 14, 16, 1, '#8a7040');
  Px.rect(g, 15, 15, 2, 4, '#b89a5c');
  Px.rect(g, 14, 18, 4, 4, dark);
  Px.rect(g, 6, 1, 9, 2, PAL.snow);
  Px.rect(g, 7, 0, 5, 1, '#ffffff');
}

function drawSnowPile(g, w, h) {
  // 雪堆：中間高、兩側低的雪丘，底部帶陰影，露出一截枯枝
  const cx = w / 2;
  for (let x = 0; x < w; x++) {
    const k = 1 - Math.pow((x + 0.5 - cx) / cx, 2);
    const top = Math.round(h - Math.max(2, h * Math.sqrt(Math.max(0, k))));
    Px.rect(g, x, top, 1, h - top, PAL.snow);
    Px.rect(g, x, top, 1, 1, '#ffffff');
    Px.rect(g, x, h - 3, 1, 3, PAL.frost);
    if (x > cx) Px.rect(g, x, top + 2, 1, Math.max(1, (h - top) - 5), '#cbd8e3');
  }
  Px.line(g, w * 0.3, h * 0.35, w * 0.18, h * 0.05, 1, '#4a3a2c');
  Px.rect(g, Math.round(w * 0.2), Math.round(h * 0.15), 2, 1, '#4a3a2c');
  Px.rect(g, Math.round(w * 0.62), h - 6, 3, 2, '#7d889c');
}

function drawWindBell(g) {
  // 風鈴：青銅鈴身，下方垂著紙垂（shide）
  Px.rect(g, 6, 0, 4, 3, '#8a6a3a');
  Px.rect(g, 7, 1, 2, 1, '#2a1d16');
  Px.circle(g, 8, 8, 5, '#b48d45');
  Px.rect(g, 3, 8, 11, 4, '#b48d45');
  Px.rect(g, 4, 5, 3, 5, '#e3c98e');
  Px.rect(g, 2, 12, 13, 2, '#8a6a3a');
  Px.rect(g, 7, 14, 2, 2, '#5a4a3a');
  // 紙垂
  for (const [x, d] of [[1, 1], [14, -1]]) {
    for (let i = 0; i < 4; i++) Px.rect(g, x + (i % 2) * d, 13 + i * 3, 2, 3, i % 2 ? '#dfe9f0' : '#ffffff');
  }
}

function drawBellRope(g) {
  // 鈴緒：紅白交織的粗繩，末端是流蘇
  for (let y = 0; y < 18; y++) Px.rect(g, 3, y, 6, 1, (y >> 1) % 2 ? '#c94a3a' : '#f6efdc');
  Px.rect(g, 2, 18, 8, 3, '#b48d45');
  for (let x = 2; x < 10; x += 2) Px.rect(g, x, 21, 1, 6 + (x % 4 ? 1 : 0), '#c94a3a');
}

function drawWindKnot(g) {
  // 蒼風之結：打成結的藍色繩結，兩端飄著短穗
  Px.circle(g, 9, 8, 6, '#3563b0');
  Px.circle(g, 9, 8, 3, '#0a0d17');
  Px.circle(g, 17, 8, 6, '#3563b0');
  Px.circle(g, 17, 8, 3, '#0a0d17');
  Px.rect(g, 11, 6, 4, 6, '#1f3d78');
  Px.rect(g, 12, 7, 2, 3, '#7fa6e6');
  Px.line(g, 12, 12, 8, 21, 2, '#3563b0');
  Px.line(g, 14, 12, 19, 21, 2, '#3563b0');
  Px.rect(g, 6, 4, 3, 1, '#9fc3ff');
  Px.rect(g, 16, 4, 3, 1, '#9fc3ff');
}

function drawSoul(g) {
  // 魂火：小小的藍色火焰，靠近可恢復 1 點生命
  Px.template(g, [
    '..o..',
    '.oLo.',
    '.oLBo',
    'oBWBo',
    'oBWBo',
    '.ooo.'
  ], { o: '#1c3c78', L: '#bff1ff', B: '#4fb3ff', W: '#ffffff' }, 1, 1, 2);
}

/* ------------------------------------------------------------------ */
/* 能力道具                                                            */
/* ------------------------------------------------------------------ */

function drawFeather(g) {
  // 天狗之羽：斜放的白色羽毛
  const x0 = 6, y0 = 22, x1 = 17, y1 = 3;
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    const vane = Math.sin(t * Math.PI) * 6 * (t > 0.15 ? 1 : 0);
    Px.line(g, x, y, x - vane * 0.85, y - vane * 0.5, 2, i % 3 ? '#cfe9ff' : '#8fcaf5');
    Px.line(g, x, y, x + vane * 0.85, y + vane * 0.5, 2, i % 3 ? '#eef8ff' : '#bfe0fa');
  }
  Px.line(g, x0 - 2, y0 + 2, x1, y1, 1, '#ffffff');
}

function drawVessel(g) {
  // 魂之器：藍色魂火
  Px.template(g, [
    '...o...',
    '..oLo..',
    '..oLLo.',
    '.oLBLo.',
    '.oBBBLo',
    'oBBWBBo',
    'oBWWWBo',
    'oBBWBBo',
    '.ooooo.'
  ], { o: '#0a0d17', L: '#bff1ff', B: '#4fb3ff', W: '#ffffff' }, 2, 2, 2);
}

function drawSandal(g) {
  // 疾風之履：纏著青色風紋的草鞋
  Px.rect(g, 0, 7, 7, 1, '#8fcaf5');
  Px.rect(g, 2, 11, 6, 1, '#bfe6ff');
  Px.rect(g, 0, 15, 5, 1, '#8fcaf5');
  Px.rect(g, 8, 6, 16, 12, '#c9a86a');
  Px.rect(g, 9, 5, 14, 1, '#c9a86a');
  Px.rect(g, 9, 18, 14, 1, '#a88848');
  for (let y = 8; y < 17; y += 3) Px.rect(g, 10, y, 12, 1, '#a88848');
  Px.rect(g, 8, 6, 1, 12, '#e3c98e');
  Px.line(g, 12, 9, 20, 15, 2, '#2f5ba8');
  Px.line(g, 20, 9, 12, 15, 2, '#2f5ba8');
  Px.rect(g, 15, 11, 2, 2, '#bfe6ff');
}

function drawScroll(g) {
  // 居合之卷：繫著紅繩的卷軸
  Px.rect(g, 3, 6, 20, 10, '#e6dcc0');
  Px.rect(g, 3, 6, 20, 2, '#f6efdc');
  Px.rect(g, 3, 14, 20, 2, '#c9bc98');
  for (let x = 6; x < 21; x += 3) Px.rect(g, x, 9, 1, 3, '#5a4a3a');
  Px.rect(g, 1, 4, 3, 14, '#6a4a34');
  Px.rect(g, 22, 4, 3, 14, '#6a4a34');
  Px.rect(g, 1, 4, 3, 1, '#8c6748');
  Px.rect(g, 22, 4, 3, 1, '#8c6748');
  Px.rect(g, 12, 5, 3, 12, '#9c2b2b');
  Px.rect(g, 13, 17, 2, 4, '#9c2b2b');
  Px.rect(g, 15, 18, 2, 3, '#7a1f1f');
}

function drawEye(g) {
  // 殘影之眼：獨眼劍客失去的另一隻眼所化成的眼紋
  Px.template(g, [
    '....ooooo....',
    '..ooLLLLLoo..',
    '.oLLBBBBBLLo.',
    'oLLBBWDDBBLLo',
    'oLBBDDKDDBBLo',
    'oLLBBDDDBBLLo',
    '.oLLBBBBBLLo.',
    '..ooLLLLLoo..',
    '....ooooo....'
  ], { o: '#5a4a8a', L: '#eee8ff', B: '#9a86ff', D: '#4a3a9a', K: '#0a0d17', W: '#ffffff' }, 0, 3, 2);
  for (const [x, y, w, h] of [[12, 0, 2, 2], [4, 1, 2, 2], [20, 1, 2, 2], [12, 21, 2, 1]]) Px.rect(g, x, y, w, h, '#d9c8ff');
}

/* ------------------------------------------------------------------ */

const Sprites = {
  built: false,

  build() {
    if (this.built) return;

    this.player = buildSheet({
      frameWidth: PLAYER_FRAME.width, frameHeight: PLAYER_FRAME.height,
      anchorX: PLAYER_FRAME.cx, anchorY: PLAYER_FRAME.feet,
      animations: PLAYER_ANIMS,
      drawFrame: (g, name, f, n) => drawWanderer(g, playerPose(name, f, n))
    });

    // pixelfx 招式（三連擊、旋風斬、衝刺斬）：較大的畫格，Animator 會自動切換到這張 sheet
    this.playerCombo = Object.keys(SWORD_MOVE_ANIMS).length ? buildSheet({
      frameWidth: COMBO_FRAME.width, frameHeight: COMBO_FRAME.height,
      anchorX: COMBO_FRAME.cx, anchorY: COMBO_FRAME.feet,
      animations: COMBO_SHEET_ANIMS,
      drawFrame: drawMoveFrame
    }) : null;

    this.spirit = buildSheet({
      frameWidth: 48, frameHeight: 48, anchorX: 24, anchorY: 46,
      animations: SPIRIT_ANIMS,
      drawFrame: (g, name, f) => drawSpirit(g, name, f)
    });

    const prop = (w, h, draw, sink = 0) => ({ image: outlined(w, h, draw), sink });
    this.props = {
      lantern: prop(26, 48, (g) => drawLantern(g, false)),
      lanternLit: prop(26, 48, (g) => drawLantern(g, true)),
      sign: prop(28, 36, drawSign),
      jizo: prop(20, 28, drawJizo),
      rock: prop(44, 24, drawRock, 2),
      pine: prop(84, 200, (g) => drawPine(g, 0), 6),
      pine2: prop(84, 200, (g) => drawPine(g, 1), 6),
      torii: prop(150, 140, drawTorii),
      shrine: prop(176, 124, drawShrine)
    };

    this.tufts = [0, 1, 2].map((v) => {
      const c = makeCanvas(32, 10);
      drawTuft(c.getContext('2d'), v);
      return c;
    });

    this.pickups = {
      dash: outlined(26, 22, drawSandal),
      doubleJump: outlined(24, 26, drawFeather),
      heartUp: outlined(18, 22, drawVessel),
      chargeSlash: outlined(26, 22, drawScroll),
      vision: outlined(26, 22, drawEye),
      scarf: outlined(26, 23, drawWindKnot)
    };
    const breakable = (w, h, draw) => {
      const image = outlined(w, h, draw);
      return { image, flash: tintCanvas(image, '#ffffff') };
    };
    this.breakables = {
      pot: breakable(22, 27, drawPot),
      snow: breakable(42, 22, (g) => drawSnowPile(g, 42, 22)),
      snowSmall: breakable(32, 13, (g) => drawSnowPile(g, 32, 13))
    };
    this.soul = outlined(12, 14, drawSoul);
    this.anchors = {
      hook: outlined(17, 26, drawWindBell),
      lever: outlined(12, 28, drawBellRope)
    };

    this._ruins = {
      [-1]: (() => { const c = makeCanvas(32, 32); drawPastRuin(c.getContext('2d'), -1); return c; })(),
      1: (() => { const c = makeCanvas(32, 32); drawPastRuin(c.getContext('2d'), 1); return c; })()
    };

    this._tileCache = new Map();
    this.built = true;
  },

  pastRuin(dir) {
    return this._ruins[dir];
  },

  tile(type, mask, variant) {
    const key = `${type}:${mask}:${variant}`;
    let c = this._tileCache.get(key);
    if (c) return c;
    c = makeCanvas(32, 32);
    const g = c.getContext('2d');
    switch (type) {
      case TILE.GROUND: drawGroundTile(g, mask, variant); break;
      case TILE.STONE: drawStoneTile(g, mask, variant); break;
      case TILE.PLATFORM: drawPlatformTile(g, mask, variant); break;
      case TILE.SPIKE: drawSpikeTile(g); break;
      case TILE.PAST: drawPastTile(g, mask, variant); break;
      case TILE.ICE: drawIceTile(g, mask, variant); break;
      case TILE.GATE: drawGateTile(g, mask); break;
      default: break;
    }
    this._tileCache.set(key, c);
    return c;
  }
};
