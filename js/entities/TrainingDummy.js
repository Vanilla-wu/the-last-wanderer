/**
 * TrainingDummy —— 訓練用木樁
 *
 * 立在路邊的稻草木樁，打不壞、不會動、不造成傷害，用來練連段與各種招式。
 * 被打中會白閃並前後晃動（彈簧），照常跳出打擊火花、傷害數字與連擊數；下劈命中也會彈起，圍巾拉它只會晃一下。
 * 沿用 Enemy 的介面，所以戰鬥判定、圍巾與殘影視界都不必特別處理。
 */
const DUMMY_CONFIG = Object.freeze({
  width: 24, height: 58,
  stiffness: 140, damping: 7,   // 晃動的彈簧
  hitSwing: 5                   // 被打中時的晃動力道（每點傷害）
});

class TrainingDummy extends Enemy {
  constructor(x, y) {
    super(x, y, { range: 0, hp: Infinity });
    this.width = DUMMY_CONFIG.width;
    this.height = DUMMY_CONFIG.height;
    this.state = 'IDLE';
    this.angle = 0;
    this.angVel = 0;
  }

  get harmless() { return true; }

  update(dt) {
    const cfg = DUMMY_CONFIG;
    this.stateTime += dt;
    this.flashTimer -= dt;
    this.angVel += (-this.angle * cfg.stiffness - this.angVel * cfg.damping) * dt;
    this.angle += this.angVel * dt;
  }

  /** 打不壞：只晃動與白閃，永遠回傳沒有擊殺 */
  takeHit(damage, dirX, fromAbove = false) {
    this.flashTimer = 0.12;
    this.angVel += dirX * DUMMY_CONFIG.hitSwing * Math.min(2, damage) * (fromAbove ? 0.4 : 1);
    return false;
  }

  yankToward(targetX) {
    this.flashTimer = 0.1;
    this.angVel += (Math.sign(targetX - this.centerX) || 1) * DUMMY_CONFIG.hitSwing;
  }

  getHitbox() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  drawGhost() {}   // 不會移動，殘影視界中不畫軌跡

  render(ctx, cam) {
    const img = TrainingDummy.sprite(this.flashTimer > 0 ? 'flash' : 'image');
    // 以底部為軸心晃動
    ctx.save();
    ctx.translate(Math.round(this.centerX - cam.x), Math.round(this.bottom - cam.y));
    ctx.rotate(this.angle);
    ctx.drawImage(img, -Math.floor(img.width / 2), -img.height);
    ctx.restore();
  }

  /** 稻草木樁的像素圖（第一次用到時畫好並快取；flash 是受擊白閃版） */
  static sprite(variant) {
    if (!TrainingDummy._img) {
      const w = 34, h = 62;
      TrainingDummy._img = outlined(w, h, (g) => {
        const cx = 17;
        Px.rect(g, cx - 3, 6, 6, h - 6, '#5a3d25');            // 木柱
        Px.rect(g, cx - 3, 6, 2, h - 6, '#7a5636');
        Px.rect(g, cx - 4, h - 4, 8, 4, '#3e2a1a');             // 插進土裡的底部
        Px.rect(g, 2, 24, w - 4, 4, '#6b4a2c');                 // 橫木（手臂）
        Px.rect(g, 2, 24, w - 4, 1, '#8a6440');
        Px.rect(g, cx - 8, 18, 16, 26, '#c9a65a');              // 稻草束（身體）
        Px.rect(g, cx - 8, 18, 4, 26, '#e0c27a');
        Px.rect(g, cx + 5, 18, 3, 26, '#a8863f');
        for (const y of [24, 34]) Px.rect(g, cx - 8, y, 16, 2, '#7a3b2a');   // 草繩
        Px.circle(g, cx, 10, 7, '#c9a65a');                     // 頭
        Px.rect(g, cx - 4, 5, 3, 8, '#e0c27a');
        Px.rect(g, cx - 7, 12, 14, 2, '#7a3b2a');
        Px.rect(g, cx - 2, 28, 4, 4, '#b8402e');                // 靶心
        Px.rect(g, cx - 1, 29, 2, 2, '#f0e0c0');
      });
      TrainingDummy._flash = tintCanvas(TrainingDummy._img, '#ffffff');
    }
    return variant === 'flash' ? TrainingDummy._flash : TrainingDummy._img;
  }
}
