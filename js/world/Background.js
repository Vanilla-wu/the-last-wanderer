/**
 * Background —— 多層視差背景、寒霧、飄雪與暗角
 *
 * 遠山、中景丘陵與近景森林各自以不同係數捲動（Parallax Scrolling），
 * 所有圖層都在載入時程序化生成，並可水平無縫重複。
 */
class Background {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.sky = this._buildSky();
    this.layers = [
      { canvas: this._buildMountains(1280), factor: 0.08, yFactor: 0.15, base: '#3a4b64' },
      { canvas: this._buildHills(1024), factor: 0.22, yFactor: 0.3, base: '#24324a' },
      { canvas: this._buildForest(1024), factor: 0.45, yFactor: 0.5, base: '#111827' }
    ];
    this.fogTexture = this._buildFog();
    this.vignette = this._buildVignette();
    this.flakes = Array.from({ length: 90 }, () => ({
      x: Math.random() * (width + 40), y: Math.random() * (height + 20),
      z: 0.25 + Math.random() * 0.75, phase: Math.random() * Math.PI * 2
    }));
  }

  _buildSky() {
    const c = makeCanvas(this.width, this.height);
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0b1222');
    grad.addColorStop(0.45, '#1c2a44');
    grad.addColorStop(0.8, '#4a5d7a');
    grad.addColorStop(1, '#7a8ba3');
    g.fillStyle = grad;
    g.fillRect(0, 0, this.width, this.height);
    const r = mulberry32(11);
    for (let i = 0; i < 70; i++) {
      g.globalAlpha = 0.25 + r() * 0.6;
      Px.rect(g, r() * this.width, r() * 150, 1, 1, '#dfe9f5');
    }
    g.globalAlpha = 1;
    const glow = g.createRadialGradient(480, 66, 10, 480, 66, 90);
    glow.addColorStop(0, 'rgba(220,232,245,0.35)');
    glow.addColorStop(1, 'rgba(220,232,245,0)');
    g.fillStyle = glow;
    g.fillRect(380, 0, 200, 170);
    Px.circle(g, 480, 66, 18, '#e8eef2');
    Px.circle(g, 474, 61, 4, '#d3dce3');
    Px.circle(g, 487, 72, 3, '#d3dce3');
    Px.circle(g, 486, 58, 2, '#d3dce3');
    return c;
  }

  _haze(g, w, from, to, color) {
    g.globalCompositeOperation = 'source-atop';
    const grad = g.createLinearGradient(0, from, 0, to);
    grad.addColorStop(0, `rgba(${color},0)`);
    grad.addColorStop(1, `rgba(${color},0.6)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, this.height);
    g.globalCompositeOperation = 'source-over';
  }

  _pineSilhouette(g, x, base, h, color, widthFactor) {
    g.fillStyle = color;
    for (let yy = 0; yy < h; yy++) {
      const notch = 0.7 + 0.3 * ((yy % 9) / 9);
      const w = Math.round((yy / h) * h * widthFactor * notch);
      g.fillRect(Math.round(x - w), Math.round(base - h + yy), w * 2 + 1, 1);
    }
  }

  _buildMountains(W) {
    const H = this.height;
    const c = makeCanvas(W, H);
    const g = c.getContext('2d');
    const ridge = (x) => {
      const t = x / W * Math.PI * 2;
      return 175 - (38 * Math.sin(t * 2 + 1.3) + 22 * Math.sin(t * 5 + 0.4) + 9 * Math.sin(t * 13 + 2.1) + 4 * Math.sin(t * 29));
    };
    for (let x = 0; x < W; x++) {
      const y = Math.round(ridge(x));
      const lit = ridge(x + 1) > ridge(x);
      g.fillStyle = lit ? '#3d4e6a' : '#33435c';
      g.fillRect(x, y, 1, H - y);
      if (y < 150) {
        g.fillStyle = lit ? '#b6c6d6' : '#8798b0';
        g.fillRect(x, y, 1, Math.round((150 - y) * 0.6) + 2);
      }
    }
    this._haze(g, W, 130, H, '120,140,170');
    return c;
  }

  _buildHills(W) {
    const H = this.height;
    const c = makeCanvas(W, H);
    const g = c.getContext('2d');
    const ridge = (x) => {
      const t = x / W * Math.PI * 2;
      return 232 - (16 * Math.sin(t * 3 + 0.5) + 10 * Math.sin(t * 7 + 2) + 5 * Math.sin(t * 17));
    };
    g.fillStyle = '#24324a';
    for (let x = 0; x < W; x++) {
      const y = Math.round(ridge(x));
      g.fillRect(x, y, 1, H - y);
    }
    const r = mulberry32(21);
    for (let i = 0; i < 70; i++) {
      const x = i / 70 * W + r() * 10;
      const h = 18 + r() * 26;
      for (const ox of [-W, 0, W]) this._pineSilhouette(g, x + ox, ridge(x) + 4, h, '#1f2b40', 0.32);
    }
    this._haze(g, W, 190, H, '110,130,160');
    return c;
  }

  _buildForest(W) {
    const H = this.height;
    const c = makeCanvas(W, H);
    const g = c.getContext('2d');
    const ridge = (x) => {
      const t = x / W * Math.PI * 2;
      return 285 - (8 * Math.sin(t * 2) + 5 * Math.sin(t * 9 + 1));
    };
    g.fillStyle = '#121a2a';
    for (let x = 0; x < W; x++) {
      const y = Math.round(ridge(x));
      g.fillRect(x, y, 1, H - y);
    }
    const r = mulberry32(31);
    for (let i = 0; i < 26; i++) {
      const x = i / 26 * W + r() * 20;
      const h = 90 + r() * 80;
      for (const ox of [-W, 0, W]) {
        g.fillStyle = '#151d2e';
        g.fillRect(Math.round(x + ox) - 2, Math.round(ridge(x) - h * 0.3), 4, Math.round(h * 0.3) + 10);
        this._pineSilhouette(g, x + ox, ridge(x) - h * 0.15, h, '#131c2d', 0.26);
      }
      for (let k = 0; k < 10; k++) {
        const yy = ridge(x) - h * 0.15 - h + r() * h;
        const ww = (1 - (ridge(x) - h * 0.15 - yy) / h) * h * 0.26;
        const sx = x + (r() - 0.5) * ww * 1.6;
        for (const ox of [-W, 0, W]) Px.rect(g, sx + ox, yy, 2, 1, '#3e4f66');
      }
    }
    return c;
  }

  _buildFog() {
    const W = 640, H = 160;
    const c = makeCanvas(W, H);
    const g = c.getContext('2d');
    const r = mulberry32(51);
    for (let i = 0; i < 40; i++) {
      const x = r() * W, y = 40 + r() * 80, rx = 40 + r() * 70, ry = 14 + r() * 22;
      for (const ox of [-W, 0, W]) {
        g.save();
        g.translate(x + ox, y);
        g.scale(1, ry / rx);
        const grad = g.createRadialGradient(0, 0, 0, 0, 0, rx);
        grad.addColorStop(0, 'rgba(200,215,235,0.16)');
        grad.addColorStop(1, 'rgba(200,215,235,0)');
        g.fillStyle = grad;
        g.fillRect(-rx, -rx, rx * 2, rx * 2);
        g.restore();
      }
    }
    return c;
  }

  _buildVignette() {
    const c = makeCanvas(this.width, this.height);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(this.width / 2, this.height / 2, this.height * 0.35, this.width / 2, this.height / 2, this.width * 0.62);
    grad.addColorStop(0, 'rgba(5,8,15,0)');
    grad.addColorStop(1, 'rgba(5,8,15,0.6)');
    g.fillStyle = grad;
    g.fillRect(0, 0, this.width, this.height);
    return c;
  }

  _drawLayer(ctx, layer, cam) {
    const W = layer.canvas.width;
    let ox = -Math.round(cam.x * layer.factor) % W;
    if (ox > 0) ox -= W;
    const oy = Math.round((60 - cam.y) * layer.yFactor);
    ctx.drawImage(layer.canvas, ox, oy);
    ctx.drawImage(layer.canvas, ox + W, oy);
    if (oy < 0) {
      ctx.fillStyle = layer.base;
      ctx.fillRect(0, this.height + oy, this.width, -oy);
    }
  }

  _fogBand(ctx, y0, y1, alpha) {
    const grad = ctx.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0, 'rgba(150,170,198,0)');
    grad.addColorStop(1, `rgba(150,170,198,${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y0, this.width, this.height - y0);
  }

  render(ctx, cam, time, fog) {
    ctx.drawImage(this.sky, 0, 0);
    this._drawLayer(ctx, this.layers[0], cam);
    this._fogBand(ctx, 150, 300, 0.3 + fog * 0.15);
    this._drawLayer(ctx, this.layers[1], cam);
    this._fogBand(ctx, 210, 330, 0.2 + fog * 0.2);
    this._drawLayer(ctx, this.layers[2], cam);
  }

  renderForeground(ctx, cam, time, fog) {
    const FW = this.fogTexture.width;
    const bands = [
      { speed: 14, factor: 1.1, y: 210, alpha: 0.25 + fog * 0.55 },
      { speed: -8, factor: 0.8, y: 120, alpha: (0.1 + fog * 0.35) }
    ];
    for (const b of bands) {
      let ox = -Math.round(cam.x * b.factor + time * b.speed) % FW;
      if (ox > 0) ox -= FW;
      const y = Math.round(b.y - cam.y * 0.25);
      ctx.globalAlpha = Math.min(1, b.alpha);
      ctx.drawImage(this.fogTexture, ox, y);
      ctx.drawImage(this.fogTexture, ox + FW, y);
    }
    ctx.globalAlpha = 1;

    const W = this.width + 40, H = this.height + 20;
    for (const f of this.flakes) {
      let x = (f.x - cam.x * f.z * 0.6 + Math.sin(time * 0.8 + f.phase) * 12 * f.z + time * 10 * f.z) % W;
      let y = (f.y + time * (16 + 30 * f.z) - cam.y * f.z * 0.6) % H;
      if (x < 0) x += W;
      if (y < 0) y += H;
      ctx.fillStyle = `rgba(230,240,248,${0.35 + 0.55 * f.z})`;
      const s = f.z > 0.75 ? 2 : 1;
      ctx.fillRect(Math.round(x - 20), Math.round(y - 10), s, s);
    }

    ctx.drawImage(this.vignette, 0, 0);
  }
}
