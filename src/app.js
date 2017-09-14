/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  FlatList
} from 'react-native';
import {Platform} from 'react-native';

import {Navigation} from 'react-native-navigation';
import {registerScreens, registerScreenVisibilityListener} from './screens';

import Auth from './lib/auth'
import Sync from './lib/sync'
import KeysManager from './lib/keysManager'
import GlobalStyles from "./Styles"

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
registerScreenVisibilityListener();

export default class App {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new App();
    }

    return this.instance;
  }

  get tabStyles() {
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

      statusBarColor: GlobalStyles.constants().mainTextColor, // Android only

      screenBackgroundColor: GlobalStyles.constants().mainBackgroundColor
    }
  }

  start() {
    KeysManager.get().loadInitialData().then(function() {
      var hasPasscode = KeysManager.get().hasOfflinePasscode();
      var hasFingerprint = KeysManager.get().hasFingerprint();

      if(hasPasscode) {
        this.showPasscodeLock(function(){
          if(hasFingerprint) {
            this.showFingerprintScanner(startActualApp);
          } else {
            this.startActualApp();
          }
        }.bind(this));
      } else if(hasFingerprint) {
        this.showFingerprintScanner(startActualApp);
      } else {
        this.startActualApp();
      }
    }.bind(this))
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
    Navigation.startTabBasedApp({
      tabs: tabs,
      animationType: Platform.OS === 'ios' ? 'slide-down' : 'fade',
      tabsStyle: _.clone(this.tabStyles), // for iOS
      appStyle: _.clone(this.tabStyles) // for Android
    });
  }

  reload() {
    this.startActualApp();
  }
}
