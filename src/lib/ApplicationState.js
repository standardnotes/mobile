import {AppState, Platform, NativeModules} from 'react-native'
const { PlatformConstants } = NativeModules;
import KeysManager from "@Lib/keysManager"
import OptionsState from "@Lib/OptionsState"
import AuthenticationSourceLocalPasscode from "@Screens/Authentication/Sources/AuthenticationSourceLocalPasscode";
import AuthenticationSourceFingerprint from "@Screens/Authentication/Sources/AuthenticationSourceFingerprint";
var pjson = require('../package.json')

export default class ApplicationState {

  // When the app first launches
  static Launching = "Launching";

  // When the app enters into multitasking view, or control/notification center for iOS
  static LosingFocus = "LosingFocus";

  // When the app enters the background completely
  static Backgrounding = "Backgrounding";

  // When the app resumes from either the background or from multitasking switcher or notification center
  static GainingFocus = "GainingFocus";

  // When the app resumes from the background
  static ResumingFromBackground = "ResumingFromBackground";

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

  get isTablet() {
    const deviceType = PlatformConstants.interfaceIdiom;
    return deviceType == "pad";
  }

  // Sent from App.js
  receiveApplicationStartEvent() {
    var authProps = this.getAuthenticationPropsForAppState(ApplicationState.Launching);
    if(authProps.sources.length == 0) {
      this.unlockApplication();
    }
  }

  handleAppStateChange = (nextAppState) => {

    if(this.ignoreStateChanges) {
      return;
    }

    // if the most recent state is not 'background' ('inactive'), then we're going
    // from inactive to active, which doesn't really happen unless you, say, swipe
    // notification center in iOS down then back up. We don't want to lock on this state change.
    var isResuming = nextAppState === "active";
    var isResumingFromBackground = isResuming && this.mostRecentState == ApplicationState.Backgrounding;
    var isEnteringBackground = nextAppState == 'background';
    var isLosingFocus = nextAppState == 'inactive';

    if(isEnteringBackground) {
      this.notifyOfState(ApplicationState.Backgrounding);
      this.mostRecentState = ApplicationState.Backgrounding;

      if(this.shouldLockApplication()) {
        this.lockApplication();
      }
    }

    if(isResumingFromBackground || isResuming) {
      if(isResumingFromBackground) {
        this.notifyOfState(ApplicationState.ResumingFromBackground);
        this.mostRecentState = ApplicationState.ResumingFromBackground;
      }

      // Notify of GainingFocus even if resuming from background
      this.notifyOfState(ApplicationState.GainingFocus);
      this.mostRecentState = ApplicationState.GainingFocus;
    }

    if(isLosingFocus) {
      this.notifyOfState(ApplicationState.LosingFocus);
      this.mostRecentState = ApplicationState.LosingFocus;

      if(this.shouldLockApplication()) {
        this.lockApplication();
      }
    }
  }

  // Visibility change events are like active, inactive, background,
  // while non-app cycle events are custom events like locking and unlocking

  isAppVisibilityChange(state) {
    return [
      ApplicationState.Launching,
      ApplicationState.LosingFocus,
      ApplicationState.Backgrounding,
      ApplicationState.GainingFocus,
      ApplicationState.ResumingFromBackground
    ].includes(state);
  }



  /* State Changes */

  didLaunch() {
    this.notifyOfState(ApplicationState.Launching);
    this.mostRecentState = ApplicationState.Launching;
  }

  notifyOfState(state) {
    if(this.ignoreStateChanges) {return;}
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
    // We don't want to do anything on gaining focus, since that may be called extraenously,
    // when you come back from notification center, etc. Any immediate locking should be handled
    // LosingFocus anyway.
    if(!this.isAppVisibilityChange(state) || state == ApplicationState.GainingFocus) {
      return {sources: []};
    }

    var hasPasscode = KeysManager.get().hasOfflinePasscode();
    var hasFingerprint = KeysManager.get().hasFingerprint();

    var showPasscode = hasPasscode, showFingerprint = hasFingerprint;

    if(
      state == ApplicationState.Backgrounding ||
      state == ApplicationState.ResumingFromBackground ||
      state == ApplicationState.LosingFocus
    ) {
      showPasscode = hasPasscode && KeysManager.get().passcodeTiming == "immediately";
      showFingerprint = hasFingerprint && KeysManager.get().fingerprintTiming == "immediately";
    }

    var title = showPasscode && showFingerprint ? "Authentication Required" : (showPasscode ? "Passcode Required" : "Fingerprint Required");

    let sources = [];
    if(showPasscode) { sources.push(new AuthenticationSourceLocalPasscode()); }
    if(showFingerprint) { sources.push(new AuthenticationSourceFingerprint()); }

    return {
      title: title,
      sources: sources,
      onAuthenticate: this.unlockApplication.bind(this)
    }
  }
}
