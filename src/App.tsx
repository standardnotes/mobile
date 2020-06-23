import { Client } from 'bugsnag-react-native';
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Dimensions, ScaledSize, StatusBar } from 'react-native';
import { NavigationContainer, RouteProp } from '@react-navigation/native';
import {
  createStackNavigator,
  StackNavigationProp,
} from '@react-navigation/stack';
import { ThemeProvider, ThemeContext } from 'styled-components/native';
import { CurrentApplication, ContextProvider } from './ApplicationContext';
import { Root } from '@Screens/Root';
import {
  SCREEN_NOTES,
  SCREEN_COMPOSE,
  SCREEN_SETTINGS,
} from './screens2/screens';
import { HeaderTitleView } from '@Components/HeaderTitleView';
import { HeaderButtons, Item } from 'react-navigation-header-buttons';
import { ICON_MENU } from '@Style/icons';
import { StyleKit } from '@Style/StyleKit';
import { enableScreens } from 'react-native-screens';
import DrawerLayout from 'react-native-gesture-handler/DrawerLayout';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { MainSideMenu } from '@Screens/SideMenu/MainSideMenu';
import { Compose } from '@Screens/Compose/Compose';
import { getDefaultDrawerWidth } from '@Style/Util/getDefaultDraerWidth';
import { IoniconsHeaderButton } from '@Components/IoniconsHeaderButton';

enableScreens();

if (__DEV__ === false) {
  // bugsnag
  // eslint-disable-next-line no-new
  new Client();
}

type HeaderTitleParams = {
  title?: string;
  subTitle: string;
  subTitleColor?: string;
};

type AppStackNavigatorParamList = {
  [SCREEN_NOTES]: HeaderTitleParams;
  [SCREEN_COMPOSE]: HeaderTitleParams;
};

export type AppStackNavigationProp<
  T extends keyof AppStackNavigatorParamList
> = {
  navigation: StackNavigationProp<AppStackNavigatorParamList, T>;
  route: RouteProp<AppStackNavigatorParamList, T>;
};

const AppStack = createStackNavigator<AppStackNavigatorParamList>();

const AppStackComponent = () => {
  const theme = useContext(ThemeContext);
  const drawerRef = React.useRef<DrawerLayout>();
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
  return (
    <DrawerLayout
      ref={drawerRef}
      drawerWidth={getDefaultDrawerWidth(dimensions)}
      drawerPosition={'left'}
      drawerType="slide"
      drawerBackgroundColor="#ddd"
      renderNavigationView={() => <MainSideMenu />}
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
          options={({ route }) => ({
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
        <AppStack.Screen
          name={SCREEN_COMPOSE}
          options={({ route }) => ({
            headerTitle: ({ children }) => {
              return (
                <HeaderTitleView
                  title={route.params?.title ?? (children || '')}
                  subtitle={route.params?.subTitle}
                  subtitleColor={route.params?.subTitleColor}
                />
              );
            },
            headerRight: () => (
              <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
                <Item
                  testID="noteDrawerButton"
                  disabled={false}
                  title={''}
                  iconName={StyleKit.nameForIcon(ICON_MENU)}
                  onPress={() => {}}
                />
              </HeaderButtons>
            ),
          })}
          component={Compose}
        />
        {/* <AppStack.Screen name={SCREEN_INPUT_MODAL} component={InputModal} /> */}
      </AppStack.Navigator>
    </DrawerLayout>
  );
};

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
      <StatusBar translucent />
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
