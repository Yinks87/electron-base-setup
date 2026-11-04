// main/ipc/update-ipc.js
import { getUpdateState } from '../services/updater';
import { handle } from './handle';

export function initializeUpdateIpc() {
  handle('update:get', () => getUpdateState());
}
