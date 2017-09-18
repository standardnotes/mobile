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
import GlobalStyles from "./Styles"
import Icons from "./Icons"

var _ = require('lodash');

const tabs = [{
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

// android will fail to load if icon is not specified here
if(Platform.OS === "android") {
  tabs.forEach(function(tab){
    tab.icon = require("./img/placeholder.png")
  })
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
    if(Platform.OS === "android" && Platform.Version <= 22) {
      // Android <= v22 does not support changing status bar text color. It will always be white
      // So we have to make sure background color has proper contrast
      statusBarColor = "black";
    }
    return {
      tabBarBackgroundColor: GlobalStyles.constants().mainBackgroundColor,
      tabBarTranslucent: true,
      tabBarButtonColor: 'gray',
      tabBarSelectedButtonColor: GlobalStyles.constants().mainTintColor,

      // navBarBlur: true,
      navBarButtonColor: GlobalStyles.constants().mainTintColor,
      navBarTextColor: GlobalStyles.constants().mainTintColor,
      navigationBarColor: 'black', // android built in bar
      navBarBackgroundColor: GlobalStyles.constants().mainBackgroundColor, // actual top nav bar

      statusBarColor: statusBarColor, // Android only
      statusBarTextColorScheme: 'dark',
      statusBarTextColorSchemeSingleScreen: 'dark',

      screenBackgroundColor: GlobalStyles.constants().mainBackgroundColor
    }
  }

  start() {
    GlobalStyles.get().resolveInitialTheme().then(function(){
      Promise.all([
        Icons.get().loadIcons(),
        KeysManager.get().loadInitialData()
      ]).then(function(){
        var run = () => {
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

  beginAuthentication(hasPasscode, hasFingerprint) {
    if(hasPasscode) {
      this.showPasscodeLock(function(){
        if(hasFingerprint) {
          this.showFingerprintScanner(this.startActualApp.bind(this));
        } else {
          this.startActualApp();
        }
      }.bind(this));
    } else if(hasFingerprint) {
      this.showFingerprintScanner(this.startActualApp.bind(this));
    } else {
      this.startActualApp();
    }
  }

  showPasscodeLock(onAuthenticate) {
    Navigation.startSingleScreenApp({
      screen: {
        screen: 'sn.Authenticate',
        title: 'Passcode Required',
        backButtonHidden: true,
        overrideBackPress: true,
      },
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
    Navigation.startSingleScreenApp({
      screen: {
        screen: 'sn.Fingerprint',
        title: 'Fingerprint Required',
        backButtonHidden: true,
        overrideBackPress: true,
      },
      passProps: {
        mode: "authenticate",
        onAuthenticateSuccess: onAuthenticate
      },
      animationType: 'slide-down',
      tabsStyle: _.clone(this.tabStyles), // for iOS
      appStyle: _.clone(this.tabStyles) // for Android
    })
  }

  startActualApp() {
    // On Android, calling Navigation.startSingleScreenApp first (for authentication), then calling
    // Navigation.startTabBasedApp will trigger an AppState change from active to background to active again.
    // Since if fingerprint/passcode lock is enabled we present the auth screens when the app switches to background,
    // if we don't catch this edge case, it will result in infinite recursion. So as `startActualApp` is called
    // immediately before this transition, setting isStartingApp to true then false afterwards will prevent the infinite
    // recursion

    this.isStartingApp = true;
    Navigation.startTabBasedApp({
      tabs: tabs,
      animationType: Platform.OS === 'ios' ? 'slide-down' : 'fade',
      tabsStyle: _.clone(this.tabStyles), // for iOS
      appStyle: _.clone(this.tabStyles) // for Android
    });

    setTimeout(function () {
      this.isStartingApp = false;
    }.bind(this), 1500);
  }

  reload() {
    Icons.get().loadIcons();
    this.startActualApp();
  }
}
