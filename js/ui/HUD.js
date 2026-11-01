/**
 * HUD —— 生命值、關卡名稱、暫停按鈕、區域標題與提示（GDD 10.2）
 *
 * UI 直接畫在放大後的顯示 Canvas 上（座標仍用 640×360 邏輯單位），文字因此保持清晰。
 */
const UI_FONT = '"Noto Sans TC","Microsoft JhengHei","PingFang TC","Heiti TC",sans-serif';
const SERIF_FONT = 'Georgia,"Times New Roman",serif';

const ICON_FLAME = [
  '...o...',
  '..oLo..',
  '..oLLo.',
  '.oLBLo.',
  '.oBBBLo',
  'oBBWBBo',
  'oBWWWBo',
  'oBBWBBo',
  '.ooooo.'
];
const ICON_FULL = { o: '#0a0d17', L: '#bff1ff', B: '#4fb3ff', W: '#ffffff' };
const ICON_EMPTY = { o: '#0a0d17', L: '#2a3448', B: '#1c2436', W: '#2f3a50' };

const UIDraw = {
  text(ctx, str, x, y, { size = 12, color = '#eaf6ff', align = 'left', font = UI_FONT, weight = '', alpha = 1, baseline = 'middle', shadow = true } = {}) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    if (shadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(str, x + 1, y + 1);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  },

  panel(ctx, x, y, w, h, alpha = 0.85) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(8,12,22,0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(150,185,215,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = 'rgba(190,225,255,0.7)';
    for (const [cx, cy] of [[x, y], [x + w - 3, y], [x, y + h - 3], [x + w - 3, y + h - 3]]) ctx.fillRect(cx, cy, 3, 3);
    ctx.restore();
  },

  icon(ctx, rows, palette, x, y, s) {
    Px.template(ctx, rows, palette, x, y, s);
  },

  formatTime(t) {
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
  }
};

class HUD {
  constructor(game) {
    this.game = game;
    this.pauseButton = { x: 606, y: 10, width: 24, height: 24 };
    this.banner = null;
    this.card = null;
    this.toastMsg = null;
  }

  reset() {
    this.banner = null;
    this.card = null;
    this.toastMsg = null;
    this.ability = null;
  }

  showAbility(pickup) {
    this.ability = { pickup, t: 0, life: 4.5 };
  }

  showZone(zone) {
    this.banner = { zone, t: 0, life: 3 };
  }

  showTitleCard() {
    this.card = { t: 0, life: 4.4 };
  }

  toast(text) {
    this.toastMsg = { text, t: 0, life: 2.2 };
  }

  update(dt) {
    for (const key of ['banner', 'card', 'toastMsg', 'ability']) {
      const item = this[key];
      if (!item) continue;
      item.t += dt;
      if (item.t >= item.life) this[key] = null;
    }
  }

  _fade(item, fadeIn = 0.5, fadeOut = 0.8) {
    return Math.max(0, Math.min(1, item.t / fadeIn, (item.life - item.t) / fadeOut));
  }

  render(ctx) {
    const game = this.game;
    const player = game.player;
    const level = game.level;
    if (!player || !level) return;

    // 生命值
    const lowHp = player.hp === 1 && Math.sin(game.time * 8) > 0;
    for (let i = 0; i < player.maxHp; i++) {
      const full = i < player.hp;
      UIDraw.icon(ctx, ICON_FLAME, full ? (lowHp ? { ...ICON_FULL, B: '#9fd6ff' } : ICON_FULL) : ICON_EMPTY, 14 + i * 20, 10, 2);
    }
    UIDraw.text(ctx, `${level.chapter}　${level.name}`, 14, 40, { size: 10, color: 'rgba(205,220,235,0.85)' });

    // 已取得的能力（衝刺冷卻中、二段跳用掉時變暗）
    let iconX = 16 + player.maxHp * 20;
    for (const type of ['dash', 'doubleJump', 'chargeSlash', 'vision', 'scarf']) {
      if (!player.abilities[type]) continue;
      const img = Sprites.pickups[type];
      const dimmed = (type === 'dash' && !player.canDash()) ||
                     (type === 'doubleJump' && !player.isGrounded && player.airJumpsLeft === 0) ||
                     (type === 'vision' && !game.vision.active && !game.vision.ready) ||
                     (type === 'scarf' && !player.canScarf());
      ctx.save();
      ctx.globalAlpha = dimmed ? 0.35 : 0.95;
      ctx.drawImage(img, iconX, 9, img.width * 0.75, img.height * 0.75);
      ctx.restore();
      if (type === 'vision' && game.vision.active) {
        // 殘影視界剩餘時間
        const w = img.width * 0.75;
        ctx.fillStyle = 'rgba(10,13,23,0.8)';
        ctx.fillRect(iconX, 27, w, 3);
        ctx.fillStyle = game.vision.remaining < VISION_CONFIG.warnTime ? '#f3eeff' : '#9a86ff';
        ctx.fillRect(iconX, 27, w * game.vision.remaining / VISION_CONFIG.duration, 3);
      }
      iconX += img.width * 0.75 + 4;
    }

    // 暫停按鈕與計時
    const b = this.pauseButton;
    const hover = this._hover(b);
    UIDraw.panel(ctx, b.x, b.y, b.width, b.height, hover ? 1 : 0.75);
    ctx.fillStyle = hover ? '#ffffff' : '#bcd3e8';
    ctx.fillRect(b.x + 8, b.y + 7, 3, 10);
    ctx.fillRect(b.x + 13, b.y + 7, 3, 10);
    UIDraw.text(ctx, UIDraw.formatTime(game.stats.time), b.x - 8, b.y + 12, { size: 10, align: 'right', color: 'rgba(205,220,235,0.85)' });
    let infoY = b.y + 26;
    if (game.isParkour()) {
      // 跑酷挑戰：最佳紀錄與失誤次數
      const best = SaveStore.get('parkourBest', null);
      UIDraw.text(ctx, `最佳 ${best === null ? '--:--.-' : UIDraw.formatTime(best)}　失誤 ${game.stats.mistakes}`, b.x - 8, infoY, { size: 8, align: 'right', color: 'rgba(255,227,168,0.8)' });
      infoY += 12;
    }
    if (game.audio.muted) UIDraw.text(ctx, '靜音', b.x - 8, infoY, { size: 8, align: 'right', color: 'rgba(205,220,235,0.6)' });

    this._renderTitleCard(ctx, level);
    this._renderBanner(ctx);
    this._renderToast(ctx);
    this._renderAbility(ctx);
  }

  _renderAbility(ctx) {
    if (!this.ability) return;
    const a = this._fade(this.ability, 0.35, 0.8);
    const { info, type } = this.ability.pickup;
    const x = 170, y = 92, w = 300, h = 96;
    UIDraw.panel(ctx, x, y, w, h, a * 0.95);
    const img = Sprites.pickups[type];
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(img, x + 38 - img.width, y + h / 2 - img.height, img.width * 2, img.height * 2);
    ctx.restore();
    UIDraw.text(ctx, info.label, x + 84, y + 20, { size: 9, color: '#9fc3e6', alpha: a });
    UIDraw.text(ctx, info.name, x + 84, y + 40, { size: 18, weight: 'bold', alpha: a });
    UIDraw.text(ctx, info.desc, x + 84, y + 62, { size: 9, color: 'rgba(210,222,235,0.85)', alpha: a });
    UIDraw.text(ctx, info.hint, x + 84, y + 80, { size: 10, color: '#ffe3a8', alpha: a });
  }

  _hover(rect) {
    const m = this.game.input.mouse;
    return m.x >= rect.x && m.x <= rect.x + rect.width && m.y >= rect.y && m.y <= rect.y + rect.height;
  }

  _renderTitleCard(ctx, level) {
    if (!this.card) return;
    const a = this._fade(this.card, 0.7, 1);
    ctx.save();
    ctx.globalAlpha = a * 0.6;
    const grad = ctx.createLinearGradient(0, 90, 0, 190);
    grad.addColorStop(0, 'rgba(5,8,15,0)');
    grad.addColorStop(0.5, 'rgba(5,8,15,0.9)');
    grad.addColorStop(1, 'rgba(5,8,15,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 90, 640, 100);
    ctx.restore();
    UIDraw.text(ctx, level.chapter, 320, 112, { size: 11, align: 'center', color: '#9fc3e6', alpha: a });
    UIDraw.text(ctx, level.name, 320, 136, { size: 28, align: 'center', alpha: a, weight: 'bold' });
    UIDraw.text(ctx, level.nameEn, 320, 158, { size: 11, align: 'center', font: SERIF_FONT, color: '#b8c8da', alpha: a });
    UIDraw.text(ctx, level.intro, 320, 178, { size: 10, align: 'center', color: 'rgba(210,222,235,0.85)', alpha: a });
  }

  _renderBanner(ctx) {
    if (!this.banner || this.card) return;
    const a = this._fade(this.banner);
    const z = this.banner.zone;
    UIDraw.text(ctx, `${z.id} · ${z.en}`, 320, 62, { size: 9, align: 'center', font: SERIF_FONT, color: '#9fc3e6', alpha: a });
    UIDraw.text(ctx, z.name, 320, 80, { size: 18, align: 'center', alpha: a, weight: 'bold' });
    ctx.save();
    ctx.globalAlpha = a * 0.7;
    ctx.fillStyle = '#9fc3e6';
    ctx.fillRect(230, 80, 40, 1);
    ctx.fillRect(370, 80, 40, 1);
    ctx.restore();
  }

  _renderToast(ctx) {
    if (!this.toastMsg) return;
    const a = this._fade(this.toastMsg, 0.25, 0.5);
    ctx.save();
    ctx.font = `11px ${UI_FONT}`;
    const w = ctx.measureText(this.toastMsg.text).width + 28;
    ctx.restore();
    UIDraw.panel(ctx, 320 - w / 2, 316, w, 22, a * 0.9);
    UIDraw.text(ctx, this.toastMsg.text, 320, 327, { size: 11, align: 'center', alpha: a, color: '#ffe3a8' });
  }

  /** 世界中的告示牌提示，靠近時淡入 */
  renderHints(ctx, cam) {
    const game = this.game;
    const player = game.player;
    for (const h of game.level.hints) {
      const d = Math.abs(player.centerX - h.px);
      const a = Math.max(0, Math.min(1, 1 - (d - 90) / 80));
      if (a <= 0) continue;
      const x = h.px - cam.x, y = h.py - 104 - cam.y;   // 高於角色頭頂，避免遮住劍客
      ctx.save();
      ctx.font = `10px ${UI_FONT}`;
      const w = ctx.measureText(h.text).width + 20;
      ctx.restore();
      const bx = Math.max(6, Math.min(634 - w, x - w / 2));
      UIDraw.panel(ctx, bx, y - 10, w, 20, a * 0.9);
      UIDraw.text(ctx, h.text, bx + w / 2, y, { size: 10, align: 'center', alpha: a });
    }
  }

  renderFloatTexts(ctx, cam) {
    for (const t of this.game.effects.texts) {
      const k = t.t / t.life;
      const a = Math.min(1, (1 - k) * 2.5);
      UIDraw.text(ctx, t.text, t.x - cam.x, t.y - cam.y - k * 24, { size: 10, align: 'center', color: t.color, alpha: a });
    }
  }
}
