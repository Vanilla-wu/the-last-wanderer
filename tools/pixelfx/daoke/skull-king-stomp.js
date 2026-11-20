// 骷髏王震地板（本專案自製）：抬起前腳、身子往後仰、雙臂張開，重重踩下，腳下炸開塵土；
// 兩道震波由遊戲沿地面往左右推出去。頭骨打光參考 pixelfx 的 critters/flying-skull（MIT, patch-gg/pixelfx）。
import { ease, seg, hex, sparkle } from "../../core/index.js";
import { BONE, EYES, CLOAK, CROWN, STAND, drawSkullKing, lerpPose } from "./_skull-king.js";
import { debris } from "./skull-king-pound.js";

export const HIT = 0.5;
export const meta = {
  name: "Skull king stomp",
  desc: "骷髏王抬起前腳、往後仰、雙臂張開，重重踩下，腳下的塵土與碎石往兩邊炸開。",
  tags: ["daoke", "critter", "skull", "undead", "boss", "attack", "one-shot"],
  size: [128, 96], origin: [60, 86], duration: 1.0, loop: false, fps: 15, bg: "ground",
  options: { bone: BONE, eyes: EYES, cloak: CLOAK, crown: CROWN, seed: 1 },
};

const LIFT = { ...STAND, by: -1, lean: -4, ff: 6, lf: 14, fF: [20, -36], fB: [-18, -36], jaw: 2, eye: 1.3, sway: 1 };
const STAMP = { ...STAND, by: 5, lean: 6, ff: 9, lf: 0, fF: [18, -22], fB: [-16, -22], jaw: 3, eye: 1.4, sway: 4 };

export function draw(p, t, o) {
  let P;
  if (t < 0.36) P = lerpPose(STAND, LIFT, ease.outCubic(seg(t, 0, 0.36)));
  else if (t < HIT - 0.04) P = { ...LIFT, lf: 16, by: -2 };
  else if (t < HIT) P = lerpPose(LIFT, STAMP, 0.6);
  else if (t < HIT + 0.2) P = STAMP;
  else P = lerpPose(STAMP, STAND, ease.inOutSine(seg(t, HIT + 0.2, meta.duration - 0.05)));
  drawSkullKing(p, P, o);
  const u = t - HIT;
  if (u >= 0) {
    debris(p, u, 9, 18, 5);
    if (u < 0.1) sparkle(p, 9, -2, 12 * (1 - u / 0.1), hex("#ffffff"), hex("#c9c2cc"), 0.7);
  }
}
