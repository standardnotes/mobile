import { Client } from 'bugsnag-react-native';
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ThemeProvider, ThemeContext } from 'styled-components/native';
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
import { CurrentApplication, ContextProvider } from './ApplicationContext';
import { Root } from '@Screens/Root';
import {
  SCREEN_NOTES,
  SCREEN_COMPOSE,
  SCREEN_SETTINGS,
} from './screens2/screens';
import { HeaderTitleView } from '@Components/HeaderTitleView';
import {
  HeaderButtons,
  HeaderButtonProps,
  HeaderButton,
  Item,
} from 'react-navigation-header-buttons';
import { ICON_MENU } from '@Style/icons';
import { StyleKit } from '@Style/StyleKit';
import Icon from 'react-native-vector-icons/Ionicons';
import DrawerLayout from 'react-native-gesture-handler/DrawerLayout';
import { View, Text } from 'react-native';

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

const IoniconsHeaderButton = (passMeFurther: HeaderButtonProps) => {
  // the `passMeFurther` variable here contains props from <Item .../> as well as <HeaderButtons ... />
  // and it is important to pass those props to `HeaderButton`
  // then you may add some information like icon size or color (if you use icons)
  const theme = useContext(ThemeContext);
  return (
    <HeaderButton
      {...passMeFurther}
      IconComponent={Icon}
      iconSize={30}
      color={theme.stylekitInfoColor}
    />
  );
};

type HeaderTitleParams = {
  title?: string;
  subTitle: string;
  subTitleColor?: string;
};

type AppStackNavigatorParamList = {
  [SCREEN_NOTES]: HeaderTitleParams;
  [SCREEN_COMPOSE]: undefined;
};

const AppStack = createStackNavigator<AppStackNavigatorParamList>();

const AppStackComponent = () => {
  const theme = useContext(ThemeContext);
  const drawerRef = React.createRef<DrawerLayout>();
  const renderDrawer = () => {
    return (
      <View>
        <Text>I am in the drawer!</Text>
      </View>
    );
  };
  return (
    <DrawerLayout
      ref={drawerRef}
      drawerWidth={200}
      drawerPosition={'left'}
      drawerType="slide"
      drawerBackgroundColor="#ddd"
      renderNavigationView={renderDrawer}
    >
      <AppStack.Navigator
        screenOptions={({ navigation, route }) => ({
          headerStyle: {
            backgroundColor: theme.stylekitContrastBackgroundColor,
            borderBottomColor: theme.stylekitContrastBorderColor,
            borderBottomWidth: 1,
          },
          headerTintColor: theme.stylekitInfoColor,
          headerTitle: ({ children }) => {
            return <HeaderTitleView title={children || ''} />;
          },
        })}
        initialRouteName={SCREEN_NOTES}
      >
        <AppStack.Screen
          name={SCREEN_NOTES}
          options={({ route, navigation }) => ({
            title: 'All notes',
            headerTitle: ({ children }) => {
              return (
                <HeaderTitleView
                  title={route.params?.title ?? (children || '')}
                  subtitle={route.params?.subTitle}
                  subtitleColor={route.params?.subTitleColor}
                />
              );
            },
            headerLeft: () => (
              <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
                <Item
                  testID="drawerButton"
                  disabled={false}
                  title={''}
                  iconName={StyleKit.nameForIcon(ICON_MENU)}
                  onPress={() => drawerRef.current?.openDrawer()}
                />
              </HeaderButtons>
            ),
          })}
          component={Root}
        />
        {/* <AppStack.Screen name={SCREEN_COMPOSE} component={Notifications} /> */}
        {/* <AppStack.Screen name={SCREEN_INPUT_MODAL} component={InputModal} /> */}
      </AppStack.Navigator>
    </DrawerLayout>
  );
};

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

export const App: React.FC = () => {
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

  if (!ready || !CurrentApplication!.getThemeService().theme) {
    return null;
  }
  return (
    <NavigationContainer>
      <ThemeProvider theme={CurrentApplication!.getThemeService().theme!}>
        <ContextProvider>
          <AppStackComponent />
        </ContextProvider>
      </ThemeProvider>
    </NavigationContainer>
  );
};
