import { Client } from 'bugsnag-react-native';
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Platform, Dimensions, ScaledSize } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ThemeProvider, ThemeContext } from 'styled-components/native';
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
import { enableScreens } from 'react-native-screens';
import DrawerLayout from 'react-native-gesture-handler/DrawerLayout';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { MainSideMenu } from '@Screens/SideMenu/MainSideMenu';

enableScreens();

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

const getDefaultDrawerWidth = ({ height, width }: ScaledSize) => {
  /*
   * Default drawer width is screen width - header height
   * with a max width of 280 on mobile and 320 on tablet
   * https://material.io/guidelines/patterns/navigation-drawer.html
   */
  const smallerAxisSize = Math.min(height, width);
  const isLandscape = width > height;
  const isTablet = smallerAxisSize >= 600;
  const appBarHeight = Platform.OS === 'ios' ? (isLandscape ? 32 : 44) : 56;
  const maxWidth = isTablet ? 320 : 280;

  return Math.min(smallerAxisSize - appBarHeight, maxWidth);
};

const AppStack = createStackNavigator<AppStackNavigatorParamList>();

const AppStackComponent = () => {
  const theme = useContext(ThemeContext);
  const drawerRef = React.createRef<DrawerLayout>();
  const [dimensions, setDimensions] = React.useState(() =>
    Dimensions.get('window')
  );
  React.useEffect(() => {
    const updateDimensions = ({ window }: { window: ScaledSize }) => {
      setDimensions(window);
    };

    Dimensions.addEventListener('change', updateDimensions);

    return () => Dimensions.removeEventListener('change', updateDimensions);
  }, []);
  const renderDrawer = () => <MainSideMenu />;
  return (
    <DrawerLayout
      ref={drawerRef}
      drawerWidth={getDefaultDrawerWidth(dimensions)}
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
          <ActionSheetProvider>
            <AppStackComponent />
          </ActionSheetProvider>
        </ContextProvider>
      </ThemeProvider>
    </NavigationContainer>
  );
};
