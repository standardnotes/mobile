import Crypto from './crypto'
import Server from './server'
import Storage from './storage'
import ModelManager from './modelManager'
import {Platform} from 'react-native';
import Keychain from "./keychain"
var _ = require('lodash')
import FlagSecure from 'react-native-flag-secure-android';
import App from "../app"
import ApplicationState from "../ApplicationState"

let OfflineParamsKey = "pc_params";
let FirstRunKey = "first_run";

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

  loadLocalStateFromKeys(keys) {
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
    } else {
      this.offlineKeys = null;
      this.passcodeTiming = null;
      this.fingerprintEnabled = null;
      this.fingerprintTiming = null;
      this.accountKeys = null;
    }
  }

  async loadInitialData() {
    this.stateObserver = ApplicationState.get().addStateObserver((state) => {
      if(state == ApplicationState.Unlocking || state == ApplicationState.ThemeChangeBegin) {
        this.updateScreenshotPrivacy();
      }
    })

    var storageKeys = ["auth_params", OfflineParamsKey, "user", FirstRunKey];

    return Promise.all([

      Keychain.getKeys().then(function(keys){
        if(keys) {
          this.loadLocalStateFromKeys(keys);
        }
      }.bind(this)),

      Storage.getMultiItems(storageKeys).then(function(items){
        // first run
        this.firstRun = items[FirstRunKey] === null || items[FirstRunKey] === undefined;

        // auth params
        var authParams = items.auth_params;
        if(authParams) {
          this.accountAuthParams = JSON.parse(authParams);
        }

        // offline params
        var pcParams = items[OfflineParamsKey];
        if(pcParams) {
          this.offlineAuthParams = JSON.parse(pcParams);
        }

        // user
        var user = items.user;
        if(user) {
          this.user = JSON.parse(user);
        } else {
          this.user = {};
        }
      }.bind(this))
    ])
  }

  isFirstRun() {
    return this.firstRun;
  }

  async handleFirstRun() {
    // on first run, clear keys and data.
    // why? on iOS keychain data is persisted between installs/uninstalls.
    // this prevents the user from deleting the app and reinstalling if they forgot their local passocde
    // or if fingerprint scanning isn't working. By deleting all data on first run, we allow the user to reset app
    // state after uninstall.

    console.log("===Handling First Run===");

    return Promise.all([
      Storage.clear(),
      Keychain.clearKeys()
    ]).then(function(){
      this.loadLocalStateFromKeys(null);
      this.accountAuthParams = null;
      this.user = null;
      Storage.setItem(FirstRunKey, "false")
    }.bind(this));
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
    // This funciton is called when changes are made to authentication state
    this.updateScreenshotPrivacy();
    return Keychain.setKeys(this.generateKeychainStoreValue());
  }

  updateScreenshotPrivacy(enabled) {
    if(App.isIOS) {
      return;
    }

    var hasImmediatePasscode = this.hasOfflinePasscode() && this.passcodeTiming == "immediately";
    var hasImmedateFingerprint = this.hasFingerprint() && this.fingerprintTiming == "immediately";
    var enabled = hasImmediatePasscode || hasImmedateFingerprint;

    if(enabled) {
      FlagSecure.activate();
    } else {
      FlagSecure.deactivate();
    }
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



  // User

  getUserEmail() {
    return this.user && this.user.email;
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
