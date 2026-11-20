// 刀客專案的刀光共用程式（daoke/dao-slash-*）。檔名以 _ 開頭：是 helper，不是特效。
// The crescent, echo, trail, glint and spark recipe is adapted from Sprite Fusion's open-source slash
// (https://www.spritefusion.com/pixel-art-vfx/slash), MIT License, Copyright (c) 2026 Hugo Duprez.
// 以 pixelfx 的 melee/sword-slash 為底，多了幾個開關：白熱主格（hero）、刀光殘影線（streaks）、削起的雪屑（flakes）、
// 命中瞬間亮起再衰減的光源（flash），讓不同草稿只需要換參數。
import { Particles, Lights, P, Rng, fit, sparkle, clamp, smooth, ease, TAU, READY } from "../../core/index.js";

// 劍客動作照 sword-slash：刀往頭後蓄、出刀時刀身落後於手、命中後壓低收勢
const GUARD = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 };
const WIND = { ...GUARD, x: -8, crouch: 4, lean: -4, fx: -7, fy: -35, sa: -2.65, bx: 9, by: -25, armsFront: true, ffx: 9, fbx: -8 };
const CUT = { ...GUARD, x: 0, crouch: 2, lean: 3, fx: 16, fy: -37, sa: -1.45, bx: -7, by: -24, ffx: 11, fbx: -10, ghost: 1 };
const DOWN = { ...GUARD, x: 2, crouch: 5, lean: 5, fx: 20, fy: -21, sa: 0.62, bx: -9, by: -24, ffx: 13, fbx: -10, toeB: true };

/** 出刀（t = 0）到刀停在前下方（t = hit）的 act；hit 跟著刀光掃完的時間走 */
export function slashAct(hit, stop = 0.14) {
  return {
    target: { x: 58 },
    poses: [
      [-0.55, { ...GUARD, x: -8 }],
      [-0.3, WIND],
      [-0.08, { ...WIND, crouch: 5, lean: -5 }],
      [0, CUT, "snap"],
      [hit, DOWN, "snap"],
      [hit + 0.24, { ...DOWN, x: 3, crouch: 6 }],
      [hit + 0.52, { ...GUARD, x: 1, crouch: 3, fx: 15, fy: -21, sa: 0.1, bx: -5, by: -21, ffx: 9, fbx: -7 }],
      [hit + 0.8, { ...GUARD, x: -8 }],
    ],
    hits: [{ t: hit, stop, shake: 0.18, amp: 2, push: 2.8, straw: 18 }],
    dust: [{ t: hit, x: 16, n: 7, dir: 1 }, { t: hit, x: -11, n: 4, dir: -1 }],
  };
}

function onArc(s, r, a) {
  const lx = Math.cos(a) * r, ly = Math.sin(a) * r * s.sy, c = Math.cos(s.rot), n = Math.sin(s.rot);
  return [s.cx + lx * c - ly * n, s.cy + lx * n + ly * c];
}

// 刀身拖出的弧：前緣最厚、往尾端細成一根線；年輕時外緣白熱，隨時間與往尾端冷卻
function crescent(p, s, ta, L, W, age, hot) {
  if (Math.abs(L) < 0.02 || W < 0.3) return;
  const R = s.ramp, n = R.length, dir = Math.sign(L), span = Math.abs(L), c = Math.cos(s.rot), sn = Math.sin(s.rot), B = s.R + 2;
  p.shade(s.cx - B, s.cy - B, s.cx + B, s.cy + B, (x, y, out) => {
    const dx = x - s.cx, dy = y - s.cy, lx = dx * c + dy * sn, ly = (-dx * sn + dy * c) / s.sy, r = Math.hypot(lx, ly);
    if (r > s.R + 0.5 || r < s.R - W - 1) return;
    let u = (dir * (Math.atan2(ly, lx) - ta)) % TAU;
    if (u < 0) u += TAU;
    if (u > span) return;
    const v = u / span, w = W * Math.pow(Math.sin(Math.PI * Math.pow(v, s.lead)), 0.6);
    if (w < 0.35) return;
    const q = (s.R - r) / w;
    if (q < 0 || q > 1) return;
    // 白熱主格：整道刀光只剩最亮的兩階，內緣一階
    if (hot) { out.c = R[q < 0.7 ? n - 1 : n - 2]; out.a = Math.min(1, v / 0.25); return; }
    const ci = q < s.rim && age < 0.5 ? 0 : Math.round(q * (n - 1) * 0.75 + age * 2.4 - v * 0.8 + 0.4);
    out.c = R[n - 1 - clamp(ci, 0, n - 1)];
    out.a = Math.min(1, v / 0.4);
  });
  for (let u = 0; u <= span; u += 0.3) {
    const [x, y] = onArc(s, s.R - W * 0.4, ta + dir * u);
    p.glow(x, y, 5 + W, R[n - 3], s.glow * (1 - age) * (u / span));
  }
}

function drawSlash(p, s, t) {
  const u = t - s.t0;
  if (u < 0) return;
  const span = s.a1 - s.a0, head = ease.outExpo(clamp(u / s.sweep)), tail = smooth(s.sweep + s.hold, s.sweep + s.hold + s.trail, u);
  const age = clamp(u / (s.sweep + s.hold + s.trail));
  const hot = s.hero > 0 && u >= s.sweep && u < s.sweep + s.hero;
  if (tail < 1) crescent(p, s, s.a0 + span * tail, span * (head - tail), s.W * (1 - tail * 0.55), age, hot);
  const th = s.trace * (1 - clamp((u - s.sweep - s.hold) / (s.trail + 0.1)));
  if (tail > 0.02 && th > 0)
    for (let k = 0; k <= tail; k += 0.6 / (Math.abs(span) * s.R)) {
      const [x, y] = onArc(s, s.R - 0.5, s.a0 + span * k);
      p.dot(x, y, s.ramp[1], th * (0.4 + 0.6 * k));
    }
}

function tipOf(s) {
  const [x, y] = onArc(s, s.R - s.W * 0.3, s.a1), [x2, y2] = onArc(s, s.R - s.W * 0.3, s.a1 + Math.sign(s.a1 - s.a0) * 0.05);
  const l = Math.hypot(x2 - x, y2 - y) || 1;
  return { x, y, dx: (x2 - x) / l, dy: (y2 - y) / l };
}

/**
 * cfg：arc（主刀光：R W sy rot a0 a1 sweep hold trail lead rim glow hero）、echo（內圈第二道，false 不畫）、
 * sparks（刀尖火花數）、motes（沿弧甩出的亮屑數）、flakes（削起的雪屑數）、streaks（水平殘影線數）、flash（光源半徑，0 不亮）
 */
export function makeSlash(cfg) {
  return function create(o) {
    const C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks });
    const lights = new Lights();
    const R0 = o.radius;
    const A = { cx: 6, cy: -26, sy: 0.6, rot: -0.38, a0: -2.55, a1: 0.95, W: 12, t0: 0, sweep: 0.06, hold: 0.06, trail: 0.24,
      lead: 2.2, rim: 0.22, glow: 0.22, hero: 0, trace: 0.7, ramp: C, ...cfg.arc, R: R0 };
    const E = cfg.echo === false ? null : { ...A, R: R0 * 0.79, W: A.W * 0.38, a0: A.a0 + (A.a1 - A.a0) * 0.1, a1: A.a1 - (A.a1 - A.a0) * 0.04,
      t0: 0.017, hold: A.hold * 0.5, trail: A.trail * 0.85, hero: 0, ramp: C.slice(0, 6), ...cfg.echo };
    const tip = tipOf(A);
    const streaks = [];
    for (let i = 0; i < (cfg.streaks || 0); i++) {
      const y = tip.y + Rg.range(-7, 5), len = Rg.range(30, 64);
      streaks.push({ y, x1: tip.x + Rg.range(-6, 10), len, delay: Rg.range(0, 0.04), life: Rg.range(0.16, 0.3) });
    }
    let t = 0, landed = false;
    return {
      update(dt) {
        t += dt;
        if (!landed && t >= A.sweep) {
          landed = true;
          for (let i = 0; i < (cfg.sparks ?? 10); i++) {
            const a = Math.atan2(tip.dy, tip.dx) + Rg.range(-0.5, 0.5), sp = Rg.range(150, 400);
            ps.spawn(P.SPARK, tip.x, tip.y, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.12, 0.35));
          }
          for (let i = 0; i < (cfg.motes ?? 16); i++) {
            const a = A.a0 + (A.a1 - A.a0) * Rg.range(0.3, 1), [x, y] = onArc(A, A.R, a);
            const ox = x - A.cx, oy = y - A.cy, l = Math.hypot(ox, oy) || 1, sp = Rg.range(30, 100);
            ps.spawn(P.MOTE, x, y, (ox / l) * sp, (oy / l) * sp - 10, Rg.range(0.25, 0.55), C[4 + Rg.int(0, 1)], 0.6);
          }
          for (let i = 0; i < (cfg.flakes || 0); i++) {
            const a = A.a0 + (A.a1 - A.a0) * Rg.range(0.45, 1), [x, y] = onArc(A, A.R - Rg.range(0, A.W), a);
            const ox = x - A.cx, oy = y - A.cy, l = Math.hypot(ox, oy) || 1, sp = Rg.range(20, 70);
            ps.spawn(P.FLAKE, x, y, (ox / l) * sp, (oy / l) * sp - Rg.range(20, 50), Rg.range(0.3, 0.5), C[5 + Rg.int(0, 1)], Rg.range(0.6, 1.4), Rg.range(0, 0.05));
          }
          if (cfg.flash) lights.add(tip.x - 6, tip.y, cfg.flash, C[4], 0.8, 0.22);
        }
        ps.update(dt);
        lights.update(dt);
      },
      draw(p) {
        // 居合的水平殘影：從刀尖往後拉出的細線，前端白、往後變暗，很快消失
        for (const s of streaks) {
          const u = t - A.sweep * 0.5 - s.delay;
          if (u < 0 || u > s.life) continue;
          const k = u / s.life, len = s.len * ease.outExpo(clamp(u / 0.05)), x0 = s.x1 - len;
          p.line(x0, s.y, s.x1 - len * 0.35, s.y, C[2], 0.8 * (1 - k));
          p.line(s.x1 - len * 0.35, s.y, s.x1, s.y, C[k < 0.4 ? 6 : 4], 1 - k);
        }
        if (E) drawSlash(p, E, t);
        drawSlash(p, A, t);
        const g = t - A.sweep * 0.6;
        if (g > 0 && g < 0.22) sparkle(p, tip.x, tip.y, (cfg.glint ?? 9) * ease.outBack(Math.min(1, g / 0.05)) * (1 - g / 0.22), C[5], C[3], 0.6);
        if (t < 0.3) {
          const [x, y] = onArc(A, A.R - 4, A.a0 + (A.a1 - A.a0) * ease.outExpo(clamp(t / A.sweep)));
          p.glow(x, y, cfg.headGlow ?? 40, C[3], 0.5 * (1 - t / 0.3));
        }
        ps.draw(p);
        lights.draw(p);
      },
    };
  };
}
