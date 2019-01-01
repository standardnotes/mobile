import {AppState, Platform} from 'react-native'
import KeysManager from "@Lib/keysManager"
import OptionsState from "@Lib/OptionsState"
var pjson = require('../package.json')

export default class ApplicationState {

  // When the app first launches
  static Launching = "Launching";

  // When the app enters into multitasking view, or control/notification center for iOS
  static LosingFocus = "LosingFocus";

  // When the app enters the background completely
  static Backgrounding = "Backgrounding";

  // When the app resumes from the background
  static Resuming = "Resuming";

  // When the user enters their local passcode and/or fingerprint
  static Locking = "Locking";

  // When the user enters their local passcode and/or fingerprint
  static Unlocking = "Unlocking";

  static instance = null;
  static get() {
    if (this.instance == null) {
      this.instance = new ApplicationState();
    }

    return this.instance;
  }

  constructor() {
    this.observers = [];
    this.locked = true;
    this.previousEvents = [];
    this._isAndroid = Platform.OS === "android";

    this.initializeOptions();

    AppState.addEventListener('change', this.handleAppStateChange);
    this.didLaunch();
  }

  initializeOptions() {
    // Initialize Options (sort by, filter, selected tags, etc)
    this.optionsState = new OptionsState();
    this.optionsState.addChangeObserver((options) => {
      if(!this.loading) {
        options.persist();
      }
    });

    this.optionsState.loadSaved();
  }

  getOptions() {
    return this.optionsState;
  }

  static getOptions() {
    return this.get().getOptions();
  }

  static get isAndroid() {
    return this.get().isAndroid;
  }

  static get isIOS() {
    return this.get().isIOS;
  }

  static get version() {
    return this.isAndroid ? pjson.versionAndroid : pjson.versionIOS;
  }

  get isAndroid() {
    return this._isAndroid;
  }

  get isIOS() {
    return !this._isAndroid;
  }

  // Sent from App.js
  receiveApplicationStartEvent() {
    var authProps = this.getAuthenticationPropsForAppState(ApplicationState.Launching);
    if(!authProps.passcode && !authProps.fingerprint) {
      this.unlockApplication();
    }
  }

  handleAppStateChange = (nextAppState) => {

    if(this.ignoreStateChanges) {
      return;
    }

    var isResuming = nextAppState === "active";
    var isEnteringBackground = nextAppState == 'background';
    var isLosingFocus = nextAppState == 'inactive';

    // console.log("APP STATE CHANGE FROM", this.mostRecentState, "TO STATE", this.applicationStateForNativeState(nextAppState));

    if(isEnteringBackground) {
      this.didEnterBackground();
    }

    if(isResuming) {
      this.didResume();
    }

    if(isLosingFocus) {
      this.didLoseFocus();
    }
  }

  applicationStateForNativeState(nativeState) {
    if(nativeState == 'active') {
      return ApplicationState.Resuming;
    }

    if(nativeState == 'background') {
      return ApplicationState.Backgrounding;
    }

    if(nativeState == 'inactive') {
      return ApplicationState.LosingFocus;
    }
  }

  // An app cycle change are natural events like active, inactive, background,
  // while non-app cycle events are custom events like locking and unlocking

  isStateAppCycleChange(state) {
    return [
      ApplicationState.Launching,
      ApplicationState.LosingFocus,
      ApplicationState.Backgrounding,
      ApplicationState.Resuming
    ].includes(state);
  }



  /* State Changes */

  didLaunch() {
    this.notifyOfState(ApplicationState.Launching);
    this.mostRecentState = ApplicationState.Launching;
  }

  didLoseFocus() {
    this.notifyOfState(ApplicationState.LosingFocus);
    this.mostRecentState = ApplicationState.LosingFocus;

    if(this.shouldLockApplication()) {
      this.lockApplication();
    }
  }

  didEnterBackground() {
    this.notifyOfState(ApplicationState.Backgrounding);
    this.mostRecentState = ApplicationState.Backgrounding;

    if(this.shouldLockApplication()) {
      this.lockApplication();
    }
  }

  didResume() {
    this.notifyOfState(ApplicationState.Resuming);
    this.mostRecentState = ApplicationState.Resuming;
  }

  notifyOfState(state) {
    if(this.ignoreStateChanges) {return;}
    // console.log("ApplicationState notifying of state:", state);
    for(var observer of this.observers) {
      observer.callback(state);
    }

    this.previousEvents.push(state);
  }

  clearEventHistory() {
    this.previousEvents = [];
  }

  /* End State */


  /*
  Allows other parts of the code to perform external actions without triggering state change notifications.
  This is useful on Android when you present a share sheet and dont want immediate authentication to appear.
  */
  performActionWithoutStateChangeImpact(block) {
    this.ignoreStateChanges = true;
    block();
    setTimeout(() => {
      this.ignoreStateChanges = false;
    }, 350);
  }

  getMostRecentState() {
    return this.mostRecentState;
  }

  addStateObserver(callback) {
    var observer = {key: Math.random, callback: callback};
    this.observers.push(observer);

    for(var prevState of this.previousEvents) {
      callback(prevState);
    }

    return observer;
  }

  removeStateObserver(observer) {
    _.pull(this.observers, observer);
  }




  /* Locking / Unlocking */

  isLocked() {
    return this.locked;
  }

  isUnlocked() {
    return !this.locked;
  }

  shouldLockApplication() {
    var showPasscode = KeysManager.get().hasOfflinePasscode() && KeysManager.get().passcodeTiming == "immediately";
    var showFingerprint = KeysManager.get().hasFingerprint() && KeysManager.get().fingerprintTiming == "immediately";
    return showPasscode || showFingerprint;
  }

  lockApplication() {
    this.notifyOfState(ApplicationState.Locking);
    this.locked = true;
  }

  unlockApplication() {
    this.notifyOfState(ApplicationState.Unlocking);
    this.setAuthenticationInProgress(false);
    this.locked = false;
  }

  setAuthenticationInProgress(inProgress) {
    this.authenticationInProgress = inProgress;
  }

  isAuthenticationInProgress() {
    return this.authenticationInProgress;
  }

  getAuthenticationPropsForAppState(state) {
    if(state == ApplicationState.Unlocking || state == ApplicationState.Locking) {
      return {};
    }

    var hasPasscode = KeysManager.get().hasOfflinePasscode();
    var hasFingerprint = KeysManager.get().hasFingerprint();

    var showPasscode = hasPasscode, showFingerprint = hasFingerprint;

    if(state == ApplicationState.Backgrounding || state == ApplicationState.Resuming || state == ApplicationState.LosingFocus) {
      showPasscode = hasPasscode && KeysManager.get().passcodeTiming == "immediately";
      showFingerprint = hasFingerprint && KeysManager.get().fingerprintTiming == "immediately";
    }

    var title = showPasscode && showFingerprint ? "Authentication Required" : (showPasscode ? "Passcode Required" : "Fingerprint Required");

    return {
      title: title,
      passcode: showPasscode || false,
      fingerprint: showFingerprint || false,
      onAuthenticate: this.unlockApplication.bind(this)
    }
  }
}
