import Crypto from './crypto'
import Server from './server'
import Storage from './storage'
import ModelManager from './modelManager'
import {Platform} from 'react-native';
import Keychain from "./keychain"
var _ = require('lodash')

let OfflineParamsKey = "pc_params";

export default class KeysManager {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new KeysManager();
    }

    return this.instance;
  }

  async loadInitialData() {
    return Promise.all([

      Keychain.getKeys().then(function(keys){
        this.offlineKeys = keys.offline;
        this.accountKeys = _.omit(keys, "offline");
        if(_.keys(this.accountKeys).length == 0) {
          this.accountKeys = null;
        }
      }.bind(this)),

      Storage.getItem("auth_params").then(function(authParams) {
        if(authParams) {
          this.accountAuthParams = JSON.parse(authParams);
        }
      }.bind(this)),

      Storage.getItem(OfflineParamsKey).then(function(pcParams) {
        if(pcParams) {
          this.offlineAuthParams = JSON.parse(pcParams);
        }
      }.bind(this))
    ])
  }

  // what we should write to keychain
  generateKeychainStoreValue() {
    var result = {};
    if(this.accountKeys) {
      _.merge(result, this.accountKeys);
    }
    if(this.offlineKeys) {
      _.merge(result, {offline: {pw: this.offlineKeys.pw}});
    }

    return result;
  }

  async persistKeysToKeychain() {
    return Keychain.setKeys(this.generateKeychainStoreValue());
  }

  async persistAccountKeys(keys) {
    this.accountKeys = keys;
    return this.persistKeysToKeychain();
  }

  async persistOfflineKeys(keys) {
    this.setOfflineKeys(keys);
    return this.persistKeysToKeychain();
  }

  setOfflineKeys(keys) {
    // offline keys are ephemeral and should not be stored anywhere
    this.offlineKeys = keys;
  }

  offlinePasscodeHash() {
    return this.offlineKeys ? this.offlineKeys.pw : null;
  }

  hasOfflinePasscode() {
    return this.offlineKeys && this.offlineKeys.pw !== null;
  }

  /* The keys to use for encryption. If user is signed in, use those keys, otherwise use offline keys */
  activeKeys() {
    if(_.keys(this.accountKeys).length > 0) {
      return this.accountKeys;
    } else {
      return this.offlineKeys;
    }
  }

  encryptionEnabled() {
    var keys = this.activeKeys();
    return keys && keys.mk !== null;
  }

  encryptionSource() {
    if(this.accountKeys && this.accountKeys.mk !== null) {
      return "account";
    } else if(this.offlineKeys && this.offlineKeys.mk !== null) {
      return "offline";
    } else {
      return null;
    }
  }

  async clearAccountKeysAndData() {
    Keychain.clearKeys();
    this.accountKeys = null;
    this.accountAuthParams = null;
    return this.persistKeysToKeychain();
  }

  clearOfflineKeysAndData() {
    // make sure user is authenticated before performing this step
    if(!this.offlineKeys.mk) {
      alert("Unable to remove passcode. Make sure you are properly authenticated and try again.");
      return false;
    }
    this.offlineKeys = null;
    this.offlineAuthParams = null;
    Storage.removeItem(OfflineParamsKey);
    return this.persistKeysToKeychain();
  }

  jwt() {
    var keys = this.activeKeys();
    return keys && keys.jwt;
  }

  // Auth Params

  async setAccountAuthParams(authParams) {
    this.accountAuthParams = authParams;
    return Storage.setItem("auth_params", JSON.stringify(authParams));
  }

  async setOfflineAuthParams(authParams) {
    this.offlineAuthParams = authParams;
    return Storage.setItem(OfflineParamsKey, JSON.stringify(authParams));
  }

  activeAuthParams() {
    if(this.accountKeys) {
      return this.accountAuthParams;
    } else {
      return this.offlineAuthParams;
    }
  }

}
