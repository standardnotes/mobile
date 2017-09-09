/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  StatusBar,
  Text,
  View,
  FlatList
} from 'react-native';
import {Platform} from 'react-native';

StatusBar.setBarStyle('dark-content', true);

import {Navigation} from 'react-native-navigation';
import {registerScreens, registerScreenVisibilityListener} from './screens';
import {iconsMap, iconsLoaded} from './Icons';

import Auth from './lib/auth'
import Sync from './lib/sync'

import GlobalStyles from "./Styles"

registerScreens();
registerScreenVisibilityListener();

iconsLoaded.then(() => {
  startApp();
});

function startApp() {
  const tabs = [{
    label: 'Notes',
    screen: 'sn.Notes',
    icon: iconsMap['ios-menu-outline'],
    title: 'Notes',
  },
  {
    label: 'Account',
    screen: 'sn.Account',
    icon: iconsMap['ios-contact-outline'],
    title: 'Account',
    }
  ];

  Navigation.startTabBasedApp({
    tabs,
    animationType: Platform.OS === 'ios' ? 'slide-down' : 'fade',

    tabsStyle: {
      tabBarBackgroundColor: GlobalStyles.constants.mainBackgroundColor,
      tabBarButtonColor: 'gray',
      tabBarSelectedButtonColor: GlobalStyles.constants.mainTintColor,
      statusBarColor: 'black',
      tabFontFamily: 'BioRhyme-Bold',
    },

    appStyle: {
      navBarButtonColor: GlobalStyles.constants.mainTintColor,
      navBarTextColor: GlobalStyles.constants.mainTintColor,
      navigationBarColor: 'black', // android built in bar
      navBarBackgroundColor: GlobalStyles.constants.mainBackgroundColor, // actual top nav bar
      statusBarColor: '#002b4c',
    },
  });
}
