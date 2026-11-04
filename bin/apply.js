#!/usr/bin/env node
// Kopiert template/src in das aktuelle electron-vite Projekt und installiert electron-store.
// Aufruf im Projektordner:  node /pfad/zu/electron-base-setup/bin/apply.js [--no-install]
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const skipInstall = process.argv.includes('--no-install');
const target = process.cwd();
const templateSrc = join(dirname(fileURLToPath(import.meta.url)), '..', 'template', 'src');

if (!existsSync(join(target, 'package.json')) || !existsSync(join(target, 'src', 'main'))) {
  console.error('Bitte im Hauptordner eines electron-vite Projekts ausführen (package.json + src/main).');
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(templateSrc)) {
  const rel = relative(templateSrc, file);
  const dest = join(target, 'src', rel);
  mkdirSync(dirname(dest), { recursive: true });
  // Vorhandene Dateien (z. B. src/main/index.js aus dem Scaffold) werden einmalig als .orig gesichert.
  if (existsSync(dest) && !existsSync(dest + '.orig')) copyFileSync(dest, dest + '.orig');
  copyFileSync(file, dest);
  console.log('  +', join('src', rel));
}

const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
// electron-store v8 ist CommonJS und läuft ohne Extra-Konfiguration mit electron-vite (v9+ ist ESM-only).
const wanted = ['electron-store@latest'];
if (!deps['electron-updater']) wanted.push('electron-updater');
if (!deps['@electron-toolkit/utils']) wanted.push('@electron-toolkit/utils');

if (skipInstall) {
  console.log(`\nInstalliere selbst:  npm install ${wanted.join(' ')}`);
} else {
  console.log(`\nnpm install ${wanted.join(' ')}`);
  const result = spawnSync('npm', ['install', ...wanted], { stdio: 'inherit', shell: true, cwd: target });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('\nFertig. App-ID in src/main/index.js (setAppUserModelId) und "publish" in electron-builder.yml anpassen.');
