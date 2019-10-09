import {Platform} from 'react-native';
import FlagSecure from 'react-native-flag-secure-android';
import FingerprintScanner from 'react-native-fingerprint-scanner';

import SF from './sfjs/sfjs'
import ModelManager from './sfjs/modelManager'
import Storage from './sfjs/storageManager'
import Keychain from "./keychain"

let OfflineParamsKey = "pc_params";
let FirstRunKey = "first_run";
let StorageEncryptionKey = "storage_encryption";

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
    var storageKeys = ["auth_params", OfflineParamsKey, "user", FirstRunKey, StorageEncryptionKey];

    /*
      We only want to call this once per app session. On Android, the App.js component may be unmounted
      on hardware back button press. When it constructs again, it calls this function, resetting our values for offlineKeys
      which we don't want to change, since on authentication, they are set by the passcode unlock success function.
     */
    if(this.loadInitialDataPromise) {
      return this.loadInitialDataPromise;
    }

    this.loadInitialDataPromise = Promise.all([

      Keychain.getKeys().then((keys) => {
        if(keys) {
          this.parseKeychainValue(keys);
        }
      }),

      Storage.get().getMultiItems(storageKeys).then((items) => {
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

        // storage encryption
        if(items[StorageEncryptionKey] == null || items[StorageEncryptionKey] == undefined) {
          // default is true
          // Note that this defaults to true, but doesn't dictate if it's actually applied.
          // For example, when you first install the app and have no account and no passcode,
          // There will be no encryption source available. In the syncManager key request handler,
          // we check if this flag is true and if there are active keys. We use this to indicate that
          // when keys become available, we want storage encryption to be enabled by default.
          this._storageEncryptionEnabled = true;
        } else {
          this._storageEncryptionEnabled = JSON.parse(items[StorageEncryptionKey]) == true;
        }

        // user
        var user = items.user;
        if(user) {
          this.user = JSON.parse(user);
        } else {
          this.user = {};
        }
      })
    ])

    return this.loadInitialDataPromise;
  }

  async isFirstRun() {
    // First run depends on AsyncStorage returning null for FirstRunKey. But what if
    // AsyncStorage returns null by mistake due to a regression in the library, or an exception?
    // We want to be more careful with this, as we delete all data on FirstRun.
    // In addition to this key, we'll make sure that storageManager.getAllModelKeys.length is 0.
    // This way, if this.firstRun happens to be true, but we have some models, we don't take any destructive action.
    let numModels = (await Storage.get().getAllModelKeys()).length;
    return this.firstRun && numModels == 0;
  }

  async handleFirstRun() {
    // on first run, clear keys and data.
    // why? on iOS keychain data is persisted between installs/uninstalls.
    // this prevents the user from deleting the app and reinstalling if they forgot their local passocde
    // or if fingerprint scanning isn't working. By deleting all data on first run, we allow the user to reset app
    // state after uninstall.

    console.log("===Handling First Run===");

    return Promise.all([
      Storage.get().clear(),
      Keychain.clearKeys()
    ]).then(function(){
      this.parseKeychainValue(null);
      this.accountAuthParams = null;
      this.user = null;
      Storage.get().setItem(FirstRunKey, "false");
    }.bind(this));
  }

  /*
    If a user was using the app offline without an account, and had a local passcode, then did
    an iCloud restore, then they will have saved auth params (saved to storage),
    but no keychain values (not saved to storage).

    In this case, we want to present a recovery wizard where they can attempt values of their local passcode,
    and see if it yeilds successful decryption. We can't verify whether the passcode they enter is correct,
    since the valid hash value is stored in the keychain as well.
   */
  shouldPresentKeyRecoveryWizard() {
    if(!this.accountAuthParams && this.offlineAuthParams && !this.offlineKeys) {
      return true;
    } else {
      return false;
    }
  }

  /*
    We need to register local storage keys, so that when we want to sign out, we don't accidentally
    clear internal keys, like first_run. (If you accidentally delete the first_run key when you sign out,
    then the next time you sign in and refresh, it will treat it as a new run, and delete all data.)
  */
  registerAccountRelatedStorageKeys(storageKeys) {
    this.accountRelatedStorageKeys = _.uniq(this.accountRelatedStorageKeys.concat(storageKeys));
  }

  parseKeychainValue(keys) {
    if(keys) {
      this.offlineKeys = keys.offline;
      if(this.offlineKeys) {
        this.passcodeTiming = this.offlineKeys.timing;
      }

      if(keys.fingerprint) {
        this.fingerprintEnabled = keys.fingerprint.enabled;
        this.fingerprintTiming = keys.fingerprint.timing;
      }

      if(keys.encryptedAccountKeys) {
        // We won't handle this case here. We'll wait until setOfflineKeys is called
        // by whoever authenticates local passcode. That's when we actually get the offline
        // keys we can use to decrypt encryptedAccountKeys
        this.encryptedAccountKeys = keys.encryptedAccountKeys;
      } else {
        this.accountKeys = _.omit(keys, ["offline", "fingerprint"]);
        if(_.keys(this.accountKeys).length == 0) {
          this.accountKeys = null;
        }
      }
    } else {
      this.offlineKeys = null;
      this.passcodeTiming = null;
      this.fingerprintEnabled = null;
      this.fingerprintTiming = null;
      this.accountKeys = null;
    }
  }

  // what we should write to keychain
  async generateKeychainStoreValue() {
    var value = {fingerprint: {enabled: this.fingerprintEnabled, timing: this.fingerprintTiming}};

    if(this.accountKeys) {
      // If offline local passcode keys are available, use that to encrypt account keys
      // Don't encrypt offline pw because then we don't be able to verify passcode
      if(this.offlineKeys) {
        var encryptedKeys = new SFItem();
        encryptedKeys.uuid = await SF.get().crypto.generateUUID();
        encryptedKeys.content_type = "SN|Mobile|EncryptedKeys"
        encryptedKeys.content.accountKeys = this.accountKeys;
        var params = new SFItemParams(encryptedKeys, this.offlineKeys, this.offlineAuthParams);
        let results = await params.paramsForSync();
        value.encryptedAccountKeys = results;
      } else {
        _.merge(value, this.accountKeys);
      }
    }

    if(this.offlineKeys) {
      _.merge(value, {offline: {pw: this.offlineKeys.pw, timing: this.passcodeTiming}});
    }

    return value;
  }

  async persistKeysToKeychain() {
    // This funciton is called when changes are made to authentication state
    this.updateScreenshotPrivacy();
    let value = await this.generateKeychainStoreValue();
    return Keychain.setKeys(value);
  }

  updateScreenshotPrivacy(enabled) {
    if(Platform.OS == "ios") {
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
    return Storage.get().setItem("user", JSON.stringify(user));
  }

  /* The keys to use for encryption. If user is signed in, use those keys, otherwise use offline keys */
  activeKeys() {
    if(this.hasAccountKeys()) {
      return this.accountKeys;
    } else {
      return this.offlineKeys;
    }
  }

  hasAccountKeys() {
    return _.keys(this.accountKeys).length > 0;
  }

  isOfflineEncryptionEnabled() {
    var keys = this.activeKeys();
    return keys && keys.mk !== null && this.isStorageEncryptionEnabled();
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
    await Storage.get().clearKeys(this.accountRelatedStorageKeys);
    return this.persistKeysToKeychain();
  }

  jwt() {
    var keys = this.activeKeys();
    return keys && keys.jwt;
  }




  // Storage Encryption

  async enableStorageEncryption() {
    this._storageEncryptionEnabled = true;
    return Storage.get().setItem(StorageEncryptionKey, JSON.stringify(this._storageEncryptionEnabled));
  }

  async disableStorageEncryption() {
    this._storageEncryptionEnabled = false;
    return Storage.get().setItem(StorageEncryptionKey, JSON.stringify(this._storageEncryptionEnabled));
  }

  isStorageEncryptionEnabled() {
    // See comment in loadInitialData regarding why the value of this._storageEncryptionEnabled is not sufficient
    // to determine whether it's actually enabled
    return this._storageEncryptionEnabled && this.activeKeys();
  }



  // Auth Params

  async setAccountAuthParams(authParams) {
    this.accountAuthParams = authParams;
    await Storage.get().setItem("auth_params", JSON.stringify(authParams));

    if(this.offlineAuthParams && !this.offlineKeys) {
      /*
        This can happen if:
        1. You are signed into an account and have a local passcode
        2. You do an iCloud restore
        3. Your Keychain is wiped, but storage isn't, so offlineAuthParams still exists.
        4. You restore your account by signing in. At this point, no local passcode will actually be set.
           The value of offlineAuthParams is stale. We want to delete it.
      */

      console.log("offlineAuthParams is stale, deleting");
      await Storage.get().removeItem(OfflineParamsKey);
    }
  }

  async setOfflineAuthParams(authParams) {
    this.offlineAuthParams = authParams;
    return Storage.get().setItem(OfflineParamsKey, JSON.stringify(authParams));
  }

  defaultProtocolVersionForKeys(keys) {
    if(keys && keys.ak) {
      // If there's no version stored, and there's an ak, it has to be 002. Newer versions would have thier version stored in authParams.
      return "002";
    } else {
      return "001";
    }
  }

  activeAuthParams() {
    if(this.accountKeys) {
      var params = this.accountAuthParams;
      if(params && !params.version) {
        params.version = this.defaultProtocolVersionForKeys(this.accountKeys);
      }
      return params;
    } else if(this.offlineAuthParams) {
      var params = this.offlineAuthParams;
      if(params && !params.version) {
        params.version = this.defaultProtocolVersionForKeys(this.offlineKeys);
      }
      return params;
    }
  }



  // User

  getUserEmail() {
    return this.user && this.user.email;
  }



  // Local Security

  async clearOfflineKeysAndData(force = false) {
    // make sure user is authenticated before performing this step
    if(this.offlineKeys && !this.offlineKeys.mk && !force) {
      alert("Unable to remove passcode. Make sure you are properly authenticated and try again.");
      return false;
    }
    this.offlineKeys = null;
    this.offlineAuthParams = null;
    await Storage.get().removeItem(OfflineParamsKey);
    return this.persistKeysToKeychain();
  }

  async persistOfflineKeys(keys) {
    this.setOfflineKeys(keys);
    if(!this.passcodeTiming) {
      this.passcodeTiming = "on-quit";
    }
    return this.persistKeysToKeychain();
  }

  async setOfflineKeys(keys) {
    // offline keys are ephemeral and should not be stored anywhere
    this.offlineKeys = keys;

    // Check to see if encryptedAccountKeys need decrypting
    if(this.encryptedAccountKeys) {
      // Decrypt and set
      await SFJS.itemTransformer.decryptItem(this.encryptedAccountKeys, this.offlineKeys);
      // itemTransformer modifies in place. this.encryptedAccountKeys should now be decrypted
      let decryptedKeys = new SFItem(this.encryptedAccountKeys);
      if(decryptedKeys.errorDecrypting) {
        console.error("Fatal: Error decrypting account keys");
      } else {
        this.accountKeys = decryptedKeys.content.accountKeys;
        this.encryptedAccountKeys = null;
      }
    }
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

  static getDeviceBiometricsAvailability(callback) {
    let isAndroid = Platform.OS == "android";
    if(__DEV__) {
      if(isAndroid) {
        callback(true, "touch", "Fingerprint (Dev)");
      } else {
        callback(true, "face", "Face ID");
      }
      return;
    }
    FingerprintScanner.isSensorAvailable().then((type) => {
      var noun = (!type || type == "touch") ? "Fingerprint" : "Face ID";
      callback(true, type, noun);
    }).catch((error) => {
      callback(false);
    })
  }

}
