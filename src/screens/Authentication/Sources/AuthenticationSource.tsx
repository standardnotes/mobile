import { TextInput } from 'react-native';

const DEFAULT_LOCK_TIMEOUT = 30 * 1000;

export default class AuthenticationSource {
  status:
    | 'waiting-input'
    | 'locked'
    | 'processing'
    | 'waiting-turn'
    | 'did-fail'
    | 'did-succeed';
  authenticationValue?: string;
  onRequiresInterfaceReload?: () => void;
  inputRef: TextInput | null = null;
  constructor() {
    this.status = 'waiting-turn';
  }

  initializeForInterface() {
    /**
     * Sometimes a source object may be created with no intention of displaying
     * it (perhaps to read its would-be properties) if initializeForInterface,
     * it means it will be actually displayed, so the source should get ready
     * to be displayed in the UI.
     * e.g, to determine whether a biometric is face or fingerprint
     */
  }

  get identifier() {
    return 'auth-source';
  }

  get label() {
    return 'Not Configured';
  }

  get lockTimeout() {
    return DEFAULT_LOCK_TIMEOUT;
  }

  setLocked() {
    this.status = 'locked';
  }

  setWaitingForInput() {
    this.status = 'waiting-input';
  }

  didBegin() {
    this.status = 'processing';
  }

  didSucceed() {
    this.status = 'did-succeed';
  }

  didFail() {
    this.status = 'did-fail';
  }

  isLocked() {
    return this.status === 'locked';
  }

  isWaitingForInput() {
    return this.status === 'waiting-input';
  }

  isInSuccessState() {
    return this.status === 'did-succeed';
  }

  isAuthenticating() {
    return this.status === 'processing';
  }

  setAuthenticationValue(value: string) {
    this.authenticationValue = value;
  }

  getAuthenticationValue() {
    return this.authenticationValue;
  }

  async authenticate(): Promise<any> {}

  cancel() {}

  requiresInterfaceReload() {
    this.onRequiresInterfaceReload && this.onRequiresInterfaceReload();
  }
}
