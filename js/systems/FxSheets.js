/**
 * FxSheets —— 播放 pixelfx 匯出的 sprite sheet 特效（資料在 data/fxsheets.js，圖在 assets/fx/）
 *
 * 每個特效以 pivot（錨點）為準；origin 是錨點往外的偏移，代表「要對齊到 (x, y) 的那一點」，
 * 翻轉與旋轉都繞著這一點進行。例如刀光的 origin 是弧線中心，翻轉後仍落在劍客胸前。
 * layer：'world' 隨鏡頭移動並在命中停頓時凍結；'screen' 固定在畫面上（連擊數）。
 * 循環的 sheet（例如火焰骷髏）也可以用 drawFrame() 逐格畫，FxSheets.shared 是遊戲用的那一份。
 */
const FX_ROOT = 'assets/fx/';

class FxSheets {
  constructor(sheets = window.FX_SHEETS || {}) {
    this.sheets = sheets;
    this.images = {};
    this.variants = {};   // 受擊白閃（flash）、殘影（ghost）的著色版，第一次用到時才產生
    for (const name of Object.keys(sheets)) {
      const img = new Image();
      img.src = FX_ROOT + name + '.png';
      this.images[name] = img;
    }
    this.clear();
  }

  clear() {
    this.active = [];
  }

  /** 圖檔已載入、可以播放 */
  ready(name) {
    const img = this.images[name];
    return !!(img && img.complete && img.naturalWidth);
  }

  /** fromHit：從 act 資料的第一個命中時間開始播，命中停頓時就定格在最亮的那一格 */
  play(name, x, y, { flipX = false, flipY = false, rot = 0, origin = null, follow = null, speed = 1, layer = 'world', tag = null, fromHit = false } = {}) {
    if (!this.ready(name)) return null;
    if (tag) this.active = this.active.filter((f) => f.tag !== tag);   // 同一個 tag 只保留最新的
    const fx = {
      name, sheet: this.sheets[name], img: this.images[name], speed, layer, tag,
      t: fromHit && this.sheets[name].hits ? this.sheets[name].hits[0].t : 0,
      x, y, flipX, flipY, rot, ox: origin ? origin[0] : 0, oy: origin ? origin[1] : 0,
      follow, fdx: follow ? x - follow.centerX : 0, fdy: follow ? y - follow.bottom : 0
    };
    this.active.push(fx);
    return fx;
  }

  /** 直接畫 sheet 的第 frame 格，錨點對齊 (x, y)（已扣掉鏡頭）；variant：null、'flash' 或 'ghost' */
  drawFrame(ctx, name, frame, x, y, { flipX = false, variant = null, alpha = 1 } = {}) {
    const s = this.sheets[name];
    let img = this.images[name];
    if (variant) {
      const key = name + ':' + variant;
      if (!this.variants[key]) this.variants[key] = tintCanvas(img, variant === 'flash' ? '#ffffff' : '#6fc8ff');
      img = this.variants[key];
    }
    const [w, h] = s.frameSize;
    const f = frame % s.frames;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);
    ctx.drawImage(img, (f % s.columns) * w, Math.floor(f / s.columns) * h, w, h, -s.pivot[0], -s.pivot[1], w, h);
    ctx.restore();
  }

  update(dt, layer) {
    for (const f of this.active) if (f.layer === layer) f.t += dt * f.speed;
    this.active = this.active.filter((f) => f.t * f.sheet.fps < f.sheet.frames);
  }

  render(ctx, cam, layer) {
    for (const f of this.active) {
      if (f.layer !== layer) continue;
      const s = f.sheet;
      const frame = Math.min(s.frames - 1, Math.floor(f.t * s.fps));
      const [w, h] = s.frameSize;
      const sx = (frame % s.columns) * w, sy = Math.floor(frame / s.columns) * h;
      const x = f.follow ? f.follow.centerX + f.fdx : f.x;
      const y = f.follow ? f.follow.bottom + f.fdy : f.y;
      ctx.save();
      ctx.translate(Math.round(x - cam.x), Math.round(y - cam.y));
      // 左右翻轉在畫面座標上做（朝左時整個特效鏡像），上下翻轉則在旋轉之後、沿特效自己的軸
      if (f.flipX) ctx.scale(-1, 1);
      if (f.rot) ctx.rotate(f.rot);
      if (f.flipY) ctx.scale(1, -1);
      ctx.drawImage(f.img, sx, sy, w, h, -s.pivot[0] - f.ox, -s.pivot[1] - f.oy, w, h);
      ctx.restore();
    }
  }
}
