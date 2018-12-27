/**
 * Standard Notes React Native App
 */

import React, { Component } from 'react';
import {AppState, Platform, StatusBar, BackHandler, DeviceEventEmitter, NativeModules} from 'react-native';

import {registerScreens} from './screens';

import GlobalStyles from "./Styles"
import Icons from "./Icons"
import OptionsState from "./OptionsState"
import { Client } from 'bugsnag-react-native';
import Authenticate from "./screens/Authenticate";
var pjson = require('../package.json');
import ApplicationState from "./ApplicationState";

import { createStackNavigator, createAppContainer } from "react-navigation";

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

    let startApp = () => {
      this.startApp();
      ApplicationState.get().receiveApplicationStartEvent();
    }

    Navigation.events().registerAppLaunchedListener(() => {
      this.appLaunched = true;
      if(this.startAppOnLaunch) {
        startApp();
      }
    });

    this.loading = true;
    GlobalStyles.get().resolveInitialTheme().then(function(){
      Promise.all([
        Icons.get().loadIcons(),
        KeysManager.get().loadInitialData(),
        this.optionsState.loadSaved()
      ]).then(function(){
        this.loading = false;
        var run = () => {
          if(this.appLaunched) {
            startApp();
          } else {
            this.startAppOnLaunch = true;
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

  startApp(options = {}) {
    console.log("===Starting App===");

    Navigation.setDefaultOptions({
      bottomTabs: {
        visible: true,
        animate: false, // Controls whether BottomTabs visibility changes should be animated
        drawBehind: true,
        backgroundColor: GlobalStyles.constants().mainBackgroundColor
      },
      bottomTab: {
        iconColor: GlobalStyles.constants().mainDimColor,
        selectedIconColor: GlobalStyles.constants().mainTintColor,
        textColor: GlobalStyles.constants().mainDimColor,
        selectedTextColor: GlobalStyles.constants().mainTintColor
      },
    });

    if(this.isIOS) {
      Navigation.setRoot({
        root: {
          bottomTabs: {
            id: 'MainTabBar',
            children: [{
              stack: {
                children: [{
                  component: {
                    name: 'sn.Notes',
                    options: {
                      bottomTab: {
                        text: 'Notes',
                        icon: Icons.getIcon('ios-menu-outline')
                      },
                      topBar: {
                        title: {
                          text: "Notes",
                        }
                      }
                    }
                  }
                }]
              }
            },
            {
              stack: {
                children: [{
                  component: {
                    name: 'sn.Account',
                    options: {
                      bottomTab: {
                        text: 'Account',
                        icon: Icons.getIcon('ios-contact-outline')
                      },
                      topBar: {
                        title: {
                          text: "Account"
                        }
                      }
                    }
                  }
                }]
              }
            }]
          }
        }
      });
    }
    else {

      Navigation.setRoot({
        root: {
          sideMenu: {
            center: {
              stack: {
                children: [{
                  component: {
                    name: 'sn.Notes',
                    options: {
                      bottomTab: {
                        text: 'Notes',
                        icon: Icons.getIcon('ios-menu-outline')
                      },
                      topBar: {
                        title: {
                          text: "Notes",
                        }
                      }
                    }
                  }
                }]
              }
            },
            left: {
              component: {
                name: 'sn.Filter',
                id: "SideMenu",
                passProps: {
                  singleSelectMode: true,
                  options: JSON.stringify(this.optionsState),
                  onOptionsChange: (options) => {
                    this.optionsState.mergeWith(options);
                  }
                }
              }
            },
            disableOpenGesture: false
          }
        }
      });
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
