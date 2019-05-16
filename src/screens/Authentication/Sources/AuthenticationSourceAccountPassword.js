import SF from '@SFJS/sfjs'
import Storage from '@SFJS/storageManager'
import Auth from '@SFJS/authManager'
import KeysManager from '@Lib/keysManager'
import AuthenticationSource from "./AuthenticationSource"

export default class AuthenticationSourceAccountPassword extends AuthenticationSource {
  constructor() {
    super();
  }

  get sort() {
    return 1;
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
       case "did-fail":
        return "Invalid account password. Please try again."
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

    let success = await Auth.get().verifyAccountPassword(this.authenticationValue);
    if(success) {
      return this._success();
    } else {
      return this._fail("Invalid account password. Please try again.");
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
