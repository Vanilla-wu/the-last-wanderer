// 持刀骷髏：揮刀。反方向蓄勢（刀舉到頭後、身子往後縮、眼火變亮）→ 一格內往前劈下並踏步 → 刀光 → 慢慢收回。
// 頭骨打光參考 pixelfx 的 critters/flying-skull（MIT, patch-gg/pixelfx）。
import { ease, seg, fit } from "../../core/index.js";
import { BONE, EYES, RAG, STEEL, STAND, drawKnifeSkull, knifeArc, lerpPose } from "./_knife-skull.js";

export const HIT = 0.32;   // 刀劈到最前方的時間（遊戲裡的攻擊判定從這裡開始）
export const meta = {
  name: "Knife skull slash",
  desc: "持刀骷髏把短刀舉到頭後蓄勢、眼火轉亮、張口，接著一步踏出往前下劈，劃出一小道鋼藍刀光，再慢慢收刀。",
  tags: ["daoke", "critter", "skull", "undead", "monster", "attack", "one-shot"],
  size: [72, 52],
  origin: [26, 46],
  duration: 0.75,
  loop: false,
  fps: 20,
  bg: "ground",
  options: { bone: BONE, eyes: EYES, rag: RAG, steel: STEEL, seed: 1 },
};

const READY_ = { ...STAND, lean: 1 };
const COCK = { ...STAND, bx: -2, by: 1, lean: -1, ff: 2, fb: -5, fh: [-6, -19], bh: [2, -7], ka: -2.25, jaw: 2, eye: 1.4 };
const CUT = { ...STAND, bx: 3, by: 1, lean: 3, ff: 8, fb: -4, fh: [11, -7], bh: [-2, -5], ka: 0.7, jaw: 1, eye: 1.2 };
const END = { ...CUT, by: 0, lean: 2, fh: [9, -5], ka: 1.1, jaw: 0, eye: 0.9 };

export function draw(p, t, o) {
  let P;
  if (t < 0.24) P = lerpPose(READY_, COCK, ease.outCubic(seg(t, 0, 0.18)));
  else if (t < HIT - 0.04) P = { ...COCK, fh: [COCK.fh[0] - 1, COCK.fh[1] - 1], by: 2 };       // 頓住，準備出手
  else if (t < HIT) P = lerpPose(COCK, CUT, 0.5);                                               // 揮到一半：刀落後於手
  else if (t < HIT + 0.12) P = lerpPose(CUT, END, seg(t, HIT, HIT + 0.12));
  else P = lerpPose(END, READY_, ease.inOutSine(seg(t, HIT + 0.2, meta.duration - 0.05)));
  // 刀光畫在骷髏後面，刀身蓋在上面
  const u = (t - (HIT - 0.04)) / 0.3;
  if (u > 0 && u < 1) knifeArc(p, 5, -14, 13, -2.2, 1.0, u, fit(o.steel, 5));
  drawKnifeSkull(p, P, o);
}
