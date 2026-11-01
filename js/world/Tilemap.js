/**
 * Tilemap —— 圖塊地圖（GDD 5.2、5.3）
 *
 * 關卡資料以「地形區段」描述（地面、岩壁、木板平台、尖刺），載入時展開成格狀陣列。
 * 地圖左右邊界視為實心牆；下方邊界之外是深谷。
 *
 * ICE（冰壁）：實心，一般攻擊打不破，只有蓄力斬與劍氣能斬開（相連的冰塊會一起碎裂）。
 *
 * GATE（石門）：實心，用圍巾拉動對應的鈴緒（Anchor lever）後整扇打開。
 *
 * PAST（過去的木橋 / 平台）：只在「殘影視界」開啟時（pastVisible）才是單向平台，
 * 平常不可踩踏、也不繪製，只在橋頭留下崩塌的殘骸。
 */
const TILE = Object.freeze({ EMPTY: 0, GROUND: 1, STONE: 2, PLATFORM: 3, SPIKE: 4, PAST: 5, ICE: 6, GATE: 7 });
const TILE_BY_NAME = { ground: TILE.GROUND, stone: TILE.STONE, platform: TILE.PLATFORM, spike: TILE.SPIKE, past: TILE.PAST, ice: TILE.ICE, gate: TILE.GATE };
const SOLID_TILES = new Set([TILE.GROUND, TILE.STONE, TILE.ICE, TILE.GATE]);

class Tilemap {
  constructor(cols, rows, tileSize) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.tiles = new Uint8Array(cols * rows);
    this.masks = new Uint8Array(cols * rows);
    this.pixelWidth = cols * tileSize;
    this.pixelHeight = rows * tileSize;
    this.pastVisible = false;
    this.pastTiles = [];
  }

  /** terrain 項目：[type, x0, x1, top, bottom?]；platform / spike 只佔 top 那一列 */
  static fromTerrain(data) {
    const map = new Tilemap(data.cols, data.rows, data.tileSize);
    for (const [name, x0, x1, top, bottom] of data.terrain) {
      const type = TILE_BY_NAME[name];
      const singleRow = type === TILE.PLATFORM || type === TILE.SPIKE || type === TILE.PAST;
      const last = singleRow ? top : (bottom ?? data.rows - 1);
      for (let x = x0; x <= x1; x++) {
        for (let y = top; y <= last; y++) map.set(x, y, type);
      }
    }
    map.computeMasks();
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) if (map.get(c, r) === TILE.PAST) map.pastTiles.push({ c, r });
    }
    return map;
  }

  inBounds(c, r) {
    return c >= 0 && c < this.cols && r >= 0 && r < this.rows;
  }

  get(c, r) {
    return this.inBounds(c, r) ? this.tiles[r * this.cols + c] : TILE.EMPTY;
  }

  set(c, r, type) {
    if (this.inBounds(c, r)) this.tiles[r * this.cols + c] = type;
  }

  isSolidAt(c, r) {
    if (c < 0 || c >= this.cols) return true;
    return SOLID_TILES.has(this.get(c, r));
  }

  isOneWayAt(c, r) {
    const t = this.get(c, r);
    return t === TILE.PLATFORM || (t === TILE.PAST && this.pastVisible);
  }

  isHazardAt(c, r) { return this.get(c, r) === TILE.SPIKE; }
  isPastAt(c, r) { return this.get(c, r) === TILE.PAST; }
  isIceAt(c, r) { return this.get(c, r) === TILE.ICE; }

  /** 斬開冰壁：與 (c, r) 相連的冰塊全部移除，回傳被移除的格子 */
  breakIceAt(c, r) {
    return this.removeConnected(c, r, TILE.ICE);
  }

  /** 移除與 (c, r) 相連、同類型的所有格子（冰壁碎裂、石門打開），回傳被移除的格子 */
  removeConnected(c, r, type) {
    if (this.get(c, r) !== type) return [];
    const removed = [];
    const stack = [[c, r]];
    while (stack.length) {
      const [x, y] = stack.pop();
      if (this.get(x, y) !== type) continue;
      this.set(x, y, TILE.EMPTY);
      removed.push({ c: x, r: y });
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    this.computeMasks();
    return removed;
  }

  /** 矩形範圍內的冰塊格子 */
  iceInRect(box) {
    const T = this.tileSize;
    const cells = [];
    for (let r = Math.floor(box.y / T); r <= Math.floor((box.y + box.height) / T); r++) {
      for (let c = Math.floor(box.x / T); c <= Math.floor((box.x + box.width) / T); c++) {
        if (this.isIceAt(c, r)) cells.push({ c, r });
      }
    }
    return cells;
  }

  computeMasks() {
    const solid = (c, r) => SOLID_TILES.has(this.get(c, r));
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const t = this.get(c, r);
        if (!t) continue;
        let mask = 0;
        if (t === TILE.PLATFORM || t === TILE.PAST) {
          if (this.get(c - 1, r) !== t) mask |= 2;
          if (this.get(c + 1, r) !== t) mask |= 4;
        } else {
          if (!solid(c, r - 1) && r > 0) mask |= 1;
          if (c > 0 && !solid(c - 1, r)) mask |= 2;
          if (c < this.cols - 1 && !solid(c + 1, r)) mask |= 4;
        }
        this.masks[r * this.cols + c] = mask;
      }
    }
  }

  render(ctx, cam) {
    const T = this.tileSize;
    const c0 = Math.max(0, Math.floor(cam.x / T)), c1 = Math.min(this.cols - 1, Math.floor((cam.x + cam.width) / T));
    const r0 = Math.max(0, Math.floor(cam.y / T)), r1 = Math.min(this.rows - 1, Math.floor((cam.y + cam.height) / T));

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = this.tiles[r * this.cols + c];
        if (!t) continue;
        const mask = this.masks[r * this.cols + c];
        if (t === TILE.PAST) {
          // 現在的世界：只剩橋頭的崩塌殘骸（橋頭旁要有地面支撐才畫）
          if ((mask & 2) && this.isSolidAt(c - 1, r)) ctx.drawImage(Sprites.pastRuin(-1), c * T - cam.x, r * T - cam.y);
          if ((mask & 4) && this.isSolidAt(c + 1, r)) ctx.drawImage(Sprites.pastRuin(1), c * T - cam.x, r * T - cam.y);
          continue;
        }
        const variant = (hash2(c, r) * 4) | 0;
        ctx.drawImage(Sprites.tile(t, mask, variant), c * T - cam.x, r * T - cam.y);
      }
    }

    // 地表草叢（覆蓋在上一列）
    for (let r = r0; r <= Math.min(this.rows - 1, r1 + 1); r++) {
      for (let c = c0; c <= c1; c++) {
        const t = this.tiles[r * this.cols + c];
        if ((t !== TILE.GROUND && t !== TILE.STONE) || !(this.masks[r * this.cols + c] & 1)) continue;
        const h = hash2(c, r, 7);
        if (h < 0.55) ctx.drawImage(Sprites.tufts[(h * 30 | 0) % 3], c * T - cam.x, r * T - cam.y - 8);
      }
    }
  }

  /** 殘影視界中的過去：木橋與平台的完整輪廓 */
  renderPast(ctx, cam, alpha) {
    if (alpha <= 0) return;
    const T = this.tileSize;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const { c, r } of this.pastTiles) {
      const x = c * T - cam.x, y = r * T - cam.y;
      if (x < -T || x > cam.width || y < -T || y > cam.height) continue;
      ctx.drawImage(Sprites.tile(TILE.PAST, this.masks[r * this.cols + c], (hash2(c, r) * 4) | 0), x, y);
    }
    ctx.restore();
  }
}
