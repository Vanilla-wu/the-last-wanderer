// 骷髏王猛捶（本專案自製）：雙拳高舉過頭（反方向蓄勢、往後仰），頓一下，一格內砸向身前的地面，
// 碎石與塵土炸開，再慢慢起身。頭骨打光參考 pixelfx 的 critters/flying-skull（MIT, patch-gg/pixelfx）。
import { ease, seg, rng, fly, hex, sparkle } from "../../core/index.js";
import { BONE, EYES, CLOAK, CROWN, STAND, drawSkullKing, lerpPose } from "./_skull-king.js";

export const HIT = 0.55;
export const meta = {
  name: "Skull king pound",
  desc: "骷髏王把兩隻骨拳高舉過頭、往後仰蓄勢，頓一下後一口氣砸進身前的地面，白光一閃、碎石與塵土往兩邊炸開。",
  tags: ["daoke", "critter", "skull", "undead", "boss", "attack", "one-shot"],
  size: [128, 96], origin: [48, 86], duration: 1.1, loop: false, fps: 15, bg: "ground",
  options: { bone: BONE, eyes: EYES, cloak: CLOAK, crown: CROWN, seed: 1 },
};

const RAISE = { ...STAND, by: -1, lean: -3, fF: [-8, -70], fB: [-16, -66], jaw: 2, eye: 1.3, sway: 1 };
const SMASH = { ...STAND, by: 7, lean: 12, ff: 10, fb: -9, fF: [30, -6], fB: [22, -6], jaw: 3, eye: 1.4, sway: 5 };
const DUST = ["#2a2630", "#5a5464", "#8f8898", "#c9c2cc"].map(hex);

/** 落地炸開的碎石與塵土：t 是命中後經過的秒數 */
export function debris(p, t, x0, n, seed) {
  for (let i = 0; i < n; i++) {
    const r = rng(seed, i), dir = r.next() < 0.5 ? -1 : 1, L = r.range(0.35, 0.6);
    if (t < 0 || t > L) continue;
    const [x, y] = fly(x0 + r.range(-4, 4), -1, dir * r.range(20, 90), -r.range(40, 140), t, 420);
    if (y > 0) continue;
    p.px(x, y, DUST[1 + (i % 3)]);
    if (i % 3 === 0) p.px(x + 1, y, DUST[1]);
  }
  for (let i = 0; i < 10; i++) {
    const r = rng(seed + 9, i), dir = i % 2 ? -1 : 1, L = r.range(0.4, 0.7);
    if (t < 0 || t > L) continue;
    const [x, y] = fly(x0 + dir * r.range(0, 6), -2, dir * r.range(40, 110), -r.range(4, 14), t, 0, 4);
    p.disc(x, y, 2 + (t / L) * 4, DUST[3], 0.55 * (1 - t / L));
  }
}

export function draw(p, t, o) {
  let P;
  if (t < 0.4) P = lerpPose(STAND, RAISE, ease.outCubic(seg(t, 0, 0.4)));
  else if (t < HIT - 0.05) P = { ...RAISE, by: -2, fF: [-10, -72], fB: [-18, -68] };
  else if (t < HIT) P = lerpPose(RAISE, SMASH, 0.55);
  else if (t < HIT + 0.25) P = SMASH;
  else P = lerpPose(SMASH, STAND, ease.inOutSine(seg(t, HIT + 0.25, meta.duration - 0.05)));
  drawSkullKing(p, P, o);
  const u = t - HIT;
  if (u >= 0) {
    debris(p, u, 28, 26, 3);
    if (u < 0.12) sparkle(p, 28, -3, 16 * (1 - u / 0.12), hex("#ffffff"), DUST[3], 0.8);
    if (u < 0.2) p.glow(28, -4, 30, hex("#ffe9c8"), 0.6 * (1 - u / 0.2));
  }
}
