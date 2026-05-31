'use strict';

const { contextBridge, ipcRenderer } = require('electron');
const WINDOW = require('./window-config');

contextBridge.exposeInMainWorld('swdPlatform', {
  isDesktop: true,
  isSteam: true,
  hasAds: false,
  fixedWindow: !WINDOW.RESIZABLE,
  windowWidth: WINDOW.WIDTH,
  windowHeight: WINDOW.HEIGHT,
  hudPanelWidth: WINDOW.HUD_PANEL_WIDTH,
  hudWidth: WINDOW.HUD_PANEL_WIDTH * 2,
  layoutPadding: WINDOW.LAYOUT_PADDING,
  layoutGap: WINDOW.LAYOUT_GAP,
  quit() {
    ipcRenderer.invoke('app-quit');
  },
  window: {
    toggleFullscreen() {
      return ipcRenderer.invoke('window-toggle-fullscreen');
    },
    isFullscreen() {
      return ipcRenderer.invoke('window-is-fullscreen');
    },
    isMaximized() {
      return ipcRenderer.invoke('window-is-maximized');
    },
    toggleMaximize() {
      return ipcRenderer.invoke('window-toggle-maximize');
    },
    onDisplayChange(cb) {
      const listener = (_e, state) => cb(state);
      ipcRenderer.on('window-display-changed', listener);
      return () => ipcRenderer.removeListener('window-display-changed', listener);
    },
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
