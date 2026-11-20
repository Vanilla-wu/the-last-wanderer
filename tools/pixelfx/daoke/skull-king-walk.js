// 骷髏王走路循環（本專案自製）：沉重地一步一頓，巨拳低垂前後擺，披風往後飄。
// 頭骨打光參考 pixelfx 的 critters/flying-skull（MIT, patch-gg/pixelfx）。
import { TAU } from "../../core/index.js";
import { BONE, EYES, CLOAK, CROWN, STAND, drawSkullKing } from "./_skull-king.js";

export const meta = {
  name: "Skull king walk",
  desc: "戴鐵王冠、披暗紅破披風的巨大骷髏王駝著背沉重地往前走，兩隻骨拳低垂前後擺動，眼窩燃著紅火。",
  tags: ["daoke", "critter", "skull", "undead", "boss", "walk", "loop"],
  size: [104, 84], origin: [48, 78], duration: 0.9, loop: true, fps: 15, bg: "ground",
  options: { bone: BONE, eyes: EYES, cloak: CLOAK, crown: CROWN, seed: 1 },
};

export function draw(p, t, o) {
  const f = (t / meta.duration) * TAU, s = Math.sin(f), c = Math.cos(f);
  drawSkullKing(p, {
    ...STAND,
    by: Math.round(Math.abs(Math.cos(f)) * 2), lean: 5,
    ff: 1 + 7 * s, fb: -1 - 7 * s, lf: Math.max(0, c) * 3, lb: Math.max(0, -c) * 3,
    fF: [15 - s * 4, -14 + Math.abs(s)], fB: [-9 + s * 4, -15 + Math.abs(s)],
    jaw: Math.sin(f * 2) > 0.7 ? 1 : 0, sway: 2 + s, eye: 0.8,
  }, o);
}
