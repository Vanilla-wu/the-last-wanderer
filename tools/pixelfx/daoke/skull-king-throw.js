// 骷髏王投擲（本專案自製）：伸手抓起身邊的骷髏、舉過頭往後仰蓄勢，在 HIT 時往前上方甩出去，手臂順勢甩到身前。
// 被丟出去的持刀骷髏由遊戲畫（跟著手、旋轉飛行），這張只畫骷髏王本身。
// 頭骨打光參考 pixelfx 的 critters/flying-skull（MIT, patch-gg/pixelfx）。
import { ease, seg } from "../../core/index.js";
import { BONE, EYES, CLOAK, CROWN, STAND, drawSkullKing, lerpPose } from "./_skull-king.js";

export const HIT = 0.5;
export const meta = {
  name: "Skull king throw",
  desc: "骷髏王彎腰抓起身邊的東西、舉過頭往後仰，接著一甩往前上方擲出，雙臂順勢甩到身前再收回。",
  tags: ["daoke", "critter", "skull", "undead", "boss", "attack", "throw", "one-shot"],
  size: [128, 100], origin: [56, 90], duration: 1.1, loop: false, fps: 15, bg: "ground",
  options: { bone: BONE, eyes: EYES, cloak: CLOAK, crown: CROWN, seed: 1 },
};

const GRAB = { ...STAND, by: 5, lean: 10, fF: [24, -18], fB: [18, -20], jaw: 1, eye: 1.1, sway: 3 };
const LIFT = { ...STAND, by: -1, lean: -5, fF: [-6, -70], fB: [-12, -68], jaw: 2, eye: 1.4, sway: 1 };
const FLING = { ...STAND, by: 2, lean: 10, ff: 10, fb: -8, fF: [36, -30], fB: [28, -27], jaw: 3, eye: 1.4, sway: 6 };

export function draw(p, t, o) {
  let P;
  if (t < 0.15) P = lerpPose(STAND, GRAB, ease.outCubic(seg(t, 0, 0.15)));
  else if (t < 0.42) P = lerpPose(GRAB, LIFT, ease.inOutSine(seg(t, 0.15, 0.42)));
  else if (t < HIT) P = { ...LIFT, by: -2, fF: [-9, -72], fB: [-15, -70] };     // 頓一下
  else if (t < HIT + 0.07) P = lerpPose(LIFT, FLING, 0.6);
  else if (t < HIT + 0.3) P = FLING;
  else P = lerpPose(FLING, STAND, ease.inOutSine(seg(t, HIT + 0.3, meta.duration - 0.05)));
  drawSkullKing(p, P, o);
}
