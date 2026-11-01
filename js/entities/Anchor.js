/**
 * Anchor —— 風縛（圍巾）能抓住的固定物
 *
 * hook：從高處垂下的風鈴，圍巾抓住後會把劍客拉過去（空中也能用來改變方向）
 * lever：鈴緒（拉繩），圍巾拉動後打開相連的石門（opens：石門中任一格的 [欄, 列]）
 * (x, y) 是圍巾抓住的位置；繩子一路垂到地圖頂端之外。
 */
class Anchor {
  constructor({ type, x, y, opens = null }) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.opens = opens;
    this.pulled = false;
    this.swing = 0;
    this.swingV = 0;
    this.time = Math.random() * 10;
  }

  /** 被圍巾抓住或拉動時晃一下 */
  tug(dir) {
    this.swingV += dir * 4;
  }

  update(dt) {
    this.time += dt;
    this.swingV += (-this.swing * 30 - this.swingV * 3) * dt;
    this.swing += this.swingV * dt;
  }

  render(ctx, cam) {
    const sway = Math.sin(this.time * 1.3) * 0.6 + this.swing * 5;
    const drop = this.type === 'lever' && this.pulled ? -18 : 0;   // 拉過的鈴緒收短
    const x = Math.round(this.x + sway - cam.x), y = Math.round(this.y + drop - cam.y);
    if (x < -30 || x > cam.width + 30) return;
    const top = -cam.y - 20;
    const img = this.type === 'hook' ? Sprites.anchors.hook : Sprites.anchors.lever;

    // 垂下的繩子
    ctx.fillStyle = this.type === 'hook' ? '#8a7a5a' : '#c9b48a';
    const ropeEnd = y - img.height / 2 + 2;
    for (let yy = top; yy < ropeEnd; yy += 2) {
      const k = (yy - top) / Math.max(1, ropeEnd - top);
      ctx.fillRect(Math.round(x - sway * (1 - k)), yy, this.type === 'hook' ? 1 : 2, 2);
    }
    ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
    if (this.type === 'lever' && this.pulled) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,220,150,0.25)';
      ctx.fillRect(x - 6, y - 6, 12, 12);
      ctx.restore();
    }
  }
}
