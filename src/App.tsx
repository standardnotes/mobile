import { Client } from 'bugsnag-react-native';
import React, { Component } from 'react';
import { Animated, Text } from 'react-native';
import { createAppContainer, NavigationActions } from 'react-navigation';
import { createDrawerNavigator, DrawerActions } from 'react-navigation-drawer';
import { createStackNavigator } from 'react-navigation-stack';
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
  SCREEN_KEY_RECOVERY,
} from '@Screens/screens';
import InputModal from '@Screens/InputModal';
import KeyRecovery from '@Screens/KeyRecovery';
import MainSideMenu from '@Screens/SideMenu/MainSideMenu';
import ManagePrivileges from '@Screens/ManagePrivileges';
import NoteSideMenu from '@Screens/SideMenu/NoteSideMenu';
import Root from '@Screens/Root';
import Settings from '@Screens/Settings/Settings';
import SideMenuManager from '@Screens/SideMenu/SideMenuManager';
import { ApplicationGroup } from '@Lib/applicationGroup';
import { MobileApplication } from '@Lib/application';

// import { NativeModules } from 'react-native';
// import { SFAuthManager, protocolManager } from 'snjs';

// protocolManager.crypto.setNativeModules({
//   base64: require('base-64'),
//   aes: NativeModules.Aes,
// });

export const applicationGroup = new ApplicationGroup();

if (__DEV__ === false) {
  // bugsnag
  // eslint-disable-next-line no-new
  new Client();

  /** Disable console.log for non-dev builds */
  console.log = () => {};
}

// const AppStack = createStackNavigator(
//   {
//     [SCREEN_NOTES]: { screen: Root },
//     [SCREEN_COMPOSE]: { screen: Compose },
//   },
//   {
//     initialRouteName: SCREEN_NOTES,
//     navigationOptions: () => ({
//       drawerLockMode: SideMenuManager.get().isRightSideMenuLocked()
//         ? 'locked-closed'
//         : null,
//     }),
//   }
// );

// const AppDrawerStack = createDrawerNavigator(
//   {
//     Main: AppStack,
//   },
//   {
//     contentComponent: ({ navigation }) => (
//       <NoteSideMenu
//         ref={ref => {
//           SideMenuManager.get().setRightSideMenuReference(ref);
//         }}
//         // @ts-ignore navigation is ignored
//         navigation={navigation}
//       />
//     ),
//     drawerPosition: 'right',
//     drawerType: 'slide',
//     // @ts-ignore navigation is ignored
//     getCustomActionCreators: (route, stateKey) => {
//       return {
//         openRightDrawer: () => DrawerActions.openDrawer({ key: stateKey }),
//         closeRightDrawer: () => DrawerActions.closeDrawer({ key: stateKey }),
//         lockRightDrawer: (lock: any) => {
//           /** This is the key part */
//           SideMenuManager.get().setLockedForRightSideMenu(lock);
//           /** We have to return something. */
//           return NavigationActions.setParams({
//             params: { dummy: true },
//             key: route.key,
//           });
//         },
//       };
//     },
//   }
// );

// const SettingsStack = createStackNavigator({
//   screen: Settings,
// });

// const InputModalStack = createStackNavigator({
//   screen: InputModal,
// });

// const AuthenticateModalStack = createStackNavigator({
//   screen: Authenticate,
// });

// const ManagePrivilegesStack = createStackNavigator({
//   screen: ManagePrivileges,
// });

// const KeyRecoveryStack = createStackNavigator({
//   screen: KeyRecovery,
// });

// const AppDrawer = createStackNavigator(
//   {
//     [SCREEN_HOME]: AppDrawerStack,
//     [SCREEN_SETTINGS]: SettingsStack,
//     [SCREEN_INPUT_MODAL]: InputModalStack,
//     [SCREEN_AUTHENTICATE]: AuthenticateModalStack,
//     [SCREEN_MANAGE_PRIVILEGES]: ManagePrivilegesStack,
//     [SCREEN_KEY_RECOVERY]: KeyRecoveryStack,
//   },
//   {
//     mode: 'modal',
//     headerMode: 'none',
//     // @ts-ignore navigation is ignored
//     transitionConfig: () => ({
//       transitionSpec: {
//         duration: 300,
//         timing: Animated.timing,
//       },
//     }),
//     navigationOptions: () => ({
//       drawerLockMode: SideMenuManager.get().isLeftSideMenuLocked()
//         ? 'locked-closed'
//         : null,
//     }),
//   }
// );

// const DrawerStack = createDrawerNavigator(
//   {
//     Main: AppDrawer,
//   },
//   {
//     contentComponent: ({ navigation }) => (
//       <MainSideMenu
//         ref={ref => {
//           SideMenuManager.get().setLeftSideMenuReference(ref);
//         }}
//         // @ts-ignore navigation is ignored
//         navigation={navigation}
//       />
//     ),
//     drawerPosition: 'left',
//     drawerType: 'slide',
//     // @ts-ignore navigation is ignored
//     getCustomActionCreators: (route, stateKey) => {
//       return {
//         openLeftDrawer: () => DrawerActions.openDrawer({ key: stateKey }),
//         closeLeftDrawer: () => DrawerActions.closeDrawer({ key: stateKey }),
//         lockLeftDrawer: (lock: any) => {
//           /** This is the key part. */
//           SideMenuManager.get().setLockedForLeftSideMenu(lock);
//           /** We have to return something. */
//           return NavigationActions.setParams({
//             params: { dummy: true },
//             key: route.key,
//           });
//         },
//       };
//     },
//   }
// );

// const AppContainer = createAppContainer(DrawerStack);

type State = {
  ready: boolean;
};

export const ApplicationContext = React.createContext(
  applicationGroup.application
);

export const StylekitContext = React.createContext(
  applicationGroup.application?.getThemeService()
);

export default class App extends Component<{}, State> {
  authEventHandler: any;
  application?: MobileApplication;
  constructor(props: Readonly<{}>) {
    super(props);

    // KeysManager.get().registerAccountRelatedStorageKeys(['options']);

    /** Listen to sign out event */
    // this.authEventHandler = Auth.get().addEventHandler(async (event: any) => {
    //   if (event === SFAuthManager.DidSignOutEvent) {
    //     ModelManager.get().handleSignout();
    //     Sync.get().handleSignout();
    //   }
    // });
    this.application = applicationGroup.application;
    this.state = { ready: false };
    this.loadApplication();
  }

  /**
   * We initially didn't expect App to ever unmount. However, on Android,
   * if you are in the root screen, and press the physical back button,
   * then strangely, App unmounts, but other components, like Notes, do not.
   * We've remedied this by modifiying Android back button behavior natively
   * to background instead of quit, but we keep this below anyway.
   */
  componentWillUnmount() {
    // Auth.get().removeEventHandler(this.authEventHandler);
  }

  async loadApplication() {
    await this.application!.prepareForLaunch({
      receiveChallenge: async (challenge, orchestrator) => {
        this.application!.promptForChallenge(challenge, orchestrator);
      },
    });
    await this.application!.launch(false);
    this.setState({ ready: true });
  }

  // async loadInitialData() {
  //   await StyleKit.get().initialize();

  //   const ready = () => {
  //     KeysManager.get().markApplicationAsRan();
  //     ApplicationState.get().receiveApplicationStartEvent();
  //     this.setState({ ready: true });
  //   };

  //   if (await KeysManager.get().needsWipe()) {
  //     KeysManager.get().wipeData().then(ready).catch(ready);
  //   } else {
  //     ready();
  //   }
  // }

  render() {
    if (!this.state.ready) {
      return null;
    }

    return (
      <ApplicationContext.Provider value={this.application}>
        <Text>Test</Text>
        {/* <AppContainer  /> */}
      </ApplicationContext.Provider>
    );
  }
}
