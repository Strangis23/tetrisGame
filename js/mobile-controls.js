// Optional on-screen touch controls (build pad, wave utilities, pause).
class MobileControls {
  constructor(game, input, canvasWrap) {
    this.game = game;
    this.input = input;
    this.canvasWrap = canvasWrap;
    this.root = document.getElementById('mobile-controls');
    this.toggleEl = document.getElementById('mobile-controls-toggle');
    this.waveSpeedBtn = this.root?.querySelector('[data-action="waveSpeed"]');

    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const stored = localStorage.getItem('ttd-mobile-controls');
    this.enabled = stored === '1' || (stored == null && coarse);

    if (this.toggleEl) {
      this.toggleEl.checked = this.enabled;
      this.toggleEl.addEventListener('change', () => {
        this.setEnabled(this.toggleEl.checked);
      });
    }

    this._bindButtons();
    this.syncVisibility();
  }

  setEnabled(on) {
    this.enabled = !!on;
    localStorage.setItem('ttd-mobile-controls', this.enabled ? '1' : '0');
    if (this.toggleEl) this.toggleEl.checked = this.enabled;
    this.syncVisibility();
  }

  isEnabled() { return this.enabled; }

  syncVisibility() {
    if (!this.root) return;
    const phase = this.game.phase;
    const playable =
      phase === 'BUILD' || phase === 'PLACING_BASE' || phase === 'WAVE';
    const show = this.enabled && playable;
    this.root.classList.toggle('hidden', !show);

    this.root.classList.remove('mode-build', 'mode-wave');
    if (show) {
      if (phase === 'WAVE') this.root.classList.add('mode-wave');
      else this.root.classList.add('mode-build');
    }

    const buildActive = phase === 'BUILD' || phase === 'PLACING_BASE';
    if (this.canvasWrap) {
      this.canvasWrap.classList.toggle('mobile-active', this.enabled && buildActive);
    }

    if (this.waveSpeedBtn) {
      this.waveSpeedBtn.textContent = `${this.game.waveSpeed || 1}x`;
    }
  }

  _bindButtons() {
    if (!this.root) return;
    const globalActions = new Set(['pause', 'waveSpeed']);
    const repeat = new Set(['left', 'right', 'down']);
    for (const btn of this.root.querySelectorAll('[data-action]')) {
      const action = btn.dataset.action;
      const start = (e) => {
        e.preventDefault();
        if (!this.enabled) return;
        if (globalActions.has(action)) {
          this.input.performAction(action);
          if (action === 'waveSpeed') this.syncVisibility();
          return;
        }
        if (!this.input.canControlPiece()) return;
        if (repeat.has(action)) {
          this.input.holdAction(action, true);
        } else {
          this.input.performAction(action);
        }
      };
      const end = (e) => {
        e.preventDefault();
        if (repeat.has(action)) {
          this.input.holdAction(action, false);
        }
      };
      btn.addEventListener('pointerdown', start);
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointerleave', end);
      btn.addEventListener('pointercancel', end);
    }
  }
}
