// Keyboard input -> Game actions. Includes DAS (delayed auto-shift) so holding
// left/right repeats moves smoothly.
class Input {
  constructor(game, canvas) {
    this.game = game;
    game.input = this;
    this.canvas = canvas;
    this.held = {};   // action id -> timeHeld
    this.dasDelay = 0.16;
    this.dasInterval = 0.04;
    this.repeatTimers = {};

    this.mouseGrid = null;

    this._keyToAction = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowDown: 'down',
      ArrowUp: 'rotate',
      KeyR: 'rotate',
      KeyZ: 'rotateCCW',
      KeyC: 'hold',
      Space: 'hardDrop',
    };

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseleave', () => { this.mouseGrid = null; });
    canvas.addEventListener('click', (e) => this.onClick(e));

    setInterval(() => this.tick(0.016), 16);
  }

  canControlPiece() {
    const p = this.game.phase;
    return p === 'PLACING_BASE' || p === 'BUILD';
  }

  onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) / rect.width * this.canvas.width;
    const sy = (e.clientY - rect.top) / rect.height * this.canvas.height;
    const gx = Math.floor(sx / CONFIG.CELL_PX);
    const gy = Math.floor(sy / CONFIG.CELL_PX);
    if (!this.game.repairCell) return;
    const cell = this.game.grid && this.game.grid.get(gx, gy);
    if (!cell) return;
    if (cell.isBase) {
      if (this.game.baseHp >= this.game.baseMaxHp) return;
    } else if (cell.hp >= cell.maxHp) {
      return;
    }
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

    if (k === 'Escape') {
      if (this.game.helpOpen) this.game.closeHelp();
      return;
    }
    if (k === 'KeyP') {
      if (this.game.helpOpen) this.game.closeHelp();
      else this.game.togglePause();
      return;
    }
    if (k === 'KeyF') { this.game.cycleWaveSpeed(); return; }

    if (this.game.phase === 'GAMEOVER' || this.game.phase === 'WIN') {
      if (k === 'Enter' || k === 'Space') { this.game.startNewRun(); }
      return;
    }
    if (!this.canControlPiece()) return;

    const action = this._keyToAction[k];
    if (!action) return;
    this.held[action] = 0;
    this.performAction(action);
  }

  onKeyUp(e) {
    const action = this._keyToAction[e.code];
    if (action) {
      delete this.held[action];
      delete this.repeatTimers[action];
    }
  }

  performAction(action) {
    const g = this.game;
    switch (action) {
      case 'pause':
        g.togglePause();
        return;
      case 'waveSpeed':
        g.cycleWaveSpeed();
        return;
      case 'left':       if (!this.canControlPiece()) return; g.movePiece(-1, 0); break;
      case 'right':      if (!this.canControlPiece()) return; g.movePiece(1, 0); break;
      case 'down':       if (!this.canControlPiece()) return; g.softDrop(true); break;
      case 'rotate':     if (!this.canControlPiece()) return; g.rotatePiece(1); break;
      case 'rotateCCW':  if (!this.canControlPiece()) return; g.rotatePiece(-1); break;
      case 'hold':       if (!this.canControlPiece()) return; g.holdSwap(); break;
      case 'hardDrop':   if (!this.canControlPiece()) return; g.hardDrop(); break;
    }
  }

  holdAction(action, on) {
    if (on) {
      if (!(action in this.held)) this.held[action] = 0;
      this.performAction(action);
    } else {
      delete this.held[action];
      delete this.repeatTimers[action];
      if (action === 'down') this.game.softDrop(false);
    }
  }

  tick(dt) {
    if (this.game.paused) return;
    const repeatActions = new Set(['left', 'right', 'down']);
    for (const action in this.held) {
      this.held[action] += dt;
      if (repeatActions.has(action)) {
        if (this.held[action] >= this.dasDelay) {
          this.repeatTimers[action] = (this.repeatTimers[action] || 0) + dt;
          if (this.repeatTimers[action] >= this.dasInterval) {
            this.repeatTimers[action] = 0;
            this.performAction(action);
          }
        }
      }
    }
    if (!('down' in this.held)) this.game.softDrop(false);
  }
}
