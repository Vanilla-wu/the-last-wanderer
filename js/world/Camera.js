/**
 * Camera —— 橫向捲軸鏡頭（GDD 6.7）
 *
 *   ScreenX = WorldX - CameraX
 *   ScreenY = WorldY - CameraY
 *
 * 平滑跟隨玩家、依面向方向前瞻，並限制在關卡邊界內；另提供畫面震動。
 */
class Camera {
  constructor(viewWidth, viewHeight) {
    this.x = 0;
    this.y = 0;
    this.width = viewWidth;
    this.height = viewHeight;
    this.lookAhead = 0;
    this.worldWidth = viewWidth;
    this.worldHeight = viewHeight;
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeMagnitude = 0;
    this.view = { x: 0, y: 0, width: viewWidth, height: viewHeight };
  }

  setBounds(worldWidth, worldHeight) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  _target(player) {
    return {
      x: player.centerX + this.lookAhead - this.width / 2,
      y: player.y + player.height * 0.5 - this.height * 0.58
    };
  }

  _clamp() {
    this.x = Math.max(0, Math.min(this.x, this.worldWidth - this.width));
    this.y = Math.max(0, Math.min(this.y, this.worldHeight - this.height));
  }

  follow(player, dt) {
    this.lookAhead += (player.facing * 40 - this.lookAhead) * Math.min(1, dt * 2.5);
    const t = this._target(player);
    this.x += (t.x - this.x) * Math.min(1, dt * 6);
    this.y += (t.y - this.y) * Math.min(1, dt * 4);
    this._clamp();
    if (this.shakeTime > 0) this.shakeTime -= dt;
  }

  snapTo(player) {
    this.lookAhead = player.facing * 40;
    const t = this._target(player);
    this.x = t.x;
    this.y = t.y;
    this._clamp();
  }

  shake(magnitude, duration) {
    if (this.shakeTime > 0 && magnitude < this.shakeMagnitude) return;
    this.shakeMagnitude = magnitude;
    this.shakeDuration = duration;
    this.shakeTime = duration;
  }

  /** 回傳取整後（含震動）的視窗，供渲染使用 */
  getView() {
    let ox = 0, oy = 0;
    if (this.shakeTime > 0) {
      const k = this.shakeTime / this.shakeDuration;
      ox = (Math.random() * 2 - 1) * this.shakeMagnitude * k;
      oy = (Math.random() * 2 - 1) * this.shakeMagnitude * k;
    }
    this.view.x = Math.round(this.x + ox);
    this.view.y = Math.round(this.y + oy);
    return this.view;
  }
}
