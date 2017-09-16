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

  constructor() {
    this.accountRelatedStorageKeys = ["auth_params", "user"];
  }

  async loadInitialData() {
    return Promise.all([

      Keychain.getKeys().then(function(keys){
        if(keys) {
          this.offlineKeys = keys.offline;
          if(this.offlineKeys) {
            this.passcodeTiming = this.offlineKeys.timing;
          }

          if(keys.fingerprint) {
            this.fingerprintEnabled = keys.fingerprint.enabled;
            this.fingerprintTiming = keys.fingerprint.timing;
          }
          this.accountKeys = _.omit(keys, ["offline", "fingerprint"]);
          if(_.keys(this.accountKeys).length == 0) {
            this.accountKeys = null;
          }
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
      }.bind(this)),

      Storage.getItem("user").then(function(user) {
        if(user) {
          this.user = JSON.parse(user);
        } else {
          this.user = {};
        }
      }.bind(this)),
    ])
  }

  registerAccountRelatedStorageKeys(storageKeys) {
    this.accountRelatedStorageKeys = _.uniq(this.accountRelatedStorageKeys.concat(storageKeys));
  }

  // what we should write to keychain
  generateKeychainStoreValue() {
    var value = {fingerprint: {enabled: this.fingerprintEnabled, timing: this.fingerprintTiming}};

    if(this.accountKeys) {
      _.merge(value, this.accountKeys);
    }
    if(this.offlineKeys) {
      _.merge(value, {offline: {pw: this.offlineKeys.pw, timing: this.passcodeTiming}});
    }

    return value;
  }

  async persistKeysToKeychain() {
    return Keychain.setKeys(this.generateKeychainStoreValue());
  }

  async persistAccountKeys(keys) {
    this.accountKeys = keys;
    return this.persistKeysToKeychain();
  }

  async saveUser(user) {
    this.user = user;
    return Storage.setItem("user", JSON.stringify(user));
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
    this.user = null;
    Storage.clearKeys(this.accountRelatedStorageKeys);
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



  // Local Security

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

  async persistOfflineKeys(keys) {
    this.setOfflineKeys(keys);
    if(!this.passcodeTiming) {
      this.passcodeTiming = "on-quit";
    }
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

  hasFingerprint() {
    return this.fingerprintEnabled;
  }

  async setPasscodeTiming(timing) {
    this.passcodeTiming = timing;
    return this.persistKeysToKeychain();
  }

  async setFingerprintTiming(timing) {
    this.fingerprintTiming = timing;
    return this.persistKeysToKeychain();
  }

  async enableFingerprint() {
    this.fingerprintEnabled = true;
    if(!this.fingerprintTiming) {
      this.fingerprintTiming = "on-quit";
    }
    return this.persistKeysToKeychain();
  }

  async disableFingerprint() {
    this.fingerprintEnabled = false;
    return this.persistKeysToKeychain();
  }

  getPasscodeTimingOptions() {
    return [
      {title: "Immediately", key: "immediately", selected: this.passcodeTiming == "immediately"},
      {title: "On Quit", key: "on-quit", selected: this.passcodeTiming == "on-quit"},
    ]
  }

  getFingerprintTimingOptions() {
    return [
      {title: "Immediately", key: "immediately", selected: this.fingerprintTiming == "immediately"},
      {title: "On Quit", key: "on-quit", selected: this.fingerprintTiming == "on-quit"},
    ]
  }

}
