export default class AuthenticationSource {
  constructor() {
    this.status = "waiting";
  }

  get identifier() {
    return "auth-source";
  }

  get label() {
    return "Not Configured";
  }

  didBegin() {
    this.status = "did-begin";
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
