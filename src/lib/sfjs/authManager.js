import {Platform} from 'react-native';
import KeysManager from "../keysManager"
import Storage from './storageManager'
import Server from './httpManager'
import AlertManager from './alertManager'

export default class Auth extends SFAuthManager {

  static instance = null;
  static get() {
    if(this.instance == null) {
      this.instance = new Auth(Storage.get(), Server.get(), AlertManager.get());
    }
    return this.instance;
  }

  defaultServer() {
    if (__DEV__) {
      if(Platform.OS === "android") {
        return "http://10.0.2.2:3000"
      } else {
        return "http://localhost:3000"
      }
    } else {
      return "https://sync.standardnotes.org";
    }
  }

  serverUrl() {
    var user = KeysManager.get().user;
    return (user && user.server) || this.defaultServer();
  }

  offline() {
    // an offline user could have keys saved if using passcode lock
    var keys = KeysManager.get().activeKeys() || {};
    return !keys.jwt;
  }

  async signout(clearAllData) {
    // DONT clear all data. We will do this ourselves manually, as we need to preserve certain data keys.
    super.signout(false);
  }

  async keys() {
    return KeysManager.get().activeKeys();
  }

  async getAuthParams() {
    return KeysManager.get().activeAuthParams();
  }

  async handleAuthResponse(response, email, url, authParams, keys) {
    // We don't want to call super, as the super implementation is meant for web credentials
    // super will save keys to storage, which we don't want.
    // await super.handleAuthResponse(response, email, url, authParams, keys);
    try {
      this._keys = keys;
      return Promise.all([
        KeysManager.get().persistAccountKeys(_.merge(keys, {jwt: response.token})),
        KeysManager.get().setAccountAuthParams(authParams),
        KeysManager.get().saveUser({server: url, email: email})
      ]);
    } catch(e) {
      console.log("Error saving auth paramters", e);
      return null;
    }
  }
}
