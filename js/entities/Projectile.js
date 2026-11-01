/**
 * SwordWave —— 蓄力斬放出的劍氣
 *
 * 直線向前飛行，可穿透敵人（每個敵人只命中一次），撞到牆壁或時間到就消散。
 */
class SwordWave {
  constructor(x, y, facing, { speed, life, damage }) {
    this.x = x;            // 中心點
    this.y = y;
    this.facing = facing;
    this.speed = speed;
    this.life = life;
    this.damage = damage;
    this.t = 0;
    this.done = false;
    this.hitTargets = new Set();
  }

  getHitbox() {
    return { x: this.x - 18, y: this.y - 32, width: 36, height: 64 };
  }

  update(dt, map, game) {
    this.t += dt;
    this.x += this.facing * this.speed * dt;
    if (Math.random() < dt * 40) {
      game.effects.sparkle(this.x - this.facing * 10, this.y + (Math.random() - 0.5) * 50, ['#ffffff', '#bff1ff', '#6fc8ff']);
    }
    const T = map.tileSize;
    const frontCol = Math.floor((this.x + this.facing * 14) / T);
    // 劍氣斬開冰壁後繼續前進
    for (const dy of [-24, 0, 24]) game.breakIce(frontCol, Math.floor((this.y + dy) / T));
    if (map.isSolidAt(frontCol, Math.floor(this.y / T))) {
      this.done = true;
      game.effects.sparks(this.x, this.y, -this.facing);
      return;
    }
    if (this.t >= this.life) this.done = true;
  }

  /** 新月形劍氣，與刀光相同的像素蓋章畫法 */
  render(ctx, cam) {
    const k = this.t / this.life;
    const alpha = Math.min(1, (1 - k) * 2.2);
    const grow = Math.min(1, this.t / 0.06);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const layers = [
      { back: 0, radius: 30, a: alpha },
      { back: 16, radius: 26, a: alpha * 0.35 }
    ];
    for (const layer of layers) {
      const cx = this.x - this.facing * (14 + layer.back) - cam.x;
      const cy = this.y - cam.y;
      const r = layer.radius * grow;
      for (let ang = -1.25; ang <= 1.25; ang += 0.04) {
        const u = (ang + 1.25) / 2.5;
        const thick = Math.max(1, Math.round(Math.sin(u * Math.PI) * 7));
        const x = cx + Math.cos(ang) * r * this.facing;
        const y = cy + Math.sin(ang) * r * 1.1;
        ctx.fillStyle = `rgba(110,190,255,${0.6 * layer.a})`;
        ctx.fillRect(Math.round(x - thick / 2), Math.round(y - thick / 2), thick, thick);
        const t2 = Math.max(1, thick - 4);
        ctx.fillStyle = `rgba(240,252,255,${layer.a})`;
        ctx.fillRect(Math.round(x - t2 / 2 + this.facing), Math.round(y - t2 / 2), t2, t2);
      }
    }
    ctx.restore();
  }
}
