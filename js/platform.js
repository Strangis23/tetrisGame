// Platform detection and storage bridge (web vs Electron/Steam).
(function () {
  const injected = typeof window !== 'undefined' && window.swdPlatform;
  const isDesktop = !!(injected && injected.isDesktop);
  const isSteam = !!(injected && injected.isSteam);

  const CLOUD_KEYS = [
    'ttd-settings',
    'ttd-highscores',
    'ttd-highscores-prefs',
    'ttd-achievements',
    'ttd-lifetime-stats',
  ];

  const META_KEY = 'ttd-cloud-meta';

  function readMeta() {
    try {
      const raw = localStorage.getItem(META_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function writeMeta(meta) {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch { /* ignore */ }
  }

  function touchKey(key) {
    const meta = readMeta();
    meta[key] = Date.now();
    writeMeta(meta);
  }

  async function cloudRead(key) {
    if (!isSteam || !injected.steam || !injected.steam.cloudRead) return null;
    try {
      return await injected.steam.cloudRead(key);
    } catch {
      return null;
    }
  }

  async function cloudWrite(key, envelope) {
    if (!isSteam || !injected.steam || !injected.steam.cloudWrite) return;
    try {
      await injected.steam.cloudWrite(key, envelope);
    } catch { /* ignore */ }
  }

  async function syncFromCloud() {
    if (!isSteam) return;
    const meta = readMeta();
    for (const key of CLOUD_KEYS) {
      const remote = await cloudRead(key);
      if (!remote || remote.v == null) continue;
      const localTs = meta[key] || 0;
      const remoteTs = remote.ts || 0;
      const local = localStorage.getItem(key);
      if (!local || remoteTs >= localTs) {
        localStorage.setItem(key, remote.v);
        meta[key] = remoteTs;
      }
    }
    writeMeta(meta);
  }

  function persistKey(key, value) {
    localStorage.setItem(key, value);
    touchKey(key);
    if (isSteam) {
      cloudWrite(key, { v: value, ts: Date.now() });
    }
  }

  function persistRemove(key) {
    localStorage.removeItem(key);
    touchKey(key);
    if (isSteam) {
      cloudWrite(key, { v: '', ts: Date.now() });
    }
  }

  async function unlockAchievement(id) {
    if (isSteam && injected.steam && injected.steam.unlockAchievement) {
      try {
        await injected.steam.unlockAchievement(id);
      } catch { /* ignore */ }
    }
  }

  function runSteamCallbacks() {
    if (isSteam && injected.steam && injected.steam.runCallbacks) {
      injected.steam.runCallbacks();
    }
  }

  function setRichPresence(text) {
    if (isSteam && injected.steam && injected.steam.setRichPresence) {
      injected.steam.setRichPresence(text);
    }
  }

  function quitApp() {
    if (isDesktop && injected.quit) {
      injected.quit();
    }
  }

  window.Platform = {
    isDesktop,
    isSteam,
    hasAds: !isDesktop,
    hasServiceWorker: !isDesktop,
    cloudKeys: CLOUD_KEYS,
    syncFromCloud,
    persistKey,
    persistRemove,
    unlockAchievement,
    runSteamCallbacks,
    setRichPresence,
    quitApp,
  };

  if (isDesktop) {
    document.documentElement.classList.add('platform-desktop');
    if (isSteam) document.documentElement.classList.add('platform-steam');
  }

  if (isSteam) {
    syncFromCloud().catch(() => {});
  }
})();
