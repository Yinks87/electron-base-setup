// preload/api/store-api.js
import { call } from './ipc';

export const storeApi = {
  getSettings: (section) => call('settings:get', section),
  setSettings: (section, value) => call('settings:set', section, value)
};
