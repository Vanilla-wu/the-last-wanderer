/**
 * Player —— 獨眼流浪劍客（GDD 2.3、2.4、3.3）
 *
 * 由有限狀態機控制，同一時間只處於一個主要狀態。
 * 進階操作：Coyote Time、Jump Buffer、Variable Jump Height。
 */
const PLAYER_STATES = Object.freeze({
  IDLE: 'IDLE', RUN: 'RUN', JUMP: 'JUMP', FALL: 'FALL',
  ATTACK: 'ATTACK', HURT: 'HURT', DODGE: 'DODGE', DEATH: 'DEATH',
  CHARGE: 'CHARGE', CHARGE_SLASH: 'CHARGE_SLASH', SPIRAL: 'SPIRAL', SCARF: 'SCARF'
});

const ANIM_FOR_STATE = {
  IDLE: 'idle', RUN: 'run', JUMP: 'jump', FALL: 'fall',
  ATTACK: 'attack', HURT: 'hurt', DODGE: 'dodge', DEATH: 'death',
  CHARGE: 'charge', CHARGE_SLASH: 'dashSlash', SPIRAL: 'spin', SCARF: 'scarf'
};

// 這些狀態自行決定何時結束，不會被移動狀態（IDLE / RUN / JUMP / FALL）覆蓋
const ACTION_STATES = new Set(['ATTACK', 'HURT', 'DODGE', 'CHARGE', 'CHARGE_SLASH', 'SPIRAL', 'SCARF']);

const PLAYER_CONFIG = Object.freeze({
  width: 28, height: 80,
  speed: 190,
  groundAccel: 2000, groundDecel: 2400, airAccel: 1300, airDecel: 700,
  jumpForce: 640, jumpCutMultiplier: 0.45, fallGravityMultiplier: 1.2,
  coyoteTime: 0.1, jumpBufferTime: 0.12,
  maxHp: 3,
  attackDuration: 0.3,
  attackCooldown: 0.3, attackDamage: 1,
  attackMoveFactor: 0.1,     // 橫斬三連擊時地面上的移動速度（上劈、下劈不減速）
  attackAirMoveFactor: 0.5,  // 橫斬三連擊時空中的移動速度
  // 橫斬連段：揮刀中再按 J 預約下一擊，最多三段；不再按就在該段結束時收刀
  comboDuration: 0.24,     // 第一、二擊的長度（上劈、下劈仍是 attackDuration）
  comboInputStart: 0.05,   // 揮刀多久後開始接受下一擊的輸入
  comboChainTime: 0.3,     // 連按時在這個時間點接上下一擊（比單按的收刀晚，預約了就停在出刀姿勢等著接）
  comboWindow: 0.3,        // 收刀後仍可接續下一擊的時間
  attackBufferTime: 0.25,  // J 的輸入緩衝（命中停頓期間按下也不會漏掉）
  finisherDuration: 0.62, finisherWindow: [0.09, 0.21], finisherCooldown: 0.72,   // 重劈後停久一點，壓低身子再慢慢起身
  finisherDamage: 2, finisherBox: { width: 84, height: 64, offsetY: 6 },
  finisherStep: [0.07, 0.15], finisherStepSpeed: 230, finisherKnockback: 1.7,
  attackBox: { width: 64, height: 60, offsetY: 8 },
  // 上劈 / 下劈：判定時間與判定框（相對於角色中心與頭頂）
  attackWindows: { side: [0.04, 0.16], up: [0.06, 0.2], down: [0.04, 0.24] },
  upAttackBox: { width: 80, height: 60, offsetY: -34 },
  downAttackBox: { width: 68, height: 66, offsetY: 46 },
  pogoForce: 560, pogoGrace: 0.15,
  doubleJumpForce: 560,
  hurtDuration: 0.35, invulnerableTime: 1.1, knockbackX: 230, knockbackY: 330,
  // 衝刺（K，需取得疾風之履）：期間無敵，空中每次滯空限一次
  dodgeDuration: 0.2, dodgeSpeed: 430, dodgeCooldown: 0.6,
  // 蓄力：揮刀後持續按住 J 進入蓄力，蓄滿後放開使出衝刺斬（按住 W 則為旋風斬）
  chargeTime: 0.5, chargeMoveFactor: 0.3,
  // 衝刺斬（蓄滿後放開 J）：動作取自 pixelfx 的 moves/dash-strike——壓低身子、疾衝穿過敵人、劈下。
  // 原作衝 116 單位（放大後約 7 格）會讓衝刺斬直接飛越深谷，這裡只衝約 4 格，也不跳回原位
  dashSlashWindup: 0.06, dashSlashDash: 0.14, dashSlashDistance: 128,
  dashSlashCut: 0.22, dashSlashCutLength: 0.08, dashSlashDuration: 0.5,
  chargeSlashDamage: 2, chargeSlashBox: { width: 72, height: 60, offsetY: 8 },
  dashSlashReach: 40,      // 疾衝時身前多少範圍內的敵人會被斬到
  // 旋風斬：蓄滿後按住 W 再放開 J，原地旋身騰起，連斬周圍三次（最後一擊把敵人甩開）。動作與刀光取自 pixelfx 的 melee/spin-slash
  spiralDuration: 0.5, spiralHits: [0.06, 0.2, 0.34], spiralHitLength: 0.08,
  spiralDamage: 1, spiralFinalKnockback: 1.6,
  spiralBox: { width: 124, height: 120, below: 40 },   // below：判定往腳下延伸，騰起後仍打得到地上的敵人
  spiralLift: 220, spiralAirLift: 150, spiralGravity: 0.35, spiralMoveFactor: 0.55,
  // 風縛（I，需取得蒼風之結）：圍巾延伸抓住風鈴、鈴緒或妖怪
  scarfRange: 250, scarfTipSpeed: 1500, scarfRetractSpeed: 1800, scarfCooldown: 0.3,
  scarfPullSpeed: 620, scarfMaxPull: 0.7, scarfRelease: 0.9,
  dropThroughTime: 0.22
});

const ATTACK_ANIMS = { side: 'attack', up: 'attackUp', down: 'attackDown' };
// 三連擊的動作取自 pixelfx 的 moves/sword-combo（Sprites.playerCombo），節奏維持原本的連段：
// 把 pixelfx 時間軸上的一段對到遊戲裡的「開始、判定開始、收刀」，中間線性壓縮。
// 只取刀舉到最高之後到出刀後停住的那一段：不從架刀開始蓄勢，也不演完收刀回架勢，手感才俐落
const COMBO_ANIMS = ['combo1', 'combo2', 'combo3'];
const COMBO_TIMING = [
  { game: [0, 0.04, 0.24], src: [0.25, 0.67, 0.82] },              // 斜劈：刀在頭後 → 揮到前下方
  { game: [0, 0.04, 0.09, 0.24], src: [0.08, 0.2, 0.3, 0.36] },    // 交叉雙斬（兩刀）
  { game: [0, 0.09, 0.62], src: [0.4, 0.64, 1.45] }                // 雙手重劈：高舉 → 劈進地面 → 壓低收勢 → 起身
];
const COMBO_SLASHES = ['side', 'side2', 'side3'];
const COMBO_SOUNDS = ['slash', 'slash2', 'slash3'];
// 衝刺斬：遊戲時間（開始、衝出、衝完、劈下、收刀）對到 dash-strike 時間軸（壓低、衝出、衝完、劈下、收勢）
const DASH_SLASH_TIMING = { game: [0, 0.06, 0.2, 0.22, 0.5], src: [0, 0.16, 0.3, 0.38, 0.91] };

class Player extends Entity {
  /** progress：撿到的能力與生命上限（由 Game 保存，死亡重來也不會失去） */
  constructor(x, y, progress = { abilities: {}, maxHp: PLAYER_CONFIG.maxHp }) {
    super(x, y, PLAYER_CONFIG.width, PLAYER_CONFIG.height);
    this.cfg = PLAYER_CONFIG;
    this.speed = PLAYER_CONFIG.speed;
    this.jumpForce = PLAYER_CONFIG.jumpForce;
    this.gravity = PHYSICS.GRAVITY;
    this.abilities = { dash: false, doubleJump: false, chargeSlash: false, vision: false, scarf: false, ...progress.abilities };
    this.scarf = null;          // 圍巾目前的狀態（延伸、拉動、收回）
    this.scarfCooldown = 0;
    this.releasedAnchor = null; // 剛放開的風鈴：短時間內不會再被選中，才能接著抓下一個
    this.releasedTimer = 0;
    this.scarfBuffer = 0;       // I 的輸入緩衝：揮刀中提早按下也不會漏掉
    this.airDashAvailable = true;   // 每次離地只能空中衝刺一次
    this.airSpiralLift = true;      // 旋風斬的騰起每次離地只有一次，避免連續旋風斬一路飛高
    this.spiralHit = 0;             // 旋風斬目前是第幾斬（0 = 尚未出手）
    this.maxHp = progress.maxHp;
    this.hp = this.maxHp;
    this.airJumpsLeft = 0;
    this.attackDir = 'side';
    this.comboStep = 0;       // 目前是橫斬連段的第幾擊（1–3），上劈 / 下劈為 0
    this.comboQueued = false;
    this.comboTimer = 0;
    this.attackBuffer = 0;
    this.pogoUsed = false;

    this.animator = new Animator(Sprites.player, ...(Sprites.playerCombo ? [Sprites.playerCombo] : []));
    this.state = PLAYER_STATES.IDLE;
    this.stateTime = 0;
    this.animator.play('idle');

    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.isJumping = false;
    this.attackCooldown = 0;
    this.dodgeCooldown = 0;
    this.invulnTimer = 0;
    this.graceTimer = 0;       // 下劈彈起、衝刺斬疾衝時的短暫保護（不閃爍）
    this.dropTimer = 0;
    this.afterimageTimer = 0;
    this.deathTimer = 0;
    this.slashSpawned = false;
    this.charged = false;
    this.dashPhase = null;     // 衝刺斬：windup 壓低 / dash 疾衝
    this.hitTargets = new Set();
    this.controlsLocked = false;

    this.safeX = x;
    this.safeY = y;
  }

  setState(next) {
    if (this.state === next) return;
    this.state = next;
    this.stateTime = 0;
    this.animator.play(ANIM_FOR_STATE[next], true);
  }

  isInvulnerable() {
    return this.invulnTimer > 0 || this.graceTimer > 0 || this.state === PLAYER_STATES.DODGE;
  }

  update(dt, input, game) {
    const cfg = this.cfg;
    const map = game.level.tilemap;
    const S = PLAYER_STATES;

    this.stateTime += dt;
    this.attackCooldown -= dt;
    this.dodgeCooldown -= dt;
    this.invulnTimer -= dt;
    this.graceTimer -= dt;
    this.comboTimer -= dt;
    this.scarfCooldown -= dt;
    this.releasedTimer -= dt;
    this.scarfBuffer -= dt;
    this.attackBuffer -= dt;
    this.bufferInput(input);
    this.dropTimer -= dt;
    this.dropThrough = this.dropTimer > 0;
    this.animator.update(dt);

    if (this.state === S.DEATH) {
      this.deathTimer += dt;
      this.velocityX = Physics.approach(this.velocityX, 0, 900 * dt);
      Physics.applyGravity(this, dt);
      this._move(map, dt, game);
      return;
    }

    const locked = this.controlsLocked;
    const move = locked ? 0 : (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);

    // Jump Buffer：提前按下跳躍，落地瞬間仍會觸發
    if (!locked && input.wasPressed('jump')) this.jumpBufferTimer = cfg.jumpBufferTime;
    else this.jumpBufferTimer -= dt;
    // Coyote Time：離開平台後短暫仍可起跳
    if (this.isGrounded) {
      this.coyoteTimer = cfg.coyoteTime;
      this.airJumpsLeft = this.abilities.doubleJump ? 1 : 0;
      this.airDashAvailable = true;
      this.airSpiralLift = true;
    } else {
      this.coyoteTimer -= dt;
    }

    if (this.state === S.HURT) {
      this.velocityX = Physics.approach(this.velocityX, 0, 600 * dt);
      Physics.applyGravity(this, dt);
      if (this.stateTime >= cfg.hurtDuration) this.setState(this._locomotionState(move));
    } else if (this.state === S.DODGE) {
      this.velocityX = this.facing * cfg.dodgeSpeed;
      if (this.isGrounded) Physics.applyGravity(this, dt);
      else this.velocityY = 0;
      this.afterimageTimer -= dt;
      if (this.afterimageTimer <= 0) {
        game.effects.afterimage(this.animator, this.centerX, this.bottom, this.facing < 0);
        this.afterimageTimer = 0.04;
      }
      if (this.stateTime >= cfg.dodgeDuration) {
        this.velocityX *= 0.45;
        this.setState(this._locomotionState(move));
      }
    } else if (this.state === S.CHARGE) {
      this._updateCharge(dt, move, input, game, locked);
    } else if (this.state === S.CHARGE_SLASH) {
      this._updateChargeSlash(dt, move, game);
    } else if (this.state === S.SPIRAL) {
      this._updateSpiral(dt, move, game);
    } else if (this.state === S.SCARF) {
      this._updateScarf(dt, move, input, game);
    } else {
      this._updateControl(dt, move, input, game, locked);
    }

    const beforeX = this.x, beforeY = this.y;
    this._move(map, dt, game);
    if (this.scarf) this._updateScarfTip(dt, beforeX, beforeY);

    if (!ACTION_STATES.has(this.state)) this.setState(this._locomotionState(move));
    this._syncComboFrame();
    this._updateSafePoint(map);
  }

  /** 三連擊：依 COMBO_TIMING 把遊戲時間換算成 pixelfx 時間軸上的那一格 */
  _syncComboFrame() {
    const a = this.animator;
    let timing = null;
    if (this.state === PLAYER_STATES.ATTACK && this.comboStep > 0 && a.name.startsWith('combo')) timing = COMBO_TIMING[this.comboStep - 1];
    else if (this.state === PLAYER_STATES.CHARGE_SLASH && a.name === 'dashSlash') timing = DASH_SLASH_TIMING;
    if (!timing) return;
    const { game, src } = timing;
    const t = Math.min(this.stateTime, game[game.length - 1]);
    let i = 0;
    while (i < game.length - 2 && t > game[i + 1]) i++;
    const u = (t - game[i]) / (game[i + 1] - game[i]);
    const srcT = src[i] + (src[i + 1] - src[i]) * Math.min(1, u);
    a.frame = Math.min(a.current.frames - 1, Math.floor(srcT * a.current.fps));
  }

  _updateControl(dt, move, input, game, locked) {
    const cfg = this.cfg;
    const S = PLAYER_STATES;
    const map = game.level.tilemap;
    const attacking = this.state === S.ATTACK;

    if (move !== 0 && !attacking) this.facing = move;

    // 橫斬三連擊時大幅減速；上劈、下劈不減速（跳躍中劈擊、下劈彈跳都要保留移動）
    const slowed = attacking && this.attackDir === 'side';
    const maxSpeed = cfg.speed * (!slowed ? 1 : this.isGrounded ? cfg.attackMoveFactor : cfg.attackAirMoveFactor);
    const accel = this.isGrounded
      ? (move ? cfg.groundAccel : cfg.groundDecel)
      : (move ? cfg.airAccel : cfg.airDecel);
    this.velocityX = Physics.approach(this.velocityX, move * maxSpeed, accel * dt);
    if (this.isFinisher() && this.isGrounded && this.stateTime >= cfg.finisherStep[0] && this.stateTime < cfg.finisherStep[1]) {
      this.velocityX = this.facing * cfg.finisherStepSpeed;   // 收尾一擊踏步向前
    }

    // ↓ + Space：穿越木板平台
    if (!locked && this.isGrounded && this.jumpBufferTimer > 0 && input.isDown('down') && this._standingOnOneWay(map)) {
      this.dropTimer = cfg.dropThroughTime;
      this.dropThrough = true;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.isGrounded = false;
      this.y += 2;
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.velocityY = -cfg.jumpForce;
      this.isGrounded = false;
      this.isJumping = true;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      game.audio.play('jump');
      game.effects.dust(this.centerX, this.bottom);
    } else if (this.jumpBufferTimer > 0 && !this.isGrounded && this.airJumpsLeft > 0) {
      // 二段跳（需撿到「天狗之羽」）
      this.airJumpsLeft--;
      this.velocityY = -cfg.doubleJumpForce;
      this.isJumping = true;
      this.jumpBufferTimer = 0;
      if (!attacking) this.animator.play('jump', true);
      game.audio.play('doubleJump');
      game.effects.wingBurst(this.centerX, this.bottom - 6);
    }

    // Variable Jump Height：提早放開跳躍鍵會截斷上升速度
    if (this.isJumping && this.velocityY < 0 && !input.isDown('jump')) {
      this.velocityY *= cfg.jumpCutMultiplier;
      this.isJumping = false;
    }
    if (this.velocityY >= 0) this.isJumping = false;

    // 剛收刀的短暫時間內再按 J，可以接續連段（不受攻擊冷卻限制）
    const canContinue = this.comboTimer > 0 && this.comboStep > 0 && this.comboStep < 3;
    if (!locked && !attacking && this.attackBuffer > 0 && (this.attackCooldown <= 0 || canContinue)) {
      // ↑ + J 上劈；空中 ↓ + J 下劈；其餘為橫斬（可連段）
      if (input.isDown('up')) this.attackDir = 'up';
      else if (input.isDown('down') && !this.isGrounded) this.attackDir = 'down';
      else this.attackDir = 'side';
      const step = this.attackDir === 'side' ? (canContinue ? this.comboStep + 1 : 1) : 0;
      this.attackBuffer = 0;
      this._beginAttack(step, move, game);
    }

    if (this.state === S.ATTACK) {
      if (!this.slashSpawned && this.stateTime >= this._attackWindow()[0]) {
        game.playSlash(this, this.comboStep > 0 ? COMBO_SLASHES[this.comboStep - 1] : this.attackDir);
        this.slashSpawned = true;
      }
      // 揮刀途中再按 J：預約下一擊
      if (!locked && !this.comboQueued && this.comboStep > 0 && this.comboStep < 3 && this.stateTime >= cfg.comboInputStart && this.attackBuffer > 0) {
        this.comboQueued = true;
        this.attackBuffer = 0;
      }
      if (this.comboQueued && this.stateTime >= cfg.comboChainTime) {
        this._beginAttack(this.comboStep + 1, move, game);
      } else if (!this.comboQueued && this.stateTime >= (this.isFinisher() ? cfg.finisherDuration : this.comboStep > 0 ? cfg.comboDuration : cfg.attackDuration)) {
        this._endAttack();
        // 揮刀結束時仍按住 J → 進入蓄力（需取得「居合之卷」）
        if (!locked && this.abilities.chargeSlash && input.isDown('attack')) this._startCharge(game);
        else this.setState(this._locomotionState(move));
      }
    }

    if (!locked && input.wasPressed('dodge') && this.canDash()) {
      this._startDodge(move, game);
      return;
    }

    // 風縛：揮刀的判定結束後就能取消收招直接拋出圍巾
    const scarfReady = this.state !== S.ATTACK || this.stateTime > this._attackWindow()[1];
    if (!locked && scarfReady && this.scarfBuffer > 0 && this.canScarf()) {
      this.scarfBuffer = 0;
      this._startScarf(game);
      return;
    }

    Physics.applyGravity(this, dt, this.velocityY > 0 ? cfg.fallGravityMultiplier : 1);
  }

  /* ---------------------------- 風縛（圍巾） ---------------------------- */

  /** 圍巾收回途中也能立刻再拋出（接連抓風鈴） */
  canScarf() {
    return this.abilities.scarf && this.scarfCooldown <= 0 && (!this.scarf || this.scarf.phase === 'retract');
  }

  /** 圍巾從頸間延伸出去的起點 */
  get neckX() { return this.centerX + this.facing * 2; }
  get neckY() { return this.y + 21; }

  _startScarf(game) {
    const cfg = this.cfg;
    const target = game.findScarfTarget(this);
    if (target && Math.abs(target.x - this.centerX) > 4) this.facing = Math.sign(target.x - this.centerX);
    this.scarf = {
      phase: 'extend', target, t: 0, stuck: 0,
      tipX: this.neckX, tipY: this.neckY,
      // 沒有目標時朝前上方甩出再收回
      missX: this.neckX + this.facing * cfg.scarfRange * 0.7, missY: this.neckY - cfg.scarfRange * 0.3
    };
    this.scarfCooldown = cfg.scarfCooldown;
    this.isJumping = false;
    this.setState(PLAYER_STATES.SCARF);
    game.audio.play('scarfThrow');
  }

  _scarfAim() {
    const s = this.scarf;
    if (!s.target) return [s.missX, s.missY];
    if (s.target.kind === 'enemy') return [s.target.ref.centerX, s.target.ref.centerY];
    return [s.target.ref.x, s.target.ref.y];
  }

  _updateScarf(dt, move, input, game) {
    const cfg = this.cfg;
    const s = this.scarf;
    if (!s) { this.setState(this._locomotionState(move)); return; }
    s.t += dt;

    if (s.phase === 'extend') {
      // 拋出圍巾的瞬間：地面上停下腳步，空中則緩緩下墜
      this.velocityX = Physics.approach(this.velocityX, 0, (this.isGrounded ? cfg.groundDecel : 500) * dt);
      Physics.applyGravity(this, dt, 0.35);
      this.velocityY = Math.min(this.velocityY, 120);
      if (s.target && s.target.kind === 'enemy' && s.target.ref.isDead) s.target = null;
      const [tx, ty] = this._scarfAim();
      const step = cfg.scarfTipSpeed * dt;
      const dx = tx - s.tipX, dy = ty - s.tipY, d = Math.hypot(dx, dy);
      if (d <= step) {
        s.tipX = tx;
        s.tipY = ty;
        this._scarfArrive(game, move);
      } else {
        s.tipX += dx / d * step;
        s.tipY += dy / d * step;
        if (s.t > 0.4) this._endScarf(move);
      }
      return;
    }

    if (s.phase === 'pull') {
      const a = s.target.ref;
      s.tipX = a.x;
      s.tipY = a.y;
      const dx = a.x - this.centerX, dy = a.y - (this.y + 30), d = Math.hypot(dx, dy);
      if (move) this.facing = move;
      if (input.wasPressed('jump')) {
        this._releaseScarf(move, true, game);
      } else if (d < 20 || s.t > cfg.scarfMaxPull || s.stuck > 4) {
        this._releaseScarf(move, false, game);
      } else {
        this.velocityX = dx / d * cfg.scarfPullSpeed;
        this.velocityY = dy / d * cfg.scarfPullSpeed;
      }
    }
  }

  _scarfArrive(game, move) {
    const s = this.scarf;
    const target = s.target;
    if (!target) {
      this._endScarf(move);
      return;
    }
    if (target.kind === 'hook') {
      // 抓住風鈴：被拉過去，並恢復二段跳與空中衝刺，可以一路接下一個風鈴
      s.phase = 'pull';
      s.t = 0;
      this.airJumpsLeft = this.abilities.doubleJump ? 1 : 0;
      this.airDashAvailable = true;
      game.onScarfGrab(target.ref, this);
    } else if (target.kind === 'lever') {
      game.pullLever(target.ref, this);
      this._endScarf(move);
    } else {
      game.yankEnemy(target.ref, this);
      this._endScarf(move);
    }
  }

  /** 放開風鈴：保留大部分的速度（甩出去），按跳躍放開會再往上躍起 */
  _releaseScarf(move, jump, game) {
    const cfg = this.cfg;
    this.releasedAnchor = this.scarf.target.ref;
    this.releasedTimer = 0.35;
    this.velocityX *= cfg.scarfRelease;
    this.velocityY *= cfg.scarfRelease;
    if (jump) {
      this.velocityY = Math.min(this.velocityY, -cfg.doubleJumpForce);
      game.effects.wingBurst(this.centerX, this.bottom - 6);
      game.audio.play('jump');
    }
    this._endScarf(move);
  }

  _endScarf(move) {
    if (this.scarf) this.scarf.phase = 'retract';
    if (this.state === PLAYER_STATES.SCARF) this.setState(this._locomotionState(move));
  }

  /** 每格移動後更新圍巾：拉動中偵測是否被地形卡住；收回時往頸部收 */
  _updateScarfTip(dt, beforeX, beforeY) {
    const s = this.scarf;
    if (s.phase === 'pull') {
      s.stuck = Math.hypot(this.x - beforeX, this.y - beforeY) < 1 ? s.stuck + 1 : 0;
    } else if (s.phase === 'retract') {
      const dx = this.neckX - s.tipX, dy = this.neckY - s.tipY, d = Math.hypot(dx, dy);
      const step = this.cfg.scarfRetractSpeed * dt;
      if (d <= step) this.scarf = null;
      else {
        s.tipX += dx / d * step;
        s.tipY += dy / d * step;
      }
    }
  }

  /** 延伸中的圍巾：沿線蓋像素方塊，拋出時帶一點波浪，拉緊時是直線 */
  _renderScarf(ctx, cam) {
    const s = this.scarf;
    const x0 = this.neckX - cam.x, y0 = this.neckY - cam.y;
    const x1 = s.tipX - cam.x, y1 = s.tipY - cam.y;
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 2) return;
    const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    const wave = s.phase === 'pull' ? 0 : 4;
    const n = Math.ceil(len / 2);
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const w = Math.sin(k * Math.PI * 3 - s.t * 30) * wave * Math.sin(k * Math.PI);
      const x = Math.round(x0 + (x1 - x0) * k + nx * w), y = Math.round(y0 + (y1 - y0) * k + ny * w);
      ctx.fillStyle = PAL.outline;
      ctx.fillRect(x - 2, y - 2, 4, 4);
      ctx.fillStyle = i % 4 < 2 ? PAL.scarf : PAL.scarfLight;
      ctx.fillRect(x - 1, y - 1, 3, 3);
    }
    // 尾端飄動的布角
    const flap = Math.sin(s.t * 40) * 2;
    ctx.fillStyle = PAL.scarfLight;
    ctx.fillRect(Math.round(x1 - 3), Math.round(y1 - 2 + flap), 5, 3);
    ctx.fillStyle = PAL.scarfDark;
    ctx.fillRect(Math.round(x1 - 2), Math.round(y1 + 1 + flap), 3, 2);
  }

  /** 記錄 J 的按下；命中停頓（hitstop）期間由 Game 呼叫，避免連段輸入被吃掉 */
  bufferInput(input) {
    if (input.wasPressed('attack')) this.attackBuffer = this.cfg.attackBufferTime;
    if (input.wasPressed('scarf')) this.scarfBuffer = 0.15;
  }

  isFinisher() {
    return this.state === PLAYER_STATES.ATTACK && this.comboStep === 3;
  }

  _attackWindow() {
    return this.isFinisher() ? this.cfg.finisherWindow : this.cfg.attackWindows[this.attackDir];
  }

  /** step：橫斬連段的第幾擊（1–3），上劈 / 下劈為 0 */
  _beginAttack(step, move, game) {
    if (move) this.facing = move;   // 每一擊開始時都可以轉向
    this.comboStep = step;
    this.comboQueued = false;
    this.comboTimer = 0;
    this.setState(PLAYER_STATES.ATTACK);
    this.stateTime = 0;
    this.animator.play(step > 0 ? COMBO_ANIMS[step - 1] : ATTACK_ANIMS[this.attackDir], true);
    this.attackCooldown = this.cfg.attackCooldown;
    this.hitTargets.clear();
    this.slashSpawned = false;
    this.pogoUsed = false;
    game.audio.play(COMBO_SOUNDS[Math.max(0, step - 1)]);
  }

  /** 收刀：第一、二擊後保留短暫的接續時間；第三擊收尾後需要較長的冷卻 */
  _endAttack() {
    if (this.comboStep === 3) {
      this.attackCooldown = this.cfg.finisherCooldown - this.cfg.finisherDuration;
      this.comboStep = 0;
    } else if (this.comboStep > 0) {
      this.comboTimer = this.cfg.comboWindow;
    }
    this.comboQueued = false;
  }

  /** 衝刺（需取得「疾風之履」）：冷卻結束，且在地面或本次滯空尚未空中衝刺 */
  canDash() {
    return this.abilities.dash && this.dodgeCooldown <= 0 && (this.isGrounded || this.airDashAvailable);
  }

  _startDodge(move, game) {
    if (!this.isGrounded) this.airDashAvailable = false;
    if (move) this.facing = move;
    this.setState(PLAYER_STATES.DODGE);
    this.dodgeCooldown = this.cfg.dodgeCooldown;
    this.invulnTimer = Math.max(this.invulnTimer, this.cfg.dodgeDuration + 0.05);
    this.afterimageTimer = 0;
    this.isJumping = false;
    game.audio.play('dodge');
    game.effects.dust(this.centerX, this.bottom, this.facing);
  }

  /* ---------------------------- 蓄力 ---------------------------- */

  _startCharge(game) {
    this.setState(PLAYER_STATES.CHARGE);
    this.charged = false;
    game.audio.play('chargeStart');
  }

  _updateCharge(dt, move, input, game, locked) {
    const cfg = this.cfg;
    if (move !== 0) this.facing = move;
    const accel = this.isGrounded ? cfg.groundAccel : cfg.airAccel;
    this.velocityX = Physics.approach(this.velocityX, move * cfg.speed * cfg.chargeMoveFactor, accel * dt);
    Physics.applyGravity(this, dt, this.velocityY > 0 ? cfg.fallGravityMultiplier : 1);
    this.isJumping = false;

    const handX = this.centerX - this.facing * 10, handY = this.y + 56;
    this.spiralReady = this.charged && input.isDown('up');
    if (this.spiralReady && Math.random() < dt * 20) {
      // 按住 W：風在腳邊打轉，提示放開會變成旋風斬
      const a = Math.random() * Math.PI * 2;
      game.effects.sparkle(this.centerX + Math.cos(a) * 30, this.bottom - 6 - Math.random() * 60, ['#ffffff', '#d8f4ff', '#9fe0ff']);
    }
    if (!this.charged) {
      if (Math.random() < dt * 30) game.effects.chargeMote(handX, handY, 26);
      if (this.stateTime >= cfg.chargeTime) {
        this.charged = true;
        game.audio.play('charged');
        game.effects.burst(handX, handY, ['#ffffff', '#bff1ff', '#6fc8ff']);
      }
    } else if (Math.random() < dt * 12) {
      game.effects.sparkle(handX + (Math.random() - 0.5) * 24, handY + (Math.random() - 0.5) * 24, ['#ffffff', '#bff1ff']);
    }

    if (!locked && input.wasPressed('dodge') && this.canDash()) {
      this._startDodge(move, game);
      return;
    }

    if (locked || !input.isDown('attack')) {
      if (this.charged && !locked) {
        if (input.isDown('up')) this._releaseSpiral(game);
        else this._releaseChargeSlash(game);
      } else {
        this.setState(this._locomotionState(move));
      }
      this.spiralReady = false;
    }
  }

  /* ---------------------------- 衝刺斬 ---------------------------- */

  _releaseChargeSlash(game) {
    const cfg = this.cfg;
    this.setState(PLAYER_STATES.CHARGE_SLASH);
    this.attackDir = 'side';
    this.hitTargets.clear();
    this.dashPhase = 'windup';
    this.slashSpawned = false;
    this.afterimageTimer = 0;
    this.charged = false;
    this.isJumping = false;
  }

  /** 疾衝中與劈下時都在衝刺斬裡 */
  _dashing() {
    const cfg = this.cfg;
    return this.stateTime >= cfg.dashSlashWindup && this.stateTime < cfg.dashSlashWindup + cfg.dashSlashDash;
  }

  _updateChargeSlash(dt, move, game) {
    const cfg = this.cfg;
    const dashEnd = cfg.dashSlashWindup + cfg.dashSlashDash;
    if (this.stateTime < cfg.dashSlashWindup) {
      // 壓低身子，刀收到身後
      this.velocityX = Physics.approach(this.velocityX, 0, cfg.groundDecel * dt);
      if (this.isGrounded) Physics.applyGravity(this, dt);
      else this.velocityY = Math.min(this.velocityY, 0);
    } else if (this.stateTime < dashEnd) {
      if (this.dashPhase === 'windup') {
        // 衝出：穿過敵人（期間無敵），空中衝刺也保持高度
        this.dashPhase = 'dash';
        this.graceTimer = cfg.dashSlashDash + 0.05;
        game.audio.play('wave');
        game.camera.shake(3, 0.18);
        game.effects.dust(this.centerX, this.bottom, this.facing);
        game.fx.play('thrust', this.centerX, this.bottom - 25, { flipX: this.facing < 0, follow: this });
      }
      this.velocityX = this.facing * cfg.dashSlashDistance / cfg.dashSlashDash;
      if (this.isGrounded) Physics.applyGravity(this, dt);
      else this.velocityY = 0;
      this.afterimageTimer -= dt;
      if (this.afterimageTimer <= 0) {
        game.effects.afterimage(this.animator, this.centerX, this.bottom, this.facing < 0);
        this.afterimageTimer = 0.03;
      }
    } else {
      if (this.dashPhase === 'dash') {
        this.dashPhase = 'cut';
        this.velocityX *= 0.15;   // 衝到底就煞住，不會再滑出去
      }
      this.velocityX = Physics.approach(this.velocityX, 0, cfg.groundDecel * 2 * dt);
      Physics.applyGravity(this, dt, this.velocityY > 0 ? cfg.fallGravityMultiplier : 1);
    }

    // 劈下：衝到底的那一刀
    if (!this.slashSpawned && this.stateTime >= cfg.dashSlashCut) {
      this.slashSpawned = true;
      game.playSlash(this, 'side');
      game.audio.play('slash3');
    }

    if (this.stateTime >= cfg.dashSlashDuration) {
      this.attackCooldown = cfg.attackCooldown;
      this.setState(this._locomotionState(move));
    }
  }

  /* ---------------------------- 旋風斬 ---------------------------- */

  _releaseSpiral(game) {
    const cfg = this.cfg;
    this.setState(PLAYER_STATES.SPIRAL);
    this.attackDir = 'spin';
    this.hitTargets.clear();
    this.spiralHit = 0;
    this.charged = false;
    this.graceTimer = cfg.spiralDuration;
    this.isJumping = false;
    if (this.isGrounded || this.airSpiralLift) {
      this.velocityY = -(this.isGrounded ? cfg.spiralLift : cfg.spiralAirLift);
      this.isGrounded = false;
      this.airSpiralLift = false;
    } else {
      this.velocityY = Math.min(this.velocityY, 0);
    }
    game.audio.play('spiral');
    game.camera.shake(3, 0.2);
    game.effects.dust(this.centerX, this.bottom);
    if (!game.fx.ready('spin')) game.effects.spiral(this, cfg.spiralDuration);   // 圖檔還沒載入時退回程式畫的旋風
  }

  /** 旋風斬的動作（pixelfx 的 spin-slash）：蓄勢、轉身四個朝向反覆、最後收勢 */
  _spinFrame() {
    const t = this.stateTime, end = this.cfg.spiralDuration;
    if (t < 0.05) return 0;
    if (t >= end - 0.08) return 5;
    return 1 + (Math.floor((t - 0.05) / 0.035) % 4);
  }

  _updateSpiral(dt, move, game) {
    const cfg = this.cfg;
    const accel = this.isGrounded ? cfg.groundAccel : cfg.airAccel;
    this.velocityX = Physics.approach(this.velocityX, move * cfg.speed * cfg.spiralMoveFactor, accel * dt);
    Physics.applyGravity(this, dt, cfg.spiralGravity);

    // 每一斬重新計算命中，同一個敵人最多吃三次
    const next = cfg.spiralHits[this.spiralHit];
    if (next !== undefined && this.stateTime >= next) {
      this.spiralHit++;
      this.hitTargets.clear();
      // 每一斬都轉出一圈刀光環（spin-slash 的環在 0.17 秒閉合，加快一點對上每圈 0.14 秒）
      game.fx.play('spin', this.centerX, this.bottom - 26, { flipX: this.facing < 0, follow: this, speed: 1.2 });
    }
    if (this.animator.name === 'spin') this.animator.frame = this._spinFrame();
    if (Math.random() < dt * 40) {
      const a = Math.random() * Math.PI * 2;
      game.effects.sparkle(this.centerX + Math.cos(a) * 52, this.y + 20 + Math.random() * 60, ['#ffffff', '#d8f4ff', '#9fe0ff']);
    }

    if (this.stateTime >= cfg.spiralDuration) {
      this.attackCooldown = cfg.attackCooldown;
      if (move !== 0) this.facing = move;
      this.setState(this._locomotionState(move));
    }
  }

  /** 旋風斬的最後一斬：把敵人甩開 */
  isSpiralFinal() {
    return this.state === PLAYER_STATES.SPIRAL && this.spiralHit === this.cfg.spiralHits.length;
  }

  /** 蓄力後放出的斬擊（衝刺斬、旋風斬）才能斬開冰壁 */
  isChargedAttack() {
    return this.state === PLAYER_STATES.CHARGE_SLASH || this.state === PLAYER_STATES.SPIRAL;
  }

  _move(map, dt, game) {
    const wasGrounded = this.isGrounded;
    const fallSpeed = this.velocityY;
    const result = Physics.integrate(this, map, dt);
    if (result.ceiling) this.isJumping = false;
    if (!wasGrounded && this.isGrounded && fallSpeed > 380) {
      game.effects.dust(this.centerX, this.bottom);
      game.audio.play('land');
    }
  }

  _locomotionState(move) {
    const S = PLAYER_STATES;
    if (this.isGrounded) return (move !== 0 || Math.abs(this.velocityX) > 40) ? S.RUN : S.IDLE;
    return this.velocityY < 0 ? S.JUMP : S.FALL;
  }

  _standingOnOneWay(map) {
    const T = map.tileSize;
    const row = Math.floor((this.bottom + 1) / T);
    const c0 = Math.floor(this.x / T), c1 = Math.floor((this.x + this.width - 0.001) / T);
    let oneWay = false;
    for (let c = c0; c <= c1; c++) {
      if (map.isSolidAt(c, row)) return false;
      if (map.isOneWayAt(c, row)) oneWay = true;
    }
    return oneWay;
  }

  /** 記錄最後一個安全落腳點，掉落深谷或碰到尖刺後由此重生 */
  _updateSafePoint(map) {
    if (!this.isGrounded || this.state === PLAYER_STATES.HURT) return;
    const T = map.tileSize;
    const row = Math.floor((this.bottom + 1) / T);
    const c0 = Math.floor((this.x + 2) / T), c1 = Math.floor((this.x + this.width - 2) / T);
    for (const c of [c0, c1]) {
      // 過去的平台在視界結束後會消失，不能當作重生點
      if (map.isPastAt(c, row) || (!map.isSolidAt(c, row) && !map.isOneWayAt(c, row))) return;
    }
    for (let c = c0 - 1; c <= c1 + 1; c++) {
      if (map.isHazardAt(c, row - 1) || map.isHazardAt(c, row)) return;
    }
    this.safeX = this.x;
    this.safeY = this.y;
  }

  takeDamage(amount, sourceX) {
    const S = PLAYER_STATES;
    if (this.state === S.DEATH || this.isInvulnerable()) return false;
    this.hp = Math.max(0, this.hp - amount);
    const dir = this.centerX < sourceX ? -1 : 1;
    if (this.hp <= 0) {
      this.die(dir);
      return true;
    }
    if (this.scarf) this.scarf.phase = 'retract';
    this.setState(S.HURT);
    this.invulnTimer = this.cfg.invulnerableTime;
    this.velocityX = dir * this.cfg.knockbackX;
    this.velocityY = -this.cfg.knockbackY;
    this.isGrounded = false;
    this.isJumping = false;
    return true;
  }

  die(dir = 0) {
    this.hp = 0;
    this.scarf = null;
    this.setState(PLAYER_STATES.DEATH);
    this.velocityX = dir * 120;
    this.velocityY = -200;
    this.deathTimer = 0;
  }

  respawnAt(x, y) {
    this.scarf = null;
    this.x = x;
    this.y = y;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isGrounded = false;
    this.isJumping = false;
    this.dropTimer = 0;
    this.dropThrough = false;
    this.setState(PLAYER_STATES.IDLE);
    this.invulnTimer = 1.2;
  }

  getHurtbox() {
    return { x: this.x + 4, y: this.y + 8, width: this.width - 8, height: this.height - 8 };
  }

  /** 下劈命中敵人或尖刺時向上彈起，並恢復二段跳 */
  pogo(game) {
    if (this.pogoUsed) return;
    this.pogoUsed = true;
    this.graceTimer = this.cfg.pogoGrace;
    this.velocityY = -this.cfg.pogoForce;
    this.isJumping = false;
    this.isGrounded = false;
    this.airJumpsLeft = this.abilities.doubleJump ? 1 : 0;
    this.dodgeCooldown = 0;
    this.airDashAvailable = true;
    game.audio.play('pogo');
  }

  getAttackDamage() {
    if (this.state === PLAYER_STATES.CHARGE_SLASH) return this.cfg.chargeSlashDamage;
    if (this.state === PLAYER_STATES.SPIRAL) return this.cfg.spiralDamage;
    return this.isFinisher() ? this.cfg.finisherDamage : this.cfg.attackDamage;
  }

  getAttackHitbox() {
    if (this.state === PLAYER_STATES.CHARGE_SLASH) {
      const cfg = this.cfg;
      if (this._dashing()) {
        // 疾衝中：身體加上身前一段，衝過去的敵人都會被斬到
        const reach = cfg.dashSlashReach;
        return {
          x: this.facing > 0 ? this.x : this.x - reach, y: this.y + cfg.chargeSlashBox.offsetY,
          width: this.width + reach, height: cfg.chargeSlashBox.height
        };
      }
      if (this.stateTime < cfg.dashSlashCut || this.stateTime > cfg.dashSlashCut + cfg.dashSlashCutLength) return null;
      const box = cfg.chargeSlashBox;
      return {
        x: this.facing > 0 ? this.x + this.width - 6 : this.x - box.width + 6,
        y: this.y + box.offsetY, width: box.width, height: box.height
      };
    }
    if (this.state === PLAYER_STATES.SPIRAL) {
      const start = this.cfg.spiralHits[this.spiralHit - 1];
      if (start === undefined || this.stateTime > start + this.cfg.spiralHitLength) return null;
      const box = this.cfg.spiralBox;
      return { x: this.centerX - box.width / 2, y: this.bottom + box.below - box.height, width: box.width, height: box.height };
    }
    if (this.state !== PLAYER_STATES.ATTACK) return null;
    const [start, end] = this._attackWindow();
    if (this.stateTime < start || this.stateTime > end) return null;
    if (this.attackDir !== 'side') {
      const box = this.attackDir === 'up' ? this.cfg.upAttackBox : this.cfg.downAttackBox;
      return { x: this.centerX - box.width / 2, y: this.y + box.offsetY, width: box.width, height: box.height };
    }
    const box = this.isFinisher() ? this.cfg.finisherBox : this.cfg.attackBox;
    return {
      x: this.facing > 0 ? this.x + this.width - 6 : this.x - box.width + 6,
      y: this.y + box.offsetY,
      width: box.width,
      height: box.height
    };
  }

  render(ctx, cam) {
    const S = PLAYER_STATES;
    const blinking = this.invulnTimer > 0 && this.state !== S.DEATH && this.state !== S.DODGE;
    if (blinking && Math.floor(this.invulnTimer * 20) % 2 === 0) return;
    if (this.state === S.CHARGE) {
      // 蓄力光暈：越接近蓄滿越亮，蓄滿後閃爍
      const k = Math.min(1, this.stateTime / this.cfg.chargeTime);
      const gx = this.centerX - this.facing * 10 - cam.x, gy = this.y + 56 - cam.y;
      const radius = 16 + k * 22 + (this.charged ? Math.sin(this.stateTime * 30) * 4 : 0);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius);
      const rgb = this.spiralReady ? '225,248,255' : '150,215,255';   // 按住 W 時光暈轉白
      grad.addColorStop(0, `rgba(${rgb},${0.2 + k * 0.4})`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(gx - radius, gy - radius, radius * 2, radius * 2);
      ctx.restore();
    }
    const flash = (this.state === S.HURT && this.stateTime < 0.08) ||
                  (this.state === S.CHARGE && this.charged && Math.floor(this.stateTime * 10) % 3 === 0);
    this.animator.draw(ctx, this.centerX - cam.x, this.bottom - cam.y, this.facing < 0, { variant: flash ? 'flash' : 'image' });
    if (this.scarf) this._renderScarf(ctx, cam);
  }
}
