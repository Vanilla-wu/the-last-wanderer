/**
 * GameLoop —— requestAnimationFrame 主迴圈 + Fixed Timestep（GDD 6.3）
 *
 * 物理固定以每秒 60 次更新，與螢幕更新率無關；渲染則每個畫格執行一次。
 */
class GameLoop {
  constructor(update, render, step = 1 / 60) {
    this.update = update;
    this.render = render;
    this.step = step;
    this.accumulator = 0;
    this.last = 0;
    this.maxStepsPerFrame = 5;   // 避免分頁切回時一次補算過多（spiral of death）
    this.frame = this.frame.bind(this);
  }

  start() {
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  frame(timestamp) {
    let delta = (timestamp - this.last) / 1000;
    this.last = timestamp;
    if (delta > 0.25) delta = 0.25;

    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator >= this.step && steps < this.maxStepsPerFrame) {
      this.update(this.step);
      this.accumulator -= this.step;
      steps++;
    }
    if (steps === this.maxStepsPerFrame) this.accumulator = 0;

    this.render();
    requestAnimationFrame(this.frame);
  }
}
