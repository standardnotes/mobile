import React, {Component} from 'react';
import { View, Text } from "react-native";
import { createStackNavigator, createAppContainer, createDrawerNavigator, DrawerActions, NavigationActions } from "react-navigation";

import KeysManager from './lib/keysManager'
import StyleKit from "./style/StyleKit"
import Icons from '@Style/Icons';
import ApplicationState from "./ApplicationState"
import Auth from './lib/sfjs/authManager'
import ModelManager from './lib/sfjs/modelManager'
import Sync from './lib/sfjs/syncManager'
import Storage from './lib/sfjs/storageManager'
import ReviewManager from './lib/reviewManager';

import Compose from "./screens/Compose"
import Notes from "./screens/Notes"
import SideMenu from "@SideMenu/SideMenu"
import Settings from "./screens/Settings"
import NoteOptions from "./screens/NoteOptions"
import InputModal from "./screens/InputModal"

let leftDrawerLocked = false;
let rightDrawerLocked = true;

const AppStack = createStackNavigator({
  Notes: {screen: Notes},
  Compose: {screen: Compose},
  NoteOptions: {screen : NoteOptions},
}, {
  initialRouteName: 'Notes',
})

AppStack.navigationOptions = ({ navigation }) => {
  return {drawerLockMode: rightDrawerLocked ? "locked-closed" : null}
};

const AppDrawerStack = createDrawerNavigator({
  Main: AppStack
}, {
  contentComponent: SideMenu,
  drawerPosition: "right",
  drawerType: 'slide',
  getCustomActionCreators: (route, stateKey) => {
    return {
      openRightDrawer: () => DrawerActions.openDrawer({ key: stateKey }),
      closeRightDrawer: () => DrawerActions.closeDrawer({ key: stateKey }),
      lockRightDrawer: (lock) => {
        // this is the key part
        rightDrawerLocked = lock;
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

const AppDrawer = createStackNavigator({
  Home: AppDrawerStack,
  Settings: SettingsStack,
  NewTag: InputModalStack
}, {
  mode: "modal",
  headerMode: 'none',
})

AppDrawer.navigationOptions = ({ navigation }) => {
  return {drawerLockMode: leftDrawerLocked ? "locked-closed" : null}
};


const DrawerStack = createDrawerNavigator({
  Main: AppDrawer,
}, {
  contentComponent: SideMenu,
  drawerPosition: "left",
  drawerType: 'slide',
  getCustomActionCreators: (route, stateKey) => {
    return {
      openLeftDrawer: () => DrawerActions.openDrawer({ key: stateKey }),
      closeLeftDrawer: () => DrawerActions.closeDrawer({ key: stateKey }),
      lockLeftDrawer: (lock) => {
        // this is the key part
        leftDrawerLocked = lock;
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

    return <AppContainer /* persistenceKey="if-you-want-it" */ />;
  }
}
