// main/ipc/store-ipc.js

let initialized = false;
import { logger } from '../services/logger';
import { SECTIONS, getSettings, saveSettings } from '../store';
import { applyAppSettings } from '../lifecycle';
import { handle } from './handle';

function assertSection(section) {
  if (!SECTIONS.includes(section)) throw new Error(`Unbekannter Bereich: ${section}`);
}

export function initializeStoreIpc() {
  if (initialized) return logger.info('[IPC]', 'Store IPC already initialized');
  initialized = true;
  logger.info('[IPC]', 'Store IPC initialized');

  handle('settings:get', (section) => {
    assertSection(section);
    return getSettings(section);
  });

  handle('settings:set', (section, value) => {
    assertSection(section);
    const saved = saveSettings(section, value);
    // Autostart/Tray sofort an die neuen Einstellungen anpassen.
    if (section === 'app') applyAppSettings();
    return saved;
  });
}
