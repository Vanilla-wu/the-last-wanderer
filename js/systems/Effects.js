/**
 * Effects —— 粒子、刀光、殘影與浮動文字
 */
class Effects {
  constructor() {
    this.clear();
  }

  clear() {
    this.particles = [];
    this.slashes = [];
    this.afterimages = [];
    this.texts = [];
  }

  emit(x, y, {
    count = 8, colors = ['#ffffff'], speed = 120, angle = 0, spread = Math.PI * 2,
    life = 0.5, gravity = 300, size = 2, drag = 0, glow = false
  } = {}) {
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * (0.35 + Math.random() * 0.65);
      const l = life * (0.6 + Math.random() * 0.4);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: l, maxLife: l, gravity, drag, glow,
        size: Math.max(1, Math.round(size * (0.6 + Math.random() * 0.6))),
        color: colors[(Math.random() * colors.length) | 0]
      });
    }
  }

  dust(x, y, direction = 0) {
    this.emit(x, y - 2, {
      count: 7, colors: ['#9aa7b8', '#c7d2de', '#6f7a8c'], speed: 70,
      angle: direction ? (direction > 0 ? Math.PI : 0) : -Math.PI / 2,
      spread: direction ? 1.1 : Math.PI, life: 0.4, gravity: -30, size: 2, drag: 3
    });
  }

  sparks(x, y, direction) {
    this.emit(x, y, {
      count: 12, colors: ['#ffffff', '#c9f2ff', '#7fc4ff'], speed: 280,
      angle: direction > 0 ? 0 : Math.PI, spread: 1.8, life: 0.28, gravity: 260, size: 2, glow: true
    });
  }

  spiritDeath(x, y) {
    this.emit(x, y, { count: 14, colors: ['#3c6142', '#5f9c5a', '#2d4a33'], speed: 160, life: 0.7, gravity: 380, size: 3 });
    this.emit(x, y, { count: 12, colors: ['#ffcf6b', '#ffe9a8', '#ffb347'], speed: 70, angle: -Math.PI / 2, spread: 1.6, life: 1.1, gravity: -60, size: 2, drag: 1.5, glow: true });
  }

  mote(x, y) {
    this.emit(x, y, { count: 1, colors: ['#ffcf6b', '#ffe9a8'], speed: 18, angle: -Math.PI / 2, spread: 1.2, life: 1.2, gravity: -10, size: 1, glow: true });
  }

  ember(x, y) {
    this.emit(x, y, { count: 1, colors: ['#ffd27a', '#ff9d4a', '#fff2c4'], speed: 26, angle: -Math.PI / 2, spread: 0.9, life: 0.9, gravity: -40, size: 1, glow: true });
  }

  burst(x, y, colors) {
    this.emit(x, y, { count: 26, colors, speed: 150, life: 0.9, gravity: -50, size: 2, drag: 2, glow: true });
  }

  /** 陶罐碎裂：碎片受重力落下 */
  shatter(x, y, colors) {
    this.emit(x, y, { count: 16, colors, speed: 210, angle: -Math.PI / 2, spread: 2.6, life: 0.75, gravity: 900, size: 3 });
    this.emit(x, y, { count: 6, colors: ['#9aa7b8', '#c7d2de'], speed: 60, angle: -Math.PI / 2, spread: 2, life: 0.5, gravity: -20, size: 2, drag: 3 });
  }

  /** 雪堆被打散：大量雪粉向上噴起，再慢慢飄落 */
  snowPuff(x, y, amount = 1) {
    this.emit(x, y, { count: Math.round(18 * amount), colors: ['#ffffff', '#dfe9f0', '#c7d6e2'], speed: 170, angle: -Math.PI / 2, spread: 2.2, life: 0.9, gravity: 260, size: 2, drag: 1.8 });
  }

  hurt(x, y) {
    this.emit(x, y, { count: 12, colors: ['#bff1ff', '#4fb3ff', '#ffffff'], speed: 200, life: 0.4, gravity: 300, size: 2, glow: true });
  }

  wingBurst(x, y) {
    this.emit(x - 6, y, { count: 8, colors: ['#ffffff', '#cfe9ff', '#8fcaf5'], speed: 110, angle: Math.PI * 0.8, spread: 0.8, life: 0.4, gravity: 120, size: 2, drag: 3, glow: true });
    this.emit(x + 6, y, { count: 8, colors: ['#ffffff', '#cfe9ff', '#8fcaf5'], speed: 110, angle: Math.PI * 0.2, spread: 0.8, life: 0.4, gravity: 120, size: 2, drag: 3, glow: true });
  }

  /** 蓄力時從四周往手部聚集的光點 */
  chargeMote(x, y, radius) {
    const a = Math.random() * Math.PI * 2;
    const life = 0.3;
    this.particles.push({
      x: x + Math.cos(a) * radius, y: y + Math.sin(a) * radius,
      vx: -Math.cos(a) * radius / life, vy: -Math.sin(a) * radius / life,
      life, maxLife: life, gravity: 0, drag: 0, glow: true, size: 1,
      color: Math.random() < 0.5 ? '#bff1ff' : '#ffffff'
    });
  }

  sparkle(x, y, colors) {
    this.emit(x, y, { count: 1, colors, speed: 20, angle: -Math.PI / 2, spread: Math.PI * 2, life: 0.8, gravity: -20, size: 1, glow: true });
  }

  /** direction：'side' 橫斬、'up' 上劈、'down' 下劈 */
  slash(player, direction = 'side') {
    this.slashes.push({ follow: player, facing: player.facing, direction, t: 0, life: direction === 'side3' ? 0.22 : 0.17 });
  }

  /** 旋風斬：環繞劍客、由下往上捲起的旋風刀光（pixelfx 圖檔還沒載入時的備用） */
  spiral(player, life) {
    this.slashes.push({ follow: player, facing: player.facing, direction: 'spiral', t: 0, life });
  }

  afterimage(animator, x, y, flip) {
    if (!animator.current) return;
    this.afterimages.push({ sheet: animator.sheet, row: animator.current.row, frame: animator.frame, x, y, flip, t: 0, life: 0.24 });
  }

  floatText(text, x, y, color = '#eaf6ff') {
    this.texts.push({ text, x, y, color, t: 0, life: 1.6 });
  }

  update(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      if (p.drag) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const list of [this.slashes, this.afterimages, this.texts]) for (const e of list) e.t += dt;
    this.slashes = this.slashes.filter((s) => s.t < s.life);
    this.afterimages = this.afterimages.filter((a) => a.t < a.life);
    this.texts = this.texts.filter((t) => t.t < t.life);
  }

  render(ctx, cam) {
    for (const a of this.afterimages) {
      a.sheet.drawFrame(ctx, a.row, a.frame, a.x - cam.x, a.y - cam.y, a.flip, 'ghost', 0.45 * (1 - a.t / a.life));
    }

    for (const s of this.slashes) this._renderSlash(ctx, cam, s);

    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / p.maxLife * 1.5);
      ctx.globalAlpha = alpha;
      if (p.glow) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - cam.x), Math.round(p.y - cam.y), p.size, p.size);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  /**
   * 刀光：以像素方塊沿弧線蓋章，保持像素風格。
   * 角度以「面向右方」為準，x 分量再乘上面向，所以朝左時會自動鏡像。
   */
  _renderSlash(ctx, cam, s) {
    if (s.direction === 'spiral') {
      this._renderSpiral(ctx, cam, s);
      return;
    }
    const p = s.follow;
    const k = s.t / s.life;
    const arcs = {
      side: { ox: s.facing * 6, oy: 40, radius: 40, start: -1.55, end: 0.95 },
      side2: { ox: s.facing * 6, oy: 40, radius: 40, start: 1.05, end: -1.5 },
      side3: { ox: 0, oy: 46, radius: 56, squash: 0.5, start: -3.0, end: 0.75, thick: 1.4 },
      up: { ox: 0, oy: 22, radius: 42, start: 0.35, end: -3.45 },
      down: { ox: 0, oy: 56, radius: 40, start: -0.5, end: 3.65 }
    };
    const arc = arcs[s.direction] || arcs.side;
    const cx = p.centerX + arc.ox - cam.x;
    const cy = p.y + arc.oy - cam.y;
    const radius = arc.radius;
    const ry = radius * (arc.squash || 1);
    const thickness = arc.thick || 1;
    const start = arc.start, end = arc.end;
    const uMax = Math.min(1, k * 2.6);
    const uMin = Math.max(0, k * 1.6 - 0.6);
    const step = 0.035 / Math.abs(end - start);
    const alpha = 1 - k * 0.7;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let u = uMin; u <= uMax; u += step) {
      const a = start + (end - start) * u;
      const thick = Math.round((Math.sin(u * Math.PI) * 6 + 1) * thickness);
      const x = cx + Math.cos(a) * radius * s.facing;
      const y = cy + Math.sin(a) * ry;
      ctx.fillStyle = `rgba(110,190,255,${0.55 * alpha})`;
      ctx.fillRect(Math.round(x - thick / 2), Math.round(y - thick / 2), thick, thick);
      const x2 = cx + Math.cos(a) * (radius - 2) * s.facing;
      const y2 = cy + Math.sin(a) * (ry - 2);
      const t2 = Math.max(1, thick - 3);
      ctx.fillStyle = `rgba(235,250,255,${alpha})`;
      ctx.fillRect(Math.round(x2 - t2 / 2), Math.round(y2 - t2 / 2), t2, t2);
    }
    ctx.restore();
  }

  /** 三圈扁平的刀光環，各自錯開角度旋轉，越上層越晚出現 */
  _renderSpiral(ctx, cam, s) {
    const p = s.follow;
    const k = s.t / s.life;
    const cx = p.centerX - cam.x;
    const spin = s.t * 26 * s.facing;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const appear = Math.min(1, Math.max(0, (k - i * 0.12) * 5));
      const fade = Math.min(1, (1 - k) * 4);
      const alpha = appear * fade;
      if (alpha <= 0) continue;
      const cy = p.bottom - 14 - i * 26 - k * 8 - cam.y;
      const rx = 54 - i * 6, ry = 11 - i;
      const start = spin + i * 2.1;
      const len = 3.4;
      for (let u = 0; u <= 1; u += 0.02) {
        const a = start + len * u;
        const front = Math.sin(a) > 0;      // 身前的半圈較亮，身後的較暗
        const thick = Math.max(1, Math.round(Math.sin(u * Math.PI) * 6));
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry;
        ctx.fillStyle = `rgba(110,190,255,${(front ? 0.6 : 0.25) * alpha})`;
        ctx.fillRect(Math.round(x - thick / 2), Math.round(y - thick / 2), thick, thick);
        const t2 = Math.max(1, thick - 3);
        ctx.fillStyle = `rgba(235,250,255,${(front ? 1 : 0.4) * alpha})`;
        ctx.fillRect(Math.round(x - t2 / 2), Math.round(y - 1 - t2 / 2), t2, t2);
      }
    }
    ctx.restore();
  }
}
