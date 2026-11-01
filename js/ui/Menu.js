/**
 * Menu —— 主選單、暫停、Game Over、通關畫面（GDD 10.1、10.3）
 * 鍵盤（↑↓ + Enter / J / Space）與滑鼠都可操作。
 */
class ListMenu {
  constructor(items) {
    this.items = items;
    this.index = Math.max(0, items.findIndex((i) => !i.disabled));
    this.rects = [];
  }

  move(dir, audio) {
    const n = this.items.length;
    let i = this.index;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!this.items[i].disabled) {
        this.index = i;
        audio.play('menu');
        return;
      }
    }
  }

  update(input, audio) {
    if (input.wasPressed('up')) this.move(-1, audio);
    if (input.wasPressed('down')) this.move(1, audio);

    const m = input.mouse;
    if (m.moved || m.clicked) {
      const hit = this.rects.findIndex((r) => r && m.x >= r.x && m.x <= r.x + r.width && m.y >= r.y && m.y <= r.y + r.height);
      if (hit >= 0 && !this.items[hit].disabled) {
        if (hit !== this.index) {
          this.index = hit;
          audio.play('menu');
        }
        if (m.clicked) return this.activate(audio);
      }
    }
    if (input.wasPressed('confirm')) return this.activate(audio);
    return false;
  }

  activate(audio) {
    const item = this.items[this.index];
    if (!item || item.disabled) return false;
    audio.play('select');
    item.action();
    return true;
  }

  render(ctx, x, y, { spacing = 24, size = 13, align = 'left', alpha = 1 } = {}) {
    ctx.save();
    ctx.font = `${size}px ${UI_FONT}`;
    this.items.forEach((item, i) => {
      const yy = y + i * spacing;
      const selected = i === this.index;
      const w = ctx.measureText(item.label).width;
      const left = align === 'center' ? x - w / 2 : x;
      this.rects[i] = { x: left - 18, y: yy - spacing / 2 + 2, width: w + 36, height: spacing - 4 };
      if (selected) {
        ctx.globalAlpha = alpha * 0.9;
        const grad = ctx.createLinearGradient(left - 18, 0, left + w + 30, 0);
        grad.addColorStop(0, 'rgba(79,179,255,0.32)');
        grad.addColorStop(1, 'rgba(79,179,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(left - 18, yy - spacing / 2 + 3, w + 48, spacing - 6);
        ctx.fillStyle = '#bff1ff';
        ctx.fillRect(left - 12, yy - 2, 4, 4);
      }
      ctx.restore();
      ctx.save();
      ctx.font = `${size}px ${UI_FONT}`;
      UIDraw.text(ctx, item.label, x, yy, {
        size, align, alpha,
        color: item.disabled ? '#4b5568' : selected ? '#eaf6ff' : '#8395ad'
      });
    });
    ctx.restore();
  }
}

const CONTROL_LIST = [
  ['A / D 或 ← →', '左右移動'],
  ['Space', '跳躍（長按跳得更高）'],
  ['空中 Space', '二段跳（需取得天狗之羽）'],
  ['↓ + Space', '穿越木板平台'],
  ['J', '揮刀攻擊（連按最多三段）'],
  ['↑ + J', '上劈'],
  ['空中 ↓ + J', '下劈（命中敵人或尖刺會彈起）'],
  ['按住 J', '蓄力斬（需取得居合之卷）'],
  ['蓄滿 + W', '放開 J 改為螺旋斬'],
  ['K', '衝刺（需取得疾風之履）'],
  ['L', '殘影視界（需取得殘影之眼）'],
  ['I', '風縛：圍巾抓取（需取得蒼風之結）'],
  ['ESC / P', '暫停'],
  ['M', '靜音切換']
];

class MenuSystem {
  constructor(game) {
    this.game = game;
    this.screen = 'main';
    this.list = null;
    this.showControls = false;
  }

  openMain() {
    const g = this.game;
    this.screen = 'main';
    this.showControls = false;
    const unlocked = g.parkourUnlocked();
    this.list = new ListMenu([
      { label: '開始新旅程', action: () => g.newGame() },
      { label: '從檢查點繼續', disabled: !g.hasSave(), action: () => g.continueGame() },
      { label: unlocked ? '跑酷挑戰' : '跑酷挑戰（通關第一章後解鎖）', disabled: !unlocked, action: () => g.startParkour() },
      { label: '操作說明', action: () => { this.showControls = true; } }
    ]);
  }

  openPause() {
    const g = this.game;
    this.screen = 'pause';
    const items = [
      { label: '繼續遊戲', action: () => g.resume() },
      { label: g.lastCheckpoint >= 0 ? '從檢查點重來' : '重新開始', action: () => g.retry() },
      { label: '回到主選單', action: () => g.toMainMenu() }
    ];
    if (g.isParkour() && g.lastCheckpoint >= 0) items.splice(2, 0, { label: '從起點重新挑戰', action: () => g.startParkour() });
    this.list = new ListMenu(items);
  }

  openGameOver() {
    const g = this.game;
    this.screen = 'gameover';
    this.list = new ListMenu([
      { label: g.lastCheckpoint >= 0 ? '從檢查點重來' : '重新開始', action: () => g.retry() },
      { label: '回到主選單', action: () => g.toMainMenu() }
    ]);
  }

  openVictory() {
    const g = this.game;
    this.screen = 'victory';
    this.list = new ListMenu([
      { label: '再次挑戰', action: () => (g.isParkour() ? g.startParkour() : g.newGame()) },
      { label: '回到主選單', action: () => g.toMainMenu() }
    ]);
  }

  update(dt, input) {
    const g = this.game;
    if (this.screen === 'main' && this.showControls) {
      if (input.wasPressed('confirm') || input.wasPressed('back') || input.mouse.clicked) {
        this.showControls = false;
        g.audio.play('menu');
      }
      return;
    }
    if (this.screen === 'pause' && (input.wasPressed('back') || input.wasPressed('pause') || input.clickedIn(g.hud.pauseButton))) {
      g.resume();
      return;
    }
    if (this.list) this.list.update(input, g.audio);
  }

  /* ------------------------------ 繪製 ------------------------------ */

  renderMain(ctx) {
    const g = this.game;
    UIDraw.text(ctx, 'The Last Wanderer', 48, 116, { size: 40, font: SERIF_FONT, color: '#eaf3fb' });
    UIDraw.text(ctx, '末　路　行　者', 51, 150, { size: 17, color: '#9fc3e6' });
    UIDraw.text(ctx, '一名失去記憶的獨眼劍客，於寒霧中踏上歸途。', 51, 174, { size: 10, color: 'rgba(200,215,230,0.75)' });
    this.list.render(ctx, 66, 214, { spacing: 26, size: 13 });

    const best = SaveStore.get('best', null);
    const parkourBest = SaveStore.get('parkourBest', null);
    const records = [];
    if (best !== null) records.push(`最佳通關　${UIDraw.formatTime(best)}`);
    if (parkourBest !== null) records.push(`跑酷最佳　${UIDraw.formatTime(parkourBest)}`);
    if (records.length) UIDraw.text(ctx, records.join('　　'), 51, 318, { size: 10, color: '#ffe3a8' });
    UIDraw.text(ctx, '↑ ↓ 選擇　Enter / J 確認　M 靜音', 51, 338, { size: 9, color: 'rgba(200,215,230,0.55)' });
    UIDraw.text(ctx, 'v1.0 Demo', 628, 344, { size: 8, align: 'right', font: SERIF_FONT, color: 'rgba(200,215,230,0.4)' });

    if (this.showControls) this._renderControls(ctx, 160, 44, 320, 272, '操作說明', true);
  }

  _renderControls(ctx, x, y, w, h, title, footer) {
    ctx.fillStyle = 'rgba(3,5,10,0.5)';
    if (footer) ctx.fillRect(0, 0, 640, 360);
    UIDraw.panel(ctx, x, y, w, h, 0.95);
    UIDraw.text(ctx, title, x + w / 2, y + 22, { size: 13, align: 'center', weight: 'bold' });
    CONTROL_LIST.forEach(([key, desc], i) => {
      const yy = y + 42 + i * 14.4;
      UIDraw.text(ctx, key, x + w * 0.36, yy, { size: 10, align: 'right', color: '#bff1ff' });
      UIDraw.text(ctx, desc, x + w * 0.36 + 12, yy, { size: 10, color: '#c9d6e3' });
    });
    if (footer) UIDraw.text(ctx, '按任意確認鍵返回', x + w / 2, y + h - 14, { size: 9, align: 'center', color: 'rgba(200,215,230,0.55)' });
  }

  renderPause(ctx) {
    ctx.fillStyle = 'rgba(3,5,10,0.6)';
    ctx.fillRect(0, 0, 640, 360);
    UIDraw.panel(ctx, 50, 56, 210, 248, 0.95);
    UIDraw.text(ctx, '暫　停', 155, 96, { size: 18, align: 'center', weight: 'bold' });
    UIDraw.text(ctx, 'PAUSED', 155, 118, { size: 9, align: 'center', font: SERIF_FONT, color: '#9fc3e6' });
    this.list.render(ctx, 155, 170, { spacing: 30, size: 13, align: 'center' });
    this._renderControls(ctx, 274, 56, 316, 248, '操作說明', false);
  }

  renderGameOver(ctx, t) {
    const a = Math.min(1, t / 0.8);
    ctx.fillStyle = `rgba(20,4,8,${0.65 * a})`;
    ctx.fillRect(0, 0, 640, 360);
    UIDraw.text(ctx, '你 倒 下 了', 320, 130, { size: 28, align: 'center', color: '#f0d6d6', alpha: a, weight: 'bold' });
    UIDraw.text(ctx, '寒霧吞沒了劍客的身影……', 320, 162, { size: 11, align: 'center', color: 'rgba(230,200,200,0.8)', alpha: a });
    if (t > 0.6) this.list.render(ctx, 320, 214, { spacing: 30, size: 13, align: 'center', alpha: Math.min(1, (t - 0.6) / 0.4) });
  }

  renderVictory(ctx, t) {
    const g = this.game;
    const info = g.victoryInfo;
    const a = Math.min(1, t / 1.2);
    ctx.fillStyle = `rgba(4,7,14,${0.6 * a})`;
    ctx.fillRect(0, 0, 640, 360);
    const parkour = g.isParkour();
    UIDraw.text(ctx, parkour ? '試煉完成' : '抵達廢棄神社', 320, 70, { size: 26, align: 'center', alpha: a, weight: 'bold' });
    UIDraw.text(ctx, `${g.level.chapter}　${g.level.name}　完成`, 320, 98, { size: 11, align: 'center', color: '#9fc3e6', alpha: a });

    const rows = [
      [parkour ? '完成時間' : '通關時間', UIDraw.formatTime(info.time) + (info.newRecord ? '　新紀錄！' : '')],
      ['最佳紀錄', UIDraw.formatTime(info.best)],
      parkour ? ['失誤次數', `${info.mistakes} 次`] : ['擊退妖怪', `${info.kills} 隻`],
      ['倒下次數', `${info.deaths} 次`]
    ];
    UIDraw.panel(ctx, 200, 116, 240, 104, a * 0.9);
    rows.forEach(([k, v], i) => {
      const yy = 134 + i * 22;
      UIDraw.text(ctx, k, 300, yy, { size: 11, align: 'right', color: '#8fa6bf', alpha: a });
      UIDraw.text(ctx, v, 316, yy, { size: 11, color: i === 0 && info.newRecord ? '#ffe3a8' : '#eaf6ff', alpha: a });
    });
    if (info.unlocked) {
      UIDraw.text(ctx, '解鎖新模式：跑酷挑戰（可從主選單進入）', 320, 240, { size: 11, align: 'center', color: '#ffe3a8', alpha: a, weight: 'bold' });
    } else {
      const line = parkour ? '風止於鳥居之下。再快一點，也許能追上風。' : '神社的古鈴在風中輕響。劍客的旅途，仍將繼續……';
      UIDraw.text(ctx, line, 320, 240, { size: 10, align: 'center', color: 'rgba(210,222,235,0.85)', alpha: a });
    }
    if (t > 1.6) this.list.render(ctx, 320, 280, { spacing: 28, size: 13, align: 'center', alpha: Math.min(1, (t - 1.6) / 0.4) });
  }
}
