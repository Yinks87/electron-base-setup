// preload/index.js
import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

import { storeApi } from './api/store-api';
import { logApi } from './api/log-api';
import { updateApi } from './api/update-api';

// Neue APIs hier importieren und unten in beiden Zweigen eintragen.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('storeApi', storeApi);
    contextBridge.exposeInMainWorld('logApi', logApi);
    contextBridge.exposeInMainWorld('updateApi', updateApi);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.storeApi = storeApi;
  window.logApi = logApi;
  window.updateApi = updateApi;
}
