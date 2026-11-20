// 骷髏王衝撞循環（本專案自製）：壓低頭、王冠朝前，雙拳甩在身後，大步狂奔。
// 頭骨打光參考 pixelfx 的 critters/flying-skull（MIT, patch-gg/pixelfx）。
import { TAU } from "../../core/index.js";
import { BONE, EYES, CLOAK, CROWN, STAND, drawSkullKing } from "./_skull-king.js";

export const meta = {
  name: "Skull king charge",
  desc: "骷髏王壓低頭、王冠朝前，雙拳甩在身後，披風被風扯得筆直，大步往前衝撞。",
  tags: ["daoke", "critter", "skull", "undead", "boss", "charge", "loop"],
  size: [104, 84], origin: [48, 78], duration: 0.4, loop: true, fps: 15, bg: "ground",
  options: { bone: BONE, eyes: EYES, cloak: CLOAK, crown: CROWN, seed: 1 },
};

export function draw(p, t, o) {
  const f = (t / meta.duration) * TAU, s = Math.sin(f), c = Math.cos(f);
  drawSkullKing(p, {
    ...STAND,
    by: 3 + Math.round(Math.abs(s) * 2), lean: 12,
    ff: 3 + 9 * s, fb: -3 - 9 * s, lf: Math.max(0, c) * 5, lb: Math.max(0, -c) * 5,
    fF: [-2, -20 + s * 2], fB: [-14, -22 - s * 2],
    jaw: 2, sway: 8 + s, eye: 1.3,
  }, o);
}
