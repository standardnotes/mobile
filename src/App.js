import { Client } from 'bugsnag-react-native';
import React, { useState, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { useDarkModeContext, eventEmitter as darkModeEventEmitter } from 'react-native-dark-mode'
import { createAppContainer, NavigationActions } from 'react-navigation';
import { createDrawerNavigator, DrawerActions } from 'react-navigation-drawer';
import { createStackNavigator } from 'react-navigation-stack';
import KeysManager from '@Lib/keysManager';
import ApplicationState from '@Lib/ApplicationState';
import Auth from '@Lib/sfjs/authManager';
import ModelManager from '@Lib/sfjs/modelManager';
import PrivilegesManager from '@SFJS/privilegesManager';
import MigrationManager from '@SFJS/migrationManager';
import Sync from '@Lib/sfjs/syncManager';
import Storage from '@Lib/sfjs/storageManager';
import ReviewManager from '@Lib/reviewManager';
import Authenticate from '@Screens/Authentication/Authenticate';
import Compose from '@Screens/Compose';
import {
  SCREEN_SPLASH,
  SCREEN_OFFLINE_DISCLAIMER,
  SCREEN_AUTHENTICATE,
  SCREEN_HOME,
  SCREEN_NOTES,
  SCREEN_COMPOSE,
  SCREEN_INPUT_MODAL,
  SCREEN_SETTINGS,
  SCREEN_MANAGE_PRIVILEGES,
  SCREEN_KEY_RECOVERY
} from '@Screens/screens';
import InputModal from '@Screens/InputModal';
import KeyRecovery from '@Screens/KeyRecovery';
import MainSideMenu from '@SideMenu/MainSideMenu';
import ManagePrivileges from '@Screens/ManagePrivileges';
import NoteSideMenu from '@SideMenu/NoteSideMenu';
import OfflineDisclaimer from '@Screens/OfflineDisclaimer';
import Root from '@Screens/Root';
import Settings from '@Screens/Settings/Settings';
import SideMenuManager from '@SideMenu/SideMenuManager';
import Splash from '@Screens/Splash';
import StyleKit from '@Style/StyleKit';

if(__DEV__ === false) {
  const bugsnag = new Client()

  // Disable console.log for non-dev builds
  console.log = () => {};
}

const AppStack = createStackNavigator({
  [SCREEN_NOTES]: {screen: Root},
  [SCREEN_COMPOSE]: {screen: Compose},
}, {
  initialRouteName: SCREEN_NOTES,
  navigationOptions: ({ navigation }) => ({
    drawerLockMode: SideMenuManager.get().isRightSideMenuLocked() ? 'locked-closed' : null
  })
})

const AppDrawerStack = createDrawerNavigator({
  Main: AppStack
}, {
  contentComponent: ({ navigation }) => (
    <NoteSideMenu ref={(ref) => {SideMenuManager.get().setRightSideMenuReference(ref)}} navigation={navigation} />
  ),
  drawerPosition: 'right',
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

const OfflineDisclaimerStack = createStackNavigator({
  screen: OfflineDisclaimer
})

const AppDrawer = createStackNavigator({
  [SCREEN_HOME]: AppDrawerStack,
  [SCREEN_SETTINGS]: SettingsStack,
  [SCREEN_INPUT_MODAL]: InputModalStack,
  [SCREEN_AUTHENTICATE]: AuthenticateModalStack,
  [SCREEN_MANAGE_PRIVILEGES]: ManagePrivilegesStack,
  [SCREEN_KEY_RECOVERY]: KeyRecoveryStack,
  [SCREEN_SPLASH]: {
    screen: Splash,
    navigationOptions: {
     gesturesEnabled: false,
   }
  },
  [SCREEN_OFFLINE_DISCLAIMER]: {
    screen: OfflineDisclaimerStack,
    navigationOptions: {
     gesturesEnabled: false,
   }
  }
}, {
  mode: 'modal',
  headerMode: 'none',
  transitionConfig: () => ({
    transitionSpec: {
      duration: 300,
      timing: Animated.timing
    }
  }),
  navigationOptions: ({ navigation }) => ({
    drawerLockMode: SideMenuManager.get().isLeftSideMenuLocked() ? 'locked-closed' : null,
  })
})

const DrawerStack = createDrawerNavigator({
  Main: AppDrawer,
}, {
  contentComponent: ({ navigation }) => (
    <MainSideMenu ref={(ref) => {SideMenuManager.get().setLeftSideMenuReference(ref)}} navigation={navigation} />
  ),
  drawerPosition: 'left',
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
  }
});

const AppContainer = createAppContainer(DrawerStack);

export default function App(props) {
  const [isReady, setIsReady] = useState(false);

  // initialize StyleKit with the status of Dark Mode on the user's device
  StyleKit.get().setModeTo(useDarkModeContext());

  // if user switches light/dark mode while on the app, update theme accordingly
  darkModeEventEmitter.on('currentModeChanged', changeCurrentMode);

  KeysManager.get().registerAccountRelatedStorageKeys(['options']);

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

  loadInitialData();

  async function loadInitialData() {
    await StyleKit.get().resolveInitialThemes();
    await KeysManager.get().loadInitialData();

    let ready = () => {
      KeysManager.get().markApplicationAsRan();
      ApplicationState.get().receiveApplicationStartEvent();
      setIsReady(true);
    }

    if(await KeysManager.get().needsWipe()) {
      KeysManager.get().wipeData().then(ready).catch(ready);
    } else {
      ready();
    }
  }

  function changeCurrentMode(newMode) {
    StyleKit.get().setModeTo(newMode);
    StyleKit.get().activateThemeForCurrentMode();
  }

  useEffect(() => {
    return () => {
      /**
        We initially didn't expect App to ever unmount. However, on Android, if you
        are in the root screen, and press the physical back button, then strangely,
        App unmounts, but other components, like Notes, do not.
        We've remedied this by modifiying Android back button behavior natively to
        background instead of quit, but we keep this below anyway.
       */
      Auth.get().removeEventHandler(authEventHandler);

      // Make sure we remove the event listener for dark/light mode changes
      darkModeEventEmitter.off('currentModeChanged', changeCurrentMode)
    };
  });


  return !isReady ? null : (<AppContainer /* persistenceKey="if-you-want-it" */ />);
}
