import { HeaderTitleView } from '@Components/HeaderTitleView';
import { IoniconsHeaderButton } from '@Components/IoniconsHeaderButton';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { MobileApplication } from '@Lib/application';
import { ApplicationGroup } from '@Lib/applicationGroup';
import {
  AppStateEventType,
  AppStateType,
  TabletModeChangeData,
} from '@Lib/ApplicationState';
import { useHasEditor, useIsLocked } from '@Lib/customHooks';
import {
  NavigationContainer,
  NavigationContainerRef,
  RouteProp,
} from '@react-navigation/native';
import {
  createStackNavigator,
  StackNavigationProp,
} from '@react-navigation/stack';
import { Authenticate } from '@Screens/Authenticate/Authenticate';
import { Compose } from '@Screens/Compose/Compose';
import { PasscodeInputModal } from '@Screens/InputModal/PasscodeInputModal';
import { TagInputModal } from '@Screens/InputModal/TagInputModal';
import { Root } from '@Screens/Root';
import { Settings } from '@Screens/Settings/Settings';
import { MainSideMenu } from '@Screens/SideMenu/MainSideMenu';
import { NoteSideMenu } from '@Screens/SideMenu/NoteSideMenu';
import { ICON_CHECKMARK, ICON_CLOSE, ICON_MENU } from '@Style/icons';
import { StyleKit, StyleKitContext } from '@Style/StyleKit';
import { getDefaultDrawerWidth } from '@Style/Util/getDefaultDraerWidth';
import { Client } from 'bugsnag-react-native';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScaledSize,
  StatusBar,
} from 'react-native';
import DrawerLayout from 'react-native-gesture-handler/DrawerLayout';
import { enableScreens } from 'react-native-screens';
import { HeaderButtons, Item } from 'react-navigation-header-buttons';
import { Challenge } from 'snjs';
import { ThemeContext, ThemeProvider } from 'styled-components/native';
import { ApplicationContext } from './ApplicationContext';
import {
  SCREEN_AUTHENTICATE,
  SCREEN_COMPOSE,
  SCREEN_INPUT_MODAL_PASSCODE,
  SCREEN_INPUT_MODAL_TAG,
  SCREEN_NOTES,
  SCREEN_SETTINGS,
} from './screens/screens';

enableScreens();

if (__DEV__ === false) {
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
  [SCREEN_COMPOSE]: HeaderTitleParams | undefined;
};

type ModalStackNavigatorParamList = {
  AppStack: undefined;
  [SCREEN_SETTINGS]: undefined;
  [SCREEN_INPUT_MODAL_TAG]: HeaderTitleParams & {
    tagUuid?: string;
    noteUuid?: string;
  };
  [SCREEN_INPUT_MODAL_PASSCODE]: undefined;
  [SCREEN_AUTHENTICATE]: {
    challenge: Challenge;
  };
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

const AppStackComponent = (props: ModalStackNavigationProp<'AppStack'>) => {
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  const drawerRef = useRef<DrawerLayout>(null);
  const noteDrawerRef = useRef<DrawerLayout>(null);

  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));
  const [isInTabletMode, setIsInTabletMode] = useState(
    () => application?.getAppState().isInTabletMode
  );

  const isLocked = useIsLocked();

  useEffect(() => {
    const removeObserver = application
      ?.getAppState()
      .addStateChangeObserver(event => {
        if (event === AppStateType.EditorClosed) {
          noteDrawerRef.current?.closeDrawer();
          if (!isInTabletMode) {
            props.navigation.popToTop();
          }
        }
      });

    return removeObserver;
  }, [application, props.navigation, isInTabletMode]);

  const hasEditor = useHasEditor();

  useEffect(() => {
    const updateDimensions = ({ window }: { window: ScaledSize }) => {
      setDimensions(window);
    };

    Dimensions.addEventListener('change', updateDimensions);

    return () => Dimensions.removeEventListener('change', updateDimensions);
  }, []);

  useEffect(() => {
    const remoteTabletModeSubscription = application
      ?.getAppState()
      .addStateEventObserver((event, data) => {
        if (event === AppStateEventType.TabletModeChange) {
          const eventData = data as TabletModeChangeData;
          if (eventData.new_isInTabletMode && !eventData.old_isInTabletMode) {
            setIsInTabletMode(true);
          } else if (
            !eventData.new_isInTabletMode &&
            eventData.old_isInTabletMode
          ) {
            setIsInTabletMode(false);
          }
        }
      });

    return remoteTabletModeSubscription;
  }, [application]);

  return (
    <DrawerLayout
      ref={drawerRef}
      drawerWidth={getDefaultDrawerWidth(dimensions)}
      drawerPosition={'left'}
      drawerType="slide"
      renderNavigationView={() =>
        !isLocked && <MainSideMenu drawerRef={drawerRef.current} />
      }
    >
      <DrawerLayout
        ref={noteDrawerRef}
        drawerWidth={getDefaultDrawerWidth(dimensions)}
        drawerPosition={'right'}
        drawerType="slide"
        drawerLockMode="locked-closed"
        renderNavigationView={() =>
          hasEditor && <NoteSideMenu drawerRef={noteDrawerRef.current} />
        }
      >
        <AppStack.Navigator
          screenOptions={() => ({
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
                    onPress={() => {
                      Keyboard.dismiss();
                      drawerRef.current?.openDrawer();
                    }}
                  />
                </HeaderButtons>
              ),
              headerRight: () =>
                isInTabletMode &&
                hasEditor && (
                  <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
                    <Item
                      testID="noteDrawerButton"
                      disabled={false}
                      title={''}
                      iconName={StyleKit.nameForIcon(ICON_MENU)}
                      onPress={() => {
                        Keyboard.dismiss();
                        noteDrawerRef.current?.openDrawer();
                      }}
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
              headerRight: () =>
                !isInTabletMode && (
                  <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
                    <Item
                      testID="noteDrawerButton"
                      disabled={false}
                      title={''}
                      iconName={StyleKit.nameForIcon(ICON_MENU)}
                      onPress={() => {
                        Keyboard.dismiss();
                        noteDrawerRef.current?.openDrawer();
                      }}
                    />
                  </HeaderButtons>
                ),
            })}
            component={Compose}
          />
        </AppStack.Navigator>
      </DrawerLayout>
    </DrawerLayout>
  );
};

const MainStackComponent = () => {
  const application = useContext(ApplicationContext);

  return (
    <MainStack.Navigator
      screenOptions={{
        gestureEnabled: false,
      }}
      mode="modal"
      initialRouteName="AppStack"
    >
      <MainStack.Screen
        name={'AppStack'}
        options={{
          headerShown: false,
        }}
        component={AppStackComponent}
      />
      <MainStack.Screen
        name={SCREEN_SETTINGS}
        options={() => ({
          title: 'Settings',
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
          headerRight: () =>
            __DEV__ && (
              <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
                <Item
                  testID="headerButton"
                  title={'Destroy Data'}
                  onPress={async () => {
                    await application?.deviceInterface?.removeAllRawStorageValues();
                    await application?.deviceInterface?.removeAllRawDatabasePayloads();
                    application?.deinit();
                  }}
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
              <HeaderTitleView
                title={route.params?.title ?? (children || '')}
              />
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
      <MainStack.Screen
        name={SCREEN_AUTHENTICATE}
        options={() => ({
          title: 'Authenticate',
          headerLeft: () => undefined,
          headerTitle: ({ children }) => {
            return <HeaderTitleView title={children || ''} />;
          },
        })}
        component={Authenticate}
      />
    </MainStack.Navigator>
  );
};

const AppComponent: React.FC<{
  application: MobileApplication;
  env: 'prod' | 'dev';
}> = ({ application, env }) => {
  const [ready, setReady] = useState(false);
  const navigationRef = useRef<NavigationContainerRef>(null);
  const styleKit = useRef<StyleKit | undefined>(undefined);

  useEffect(() => {
    const loadApplication = async () => {
      await application?.prepareForLaunch({
        receiveChallenge: async challenge => {
          application!.promptForChallenge(challenge, navigationRef.current);
        },
      });
      if (env === 'dev') {
        await application?.setHost(
          'https://syncing-server-dev.standardnotes.org/'
        );
      } else {
        await application?.setHost('https://sync.standardnotes.org');
      }
      styleKit.current = new StyleKit(application);
      await styleKit.current.initialize();
      setReady(true);
    };
    setReady(false);
    loadApplication();
  }, [application, env]);

  if (!ready || !styleKit.current) {
    return null;
  }

  return (
    <NavigationContainer
      onReady={() => {
        application?.launch(false);
      }}
      ref={navigationRef}
    >
      <StatusBar translucent />
      {styleKit.current && (
        <>
          <ThemeProvider theme={styleKit.current.theme!}>
            <ActionSheetProvider>
              <StyleKitContext.Provider value={styleKit.current}>
                <MainStackComponent />
              </StyleKitContext.Provider>
            </ActionSheetProvider>
          </ThemeProvider>
        </>
      )}
    </NavigationContainer>
  );
};

const AppGroupInstance = new ApplicationGroup();

export const App = (props: { env: 'prod' | 'dev' }) => {
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
      {application && (
        <AppComponent
          env={props.env}
          key={application.Uuid}
          application={application}
        />
      )}
    </ApplicationContext.Provider>
  );
};
