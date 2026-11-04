// main/ipc/update-ipc.js
let initialized = false;
import { logger } from '../services/logger';
import { getUpdateState } from '../services/updater';
import { handle } from './handle';

export function initializeUpdateIpc() {
  if (initialized) return logger.info('[IPC]', 'Update IPC already initialized');
  initialized = true;
  logger.info('[IPC]', 'Update IPC initialized');

  handle('update:get', () => getUpdateState());
}
