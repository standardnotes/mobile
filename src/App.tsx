import { Client } from 'bugsnag-react-native';
import React, { useState, useEffect, useContext, useRef } from 'react';
import { Dimensions, ScaledSize, StatusBar, Platform } from 'react-native';
import { NavigationContainer, RouteProp } from '@react-navigation/native';
import {
  createStackNavigator,
  StackNavigationProp,
} from '@react-navigation/stack';
import { ThemeProvider, ThemeContext } from 'styled-components/native';
import { ApplicationContext } from './ApplicationContext';
import { Root } from '@Screens/Root';
import {
  SCREEN_NOTES,
  SCREEN_COMPOSE,
  SCREEN_SETTINGS,
  SCREEN_INPUT_MODAL_PASSCODE,
  SCREEN_INPUT_MODAL_TAG,
} from './screens2/screens';
import { HeaderTitleView } from '@Components/HeaderTitleView';
import { HeaderButtons, Item } from 'react-navigation-header-buttons';
import { ICON_MENU, ICON_CHECKMARK, ICON_CLOSE } from '@Style/icons';
import { StyleKit, StyleKitContext } from '@Style/StyleKit';
import { enableScreens } from 'react-native-screens';
import DrawerLayout from 'react-native-gesture-handler/DrawerLayout';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { MainSideMenu } from '@Screens/SideMenu/MainSideMenu';
import { Compose } from '@Screens/Compose/Compose';
import { getDefaultDrawerWidth } from '@Style/Util/getDefaultDraerWidth';
import { IoniconsHeaderButton } from '@Components/IoniconsHeaderButton';
import { Settings } from '@Screens/Settings/Settings';
import { ApplicationGroup } from '@Lib/applicationGroup';
import { MobileApplication } from '@Lib/application';
import { TagInputModal } from '@Screens/InputModal/TagInputModal';
import { PasscodeInputModal } from '@Screens/InputModal/PasscodeInputModal';

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

type ModalStackNavigatorParamList = {
  AppStack: undefined;
  [SCREEN_SETTINGS]: undefined;
  [SCREEN_INPUT_MODAL_TAG]: HeaderTitleParams & {
    initialValue?: string;
  };
  [SCREEN_INPUT_MODAL_PASSCODE]: undefined;
};
export type AppStackNavigationProp<
  T extends keyof AppStackNavigatorParamList
> = {
  navigation: StackNavigationProp<AppStackNavigatorParamList, T>;
  route: RouteProp<AppStackNavigatorParamList, T>;
};
export type ModalStackNavigationProp<
  T extends keyof ModalStackNavigatorParamList
> = {
  navigation: StackNavigationProp<ModalStackNavigatorParamList, T>;
  route: RouteProp<ModalStackNavigatorParamList, T>;
};

const MainStack = createStackNavigator<ModalStackNavigatorParamList>();
const AppStack = createStackNavigator<AppStackNavigatorParamList>();

const AppStackComponent = () => {
  const theme = useContext(ThemeContext);
  const drawerRef = React.useRef<DrawerLayout>(null);
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
      renderNavigationView={() => (
        <MainSideMenu drawerRef={drawerRef.current} />
      )}
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
      </AppStack.Navigator>
    </DrawerLayout>
  );
};

const MainStackComponent = () => (
  <MainStack.Navigator mode="modal" initialRouteName="AppStack">
    <MainStack.Screen
      name={'AppStack'}
      options={{
        headerShown: false,
      }}
      component={AppStackComponent}
    />
    <MainStack.Screen
      name={SCREEN_SETTINGS}
      options={({ route }) => ({
        title: 'Settings',
        gestureEnabled: false,
        headerTitle: ({ children }) => {
          return <HeaderTitleView title={children || ''} />;
        },
        headerLeft: ({ disabled, onPress }) => (
          <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
            <Item
              testID="headerButton"
              disabled={disabled}
              title={Platform.OS === 'ios' ? 'Done' : ''}
              iconName={
                Platform.OS === 'ios'
                  ? undefined
                  : StyleKit.nameForIcon(ICON_CHECKMARK)
              }
              onPress={onPress}
            />
          </HeaderButtons>
        ),
      })}
      component={Settings}
    />
    <MainStack.Screen
      name={SCREEN_INPUT_MODAL_PASSCODE}
      options={{
        title: 'Setup Passcode',
        gestureEnabled: false,
        headerTitle: ({ children }) => {
          return <HeaderTitleView title={children || ''} />;
        },
        headerLeft: ({ disabled, onPress }) => (
          <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
            <Item
              testID="headerButton"
              disabled={disabled}
              title={Platform.OS === 'ios' ? 'Cancel' : ''}
              iconName={
                Platform.OS === 'ios'
                  ? undefined
                  : StyleKit.nameForIcon(ICON_CLOSE)
              }
              onPress={onPress}
            />
          </HeaderButtons>
        ),
      }}
      component={PasscodeInputModal}
    />
    <MainStack.Screen
      name={SCREEN_INPUT_MODAL_TAG}
      options={({ route }) => ({
        title: 'Tag',
        gestureEnabled: false,
        headerTitle: ({ children }) => {
          return (
            <HeaderTitleView title={route.params?.title ?? (children || '')} />
          );
        },
        headerLeft: ({ disabled, onPress }) => (
          <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
            <Item
              testID="headerButton"
              disabled={disabled}
              title={Platform.OS === 'ios' ? 'Cancel' : ''}
              iconName={
                Platform.OS === 'ios'
                  ? undefined
                  : StyleKit.nameForIcon(ICON_CLOSE)
              }
              onPress={onPress}
            />
          </HeaderButtons>
        ),
      })}
      component={TagInputModal}
    />
  </MainStack.Navigator>
);

const AppComponent: React.FC<{ application: MobileApplication }> = ({
  application,
}) => {
  const [ready, setReady] = useState(false);
  const styleKit = useRef<StyleKit | undefined>(undefined);

  useEffect(() => {
    setReady(false);
    const loadApplication = async () => {
      await application?.prepareForLaunch({
        receiveChallenge: async challenge => {
          console.log('challenge');
          application!.promptForChallenge(challenge);
        },
      });

      if (__DEV__) {
        await application?.setHost(
          'https://syncing-server-dev.standardnotes.org/'
        );
      } else {
        await application?.setHost('https://sync.standardnotes.org');
      }
      styleKit.current = new StyleKit(application);
      await styleKit.current.initialize();
      setReady(true);
      await application?.launch(false);
    };
    loadApplication();
  }, [application]);

  if (!ready || !styleKit.current) {
    return null;
  }

  return (
    <NavigationContainer>
      <StatusBar translucent />
      <ThemeProvider theme={styleKit.current.theme!}>
        <ActionSheetProvider>
          <StyleKitContext.Provider value={styleKit.current}>
            <MainStackComponent />
          </StyleKitContext.Provider>
        </ActionSheetProvider>
      </ThemeProvider>
    </NavigationContainer>
  );
};

const AppGroupInstance = new ApplicationGroup();

export const App = () => {
  const applicationGroupRef = useRef(AppGroupInstance);
  const [application, setApplication] = useState<
    MobileApplication | undefined
  >();
  useEffect(() => {
    const removeAppChangeObserver = applicationGroupRef.current.addApplicationChangeObserver(
      () => {
        setApplication(applicationGroupRef.current.application);
      }
    );

    return removeAppChangeObserver;
  }, [applicationGroupRef.current.application]);

  return (
    <ApplicationContext.Provider value={application}>
      {application && <AppComponent application={application} />}
    </ApplicationContext.Provider>
  );
};
