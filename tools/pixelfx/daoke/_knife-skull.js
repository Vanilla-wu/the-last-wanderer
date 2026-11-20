// 持刀骷髏（daoke/knife-skull-*）的共用畫法。檔名以 _ 開頭：是 helper，不是特效。
// 大頭的小骷髏兵，右手握一把短刀，朝右。腳底在 y = 0，1 單位 = 1 px（遊戲裡放大 2 倍）。
// 頭骨的打光（左上亮、右下暗一階、外框）參考 pixelfx 的 critters/flying-skull。
import { fit, hex, mix, clamp } from "../../core/index.js";
import { Grid } from "../critters/_lib.js";

export const BONE = ["#14101a", "#3a2f3a", "#6b5a5a", "#a08e7c", "#cfc0a4", "#efe5cc", "#fffaea"];
export const EYES = ["#5a0d14", "#a3151c", "#e8361f", "#ff8a3a", "#ffd9a0"];
export const RAG = ["#141826", "#252c45", "#3a4566"];
export const STEEL = ["#2a3140", "#6d7a8c", "#b9c4d2", "#eef4fb", "#ffffff"];

const G = new Grid(-26, -40, 56, 46);
const SOCKET = hex("#0c0810");

/** 站姿：所有欄位都是相對於腳底中心的 px */
export const STAND = {
  bx: 0, by: 0, lean: 0,               // 身體前後位移、上下起伏、頭往前探
  ff: 3, fb: -3, lf: 0, lb: 0,         // 前腳、後腳的 x 與抬起高度
  fh: [6, -9], bh: [-5, -8],           // 前手（握刀）、後手
  ka: -0.35,                           // 刀的角度（0 = 水平朝前，負值往上）
  jaw: 0, eye: 0.7,                    // 下顎張開幾 px、眼中火光強度
};

export const lerpPose = (a, b, u) => {
  const out = {};
  for (const k in a) {
    const x = a[k], y = b[k] ?? x;
    out[k] = Array.isArray(x) ? [x[0] + (y[0] - x[0]) * u, x[1] + (y[1] - x[1]) * u] : x + (y - x) * u;
  }
  return out;
};

/** 畫出一隻持刀骷髏；o 帶 bone / eyes / rag / steel 色階 */
export function drawKnifeSkull(p, P, o) {
  const B = fit(o.bone, 7), E = fit(o.eyes, 5), R = fit(o.rag, 3), S = fit(o.steel, 5);
  const g = G.clear();
  const bx = P.bx, by = P.by;
  const hipY = -6 + by, shY = -12 + by;
  // 腿：髖 → 膝（往前彎一點）→ 腳；後腳較暗
  const leg = (hx, fx, lift, c, foot) => {
    const kx = (hx + fx) / 2 + 1, ky = (hipY - lift) / 2 - 0.5;
    g.line(hx, hipY, kx, ky, c); g.line(kx, ky, fx, -1 - lift, c);
    g.set(fx, -1 - lift, foot); g.set(fx + 1, -1 - lift, foot);
  };
  leg(bx - 1, P.fb, P.lb, (B[2]), (B[2]));
  // 後手：肩 → 手
  g.line(bx - 2, shY + 1, (bx - 2 + P.bh[0]) / 2 - 1, (shY + 1 + P.bh[1] + by) / 2 + 1, (B[2]));
  g.line((bx - 2 + P.bh[0]) / 2 - 1, (shY + 1 + P.bh[1] + by) / 2 + 1, P.bh[0], P.bh[1] + by, (B[2]));
  // 腰間的破布
  g.poly([[bx - 4, hipY - 1], [bx + 4, hipY - 1], [bx + 4.5, hipY + 3], [bx + 2, hipY + 2], [bx, hipY + 4], [bx - 2, hipY + 2.5], [bx - 4.5, hipY + 3.5]],
    (x, y) => (y < hipY ? R[2] : x < bx ? R[1] : R[0]));
  // 脊椎與肋骨
  g.line(bx, hipY - 1, bx + 0.5, shY, (B[3]));
  for (const [dy, w] of [[0, 3.5], [2, 3], [4, 2.2]]) {
    const y = shY + 1 + dy;
    g.line(bx - w, y, bx + w, y, (u) => (u < 0.4 ? B[5] : u < 0.8 ? B[4] : B[3]));
    g.set(bx - w - 0.5, y + 1, (B[3])); g.set(bx + w + 0.5, y + 1, (B[2]));
  }
  leg(bx + 1, P.ff, P.lf, (B[4]), (B[3]));
  // 頭骨：大頭，往前探 lean
  const hx = bx + 1 + P.lean, hy = -19 + by;
  // 左上受光：一小塊最亮的高光、主色、往右下暗兩階
  g.ellipse(hx, hy, 6.6, 5.6, (nx, ny) => {
    const d = nx * 0.6 + ny * 0.8;
    if (d > 0.6) return B[3];
    if (d > 0.15) return B[4];
    return (nx + 0.35) ** 2 + (ny + 0.5) ** 2 < 0.16 ? B[6] : B[5];
  });
  g.shade(hx - 5, hy + 2, hx + 5.5, hy + 4.5, (x, y) => (x > hx + 3 ? B[3] : B[4]));   // 上顎
  // 眼窩（朝右，前眼大一點）、鼻孔、齒列
  const eyesAt = [[hx - 2.2, hy + 0.2, 1.4], [hx + 2.8, hy + 0.2, 1.7]];
  for (const [ex, ey, r] of eyesAt) g.ellipse(ex, ey, r, r * 1.1, () => SOCKET);
  g.set(hx + 0.6, hy + 2.6, SOCKET); g.set(hx + 1.4, hy + 2.6, SOCKET);
  for (let x = Math.floor(hx - 4); x <= hx + 4.5; x++) g.set(x, hy + 4.5, (x & 1) ? (B[5]) : (B[2]));
  // 下顎：張開時往下掉
  const jy = hy + 5.5 + P.jaw;
  g.shade(hx - 4, jy, hx + 4.5, jy + 1.6, (x, y) => (y < jy + 0.8 ? ((Math.floor(x) & 1) ? B[5] : B[3]) : (B[3])));
  if (P.jaw > 0.6) for (let x = Math.floor(hx - 3); x <= hx + 3.5; x++) for (let y = Math.ceil(hy + 5); y < jy; y++) g.set(x, y, SOCKET);
  g.set(hx + 3, hy - 4, (B[2])); g.set(hx + 4, hy - 3, (B[2]));   // 頭頂的裂痕
  // 前手與短刀：肩 → 肘 → 手，刀從手往 ka 方向伸出
  const [hxF, hyF] = [P.fh[0], P.fh[1] + by];
  const ex = (bx + 2 + hxF) / 2 - 0.5, ey = (shY + 1 + hyF) / 2 + 1.5;
  g.line(bx + 2, shY + 1, ex, ey, (B[4])); g.line(ex, ey, hxF, hyF, (B[4]));
  const cx = Math.cos(P.ka), sy = Math.sin(P.ka);
  g.line(hxF - cx * 2, hyF - sy * 2, hxF, hyF, (R[1]));                 // 刀柄
  g.set(hxF + cx, hyF + sy, (S[1]));                                    // 護手
  g.line(hxF + cx * 2, hyF + sy * 2, hxF + cx * 8, hyF + sy * 8, (u) => (u > 0.85 ? S[4] : S[2]));   // 刀身
  g.line(hxF + cx * 2 - sy * 0.8, hyF + sy * 2 + cx * 0.8, hxF + cx * 6.5 - sy * 0.8, hyF + sy * 6.5 + cx * 0.8, (S[1]));
  g.set(hxF, hyF, (B[5]));
  g.outline((x, y, nx, ny) => (ny < 0 ? (B[1]) : (B[0])));
  g.draw(p);
  // 眼中的火：前眼亮、後眼暗一階
  const k = clamp(P.eye, 0, 1.5);
  eyesAt.forEach(([ex2, ey2], i) => {
    const c0 = E[2 + (i ? 1 : 0)], c1 = E[i ? 4 : 3];
    p.px(ex2, ey2, c0);
    if (k > 0.9) p.px(ex2, ey2 - 1, c1);
    p.glow(ex2 + 0.5, ey2 + 0.5, 4 + k * 3, E[3], 0.35 * k);
  });
}

/** 刀光：從刀舉起的地方往前下劈的一小道弧，前緣白、往尾端冷成刀身的鋼藍；u 從 0 到 1 */
export function knifeArc(p, cx, cy, r, a0, a1, u, S) {
  const head = Math.min(1, u * 3.2), tail = Math.max(0, (u - 0.25) / 0.75);
  if (tail >= 1) return;
  const span = a1 - a0, from = a0 + span * tail, to = a0 + span * head;
  const n = Math.max(2, Math.ceil(Math.abs(to - from) * r));
  for (let i = 0; i <= n; i++) {
    const v = i / n, a = from + (to - from) * v, w = 0.8 + 3.4 * Math.sin(Math.PI * Math.pow(v, 1.6)) * (1 - tail);
    for (let d = 0; d < w; d += 0.7) {
      const x = cx + Math.cos(a) * (r - d), y = cy + Math.sin(a) * (r - d);
      p.dot(x, y, d < 0.8 && u < 0.45 ? S[4] : v > 0.6 ? S[3] : S[2], Math.min(1, v * 2.5) * (1 - tail * 0.6));
    }
  }
  const [hx, hy] = [cx + Math.cos(to) * r, cy + Math.sin(to) * r];
  if (u < 0.5) p.glow(hx, hy, 10, S[3], 0.5 * (1 - u * 2));
}

