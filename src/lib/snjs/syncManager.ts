import { SFSyncManager } from 'snjs';
import KeysManager from '@Lib/keysManager';
import Auth from '@Lib/snjs/authManager';
import Server from '@Lib/snjs/httpManager';
import ModelManager from '@Lib/snjs/modelManager';
import Storage from '@Lib/snjs/storageManager';

export default class Sync extends SFSyncManager {
  private static instance: Sync;

  static get() {
    if (!this.instance) {
      this.instance = new Sync();
    }

    return this.instance;
  }

  constructor() {
    super(ModelManager.get(), Storage.get(), Server.get());
    KeysManager.get().registerAccountRelatedStorageKeys([
      'syncToken',
      'cursorToken'
    ]);

    this.setKeyRequestHandler((request: any) => {
      let keys;
      if (
        request === SFSyncManager.KeyRequestLoadSaveAccount ||
        request === SFSyncManager.KeyRequestLoadLocal
      ) {
        keys = KeysManager.get().activeKeys();
      } else if (request === SFSyncManager.KeyRequestSaveLocal) {
        // Only return keys when saving local if storage encryption is enabled.
        keys =
          KeysManager.get().isStorageEncryptionEnabled() &&
          KeysManager.get().activeKeys();
      }

      const auth_params = KeysManager.get().activeAuthParams();
      const offline = Auth.get().offline();

      return { keys, auth_params, offline };
    });

    // Content types appearing first are always mapped first
    this.contentTypeLoadPriority = [
      'SN|UserPreferences',
      'SN|Privileges',
      'SN|Component',
      'SN|Theme'
    ];
  }

  async resaveOfflineData() {
    const items = ModelManager.get().allItems;
    return this.writeItemsToLocalStorage(items, false);
  }

  async getServerURL() {
    return Auth.get().serverUrl();
  }

  handleSignout() {
    super.handleSignout();

    // we might need to trigger this via events
    // this.syncObservers.forEach(function(mapping){
    //   mapping.callback();
    // })
  }
}
