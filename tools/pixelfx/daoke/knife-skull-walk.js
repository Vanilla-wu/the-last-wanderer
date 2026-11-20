// 持刀骷髏：追擊時的走路循環。頭骨打光參考 pixelfx 的 critters/flying-skull（MIT, patch-gg/pixelfx）。
import { TAU } from "../../core/index.js";
import { BONE, EYES, RAG, STEEL, STAND, drawKnifeSkull } from "./_knife-skull.js";

export const meta = {
  name: "Knife skull walk",
  desc: "大頭的小骷髏兵握著短刀往前快步走：身子一上一下、兩腳交替、下顎喀喀作響，眼窩裡的火光閃動。",
  tags: ["daoke", "critter", "skull", "undead", "monster", "walk", "loop"],
  size: [56, 48],
  origin: [26, 44],
  duration: 0.5,
  loop: true,
  fps: 20,
  bg: "ground",
  options: { bone: BONE, eyes: EYES, rag: RAG, steel: STEEL, seed: 1 },
};

export function draw(p, t, o) {
  const f = (t / meta.duration) * TAU, s = Math.sin(f), c = Math.cos(f);
  const P = {
    ...STAND,
    by: -Math.round(Math.abs(Math.sin(f)) * 1.4), lean: 1,
    ff: 1 + 3.5 * s, fb: -1 - 3.5 * s, lf: Math.max(0, c) * 2, lb: Math.max(0, -c) * 2,
    fh: [6 + s, -9], bh: [-4 - s * 1.5, -8],
    jaw: Math.sin(f * 2) > 0.5 ? 1 : 0, eye: 0.75 + 0.2 * Math.sin(f * 3),
  };
  drawKnifeSkull(p, P, o);
}
