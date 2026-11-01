/**
 * 進入點：建立 Game 並啟動主迴圈
 */
window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  canvas.focus();
  game.start();
  window.game = game;   // 方便在瀏覽器 Console 除錯
});
