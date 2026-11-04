// main/store.js
import { app } from 'electron';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Store from 'electron-store';

// Dateiname (ohne .json) je Store.
// Alle Stores liegen gesammelt im Ordner "store" im userData-Verzeichnis der App
// (Windows: %APPDATA%/<App-Name>/store). Der Ordner wird bei Bedarf angelegt.
const FILE_NAMES = {
  app: 'app-settings', // -> store/app-settings.json (Autostart, Schließverhalten, Fensterposition)
  actionLog: 'action-log' // wird vom Logger genutzt, hat keine Defaults/Normalizer
  // example: 'example-settings' // -> store/example-settings.json
};

function storeDir() {
  const dir = join(app.getPath('userData'), 'store');
  mkdirSync(dir, { recursive: true });
  return dir;
}

const cache = new Map();

export function getStore(key) {
  if (!cache.has(key)) {
    cache.set(key, new Store({ name: FILE_NAMES[key], cwd: storeDir() }));
  }
  return cache.get(key);
}

export const DEFAULTS = {
  app: {
    autoStart: true,
    closeAction: 'tray', // quit | tray
    window: {
      width: 1100,
      height: 760,
      x: null, // null = vom System / zentriert
      y: null,
      maximized: false
    }
  }

  // Beispiel für einen weiteren Store (Schritte 1-3, Schritt 1 steht in FILE_NAMES):
  // example: {
  //   enabled: true,
  //   mode: 'a', // a | b
  //   cooldownSeconds: 30,
  //   command: '!example',
  //   nested: {
  //     title: 'Beispiel',
  //     cost: 100
  //   }
  // }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  const result = clone(base);
  if (!isPlainObject(override)) return result;
  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// --- Hilfsfunktionen für die Normalizer ---
const int = (value, fallback, min, max) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};
const str = (value, fallback = '', maxLength = 500) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : fallback;
const bool = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
const oneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
// eslint-disable-next-line no-unused-vars
const command = (value, fallback) => str(value, fallback, 50).split(/\s+/)[0] || fallback;
const coordinate = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;

// Jeder Normalizer bekommt die bereits mit den Defaults gemergten Werte (verschachtelte
// Objekte sind also immer vorhanden) und liefert nur gültige, begrenzte Werte zurück.
const NORMALIZERS = {
  app: (v) => ({
    autoStart: bool(v.autoStart, DEFAULTS.app.autoStart),
    closeAction: oneOf(v.closeAction, ['quit', 'tray'], DEFAULTS.app.closeAction),
    window: {
      width: int(v.window.width, DEFAULTS.app.window.width, 1, 100000),
      height: int(v.window.height, DEFAULTS.app.window.height, 1, 100000),
      x: coordinate(v.window.x),
      y: coordinate(v.window.y),
      maximized: bool(v.window.maximized, false)
    }
  })

  // Beispiel (Schritt 3):
  // example: (v) => ({
  //   enabled: bool(v.enabled, DEFAULTS.example.enabled),
  //   mode: oneOf(v.mode, ['a', 'b'], DEFAULTS.example.mode),
  //   cooldownSeconds: int(v.cooldownSeconds, DEFAULTS.example.cooldownSeconds, 0, 86400),
  //   command: command(v.command, DEFAULTS.example.command),
  //   nested: {
  //     title: str(v.nested.title, DEFAULTS.example.nested.title, 45) || DEFAULTS.example.nested.title,
  //     cost: int(v.nested.cost, DEFAULTS.example.nested.cost, 1, 1000000)
  //   }
  // })
  // Danach im Renderer: await window.storeApi.getSettings('example')
};

// Alle Bereiche, die über settings:get / settings:set erreichbar sind.
export const SECTIONS = Object.keys(NORMALIZERS);

export function getSettings(section) {
  return deepMerge(DEFAULTS[section], getStore(section).store);
}

export function saveSettings(section, value) {
  const normalized = NORMALIZERS[section](deepMerge(getSettings(section), value));
  getStore(section).store = normalized;
  return normalized;
}
