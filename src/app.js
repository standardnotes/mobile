/**
 * Standard Notes React Native App
 */

import {
  AppState,
  Platform,
  StatusBar,
  BackHandler,
  DeviceEventEmitter,
  NativeModules
} from 'react-native';

import {Navigation, ScreenVisibilityListener} from 'react-native-navigation';
import {registerScreens} from './screens';

import KeysManager from './lib/keysManager'
import Auth from './lib/auth'
import ReviewManager from './lib/reviewManager';
import GlobalStyles from "./Styles"
import Icons from "./Icons"
import OptionsState from "./OptionsState"
var moment = require('moment/min/moment-with-locales.min.js');
import { Client } from 'bugsnag-react-native';
var _ = require('lodash');

if(__DEV__ === false) {
  const bugsnag = new Client()

  // Disable console.log for non-dev builds
  console.log = () => {};
}

registerScreens();

const COLD_LAUNCH_STATE = "COLD_LAUNCH_STATE";
const WARM_LAUNCH_STATE = "WARM_LAUNCH_STATE";

export default class App {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new App();
    }

    return this.instance;
  }

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
    KeysManager.get().registerAccountRelatedStorageKeys(["options"]);

    // required to initialize current app state to active since the observer is not called in time on initial app launch
    this.previousAppState = "active";

    this.readyObservers = [];
    this.lockStatusObservers = [];
    this._isAndroid = Platform.OS === "android";

    // Initialize iOS review manager. Will automatically handle requesting review logic.
    ReviewManager.initialize();

    // Configure Moment locale
    moment.locale(this.getLocale());

    // Initialize Options (sort by, filter, selected tags, etc)
    this.optionsState = new OptionsState();
    this.optionsState.addChangeObserver((options) => {
      if(!this.loading) {
        options.persist();
      }
    })

    // Screen visibility listener
    this.listener = new ScreenVisibilityListener({
      willAppear: ({screen, startTime, endTime, commandType}) => {
        // This handles authentication for the initial app launch. We wait for the Notes component to be ready
        // (meaning the app UI is ready), then present the authentication modal
        console.log("Screen will appear", screen);
        if(screen == "sn.Notes" && this.authenticationQueued) {
          this.authenticationQueued = false;
          this.handleAuthentication(this.queuedAuthenticationLaunchState);
          this.queuedAuthenticationLaunchState = null;
        }
      },

      didAppear: ({screen, startTime, endTime, commandType}) => {

      },

      didDisappear: ({screen, startTime, endTime, commandType}) => {
        if(screen == 'sn.Authenticate' && this.queueFingerprint) {
          this.queueFingerprint = false;
          this.showFingerprintScanner(this.applicationIsReady.bind(this));
        }
      },

      willDisappear: ({screen, startTime, endTime, commandType}) => {

      },
    });
    this.listener.register();

    // Listen to sign out event
    this.signoutObserver = Auth.getInstance().addEventObserver([Auth.DidSignOutEvent, Auth.WillSignInEvent], function(event){
      if(event == Auth.DidSignOutEvent) {
        this.optionsState.reset();
      }
    }.bind(this));
  }

  getLocale() {
    if (Platform.OS === 'android') {
      return NativeModules.I18nManager.localeIdentifier;
    } else {
      return NativeModules.SettingsManager.settings.AppleLocale;
    }
  }

  handleAppStateChange = (nextAppState) => {

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
    "IS ENTERING FOREGROUND", isEnteringForeground
    );

    // Hide screen content as we go to the background
    if(isEnteringBackground) {
      if(this.shouldLockContent()) {
        this.notifyLockStatusObserverOfLockState(true, null);
      }
    }

    // Handle authentication as we come back from the background
    if (isEnteringForeground && !this.authenticationInProgress) {
      this.handleAuthentication(WARM_LAUNCH_STATE);
    }

    this.previousAppState = nextAppState;
  }

  notifyLockStatusObserverOfLockState(lock, unlock) {
    this.lockStatusObservers.forEach(function(observer){
      observer.callback(lock, unlock);
    })
  }

  static get isAndroid() {
    return this.get().isAndroid;
  }

  static get isIOS() {
    return this.get().isIOS;
  }

  get isAndroid() {
    return this._isAndroid;
  }

  get isIOS() {
    return !this._isAndroid;
  }

  shouldLockContent() {
    var showPasscode = KeysManager.get().hasOfflinePasscode() && KeysManager.get().passcodeTiming == "immediately";
    var showFingerprint = KeysManager.get().hasFingerprint() && KeysManager.get().fingerprintTiming == "immediately";
    return showPasscode || showFingerprint;
  }

  addLockStatusObserver(callback) {
    var observer = {key: Math.random, callback: callback};
    this.lockStatusObservers.push(observer);
    return observer;
  }

  removeLockStatusObserver(observer) {
    _.pull(this.lockStatusObservers, observer);
  }

  addApplicationReadyObserver(callback) {
    var observer = {key: Math.random, callback: callback};
    this.readyObservers.push(observer);

    // Sometimes an observer could be added after the application is already ready, in which case we call it immediately
    if(this.ready) {
      callback();
    }

    return observer;
  }

  removeApplicationReadyObserver(observer) {
    _.pull(this.readyObservers, observer);
  }

  globalOptions() {
    return this.optionsState;
  }

  get tabStyles() {
    var navBarColor = GlobalStyles.constantForKey("navBarColor");
    var navBarTextColor = GlobalStyles.constantForKey("navBarTextColor");
    var statusBarColor = GlobalStyles.constants().mainBackgroundColor;

    if(this.isAndroid) {
      statusBarColor = GlobalStyles.darken(navBarColor);
      // Android <= v22 does not support changing status bar text color. It will always be white
      // So we have to make sure background color has proper contrast
      if(Platform.Version <= 22) {
        statusBarColor = "black";
      }
    }

    return {
      tabBarBackgroundColor: GlobalStyles.constants().mainBackgroundColor,
      tabBarTranslucent: true,
      tabBarButtonColor: 'gray',
      tabBarSelectedButtonColor: GlobalStyles.constants().mainTintColor,

      // navBarBlur: true,
      navBarButtonColor: navBarTextColor,
      navBarTextColor: navBarTextColor,
      navigationBarColor: 'black', // android built in bar
      navBarBackgroundColor: navBarColor, // actual top nav bar

      statusBarColor: statusBarColor, // Android only
      statusBarTextColorScheme: 'dark',
      statusBarTextColorSchemeSingleScreen: 'dark',
      topBarElevationShadowEnabled: true,

      screenBackgroundColor: GlobalStyles.constants().mainBackgroundColor
    }
  }

  start() {
    this.loading = true;
    GlobalStyles.get().resolveInitialTheme().then(function(){
      Promise.all([
        Icons.get().loadIcons(),
        KeysManager.get().loadInitialData(),
        this.optionsState.loadSaved()
      ]).then(function(){
        this.loading = false;
        var run = () => {
          this.startApp();
          var handled = this.handleAuthentication(COLD_LAUNCH_STATE, true);
          if(!handled) {
            this.applicationIsReady();
          }
        }
        if(KeysManager.get().isFirstRun()) {
          KeysManager.get().handleFirstRun().then(run);
        } else {
          run();
        }
      }.bind(this))
    }.bind(this))
  }

  applicationIsReady() {
    console.log("===Emitting Application Ready===");
    this.authenticationInProgress = false;
    this.ready = true;
    this.readyObservers.forEach(function(observer){
      observer.callback();
    })

    this.notifyLockStatusObserverOfLockState(null, true);
  }

  handleAuthentication(fromState, queue = false) {
    var hasPasscode = KeysManager.get().hasOfflinePasscode();
    var hasFingerprint = KeysManager.get().hasFingerprint();

    var showPasscode, showFingerprint;

    if(fromState == COLD_LAUNCH_STATE) {
      showPasscode = hasPasscode;
      showFingerprint = hasFingerprint;
    } else if(fromState == WARM_LAUNCH_STATE) {
      showPasscode = hasPasscode && KeysManager.get().passcodeTiming == "immediately";
      showFingerprint = hasFingerprint && KeysManager.get().fingerprintTiming == "immediately";
    }

    if(!showPasscode && !showFingerprint) {
      return false;
    }

    if(queue) {
      this.authenticationQueued = true;
      this.queuedAuthenticationLaunchState = fromState;
      return true;
    }

    this.authenticationInProgress = true;

    if(showPasscode) {
      this.showPasscodeLock(function(){
        if(showFingerprint) {
          // wait for passcode modal dismissal.
          this.queueFingerprint = true;
        } else {
          this.applicationIsReady();
        }
      }.bind(this));
    } else if(showFingerprint) {
      this.showFingerprintScanner(this.applicationIsReady.bind(this));
    } else {
      this.applicationIsReady();
    }

    return true;
  }

  showPasscodeLock(onAuthenticate) {
    Navigation.showModal({
      screen: 'sn.Authenticate',
      title: 'Passcode Required',
      backButtonHidden: true,
      overrideBackPress: true,
      passProps: {
        mode: "authenticate",
        onAuthenticateSuccess: onAuthenticate
      },
      animationType: 'slide-up',
      tabsStyle: _.clone(this.tabStyles), // for iOS
      appStyle: _.clone(this.tabStyles) // for Android
    })
  }

  showFingerprintScanner(onAuthenticate) {
    console.log("Showing Fingerprint");
    Navigation.showModal({
      screen: 'sn.Fingerprint',
      title: 'Fingerprint Required',
      backButtonHidden: true,
      overrideBackPress: true,
      passProps: {
        mode: "authenticate",
        onAuthenticateSuccess: onAuthenticate
      },
      animationType: 'slide-up',
      tabsStyle: _.clone(this.tabStyles), // for iOS
      appStyle: _.clone(this.tabStyles) // for Android
    })
  }

  startApp() {
    console.log("===Starting App===");
    // On Android, calling Navigation.startSingleScreenApp first (for authentication), then calling
    // Navigation.startTabBasedApp will trigger an AppState change from active to background to active again.
    // Since if fingerprint/passcode lock is enabled we present the auth screens when the app switches to background,
    // if we don't catch this edge case, it will result in infinite recursion. So as `startApp` is called
    // immediately before this transition, setting isStartingApp to true then false afterwards will prevent the infinite
    // recursion
    this.isStartingApp = true;

    if(this.isIOS) {
      let tabs = [{
        label: 'Notes',
        screen: 'sn.Notes',
        title: 'Notes',
      },
      {
        label: 'Account',
        screen: 'sn.Account',
        title: 'Account',
        }
      ];

      Navigation.startTabBasedApp(
        {
          tabs: tabs,
          animationType: this.isIOS ? 'slide-down' : 'fade',
          tabsStyle: _.clone(this.tabStyles), // for iOS
          appStyle: _.clone(this.tabStyles), // for Android
          animationType: 'none'
        }
      );
    } else {
      let drawer = {
        left: {
          screen: 'sn.Filter',
          passProps: {
            singleSelectMode: true,
            options: JSON.stringify(this.optionsState),
            onOptionsChange: (options) => {
              this.optionsState.mergeWith(options);
            }
          }
        },
        disableOpenGesture: false
      };

      Navigation.startSingleScreenApp(
        {
          screen: {
            label: 'Notes',
            screen: 'sn.Notes',
            title: 'Notes',
          },
          tabsStyle: _.clone(this.tabStyles), // for iOS
          appStyle: _.clone(this.tabStyles), // for Android
          drawer: drawer,
          animationType: 'none'
        }
      );
    }

    setTimeout(function () {
      this.isStartingApp = false;
    }.bind(this), 1500);
  }

  reload() {
    Icons.get().loadIcons();
    this.startApp();
  }
}

export {moment}
