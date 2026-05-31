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
    this._touchCoarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    this._touchPointerId = null;
    this._touchStart = null;
    this._touchMoved = false;
    this._suppressClickUntil = 0;
    this._tapMaxPx = 14;
    this._swipeMinPx = 24;
    this._tapMaxMs = 350;

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

    if (this._touchCoarse) {
      canvas.addEventListener('pointerdown', (e) => this.onTouchPointerDown(e));
      canvas.addEventListener('pointermove', (e) => this.onTouchPointerMove(e));
      canvas.addEventListener('pointerup', (e) => this.onTouchPointerUp(e));
      canvas.addEventListener('pointercancel', (e) => this.onTouchPointerUp(e));
    }

    setInterval(() => this.tick(0.016), 16);
  }

  canControlPiece() {
    const p = this.game.phase;
    return p === 'PLACING_BASE' || p === 'BUILD';
  }

  canActOnPiece() {
    return this.canControlPiece() && !this.game.paused;
  }

  clearHeld() {
    this.held = {};
    this.repeatTimers = {};
    this.game.softDrop(false);
  }

  _clientToGrid(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return { gx: 0, gy: 0 };
    const sx = (clientX - rect.left) / rect.width * this.canvas.width;
    const sy = (clientY - rect.top) / rect.height * this.canvas.height;
    const cellW = this.canvas.width / CONFIG.GRID_W;
    const cellH = this.canvas.height / CONFIG.GRID_H;
    return {
      gx: Math.floor(sx / cellW),
      gy: Math.floor(sy / cellH),
    };
  }

  tryRepairAt(clientX, clientY) {
    const { gx, gy } = this._clientToGrid(clientX, clientY);
    if (!this.game.repairCell) return false;
    const cell = this.game.grid && this.game.grid.get(gx, gy);
    if (!cell) return false;
    if (cell.isBase) {
      if (this.game.baseHp >= this.game.baseMaxHp) return false;
    } else if (cell.hp >= cell.maxHp) {
      return false;
    }
    const result = this.game.repairCell(gx, gy);
    if (result && !result.ok && result.reason) {
      this.game.setBanner(result.reason, 0.7);
    }
    return true;
  }

  onClick(e) {
    if (Date.now() < this._suppressClickUntil) return;
    const { gx, gy } = this._clientToGrid(e.clientX, e.clientY);
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

  onTouchPointerDown(e) {
    if (e.pointerType !== 'touch') return;
    if (!this.canActOnPiece()) return;
    if (this._touchPointerId != null) return;
    this._touchPointerId = e.pointerId;
    this._touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    this._touchMoved = false;
  }

  onTouchPointerMove(e) {
    if (e.pointerId !== this._touchPointerId || !this._touchStart) return;
    const dx = e.clientX - this._touchStart.x;
    const dy = e.clientY - this._touchStart.y;
    if (Math.hypot(dx, dy) > this._tapMaxPx) this._touchMoved = true;
  }

  onTouchPointerUp(e) {
    if (e.pointerId !== this._touchPointerId || !this._touchStart) return;
    const dx = e.clientX - this._touchStart.x;
    const dy = e.clientY - this._touchStart.y;
    const dt = performance.now() - this._touchStart.t;
    this._touchPointerId = null;
    this._touchStart = null;
    this._suppressClickUntil = Date.now() + 400;

    if (!this.canActOnPiece()) return;

    if (!this._touchMoved && dt < this._tapMaxMs) {
      if (this.tryRepairAt(e.clientX, e.clientY)) {
        this._haptic(6);
        return;
      }
      this.performAction('rotate');
      this._haptic(8);
      return;
    }

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= this._swipeMinPx) {
      this.performAction(dx < 0 ? 'left' : 'right');
      this._haptic(6);
      return;
    }
    if (dy >= this._swipeMinPx && dy > Math.abs(dx)) {
      this.performAction('down');
      this._haptic(6);
    }
  }

  _haptic(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  onMouseMove(e) {
    const { gx, gy } = this._clientToGrid(e.clientX, e.clientY);
    this.mouseGrid = { x: gx, y: gy };
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
    if (this.game.paused) return;

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
      case 'left':       if (!this.canActOnPiece()) return; g.movePiece(-1, 0); break;
      case 'right':      if (!this.canActOnPiece()) return; g.movePiece(1, 0); break;
      case 'down':       if (!this.canActOnPiece()) return; g.softDrop(true); break;
      case 'rotate':     if (!this.canActOnPiece()) return; g.rotatePiece(1); break;
      case 'rotateCCW':  if (!this.canActOnPiece()) return; g.rotatePiece(-1); break;
      case 'hold':       if (!this.canActOnPiece()) return; g.holdSwap(); break;
      case 'hardDrop':   if (!this.canActOnPiece()) return; g.hardDrop(); break;
    }
  }

  holdAction(action, on) {
    if (on) {
      if (!this.canActOnPiece()) return;
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
