// 把 pixelfx 招式的姿勢取樣成 data/swordmoves.js：三連擊、旋風斬、衝刺斬
//
// 用法（需要 Node 18 以上）：node tools/sample_moves.mjs <pixelfx 資料夾>
//
// pixelfx 的姿勢是「手、腳該在哪裡、刀的角度、蹲低、前傾與轉身（yaw）」，單位是它那個約 38px 高的假人的像素，
// 腳底為原點、y 往上為負。這裡只照原樣取樣，轉套到劍客身上的換算在 js/art/Sprites.js 的 comboPose()。
// 遊戲裡的節奏由 js/entities/Player.js 決定（把這裡的時間軸壓縮對到遊戲的判定時間）。
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const pfx = process.argv[2];
if (!pfx) {
  console.error("用法：node tools/sample_moves.mjs <pixelfx 資料夾>");
  process.exit(1);
}
const load = (p) => import(pathToFileURL(resolve(pfx, p)).href);
const { poseAt } = await load("src/core/act.js");
const combo = await load("src/fx/moves/sword-combo.js");
const spin = await load("src/fx/melee/spin-slash.js");
const dash = await load("src/fx/moves/dash-strike.js");

const FPS = 20;   // pixelfx 的四肢以 12 fps 的步進移動，20 fps 取樣已足夠，也讓 sprite sheet 小一點
const KEYS = ["y", "crouch", "lean", "yaw", "fx", "fy", "bx", "by", "sa", "ffx", "ffy", "fbx", "fby"];
const round = (v) => Math.round(v * 100) / 100;

function sample(track, times) {
  return times.map((t) => {
    const p = poseAt(track, t);
    const f = {};
    for (const k of KEYS) f[k] = round(p[k] ?? 0);
    if (p.two) f.two = 1;
    return f;
  });
}
const every = (from, to) => Array.from({ length: Math.round((to - from) * FPS) }, (_, i) => from + i / FPS);

const anims = {
  // 三連擊（moves/sword-combo）：斜劈、交叉雙斬、雙手重劈，各取整套時間軸上的一段
  combo1: { from: -0.55, frames: sample(combo.act.poses, every(-0.55, 0.36)) },
  combo2: { from: 0.36, frames: sample(combo.act.poses, every(0.36, 0.74)) },
  combo3: { from: 0.74, frames: sample(combo.act.poses, every(0.74, 2.34)) },
  // 旋風斬（melee/spin-slash）：蓄勢、轉身一圈的四個朝向（正面、背對、背面、面向鏡頭）、收勢，遊戲裡逐格控制
  spin: { from: 0, frames: sample(spin.act.poses, [-0.02, 0, 0.05, 0.09, 0.13, 0.17]) },
  // 衝刺斬（moves/dash-strike）：壓低、疾衝、劈下、收勢（不含原作最後跳回原位的部分）
  dashSlash: { from: -0.16, frames: sample(dash.act.poses, every(-0.16, 0.75)) },
};

const out = `/**
 * pixelfx 招式的姿勢資料，由 tools/sample_moves.mjs 產生，勿手動修改
 *
 * 來源：https://github.com/patch-gg/pixelfx（MIT），授權見 assets/fx/pixelfx-LICENSE
 *   combo1–3：moves/sword-combo（三連擊）　spin：melee/spin-slash（旋風斬）　dashSlash：moves/dash-strike（衝刺斬）
 * 每段動作：from 對應原作時間軸的起點（秒）、frames 每 1/${FPS} 秒的姿勢（spin 是固定的六個關鍵姿勢）。
 * 姿勢單位是 pixelfx 假人的像素（腳底為原點，y 往上為負），轉套到劍客的換算見 js/art/Sprites.js。
 */
window.SWORD_MOVES = ${JSON.stringify({ fps: FPS, anims })};
`;
const here = fileURLToPath(new URL(".", import.meta.url));
writeFileSync(join(here, "..", "data", "swordmoves.js"), out);
console.log(Object.entries(anims).map(([k, a]) => `${k}：${a.frames.length} 格`).join("\n"));
