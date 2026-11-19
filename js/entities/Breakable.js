/**
 * Breakable —— 可擊破的場景物件（陶罐、雪堆）
 *
 * 不會阻擋移動；被攻擊或下劈命中時扣耐久，歸零就碎裂。
 * drop: 'soul' 的物件碎裂後會掉出魂火（SoulDrop）。
 */
const BREAKABLES = {
  pot: {
    kind: 'pot', hp: 1, width: 20, height: 26,
    sprites: ['pot'],
    shards: ['#8a4a32', '#a85d3c', '#c8784e', '#5e3022', '#b89a5c']
  },
  snow: {
    kind: 'snow', hp: 2, width: 38, height: 20,
    sprites: ['snowSmall', 'snow']   // 依剩餘耐久選圖：被打一下就縮小
  }
};

class Breakable {
  /** x：底部中心；y：地面高度（物件底部） */
  constructor({ type, x, y, drop = null }) {
    this.type = type;
    this.info = BREAKABLES[type];
    this.x = x;
    this.y = y;
    this.drop = drop;
    this.hp = this.info.hp;
    this.broken = false;
    this.flashTimer = 0;
    this.shakeTimer = 0;
  }

  get height() {
    return this.hp < this.info.hp ? this.info.height * 0.6 : this.info.height;
  }

  /** 判定框維持原本大小：雪堆被打小之後，橫斬仍然打得到 */
  getHitbox() {
    const w = this.info.width, h = this.info.height;
    return { x: this.x - w / 2, y: this.y - h, width: w, height: h };
  }

  /** 回傳是否擊破 */
  takeHit(damage) {
    if (this.broken) return false;
    this.hp -= damage;
    this.flashTimer = 0.08;
    this.shakeTimer = 0.15;
    if (this.hp <= 0) this.broken = true;
    return this.broken;
  }

  update(dt) {
    this.flashTimer -= dt;
    this.shakeTimer -= dt;
  }

  render(ctx, cam) {
    const names = this.info.sprites;
    const sprite = Sprites.breakables[names[Math.min(names.length - 1, Math.max(0, this.hp - 1))]];
    const img = this.flashTimer > 0 ? sprite.flash : sprite.image;
    const shake = this.shakeTimer > 0 ? (Math.floor(this.shakeTimer * 60) % 2 ? 1 : -1) : 0;
    const sx = Math.round(this.x - img.width / 2 - cam.x + shake), sy = Math.round(this.y - img.height - cam.y + 1);
    if (sx > cam.width || sx + img.width < 0) return;
    ctx.drawImage(img, sx, sy);
  }
}

/**
 * SoulDrop —— 魂火：從物件中彈出後落地漂浮，碰到可恢復 1 點生命。
 * 生命全滿時不會被撿走，會留在原地等之後再來拿。
 */
class SoulDrop extends Entity {
  constructor(x, y, direction = 0) {
    super(x - 5, y - 5, 10, 10);
    this.velocityX = direction * 50;
    this.velocityY = -260;
    this.time = 0;
    this.collected = false;
  }

  canCollect(player) {
    return this.time > 0.35 && player.hp < player.maxHp && player.state !== PLAYER_STATES.DEATH;
  }

  getHitbox() {
    return { x: this.x - 6, y: this.y - 10, width: this.width + 12, height: this.height + 16 };
  }

  update(dt, map, game) {
    this.time += dt;
    if (!this.isGrounded) {
      Physics.applyGravity(this, dt, 0.6);
      this.velocityX = Physics.approach(this.velocityX, 0, 120 * dt);
      Physics.integrate(this, map, dt);
    }
    if (Math.random() < dt * 4) game.effects.sparkle(this.centerX + (Math.random() - 0.5) * 10, this.centerY, ['#bff1ff', '#4fb3ff']);
  }

  render(ctx, cam, time) {
    const img = Sprites.soul;
    const bob = this.isGrounded ? Math.round(Math.sin(time * 3 + this.x) * 2) - 6 : 0;
    const x = this.centerX - cam.x, y = this.centerY + bob - cam.y;
    if (x < -20 || x > cam.width + 20) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const radius = 14 + Math.sin(time * 5) * 2;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, 'rgba(90,180,255,0.5)');
    grad.addColorStop(1, 'rgba(90,180,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
    ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
  }
}
