import KeysManager from '@Lib/keysManager';

import { SFHttpManager } from 'snjs';

export default class Server extends SFHttpManager {
  private static instance: Server;

  static get() {
    if (!this.instance) {
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
