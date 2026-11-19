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
  chargeSlash: { row: 11, frames: 4, fps: 1 / 0.08, loop: false },
  attack2: { row: 12, frames: 5, fps: 1 / 0.06, loop: false },
  attack3: { row: 13, frames: 6, fps: 1 / 0.065, loop: false },
  scarf: { row: 14, frames: 2, fps: 10, loop: true },
  spiral: { row: 15, frames: 4, fps: 1 / 0.045, loop: true }
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

    case 'chargeSlash': {
      // 蓄力斬：向前突進，刀身平舉斬出
      const frames = [
        { lean: 10, hy: 6, hand: [16, 2], sword: 0.0 },
        { lean: 10, hy: 6, hand: [17, 5], sword: 0.12 },
        { lean: 7, hy: 5, hand: [14, 11], sword: 0.55 },
        { lean: 4, hy: 3, hand: [9, 14], sword: 0.7 }
      ];
      return {
        ...base, legF: { a: 1.0, b: 0.6 }, legB: { a: -0.95, b: 0.2 },
        twoHand: f < 2, scarfLift: 0.1, scarfLen: 1.45, ...frames[f]
      };
    }

    case 'spiral': {
      // 螺旋斬：收腿旋身，刀依序掃過身前、正面、身後、背面
      const frames = [
        { lean: 3, hand: [17, 4], sword: 0.0 },
        { lean: 0, hand: [6, 10], sword: 1.45, handB: [-6, 4] },
        { lean: -3, hand: [-14, 4], sword: 3.14, handB: [8, 6] },
        { lean: 0, hand: [0, 0], sword: -1.6, handB: [-8, 6] }
      ];
      return {
        ...base, hy: -2, legF: { a: 0.7, b: 1.2 }, legB: { a: -0.05, b: 0.95 },
        scarfLift: f % 2 ? -0.6 : 1.0, scarfLen: 1.3, scarfT: f / n, ...frames[f]
      };
    }

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

/* ---------------- 三連擊：pixelfx 的姿勢轉套到劍客身上 ---------------- */

/**
 * pixelfx 的姿勢只說「手、腳該在哪裡、刀的角度、蹲低與前傾」（data/swordcombo.js），
 * 單位是它約 38px 高的假人，腳底為原點、y 往上為負。劍客約 80px，所以座標放大 COMBO_SCALE 倍；
 * 刀的角度兩邊定義相同（畫面座標，0 = 朝前）。腳用兩段式 IK 算出大腿與小腿的角度。
 * 刀與手舉起時會超出一般的畫格，所以三連擊另用較大的 COMBO_FRAME。
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
  const K = COMBO_SCALE;
  const ox = q.x * K, oy = q.y * K;                  // 整個人的位移（pixelfx 的 x、y）
  const hx = ox, hy = q.crouch * K + oy;
  const lean = Math.max(-24, Math.min(24, q.lean * K));
  const sinT = lean / 26, cosT = Math.sqrt(1 - sinT * sinT);
  const hipY = -34 + hy, shX = hx + lean, shY = hipY - 26 * cosT;
  // 腳離地的高度：pixelfx 站姿的腳踝在 -4，沒寫就是踩在地上
  const lift = (v) => (v ? Math.min(0, v + 4) * K : 0);
  return {
    hx, hy, lean, torsoDY: 0, headDX: 0, headDY: 0, headTilt: 0,
    hand: [ox + q.fx * K - (shX + 2), oy + q.fy * K - (shY + 4)],
    handB: [ox + q.bx * K - (shX - 2), oy + q.by * K - (shY + 5)],
    twoHand: !!q.two, sword: q.sa, dropSword: false,
    legF: legTo(ox + q.ffx * K - (hx + 2), oy + lift(q.ffy) - hipY),
    legB: legTo(ox + q.fbx * K - (hx - 2), oy + lift(q.fby) - hipY),
    scarfT: f / n, scarfLift: 0.4, scarfLen: 1.3
  };
}

const COMBO_STROKES = (window.SWORD_COMBO && window.SWORD_COMBO.strokes) || [];
const COMBO_SHEET_ANIMS = Object.fromEntries(COMBO_STROKES.map((s, i) => [
  'combo' + (i + 1), { row: i, frames: s.frames.length, fps: window.SWORD_COMBO.fps, loop: false }
]));

function drawLeg(g, hx, hy, leg, back) {
  const L = 17;
  const kx = hx + Math.sin(leg.a) * L, ky = hy + Math.cos(leg.a) * L;
  const fx = kx + Math.sin(leg.a - leg.b) * L, fy = ky + Math.cos(leg.a - leg.b) * L;
  Px.line(g, hx, hy, kx, ky, 9, back ? PAL.clothDark : PAL.cloth);
  Px.line(g, kx, ky, fx, fy, 6, back ? PAL.wrapDark : PAL.wrap);
  Px.rect(g, fx - 3, fy - 2, 9, 3, PAL.sandal);
}

function drawArm(g, sx, sy, hx, hy, back) {
  const dx = hx - sx, dy = hy - sy;
  const len = Math.hypot(dx, dy) || 1;
  let px = -dy / len, py = dx / len;
  if (py < 0) { px = -px; py = -py; }
  const bend = Math.max(1.5, (24 - len) * 0.45);
  const ex = (sx + hx) / 2 + px * bend, ey = (sy + hy) / 2 + py * bend;
  Px.line(g, sx, sy, ex, ey, back ? 4 : 5, back ? PAL.clothDark : PAL.clothLight);
  Px.line(g, ex, ey, hx, hy, 4, back ? PAL.armorDark : PAL.armorShade);
  Px.rect(g, hx - 2, hy - 2, 4, 4, back ? PAL.hair : '#3a3446');
}

function drawSword(g, hx, hy, c, s) {
  Px.line(g, hx - c * 8, hy - s * 8, hx + c * 2, hy + s * 2, 3, PAL.hiltWrap);
  Px.rect(g, hx + c * 3 - 2, hy + s * 3 - 2, 4, 4, PAL.guard);
  const bx0 = hx + c * 5, by0 = hy + s * 5, bx1 = hx + c * 42, by1 = hy + s * 42;
  Px.line(g, bx0, by0, bx1, by1, 2, PAL.blade);
  const nx = -s, ny = c;
  Px.line(g, bx0 + nx, by0 + ny, bx1 + nx * 0.5, by1 + ny * 0.5, 1, PAL.bladeEdge);
  // 刀刃上的缺口（受損的長刀）
  const k = 5 + 37 * 0.62;
  g.clearRect(Math.round(hx + c * k + nx), Math.round(hy + s * k + ny), 1, 1);
}

/**
 * 頭部可傾斜（tilt < 0 = 抬頭看向斜上方）。
 * 先畫到小畫布，再以最近鄰取樣逐像素旋轉，保持像素銳利不模糊。
 */
function drawHead(g, x, y, tilt = 0) {
  if (!tilt) {
    drawHeadRaw(g, x, y);
    return;
  }
  const S = 26, c = 13;
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

function drawHeadRaw(g, x, y) {
  const hx = Math.round(x), hy = Math.round(y);
  Px.circle(g, hx, hy, 6, PAL.skin);
  Px.rect(g, hx - 6, hy - 6, 11, 3, PAL.hair);
  Px.rect(g, hx - 7, hy - 4, 4, 8, PAL.hair);
  Px.rect(g, hx - 5, hy - 10, 5, 4, PAL.hair);   // 髮髻
  Px.rect(g, hx - 9, hy - 9, 4, 2, PAL.hair);
  // 斜切半面甲
  for (let dy = -4; dy <= 6; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      if (dx * dx + dy * dy > 37) continue;
      const v = dx + dy * 0.9;
      if (v <= 0.5) continue;
      const col = v < 2 ? PAL.armorLight : (dy > 3 ? PAL.armorShade : PAL.armor);
      Px.rect(g, hx + dx, hy + dy, 1, 1, col);
    }
  }
  // 狹長的單眼
  Px.rect(g, hx + 1, hy - 3, 5, 1, PAL.armorDark);
  Px.rect(g, hx + 2, hy - 2, 4, 1, PAL.eye);
}

function drawScarfTails(g, x, y, p) {
  for (let k = 0; k < 2; k++) {
    let px = x, py = y + k * 3;
    for (let i = 1; i <= 7; i++) {
      const wave = Math.sin(p.scarfT * Math.PI * 2 + i * 0.9 + k * 1.4) * i * 0.55;
      const nx = x - i * 4.6 * p.scarfLen;
      const ny = y + k * 3 + i * (1.7 - p.scarfLift) + wave;
      const color = k ? PAL.scarfDark : (i < 3 ? PAL.scarfLight : PAL.scarf);
      Px.line(g, px, py, nx, ny, Math.max(2, 6 - i * 0.6 - k), color);
      px = nx;
      py = ny;
    }
  }
}

function drawWanderer(g, p, frame = PLAYER_FRAME) {
  const hipX = frame.cx + p.hx, hipY = frame.feet - 34 + p.hy;
  const lean = Math.max(-24, Math.min(24, p.lean));
  const sinT = lean / 26, cosT = Math.sqrt(1 - sinT * sinT);
  const shX = hipX + lean, shY = hipY - 26 * cosT + p.torsoDY;
  const headX = shX + sinT * 9 + p.headDX, headY = shY - cosT * 9 + p.headDY;
  const c = Math.cos(p.sword), s = Math.sin(p.sword);
  const handX = shX + 2 + p.hand[0], handY = shY + 4 + p.hand[1];

  if (p.dropSword) {
    Px.line(g, hipX - 34, frame.feet - 1, hipX - 2, frame.feet - 1, 2, PAL.blade);
    Px.rect(g, hipX - 40, frame.feet - 2, 6, 3, PAL.hiltWrap);
  }

  drawScarfTails(g, shX - 3, shY - 1, p);

  const bhx = p.twoHand ? handX - c * 6 : shX - 2 + p.handB[0];
  const bhy = p.twoHand ? handY - s * 6 : shY + 5 + p.handB[1];
  drawArm(g, shX - 2, shY + 5, bhx, bhy, true);
  drawLeg(g, hipX - 2, hipY, p.legB, true);

  // 袴
  Px.rect(g, hipX - 9, hipY - 5, 18, 9, PAL.cloth);
  Px.rect(g, hipX - 9, hipY + 2, 18, 2, PAL.clothDark);

  // 軀幹與銀白胸甲
  Px.line(g, hipX, hipY - 5, shX, shY + 5, 14, PAL.clothDark);
  Px.line(g, hipX + 1, hipY - 6, shX + 1, shY + 5, 10, PAL.cloth);
  const ax = cosT * 2, ay = sinT * 2;
  const midX = hipX + lean * 0.35, midY = hipY - 26 * cosT * 0.35;
  Px.line(g, midX + ax, midY + ay, shX + ax, shY + 5 + ay, 9, PAL.armorShade);
  Px.line(g, midX + ax + 1, midY + ay - 1, shX + ax + 1, shY + 4 + ay, 6, PAL.armor);
  Px.line(g, midX + ax + 3, midY + ay - 2, shX + ax + 3, shY + 3 + ay, 1, PAL.armorLight);

  // 腰帶
  const obX = hipX + lean * 0.15, obY = hipY - 26 * cosT * 0.15 - 3;
  Px.rect(g, obX - 8, obY, 17, 3, PAL.obi);

  drawLeg(g, hipX + 2, hipY, p.legF, false);
  drawHead(g, headX, headY, p.headTilt);

  // 深藍色多層圍巾
  Px.rect(g, shX - 6, shY - 4, 13, 6, PAL.scarf);
  Px.rect(g, shX - 6, shY - 4, 13, 2, PAL.scarfLight);
  Px.rect(g, shX - 6, shY + 1, 13, 1, PAL.scarfDark);
  Px.rect(g, shX - 5, shY - 6, 10, 2, PAL.scarf);

  // 肩甲
  Px.circle(g, shX + 1, shY + 4, 5, PAL.armorShade);
  Px.circle(g, shX + 1, shY + 3, 4, PAL.armor);
  Px.rect(g, shX - 1, shY + 1, 3, 1, PAL.armorLight);

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

    // 三連擊（pixelfx 的動作）：較大的畫格，Animator 會自動切換到這張 sheet
    this.playerCombo = COMBO_STROKES.length ? buildSheet({
      frameWidth: COMBO_FRAME.width, frameHeight: COMBO_FRAME.height,
      anchorX: COMBO_FRAME.cx, anchorY: COMBO_FRAME.feet,
      animations: COMBO_SHEET_ANIMS,
      drawFrame: (g, name, f, n) => drawWanderer(g, comboPose(COMBO_STROKES[+name.slice(5) - 1].frames[f], f, n), COMBO_FRAME)
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
