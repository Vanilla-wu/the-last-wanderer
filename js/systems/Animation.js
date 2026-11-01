/**
 * Animation System —— Sprite Sheet 與動畫播放器（GDD 6.6）
 *
 * SpriteSheet：每一列（row）是一段動畫，每一格（frame）大小固定，anchor 為角色腳底中心。
 * variants：同一張 sheet 的變體（flash = 受擊白閃，ghost = 閃避殘影）。
 */
class SpriteSheet {
  constructor({ image, variants = {}, frameWidth, frameHeight, anchorX, anchorY, animations }) {
    this.image = image;
    this.variants = { image, ...variants };
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.animations = animations;
  }

  drawFrame(ctx, row, frame, x, y, flip = false, variant = 'image', alpha = 1) {
    const img = this.variants[variant] || this.image;
    const fw = this.frameWidth, fh = this.frameHeight;
    const dx = Math.round(x), dy = Math.round(y);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (flip) {
      ctx.translate(dx, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, frame * fw, row * fh, fw, fh, -this.anchorX, dy - this.anchorY, fw, fh);
    } else {
      ctx.drawImage(img, frame * fw, row * fh, fw, fh, dx - this.anchorX, dy - this.anchorY, fw, fh);
    }
    ctx.restore();
  }
}

class Animator {
  constructor(sheet) {
    this.sheet = sheet;
    this.name = '';
    this.current = null;
    this.frame = 0;
    this.timer = 0;
    this.finished = false;
    this.onComplete = null;   // Animation Completion Event
  }

  play(name, restart = false) {
    if (this.name === name && !restart) return;
    const anim = this.sheet.animations[name];
    if (!anim) return;
    this.name = name;
    this.current = anim;
    this.frame = 0;
    this.timer = 0;
    this.finished = false;
  }

  update(dt) {
    const anim = this.current;
    if (!anim || this.finished) return;
    this.timer += dt;
    const duration = 1 / anim.fps;
    while (this.timer >= duration) {
      this.timer -= duration;
      this.frame++;
      if (this.frame >= anim.frames) {
        if (anim.loop) {
          this.frame = 0;
        } else {
          this.frame = anim.frames - 1;
          this.finished = true;
          if (this.onComplete) this.onComplete(this.name);
          break;
        }
      }
    }
  }

  draw(ctx, x, y, flip = false, { variant = 'image', alpha = 1 } = {}) {
    if (!this.current) return;
    this.sheet.drawFrame(ctx, this.current.row, this.frame, x, y, flip, variant, alpha);
  }
}
