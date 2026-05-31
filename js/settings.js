// Player settings persisted in localStorage.
const SETTINGS_STORAGE_KEY = 'ttd-settings';

const DEFAULT_SETTINGS = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.4,
  musicMuted: false,
  reduceMotion: false,
  pathPreview: true,
  colorblindPatterns: false,
};

let _settings = null;

function loadSettings() {
  if (_settings) return _settings;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      _settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      return _settings;
    }
  } catch { /* ignore */ }
  _settings = { ...DEFAULT_SETTINGS };
  return _settings;
}

function saveSettings(next) {
  _settings = { ...loadSettings(), ...next };
  const json = JSON.stringify(_settings);
  if (typeof Platform !== 'undefined' && Platform.persistKey) {
    Platform.persistKey(SETTINGS_STORAGE_KEY, json);
  } else {
    localStorage.setItem(SETTINGS_STORAGE_KEY, json);
  }
  window.dispatchEvent(new CustomEvent('ttd-settings-changed', { detail: _settings }));
  return _settings;
}

function getSetting(key) {
  return loadSettings()[key];
}

function applySettingsToForm(form) {
  if (!form) return;
  const s = loadSettings();
  const set = (id, val) => {
    const el = form.querySelector('#' + id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!val;
    else el.value = String(val);
  };
  set('settings-master', s.masterVolume);
  set('settings-sfx', s.sfxVolume);
  set('settings-music', s.musicVolume);
  set('settings-music-muted', s.musicMuted);
  set('settings-reduce-motion', s.reduceMotion);
  set('settings-path-preview', s.pathPreview);
  set('settings-colorblind', s.colorblindPatterns);
}

function readSettingsFromForm(form) {
  if (!form) return saveSettings({});
  const num = (id, fallback) => {
    const el = form.querySelector('#' + id);
    return el ? parseFloat(el.value) : fallback;
  };
  const chk = (id) => {
    const el = form.querySelector('#' + id);
    return el ? el.checked : false;
  };
  return saveSettings({
    masterVolume: num('settings-master', DEFAULT_SETTINGS.masterVolume),
    sfxVolume: num('settings-sfx', DEFAULT_SETTINGS.sfxVolume),
    musicVolume: num('settings-music', DEFAULT_SETTINGS.musicVolume),
    musicMuted: chk('settings-music-muted'),
    reduceMotion: chk('settings-reduce-motion'),
    pathPreview: chk('settings-path-preview'),
    colorblindPatterns: chk('settings-colorblind'),
  });
}
