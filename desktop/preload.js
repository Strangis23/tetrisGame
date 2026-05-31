'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('swdPlatform', {
  isDesktop: true,
  isSteam: true,
  hasAds: false,
  quit() {
    ipcRenderer.invoke('app-quit');
  },
  steam: {
    unlockAchievement(id) {
      return ipcRenderer.invoke('steam-unlock-achievement', id);
    },
    cloudRead(key) {
      return ipcRenderer.invoke('steam-cloud-read', key);
    },
    cloudWrite(key, payload) {
      return ipcRenderer.invoke('steam-cloud-write', key, payload);
    },
    runCallbacks() {
      return ipcRenderer.invoke('steam-run-callbacks');
    },
    setRichPresence(text) {
      return ipcRenderer.invoke('steam-rich-presence', text);
    },
  },
});
