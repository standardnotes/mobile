import SF from './sfjs'
import Server from './httpManager'
import ModelManager from './modelManager'
import Storage from './storageManager'
import AlertManager from './alertManager'

import Auth from '../authManager'
import KeysManager from '../keysManager'

export default class Sync extends SFSyncManager {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new Sync();
    }

    return this.instance;
  }

  constructor() {
    super(ModelManager.get(), Storage.get(), Server.get());
    KeysManager.get().registerAccountRelatedStorageKeys(["syncToken", "cursorToken"]);

    this.setKeyRequestHandler((request) => {
      console.log(request);
      var keys;
      if(request == SFSyncManager.KeyRequestLoadSaveAccount || request == SFSyncManager.KeyRequestLoadLocal) {
        keys = KeysManager.get().activeKeys();
      } else if(request == SFSyncManager.KeyRequestSaveLocal) {
        // Only return keys when saving local if storage encryption is enabled.
        keys = KeysManager.get().isStorageEncryptionEnabled() && KeysManager.get().activeKeys();
      }

      let auth_params = KeysManager.get().activeAuthParams();
      let offline = Auth.getInstance().offline();

      return {keys, auth_params, offline}
    })
  }

  async resaveOfflineData() {
    var items = ModelManager.get().allItems;
    return this.writeItemsToLocalStorage(items, false);
  }

  async getServerURL() {
    return Auth.getInstance().serverUrl();
  }

  handleSignout() {
    super.handleSignout();

    // we might need to trigger this via events
    // this.syncObservers.forEach(function(mapping){
    //   mapping.callback();
    // })
  }
}
