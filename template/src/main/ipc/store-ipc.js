// main/ipc/store-ipc.js
import { SECTIONS, getSettings, saveSettings } from '../store';
import { applyAppSettings } from '../lifecycle';
import { handle } from './handle';

function assertSection(section) {
  if (!SECTIONS.includes(section)) throw new Error(`Unbekannter Bereich: ${section}`);
}

export function initializeStoreIpc() {
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
