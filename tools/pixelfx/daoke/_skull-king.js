// 骷髏王（daoke/skull-king-*）的共用畫法。檔名以 _ 開頭：是 helper，不是特效。
// 持刀骷髏的兩倍大：駝背的巨大骨架、戴一頂粗鐵王冠、肩披破爛的暗紅披風、兩隻巨大的骨拳，沒有武器。
// 朝右，腳底在 y = 0，1 單位 = 1 px（遊戲裡放大 2 倍）。打光：左上受光、右下暗一階，外框最後統一加。
import { fit, hex, mix, clamp, lerp } from "../../core/index.js";
import { Grid } from "../critters/_lib.js";

export const BONE = ["#14101a", "#3a2f3a", "#6b5a5a", "#a08e7c", "#cfc0a4", "#efe5cc", "#fffaea"];
export const EYES = ["#5a0d14", "#a3151c", "#e8361f", "#ff8a3a", "#ffd9a0"];
export const CLOAK = ["#1a0a12", "#3a1220", "#5e1b2c", "#82283a"];
export const CROWN = ["#2a1e0c", "#5e4418", "#a07a2a", "#e0b84c", "#fff0b0"];

const G = new Grid(-48, -76, 104, 82);
const SOCKET = hex("#0c0810");

/** 站姿：所有座標都是相對於腳底中心的 px */
export const STAND = {
  bx: 0, by: 0, lean: 4,              // 身體前後位移、往下沉（蹲）、駝背往前
  ff: 7, fb: -7, lf: 0, lb: 0,         // 前腳、後腳的 x 與抬起高度
  fF: [16, -14], fB: [-10, -15],       // 前拳、後拳
  jaw: 0, eye: 0.8, sway: 0, glow: 0,  // 下顎張開、眼火、披風擺動、王冠與手上的召喚光
};

export const lerpPose = (a, b, u) => {
  const out = {};
  for (const k in a) {
    const x = a[k], y = b[k] ?? x;
    out[k] = Array.isArray(x) ? [x[0] + (y[0] - x[0]) * u, x[1] + (y[1] - x[1]) * u] : x + (y - x) * u;
  }
  return out;
};

/** 兩段骨的 IK：從 (sx, sy) 伸到 (tx, ty)，每段 L，關節往 side 那一側彎（+1 = 畫面右/下） */
function joint(sx, sy, tx, ty, L, side) {
  const dx = tx - sx, dy = ty - sy, d = Math.min(Math.hypot(dx, dy), L * 2 - 0.01);
  const h = Math.sqrt(Math.max(0, L * L - (d / 2) ** 2)), mx = sx + dx / 2, my = sy + dy / 2;
  const n = Math.hypot(dx, dy) || 1;
  return [mx - (dy / n) * h * side, my + (dx / n) * h * side];
}

export function drawSkullKing(p, P, o) {
  const B = fit(o.bone, 7), E = fit(o.eyes, 5), C = fit(o.cloak, 4), K = fit(o.crown, 5);
  const g = G.clear();
  const bx = P.bx, by = P.by, lean = P.lean;
  const hipY = -17 + by, shY = -38 + by, shX = bx + lean;
  const boneC = (light) => (u, d) => (d < 0.4 ? B[light ? 5 : 4] : d < 0.8 ? B[light ? 4 : 3] : B[light ? 3 : 2]);

  // 披風：從肩後垂到小腿，下襬破爛，隨 sway 往後飄
  const sw = P.sway;
  g.poly([[shX - 18, shY - 2], [shX + 8, shY - 4], [bx - 2, hipY + 4], [bx - 10 - sw, -4], [bx - 14 - sw, -7], [bx - 17 - sw, -3], [bx - 21 - sw * 1.4, -8], [bx - 24 - sw * 1.6, -5], [shX - 22 - sw, shY + 14]],
    (x, y) => (x > bx - 4 ? C[1] : y < shY + 8 ? C[3] : ((Math.floor(x * 0.5) & 1) ? C[2] : C[1])));
  // 後手：肩 → 肘（往下後彎）→ 拳
  const arm = (sx, sy, f, light) => {
    const [ex, ey] = joint(sx, sy, f[0], f[1] + by * 0.3, 15, 1);   // 手肘往前彎（> 形）
    g.tube([[sx, sy], [ex, ey]], 3.2, boneC(light));
    g.ellipse(ex, ey, 3.6, 3.6, (nx, ny) => (nx + ny > 0.5 ? B[light ? 3 : 2] : B[light ? 5 : 3]));   // 肘
    g.tube([[ex, ey], [f[0], f[1]]], 3.6, boneC(light));
    g.ellipse(f[0], f[1], 7, 6, (nx, ny) => (nx * 0.6 + ny * 0.8 > 0.45 ? B[light ? 3 : 2] : (nx + 0.4) ** 2 + (ny + 0.4) ** 2 < 0.15 ? B[light ? 6 : 4] : B[light ? 5 : 3]));
    for (const k of [-3, 0, 3]) { g.set(f[0] + 5, f[1] + k, B[1]); g.set(f[0] + 4, f[1] + k, B[2]); }   // 指節
  };
  // 側身朝右、略朝向我們：靠前那隻手（前肩、fF）是遠側的手，畫在身體後面；靠後那隻（後肩、fB）是近側的手，最後畫在最上層
  arm(shX + 12, shY + 2, P.fF, false);
  // 腳：髖 → 膝（往前彎）→ 腳掌
  const leg = (hx, fx, lift, light) => {
    const [kx, ky] = joint(hx, hipY, fx, -2 - lift, 10, 1);
    g.tube([[hx, hipY], [kx, ky]], 3, boneC(light));
    g.tube([[kx, ky], [fx, -2 - lift]], 2.6, boneC(light));
    g.shade(fx - 4, -4 - lift, fx + 7, -lift, (x, y) => (y < -2 - lift ? B[light ? 5 : 3] : B[light ? 4 : 2]));
  };
  leg(bx - 4, P.fb, P.lb, false);
  // 骨盆、脊椎、肋骨（前面的肋骨亮、往背光側變暗）
  g.ellipse(bx, hipY, 8, 3.4, (nx) => (nx < 0 ? B[4] : B[3]));
  g.tube([[bx, hipY], [bx + lean * 0.5, (hipY + shY) / 2], [shX, shY]], 2.4, boneC(false));
  for (let i = 0; i < 5; i++) {
    const t = i / 4, cy = shY + 4 + i * 3.4, cx = shX - lean * t * 0.5, hw = 15 - i * 1.8;
    for (let x = -hw; x <= hw; x += 0.5) {
      const y = cy + (x / hw) ** 2 * 3;
      g.set(cx + x, y, x < -hw * 0.3 ? B[5] : x < hw * 0.5 ? B[4] : B[3]);
      if (i < 4) g.set(cx + x, y + 1, x < 0 ? B[3] : B[2]);
    }
  }
  g.tube([[shX - 16, shY + 1], [shX + 13, shY]], 2.2, boneC(true));   // 鎖骨與肩
  g.ellipse(shX + 12, shY + 1, 4.5, 4, (nx, ny) => (nx + ny > 0.3 ? B[2] : B[3]));   // 遠側的肩（前肩，背光）
  g.ellipse(shX - 14, shY + 2, 5, 4.5, (nx, ny) => (nx * 0.6 + ny * 0.8 > 0.3 ? B[3] : B[5]));   // 近側的肩（後肩，受光）
  leg(bx + 4, P.ff, P.lf, true);

  // 頭骨：大頭、往前探，下顎很大
  const hx = shX + 6 + lean * 0.3, hy = shY - 10;
  g.ellipse(hx, hy, 12, 10, (nx, ny) => {
    const d = nx * 0.6 + ny * 0.8;
    return d > 0.6 ? B[3] : d > 0.15 ? B[4] : (nx + 0.35) ** 2 + (ny + 0.5) ** 2 < 0.14 ? B[6] : B[5];
  });
  g.shade(hx - 8, hy + 3, hx + 9, hy + 7, (x) => (x > hx + 5 ? B[3] : B[4]));   // 上顎
  const eyesAt = [[hx - 3.5, hy + 0.5, 2.2], [hx + 4.5, hy + 0.5, 2.8]];
  for (const [ex, ey, r] of eyesAt) g.ellipse(ex, ey, r, r * 1.1, () => SOCKET);
  g.poly([[hx + 1, hy + 3], [hx + 3, hy + 3], [hx + 2, hy + 5.5]], () => SOCKET);   // 鼻孔
  for (let x = Math.floor(hx - 7); x <= hx + 7.5; x++) g.set(x, hy + 7, (x & 1) ? B[6] : B[2]);
  const jy = hy + 8 + P.jaw;
  g.shade(hx - 7, jy, hx + 8, jy + 3.5, (x, y) => (y < jy + 1 ? ((Math.floor(x) & 1) ? B[5] : B[3]) : x > hx + 4 ? B[3] : B[4]));
  if (P.jaw > 0.6) for (let x = Math.floor(hx - 6); x <= hx + 6.5; x++) for (let y = Math.ceil(hy + 8); y < jy; y++) g.set(x, y, SOCKET);
  for (const [x, y] of [[hx + 5, hy - 7], [hx + 6, hy - 6], [hx + 6, hy - 5], [hx + 7, hy - 4]]) g.set(x, y, B[2]);   // 裂痕
  // 王冠：粗鐵環上五根尖角，前面鑲一顆紅寶石
  const cy0 = hy - 9;
  g.shade(hx - 9, cy0 - 1, hx + 9, cy0 + 2, (x, y) => (y < cy0 ? K[3] : x < hx ? K[2] : K[1]));
  for (const [dx, h] of [[-8, 4], [-4, 6], [0, 8], [4, 6], [8, 4]]) {
    g.poly([[hx + dx - 2, cy0], [hx + dx + 2, cy0], [hx + dx + 0.3, cy0 - h]], (x) => (x < hx + dx ? K[3] : K[2]));
  }
  g.set(hx, cy0, hex("#c0182a")); g.set(hx + 1, cy0, hex("#ff5a6a"));
  // 近側的手
  arm(shX - 14, shY + 3, P.fB, true);
  g.outline((x, y, nx, ny) => (ny < 0 ? B[1] : B[0]));
  g.draw(p);

  // 眼中的火（召喚時更亮），王冠與雙拳的召喚光
  const k = clamp(P.eye, 0, 1.8);
  eyesAt.forEach(([ex, ey], i) => {
    p.px(ex, ey, E[2 + i]); p.px(ex + 1, ey, E[2 + i]);
    if (k > 0.9) p.px(ex, ey - 1, E[4]), p.px(ex + 1, ey - 1, E[3]);
    p.glow(ex + 0.5, ey + 0.5, 3 + k * 2, E[3], 0.3 * k);
  });
  if (P.glow > 0) {
    p.glow(hx, cy0 - 3, 18, hex("#b04aff"), 0.5 * P.glow);
    for (const f of [P.fF, P.fB]) p.glow(f[0], f[1], 14, hex("#b04aff"), 0.55 * P.glow);
  }
}
