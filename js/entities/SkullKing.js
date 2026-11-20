/**
 * SkullKing —— 骷髏王（魔王，外觀為本專案用 pixelfx 自製的 daoke/skull-king-*，放大 2 倍，約持刀骷髏的兩倍大）
 *
 * 沒有武器，靠一雙巨大的骨拳。只在自己的空地（arena）裡活動，劍客走進空地才開戰。
 * IDLE     朝劍客慢慢走近，等下一招的空檔（recover）
 * POUND    猛捶：雙拳高舉過頭蓄勢，砸向身前的地面（近距離）
 * STOMP    震地板：抬腳重踩，兩道震波沿地面往左右推出去，要跳過（中距離）
 * WINDUP → CHARGE  衝撞：原地抖動閃白蓄勢，然後低頭往前衝；撞到牆或空地邊緣就停下並暈眩（STUN），是反擊的好時機（遠距離）
 * SUMMON   召喚：雙臂高舉，在左右叫出兩隻持刀骷髏（場上少於 2 隻、冷卻好了才會叫）
 * THROW    投擲：身邊有活超過 7 秒的持刀骷髏時，有機率抓起來舉過頭，朝劍客甩出去；
 *          骷髏邊旋轉邊飛（碰到劍客會受傷），落地時自己扣 2 滴血（見 KnifeSkull 的 HELD / THROWN）
 * 被打中不會被擊退（太重了），圍巾也拉不動；身體碰到會受傷。
 */
const SKULL_KING_CONFIG = Object.freeze({
  width: 60, height: 96, hp: 30,
  scale: 2,
  walkSpeed: 55,
  recover: [0.6, 1.1],                       // 每招之間的空檔（秒）
  pound: { duration: 1.1, hit: [0.55, 0.66], reach: 84, height: 70, range: 110 },
  stomp: { duration: 1.0, hit: 0.5, waveSpeed: 230, waveLife: 2.2, waveW: 26, waveH: 28 },
  charge: { windup: 0.55, speed: 340, maxTime: 3.5, stun: 1.1, minRange: 200 },   // 一路衝到空地邊緣才停
  summon: { duration: 1.2, hit: 0.7, first: 4, cooldown: 12, max: 2, offset: 130 },
  // 投擲：抓起身邊（reach 內）活超過 minAge 秒的持刀骷髏，chance 的機率選這招；flight 秒後落在劍客的位置
  throw: { duration: 1.1, grab: 0.15, release: 0.5, minAge: 7, reach: 220, chance: 0.55, flight: 0.8, spin: 16 },
  deathDuration: 1.4
});

const SKULL_KING_SHEETS = {
  IDLE: 'skullKingWalk', WINDUP: 'skullKingCharge', CHARGE: 'skullKingCharge', STUN: 'skullKingWalk',
  POUND: 'skullKingPound', STOMP: 'skullKingStomp', SUMMON: 'skullKingSummon', THROW: 'skullKingThrow', HURT: 'skullKingWalk', DEAD: 'skullKingWalk'
};

class SkullKing extends Enemy {
  /** arena：[左界, 右界]（px），骷髏王不會離開這個範圍 */
  constructor(x, y, arena) {
    const cfg = SKULL_KING_CONFIG;
    super(x, y, { range: 0, hp: cfg.hp });
    this.width = cfg.width;
    this.height = cfg.height;
    this.arena = arena;
    this.state = 'IDLE';
    this.engaged = false;
    this.recover = 1.2;
    this.summonCooldown = cfg.summon.first;
    this.minions = [];
    this.waves = [];
    this.held = null;         // 投擲時抓在手上的持刀骷髏
    this.t = 0;
    this.struck = false;      // 這一招的命中時刻（落地、踩下、召喚）已經處理過
    this.facing = -1;
  }

  get isBoss() { return true; }

  update(dt, map, game) {
    const cfg = SKULL_KING_CONFIG;
    const p = game.player;
    this.stateTime += dt;
    this.flashTimer -= dt;
    this.t += dt;
    this._updateWaves(dt, map);

    if (this.state === 'DEAD') {
      if (Math.random() < dt * 20) game.effects.spiritDeath(this.x + Math.random() * this.width, this.y + Math.random() * this.height);
      if (this.stateTime >= cfg.deathDuration) this.removed = true;
      return;
    }

    const dx = p.centerX - this.centerX;
    const inArena = p.centerX > this.arena[0] && p.centerX < this.arena[1] && Math.abs(p.bottom - this.bottom) < 200;
    if (!this.engaged && inArena && p.state !== PLAYER_STATES.DEATH) {
      this.engaged = true;
      game.audio.play('kingRoar');
      game.camera.shake(3, 0.4);
    }
    this.minions = this.minions.filter((m) => !m.isDead && !m.removed);
    this.summonCooldown -= dt;

    switch (this.state) {
      case 'IDLE': {
        if (!this.engaged || p.state === PLAYER_STATES.DEATH) {
          this.velocityX = 0;
          break;
        }
        if (Math.abs(dx) > 8) this.facing = Math.sign(dx);
        this.velocityX = Math.abs(dx) > 70 ? this.facing * cfg.walkSpeed : 0;
        this.recover -= dt;
        if (this.recover <= 0) this._chooseAttack(dx, game);
        break;
      }
      case 'POUND': {
        this.velocityX = 0;
        if (!this.struck && this.stateTime >= cfg.pound.hit[0]) {
          this.struck = true;
          game.camera.shake(7, 0.35);
          game.hitstop = Math.max(game.hitstop, 0.06);
          game.audio.play('kingSlam');
        }
        if (this.stateTime >= cfg.pound.duration) this._idle();
        break;
      }
      case 'STOMP': {
        this.velocityX = 0;
        if (!this.struck && this.stateTime >= cfg.stomp.hit) {
          this.struck = true;
          for (const dir of [-1, 1]) this.waves.push({ x: this.centerX + dir * 30, dir, t: 0 });
          game.camera.shake(6, 0.4);
          game.audio.play('kingSlam');
        }
        if (this.stateTime >= cfg.stomp.duration) this._idle();
        break;
      }
      case 'WINDUP': {
        this.velocityX = 0;
        if (this.stateTime >= cfg.charge.windup) this._set('CHARGE');
        break;
      }
      case 'CHARGE': {
        this.velocityX = this.facing * cfg.charge.speed;
        if (Math.random() < dt * 25) game.effects.dust(this.centerX - this.facing * 20, this.bottom, -this.facing);
        // 撞到空地邊緣、牆或懸崖：停下暈眩
        const next = this.x + this.velocityX * dt;
        const out = next < this.arena[0] || next + this.width > this.arena[1];
        if (out || !this._groundAhead(map) || this.stateTime >= cfg.charge.maxTime) {
          const crashed = out || !this._groundAhead(map);
          this.velocityX = 0;
          if (crashed) {
            this._set('STUN');
            game.camera.shake(6, 0.3);
            game.audio.play('kingSlam');
            game.effects.sparks(this.facing > 0 ? this.x + this.width : this.x, this.y + 30, -this.facing);
          } else {
            this._idle();
          }
        }
        break;
      }
      case 'STUN': {
        this.velocityX = 0;
        if (Math.random() < dt * 6) game.effects.mote(this.centerX + (Math.random() - 0.5) * 30, this.y);
        if (this.stateTime >= cfg.charge.stun) this._idle();
        break;
      }
      case 'SUMMON': {
        this.velocityX = 0;
        if (!this.struck && this.stateTime >= cfg.summon.hit) {
          this.struck = true;
          this._summon(game, map);
        }
        if (this.stateTime >= cfg.summon.duration) this._idle();
        break;
      }
      case 'THROW':
        this.velocityX = 0;
        this._updateThrow(game);
        if (this.stateTime >= cfg.throw.duration) this._idle();
        break;
      case 'HURT':
        this._set('IDLE');
        break;
    }

    Physics.applyGravity(this, dt);
    const result = Physics.integrate(this, map, dt);
    if (result.hitWall && this.state === 'CHARGE') {
      this._set('STUN');
      game.camera.shake(6, 0.3);
      game.audio.play('kingSlam');
    }
    // 不離開空地
    this.x = Math.max(this.arena[0], Math.min(this.arena[1] - this.width, this.x));

    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.1;
      this.trail.push({ x: this.centerX, y: this.bottom, flip: this.facing < 0, ...this._sprite() });
      if (this.trail.length > 24) this.trail.shift();
    }
  }

  /** 依距離挑下一招：召喚優先，近身猛捶或震地，遠了就衝撞或震地 */
  _chooseAttack(dx, game) {
    const cfg = SKULL_KING_CONFIG;
    const d = Math.abs(dx);
    const prey = this._throwable(game);
    if (prey && Math.random() < cfg.throw.chance) {
      this.held = prey;
      prey.grab(this);
      this._set('THROW');
      game.audio.play('skullWindup');
    } else if (this.summonCooldown <= 0 && this.minions.length < cfg.summon.max) {
      this.summonCooldown = cfg.summon.cooldown;
      this._set('SUMMON');
      game.audio.play('kingRoar');
    } else if (d < cfg.pound.range) {
      this._set(Math.random() < 0.55 ? 'POUND' : 'STOMP');
      game.audio.play('skullWindup');
    } else if (d > cfg.charge.minRange && Math.random() < 0.6) {
      this._set('WINDUP');
      game.audio.play('skullWindup');
    } else if (Math.random() < 0.75) {
      this._set('STOMP');
      game.audio.play('skullWindup');
    } else {
      this.recover = 0.5;   // 再走近一點
      return;
    }
    if (Math.abs(dx) > 8) this.facing = Math.sign(dx);
  }

  /** 身邊活超過 minAge 秒、站在地上、沒在揮刀的持刀骷髏（最近的一隻） */
  _throwable(game) {
    const c = SKULL_KING_CONFIG.throw;
    let best = null, bestD = c.reach;
    for (const e of game.level.enemies) {
      if (!(e instanceof KnifeSkull) || e.isDead || e.age < c.minAge || !e.isGrounded) continue;
      if (e.state !== 'WANDER' && e.state !== 'CHASE') continue;
      const d = Math.abs(e.centerX - this.centerX);
      if (d < bestD && Math.abs(e.bottom - this.bottom) < 40) { best = e; bestD = d; }
    }
    return best;
  }

  /** 手在 skull-king-throw 動畫裡的位置（相對腳底，已放大、已依面向翻轉） */
  _handAt(t) {
    const c = SKULL_KING_CONFIG.throw, S = SKULL_KING_CONFIG.scale;
    const keys = [[0, 18, -16], [c.grab, 24, -18], [0.42, -6, -70], [c.release, -9, -72]];
    let k = keys.length - 1;
    for (let i = 0; i < keys.length - 1; i++) if (t < keys[i + 1][0]) { k = i; break; }
    const a = keys[k], b = keys[Math.min(k + 1, keys.length - 1)];
    const u = b[0] > a[0] ? Math.min(1, (t - a[0]) / (b[0] - a[0])) : 1;
    return [this.centerX + this.facing * (a[1] + (b[1] - a[1]) * u) * S, this.bottom + (a[2] + (b[2] - a[2]) * u) * S];
  }

  /** 抓起 → 舉過頭 → 在 release 那一刻朝劍客甩出（拋物線，flight 秒後落在劍客腳邊） */
  _updateThrow(game) {
    const c = SKULL_KING_CONFIG.throw;
    const m = this.held;
    if (!m) return;
    if (m.isDead || m.state !== 'HELD') {   // 被劍客打下來了
      this.held = null;
      return;
    }
    const p = game.player;
    if (this.stateTime < c.release) {
      if (Math.abs(p.centerX - this.centerX) > 8) this.facing = Math.sign(p.centerX - this.centerX);
      const [hx, hy] = this._handAt(this.stateTime);
      const grab = Math.min(1, this.stateTime / c.grab);
      // 先從站的地方被拉到手上，之後就跟著手（骷髏的中心在拳頭上方一點）
      const tx = hx - m.width / 2, ty = hy - m.height + 10;
      m.x += (tx - m.x) * (grab < 1 ? grab : 1);
      m.y += (ty - m.y) * (grab < 1 ? grab : 1);
      return;
    }
    const T = c.flight, g = PHYSICS.GRAVITY;
    const vx = (p.centerX - m.centerX) / T;
    const vy = (p.bottom - m.bottom - 0.5 * g * T * T) / T;
    m.throwAt(vx, vy, this.facing * c.spin);
    this.held = null;
    game.audio.play('skullSwoop');
    game.camera.shake(3, 0.2);
  }

  _summon(game, map) {
    const cfg = SKULL_KING_CONFIG;
    const T = map.tileSize, c = KNIFE_SKULL_CONFIG;
    for (const dir of [-1, 1]) {
      if (this.minions.length >= cfg.summon.max) break;
      let x = this.centerX + dir * cfg.summon.offset - c.width / 2;
      x = Math.max(this.arena[0] + 8, Math.min(this.arena[1] - c.width - 8, x));
      const m = new KnifeSkull(x, this.bottom - c.height, T);
      m.summoned = true;
      m.state = 'CHASE';
      m.cooldown = 0.8;
      m.facing = Math.sign(game.player.centerX - m.centerX) || 1;
      game.level.enemies.push(m);
      this.minions.push(m);
      game.effects.spiritDeath(m.centerX, m.centerY);
      game.effects.dust(m.centerX, m.bottom);
    }
    game.camera.shake(3, 0.3);
  }

  _groundAhead(map) {
    const T = map.tileSize;
    const aheadX = this.facing > 0 ? this.x + this.width + 4 : this.x - 4;
    const col = Math.floor(aheadX / T);
    const footRow = Math.floor((this.bottom + 2) / T);
    const bodyRow = Math.floor((this.bottom - 8) / T);
    return (map.isSolidAt(col, footRow) || map.isOneWayAt(col, footRow)) && !map.isSolidAt(col, bodyRow);
  }

  _updateWaves(dt, map) {
    const cfg = SKULL_KING_CONFIG.stomp;
    const T = map.tileSize;
    for (const w of this.waves) {
      w.t += dt;
      w.x += w.dir * cfg.waveSpeed * dt;
      // 震波只沿著地面走：前方沒有地面（懸崖）或撞牆就消失
      const col = Math.floor((w.x + w.dir * cfg.waveW / 2) / T);
      const footRow = Math.floor((this.bottom + 2) / T), bodyRow = Math.floor((this.bottom - 4) / T);
      if (!map.isSolidAt(col, footRow) || map.isSolidAt(col, bodyRow)) w.dead = true;
    }
    this.waves = this.waves.filter((w) => !w.dead && w.t < cfg.waveLife && !this.isDead);
  }

  _set(s) {
    this.state = s;
    this.stateTime = 0;
    this.struck = false;
  }

  _idle() {
    const r = SKULL_KING_CONFIG.recover;
    this._set('IDLE');
    this.recover = r[0] + Math.random() * (r[1] - r[0]);
  }

  /** 猛捶的拳頭、地面的震波（由 Combat 檢查） */
  getAttackHitboxes() {
    const cfg = SKULL_KING_CONFIG;
    const boxes = [];
    if (this.state === 'POUND' && this.stateTime >= cfg.pound.hit[0] && this.stateTime < cfg.pound.hit[1]) {
      const b = cfg.pound;
      boxes.push({ x: this.facing > 0 ? this.centerX : this.centerX - b.reach, y: this.bottom - b.height, width: b.reach, height: b.height });
    }
    const s = cfg.stomp;
    for (const w of this.waves) boxes.push({ x: w.x - s.waveW / 2, y: this.bottom - s.waveH, width: s.waveW, height: s.waveH });
    return boxes;
  }

  /** 太重了：被打中只會閃白，不會被擊退或打斷招式 */
  takeHit(damage, dirX) {
    if (this.isDead) return false;
    this.hp -= damage;
    this.flashTimer = 0.1;
    if (this.hp <= 0) {
      this._set('DEAD');
      this.velocityX = 0;
      this.waves = [];
      if (this.held) { this.held.throwAt(0, 0, 0); this.held = null; }   // 手上的骷髏掉下來
      return true;
    }
    return false;
  }

  /** 圍巾拉不動 */
  yankToward() {
    if (!this.isDead) this.flashTimer = 0.1;
  }

  getHitbox() {
    return { x: this.x + 6, y: this.y + 10, width: this.width - 12, height: this.height - 10 };
  }

  _sprite() {
    const sheets = window.FX_SHEETS || {};
    const name = SKULL_KING_SHEETS[this.state] || 'skullKingWalk';
    const s = sheets[name];
    if (!s) return { sheet: name, frame: 0 };
    let frame;
    if (['POUND', 'STOMP', 'SUMMON', 'THROW'].includes(this.state)) frame = Math.min(s.frames - 1, Math.floor(this.stateTime * s.fps));
    else if (this.state === 'WINDUP' || this.state === 'STUN' || (this.state === 'IDLE' && Math.abs(this.velocityX) < 1)) frame = 0;
    else frame = Math.floor(this.t * s.fps) % s.frames;
    return { sheet: name, frame };
  }

  render(ctx, cam) {
    const cfg = SKULL_KING_CONFIG;
    const fx = FxSheets.shared;
    const dead = this.isDead;
    const alpha = dead ? Math.max(0, 1 - this.stateTime / cfg.deathDuration) : 1;
    const flash = this.flashTimer > 0 || (this.state === 'WINDUP' && Math.floor(this.stateTime * 14) % 2 === 0);
    // 蓄勢衝撞時原地抖動、暈眩時左右晃
    const shake = this.state === 'WINDUP' ? Math.round(Math.sin(this.stateTime * 80) * 2) : this.state === 'STUN' ? Math.round(Math.sin(this.stateTime * 12) * 2) : 0;
    for (const w of this.waves) {
      if (fx && fx.ready('skullShockwave')) {
        const s = FX_SHEETS.skullShockwave;
        fx.drawFrame(ctx, 'skullShockwave', Math.floor(w.t * s.fps) % s.frames, w.x - cam.x, this.bottom - cam.y, { flipX: w.dir < 0, scale: cfg.scale });
      }
    }
    const { sheet, frame } = this._sprite();
    if (fx && fx.ready(sheet)) {
      fx.drawFrame(ctx, sheet, frame, this.centerX + shake - cam.x, this.bottom - cam.y, {
        flipX: this.facing < 0, variant: flash ? 'flash' : null, alpha, scale: cfg.scale
      });
    } else {
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(Math.round(this.x - cam.x), Math.round(this.y - cam.y), this.width, this.height);
    }
  }

  drawGhost(ctx, cam, s, alpha) {
    const fx = FxSheets.shared;
    if (!fx || !fx.ready(s.sheet)) return;
    fx.drawFrame(ctx, s.sheet, s.frame, s.x - cam.x, s.y - cam.y, { flipX: s.flip, variant: 'ghost', alpha, scale: SKULL_KING_CONFIG.scale });
  }
}
