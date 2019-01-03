import SF from '@SFJS/sfjs'
import Storage from '@SFJS/storageManager'
import KeysManager from '@Lib/keysManager'
import AuthenticationSource from "./AuthenticationSource"

export default class AuthenticationSourceAccountPassword extends AuthenticationSource {
  constructor() {
    super();
  }

  get identifier() {
    return "account-password-auth-source";
  }

  get title() {
    return "Account Password";
  }

  get label() {
    switch (this.status) {
      case "waiting-turn":
      case "waiting-input":
        return "Enter your account password"
      case "processing":
        return "Verifying keys...";
        case "did-succeed":
         return "Success | Account Password"
      default:
        return "Status not accounted for: " + this.status
    }
  }

  get type() {
    return "input";
  }

  get inputPlaceholder() {
    return "Account Password";
  }

  async authenticate() {
    this.didBegin();

    // TODO
    return this._success();
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
