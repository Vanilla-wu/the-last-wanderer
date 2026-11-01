/**
 * GameState —— 遊戲狀態定義與狀態機（GDD 10.1）
 */
const GameStates = Object.freeze({
  MAIN_MENU: 'MAIN_MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  PLAYER_HURT: 'PLAYER_HURT',
  GAME_OVER: 'GAME_OVER',
  VICTORY: 'VICTORY'
});

class GameStateMachine {
  constructor(initial) {
    this.current = initial;
    this.previous = null;
    this.time = 0;          // 進入目前狀態後經過的秒數
    this.onChange = null;
  }

  set(next) {
    if (next === this.current) return;
    this.previous = this.current;
    this.current = next;
    this.time = 0;
    if (this.onChange) this.onChange(next, this.previous);
  }

  is(...states) {
    return states.includes(this.current);
  }

  update(dt) {
    this.time += dt;
  }
}
