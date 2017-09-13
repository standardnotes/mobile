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

import GlobalStyles from "./Styles"

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


  start() {
    var tabStyles = {
      tabBarBackgroundColor: GlobalStyles.constants().mainBackgroundColor,
      tabBarButtonColor: 'gray',
      tabBarSelectedButtonColor: GlobalStyles.constants().mainTintColor,
      statusBarColor: 'black',
      tabFontFamily: 'BioRhyme-Bold',
      navBarButtonColor: GlobalStyles.constants().mainTintColor,
      navBarTextColor: GlobalStyles.constants().mainTintColor,
      navigationBarColor: 'black', // android built in bar
      navBarBackgroundColor: GlobalStyles.constants().mainBackgroundColor, // actual top nav bar
      statusBarColor: '#002b4c',
      screenBackgroundColor: GlobalStyles.constants().mainBackgroundColor
    };

    Navigation.startTabBasedApp({
      tabs: tabs,
      animationType: Platform.OS === 'ios' ? 'slide-down' : 'fade',
      tabsStyle: tabStyles, // for iOS
      appStyle: tabStyles // for Android
    });
  }

  reload() {
    this.start();
  }
}
