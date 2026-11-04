// main/index.js
import { app, shell, BrowserWindow } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { initializeStoreIpc } from './ipc/store-ipc';
import { initializeLogIpc } from './ipc/log-ipc';
import { initializeUpdateIpc } from './ipc/update-ipc';
import { initAutoUpdater } from './services/updater';
import { attachWindow, hideWindow, initLifecycle, showWindow, startedHidden } from './lifecycle';
import { loadWindowState, trackWindowState, MIN_SIZE } from './window-state';
import { flushLogs } from './services/logger';

function createWindow() {
  const { maximized, ...bounds } = loadWindowState();
  const mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    show: false,
    autoHideMenuBar: true,
    title: `${app.name} - v${app.getVersion()}`,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: is.dev // DevTools nur im Entwicklungsmodus
    }
  });

  const hidden = startedHidden();
  trackWindowState(mainWindow);
  attachWindow(mainWindow);
  if (maximized) {
    // maximize() würde ein verstecktes Fenster sofort einblenden.
    if (hidden) mainWindow.once('show', () => mainWindow.maximize());
    else mainWindow.maximize();
  }

  mainWindow.on('ready-to-show', () => {
    if (hidden) hideWindow();
    else mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (/^https:\/\//i.test(details.url)) shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Nur eine Instanz erlaubt (z. B. wegen lokalem Server/Port oder gemeinsamem Store).
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);

  app.whenReady().then(() => {
    // TODO: eigene App-ID setzen (muss zu appId in electron-builder.yml passen)
    electronApp.setAppUserModelId('com.example.my-app');

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // Weitere IPC-Module hier registrieren, z. B. initializeOAuthIpc();
    initializeStoreIpc();
    initializeLogIpc();
    initializeUpdateIpc();
    initLifecycle();

    createWindow();
    initAutoUpdater();
    // Eigene Services hier starten, z. B.:
    // initBot().catch((error) => logger.error('app', `Start fehlgeschlagen: ${errorMessage(error)}`));

    app.on('activate', function () {
      if (!showWindow()) createWindow();
    });
  });

  app.on('before-quit', flushLogs);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
