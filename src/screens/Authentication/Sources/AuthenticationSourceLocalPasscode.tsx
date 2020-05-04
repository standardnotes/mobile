import KeysManager from '@Lib/keysManager';
import { protocolManager } from 'snjs';
import Storage from '@Lib/snjs/storageManager';
import AuthenticationSource from '@Screens/Authentication/Sources/AuthenticationSource';
import StyleKit from '@Style/StyleKit';

export default class AuthenticationSourceLocalPasscode extends AuthenticationSource {
  keyboardType: string = 'default';
  constructor() {
    super();

    Storage.get()
      .getItem('passcodeKeyboardType')
      .then((result) => {
        this.keyboardType = result || 'default';
        this.requiresInterfaceReload();
      });
  }

  get headerButtonText() {
    return this.isWaitingForInput() && 'Change Keyboard';
  }

  get headerButtonStyles() {
    return {
      color: StyleKit.variables.stylekitNeutralColor,
      fontSize: StyleKit.constants.mainTextFontSize - 5
    };
  }

  headerButtonAction = () => {
    if (this.keyboardType === 'default') {
      this.keyboardType = 'numeric';
    } else {
      this.keyboardType = 'default';
    }

    this.requiresInterfaceReload();
  };

  get sort() {
    return 0;
  }

  get identifier() {
    return 'local-passcode-auth-source';
  }

  get title() {
    return 'Local Passcode';
  }

  get label() {
    switch (this.status) {
      case 'waiting-turn':
      case 'waiting-input':
        return 'Enter your local passcode';
      case 'processing':
        return 'Verifying keys...';
      case 'did-fail':
        return 'Invalid local passcode. Please try again.';
      case 'did-succeed':
        return 'Success | Local Passcode';
      default:
        return 'Status not accounted for: ' + this.status;
    }
  }

  get type() {
    return 'input';
  }

  get inputPlaceholder() {
    return 'Local Passcode';
  }

  async authenticate() {
    this.didBegin();
    const authParams = KeysManager.get().offlineAuthParams;
    const keys = await protocolManager.computeEncryptionKeysForUser(
      this.authenticationValue,
      authParams
    );
    if (keys.pw === KeysManager.get().offlinePasscodeHash()) {
      await KeysManager.get().setOfflineKeys(keys);
      return this._success();
    } else {
      return this._fail('Invalid local passcode. Please try again.');
    }
  }

  _success() {
    this.didSucceed();
    return { success: true };
  }

  _fail(message: string) {
    this.didFail();
    return { success: false, error: { message: message } };
  }
}
