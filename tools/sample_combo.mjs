// 把 pixelfx 的三連擊（moves/sword-combo）的姿勢取樣成 data/swordcombo.js
//
// 用法（需要 Node 18 以上）：node tools/sample_combo.mjs <pixelfx 資料夾>
//
// pixelfx 的姿勢是「手、腳該在哪裡、刀的角度、蹲低與前傾」，單位是它那個約 38px 高的假人的像素，腳底為原點、y 往上為負。
// 這裡只照原樣取樣，轉套到劍客身上的換算在 js/art/Sprites.js 的 comboPose()。
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const pfx = process.argv[2];
if (!pfx) {
  console.error("用法：node tools/sample_combo.mjs <pixelfx 資料夾>");
  process.exit(1);
}
const load = (p) => import(pathToFileURL(resolve(pfx, p)).href);
const { poseAt } = await load("src/core/act.js");
const combo = await load("src/fx/moves/sword-combo.js");

const FPS = 20;   // pixelfx 的四肢以 12 fps 的步進移動，20 fps 取樣已足夠，也讓 sprite sheet 小一點
const STEP = 10;   // 每一擊向前踏的距離（pixelfx 的單位）
// 三擊在整套時間軸上的區段：前一擊結束的瞬間，就是下一擊蓄勢的開始
const STROKES = [
  { from: -0.55, to: 0.36, base: 0 },          // 斜劈（sword-slash）
  { from: 0.36, to: 0.74, base: STEP },        // 交叉雙斬（double-slash）
  { from: 0.74, to: 2.34, base: STEP * 2 },    // 雙手重劈（heavy-cleave），含長收招
];
const KEYS = ["x", "y", "crouch", "lean", "fx", "fy", "bx", "by", "sa", "ffx", "ffy", "fbx", "fby"];
const round = (v) => Math.round(v * 100) / 100;

const strokes = STROKES.map(({ from, to, base }) => {
  const frames = [];
  for (let i = 0; from + i / FPS < to - 1e-6; i++) {
    const p = poseAt(combo.act.poses, from + i / FPS);
    const f = {};
    for (const k of KEYS) f[k] = round(p[k] ?? 0);
    f.x = round(f.x - base);
    if (p.two) f.two = 1;
    if (p.armsFront) f.armsFront = 1;
    frames.push(f);
  }
  const hits = combo.act.hits
    .filter((h) => h.t >= from && h.t < to)
    .map((h) => ({ t: round(h.t - from), stop: h.stop, shake: h.shake, amp: h.amp }));
  return { duration: round(to - from), step: base ? STEP : 0, hits, frames };
});

const out = `/**
 * pixelfx 三連擊（moves/sword-combo）的姿勢資料，由 tools/sample_combo.mjs 產生，勿手動修改
 *
 * 來源：https://github.com/patch-gg/pixelfx（MIT），授權見 assets/fx/pixelfx-LICENSE
 * 每一擊：duration 長度（秒）、step 開始時向前踏的距離、hits 命中時間與停頓 / 震動、frames 每 1/${FPS} 秒的姿勢。
 * 姿勢單位是 pixelfx 假人的像素（腳底為原點，y 往上為負），轉套到劍客的換算見 js/art/Sprites.js。
 */
window.SWORD_COMBO = ${JSON.stringify({ fps: FPS, strokes })};
`;
const here = fileURLToPath(new URL(".", import.meta.url));
writeFileSync(join(here, "..", "data", "swordcombo.js"), out);
console.log(strokes.map((s, i) => `第 ${i + 1} 擊：${s.frames.length} 格，命中 ${s.hits.map((h) => h.t).join(", ")} 秒`).join("\n"));
