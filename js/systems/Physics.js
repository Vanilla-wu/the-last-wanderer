/**
 * Physics —— 重力、速度與移動整合（GDD 6.4）
 *
 *   vy = vy + gravity × deltaTime
 *   y  = y  + vy × deltaTime
 *
 * 移動採「先 X 後 Y」分軸處理，碰撞解決交給 Collision。
 */
const PHYSICS = Object.freeze({
  GRAVITY: 1800,          // px / s²
  MAX_FALL_SPEED: 900     // px / s
});

const Physics = {
  applyGravity(entity, dt, multiplier = 1) {
    entity.velocityY = Math.min(entity.velocityY + PHYSICS.GRAVITY * multiplier * dt, PHYSICS.MAX_FALL_SPEED);
  },

  /** 讓數值以固定速率逼近目標，用於加速與減速 */
  approach(value, target, delta) {
    return value < target ? Math.min(value + delta, target) : Math.max(value - delta, target);
  },

  /** 依速度移動實體並解決與圖塊的碰撞，回傳碰撞資訊 */
  integrate(entity, tilemap, dt) {
    const hitWall = Collision.moveX(entity, tilemap, entity.velocityX * dt);
    const vertical = Collision.moveY(entity, tilemap, entity.velocityY * dt);
    entity.isGrounded = vertical.grounded;
    return { hitWall, grounded: vertical.grounded, ceiling: vertical.ceiling };
  }
};
