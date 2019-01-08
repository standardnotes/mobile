import React, {Component} from 'react';
import { View, Text } from "react-native";
import { Client } from 'bugsnag-react-native';
import { createStackNavigator, createAppContainer, createDrawerNavigator, DrawerActions, NavigationActions } from "react-navigation";

import KeysManager from './lib/keysManager'
import StyleKit from "./style/StyleKit"
import Icons from '@Style/Icons';
import ApplicationState from "@Lib/ApplicationState"
import Auth from './lib/sfjs/authManager'
import ModelManager from './lib/sfjs/modelManager'
import PrivilegesManager from '@SFJS/privilegesManager'
import Sync from './lib/sfjs/syncManager'
import Storage from './lib/sfjs/storageManager'
import ReviewManager from './lib/reviewManager';

import Compose from "@Screens/Compose"
import Root from "@Screens/Root"
import MainSideMenu from "@SideMenu/MainSideMenu"
import NoteSideMenu from "@SideMenu/NoteSideMenu"
import Settings from "@Screens/Settings/Settings"
import InputModal from "@Screens/InputModal"
import Authenticate from "@Screens/Authentication/Authenticate"

import SideMenuManager from "@SideMenu/SideMenuManager"

if(__DEV__ === false) {
  const bugsnag = new Client()

  // Disable console.log for non-dev builds
  console.log = () => {};
}

const AppStack = createStackNavigator({
  Notes: {screen: Root},
  Compose: {screen: Compose},

}, {
  initialRouteName: 'Notes'
})

AppStack.navigationOptions = ({ navigation }) => {
  return {drawerLockMode: SideMenuManager.get().isRightSideMenuLocked() ? "locked-closed" : null}
};

const AppDrawerStack = createDrawerNavigator({
  Main: AppStack
}, {
  contentComponent: ({ navigation }) => (
    <NoteSideMenu ref={(ref) => {SideMenuManager.get().setRightSideMenuReference(ref)}} navigation={navigation} />
  ),
  drawerPosition: "right",
  drawerType: 'slide',
  getCustomActionCreators: (route, stateKey) => {
    return {
      openRightDrawer: () => DrawerActions.openDrawer({ key: stateKey }),
      closeRightDrawer: () => DrawerActions.closeDrawer({ key: stateKey }),
      lockRightDrawer: (lock) => {
        // this is the key part
        SideMenuManager.get().setLockedForRightSideMenu(lock);
        // We have to return something
        return NavigationActions.setParams({params: { dummy: true }, key: route.key})
      }
    };
  },
})

const SettingsStack = createStackNavigator({
  Screen1: Settings
})

const InputModalStack = createStackNavigator({
  Screen1: InputModal
})

const AuthenticateModalStack = createStackNavigator({
  Screen1: Authenticate
})

const AppDrawer = createStackNavigator({
  Home: AppDrawerStack,
  Settings: SettingsStack,
  InputModal: InputModalStack,
  Authenticate: AuthenticateModalStack,

}, {
  mode: "modal",
  headerMode: 'none',
})

AppDrawer.navigationOptions = ({ navigation }) => {
  return {drawerLockMode: SideMenuManager.get().isLeftSideMenuLocked() ? "locked-closed" : null}
};

const DrawerStack = createDrawerNavigator({
  Main: AppDrawer,
}, {
  contentComponent: ({ navigation }) => (
    <MainSideMenu ref={(ref) => {SideMenuManager.get().setLeftSideMenuReference(ref)}} navigation={navigation} />
  ),
  drawerPosition: "left",
  drawerType: 'slide',
  getCustomActionCreators: (route, stateKey) => {
    return {
      openLeftDrawer: () => DrawerActions.openDrawer({ key: stateKey }),
      closeLeftDrawer: () => DrawerActions.closeDrawer({ key: stateKey }),
      lockLeftDrawer: (lock) => {
        // this is the key part
        SideMenuManager.get().setLockedForLeftSideMenu(lock)
        // We have to return something
        return NavigationActions.setParams({params: { dummy: true }, key: route.key})
      }
    };
  },
});

const AppContainer = createAppContainer(DrawerStack);

export default class App extends Component {

  constructor(props) {
    super(props);

    KeysManager.get().registerAccountRelatedStorageKeys(["options"]);

    // Initialize iOS review manager. Will automatically handle requesting review logic.
    ReviewManager.initialize();

    PrivilegesManager.get().loadPrivileges();

    // Listen to sign out event
    Auth.get().addEventHandler((event) => {
      if(event == SFAuthManager.DidSignOutEvent) {
        ApplicationState.getOptions().reset();
        Storage.get().clearAllModels();
        KeysManager.get().clearAccountKeysAndData();
        ModelManager.get().handleSignout();
        Sync.get().handleSignout();
      }
    });

    this.state = {ready: false};

    this.loadInitialData();
  }

  async loadInitialData() {
    await StyleKit.get().resolveInitialTheme();
    await Promise.all([
      Icons.get().loadIcons(),
      KeysManager.get().loadInitialData(),
    ])

    let ready = () => {
      ApplicationState.get().receiveApplicationStartEvent();
      this.setState({ready: true});
    }

    if(KeysManager.get().isFirstRun()) {
      KeysManager.get().handleFirstRun().then(ready);
    } else {
      ready();
    }
  }

  render() {
    if(!this.state.ready) {
      return null;
    }

    return (
      <AppContainer /* persistenceKey="if-you-want-it" */ />
    )
  }
}
