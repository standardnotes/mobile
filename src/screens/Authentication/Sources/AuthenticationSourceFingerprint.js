import FingerprintScanner from 'react-native-fingerprint-scanner'
import ApplicationState from "@Lib/ApplicationState"
import AuthenticationSource from "./AuthenticationSource"

export default class AuthenticationSourceFingerprint extends AuthenticationSource {
  constructor() {
    super();
  }

  get identifier() {
    return "fingerprint-auth-source";
  }

  get type() {
    return "biometric";
  }

  get title() {
    return "Fingerprint";
  }

  get label() {
    switch (this.status) {
      case "waiting-turn":
      case "waiting-input":
        return "Please scan your fingerprint"
      case "processing":
        return "Waiting for Fingerprint";
      case "did-succeed":
       return "Success | Fingerprint"
      default:
        return "Status not accounted for"
    }
  }

  async authenticate() {
    this.didBegin();

    if(ApplicationState.isAndroid) {
      return FingerprintScanner.authenticate({
        // onAttempt: this.handleInvalidAttempt
      }).then(() => {
        return this._success();
      })
      .catch((error) => {
        return this._fail("Authentication failed. Tap to try again.");
      });
    } else {
      // iOS
      return FingerprintScanner.authenticate({
        fallbackEnabled: true,
        description: 'Fingerprint is required to access your notes.' })
        .then(() => {
          return this._success();
        })
        .catch((error) => {
          if(error.name == "UserCancel") {
            return this._fail();
          } else {
            return this._fail("Authentication failed. Tap to try again.");
          }
        }
      );
    }
  }

  _success() {
    this.didSucceed();
    FingerprintScanner.release();
    return {success: true};
  }

  _fail(message) {
    this.didFail();
    return {success: false, error: {message: message}};
    FingerprintScanner.release();
  }
}
