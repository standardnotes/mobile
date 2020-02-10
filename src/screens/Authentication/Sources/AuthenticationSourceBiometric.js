import { Platform } from 'react-native';
import FingerprintScanner from 'react-native-fingerprint-scanner';
import KeysManager from '@Lib/keysManager';
import AuthenticationSource from '@Screens/Authentication/Sources/AuthenticationSource';

export default class AuthenticationSourceBiometric extends AuthenticationSource {
  constructor() {
    super();
  }

  initializeForInterface() {
    super.initializeForInterface();

    KeysManager.getDeviceBiometricsAvailability((available, type, noun) => {
      this.isReady = true;
      this.isAvailable = available;
      this.biometricsType = type;
      this.biometricsNoun = noun;
      this.requiresInterfaceReload();
    });
  }

  get sort() {
    return 2;
  }

  get identifier() {
    return 'biometric-auth-source';
  }

  get type() {
    return 'biometric';
  }

  get title() {
    return this.biometricsType || 'Biometrics';
  }

  get isFingerprint() {
    return (
      this.biometricsType === 'Touch ID' ||
      this.biometricsType === 'Fingerprint'
    );
  }
  get isFace() {
    return this.biometricsType === 'Face ID';
  }

  get label() {
    /** Android X doesn't provide an exact type */
    let noun = 'face or fingerprint';
    if (this.isFingerprint) {
      noun = 'fingerprint';
    } else if (this.isFace) {
      noun = 'face';
    }

    switch (this.status) {
      case 'waiting-turn':
      case 'waiting-input':
        return `Please scan your ${noun}`;
      case 'processing':
        return `Waiting for ${this.biometricsNoun}`;
      case 'did-succeed':
        return `Success | ${this.biometricsNoun}`;
      case 'did-fail':
        return `${this.biometricsNoun} failed. Tap to try again.`;
      case 'locked':
        return `${this.biometricsNoun} locked. Try again in 30 seconds.`;
      default:
        return 'Status not accounted for';
    }
  }

  setWaitingForInput() {
    if (this.status !== 'processing') {
      this.authenticate();
    }
  }

  async authenticate() {
    if (this.isReady && !this.isAvailable) {
      this.didFail();
      return {
        success: false,
        error: {
          message: 'This device either does not have a biometric sensor or it may not configured.'
        }
      };
    }

    this.didBegin();

    if (Platform.OS === 'android') {
      return FingerprintScanner.authenticate({
        deviceCredentialAllowed: true,
        description: 'Biometrics are required to access your notes.'
      })
        .then(() => {
          return this._success();
        })
        .catch(error => {
          console.log('Biometrics error', error);

          if (error.name === 'DeviceLocked') {
            this.setLocked();
            FingerprintScanner.release();
            return this._fail(
              'Authentication failed. Wait 30 seconds to try again.'
            );
          } else {
            return this._fail('Authentication failed. Tap to try again.');
          }
        });
    } else {
      // iOS
      return FingerprintScanner.authenticate({
        fallbackEnabled: true,
        description: 'This is required to access your notes.'
      })
        .then(() => {
          return this._success();
        })
        .catch(error => {
          if (error.name === 'UserCancel') {
            return this._fail();
          } else {
            return this._fail('Authentication failed. Tap to try again.');
          }
        });
    }
  }

  cancel() {
    FingerprintScanner.release();
    this.status = 'waiting-turn';
  }

  _success() {
    this.didSucceed();
    FingerprintScanner.release();
    return { success: true };
  }

  _fail(message) {
    if (!this.isLocked()) {
      this.didFail();
    }
    return { success: false, error: { message: message } };
  }
}
