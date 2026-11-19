/**
 * Game —— 串接所有系統：狀態流程、更新順序與渲染管線（GDD 6.2、10.3）
 *
 * 渲染分兩層：
 *   1. 遊戲世界畫在 640×360 的低解析度 buffer，再以整數倍、關閉平滑放大（Pixel Perfect）
 *   2. UI 直接畫在放大後的 Canvas 上，文字保持清晰
 */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 640;
    this.height = 360;
    this.scale = 1;

    this.buffer = document.createElement('canvas');
    this.buffer.width = this.width;
    this.buffer.height = this.height;
    this.bctx = this.buffer.getContext('2d');
    this.bctx.imageSmoothingEnabled = false;

    Sprites.build();
    this.levelData = window.LEVEL_DATA;
    this.mode = 'story';   // 'story' 本篇、'parkour' 跑酷挑戰（通關第一章後解鎖）
    this.input = new InputManager(canvas, this.width, this.height);
    this.audio = new AudioSystem();
    this.input.onInteraction = () => this.audio.unlock();
    this.input.onBlur = () => { if (this.state.is(GameStates.PLAYING)) this.pause(); };
    this.state = new GameStateMachine(GameStates.MAIN_MENU);
    this.camera = new Camera(this.width, this.height);
    this.background = new Background(this.width, this.height);
    this.effects = new Effects();
    this.fx = new FxSheets();      // pixelfx 的刀光、打擊火花、傷害數字與連擊數
    this.comboHits = 0;
    this.lastHitTime = -99;
    this.vision = new AfterimageVision();
    this.hud = new HUD(this);
    this.menu = new MenuSystem(this);

    this.level = null;
    this.player = null;
    this.projectiles = [];
    this.time = 0;
    this.menuScroll = 0;
    this.fogLevel = 0.4;
    this.hitstop = 0;
    this.hurtFlash = 0;
    this.fade = null;
    this.respawning = false;
    this.gameOverPending = false;
    this.lastCheckpoint = -1;
    this.stats = Game.freshStats();
    this.progress = Game.freshProgress();
    this.victoryInfo = null;
    this.currentZone = null;
    this.menuAnimator = new Animator(Sprites.player);
    this.menuAnimator.play('idle');

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.menu.openMain();
    this.loop = new GameLoop((dt) => this.update(dt), () => this.render());
  }

  static freshStats() {
    return { time: 0, kills: 0, deaths: 0, mistakes: 0 };
  }

  /** 撿到的能力會一直保留（死亡、重來都不會失去），直到開始新旅程 */
  static freshProgress() {
    return { abilities: {}, maxHp: PLAYER_CONFIG.maxHp, collected: [] };
  }

  start() {
    this.loop.start();
  }

  /** 整數倍縮放，避免像素模糊（GDD 6.5） */
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const maxW = window.innerWidth * dpr, maxH = window.innerHeight * dpr;
    this.scale = Math.max(1, Math.floor(Math.min(maxW / this.width, maxH / this.height)));
    this.canvas.width = this.width * this.scale;
    this.canvas.height = this.height * this.scale;
    this.canvas.style.width = `${this.canvas.width / dpr}px`;
    this.canvas.style.height = `${this.canvas.height / dpr}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  /* ---------------------------- 流程控制 ---------------------------- */

  hasSave() {
    return SaveStore.get('save', null) !== null;
  }

  isParkour() {
    return this.mode === 'parkour';
  }

  parkourUnlocked() {
    return SaveStore.get('parkourUnlocked', false) === true;
  }

  _setMode(mode) {
    this.mode = mode;
    this.levelData = mode === 'parkour' ? window.PARKOUR_DATA : window.LEVEL_DATA;
  }

  /** 跑酷挑戰：所有能力全開，從起點開始計時；不讀寫本篇的存檔 */
  startParkour() {
    this._setMode('parkour');
    this.stats = Game.freshStats();
    this.progress = {
      ...Game.freshProgress(),
      abilities: { dash: true, doubleJump: true, chargeSlash: true, vision: true, scarf: true }
    };
    this.lastCheckpoint = -1;
    this.startLevel(-1, true);
  }

  newGame() {
    this._setMode('story');
    SaveStore.remove('save');
    this.stats = Game.freshStats();
    this.progress = Game.freshProgress();
    this.lastCheckpoint = -1;
    this.startLevel(-1, true);
  }

  continueGame() {
    const save = SaveStore.get('save', null);
    if (!save) return this.newGame();
    this._setMode('story');
    this.stats = { ...Game.freshStats(), ...save.stats };
    const progress = save.progress || {};
    this.progress = { ...Game.freshProgress(), ...progress, abilities: { ...(progress.abilities || {}) } };
    this.lastCheckpoint = save.checkpoint;
    this.startLevel(save.checkpoint, false);
  }

  _writeSave() {
    SaveStore.set('save', { checkpoint: this.lastCheckpoint, stats: this.stats, progress: this.progress });
  }

  retry() {
    this.startLevel(this.lastCheckpoint, false);
  }

  startLevel(checkpointIndex, showIntro) {
    this.level = new Level(this.levelData, this.progress.collected);
    for (const cp of this.level.checkpoints) cp.active = cp.index <= checkpointIndex;
    const spawn = checkpointIndex >= 0 ? this.level.checkpoints[checkpointIndex].spawn : this.level.playerStart;
    this.player = new Player(spawn.x, spawn.y, this.progress);

    this.camera.setBounds(this.level.tilemap.pixelWidth, this.level.tilemap.pixelHeight);
    this.camera.snapTo(this.player);
    this.effects.clear();
    this.fx.clear();
    this.comboHits = 0;
    this.projectiles = [];
    this.vision.reset();
    this.hud.reset();
    this.hitstop = 0;
    this.hurtFlash = 0;
    this.respawning = false;
    this.gameOverPending = false;
    this.victoryInfo = null;
    this.fade = { t: 0.35, duration: 0.7, onMid: null, fired: true };   // 由黑畫面淡入

    this.currentZone = this.level.zoneAt(this.player.centerX);
    this.fogLevel = this.currentZone.fog;
    if (showIntro) this.hud.showTitleCard();
    else this.hud.showZone(this.currentZone);
    this.state.set(GameStates.PLAYING);
  }

  pause() {
    this.state.set(GameStates.PAUSED);
    this.menu.openPause();
    this.audio.play('pause');
  }

  resume() {
    this.state.set(GameStates.PLAYING);
    this.audio.play('pause');
  }

  toMainMenu() {
    this.menu.openMain();
    this.state.set(GameStates.MAIN_MENU);
  }

  gameOver() {
    this.stats.deaths++;
    this.state.set(GameStates.GAME_OVER);
    this.menu.openGameOver();
  }

  victory() {
    const time = this.stats.time;
    const parkour = this.isParkour();
    const bestKey = parkour ? 'parkourBest' : 'best';
    const best = SaveStore.get(bestKey, null);
    const newRecord = best === null || time < best;
    if (newRecord) SaveStore.set(bestKey, time);
    // 通關第一章：解鎖跑酷挑戰
    const unlocked = !parkour && !this.parkourUnlocked();
    if (!parkour) {
      SaveStore.remove('save');
      SaveStore.set('parkourUnlocked', true);
    }
    this.victoryInfo = {
      time, best: newRecord ? time : best, newRecord, kills: this.stats.kills, deaths: this.stats.deaths,
      mistakes: this.stats.mistakes, unlocked
    };
    this.player.controlsLocked = true;
    this.state.set(GameStates.VICTORY);
    this.menu.openVictory();
    this.audio.play('victory');
    this.effects.burst(this.player.centerX, this.player.centerY, ['#ffe9a8', '#bff1ff', '#ffffff']);
  }

  startFade(duration, onMid) {
    this.fade = { t: 0, duration, onMid, fired: false };
  }

  _updateFade(dt) {
    const f = this.fade;
    if (!f) return;
    f.t += dt;
    if (!f.fired && f.t >= f.duration / 2) {
      f.fired = true;
      if (f.onMid) f.onMid();
    }
    if (this.fade === f && f.t >= f.duration) this.fade = null;
  }

  _fadeAlpha() {
    const f = this.fade;
    if (!f) return 0;
    const k = f.t / f.duration;
    return k < 0.5 ? k * 2 : Math.max(0, (1 - k) * 2);
  }

  /* ---------------------------- 戰鬥事件 ---------------------------- */

  /** heavy：連段收尾、螺旋斬最後一斬，改用較大的爆擊火花 */
  onEnemyHit(enemy, killed, direction = this.player.facing, { damage = 1, heavy = false } = {}) {
    this.hitstop = killed ? 0.09 : 0.05;
    this.camera.shake(killed ? 4 : 2.5, 0.15);
    const hx = direction > 0 ? enemy.x : enemy.x + enemy.width;
    const spark = this.fx.play(heavy ? 'crit' : 'hitSpark', hx, enemy.centerY, { flipX: direction < 0 });
    if (!spark) this.effects.sparks(hx, enemy.centerY, direction);
    this.fx.play('dmg' + Math.min(2, damage), enemy.centerX, enemy.y + 6, { flipX: direction < 0 });
    this._countCombo();
    this.audio.play(killed ? 'kill' : 'hit');
    if (killed) {
      this.stats.kills++;
      this.effects.spiritDeath(enemy.centerX, enemy.centerY);
    }
  }

  /** 連擊數：上一次命中後 1.2 秒內再命中就累加，兩次以上顯示在畫面右上 */
  _countCombo() {
    this.comboHits = this.time - this.lastHitTime < 1.2 ? this.comboHits + 1 : 1;
    this.lastHitTime = this.time;
    if (this.comboHits >= 2) this.fx.play('combo' + Math.min(this.comboHits, 20), 532, 76, { layer: 'screen', tag: 'combo' });
  }

  /**
   * 刀光：pixelfx 的刀光，origin 是弧線中心，對齊到劍客胸前。
   * 三連擊依序是斜劈、交叉雙斬、雙手重劈；上劈 / 下劈把刀光轉 90 度。
   * 圖檔還沒載入時退回程式畫的刀光。
   */
  playSlash(p, kind) {
    const flipX = p.facing < 0;
    const arc = [-6, -26];   // 弧線中心再往前一點，刀光掃到身前
    const opts = { flipX, origin: arc, follow: p, fromHit: true };
    let fx = null;
    // 三連擊沿用 pixelfx 三連擊的刀光：斜劈、交叉雙斬、雙手重劈（重劈的錨點在腳底，劈進前方的地面）
    if (kind === 'side') fx = this.fx.play('slash', p.centerX, p.y + 40, opts);
    else if (kind === 'side2') fx = this.fx.play('cross', p.centerX + p.facing * 6, p.y + 42, { ...opts, origin: [4, -24] });
    else if (kind === 'side3') fx = this.fx.play('cleave', p.centerX + p.facing * 18, p.bottom, { ...opts, origin: null });
    else if (kind === 'up') fx = this.fx.play('slash', p.centerX, p.y + 24, { ...opts, rot: -Math.PI / 2 });
    else if (kind === 'down') fx = this.fx.play('slash', p.centerX, p.y + 58, { ...opts, rot: Math.PI / 2, flipY: true });
    if (!fx) this.effects.slash(p, kind);
  }

  /** 陶罐、雪堆被擊中；擊破時可能掉出魂火 */
  onBreakableHit(b, broken, direction) {
    const info = b.info;
    this.hitstop = Math.max(this.hitstop, broken ? 0.04 : 0.025);
    this.camera.shake(broken ? 2.5 : 1.5, 0.12);
    if (info.kind === 'pot') {
      this.effects.shatter(b.x, b.y - 12, info.shards);
      this.audio.play('potBreak');
    } else {
      this.effects.snowPuff(b.x + direction * 4, b.y - b.height / 2, broken ? 1.4 : 0.6);
      this.audio.play(broken ? 'snowBreak' : 'snowHit');
    }
    if (broken && b.drop === 'soul') this.level.drops.push(new SoulDrop(b.x, b.y - 16, direction));
  }

  /** 斬開冰壁（蓄力斬或劍氣） */
  breakIce(c, r) {
    const cells = this.level.tilemap.breakIceAt(c, r);
    if (!cells.length) return;
    const T = this.level.tileSize;
    for (const cell of cells) {
      this.effects.shatter(cell.c * T + T / 2, cell.r * T + T / 2, ['#e6f7ff', '#a8d8f0', '#6aa8cf', '#ffffff']);
    }
    this.audio.play('iceBreak');
    this.camera.shake(5, 0.3);
    this.hitstop = Math.max(this.hitstop, 0.08);
    // 緊鄰冰壁的隱藏區域跟著現形
    for (const s of this.level.secrets) {
      if (s.revealed) continue;
      const near = cells.some((cell) => Collision.aabb({ x: cell.c * T - 1, y: cell.r * T - 1, width: T + 2, height: T + 2 }, s.rect));
      if (near) this._revealSecret(s);
    }
  }

  /* ---------------------------- 風縛（圍巾） ---------------------------- */

  /** 圍巾的目標：射程內、前方（或正上方附近）、視線未被地形擋住；風鈴與鈴緒優先於妖怪 */
  findScarfTarget(p) {
    const range = p.cfg.scarfRange;
    const nx = p.neckX, ny = p.neckY;
    let best = null, bestScore = Infinity;
    const consider = (kind, ref, x, y, bias) => {
      const dx = x - nx, dy = y - ny, d = Math.hypot(dx, dy);
      if (d > range || d < 12 || dx * p.facing < -24) return;
      if (!this._lineOfSight(nx, ny, x, y)) return;
      if (d + bias < bestScore) {
        bestScore = d + bias;
        best = { kind, ref, x, y };
      }
    };
    for (const a of this.level.anchors) {
      if ((a.type === 'lever' && a.pulled) || (a === p.releasedAnchor && p.releasedTimer > 0)) continue;
      consider(a.type, a, a.x, a.y, 0);
    }
    for (const e of this.level.enemies) if (!e.isDead) consider('enemy', e, e.centerX, e.centerY, 60);
    return best;
  }

  _lineOfSight(x0, y0, x1, y1) {
    const map = this.level.tilemap, T = map.tileSize;
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8);
    for (let i = 1; i < n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      if (map.isSolidAt(Math.floor(x / T), Math.floor(y / T))) return false;
    }
    return true;
  }

  onScarfGrab(anchor, p) {
    anchor.tug(Math.sign(anchor.x - p.centerX) || 1);
    this.audio.play('scarfGrab');
    this.effects.sparks(anchor.x, anchor.y, Math.sign(p.centerX - anchor.x) || -1);
  }

  /** 拉動鈴緒：打開相連的石門 */
  pullLever(anchor, p) {
    anchor.pulled = true;
    anchor.tug(Math.sign(p.centerX - anchor.x) || -1);
    this.audio.play('scarfGrab');
    if (!anchor.opens) return;
    const cells = this.level.tilemap.removeConnected(anchor.opens[0], anchor.opens[1], TILE.GATE);
    if (!cells.length) return;
    const T = this.level.tileSize;
    for (const cell of cells) {
      this.level.openingGates.push({ c: cell.c, r: cell.r, t: 0 });
      this.effects.dust(cell.c * T + T / 2, cell.r * T + T);
    }
    this.audio.play('gate');
    this.camera.shake(4, 0.5);
    this.hud.toast('石門打開了');
  }

  yankEnemy(enemy, p) {
    enemy.yankToward(p.centerX);
    p.graceTimer = Math.max(p.graceTimer, 0.25);
    this.audio.play('yank');
    this.effects.sparks(enemy.centerX, enemy.centerY, Math.sign(p.centerX - enemy.centerX) || 1);
  }

  _revealSecret(s) {
    s.revealed = true;
    this.audio.play('secret');
    this.hud.toast('發現了隱藏的洞窟');
    const r = s.rect;
    for (let i = 0; i < 24; i++) {
      this.effects.dust(r.x + Math.random() * r.width, r.y + Math.random() * r.height);
    }
  }

  /** 一般攻擊打在冰壁上：彈出火花，提示需要更強的斬擊 */
  onIceDeflect(box, facing) {
    const hx = facing > 0 ? box.x + box.width - 8 : box.x + 8, hy = box.y + box.height / 2;
    if (!this.fx.play('parry', hx, hy, { flipX: facing < 0 })) this.effects.sparks(hx, hy, -facing);
    this.audio.play('clink');
    if (this.time - (this.lastIceHint || -99) > 4) {
      this.lastIceHint = this.time;
      this.hud.toast(this.player.abilities.chargeSlash ? '冰壁堅硬無比 · 試試蓄力斬' : '冰壁堅硬無比 · 一般的斬擊無法破開');
    }
  }

  onPlayerDamaged() {
    const p = this.player;
    this.audio.play(p.hp <= 0 ? 'die' : 'hurt');
    this.camera.shake(5, 0.25);
    this.effects.hurt(p.centerX, p.centerY);
    this.hurtFlash = 0.3;
    this.state.set(GameStates.PLAYER_HURT);
  }

  /**
   * 尖刺與深谷：扣 1 HP，淡出後回到最後的安全落腳點。
   * 跑酷挑戰中不扣生命，改為回到最後點燃的石燈籠（計為一次失誤）。
   */
  onHazard() {
    if (this.respawning) return;
    const p = this.player;
    this.respawning = true;
    if (this.isParkour()) {
      this.stats.mistakes++;
      p.velocityX = 0;
      p.velocityY = 0;
      this.audio.play('hurt');
      this.camera.shake(4, 0.2);
      this.effects.hurt(p.centerX, Math.min(p.centerY, this.level.tilemap.pixelHeight - 10));
      this.hurtFlash = 0.3;
      this.startFade(0.6, () => {
        this.respawning = false;
        const cp = this.level.checkpoints[this.lastCheckpoint];
        const spawn = cp ? cp.spawn : this.level.playerStart;
        p.respawnAt(spawn.x, spawn.y);
        p.facing = 1;
        this.camera.snapTo(p);
      });
      return;
    }
    p.hp = Math.max(0, p.hp - 1);
    p.velocityX = 0;
    p.velocityY = 0;
    this.audio.play(p.hp <= 0 ? 'die' : 'hurt');
    this.camera.shake(4, 0.2);
    this.effects.hurt(p.centerX, Math.min(p.centerY, this.level.tilemap.pixelHeight - 10));
    this.hurtFlash = 0.3;
    this.startFade(0.7, () => {
      this.respawning = false;
      if (p.hp <= 0) {
        this.gameOverPending = true;
        this.gameOver();
        return;
      }
      p.respawnAt(p.safeX, p.safeY);
      this.camera.snapTo(p);
    });
  }

  /* ------------------------------ 更新 ------------------------------ */

  update(dt) {
    const input = this.input;
    this.time += dt;
    this.state.update(dt);
    this.fx.update(dt, 'screen');
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);

    if (input.wasPressed('mute')) {
      this.audio.unlock();
      this.audio.toggleMute();
      if (this.player) this.hud.toast(this.audio.muted ? '已靜音' : '已開啟聲音');
    }

    switch (this.state.current) {
      case GameStates.MAIN_MENU:
        this.menuScroll += dt * 18;
        this.menuAnimator.update(dt);
        this.menu.update(dt, input);
        break;

      case GameStates.PLAYING:
        if (input.wasPressed('pause') || input.clickedIn(this.hud.pauseButton)) {
          this.pause();
          break;
        }
        this._updateWorld(dt);
        break;

      case GameStates.PLAYER_HURT:
        // 受傷時短暫凍結畫面（Hit Pause），強化打擊回饋
        this.effects.update(dt);
        if (this.state.time >= 0.16) this.state.set(GameStates.PLAYING);
        break;

      case GameStates.PAUSED:
        this.menu.update(dt, input);
        break;

      case GameStates.GAME_OVER:
        this.effects.update(dt);
        this._updateFade(dt);
        if (this.state.time > 0.6) this.menu.update(dt, input);
        break;

      case GameStates.VICTORY:
        this.vision.update(dt, this);
        this.player.update(dt, input, this);
        this.level.update(dt, this);
        this.effects.update(dt);
        this.fx.update(dt, 'world');
        this.camera.follow(this.player, dt);
        if (Math.random() < dt * 4) this.effects.mote(this.player.centerX + (Math.random() - 0.5) * 80, this.player.bottom - Math.random() * 30);
        if (this.state.time > 1.6) this.menu.update(dt, input);
        break;

      default:
        break;
    }

    this.hud.update(dt);
    input.endFrame();
  }

  _updateWorld(dt) {
    const p = this.player;
    const level = this.level;
    this.effects.update(dt);
    this._updateFade(dt);
    if (!this.state.is(GameStates.PLAYING)) return;   // 淡出途中可能已進入 GAME_OVER

    // 命中停頓時特效也停在命中那一格，停頓結束才繼續播
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      p.bufferInput(this.input);
      return;
    }
    this.fx.update(dt, 'world');

    this.stats.time += dt;
    this.scarfTarget = p.abilities.scarf && p.canScarf() && p.state !== PLAYER_STATES.DEATH ? this.findScarfTarget(p) : null;
    if (!this.respawning && p.abilities.vision && p.state !== PLAYER_STATES.DEATH && !p.controlsLocked &&
        this.input.wasPressed('vision')) {
      this.vision.tryActivate(this);
    }
    this.vision.update(dt, this);
    if (!this.respawning) p.update(dt, this.input, this);
    for (const wave of this.projectiles) wave.update(dt, level.tilemap, this);
    this.projectiles = this.projectiles.filter((w) => !w.done);
    level.update(dt, this);
    Combat.update(this);

    if (!this.respawning && p.y > level.tilemap.pixelHeight + 32) this.onHazard();

    if (!this.respawning && p.state !== PLAYER_STATES.DEATH) {
      for (const cp of level.checkpoints) {
        if (!cp.active && Collision.aabb(p.getHitbox(), cp.trigger)) this._activateCheckpoint(cp);
      }
      for (const s of level.secrets) {
        if (!s.revealed && Collision.aabb(p.getHitbox(), s.rect)) this._revealSecret(s);
      }
      for (const drop of level.drops) {
        if (drop.canCollect(p) && Collision.aabb(p.getHitbox(), drop.getHitbox())) this._collectSoul(drop);
      }
      for (const pickup of level.pickups) {
        if (!pickup.collected && Collision.aabb(p.getHitbox(), pickup.getHitbox())) this._collectPickup(pickup);
      }
      if (Collision.aabb(p.getHitbox(), level.exit) && p.isGrounded) {
        this.victory();
        return;
      }
    }

    if (p.state === PLAYER_STATES.DEATH && p.deathTimer > 1.4 && !this.gameOverPending) {
      this.gameOverPending = true;
      this.gameOver();
    }

    const zone = level.zoneAt(p.centerX);
    if (zone !== this.currentZone) {
      this.currentZone = zone;
      this.hud.showZone(zone);
    }
    this.fogLevel += (zone.fog - this.fogLevel) * Math.min(1, dt * 1.2);
    this.camera.follow(p, dt);
  }

  _activateCheckpoint(cp) {
    cp.active = true;
    this.lastCheckpoint = Math.max(this.lastCheckpoint, cp.index);
    this.player.hp = this.player.maxHp;
    this.audio.play('checkpoint');
    this.effects.burst(cp.x, cp.y - 30, ['#ffd27a', '#ff9d4a', '#fff2c4']);
    if (this.isParkour()) {
      // 跑酷挑戰不寫入本篇存檔，只顯示目前的分段時間
      this.effects.floatText(UIDraw.formatTime(this.stats.time), cp.x, cp.y - 60, '#ffe3a8');
      this.hud.toast('石燈籠已點燃 · 失誤時會回到這裡');
      return;
    }
    this._writeSave();
    this.effects.floatText('進度已記錄', cp.x, cp.y - 60, '#ffe3a8');
    this.hud.toast('石燈籠已點燃 · 生命完全恢復');
  }

  _collectSoul(drop) {
    const p = this.player;
    drop.collected = true;
    p.hp = Math.min(p.maxHp, p.hp + 1);
    this.audio.play('heal');
    this.effects.burst(drop.x, drop.y, ['#ffffff', '#bff1ff', '#4fb3ff']);
    this.effects.floatText('+1', drop.x, drop.y - 14, '#bff1ff');
  }

  spawnSwordWave(player) {
    const cfg = player.cfg;
    const x = player.facing > 0 ? player.x + player.width + 10 : player.x - 10;
    this.projectiles.push(new SwordWave(x, player.y + 42, player.facing, {
      speed: cfg.waveSpeed, life: cfg.waveLife, damage: cfg.waveDamage
    }));
  }

  _collectPickup(pickup) {
    const p = this.player;
    pickup.collected = true;
    pickup.info.apply(this.progress);
    this.progress.collected.push(pickup.id);
    p.abilities = { ...p.abilities, ...this.progress.abilities };
    p.maxHp = this.progress.maxHp;
    p.hp = p.maxHp;
    if (p.abilities.doubleJump && !p.isGrounded) p.airJumpsLeft = 1;
    this._writeSave();
    this.audio.play('ability');
    this.hitstop = 0.12;
    this.camera.shake(3, 0.3);
    this.effects.burst(pickup.x, pickup.y, pickup.info.colors);
    this.hud.showAbility(pickup);
  }

  /* ------------------------------ 渲染 ------------------------------ */

  render() {
    const b = this.bctx;
    if (this.state.is(GameStates.MAIN_MENU) || !this.level) this._renderMenuScene(b);
    else this._renderWorld(b);

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.buffer, 0, 0, this.canvas.width, this.canvas.height);

    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this._renderUI(ctx);
  }

  _renderWorld(b) {
    const cam = this.camera.getView();
    this.background.render(b, cam, this.time, this.fogLevel);
    this.level.renderBack(b, cam);
    this.level.tilemap.render(b, cam);
    this.level.renderFront(b, cam, this.time);
    for (const e of this.level.enemies) e.render(b, cam);
    if (!(this.respawning && this._fadeAlpha() > 0.95)) this.player.render(b, cam);
    this._renderScarfReticle(b, cam);
    for (const wave of this.projectiles) wave.render(b, cam);
    this.effects.render(b, cam);
    this.fx.render(b, cam, 'world');
    this.level.renderSecrets(b, cam);
    this.background.renderForeground(b, cam, this.time, this.fogLevel);
    this.vision.render(b, cam, this);
  }

  /** 圍巾目前會抓住的目標：四角準星 */
  _renderScarfReticle(b, cam) {
    const t = this.scarfTarget;
    if (!t || !this.state.is(GameStates.PLAYING)) return;
    const x = Math.round(t.x - cam.x), y = Math.round(t.y - cam.y);
    const r = 11 + Math.round(Math.sin(this.time * 8));
    b.fillStyle = t.kind === 'enemy' ? '#ffb3a8' : '#bfe0ff';
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = x + sx * r, cy = y + sy * r;
      b.fillRect(sx > 0 ? cx - 3 : cx, cy, 4, 1);   // 橫線往內
      b.fillRect(cx, sy > 0 ? cy - 3 : cy, 1, 4);   // 直線往內
    }
  }

  _renderMenuScene(b) {
    const cam = { x: this.menuScroll, y: 60, width: this.width, height: this.height };
    this.background.render(b, cam, this.time, 0.5);
    // 懸崖與佇立的劍客
    for (let c = 13; c < 21; c++) {
      for (let r = 0; r < 3; r++) {
        const mask = (r === 0 ? 1 : 0) | (c === 13 ? 2 : 0);
        b.drawImage(Sprites.tile(TILE.GROUND, mask, (c * 7 + r) % 4), c * 32 - 8, 300 + r * 32);
      }
      if (c % 2) b.drawImage(Sprites.tufts[c % 3], c * 32 - 8, 292);
    }
    b.drawImage(Sprites.props.pine.image, 560, 300 - 194);
    this.menuAnimator.draw(b, 470, 300, true);
    this.background.renderForeground(b, { x: this.menuScroll * 1.5, y: 60 }, this.time, 0.5);
  }

  _renderUI(ctx) {
    const s = this.state;
    if (s.is(GameStates.MAIN_MENU)) {
      this.menu.renderMain(ctx);
      return;
    }

    const cam = this.camera.view;
    if (!s.is(GameStates.VICTORY)) {
      this.hud.renderHints(ctx, cam);
      this.hud.renderFloatTexts(ctx, cam);
      this.hud.render(ctx);
      this.fx.render(ctx, { x: 0, y: 0 }, 'screen');
    }

    if (this.hurtFlash > 0) {
      const a = this.hurtFlash / 0.3;
      const grad = ctx.createRadialGradient(320, 180, 120, 320, 180, 380);
      grad.addColorStop(0, 'rgba(160,20,40,0)');
      grad.addColorStop(1, `rgba(160,20,40,${0.55 * a})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);
    }

    const fade = this._fadeAlpha();
    if (fade > 0) {
      ctx.fillStyle = `rgba(3,5,10,${fade})`;
      ctx.fillRect(0, 0, 640, 360);
    }

    if (s.is(GameStates.PAUSED)) this.menu.renderPause(ctx);
    else if (s.is(GameStates.GAME_OVER)) this.menu.renderGameOver(ctx, s.time);
    else if (s.is(GameStates.VICTORY)) this.menu.renderVictory(ctx, s.time);
  }
}
