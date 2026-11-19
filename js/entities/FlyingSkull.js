/**
 * FlyingSkull —— 火焰骷髏（飛行敵人，外觀取自 pixelfx 的 critters/flying-skull）
 *
 * HOVER   在出生點附近上下飄浮；玩家進入偵測範圍就開始蓄勢
 * WINDUP  原地抖動、火焰變亮，提示即將俯衝
 * SWOOP   朝玩家俯衝；弱追蹤：只在前 homingTime 秒、劍客還在前方時轉向，每秒最多轉 turnRate，跳開或衝刺就閃得掉
 * RECOVER 撞到地形或衝完後飛回出生點，冷卻後才會再出手
 * 不受重力、不走地形碰撞（只在俯衝撞到實心圖塊時停下）；接觸傷害、受擊、死亡沿用 Enemy。
 */
const SKULL_CONFIG = Object.freeze({
  size: 26, hp: 2,
  detectRange: 230,                   // 玩家在這個距離內就開始蓄勢
  windup: 0.45,
  swoopSpeed: 170, turnRate: 0.6,     // 比跑速（190）慢：往遠離的方向跑就甩得掉；每秒最多轉 0.6 弧度（約 35 度）
  homingTime: 0.5,                    // 只在俯衝的前 0.5 秒追蹤；衝過劍客後也不再轉頭
  swoopTime: 1.3,
  returnSpeed: 110, cooldown: 1.2,
  bob: 6,                             // 飄浮時上下晃動的幅度
  spriteLift: 40                      // pixelfx 圖的骷髏在錨點（地面）上方 40px
});

class FlyingSkull extends Enemy {
  constructor(x, y) {
    super(x, y, { range: 0, hp: SKULL_CONFIG.hp });
    this.width = this.height = SKULL_CONFIG.size;
    this.homeX = x;
    this.homeY = y;
    this.state = 'HOVER';
    this.cooldown = 0;
    this.heading = 0;
    this.t = Math.random() * 10;
  }

  update(dt, map, game) {
    const cfg = SKULL_CONFIG;
    const p = game.player;
    this.stateTime += dt;
    this.flashTimer -= dt;
    this.cooldown -= dt;
    this.t += dt;

    if (this.state === 'DEAD') {
      // 熄火落下並淡出
      this.velocityY += 400 * dt;
      this.y += this.velocityY * dt;
      if (this.stateTime >= ENEMY_CONFIG.deathDuration) this.removed = true;
      return;
    }

    const dx = p.centerX - this.centerX, dy = p.centerY - this.centerY;
    const dist = Math.hypot(dx, dy);
    const playerAlive = p.state !== PLAYER_STATES.DEATH;

    if (this.state === 'HURT') {
      // 與地面妖怪相同的 500 px/s² 減速：被圍巾拉近時剛好停在劍客面前
      this.velocityX = Physics.approach(this.velocityX, 0, 500 * dt);
      this.velocityY = Physics.approach(this.velocityY, 0, 500 * dt);
      if (this.stateTime >= this.hurtTime) this._setState('RECOVER');
    } else if (this.state === 'HOVER') {
      const tx = this.homeX, ty = this.homeY + Math.sin(this.t * 2.2) * cfg.bob;
      this.velocityX = (tx - this.x) * 3;
      this.velocityY = (ty - this.y) * 3;
      if (Math.abs(dx) > 4) this.facing = Math.sign(dx);
      if (playerAlive && this.cooldown <= 0 && dist < cfg.detectRange) {
        this._setState('WINDUP');
        game.audio.play('skullWindup');
      }
    } else if (this.state === 'WINDUP') {
      this.velocityX = this.velocityY = 0;
      if (Math.abs(dx) > 4) this.facing = Math.sign(dx);
      if (this.stateTime >= cfg.windup) {
        this.heading = Math.atan2(dy, dx);
        this._setState('SWOOP');
        game.audio.play('skullSwoop');
      }
    } else if (this.state === 'SWOOP') {
      // 弱追蹤：俯衝前段、劍客還在前方時才轉向，而且每秒只能轉 turnRate
      const ahead = dx * Math.cos(this.heading) + dy * Math.sin(this.heading) > 0;
      if (playerAlive && ahead && this.stateTime < cfg.homingTime) {
        let diff = Math.atan2(dy, dx) - this.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const maxTurn = cfg.turnRate * dt;
        this.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));
      }
      this.velocityX = Math.cos(this.heading) * cfg.swoopSpeed;
      this.velocityY = Math.sin(this.heading) * cfg.swoopSpeed;
      if (Math.abs(this.velocityX) > 1) this.facing = Math.sign(this.velocityX);
      if (Math.random() < dt * 30) game.effects.ember(this.centerX - this.velocityX * 0.05, this.centerY - this.velocityY * 0.05);
      if (this.stateTime >= cfg.swoopTime) this._setState('RECOVER');
    } else if (this.state === 'RECOVER') {
      const hx = this.homeX - this.x, hy = this.homeY - this.y, hd = Math.hypot(hx, hy);
      if (hd < 6) {
        this.cooldown = cfg.cooldown;
        this._setState('HOVER');
      } else {
        this.velocityX = hx / hd * cfg.returnSpeed;
        this.velocityY = hy / hd * cfg.returnSpeed;
        if (Math.abs(hx) > 4) this.facing = Math.sign(hx);
      }
    }

    this._fly(dt, map);

    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.1;
      this.trail.push({ x: this.centerX, y: this.bottom, flip: this.facing < 0, frame: this._frame() });
      if (this.trail.length > 24) this.trail.shift();
    }
    if (Math.random() < dt * 4) game.effects.ember(this.centerX + (Math.random() - 0.5) * 14, this.y);
  }

  /** 飛回原位與受擊時不造成接觸傷害（不會在回程又撞一次） */
  get harmless() {
    return this.state === 'RECOVER' || this.state === 'HURT';
  }

  /** 撞到劍客就收招飛回 */
  onHitPlayer() {
    if (this.state === 'SWOOP' || this.state === 'WINDUP') this._setState('RECOVER');
  }

  _setState(s) {
    this.state = s;
    this.stateTime = 0;
  }

  /** 飛行移動：只在撞到實心圖塊時停下（俯衝中撞牆或撞地就收招） */
  _fly(dt, map) {
    const nx = this.x + this.velocityX * dt, ny = this.y + this.velocityY * dt;
    const T = map.tileSize;
    const solid = (x, y) => map.isSolidAt(Math.floor(x / T), Math.floor(y / T));
    const s = this.width;
    const hit = solid(nx, ny) || solid(nx + s, ny) || solid(nx, ny + s) || solid(nx + s, ny + s);
    if (hit && this.state !== 'RECOVER') {
      this.velocityX = this.velocityY = 0;
      if (this.state === 'SWOOP') this._setState('RECOVER');
      return;
    }
    this.x = nx;
    this.y = ny;
  }

  takeHit(damage, dirX, fromAbove = false) {
    const killed = super.takeHit(damage, dirX, fromAbove);
    if (!killed) {
      // 被打中會打斷俯衝，往被打的方向飛開
      this.velocityY = fromAbove ? 160 : -120;
    } else {
      this.velocityY = -60;
    }
    return killed;
  }

  /** 被圍巾拉到劍客面前（飛行敵人連高度一起拉過來） */
  yankToward(targetX) {
    super.yankToward(targetX);
    this.velocityY = 0;
  }

  getHitbox() {
    return { x: this.x + 2, y: this.y + 2, width: this.width - 4, height: this.height - 4 };
  }

  _frame() {
    const s = window.FX_SHEETS && FX_SHEETS.skull;
    return s ? Math.floor(this.t * s.fps) % s.frames : 0;
  }

  /** 圖的錨點在骷髏下方 spriteLift；蓄勢時抖動 */
  _anchor() {
    const shake = this.state === 'WINDUP' ? Math.round(Math.sin(this.stateTime * 70) * 2) : 0;
    return [this.centerX + shake, this.centerY + SKULL_CONFIG.spriteLift];
  }

  render(ctx, cam) {
    const fx = FxSheets.shared;
    const dead = this.isDead;
    const alpha = dead ? Math.max(0, 1 - this.stateTime / ENEMY_CONFIG.deathDuration) : 1;
    const flash = this.flashTimer > 0 || (dead && this.stateTime < 0.1) || (this.state === 'WINDUP' && Math.floor(this.stateTime * 12) % 2 === 0);
    const [x, y] = this._anchor();
    if (fx && fx.ready('skull')) {
      fx.drawFrame(ctx, 'skull', this._frame(), x - cam.x, y - cam.y, { flipX: this.facing < 0, variant: flash ? 'flash' : null, alpha });
    } else {
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(Math.round(this.x - cam.x), Math.round(this.y - cam.y), this.width, this.height);
    }
  }

  /** 殘影視界中的移動軌跡 */
  drawGhost(ctx, cam, s, alpha) {
    const fx = FxSheets.shared;
    if (!fx || !fx.ready('skull')) return;
    fx.drawFrame(ctx, 'skull', s.frame, s.x - cam.x, s.y - this.height / 2 + SKULL_CONFIG.spriteLift - cam.y, { flipX: s.flip, variant: 'ghost', alpha });
  }
}
