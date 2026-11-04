// main/window-state.js
import { screen } from 'electron';
import { getSettings, getStore } from './store';

export const MIN_SIZE = { width: 860, height: 600 };
const MIN_VISIBLE = 100;
const SAVE_DELAY_MS = 500;

function overlapsDisplay(bounds) {
  return screen.getAllDisplays().some(({ workArea }) => {
    const width =
      Math.min(bounds.x + bounds.width, workArea.x + workArea.width) -
      Math.max(bounds.x, workArea.x);
    const height =
      Math.min(bounds.y + bounds.height, workArea.y + workArea.height) -
      Math.max(bounds.y, workArea.y);
    return width >= MIN_VISIBLE && height >= MIN_VISIBLE;
  });
}

// Liefert die zuletzt gespeicherte Größe/Position (appSettings.json -> window). Ist die Position
// nicht mehr verfügbar (z. B. Monitor getrennt), wird nur die Größe übernommen und das Fenster zentriert.
export function loadWindowState() {
  const saved = getSettings('app').window;
  const { workArea } = screen.getPrimaryDisplay();
  const size = {
    width: Math.min(Math.max(saved.width, MIN_SIZE.width), workArea.width),
    height: Math.min(Math.max(saved.height, MIN_SIZE.height), workArea.height)
  };

  const hasPosition = saved.x !== null && saved.y !== null;
  const position =
    hasPosition && overlapsDisplay({ x: saved.x, y: saved.y, ...size })
      ? { x: saved.x, y: saved.y }
      : {};

  return { ...size, ...position, maximized: saved.maximized };
}

export function trackWindowState(window) {
  const store = getStore('app');
  let timer = null;

  const save = () => {
    clearTimeout(timer);
    if (window.isDestroyed() || window.isMinimized() || window.isFullScreen()) return;
    store.set('window', { ...window.getNormalBounds(), maximized: window.isMaximized() });
  };
  const scheduleSave = () => {
    clearTimeout(timer);
    timer = setTimeout(save, SAVE_DELAY_MS);
  };

  window.on('resize', scheduleSave);
  window.on('move', scheduleSave);
  window.on('maximize', scheduleSave);
  window.on('unmaximize', scheduleSave);
  window.on('close', save);
}
