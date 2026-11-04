// main/services/events.js
import { BrowserWindow } from 'electron';

// Sendet ein Event an alle offenen Fenster (Gegenstück: subscribe() im Preload).
export function broadcast(channel, payload) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, payload);
  }
}
