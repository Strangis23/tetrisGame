// Bootstrap & RAF loop. Globals expected: CONFIG, Game, Renderer, Input, UI.
(function () {
  if (typeof Platform === 'undefined' || Platform.hasServiceWorker) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  loadSettings();
  if (typeof AudioEngine !== 'undefined') AudioEngine.init();
  if (typeof loadBlockSprites === 'function') loadBlockSprites();
  if (typeof loadEnemySprites === 'function') loadEnemySprites();

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

  const natW = CONFIG.GRID_W * CONFIG.CELL_PX;
  const natH = CONFIG.GRID_H * CONFIG.CELL_PX;
  const gameRoot = document.getElementById('game-root');
  const hudEl = document.getElementById('hud');
  const isDesktopLayout = () =>
    typeof Platform !== 'undefined' && Platform.isDesktop;

  function fitGameCanvas() {
    if (!canvasWrap || !canvas) return;

    let availW;
    let availH;

    if (isDesktopLayout() && gameRoot) {
      const rs = getComputedStyle(gameRoot);
      const padX = parseFloat(rs.paddingLeft) + parseFloat(rs.paddingRight);
      const padY = parseFloat(rs.paddingTop) + parseFloat(rs.paddingBottom);
      const gap = parseFloat(rs.gap) || 18;
      const stacked = rs.flexDirection.startsWith('column');

      if (stacked) {
        availW = gameRoot.clientWidth - padX;
        const hudH = hudEl ? hudEl.offsetHeight : 0;
        availH = gameRoot.clientHeight - padY - hudH - (hudH > 0 ? gap : 0);
      } else {
        availH = gameRoot.clientHeight - padY;
        const hudW = hudEl ? hudEl.offsetWidth : 0;
        availW = gameRoot.clientWidth - padX - hudW - (hudW > 0 ? gap : 0);
      }
    } else {
      availW = canvasWrap.clientWidth;
      availH = canvasWrap.clientHeight;
    }

    if (availW < 1 || availH < 1) return;

    const scale = Math.min(availW / natW, availH / natH);
    const displayW = Math.max(1, Math.floor(natW * scale));
    const displayH = Math.max(1, Math.floor(natH * scale));

    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    if (isDesktopLayout()) {
      canvasWrap.style.width = `${displayW}px`;
      canvasWrap.style.height = `${displayH}px`;
      canvasWrap.style.flex = '0 0 auto';
    } else {
      canvasWrap.style.width = '';
      canvasWrap.style.height = '';
      canvasWrap.style.flex = '';
    }
  }

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => fitGameCanvas());
    if (canvasWrap) ro.observe(canvasWrap);
    if (gameRoot) ro.observe(gameRoot);
    if (hudEl) ro.observe(hudEl);
  }
  window.addEventListener('resize', fitGameCanvas);
  requestAnimationFrame(fitGameCanvas);

  window.TTD = { game, renderer, ui, input, mobileControls, CONFIG, fitGameCanvas };
  window.SWD = window.TTD;

  const dailyLabel = document.getElementById('daily-seed-label');
  if (dailyLabel && typeof getDailySeedLabel === 'function') {
    dailyLabel.textContent = getDailySeedLabel();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (typeof Platform !== 'undefined' && Platform.runSteamCallbacks) {
      Platform.runSteamCallbacks();
    }
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

  ui.showTitleScreen();
})();
