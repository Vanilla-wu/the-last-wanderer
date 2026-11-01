/**
 * Entity —— 所有遊戲物件的基底（GDD 6.4 玩家基本屬性）
 * 座標為世界座標，(x, y) 是碰撞框左上角。
 */
class Entity {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isGrounded = false;
    this.facing = 1;          // 1 = 右，-1 = 左
    this.dropThrough = false;
  }

  get centerX() { return this.x + this.width / 2; }
  get centerY() { return this.y + this.height / 2; }
  get bottom() { return this.y + this.height; }

  getHitbox() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
}
