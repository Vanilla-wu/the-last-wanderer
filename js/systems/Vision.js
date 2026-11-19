/**
 * Vision —— 殘影視界（Afterimage Vision，需取得「殘影之眼」）
 *
 * 按 L 以獨眼窺見這片土地過去的模樣，持續數秒：
 *   1. 畫面由劍客的眼睛向外褪色，染上淡紫的殘影色
 *   2. 過去的木橋與平台（TILE.PAST）重新顯現，而且可以踩踏
 *   3. 看得見妖怪幾秒前留下的移動軌跡
 * 視界將結束前，過去的輪廓會閃爍提醒；結束後站在過去平台上的劍客會直接落下。
 */
const VISION_CONFIG = Object.freeze({
  duration: 4.5,      // 持續時間
  cooldown: 1.2,      // 結束後的冷卻
  warnTime: 1.2,      // 剩餘多少秒開始閃爍
  openSpeed: 3.2,     // 視界展開 / 收合速度（每秒）
  maxRadius: 760
});

class AfterimageVision {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.time = 0;
    this.cooldown = 0;
    this.level = 0;     // 0 = 現在、1 = 完全進入過去（畫面過渡用）
  }

  get remaining() {
    return this.active ? Math.max(0, VISION_CONFIG.duration - this.time) : 0;
  }

  get ready() {
    return !this.active && this.cooldown <= 0;
  }

  /** 過去的輪廓目前的透明度（快結束時閃爍） */
  get pastAlpha() {
    if (!this.active) return this.level * 0.6;
    const warn = this.remaining < VISION_CONFIG.warnTime && Math.floor(this.time * 12) % 2 === 0;
    return this.level * (warn ? 0.4 : 0.9);
  }

  tryActivate(game) {
    if (!this.ready) return false;
    this.active = true;
    this.time = 0;
    game.level.tilemap.pastVisible = true;
    game.audio.play('vision');
    const p = game.player;
    game.effects.burst(p.centerX + p.facing * 3, p.y + 16, ['#ffffff', '#d9c8ff', '#9a86ff']);
    return true;
  }

  end(game) {
    if (!this.active) return;
    this.active = false;
    this.cooldown = VISION_CONFIG.cooldown;
    game.level.tilemap.pastVisible = false;
    game.audio.play('visionEnd');
  }

  update(dt, game) {
    const cfg = VISION_CONFIG;
    if (this.active) {
      this.time += dt;
      if (this.time >= cfg.duration) this.end(game);
    } else {
      this.cooldown -= dt;
    }
    this.level = Physics.approach(this.level, this.active ? 1 : 0, cfg.openSpeed * dt);

    // 現在的世界裡，過去的位置偶爾閃過微光，暗示那裡曾經有路
    if (!this.active && game.player.abilities.vision) {
      const map = game.level.tilemap, T = map.tileSize, view = game.camera.view;
      for (const { c, r } of map.pastTiles) {
        const x = c * T + T / 2;
        if (x < view.x - T || x > view.x + view.width + T || Math.random() >= dt * 0.25) continue;
        game.effects.sparkle(x + (Math.random() - 0.5) * T, r * T + Math.random() * 6, ['#d9c8ff', '#9a86ff']);
      }
    }
  }

  render(ctx, cam, game) {
    const k = this.level;
    if (k <= 0) return;
    const p = game.player;
    const ex = p.centerX + p.facing * 3 - cam.x, ey = p.y + 16 - cam.y;
    const eased = 1 - (1 - k) * (1 - k);
    const radius = 24 + eased * VISION_CONFIG.maxRadius;

    // 由獨眼向外擴散的褪色圓：降低彩度，再染上殘影色
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex, ey, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, cam.width, cam.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#2c2058';
    ctx.fillRect(0, 0, cam.width, cam.height);
    ctx.restore();

    // 擴散中的邊緣光環
    if (k < 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(200,180,255,${0.5 * (1 - k)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ex, ey, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    game.level.tilemap.renderPast(ctx, cam, this.pastAlpha);
    this._renderTrails(ctx, cam, game, k);

    // 獨眼的微光
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = 10 + Math.sin(game.time * 6) * 2;
    const grad = ctx.createRadialGradient(ex, ey, 0, ex, ey, glow);
    grad.addColorStop(0, `rgba(220,200,255,${0.7 * k})`);
    grad.addColorStop(1, 'rgba(220,200,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(ex - glow, ey - glow, glow * 2, glow * 2);
    ctx.restore();
  }

  /** 妖怪過去幾秒的移動軌跡：越舊越淡 */
  _renderTrails(ctx, cam, game, k) {
    for (const e of game.level.enemies) {
      const trail = e.trail;
      const n = trail.length;
      if (!n || e.isDead) continue;
      ctx.fillStyle = `rgba(200,180,255,${0.5 * k})`;
      for (let i = 0; i < n; i++) {
        const s = trail[i];
        ctx.fillRect(Math.round(s.x - cam.x), Math.round(s.y - 14 - cam.y), 2, 2);
      }
      for (let i = n % 6; i < n; i += 6) {
        const s = trail[i];
        e.drawGhost(ctx, cam, s, k * 0.4 * (i + 1) / n);
      }
    }
  }
}
