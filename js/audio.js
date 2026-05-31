// SFX via Web Audio API; background music from MP3 tracks.

const MUSIC_SRC = {
  calm: 'audio/Pattern_in_Pine.mp3',
  wave: 'audio/Last_Row_Drop.mp3',
};

const CALM_PHASES = new Set(['idle', 'menu', 'build']);

const AudioEngine = {
  ctx: null,
  sfxGain: null,
  masterGain: null,
  musicPhase: null,
  currentTrack: null,
  musicEls: {},
  fadeTimer: null,
  unlocked: false,

  init() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyVolumes();
    } catch { /* no audio */ }
    this._initMusicElements();
  },

  _initMusicElements() {
    for (const [key, src] of Object.entries(MUSIC_SRC)) {
      const el = new Audio(src);
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0;
      this.musicEls[key] = el;
    }
  },

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (document.body.classList.contains('title-visible')) {
      this.setMusicPhase('menu', true);
    } else if (this.musicPhase) {
      this.setMusicPhase(this.musicPhase, true);
    }
  },

  _musicVolume() {
    const s = typeof loadSettings === 'function' ? loadSettings() : {};
    if (s.musicMuted) return 0;
    return s.musicVolume ?? 0.4;
  },

  applyVolumes() {
    const s = typeof loadSettings === 'function' ? loadSettings() : { masterVolume: 0.7, sfxVolume: 0.8 };
    if (this.masterGain) {
      this.masterGain.gain.value = s.masterVolume ?? 0.7;
      this.sfxGain.gain.value = s.sfxVolume ?? 0.8;
    }
    if (s.musicMuted) {
      this._pauseAllTracks();
    } else {
      const el = this._activeMusicEl();
      if (el) el.volume = this._musicVolume();
    }
    this._syncMuteButtons();
  },

  _activeMusicEl() {
    return this.currentTrack ? this.musicEls[this.currentTrack] : null;
  },

  _trackForPhase(phase) {
    return CALM_PHASES.has(phase) ? 'calm' : phase === 'wave' ? 'wave' : 'calm';
  },

  _pauseTrack(el) {
    if (!el) return;
    el.pause();
    el.volume = 0;
  },

  _pauseAllTracks() {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    for (const el of Object.values(this.musicEls)) {
      this._pauseTrack(el);
    }
  },

  _resumeTrack(el, volume) {
    if (!el) return;
    el.volume = volume;
    if (el.paused) el.play().catch(() => {});
  },

  _fadeMusic(fromEl, toEl, targetVol, onDone) {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    const steps = 14;
    let step = 0;
    const fromStart = fromEl ? fromEl.volume : 0;
    if (toEl && toEl.paused) toEl.play().catch(() => {});
    this.fadeTimer = setInterval(() => {
      step += 1;
      const t = step / steps;
      if (fromEl) fromEl.volume = Math.max(0, fromStart * (1 - t));
      if (toEl) toEl.volume = targetVol * t;
      if (step >= steps) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = null;
        if (fromEl) this._pauseTrack(fromEl);
        if (toEl) toEl.volume = targetVol;
        if (onDone) onDone();
      }
    }, 35);
  },

  setMusicPhase(phase, force) {
    this.init();
    const track = this._trackForPhase(phase);
    const s = typeof loadSettings === 'function' ? loadSettings() : {};

    if (!force && this.musicPhase === phase && this.currentTrack === track) {
      const active = this._activeMusicEl();
      if (active && !active.paused && !s.musicMuted && this.unlocked) return;
    }

    this.musicPhase = phase;

    if (s.musicMuted || !this.unlocked) {
      this.currentTrack = track;
      return;
    }

    const targetVol = this._musicVolume();
    const nextEl = this.musicEls[track];
    const prevEl = this.currentTrack ? this.musicEls[this.currentTrack] : null;
    if (!nextEl) return;

    if (prevEl === nextEl) {
      this._resumeTrack(nextEl, targetVol);
      this.currentTrack = track;
      return;
    }

    if (prevEl && !prevEl.paused) {
      nextEl.volume = 0;
      if (nextEl.paused) nextEl.play().catch(() => {});
      this._fadeMusic(prevEl, nextEl, targetVol, () => {
        this.currentTrack = track;
      });
      return;
    }

    if (prevEl) this._pauseTrack(prevEl);
    this._resumeTrack(nextEl, targetVol);
    this.currentTrack = track;
  },

  stopMusic() {
    this._pauseAllTracks();
  },

  toggleMusicMuted() {
    const s = typeof loadSettings === 'function' ? loadSettings() : {};
    const next = !s.musicMuted;
    if (typeof saveSettings === 'function') saveSettings({ musicMuted: next });
    if (next) {
      this._pauseAllTracks();
    } else if (this.musicPhase) {
      this.setMusicPhase(this.musicPhase, true);
    } else {
      this.applyVolumes();
    }
    this._syncMuteButtons();
    return next;
  },

  isMusicMuted() {
    const s = typeof loadSettings === 'function' ? loadSettings() : {};
    return !!s.musicMuted;
  },

  _syncMuteButtons() {
    const muted = this.isMusicMuted();
    for (const btn of document.querySelectorAll('[data-action="music-mute"]')) {
      btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
      btn.title = muted ? 'Unmute music' : 'Mute music';
      btn.setAttribute('aria-label', btn.title);
      const on = btn.querySelector('.music-mute-on');
      const off = btn.querySelector('.music-mute-off');
      if (on) on.classList.toggle('hidden', muted);
      if (off) off.classList.toggle('hidden', !muted);
      if (!on && !off) btn.textContent = muted ? '🔇' : '♪';
    }
  },

  _tone(freq, dur, type, gain) {
    if (!this.ctx || !this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  },

  play(name) {
    this.init();
    this.unlock();
    if (!this.ctx) return;
    switch (name) {
      case 'move': this._tone(220, 0.04, 'square', 0.08); break;
      case 'rotate': this._tone(330, 0.05, 'square', 0.1); break;
      case 'drop': this._tone(110, 0.08, 'triangle', 0.12); break;
      case 'lock': this._tone(180, 0.06, 'square', 0.1); break;
      case 'line': this._tone(520, 0.12, 'sawtooth', 0.14); this._tone(780, 0.1, 'sawtooth', 0.1); break;
      case 'kill': this._tone(440, 0.05, 'square', 0.07); break;
      case 'wave': this._tone(260, 0.15, 'triangle', 0.12); break;
      case 'shop': this._tone(350, 0.1, 'sine', 0.1); break;
      case 'buy': this._tone(480, 0.12, 'sine', 0.12); break;
      case 'damage': this._tone(90, 0.14, 'sawtooth', 0.14); break;
      case 'win':
        this._tone(659, 0.18, 'square', 0.12);
        this._tone(784, 0.18, 'square', 0.12);
        this._tone(988, 0.28, 'square', 0.14);
        break;
      case 'lose': this._tone(140, 0.25, 'sawtooth', 0.14); break;
      default: break;
    }
  },
};

window.addEventListener('ttd-settings-changed', () => AudioEngine.applyVolumes());
