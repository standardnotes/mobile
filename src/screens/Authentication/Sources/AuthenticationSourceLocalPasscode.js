import SF from '@SFJS/sfjs'
import Storage from '@SFJS/storageManager'
import KeysManager from '@Lib/keysManager'
import AuthenticationSource from "./AuthenticationSource"

export default class AuthenticationSourceLocalPasscode extends AuthenticationSource {
  constructor() {
    super();

    Storage.get().getItem("passcodeKeyboardType").then((result) => {
      this.keyboardType = result || 'default';
      this.requiresInterfaceReload();
    });
  }

  get sort() {
    return 0;
  }

  get identifier() {
    return "local-passcode-auth-source";
  }

  get title() {
    return "Local Passcode";
  }

  get label() {
    switch (this.status) {
      case "waiting-turn":
      case "waiting-input":
        return "Enter your local passcode"
      case "processing":
        return "Verifying keys...";
      case "did-fail":
       return "Invalid local passcode. Please try again."
      case "did-succeed":
       return "Success | Local Passcode"
      default:
        return "Status not accounted for: " + this.status
    }
  }

  get type() {
    return "input";
  }

  get inputPlaceholder() {
    return "Local Passcode";
  }

  async authenticate() {
    this.didBegin();
    var authParams = KeysManager.get().offlineAuthParams;
    let keys = await SF.get().crypto.computeEncryptionKeysForUser(this.authenticationValue, authParams);
    if(keys.pw === KeysManager.get().offlinePasscodeHash()) {
      await KeysManager.get().setOfflineKeys(keys);
      return this._success();
    } else {
      return this._fail("Invalid local passcode. Please try again.");
    }
  }

  _success() {
    this.didSucceed();
    return {success: true};
  }

  _fail(message) {
    this.didFail();
    return {success: false, error: {message: message}};
  }
}
