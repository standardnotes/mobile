import { Client } from 'bugsnag-react-native';
import React, { Component } from 'react';
import { Animated } from 'react-native';
import {
  initialMode,
  eventEmitter as darkModeEventEmitter
} from 'react-native-dark-mode';
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
import ReviewManager from '@Lib/reviewManager';
import Authenticate from '@Screens/Authentication/Authenticate';
import Compose from '@Screens/Compose';
import {
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
import Root from '@Screens/Root';
import Settings from '@Screens/Settings/Settings';
import SideMenuManager from '@SideMenu/SideMenuManager';
import StyleKit from '@Style/StyleKit';

if (__DEV__ === false) {
  const bugsnag = new Client();

  /** Disable console.log for non-dev builds */
  console.log = () => {};
}

const AppStack = createStackNavigator(
  {
    [SCREEN_NOTES]: { screen: Root },
    [SCREEN_COMPOSE]: { screen: Compose }
  },
  {
    initialRouteName: SCREEN_NOTES,
    navigationOptions: ({ navigation }) => ({
      drawerLockMode: SideMenuManager.get().isRightSideMenuLocked()
        ? 'locked-closed'
        : null
    })
  }
);

const AppDrawerStack = createDrawerNavigator(
  {
    Main: AppStack
  },
  {
    contentComponent: ({ navigation }) => (
      <NoteSideMenu
        ref={ref => {
          SideMenuManager.get().setRightSideMenuReference(ref);
        }}
        navigation={navigation}
      />
    ),
    drawerPosition: 'right',
    drawerType: 'slide',
    getCustomActionCreators: (route, stateKey) => {
      return {
        openRightDrawer: () => DrawerActions.openDrawer({ key: stateKey }),
        closeRightDrawer: () => DrawerActions.closeDrawer({ key: stateKey }),
        lockRightDrawer: lock => {
          /** This is the key part */
          SideMenuManager.get().setLockedForRightSideMenu(lock);
          /** We have to return something. */
          return NavigationActions.setParams({
            params: { dummy: true },
            key: route.key,
          });
        }
      };
    }
  }
);

const SettingsStack = createStackNavigator({
  screen: Settings
});

const InputModalStack = createStackNavigator({
  screen: InputModal
});

const AuthenticateModalStack = createStackNavigator({
  screen: Authenticate
});

const ManagePrivilegesStack = createStackNavigator({
  screen: ManagePrivileges
});

const KeyRecoveryStack = createStackNavigator({
  screen: KeyRecovery
});

const AppDrawer = createStackNavigator(
  {
    [SCREEN_HOME]: AppDrawerStack,
    [SCREEN_SETTINGS]: SettingsStack,
    [SCREEN_INPUT_MODAL]: InputModalStack,
    [SCREEN_AUTHENTICATE]: AuthenticateModalStack,
    [SCREEN_MANAGE_PRIVILEGES]: ManagePrivilegesStack,
    [SCREEN_KEY_RECOVERY]: KeyRecoveryStack,
  },
  {
    mode: 'modal',
    headerMode: 'none',
    transitionConfig: () => ({
      transitionSpec: {
        duration: 300,
        timing: Animated.timing
      }
    }),
    navigationOptions: ({ navigation }) => ({
      drawerLockMode: SideMenuManager.get().isLeftSideMenuLocked()
        ? 'locked-closed'
        : null
    })
  }
);

const DrawerStack = createDrawerNavigator(
  {
    Main: AppDrawer
  },
  {
    contentComponent: ({ navigation }) => (
      <MainSideMenu
        ref={ref => {
          SideMenuManager.get().setLeftSideMenuReference(ref);
        }}
        navigation={navigation}
      />
    ),
    drawerPosition: 'left',
    drawerType: 'slide',
    getCustomActionCreators: (route, stateKey) => {
      return {
        openLeftDrawer: () => DrawerActions.openDrawer({ key: stateKey }),
        closeLeftDrawer: () => DrawerActions.closeDrawer({ key: stateKey }),
        lockLeftDrawer: lock => {
          /** This is the key part. */
          SideMenuManager.get().setLockedForLeftSideMenu(lock);
          /** We have to return something. */
          return NavigationActions.setParams({
            params: { dummy: true },
            key: route.key
          });
        }
      };
    }
  }
);

const AppContainer = createAppContainer(DrawerStack);

export default class App extends Component {
  constructor(props) {
    super(props);

    StyleKit.get().setModeTo(initialMode);
    darkModeEventEmitter.on('currentModeChanged', this.onChangeCurrentMode);

    KeysManager.get().registerAccountRelatedStorageKeys(['options']);

    /**
     * Initialize iOS review manager. Will automatically handle requesting
     * review logic.
     */
    ReviewManager.initialize();

    PrivilegesManager.get().loadPrivileges();
    MigrationManager.get().load();

    /** Listen to sign out event */
    this.authEventHandler = Auth.get().addEventHandler(async event => {
      if (event === SFAuthManager.DidSignOutEvent) {
        ModelManager.get().handleSignout();
        await Sync.get().handleSignout();
      }
    });

    this.state = { ready: false };
    this.loadInitialData();
  }

  /**
   * We initially didn't expect App to ever unmount. However, on Android,
   * if you are in the root screen, and press the physical back button,
   * then strangely, App unmounts, but other components, like Notes, do not.
   * We've remedied this by modifiying Android back button behavior natively
   * to background instead of quit, but we keep this below anyway.
   */
  componentWillUnmount() {
    Auth.get().removeEventHandler(this.authEventHandler);

    /** Make sure we remove the event listener for dark/light mode changes */
    darkModeEventEmitter.off('currentModeChanged', this.onChangeCurrentMode);
  }

  async loadInitialData() {
    await StyleKit.get().initialize();
    await KeysManager.get().loadInitialData();

    const ready = () => {
      KeysManager.get().markApplicationAsRan();
      ApplicationState.get().receiveApplicationStartEvent();
      this.setState({ ready: true });
    };

    if (await KeysManager.get().needsWipe()) {
      KeysManager.get()
        .wipeData()
        .then(ready)
        .catch(ready);
    } else {
      ready();
    }
  }

  /** @private */
  onChangeCurrentMode(mode) {
    StyleKit.get().setModeTo(mode);
    StyleKit.get().activatePreferredTheme();
  }

  render() {
    if (!this.state.ready) {
      return null;
    }

    return <AppContainer /* persistenceKey="if-you-want-it" */ />;
  }
}
