// The crescent, echo, trail, glint and spark recipe is adapted from Sprite Fusion's open-source slash
// (https://www.spritefusion.com/pixel-art-vfx/slash), MIT License, Copyright (c) 2026 Hugo Duprez.
import { makeSlash, slashAct } from "./_dao.js";

export const meta = {
  name: "Dao slash (snow edge)",
  desc: "刀客的斜劈刀光：墨色到月白，掃完那一格白熱，刀鋒沿弧削起一片雪屑，飄落後散去。",
  tags: ["daoke", "melee", "slash", "dao", "directional", "one-shot"],
  size: [152, 112],
  origin: [52, 98],
  duration: 0.62,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#151a2a", "#2b3550", "#4d6185", "#8aa3c4", "#c8d6e8", "#eef3fa", "#ffffff"],
    sparks: ["#ffffff", "#e6f2ff", "#a8c8e8", "#6a8cb8"],
    radius: 46,
    seed: 2,
  },
};

const SWEEP = 0.05;
export const act = slashAct(SWEEP, 0.14);
export const create = makeSlash({
  arc: { W: 14, sweep: SWEEP, hold: 0.06, trail: 0.26, lead: 2, rim: 0.28, hero: 0.034, trace: 0.5 },
  sparks: 6, motes: 6, flakes: 12, flash: 28,
});
