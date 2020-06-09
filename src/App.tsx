import { Client } from 'bugsnag-react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from 'react-native';
// import { createDrawerNavigator, DrawerActions } from 'react-navigation-drawer';
// import Authenticate from '@Screens/Authentication/Authenticate';
// import Compose from '@Screens/Compose';
// import {
//   SCREEN_AUTHENTICATE,
//   SCREEN_HOME,
//   SCREEN_NOTES,
//   SCREEN_COMPOSE,
//   SCREEN_INPUT_MODAL,
//   SCREEN_SETTINGS,
//   SCREEN_MANAGE_PRIVILEGES,
//   SCREEN_KEY_RECOVERY,
// } from '@Screens/screens';
// import InputModal from '@Screens/InputModal';
// import KeyRecovery from '@Screens/KeyRecovery';
// import MainSideMenu from '@Screens/SideMenu/MainSideMenu';
// import ManagePrivileges from '@Screens/ManagePrivileges';
// import NoteSideMenu from '@Screens/SideMenu/NoteSideMenu';
// import Root from '@Screens/Root';
// import Settings from '@Screens/Settings/Settings';
// import SideMenuManager from '@Screens/SideMenu/SideMenuManager';
// import { MobileApplication } from '@Lib/application';
import { CurrentApplication } from './ApplicationContext';
// import { ApplicationGroup } from '@Lib/applicationGroup';
// import ThemedComponent from '@Components/ThemedComponent';
// import Notes from '@Screens/Notes/Notes';

if (__DEV__ === false) {
  // bugsnag
  // eslint-disable-next-line no-new
  new Client();
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
//   screen: Root,
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

type State = {
  ready: boolean;
};

export const App: React.FC<{}> = () => {
  const [ready, setReady] = useState(false);

  const loadApplication = useCallback(async () => {
    await CurrentApplication!.prepareForLaunch({
      receiveChallenge: async (challenge, orchestrator) => {
        CurrentApplication!.promptForChallenge(challenge, orchestrator);
      },
    });
    await CurrentApplication!.launch(false);
    setReady(true);
  }, []);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

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
  if (!ready) {
    return null;
  }
  return (
    <NavigationContainer>
      <Text>ssssss</Text>
    </NavigationContainer>
  );
};
