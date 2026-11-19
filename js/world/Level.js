/**
 * Level —— 由關卡資料建立地圖、敵人、檢查點、出口與場景道具（GDD 5）
 */
class Level {
  /** collected：已撿過的道具 id，重新載入關卡時不再出現 */
  constructor(data, collected = []) {
    this.data = data;
    this.chapter = data.chapter;
    this.name = data.name;
    this.nameEn = data.nameEn;
    this.intro = data.intro;
    this.tileSize = data.tileSize;
    this.tilemap = Tilemap.fromTerrain(data);
    const T = this.tileSize;

    const footSpawn = (tx, row) => ({
      x: tx * T + (T - PLAYER_CONFIG.width) / 2,
      y: row * T - PLAYER_CONFIG.height
    });

    this.playerStart = footSpawn(...data.playerStart);

    this.checkpoints = data.checkpoints.map(([tx, row], index) => ({
      index,
      x: tx * T + T / 2,
      y: row * T,
      spawn: footSpawn(tx, row),
      trigger: { x: tx * T - 8, y: row * T - 96, width: T + 16, height: 96 },
      active: false,
      litTime: 0
    }));

    const [ex, erow, ew] = data.exit;
    this.exit = { x: ex * T, y: erow * T - 128, width: ew * T, height: 128 };

    this.zones = data.zones.map((z) => ({ ...z, px: z.x * T }));
    this.hints = data.hints.map((h) => ({ ...h, px: h.x * T + T / 2, py: h.row * T }));

    const props = [...data.props, ...data.hints.map((h) => ({ type: 'sign', x: h.x, row: h.row }))];
    this.props = props.map((p) => {
      const sprite = Sprites.props[p.type];
      return {
        type: p.type,
        sprite,
        x: p.x * T + T / 2 - sprite.image.width / 2,
        y: p.row * T - sprite.image.height + sprite.sink,
        back: p.type === 'pine' || p.type === 'pine2'
      };
    });

    this.pickups = (data.pickups || [])
      .filter((p) => !collected.includes(p.id))
      .map((p) => new Pickup({ id: p.id, type: p.type, x: p.x * T + T / 2, y: p.row * T - 30, required: p.required }));

    // 可擊破的物件（陶罐、雪堆）：重新載入關卡時會恢復原狀
    this.breakables = (data.breakables || []).map((b) => new Breakable({ type: b.type, x: b.x * T + T / 2, y: b.row * T, drop: b.drop }));
    this.drops = [];
    this.anchors = (data.anchors || []).map((a) => new Anchor({ type: a.type, x: a.x * T + T / 2, y: a.row * T + T / 2, opens: a.opens }));
    this.openingGates = [];   // 正在升起的石門格子（純視覺）

    // 隱藏區域：現形前畫成岩壁（外框依周圍地形決定，與一般岩壁接得起來）
    this.secrets = (data.secrets || []).map((s) => {
      const inside = (c, r) => c >= s.x0 && c <= s.x1 && r >= s.top && r <= s.bottom;
      const solid = (c, r) => inside(c, r) || this.tilemap.isSolidAt(c, r);
      const cells = [];
      for (let r = s.top; r <= s.bottom; r++) {
        for (let c = s.x0; c <= s.x1; c++) {
          const mask = (solid(c, r - 1) ? 0 : 1) | (solid(c - 1, r) ? 0 : 2) | (solid(c + 1, r) ? 0 : 4);
          cells.push({ c, r, mask, variant: (hash2(c, r) * 4) | 0 });
        }
      }
      return {
        rect: { x: s.x0 * T, y: s.top * T, width: (s.x1 - s.x0 + 1) * T, height: (s.bottom - s.top + 1) * T },
        cells, revealed: false, alpha: 1
      };
    });

    this.spawnEnemies();
  }

  spawnEnemies() {
    const T = this.tileSize;
    this.enemies = this.data.enemies.map(([tx, row, range, hp]) => new Enemy(
      tx * T + (T - ENEMY_CONFIG.width) / 2,
      row * T - ENEMY_CONFIG.height,
      { range, hp },
      T
    ));
    // 訓練用木樁：[欄, 地面列]
    for (const [tx, row] of this.data.dummies || []) {
      this.enemies.push(new TrainingDummy(tx * T + (T - DUMMY_CONFIG.width) / 2, row * T - DUMMY_CONFIG.height));
    }
    // 火焰骷髏：[欄, 列] 是飄浮的位置（骷髏中心）
    for (const [tx, row] of this.data.skulls || []) {
      const s = SKULL_CONFIG.size;
      this.enemies.push(new FlyingSkull(tx * T + (T - s) / 2, row * T + (T - s) / 2));
    }
    this.totalEnemies = this.enemies.length;
  }

  zoneAt(px) {
    let zone = this.zones[0];
    for (const z of this.zones) if (px >= z.px) zone = z;
    return zone;
  }

  update(dt, game) {
    for (const enemy of this.enemies) enemy.update(dt, this.tilemap, game);
    for (const enemy of this.enemies) {
      if (enemy.removed && !enemy.isDead) game.stats.kills++;   // 被擊落深谷
    }
    this.enemies = this.enemies.filter((e) => !e.removed);

    for (const s of this.secrets) if (s.revealed) s.alpha = Math.max(0, s.alpha - dt * 2.2);
    for (const a of this.anchors) a.update(dt);
    for (const g of this.openingGates) g.t += dt;
    this.openingGates = this.openingGates.filter((g) => g.t < 0.6);
    for (const b of this.breakables) b.update(dt);
    this.breakables = this.breakables.filter((b) => !b.broken);
    for (const d of this.drops) d.update(dt, this.tilemap, game);
    this.drops = this.drops.filter((d) => !d.collected);

    for (const p of this.pickups) p.update(dt, game);
    this.pickups = this.pickups.filter((p) => !p.collected);

    for (const cp of this.checkpoints) {
      if (!cp.active) continue;
      cp.litTime += dt;
      if (Math.random() < dt * 5) game.effects.ember(cp.x + (Math.random() - 0.5) * 6, cp.y - 34);
    }

    const shrine = this.exit;
    if (Math.random() < dt * 3) {
      game.effects.mote(shrine.x + Math.random() * shrine.width, shrine.y + shrine.height - Math.random() * 40);
    }
  }

  _drawProp(ctx, cam, p) {
    const img = p.sprite.image;
    const sx = Math.round(p.x - cam.x), sy = Math.round(p.y - cam.y);
    if (sx > cam.width || sx + img.width < 0) return;
    ctx.drawImage(img, sx, sy);
  }

  renderBack(ctx, cam) {
    for (const p of this.props) if (p.back) this._drawProp(ctx, cam, p);
  }

  renderFront(ctx, cam, time) {
    for (const p of this.props) if (!p.back) this._drawProp(ctx, cam, p);
    for (const g of this.openingGates) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - g.t / 0.6);
      ctx.drawImage(Sprites.tile(TILE.GATE, 0, 0), g.c * this.tileSize - cam.x, g.r * this.tileSize - cam.y - g.t * 90);
      ctx.restore();
    }
    for (const a of this.anchors) a.render(ctx, cam);
    for (const b of this.breakables) b.render(ctx, cam);
    for (const d of this.drops) d.render(ctx, cam, time);

    for (const cp of this.checkpoints) {
      const sprite = cp.active ? Sprites.props.lanternLit : Sprites.props.lantern;
      const img = sprite.image;
      const sx = Math.round(cp.x - img.width / 2 - cam.x), sy = Math.round(cp.y - img.height - cam.y);
      if (sx > cam.width || sx + img.width < 0) continue;
      ctx.drawImage(img, sx, sy);
      if (cp.active) this._glow(ctx, cp.x - cam.x, cp.y - 30 - cam.y, 46 + Math.sin(time * 9) * 3, 'rgba(255,200,110,', 0.32);
    }

    for (const pickup of this.pickups) pickup.render(ctx, cam);

    for (const p of this.props) {
      if (p.type === 'lanternLit') {
        this._glow(ctx, p.x + p.sprite.image.width / 2 - cam.x, p.y + 18 - cam.y, 42 + Math.sin(time * 7 + p.x) * 3, 'rgba(255,200,110,', 0.28);
      } else if (p.type === 'shrine') {
        this._glow(ctx, p.x + p.sprite.image.width / 2 - cam.x, p.y + 82 - cam.y, 70 + Math.sin(time * 2) * 6, 'rgba(255,220,150,', 0.22);
      }
    }
  }

  /** 尚未現形的隱藏區域：蓋上一層岩壁（畫在所有物件之上） */
  renderSecrets(ctx, cam) {
    const T = this.tileSize;
    for (const s of this.secrets) {
      if (s.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = s.alpha;
      for (const cell of s.cells) {
        ctx.drawImage(Sprites.tile(TILE.STONE, cell.mask, cell.variant), cell.c * T - cam.x, cell.r * T - cam.y);
      }
      ctx.restore();
    }
  }

  _glow(ctx, x, y, radius, rgb, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `${rgb}${alpha})`);
    grad.addColorStop(1, `${rgb}0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }
}
