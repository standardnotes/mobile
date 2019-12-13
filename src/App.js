import React, {Component} from 'react';
import { View, Text } from "react-native";
import { Client } from 'bugsnag-react-native';
import { createAppContainer, NavigationActions } from "react-navigation";

import { createDrawerNavigator, DrawerActions } from 'react-navigation-drawer';
import { createStackNavigator } from 'react-navigation-stack';

import KeysManager from './lib/keysManager'
import StyleKit from "./style/StyleKit"
import ApplicationState from "@Lib/ApplicationState"
import Auth from './lib/sfjs/authManager'
import ModelManager from './lib/sfjs/modelManager'
import PrivilegesManager from '@SFJS/privilegesManager'
import MigrationManager from "@SFJS/migrationManager"
import Sync from './lib/sfjs/syncManager'
import Storage from './lib/sfjs/storageManager'
import ReviewManager from './lib/reviewManager'

import Compose from "@Screens/Compose"
import Splash from "@Screens/Splash"
import Root from "@Screens/Root"
import MainSideMenu from "@SideMenu/MainSideMenu"
import NoteSideMenu from "@SideMenu/NoteSideMenu"
import Settings from "@Screens/Settings/Settings"
import InputModal from "@Screens/InputModal"
import ManagePrivileges from "@Screens/ManagePrivileges"
import Authenticate from "@Screens/Authentication/Authenticate"
import KeyRecovery from "@Screens/KeyRecovery"

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
  }
})

const SettingsStack = createStackNavigator({
  screen: Settings
})

const InputModalStack = createStackNavigator({
  screen: InputModal
})

const AuthenticateModalStack = createStackNavigator({
  screen: Authenticate
})

const ManagePrivilegesStack = createStackNavigator({
  screen: ManagePrivileges
})

const KeyRecoveryStack = createStackNavigator({
  screen: KeyRecovery
})

const AppDrawer = createStackNavigator({
  Home: AppDrawerStack,
  Settings: SettingsStack,
  InputModal: InputModalStack,
  Authenticate: AuthenticateModalStack,
  ManagePrivileges: ManagePrivilegesStack,
  KeyRecovery: KeyRecoveryStack,
  Splash: {
    screen: Splash,
    navigationOptions: {
     gesturesEnabled: false,
   },
  }
}, {
  mode: "modal",
  headerMode: 'none',
  transitionConfig: TransitionConfig
})

AppDrawer.navigationOptions = ({ navigation }) => {
  return {
    drawerLockMode: SideMenuManager.get().isLeftSideMenuLocked() ? "locked-closed" : null,
  }
};

const TransitionConfig = () => {
  return {
    transitionSpec: {
      duration: 150
    }
  }
}

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
  transitionConfig: TransitionConfig
});

const AppContainer = createAppContainer(DrawerStack);

export default class App extends Component {

  constructor(props) {
    super(props);

    KeysManager.get().registerAccountRelatedStorageKeys(["options"]);

    // Initialize iOS review manager. Will automatically handle requesting review logic.
    ReviewManager.initialize();

    PrivilegesManager.get().loadPrivileges();
    MigrationManager.get().load();

    // Listen to sign out event
    this.authEventHandler = Auth.get().addEventHandler(async (event) => {
      if(event == SFAuthManager.DidSignOutEvent) {
        ModelManager.get().handleSignout();
        await Sync.get().handleSignout();
      }
    });

    this.state = {ready: false};
    this.loadInitialData();
  }

  /*
    We initially didn't expect App to ever unmount. However, on Android, if you are in the root screen,
    and press the physical back button, then strangely, App unmounts, but other components, like Notes, do not.
    We've remedied this by modifiying Android back button behavior natively to background instead of quit, but we keep this below anyway.
   */
  componentWillUnmount() {
    Auth.get().removeEventHandler(this.authEventHandler);
  }

  async loadInitialData() {
    await StyleKit.get().resolveInitialTheme();
    await KeysManager.get().loadInitialData();

    let ready = () => {
      KeysManager.get().markApplicationAsRan();
      ApplicationState.get().receiveApplicationStartEvent();
      this.setState({ready: true});
    }

    if(await KeysManager.get().needsWipe()) {
      KeysManager.get().wipeData().then(ready).catch(ready);
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
