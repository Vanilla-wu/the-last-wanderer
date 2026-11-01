/**
 * Collision —— AABB 碰撞偵測與圖塊碰撞解決（GDD 6.4）
 *
 * 實體需具備 x, y, width, height, velocityX, velocityY。
 * 每一步移動量都小於一個 Tile（32px），因此不會穿牆。
 */
const Collision = {
  aabb(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
  },

  /** 水平移動；撞到實心圖塊時貼齊牆面並回傳 true */
  moveX(entity, map, dx) {
    if (dx === 0) return false;
    const T = map.tileSize;
    entity.x += dx;
    const top = Math.floor(entity.y / T);
    const bottom = Math.floor((entity.y + entity.height - 0.001) / T);

    if (dx > 0) {
      const col = Math.floor((entity.x + entity.width - 0.001) / T);
      for (let row = top; row <= bottom; row++) {
        if (map.isSolidAt(col, row)) {
          entity.x = col * T - entity.width;
          entity.velocityX = 0;
          return true;
        }
      }
    } else {
      const col = Math.floor(entity.x / T);
      for (let row = top; row <= bottom; row++) {
        if (map.isSolidAt(col, row)) {
          entity.x = (col + 1) * T;
          entity.velocityX = 0;
          return true;
        }
      }
    }
    return false;
  },

  /**
   * 垂直移動。單向平台（木板）只在「從上方落下」時產生碰撞，
   * entity.dropThrough 為 true 時會忽略單向平台（↓ + Space 向下穿越）。
   */
  moveY(entity, map, dy) {
    const result = { grounded: false, ceiling: false };
    if (dy === 0) return result;
    const T = map.tileSize;
    const prevBottom = entity.y + entity.height;
    entity.y += dy;
    const left = Math.floor(entity.x / T);
    const right = Math.floor((entity.x + entity.width - 0.001) / T);

    if (dy > 0) {
      const row = Math.floor((entity.y + entity.height - 0.001) / T);
      for (let col = left; col <= right; col++) {
        const solid = map.isSolidAt(col, row);
        const oneWay = !entity.dropThrough && map.isOneWayAt(col, row) && prevBottom <= row * T + 0.01;
        if (solid || oneWay) {
          entity.y = row * T - entity.height;
          entity.velocityY = 0;
          result.grounded = true;
          break;
        }
      }
    } else {
      const row = Math.floor(entity.y / T);
      for (let col = left; col <= right; col++) {
        if (map.isSolidAt(col, row)) {
          entity.y = (row + 1) * T;
          entity.velocityY = 0;
          result.ceiling = true;
          break;
        }
      }
    }
    return result;
  },

  /** 檢查矩形是否碰到尖刺（尖刺判定框比圖塊小，較寬容） */
  touchesHazard(box, map) {
    const T = map.tileSize;
    const c0 = Math.floor(box.x / T), c1 = Math.floor((box.x + box.width) / T);
    const r0 = Math.floor(box.y / T), r1 = Math.floor((box.y + box.height) / T);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!map.isHazardAt(c, r)) continue;
        const spike = { x: c * T + 4, y: r * T + 16, width: T - 8, height: T - 16 };
        if (Collision.aabb(box, spike)) return true;
      }
    }
    return false;
  }
};
