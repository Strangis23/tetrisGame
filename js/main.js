// Bootstrap & RAF loop. Globals expected: CONFIG, Game, Renderer, Input, UI.
(function () {
  const canvas = document.getElementById('game-canvas');
  canvas.width = CONFIG.GRID_W * CONFIG.CELL_PX;
  canvas.height = CONFIG.GRID_H * CONFIG.CELL_PX;
  const ctx = canvas.getContext('2d');

  const game = new Game();
  const renderer = new Renderer(ctx, canvas);
  const ui = new UI(game);
  const input = new Input(game, canvas);
  const canvasWrap = document.getElementById('canvas-wrap');
  const mobileControls = new MobileControls(game, input, canvasWrap);

  // Expose for debugging / cross-module hooks.
  window.TTD = { game, renderer, ui, input, mobileControls, CONFIG };

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    try {
      if (!game.paused) game.update(dt);
    } catch (err) {
      console.error('game.update threw:', err);
    }
    try { renderer.draw(game); } catch (err) { console.error('render threw:', err); }
    try { ui.sync(game); } catch (err) { console.error('ui.sync threw:', err); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  ui.updateIntroBestLine();
  ui.showOverlay({
    title: 'Tetris Tower Defense',
    message:
      'You start with a deck of 20 cards (10 walls + 10 basic shooters). The game draws ' +
      'pieces from your deck. Drop them to build defenses, then survive waves of enemies ' +
      'trying to reach your home base. Every 5 waves, a shop offers 10 random cards across ' +
      '5 rarities — buying any one swaps it into your deck for a card you choose to remove. ' +
      'Clear lines for points (but you lose those towers). Pick a strong card for your first ' +
      'piece: it becomes your home base.',
    button: 'Begin',
    onClick: () => {
      ui.hideOverlay();
      game.startNewRun();
    },
  });
})();
