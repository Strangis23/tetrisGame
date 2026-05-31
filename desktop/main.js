'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { createSteamBridge } = require('./steam-bridge');
const WINDOW = require('./window-config');

const STEAM_APP_ID = parseInt(process.env.STEAM_APP_ID || process.env.SteamAppId || '480', 10);

try {
  const steamworks = require('steamworks.js');
  if (typeof steamworks.electronEnableSteamOverlay === 'function') {
    steamworks.electronEnableSteamOverlay(true);
  }
} catch { /* steam optional during dev */ }

let mainWindow = null;
let steam = null;

function resolveGameRoot() {
  const besideMain = path.join(__dirname, 'index.html');
  if (fs.existsSync(besideMain)) return __dirname;
  const parent = path.join(__dirname, '..', 'index.html');
  if (fs.existsSync(parent)) return path.join(__dirname, '..');
  return __dirname;
}

const GAME_ROOT = resolveGameRoot();

function createWindow() {
  const { WIDTH, HEIGHT, MIN_WIDTH, MIN_HEIGHT, RESIZABLE } = WINDOW;

  mainWindow = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    maxWidth: RESIZABLE ? undefined : WIDTH,
    maxHeight: RESIZABLE ? undefined : HEIGHT,
    resizable: RESIZABLE,
    maximizable: true,
    fullscreenable: true,
    title: 'Stackwave Defense',
    backgroundColor: '#030712',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(GAME_ROOT, 'index.html'));

  if (process.env.SWD_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  const notifyDisplayChange = () => {
    if (!mainWindow) return;
    mainWindow.webContents.send('window-display-changed', {
      fullscreen: mainWindow.isFullScreen(),
      maximized: mainWindow.isMaximized(),
    });
  };

  mainWindow.on('resize', notifyDisplayChange);
  mainWindow.on('maximize', notifyDisplayChange);
  mainWindow.on('unmaximize', notifyDisplayChange);
  mainWindow.on('enter-full-screen', notifyDisplayChange);
  mainWindow.on('leave-full-screen', notifyDisplayChange);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpc() {
  ipcMain.handle('app-quit', () => {
    if (steam) steam.shutdown();
    app.quit();
  });

  ipcMain.handle('steam-unlock-achievement', (_e, id) => {
    if (!steam) return false;
    return steam.unlockAchievement(id);
  });

  ipcMain.handle('steam-cloud-read', (_e, key) => {
    if (!steam) return null;
    return steam.cloudRead(key);
  });

  ipcMain.handle('steam-cloud-write', (_e, key, payload) => {
    if (!steam) return false;
    return steam.cloudWrite(key, payload);
  });

  ipcMain.handle('steam-run-callbacks', () => {
    if (steam) steam.runCallbacks();
  });

  ipcMain.handle('steam-rich-presence', (_e, text) => {
    if (!steam) return;
    steam.setRichPresence(text);
  });

  ipcMain.handle('window-toggle-fullscreen', () => {
    if (!mainWindow) return false;
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
    return mainWindow.isFullScreen();
  });

  ipcMain.handle('window-is-fullscreen', () => mainWindow?.isFullScreen() ?? false);

  ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);

  ipcMain.handle('window-toggle-maximize', () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    return mainWindow.isMaximized();
  });
}

app.whenReady().then(() => {
  steam = createSteamBridge(STEAM_APP_ID);

  if (process.env.SWD_REQUIRE_STEAM === '1' && !steam.isReady()) {
    dialog.showErrorBox(
      'Steam Required',
      'Please launch Stackwave Defense through Steam.',
    );
    app.quit();
    return;
  }

  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (steam) steam.shutdown();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (steam) steam.shutdown();
});
