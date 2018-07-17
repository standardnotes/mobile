/**
 * Standard Notes React Native App
 */

import React, { Component } from 'react';
import {AppState, Platform, StatusBar, BackHandler, DeviceEventEmitter, NativeModules} from 'react-native';

import {Navigation, ScreenVisibilityListener} from 'react-native-navigation';
import {registerScreens} from './screens';

import KeysManager from './lib/keysManager'
import Auth from './lib/sfjs/authManager'
import ModelManager from './lib/sfjs/modelManager'
import Sync from './lib/sfjs/syncManager'
import Storage from './lib/sfjs/storageManager'
import ReviewManager from './lib/reviewManager';
import GlobalStyles from "./Styles"
import Icons from "./Icons"
import OptionsState from "./OptionsState"
import { Client } from 'bugsnag-react-native';
import Authenticate from "./screens/Authenticate";
var moment = require('moment/min/moment-with-locales.min.js');
var pjson = require('../package.json');
import ApplicationState from "./ApplicationState";

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
    KeysManager.get().registerAccountRelatedStorageKeys(["options"]);

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
        this._currentScreen = screen;
      },
    });

    this.listener.register();

    // Listen to sign out event
    this.signoutObserver = Auth.get().addEventHandler((event) => {
      if(event == SFAuthManager.DidSignOutEvent) {
        this.optionsState.reset();
        Storage.get().clearAllModels();
        KeysManager.get().clearAccountKeysAndData();
        ModelManager.get().handleSignout();
        Sync.get().handleSignout();
      }
    });

  }

  currentScreen() {
    return this._currentScreen;
  }

  getLocale() {
    if (Platform.OS === 'android') {
      return NativeModules.I18nManager.localeIdentifier;
    } else {
      return NativeModules.SettingsManager.settings.AppleLocale;
    }
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
          ApplicationState.get().receiveApplicationStartEvent();
        }
        if(KeysManager.get().isFirstRun()) {
          KeysManager.get().handleFirstRun().then(run);
        } else {
          run();
        }
      }.bind(this))
    }.bind(this))
  }

  startApp(options = {}) {
    console.log("===Starting App===");

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
  }

  reload() {
    ApplicationState.get().setThemeChangeBegan();

    Icons.get().loadIcons();

    // reset search box
    this.optionsState.setSearchTerm(null);

    this.startApp();

    setTimeout(function () {
      ApplicationState.get().setThemeChangeEnded();
    }, 100);
  }
}

export {moment}
