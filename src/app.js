/**
 * Standard Notes React Native App
 */

import {
  AppState,
  Platform,
  StatusBar
} from 'react-native';

import {Navigation} from 'react-native-navigation';
import {registerScreens} from './screens';

import KeysManager from './lib/keysManager'
import Auth from './lib/auth'
import GlobalStyles from "./Styles"
import Icons from "./Icons"
import OptionsState from "./OptionsState"

import { Client } from 'bugsnag-react-native';
var _ = require('lodash');

if(!__DEV__) {
  const bugsnag = new Client()
}

registerScreens();

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

    this.readyObservers = [];
    this.optionsState = new OptionsState();

    this._isAndroid = Platform.OS === "android";

    this.optionsState.addChangeObserver((options) => {
      if(!this.loading) {
        options.persist();
      }
    })

    this.signoutObserver = Auth.getInstance().addEventObserver([Auth.DidSignOutEvent, Auth.WillSignInEvent], function(event){
      if(event == Auth.DidSignOutEvent) {
        this.optionsState.reset();
      }
    }.bind(this));
  }

  static get isAndroid() {
    return this.get().isAndroid;
  }

  get isAndroid() {
    return this._isAndroid;
  }

  get isIOS() {
    return !this._isAndroid;
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

  handleAppStateChange = (nextAppState) => {
    console.log("handleAppStateChange|App.js", nextAppState, "starting app?", this.isStartingApp);
    if (nextAppState === "background" && !this.isStartingApp) {
      var showPasscode = KeysManager.get().hasOfflinePasscode() && KeysManager.get().passcodeTiming == "immediately";
      var showFingerprint = KeysManager.get().hasFingerprint() && KeysManager.get().fingerprintTiming == "immediately";
      if(showPasscode || showFingerprint) {
        this.beginAuthentication(showPasscode, showFingerprint);
      }
    }
  }

  get tabStyles() {
    var statusBarColor = GlobalStyles.constants().mainBackgroundColor;
    if(this.isAndroid) {
      statusBarColor = GlobalStyles.darken(GlobalStyles.constants().mainTintColor);
      // Android <= v22 does not support changing status bar text color. It will always be white
      // So we have to make sure background color has proper contrast
      if(Platform.Version <= 22) {
        statusBarColor = "black";
      }
    }
    var navBarColor = this.isAndroid ? GlobalStyles.constants().mainTintColor : GlobalStyles.constants().mainBackgroundColor;
    var navBarText = this.isAndroid ? GlobalStyles.constants().mainBackgroundColor : GlobalStyles.constants().mainTintColor;
    return {
      tabBarBackgroundColor: GlobalStyles.constants().mainBackgroundColor,
      tabBarTranslucent: true,
      tabBarButtonColor: 'gray',
      tabBarSelectedButtonColor: GlobalStyles.constants().mainTintColor,

      // navBarBlur: true,
      navBarButtonColor: navBarText,
      navBarTextColor: navBarText,
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
          var hasPasscode = KeysManager.get().hasOfflinePasscode();
          var hasFingerprint = KeysManager.get().hasFingerprint();
          this.beginAuthentication(hasPasscode, hasFingerprint);
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
    this.ready = true;
    this.readyObservers.forEach(function(observer){
      observer.callback();
    })
  }

  beginAuthentication(hasPasscode, hasFingerprint) {
    if(hasPasscode) {
      this.showPasscodeLock(function(){
        if(hasFingerprint) {
          this.showFingerprintScanner(this.applicationIsReady.bind(this));
        } else {
          this.applicationIsReady();
        }
      }.bind(this));
    } else if(hasFingerprint) {
      this.showFingerprintScanner(this.applicationIsReady.bind(this));
    } else {
      this.applicationIsReady();
    }
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
      animationType: 'slide-down',
      tabsStyle: _.clone(this.tabStyles), // for iOS
      appStyle: _.clone(this.tabStyles) // for Android
    })
  }

  showFingerprintScanner(onAuthenticate) {
    Navigation.showModal({
      screen: 'sn.Fingerprint',
      title: 'Fingerprint Required',
      backButtonHidden: true,
      overrideBackPress: true,
      passProps: {
        mode: "authenticate",
        onAuthenticateSuccess: onAuthenticate
      },
      animationType: 'slide-down',
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

      if(Platform.OS === "android") {
        tabs.forEach(function(tab){
          tab.icon = require("./img/placeholder.png")
        })
      }

      Navigation.startTabBasedApp(
        {
          tabs: tabs,
          animationType: this.isIOS ? 'slide-down' : 'fade',
          tabsStyle: _.clone(this.tabStyles), // for iOS
          appStyle: _.clone(this.tabStyles), // for Android
          drawer: drawer,
          animationType: 'none'
        }
      );
    } else {
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
