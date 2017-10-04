import {AppState} from 'react-native';
import App from "./app"
var _ = require('lodash');

export default class ApplicationState {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new ApplicationState();
    }

    return this.instance;
  }

  constructor() {
    this.observers = [];
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  handleAppStateChange = (nextAppState) => {

    this.nextAppState = nextAppState;

    var isEnteringForeground = nextAppState === "active"
      && (this.previousAppState == 'background' || this.previousAppState == 'inactive')
      && !this.isStartingApp;

    var isEnteringBackground;

    if(App.isIOS) {
      isEnteringBackground = ((nextAppState == 'inactive' && this.previousAppState == 'active')
        || (nextAppState == 'background' && this.previousAppState != 'inactive')) && !this.isStartingApp;
    } else if(App.isAndroid) {
      isEnteringBackground = nextAppState == 'background' && !this.isStartingApp;
    }

    console.log("APP STATE CHANGE FROM", this.previousAppState,
    "TO STATE", nextAppState,
    "IS STARTING APP:", this.isStartingApp,
    "IS ENTERING BACKGROUND", isEnteringBackground,
    "IS ENTERING FOREGROUND", isEnteringForeground,
    );

    // Hide screen content as we go to the background
    if(isEnteringBackground) {
      this.notifyOfState("background");
    }

    if(isEnteringForeground) {
      this.launchTemp = "warm";
      this.notifyOfState("foreground");
    }

    this.previousAppState = nextAppState;
  }

  setIsStartingApp(starting) {
    this.isStartingApp = starting;
  }

  setAuthenticationInProgress(inProgress) {
    this.authenticationInProgress = inProgress;
  }

  isAuthenticationInProgress() {
    return this.authenticationInProgress;
  }

  isWarmLaunch() {
    return this.launchTemp;
  }

  notifyOfState(state) {
    for(var observer of this.observers) {
      observer.callback(state);
    }
  }

  addStateObserver(callback) {
    var observer = {key: Math.random, callback: callback};
    this.observers.push(observer);
    return observer;
  }

  removeStateObserver(observer) {
    _.pull(this.observers, observer);
  }

}
