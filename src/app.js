import React, {Component} from 'react';
import { View, Text } from "react-native";
import { createStackNavigator, createAppContainer, createDrawerNavigator } from "react-navigation";

import KeysManager from './lib/keysManager'
import GlobalStyles from "./Styles"
import Icons from "./Icons"
import ApplicationState from "./ApplicationState"
import Auth from './lib/sfjs/authManager'
import ModelManager from './lib/sfjs/modelManager'
import Sync from './lib/sfjs/syncManager'
import Storage from './lib/sfjs/storageManager'
import ReviewManager from './lib/reviewManager';

import Compose from "./screens/Compose"
import Notes from "./screens/Notes"
import Filter from "./screens/Filter"
import Account from "./screens/Account"
import InputModal from "./screens/InputModal"

const AppStack = createStackNavigator({
  Notes: {screen: Notes},
  Compose: {screen: Compose},
  NoteOptions: {screen : Filter},
}, {
  initialRouteName: 'Notes'
})

const SettingsStack = createStackNavigator({
  Screen1: Account
})

const InputModalStack = createStackNavigator({
  Screen1: InputModal
})

const ModalStack = createStackNavigator({
  Home: AppStack,
  Settings: SettingsStack,
  NewTag: InputModalStack
}, {
  mode: "modal",
  headerMode: 'none',
})

const DrawerStack = createDrawerNavigator({
  Main: ModalStack
}, {
  contentComponent: Filter,
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
    await GlobalStyles.get().resolveInitialTheme();
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
