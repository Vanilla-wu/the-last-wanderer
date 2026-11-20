// 骷髏王召喚（本專案自製）：雙臂高舉張開、仰頭張口，紫色魂火從地面往上竄、聚到王冠與雙拳，
// HIT 時一圈光爆開（遊戲在這時叫出持刀骷髏）。頭骨打光參考 pixelfx 的 critters/flying-skull（MIT, patch-gg/pixelfx）。
import { ease, seg, hex, rng, fly, sparkle } from "../../core/index.js";
import { BONE, EYES, CLOAK, CROWN, STAND, drawSkullKing, lerpPose } from "./_skull-king.js";

export const HIT = 0.7;
export const meta = {
  name: "Skull king summon",
  desc: "骷髏王雙臂高舉、仰頭張口，紫色魂火從腳邊竄起聚向王冠與雙拳，最後一圈紫光爆開。",
  tags: ["daoke", "critter", "skull", "undead", "boss", "summon", "one-shot"],
  size: [128, 100], origin: [56, 90], duration: 1.2, loop: false, fps: 15, bg: "ground",
  options: { bone: BONE, eyes: EYES, cloak: CLOAK, crown: CROWN, seed: 1 },
};

const RAISE = { ...STAND, by: 1, lean: -2, fF: [22, -56], fB: [-20, -54], jaw: 3, eye: 1.7, sway: 3, glow: 1 };
const V = ["#3a1060", "#7a2ad0", "#b04aff", "#e6b8ff"].map(hex);

export function draw(p, t, o) {
  let P;
  if (t < 0.4) P = lerpPose(STAND, RAISE, ease.outCubic(seg(t, 0, 0.4)));
  else if (t < HIT + 0.15) P = { ...RAISE, glow: 0.7 + 0.3 * Math.sin(t * 40) };
  else P = lerpPose({ ...RAISE, glow: 0 }, STAND, ease.inOutSine(seg(t, HIT + 0.15, meta.duration - 0.05)));
  // 腳邊竄起的紫色魂火，往上飄、往中間聚
  for (let i = 0; i < 18; i++) {
    const r = rng(7, i), born = r.range(0.05, HIT), L = r.range(0.3, 0.5), age = t - born;
    if (age < 0 || age > L) continue;
    const x0 = r.range(-30, 30), [x, y] = fly(x0, -1, -x0 * 0.8, -r.range(60, 120), age, 0, 1.5);
    p.px(x, y, V[age / L < 0.5 ? 3 : 2]);
    if (age / L < 0.6) p.px(x, y + 1, V[1]);
    p.glow(x, y, 4, V[2], 0.3 * (1 - age / L));
  }
  drawSkullKing(p, P, o);
  const u = t - HIT;
  if (u >= 0 && u < 0.3) {
    const R = 10 + u * 160;
    for (let a = 0; a < Math.PI * 2; a += 0.08) p.dot(Math.cos(a) * R, -40 + Math.sin(a) * R * 0.5, V[u < 0.1 ? 3 : 2], 1 - u / 0.3);
    if (u < 0.1) sparkle(p, 6, -62, 14 * (1 - u / 0.1), V[3], V[2], 0.8);
  }
}
