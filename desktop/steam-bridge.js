'use strict';

const path = require('path');
const fs = require('fs');

const ACHIEVEMENT_MAP = {
  first_win: 'FIRST_WIN',
  wave_50: 'WAVE_50',
  tetris: 'QUAD_CLEAR',
  shop_swap: 'SHOP_SWAP',
  fortify_3: 'FORTIFY_3',
  daily_run: 'DAILY_RUN',
  brutal_win: 'BRUTAL_WIN',
  kills_500: 'KILLS_500',
  win_classic: 'WIN_CLASSIC',
  win_straights: 'WIN_STRAIGHTS',
  win_bendy: 'WIN_BENDY',
  win_lebron: 'WIN_LEBRON',
  win_big_o: 'WIN_BIG_O',
  win_t_piece: 'WIN_T_PIECE',
  win_random: 'WIN_RANDOM',
};

function loadAchievementMap() {
  const candidates = [
    path.join(__dirname, '..', 'steam', 'achievements.json'),
    path.join(__dirname, 'steam', 'achievements.json'),
  ];
  for (const jsonPath of candidates) {
    try {
      const raw = fs.readFileSync(jsonPath, 'utf8');
      const parsed = JSON.parse(raw);
      const map = {};
      for (const row of parsed.achievements || []) {
        map[row.id] = row.steamApiName;
      }
      return { ...ACHIEVEMENT_MAP, ...map };
    } catch { /* try next */ }
  }
  return ACHIEVEMENT_MAP;
}

function createSteamBridge(appId) {
  let client = null;
  let ready = false;
  const achievementMap = loadAchievementMap();

  try {
    const steamworks = require('steamworks.js');
    if (typeof steamworks.restartAppIfNecessary === 'function') {
      if (steamworks.restartAppIfNecessary(appId)) {
        process.exit(0);
      }
    }
    client = steamworks.init(appId);
    ready = !!client;
  } catch (err) {
    console.warn('[steam] init failed:', err.message);
  }

  function cloudFileName(key) {
    return `${key}.sav`;
  }

  return {
    isReady() { return ready; },

    runCallbacks() {
      // steamworks.js runs callbacks on an internal interval after init.
    },

    shutdown() {
      client = null;
      ready = false;
    },

    unlockAchievement(id) {
      if (!client) return false;
      const apiName = achievementMap[id];
      if (!apiName) return false;
      try {
        if (client.achievement.isActivated(apiName)) return true;
        return client.achievement.activate(apiName);
      } catch (err) {
        console.warn('[steam] achievement', id, err.message);
        return false;
      }
    },

    cloudRead(key) {
      if (!client || !client.cloud) return null;
      try {
        const name = cloudFileName(key);
        if (!client.cloud.isEnabledForApp()) return null;
        if (!client.cloud.fileExists(name)) return null;
        const text = client.cloud.readFile(name);
        if (!text) return null;
        return JSON.parse(text);
      } catch {
        return null;
      }
    },

    cloudWrite(key, payload) {
      if (!client || !client.cloud) return false;
      try {
        const name = cloudFileName(key);
        if (!client.cloud.isEnabledForApp()) return false;
        return client.cloud.writeFile(name, JSON.stringify(payload));
      } catch (err) {
        console.warn('[steam] cloud write', key, err.message);
        return false;
      }
    },

    setRichPresence(text) {
      if (!client || !client.localplayer) return;
      try {
        client.localplayer.setRichPresence('status', text || '');
      } catch { /* ignore */ }
    },
  };
}

module.exports = { createSteamBridge, ACHIEVEMENT_MAP };
