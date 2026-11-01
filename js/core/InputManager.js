/**
 * InputManager —— 鍵盤與滑鼠輸入（GDD 2.2）
 *
 * 以「動作」為單位查詢輸入，而不是直接查按鍵，方便日後改鍵或支援手把。
 * pressed / released 會保留到下一次固定步長更新結束才清除，避免高更新率螢幕漏掉按鍵。
 */
const KEY_BINDINGS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  jump: ['Space'],
  attack: ['KeyJ'],
  dodge: ['KeyK'],
  vision: ['KeyL'],
  scarf: ['KeyI'],
  pause: ['Escape', 'KeyP'],
  confirm: ['Enter', 'Space', 'KeyJ'],
  back: ['Escape', 'Backspace'],
  mute: ['KeyM']
};

class InputManager {
  constructor(canvas, logicalWidth, logicalHeight) {
    this.canvas = canvas;
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.mouse = { x: -1, y: -1, clicked: false, moved: false };
    this.onInteraction = null;
    this.onBlur = null;

    const gameCodes = new Set(Object.values(KEY_BINDINGS).flat());

    window.addEventListener('keydown', (e) => {
      if (this.onInteraction) this.onInteraction();
      if (gameCodes.has(e.code)) e.preventDefault();
      if (!e.repeat && !this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
      this.released.add(e.code);
    });

    window.addEventListener('blur', () => {
      this.down.clear();
      if (this.onBlur) this.onBlur();
    });

    canvas.addEventListener('mousemove', (e) => {
      const p = this._toLogical(e);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouse.moved = true;
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (this.onInteraction) this.onInteraction();
      const p = this._toLogical(e);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouse.clicked = true;
      canvas.focus();
    });
  }

  _toLogical(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * this.logicalWidth,
      y: (e.clientY - r.top) / r.height * this.logicalHeight
    };
  }

  isDown(action) {
    return KEY_BINDINGS[action].some((code) => this.down.has(code));
  }

  wasPressed(action) {
    return KEY_BINDINGS[action].some((code) => this.pressed.has(code));
  }

  wasReleased(action) {
    return KEY_BINDINGS[action].some((code) => this.released.has(code));
  }

  clickedIn(rect) {
    const m = this.mouse;
    return m.clicked && m.x >= rect.x && m.x <= rect.x + rect.width && m.y >= rect.y && m.y <= rect.y + rect.height;
  }

  /** 每次固定步長更新後呼叫 */
  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mouse.clicked = false;
    this.mouse.moved = false;
  }
}
