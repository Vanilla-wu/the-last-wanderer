// 骷髏王的震波（本專案自製）：沿地面往前推的一道塵土浪，前緣一條亮線、碎石跳起，後面拖著塵土。
// 循環播放，往哪裡移動由遊戲決定。
import { hex, cycle, fly, TAU } from "../../core/index.js";

export const meta = {
  name: "Skull shockwave",
  desc: "貼著地面往右推進的一道震波：前緣弧形的亮線不停起伏，碎石被掀起又落下，後面拖著一團塵土。",
  tags: ["daoke", "impact", "shockwave", "ground", "directional", "loop"],
  size: [64, 40], origin: [40, 34], duration: 0.4, loop: true, fps: 15, bg: "ground",
  options: { seed: 1 },
};

const C = ["#2a2630", "#5a5464", "#8f8898", "#c9c2cc", "#f2eef4"].map(hex);

export function draw(p, t, o) {
  const ph = (t / meta.duration) * TAU, h = 13 + 2 * Math.sin(ph);
  cycle(t, meta.duration, 8, o.seed, 0.4, (age, L, r) => {
    const x = -r.range(4, 26) - age * 30, y = -r.range(2, 8) - age * 10;
    p.disc(x, y, 2.5 + age * 8, C[2], 0.5 * (1 - age / L));
  });
  for (let y = 0; y < h; y++) {
    const v = y / h, x = 6 * Math.sqrt(1 - v) - 4 + Math.sin(ph + v * 3) * 0.8;
    p.px(x, -y, v < 0.3 ? C[4] : v < 0.7 ? C[3] : C[2]);
    if (v < 0.6) p.px(x - 1, -y, C[2]);
    if (v < 0.25) p.px(x - 2, -y, C[1]);
  }
  p.glow(2, -3, 14, C[3], 0.4);
  cycle(t, meta.duration, 7, o.seed + 3, 0.3, (age, L, r) => {
    const [x, y] = fly(r.range(-2, 4), -1, r.range(-30, 20), -r.range(50, 110), age, 500);
    if (y < 0) p.px(x, y, C[1 + (Math.floor(age * 100) % 3)]);
  });
}
