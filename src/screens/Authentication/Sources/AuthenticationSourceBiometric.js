import FingerprintScanner from 'react-native-fingerprint-scanner'
import ApplicationState from "@Lib/ApplicationState"
import AuthenticationSource from "./AuthenticationSource"
import KeysManager from "@Lib/keysManager"

export default class AuthenticationSourceBiometric extends AuthenticationSource {
  constructor() {
    super();
  }

  initializeForInterface() {
    super.initializeForInterface();

    KeysManager.getDeviceBiometricsAvailability((available, type, noun) => {
      this.biometricsType = type;
      this.biometricsNoun = noun;
      this.requiresInterfaceReload();
    })
  }

  get identifier() {
    return "biometric-auth-source";
  }

  get type() {
    return "biometric";
  }

  get title() {
    return this.isFace ? "Face ID" : "Fingerprint";
  }

  get isFace() {
    return this.biometricsType == "face";
  }

  get label() {
    switch (this.status) {
      case "waiting-turn":
      case "waiting-input":
        return `Please scan your ${this.isFace ? "face" : "fingerprint"}`
      case "processing":
        return `Waiting for ${this.isFace ? "Face ID" : "Fingerprint"}`;
      case "did-succeed":
       return `Success | ${this.isFace ? "Face ID" : "Fingerprint"}`
      case "did-fail":
        return "Fingerprint failed. Tap to try again.";
      default:
        return "Status not accounted for"
    }
  }

  setWaitingForInput() {
    if(this.status != "processing") {
      this.authenticate();
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
        console.log("Fingerprint error", error);
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

  cancel() {
    FingerprintScanner.release();
    this.status = "waiting-turn";
  }

  _success() {
    this.didSucceed();
    FingerprintScanner.release();
    return {success: true};
  }

  _fail(message) {
    this.didFail();
    // FingerprintScanner.release();
    return {success: false, error: {message: message}};
  }
}
