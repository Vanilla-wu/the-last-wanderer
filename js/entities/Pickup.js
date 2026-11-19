/**
 * Pickup —— 關卡中可撿取的能力道具
 *
 * 新增能力時：在 ABILITIES 加一筆定義（apply 決定撿到後的效果），
 * 在 Sprites.pickups 加一張圖，再到關卡資料的 pickups 放置即可。
 */
const ABILITIES = {
  dash: {
    label: '獲得能力',
    name: '疾風之履',
    desc: '纏繞山風的草鞋，踏地瞬間便如疾風掠過。',
    hint: 'K 衝刺：短暫無敵，可穿越敵人（空中限一次）',
    colors: ['#ffffff', '#bfe6ff', '#8fcaf5'],
    glow: 'rgba(150,215,255,',
    apply(progress) { progress.abilities.dash = true; }
  },
  doubleJump: {
    label: '獲得能力',
    name: '天狗之羽',
    desc: '輕如羽毛的身法，讓你能在空中再躍起一次。',
    hint: '在空中再按一次 Space：二段跳',
    colors: ['#ffffff', '#cfe9ff', '#8fcaf5'],
    glow: 'rgba(160,215,255,',
    apply(progress) { progress.abilities.doubleJump = true; }
  },
  chargeSlash: {
    label: '獲得能力',
    name: '居合之卷',
    desc: '記載古流居合術的殘卷，能將劍意凝於一瞬。',
    hint: '揮刀後按住 J 蓄力，放開使出衝刺斬；蓄滿時按住 W 再放開則為旋風斬',
    colors: ['#ffffff', '#f6efdc', '#bff1ff'],
    glow: 'rgba(255,235,190,',
    apply(progress) { progress.abilities.chargeSlash = true; }
  },
  vision: {
    label: '獲得能力',
    name: '殘影之眼',
    desc: '獨眼深處沉睡的力量，能窺見這片土地曾經的模樣。',
    hint: 'L 殘影視界：過去的橋梁與平台會重新顯現，可以踩踏',
    colors: ['#ffffff', '#d9c8ff', '#9a86ff'],
    glow: 'rgba(190,170,255,',
    apply(progress) { progress.abilities.vision = true; }
  },
  scarf: {
    label: '獲得能力',
    name: '蒼風之結',
    desc: '繫在圍巾末端的古老風結，圍巾從此能隨心意延伸。',
    hint: 'I 風縛：抓住風鈴飛過去 · 拉動鈴緒 · 把妖怪拉到身邊',
    colors: ['#ffffff', '#9fc3ff', '#3563b0'],
    glow: 'rgba(120,170,255,',
    apply(progress) { progress.abilities.scarf = true; }
  },
  heartUp: {
    label: '獲得道具',
    name: '魂之器',
    desc: '封存著古老靈魂的容器，劍客的意志更加堅定。',
    hint: '生命上限 +1，並完全恢復生命',
    colors: ['#bff1ff', '#4fb3ff', '#ffffff'],
    glow: 'rgba(90,180,255,',
    apply(progress) { progress.maxHp += 1; }
  }
};

class Pickup {
  constructor({ id, type, x, y, required = false }) {
    this.id = id;
    this.type = type;
    this.required = required;
    this.info = ABILITIES[type];
    this.x = x;          // 中心點
    this.y = y;
    this.time = Math.random() * Math.PI * 2;
    this.collected = false;
  }

  get bob() {
    return Math.round(Math.sin(this.time * 2.4) * 3);
  }

  getHitbox() {
    if (this.required) return { x: this.x - 16, y: -10000, width: 32, height: 20000 };
    return { x: this.x - 14, y: this.y - 16, width: 28, height: 32 };
  }

  update(dt, game) {
    this.time += dt;
    if (Math.random() < dt * 6) {
      game.effects.sparkle(this.x + (Math.random() - 0.5) * 22, this.y + this.bob + (Math.random() - 0.5) * 22, this.info.colors);
    }
  }

  render(ctx, cam) {
    const img = Sprites.pickups[this.type];
    const x = this.x - cam.x, y = this.y + this.bob - cam.y;
    if (x < -40 || x > cam.width + 40) return;
    const radius = 24 + Math.sin(this.time * 3) * 3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `${this.info.glow}0.55)`);
    grad.addColorStop(1, `${this.info.glow}0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
    ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
  }
}
