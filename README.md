# electron-base-setup

Basis-Setup für `electron-vite` Projekte (JavaScript + React), das du nach dem Scaffolding mit einem Befehl einspielst.

## Ablauf

```bash
npm create @quick-start/electron@latest
# Name vergeben, React, TypeScript: No, Updater-Plugin: Yes

cd mein-projekt
node /pfad/zu/electron-base-setup/bin/apply.js
```

Alternativ, wenn das Paket in einem GitHub-Repo liegt: `npx github:DEIN-USER/electron-base-setup`

Das Skript

- kopiert `template/src/**` nach `src/**` (vorhandene Dateien wie `src/main/index.js` werden einmalig als `.orig` gesichert),
- installiert `electron-store@8` (CommonJS, läuft ohne Extra-Konfiguration mit electron-vite) sowie `electron-updater` und `@electron-toolkit/utils`, falls nicht vorhanden. Mit `--no-install` wird nur kopiert.

Danach noch anpassen:

1. `src/main/index.js`: `setAppUserModelId('com.example.my-app')` (muss zur `appId` in `electron-builder.yml` passen)
2. `electron-builder.yml`: `publish` auf dein Release-Ziel (z. B. `provider: github`, `owner`, `repo`)

## Enthaltene Struktur

```
src/main/
  index.js            Fenster, Single-Instance, DevTools nur im Dev-Modus, IPC-Registrierung
  store.js            electron-store (appSettings.json), Defaults, Normalizer, getSettings/saveSettings
  lifecycle.js        Tray, Schließen-Verhalten, Autostart (--hidden)
  window-state.js     Fenstergröße/-position speichern und beim Start wiederherstellen
  ipc/                handle.js, store-ipc.js, log-ipc.js, update-ipc.js
  services/           logger.js, events.js (broadcast), template.js, updater.js
src/preload/
  index.js            exposeInMainWorld für storeApi, logApi, updateApi
  api/                ipc.js (call/subscribe), store-api.js, log-api.js, update-api.js
```

## Store (`appSettings.json`)

Defaults nur für das Verhalten der App und die Fensterposition:

```js
app: {
  autoStart: true,
  closeAction: 'tray', // quit | tray
  window: { width: 1100, height: 760, x: null, y: null, maximized: false }
}
```

Weiteren Store anlegen: in `store.js` die auskommentierten Beispiele bei `FILE_NAMES`, `DEFAULTS` und `NORMALIZERS` aktivieren und anpassen. Der Bereich ist danach automatisch über `window.storeApi.getSettings('example')` / `setSettings('example', {...})` erreichbar.

## Neues IPC-Modul

1. `src/main/ipc/foo-ipc.js` mit `handle('foo:get', () => ...)`
2. in `src/main/index.js` `initializeFooIpc()` aufrufen
3. `src/preload/api/foo-api.js` mit `call('foo:get')` und in `src/preload/index.js` exposen
