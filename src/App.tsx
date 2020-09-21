import { BlockingModal } from '@Components/BlockingModal';
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
import { navigationRef } from '@Lib/NavigationService';
import { useHasEditor, useIsLocked } from '@Lib/snjsHooks';
import {
  CompositeNavigationProp,
  DefaultTheme,
  NavigationContainer,
  RouteProp,
} from '@react-navigation/native';
import {
  createStackNavigator,
  StackNavigationProp,
} from '@react-navigation/stack';
import { Authenticate } from '@Screens/Authenticate/Authenticate';
import { AuthenticatePrivileges } from '@Screens/Authenticate/AuthenticatePrivileges';
import { Compose } from '@Screens/Compose/Compose';
import { PasscodeInputModal } from '@Screens/InputModal/PasscodeInputModal';
import { TagInputModal } from '@Screens/InputModal/TagInputModal';
import { NoteHistory } from '@Screens/NoteHistory/NoteHistory';
import { NoteHistoryPreview } from '@Screens/NoteHistory/NoteHistoryPreview';
import { Root } from '@Screens/Root';
import { ManagePrivileges } from '@Screens/Settings/ManagePrivileges';
import { Settings } from '@Screens/Settings/Settings';
import { MainSideMenu } from '@Screens/SideMenu/MainSideMenu';
import { NoteSideMenu } from '@Screens/SideMenu/NoteSideMenu';
import { ICON_CHECKMARK, ICON_CLOSE, ICON_MENU } from '@Style/icons';
import { StyleKit, StyleKitContext } from '@Style/StyleKit';
import { StyleKitTheme } from '@Style/Themes/styled-components';
import { getDefaultDrawerWidth } from '@Style/Util/getDefaultDrawerWidth';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScaledSize,
  StatusBar,
} from 'react-native';
import DrawerLayout, {
  DrawerState,
} from 'react-native-gesture-handler/DrawerLayout';
import { HeaderButtons, Item } from 'react-navigation-header-buttons';
import {
  Challenge,
  DeinitSource,
  PrivilegeCredential,
  ProtectedAction,
} from 'snjs';
import { NoteHistoryEntry } from 'snjs/dist/@types/services/history/entries/note_history_entry';
import { ThemeContext, ThemeProvider } from 'styled-components/native';
import { ApplicationContext } from './ApplicationContext';
import {
  MODAL_BLOCKING_ALERT,
  SCREEN_AUTHENTICATE,
  SCREEN_AUTHENTICATE_PRIVILEGES,
  SCREEN_COMPOSE,
  SCREEN_INPUT_MODAL_PASSCODE,
  SCREEN_INPUT_MODAL_TAG,
  SCREEN_MANAGE_PRIVILEGES,
  SCREEN_NOTES,
  SCREEN_NOTE_HISTORY,
  SCREEN_NOTE_HISTORY_PREVIEW,
  SCREEN_SETTINGS,
} from './screens/screens';

type HeaderTitleParams = {
  title?: string;
  subTitle?: string;
  subTitleColor?: string;
};

type AppStackNavigatorParamList = {
  [SCREEN_NOTES]: HeaderTitleParams;
  [SCREEN_COMPOSE]: HeaderTitleParams | undefined;
  [SCREEN_NOTE_HISTORY]:
    | (HeaderTitleParams & { noteUuid: string })
    | (undefined & { noteUuid: string });
  [SCREEN_NOTE_HISTORY_PREVIEW]: HeaderTitleParams & {
    revisionUuid: string;
    revision: NoteHistoryEntry;
  };
};

type ModalStackNavigatorParamList = {
  AppStack: undefined;
  [SCREEN_SETTINGS]: undefined;
  [SCREEN_MANAGE_PRIVILEGES]: undefined;
  [SCREEN_INPUT_MODAL_TAG]: HeaderTitleParams & {
    tagUuid?: string;
    noteUuid?: string;
  };
  [SCREEN_INPUT_MODAL_PASSCODE]: undefined;
  [SCREEN_AUTHENTICATE]: {
    challenge: Challenge;
  };
  [SCREEN_AUTHENTICATE_PRIVILEGES]: {
    action: ProtectedAction;
    privilegeCredentials: PrivilegeCredential[];
    previousScreen: string;
    unlockedItemId?: string;
  };
  [MODAL_BLOCKING_ALERT]: {
    title?: string;
    text: string;
  };
};
export type AppStackNavigationProp<
  T extends keyof AppStackNavigatorParamList
> = {
  navigation: CompositeNavigationProp<
    ModalStackNavigationProp<'AppStack'>['navigation'],
    StackNavigationProp<AppStackNavigatorParamList, T>
  >;
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

  const handleDrawerStateChange = useCallback(
    (newState: DrawerState, drawerWillShow: boolean) => {
      if (newState !== 'Idle' && drawerWillShow) {
        application?.getAppState().onDrawerOpen();
      }
    },
    [application]
  );

  return (
    <DrawerLayout
      ref={drawerRef}
      drawerWidth={getDefaultDrawerWidth(dimensions)}
      drawerPosition={'left'}
      drawerType="slide"
      onDrawerStateChanged={handleDrawerStateChange}
      renderNavigationView={() =>
        !isLocked && <MainSideMenu drawerRef={drawerRef.current} />
      }
    >
      <DrawerLayout
        ref={noteDrawerRef}
        drawerWidth={getDefaultDrawerWidth(dimensions)}
        onDrawerStateChanged={handleDrawerStateChange}
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
          <AppStack.Screen
            name={SCREEN_NOTE_HISTORY}
            options={({ route }) => ({
              title: 'Note history',
              headerTitle: ({ children }) => {
                return (
                  <HeaderTitleView
                    title={route.params?.title ?? (children || '')}
                    subtitle={route.params?.subTitle}
                    subtitleColor={route.params?.subTitleColor}
                  />
                );
              },
            })}
            component={NoteHistory}
          />
          <AppStack.Screen
            name={SCREEN_NOTE_HISTORY_PREVIEW}
            options={({ route }) => ({
              title: 'Preview',
              headerBackTitleVisible: false,
              headerTitle: ({ children }) => {
                return (
                  <HeaderTitleView
                    title={route.params?.title ?? (children || '')}
                    subtitle={route.params?.subTitle || undefined}
                    subtitleColor={route.params?.subTitleColor || undefined}
                  />
                );
              },
            })}
            component={NoteHistoryPreview}
          />
        </AppStack.Navigator>
      </DrawerLayout>
    </DrawerLayout>
  );
};

const MainStackComponent = ({ env }: { env: 'prod' | 'dev' }) => {
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);

  return (
    <MainStack.Navigator
      screenOptions={{
        gestureEnabled: false,
        headerStyle: {
          backgroundColor: theme.stylekitContrastBackgroundColor,
        },
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
            (env === 'dev' || __DEV__) && (
              <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
                <Item
                  testID="headerButton"
                  title={'Destroy Data'}
                  onPress={async () => {
                    await application?.deviceInterface?.removeAllRawStorageValues();
                    await application?.deviceInterface?.removeAllRawDatabasePayloads(
                      application?.identifier
                    );
                    application?.deinit(DeinitSource.SignOut);
                  }}
                />
              </HeaderButtons>
            ),
        })}
        component={Settings}
      />
      <MainStack.Screen
        name={SCREEN_MANAGE_PRIVILEGES}
        options={() => ({
          title: 'Privileges',
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
        component={ManagePrivileges}
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
      <MainStack.Screen
        name={SCREEN_AUTHENTICATE_PRIVILEGES}
        options={() => ({
          title: 'Authenticate',
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
          headerTitle: ({ children }) => {
            return <HeaderTitleView title={children || ''} />;
          },
        })}
        component={AuthenticatePrivileges}
      />
      <MainStack.Screen
        name={MODAL_BLOCKING_ALERT}
        options={() => ({
          headerShown: false,
          cardStyle: { backgroundColor: 'rgba(0, 0, 0, 0.15)' },
          cardOverlayEnabled: true,
          cardStyleInterpolator: ({ current: { progress } }) => ({
            cardStyle: {
              opacity: progress.interpolate({
                inputRange: [0, 0.5, 0.9, 1],
                outputRange: [0, 0.25, 0.7, 1],
              }),
            },
            overlayStyle: {
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
                extrapolate: 'clamp',
              }),
            },
          }),
        })}
        component={BlockingModal}
      />
    </MainStack.Navigator>
  );
};

const AppComponent: React.FC<{
  application: MobileApplication;
  env: 'prod' | 'dev';
}> = ({ application, env }) => {
  const styleKit = useRef<StyleKit>();
  const [activeTheme, setActiveTheme] = useState<StyleKitTheme | undefined>();

  const setStyleKitRef = useCallback((node: StyleKit | undefined) => {
    if (node) {
      node.addThemeChangeObserver(() => {
        setActiveTheme(node.theme);
      });
    }

    // Save a reference to the node
    styleKit.current = node;
  }, []);

  useEffect(() => {
    let styleKitInstance: StyleKit;
    const loadApplication = async () => {
      styleKitInstance = new StyleKit(application);

      setStyleKitRef(styleKitInstance);
      setActiveTheme(styleKitInstance.theme);
      await application?.prepareForLaunch({
        receiveChallenge: async challenge => {
          application!.promptForChallenge(challenge);
        },
      });
      await styleKitInstance.init();
    };

    loadApplication();

    return () => {
      styleKitInstance?.deinit();
      setStyleKitRef(undefined);
    };
  }, [application, application.Uuid, env, setStyleKitRef]);

  if (!styleKit.current || !activeTheme) {
    return null;
  }

  return (
    <NavigationContainer
      onReady={() => application?.launch()}
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: activeTheme.stylekitBackgroundColor,
          border: activeTheme.stylekitBorderColor,
        },
      }}
      ref={navigationRef}
    >
      <StatusBar translucent />
      {styleKit.current && (
        <>
          <ThemeProvider theme={activeTheme}>
            <ActionSheetProvider>
              <StyleKitContext.Provider value={styleKit.current}>
                <MainStackComponent env={env} />
              </StyleKitContext.Provider>
            </ActionSheetProvider>
          </ThemeProvider>
        </>
      )}
    </NavigationContainer>
  );
};

const AppGroupInstance = new ApplicationGroup();
AppGroupInstance.initialize();

export const App = (props: { env: 'prod' | 'dev' }) => {
  const applicationGroupRef = useRef(AppGroupInstance);
  const [application, setApplication] = useState<
    MobileApplication | undefined
  >();
  useEffect(() => {
    const removeAppChangeObserver = applicationGroupRef.current.addApplicationChangeObserver(
      () => {
        const mobileApplication = applicationGroupRef.current
          .primaryApplication as MobileApplication;
        setApplication(mobileApplication);
      }
    );
    return removeAppChangeObserver;
  }, [applicationGroupRef.current.primaryApplication]);
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
