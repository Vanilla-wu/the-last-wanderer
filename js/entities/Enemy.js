/**
 * Enemy —— 森林妖怪 Forest Spirit（GDD 4.1）
 *
 * 1. 在指定範圍內左右巡邏（遇到牆壁、斷崖、尖刺或超出範圍就轉身）
 * 2. 接觸玩家造成傷害（由 Combat 處理）
 * 3. 被攻擊扣 HP，並短暫擊退
 * 4. HP 歸零後淡出消失
 */
const ENEMY_CONFIG = Object.freeze({
  width: 30, height: 30,
  speed: 42, hp: 3, contactDamage: 1,
  knockbackX: 170, knockbackY: 160,
  hurtDuration: 0.22, deathDuration: 0.45
});

class Enemy extends Entity {
  constructor(x, y, { range = 3, hp = ENEMY_CONFIG.hp, speed = ENEMY_CONFIG.speed } = {}, tileSize = 32) {
    super(x, y, ENEMY_CONFIG.width, ENEMY_CONFIG.height);
    this.maxHp = hp;
    this.hp = hp;
    this.speed = speed;
    this.patrolMin = x - range * tileSize;
    this.patrolMax = x + range * tileSize;
    this.facing = Math.random() < 0.5 ? -1 : 1;
    this.state = 'PATROL';
    this.stateTime = 0;
    this.flashTimer = 0;
    this.removed = false;
    this.animator = new Animator(Sprites.spirit);
    this.animator.play('walk');
    this.animator.frame = (Math.random() * 4) | 0;
    this.hurtTime = ENEMY_CONFIG.hurtDuration;
    this.trail = [];          // 過去幾秒的位置，殘影視界中可見
    this.trailTimer = 0;
  }

  get isDead() { return this.state === 'DEAD'; }

  update(dt, map, game) {
    this.stateTime += dt;
    this.flashTimer -= dt;
    this.animator.update(dt);

    if (this.state === 'DEAD') {
      if (this.stateTime >= ENEMY_CONFIG.deathDuration) this.removed = true;
      return;
    }

    if (this.state === 'HURT') {
      this.velocityX = Physics.approach(this.velocityX, 0, 500 * dt);
      if (this.stateTime >= this.hurtTime) {
        this.state = 'PATROL';
        this.animator.play('walk');
      }
    } else {
      if (this.isGrounded) {
        const T = map.tileSize;
        const aheadX = this.facing > 0 ? this.x + this.width + 2 : this.x - 2;
        const col = Math.floor(aheadX / T);
        const footRow = Math.floor((this.bottom + 2) / T);
        const bodyRow = Math.floor((this.bottom - 2) / T);
        const groundAhead = map.isSolidAt(col, footRow) || map.isOneWayAt(col, footRow);
        const blocked = map.isSolidAt(col, bodyRow) || map.isHazardAt(col, bodyRow);
        const outOfRange = (this.facing > 0 && this.x >= this.patrolMax) || (this.facing < 0 && this.x <= this.patrolMin);
        if (!groundAhead || blocked || outOfRange) this.facing *= -1;
      }
      this.velocityX = this.facing * this.speed;
    }

    Physics.applyGravity(this, dt);
    const result = Physics.integrate(this, map, dt);
    if (result.hitWall && this.state === 'PATROL') this.facing *= -1;

    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.1;
      this.trail.push({ x: this.centerX, y: this.bottom, flip: this.facing < 0, row: this.animator.current.row, frame: this.animator.frame });
      if (this.trail.length > 24) this.trail.shift();
    }

    if (Math.random() < dt * 1.2) game.effects.mote(this.centerX + (Math.random() - 0.5) * 20, this.y + 6);
    if (this.y > map.pixelHeight + 64) this.removed = true;
  }

  /** 回傳是否擊殺；fromAbove 為下劈命中，敵人往下壓而不是彈起（避免撞上玩家） */
  takeHit(damage, dirX, fromAbove = false) {
    if (this.isDead) return false;
    this.hp -= damage;
    this.flashTimer = 0.12;
    this.facing = -dirX;
    this.stateTime = 0;
    if (this.hp <= 0) {
      this.state = 'DEAD';
      this.velocityX = 0;
      return true;
    }
    this.state = 'HURT';
    this.hurtTime = ENEMY_CONFIG.hurtDuration;
    this.animator.play('hurt', true);
    this.velocityX = dirX * ENEMY_CONFIG.knockbackX * (fromAbove ? 0.5 : 1);
    this.velocityY = fromAbove ? ENEMY_CONFIG.knockbackY : -ENEMY_CONFIG.knockbackY;
    this.isGrounded = false;
    return false;
  }

  /** 被圍巾拉向 targetX：剛好停在劍客面前，並短暫硬直 */
  yankToward(targetX) {
    if (this.isDead) return;
    const dist = targetX - this.centerX;
    const dir = Math.sign(dist) || 1;
    const travel = Math.max(0, Math.abs(dist) - 44);
    this.state = 'HURT';
    this.stateTime = 0;
    this.hurtTime = 0.6;
    this.facing = dir;
    this.flashTimer = 0.1;
    this.animator.play('hurt', true);
    this.velocityX = dir * Math.sqrt(2 * 500 * travel);   // HURT 期間以 500 px/s² 減速
    this.velocityY = -180;
    this.isGrounded = false;
  }

  getHitbox() {
    return { x: this.x + 2, y: this.y + 4, width: this.width - 4, height: this.height - 4 };
  }

  render(ctx, cam) {
    const dead = this.isDead;
    const alpha = dead ? Math.max(0, 1 - this.stateTime / ENEMY_CONFIG.deathDuration) : 1;
    const rise = dead ? this.stateTime * 30 : 0;
    const variant = this.flashTimer > 0 || (dead && this.stateTime < 0.1) ? 'flash' : 'image';
    this.animator.draw(ctx, this.centerX - cam.x, this.bottom - cam.y - rise, this.facing < 0, { variant, alpha });
  }
}
