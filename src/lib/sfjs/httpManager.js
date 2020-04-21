import KeysManager from '@Lib/keysManager';

import { SFHttpManager } from 'standard-file-js';

export default class Server extends SFHttpManager {
  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new Server();
    }

    return this.instance;
  }

  constructor() {
    super();

    this.setJWTRequestHandler(async () => {
      return KeysManager.get().jwt();
    });
  }
}
