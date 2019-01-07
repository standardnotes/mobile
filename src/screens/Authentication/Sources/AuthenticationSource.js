export default class AuthenticationSource {
  constructor() {
    this.status = "waiting-turn";
  }

  initializeForInterface() {
    // Sometimes a source object may be created with no intention of displaying it (perhaps to read its would-be properties)
    // if initializeForInterface, it means it will be actually displayed, so the source should get ready to be displayed in the UI
    // e.g, to determine whether a biometric is face or fingerprint
  }

  get identifier() {
    return "auth-source";
  }

  get label() {
    return "Not Configured";
  }

  setWaitingForInput() {
    this.status = "waiting-input";
  }

  didBegin() {
    this.status = "processing";
  }

  didSucceed() {
    this.status = "did-succeed";
  }

  didFail() {
    this.status = "did-fail";
  }

  isInSuccessState() {
    return this.status == "did-succeed";
  }

  setAuthenticationValue(value) {
    this.authenticationValue = value;
  }

  getAuthenticationValue(value) {
    return this.authenticationValue;
  }

  async authenticate() {

  }

  requiresInterfaceReload() {
    this.onRequiresInterfaceReload && this.onRequiresInterfaceReload();
  }
}
