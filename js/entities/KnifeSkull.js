/**
 * KnifeSkull —— 持刀骷髏（地面小怪，外觀為本專案用 pixelfx 自製的 daoke/knife-skull-walk、knife-skull-slash，放大 2 倍）
 *
 * WANDER  沒發現劍客時在出生點附近慢慢走，遇到牆、尖刺或懸崖就轉身
 * CHASE   劍客在偵測範圍內（水平 detectRange、高度差 detectHeight 以內）就快步追過去；
 *         前方是懸崖（腳下沒有地面）、牆或尖刺時停在邊緣，面向劍客等著，不會自己掉下去
 * ATTACK  靠近到 attackRange 就停下揮刀：蓄勢（刀舉到頭後）→ 劈下（判定 hitWindow）→ 收刀，之後冷卻一下再追
 * 身體碰到劍客不會受傷，只有刀會砍人；被打中會中斷揮刀（受擊、死亡沿用 Enemy）。
 * HELD     被骷髏王抓在手上（位置由骷髏王決定，自己不動）
 * THROWN   被骷髏王丟出去：邊旋轉邊沿拋物線飛，碰到劍客會受傷；落地（或撞牆）時自己扣 thrownSelfDamage 滴血
 */
const KNIFE_SKULL_CONFIG = Object.freeze({
  width: 24, height: 44, hp: 3,
  wanderSpeed: 32, wanderRange: 3,      // 閒晃速度、離出生點最遠幾格
  chaseSpeed: 96,                       // 追擊速度（劍客跑速 190 的一半，甩得掉）
  detectRange: 280, detectHeight: 90,   // 偵測範圍：水平距離、高度差
  loseRange: 440,                       // 追擊中劍客跑到這麼遠才放棄（比八格深谷寬一些：劍客跳過深谷時會追到崖邊瞪著）
  attackRange: 50,                      // 兩者中心水平距離小於這個就揮刀
  attackDuration: 0.75,                 // 與 knife-skull-slash 的長度相同
  hitWindow: [0.32, 0.42],              // 劈下的判定時間（knife-skull-slash 的 HIT = 0.32）
  attackBox: { reach: 50, height: 40, offsetY: 4 },   // 刀的判定：身體中心往前 reach、腳底往上 height
  cooldown: [0.5, 0.9],                 // 揮完刀後隔多久才會再揮（亂數）
  scale: 2,                             // sheet 是 pixelfx 原比例，遊戲中放大 2 倍
  thrownSelfDamage: 2                   // 被骷髏王丟出去、落地時自己扣的血
});

class KnifeSkull extends Enemy {
  constructor(x, y, tileSize = 32) {
    const cfg = KNIFE_SKULL_CONFIG;
    super(x, y, { range: cfg.wanderRange, hp: cfg.hp }, tileSize);
    this.width = cfg.width;
    this.height = cfg.height;
    this.state = 'WANDER';
    this.cooldown = 0;
    this.t = Math.random() * 10;
    this.slashHit = false;
    this.age = 0;             // 出生（或被召喚）後活了幾秒：骷髏王只會抓活超過 7 秒的
    this.spin = 0;            // 被丟出去時的旋轉角度與角速度
    this.spinRate = 0;
  }

  /** 被骷髏王抓起來 */
  grab() {
    this._setState('HELD');
    this.velocityX = this.velocityY = 0;
    this.isGrounded = false;
    this.spin = 0;
  }

  /** 被骷髏王丟出去（vx, vy 是初速度，spinRate 是每秒轉幾弧度） */
  throwAt(vx, vy, spinRate) {
    this._setState('THROWN');
    this.velocityX = vx;
    this.velocityY = vy;
    this.spinRate = spinRate;
    this.isGrounded = false;
  }

  /** 身體碰到不會受傷，只有刀會砍人 */
  get harmless() { return true; }

  update(dt, map, game) {
    const cfg = KNIFE_SKULL_CONFIG;
    const p = game.player;
    this.stateTime += dt;
    this.flashTimer -= dt;
    this.cooldown -= dt;
    this.t += dt;
    this.age += dt;

    if (this.state === 'HELD') return;   // 骷髏王拿著：位置由它決定
    if (this.state === 'THROWN') {
      this._flyThrown(dt, map, game);
      return;
    }

    if (this.state === 'DEAD') {
      if (this.stateTime >= ENEMY_CONFIG.deathDuration) this.removed = true;
      Physics.applyGravity(this, dt);
      Physics.integrate(this, map, dt);
      return;
    }

    const dx = p.centerX - this.centerX, dy = p.centerY - this.centerY;
    const alive = p.state !== PLAYER_STATES.DEATH;
    const sees = alive && Math.abs(dx) < cfg.detectRange && Math.abs(dy) < cfg.detectHeight;

    if (this.state === 'HURT') {
      this.velocityX = Physics.approach(this.velocityX, 0, 500 * dt);
      if (this.stateTime >= this.hurtTime) this._setState(sees ? 'CHASE' : 'WANDER');
    } else if (this.state === 'ATTACK') {
      this.velocityX = Physics.approach(this.velocityX, 0, 900 * dt);
      if (!this.slashHit && this.stateTime >= cfg.hitWindow[0]) {
        this.slashHit = true;
        game.audio.play('slash');
      }
      if (this.stateTime >= cfg.attackDuration) {
        this.cooldown = cfg.cooldown[0] + Math.random() * (cfg.cooldown[1] - cfg.cooldown[0]);
        this._setState(sees ? 'CHASE' : 'WANDER');
      }
    } else if (this.state === 'CHASE') {
      if (!alive || Math.abs(dx) > cfg.loseRange || Math.abs(dy) > cfg.detectHeight * 1.5) {
        this.patrolMin = this.x - cfg.wanderRange * map.tileSize;   // 跟丟了：就在這裡閒晃
        this.patrolMax = this.x + cfg.wanderRange * map.tileSize;
        this._setState('WANDER');
      } else {
        if (Math.abs(dx) > 4) this.facing = Math.sign(dx);
        if (Math.abs(dx) < cfg.attackRange && Math.abs(dy) < 60 && this.cooldown <= 0 && this.isGrounded) {
          this._setState('ATTACK');
          this.slashHit = false;
          this.velocityX = 0;
        } else {
          // 懸崖、牆或尖刺擋在前面：停在邊緣等著；劍客就在面前（冷卻中）也停下，不會貼上去
          const stop = !this._canStep(map) || Math.abs(dx) < cfg.attackRange * 0.7;
          this.velocityX = stop ? Physics.approach(this.velocityX, 0, 900 * dt) : this.facing * cfg.chaseSpeed;
        }
      }
    } else {   // WANDER
      if (sees) {
        this._setState('CHASE');
      } else {
        const outOfRange = (this.facing > 0 && this.x >= this.patrolMax) || (this.facing < 0 && this.x <= this.patrolMin);
        if (this.isGrounded && (!this._canStep(map) || outOfRange)) this.facing *= -1;
        this.velocityX = this.facing * cfg.wanderSpeed;
      }
    }

    Physics.applyGravity(this, dt);
    const result = Physics.integrate(this, map, dt);
    if (result.hitWall && this.state === 'WANDER') this.facing *= -1;

    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.1;
      this.trail.push({ x: this.centerX, y: this.bottom, flip: this.facing < 0, ...this._sprite() });
      if (this.trail.length > 24) this.trail.shift();
    }
    if (this.y > map.pixelHeight + 64) this.removed = true;
  }

  /** 旋轉飛行，落地或撞牆時自己扣血；摔不死就暈一下再起來追 */
  _flyThrown(dt, map, game) {
    this.spin += this.spinRate * dt;
    Physics.applyGravity(this, dt);
    const result = Physics.integrate(this, map, dt);
    if (Math.random() < dt * 30) game.effects.mote(this.centerX, this.centerY);
    if (this.isGrounded || result.hitWall || this.y > map.pixelHeight + 64) {
      this.spin = 0;
      this.velocityX *= 0.2;
      this.hp -= KNIFE_SKULL_CONFIG.thrownSelfDamage;
      this.flashTimer = 0.15;
      game.camera.shake(3, 0.15);
      game.effects.dust(this.centerX, this.bottom);
      game.audio.play('potBreak');
      if (this.hp <= 0) {
        this._setState('DEAD');
        this.velocityX = 0;
        game.effects.spiritDeath(this.centerX, this.centerY);
      } else {
        this._setState('HURT');
        this.hurtTime = 0.6;
        this.cooldown = Math.max(this.cooldown, 0.5);
      }
    }
    if (this.y > map.pixelHeight + 64) this.removed = true;
  }

  /**
   * 辨識懸崖：往前一步的腳下有沒有地面（實心或木板），身體高度有沒有牆或尖刺。
   * 只在地面上判斷；空中（被打飛）時不管。
   */
  _canStep(map) {
    if (!this.isGrounded) return true;
    const T = map.tileSize;
    const aheadX = this.facing > 0 ? this.x + this.width + 2 : this.x - 2;
    const col = Math.floor(aheadX / T);
    const footRow = Math.floor((this.bottom + 2) / T);
    const bodyRow = Math.floor((this.bottom - 2) / T);
    const ground = map.isSolidAt(col, footRow) || map.isOneWayAt(col, footRow);
    const blocked = map.isSolidAt(col, bodyRow) || map.isHazardAt(col, bodyRow) || map.isHazardAt(col, footRow);
    return ground && !blocked;
  }

  _setState(s) {
    this.state = s;
    this.stateTime = 0;
  }

  /** 劈下的那一小段時間回傳刀的判定框，其他時候是 null（由 Combat 檢查） */
  getAttackHitbox() {
    const cfg = KNIFE_SKULL_CONFIG;
    if (this.state === 'THROWN') return this.getHitbox();   // 被丟過來的骷髏本身就是武器
    if (this.state !== 'ATTACK' || this.stateTime < cfg.hitWindow[0] || this.stateTime >= cfg.hitWindow[1]) return null;
    const b = cfg.attackBox;
    return {
      x: this.facing > 0 ? this.centerX : this.centerX - b.reach,
      y: this.bottom - b.height - b.offsetY,
      width: b.reach,
      height: b.height
    };
  }

  takeHit(damage, dirX, fromAbove = false) {
    const killed = super.takeHit(damage, dirX, fromAbove);
    this.cooldown = Math.max(this.cooldown, 0.3);   // 被打斷後不會馬上反砍
    return killed;
  }

  getHitbox() {
    return { x: this.x + 2, y: this.y + 4, width: this.width - 4, height: this.height - 4 };
  }

  /** 目前要畫的 sheet 與格數：揮刀時播 knife-skull-slash，其餘播走路循環（停下時停在站姿那一格） */
  _sprite() {
    const sheets = window.FX_SHEETS || {};
    if (this.state === 'ATTACK' && sheets.knifeSkullSlash) {
      const s = sheets.knifeSkullSlash;
      return { sheet: 'knifeSkullSlash', frame: Math.min(s.frames - 1, Math.floor(this.stateTime * s.fps)) };
    }
    const s = sheets.knifeSkullWalk;
    if (!s) return { sheet: 'knifeSkullWalk', frame: 0 };
    const moving = Math.abs(this.velocityX) > 8 && this.state !== 'HURT';
    // 追擊時腳步快一點
    const rate = this.state === 'CHASE' ? 1.6 : 1;
    return { sheet: 'knifeSkullWalk', frame: moving ? Math.floor(this.t * s.fps * rate) % s.frames : 0 };
  }

  render(ctx, cam) {
    const fx = FxSheets.shared;
    const dead = this.isDead;
    const alpha = dead ? Math.max(0, 1 - this.stateTime / ENEMY_CONFIG.deathDuration) : 1;
    const flash = this.flashTimer > 0 || (dead && this.stateTime < 0.1);
    const { sheet, frame } = this._sprite();
    if (fx && fx.ready(sheet) && this.spin) {
      // 被丟出去：以身體中心為軸旋轉
      ctx.save();
      ctx.translate(Math.round(this.centerX - cam.x), Math.round(this.centerY - cam.y));
      ctx.rotate(this.spin);
      fx.drawFrame(ctx, sheet, frame, 0, this.height / 2, { flipX: this.facing < 0, variant: flash ? 'flash' : null, alpha, scale: KNIFE_SKULL_CONFIG.scale });
      ctx.restore();
    } else if (fx && fx.ready(sheet)) {
      fx.drawFrame(ctx, sheet, frame, this.centerX - cam.x, this.bottom - cam.y, {
        flipX: this.facing < 0, variant: flash ? 'flash' : null, alpha, scale: KNIFE_SKULL_CONFIG.scale
      });
    } else {
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(Math.round(this.x - cam.x), Math.round(this.y - cam.y), this.width, this.height);
    }
  }

  drawGhost(ctx, cam, s, alpha) {
    const fx = FxSheets.shared;
    if (!fx || !fx.ready(s.sheet)) return;
    fx.drawFrame(ctx, s.sheet, s.frame, s.x - cam.x, s.y - cam.y, { flipX: s.flip, variant: 'ghost', alpha, scale: KNIFE_SKULL_CONFIG.scale });
  }
}
