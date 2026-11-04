// main/ipc/log-ipc.js

let initialized = false;
import { clearLogs, getLogs, logger } from '../services/logger';
import { handle } from './handle';

export function initializeLogIpc() {
  if (initialized) return logger.info('[IPC]', 'Log IPC already initialized');
  initialized = true;
  logger.info('[IPC]', 'Log IPC initialized');

  handle('log:get', () => getLogs());
  handle('log:clear', () => clearLogs());
}
