// Keyboard input -> Game actions. Includes DAS (delayed auto-shift) so holding
// left/right repeats moves smoothly.
class Input {
  constructor(game, canvas) {
    this.game = game;
    game.input = this;
    this.canvas = canvas;
    this.held = {};   // keyCode -> timeHeld
    this.dasDelay = 0.16;     // initial delay before auto-repeat
    this.dasInterval = 0.04;  // repeat interval
    this.repeatTimers = {};

    this.mouseGrid = null; // { x, y } in grid coords for hover

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseleave', () => { this.mouseGrid = null; });
    canvas.addEventListener('click', (e) => this.onClick(e));

    setInterval(() => this.tick(0.016), 16);
  }

  onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) / rect.width * this.canvas.width;
    const sy = (e.clientY - rect.top) / rect.height * this.canvas.height;
    const gx = Math.floor(sx / CONFIG.CELL_PX);
    const gy = Math.floor(sy / CONFIG.CELL_PX);
    if (!this.game.repairCell) return;
    // Only react when there's actually a damaged block under the cursor; clicks
    // on empty cells or full-HP blocks are no-ops (no banner spam).
    const cell = this.game.grid && this.game.grid.get(gx, gy);
    if (!cell || cell.hp >= cell.maxHp) return;
    const result = this.game.repairCell(gx, gy);
    if (result && !result.ok && result.reason) {
      this.game.setBanner(result.reason, 0.7);
    }
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) / rect.width * this.canvas.width;
    const sy = (e.clientY - rect.top) / rect.height * this.canvas.height;
    this.mouseGrid = {
      x: Math.floor(sx / CONFIG.CELL_PX),
      y: Math.floor(sy / CONFIG.CELL_PX),
    };
  }

  onKeyDown(e) {
    if (e.repeat) return;
    const k = e.code;

    // Always-allowed shortcuts.
    if (k === 'KeyP') { this.game.togglePause(); return; }
    if (k === 'KeyF') { this.game.cycleWaveSpeed(); return; }

    if (this.game.phase === 'GAMEOVER' || this.game.phase === 'WIN') {
      if (k === 'Enter' || k === 'Space') { this.game.startNewRun(); }
      return;
    }
    if (this.game.phase !== 'PLACING_BASE' && this.game.phase !== 'BUILD') return;

    this.held[k] = 0;
    this.handleAction(k);
  }

  onKeyUp(e) { delete this.held[e.code]; delete this.repeatTimers[e.code]; }

  handleAction(k) {
    const g = this.game;
    switch (k) {
      case 'ArrowLeft':  g.movePiece(-1, 0); break;
      case 'ArrowRight': g.movePiece(1, 0); break;
      case 'ArrowDown':  g.softDrop(true); break;
      case 'ArrowUp':
      case 'KeyR':       g.rotatePiece(1); break;
      case 'KeyZ':       g.rotatePiece(-1); break;
      case 'KeyC':       g.holdSwap(); break;
      case 'Space':      g.hardDrop(); break;
    }
  }

  tick(dt) {
    for (const k in this.held) {
      this.held[k] += dt;
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowDown') {
        if (this.held[k] >= this.dasDelay) {
          this.repeatTimers[k] = (this.repeatTimers[k] || 0) + dt;
          if (this.repeatTimers[k] >= this.dasInterval) {
            this.repeatTimers[k] = 0;
            this.handleAction(k);
          }
        }
      }
    }
    if (!('ArrowDown' in this.held)) this.game.softDrop(false);
  }
}
