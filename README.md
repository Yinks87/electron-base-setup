# electron-base-setup
 
Basis-Setup für [electron-vite](https://electron-vite.org) Projekte (JavaScript + React). Nach dem Scaffolding spielst du mit einem Befehl alles ein, was in jedem Projekt gleich ist:
 
- Datenspeicherung mit `electron-store` (Defaults + Validierung)
- Logger mit Speicherung und Live-Übertragung ans Frontend
- IPC-Grundgerüst mit einheitlichen Antworten (`{ ok, data }` / `{ ok: false, error }`)
- Auto-Updater (electron-updater)
- Tray, Schließen-Verhalten und Autostart
- Fensterposition und -größe werden gespeichert und beim Start wiederhergestellt
## Schnellstart
 
```bash
npm create @quick-start/electron@latest
```
 
Danach im Projektordner:
 
```bash
cd mein-projekt
npx github:Yinks87/electron-base-setup
```
 
Nur Dateien kopieren, ohne Pakete zu installieren:
 
```bash
npx github:Yinks87/electron-base-setup --no-install
```
 
Hinweise:
 
- Ein GitHub-Repo mit Paketdateien wird von `npm create` nicht als Template erkannt. Deshalb sind es zwei Schritte: erst das Scaffold, dann `npx`.
- npx cached Pakete aus GitHub. Kommt nach einer Änderung am Repo noch die alte Version, hilft `npx --yes github:Yinks87/electron-base-setup@main` oder `npx clear-npx-cache`.
Alternativ mit lokalem Klon des Repos:
 
```bash
node /pfad/zu/electron-base-setup/bin/apply.js
```
 
## Was das Skript macht
 
1. Prüft, ob es im Hauptordner eines electron-vite Projekts läuft (`package.json` und `src/main` müssen existieren).
2. Kopiert `template/src/**` nach `src/**`. Existiert eine Datei bereits (z. B. `src/main/index.js` aus dem Scaffold), wird sie einmalig als `<datei>.orig` gesichert und dann überschrieben.
3. Installiert fehlende Pakete: `electron-store@8`, `electron-updater`, `@electron-toolkit/utils`.
`electron-store` ist bewusst auf Version 8 festgelegt. Ab v9 ist das Paket nur noch ESM und braucht in electron-vite zusätzliche Konfiguration. v8 läuft ohne Anpassung.
 
## Danach anpassen
 
1. **App-ID** in `src/main/index.js`: `electronApp.setAppUserModelId('com.example.my-app')`. Muss zur `appId` in `electron-builder.yml` passen.
2. **Update-Ziel** in `electron-builder.yml`: Das Scaffold legt dort einen `generic`-Platzhalter an. Für GitHub-Releases:
```yaml
   publish:
     provider: github
     owner: Yinks87
     repo: mein-projekt
```
 
3. **Tray-Icon**: wird aus `resources/icon.png` erzeugt (kommt vom Scaffold, einfach ersetzen).
## Projektstruktur
 
```
src/main/
  index.js            Fenster, Single-Instance, DevTools nur im Dev-Modus, IPC-Registrierung
  store.js            Stores, Defaults, Normalizer, getSettings / saveSettings
  lifecycle.js        Tray, Schließen-Verhalten, Autostart (--hidden)
  window-state.js     Fensterposition und -größe speichern / wiederherstellen
  ipc/
    handle.js         Wrapper für ipcMain.handle mit einheitlicher Antwort und Fehlerlogging
    store-ipc.js      settings:get / settings:set
    log-ipc.js        log:get / log:clear
    update-ipc.js     update:get
  services/
    logger.js         Logger (persistent, max. 1000 Einträge)
    events.js         broadcast() an alle Fenster
    template.js       renderTemplate() für ${platzhalter}, errorMessage()
    updater.js        Auto-Updater
src/preload/
  index.js            exposeInMainWorld für storeApi, logApi, updateApi
  api/
    ipc.js            call() / subscribe()
    store-api.js
    log-api.js
    update-api.js
```
 
## Store
 
Der Haupt-Store liegt in `appSettings.json` (im `userData`-Ordner der App). Defaults gibt es nur für das App-Verhalten und die Fensterposition:
 
```js
app: {
  autoStart: true,
  closeAction: 'tray', // quit | tray
  window: { width: 1100, height: 760, x: null, y: null, maximized: false }
}
```
 
Aus dem Renderer:
 
```js
const app = await window.storeApi.getSettings('app');
 
// Teilwerte genügen, der Rest wird mit den gespeicherten Werten und Defaults ergänzt.
await window.storeApi.setSettings('app', { closeAction: 'quit' });
```
 
Jeder Wert läuft vor dem Speichern durch den Normalizer in `store.js`. Ungültige Werte werden durch Defaults ersetzt, Zahlen und Texte begrenzt.
 
### Weiteren Store anlegen
 
In `src/main/store.js` stehen an drei Stellen auskommentierte `example`-Beispiele:
 
1. `FILE_NAMES`: Dateiname eintragen (`example: 'example-settings'` ergibt `example-settings.json`)
2. `DEFAULTS`: Standardwerte
3. `NORMALIZERS`: Validierung
Danach ist der Bereich automatisch erreichbar:
 
```js
await window.storeApi.getSettings('example');
await window.storeApi.setSettings('example', { enabled: false });
```
 
Stores ohne Defaults/Normalizer (wie `actionLog` für den Logger) werden nur in `FILE_NAMES` eingetragen und direkt per `getStore('name')` genutzt.
 
## Logger
 
Im Main-Prozess:
 
```js
import { logger } from './services/logger';
 
logger.info('app', 'Gestartet');
logger.success('bot', 'Verbunden');
logger.warn('bot', 'Langsame Antwort');
logger.error('bot', 'Fehlgeschlagen', { code: 42 });
```
 
Niemals Tokens oder Secrets in `message` oder `details` übergeben.
 
Im Renderer:
 
```js
const entries = await window.logApi.get();
const unsubscribe = window.logApi.onEntry((entry) => console.log(entry));
// unsubscribe() beim Aufräumen aufrufen
await window.logApi.clear();
```
 
## Updater
 
- Läuft nur in der gepackten App, im Entwicklungsmodus wird die Prüfung übersprungen.
- Prüft beim Start, lädt automatisch herunter und installiert sofort mit Neustart.
- Status (`idle | checking | available | downloading | downloaded | error`) im Renderer:
```js
const state = await window.updateApi.get();
const unsubscribe = window.updateApi.onState((s) => console.log(s.status, s.percent));
```
 
## Tray und Autostart
 
- `closeAction: 'tray'`: Das Schließen des Fensters minimiert in den Tray, "Beenden" im Tray-Menü beendet die App.
- `closeAction: 'quit'`: Das Schließen beendet die App.
- `autoStart: true`: Die gepackte App startet mit dem System im Tray (Argument `--hidden`). Im Entwicklungsmodus wird kein Autostart registriert.
- Änderungen über `setSettings('app', ...)` greifen sofort.
## Neues IPC-Modul hinzufügen
 
1. `src/main/ipc/foo-ipc.js`:
```js
   import { handle } from './handle';
 
   export function initializeFooIpc() {
     handle('foo:get', () => 'bar');
     handle('foo:set', (value) => { /* ... */ });
   }
```
 
2. In `src/main/index.js` importieren und bei den anderen `initialize...Ipc()` Aufrufen registrieren.
3. `src/preload/api/foo-api.js`:
```js
   import { call, subscribe } from './ipc';
 
   export const fooApi = {
     get: () => call('foo:get'),
     set: (value) => call('foo:set', value),
     onChange: (callback) => subscribe('foo:change', callback)
   };
```
 
4. In `src/preload/index.js` importieren und in **beiden** Zweigen (`contextBridge.exposeInMainWorld` und dem `else`) eintragen.
Events vom Main-Prozess ans Frontend: `broadcast('foo:change', payload)` aus `services/events.js`.
 
## Fehlerbehebung
 
| Problem | Lösung |
| --- | --- |
| "Bitte im Hauptordner eines electron-vite Projekts ausführen" | In den Projektordner wechseln, in dem `package.json` und `src/main` liegen. |
| `Cannot find module 'electron-store'` | `npm install electron-store@8` (bei `--no-install` nötig). |
| Update-Fehler im gepackten Build | `publish` in `electron-builder.yml` prüfen, es muss auf ein erreichbares Release-Ziel zeigen. |
| `npx` liefert eine alte Version des Setups | `npx clear-npx-cache` ausführen oder `npx --yes github:Yinks87/electron-base-setup@main` verwenden. |
| Original-Dateien wiederherstellen | Die Sicherungen liegen als `*.orig` neben den überschriebenen Dateien. |
 
## Setup selbst ändern
 
Dateien unter `template/src/` bearbeiten, committen und pushen. Beim nächsten Projekt gilt dann die neue Version.
 
