import { HeaderTitleView } from '@Components/HeaderTitleView';
import { IoniconsHeaderButton } from '@Components/IoniconsHeaderButton';
import {
  AppStateEventType,
  AppStateType,
  TabletModeChangeData,
} from '@Lib/application_state';
import { useHasEditor, useIsLocked } from '@Lib/snjs_helper_hooks';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import {
  createStackNavigator,
  StackNavigationProp,
} from '@react-navigation/stack';
import { Compose } from '@Screens/Compose/Compose';
import { NoteHistory } from '@Screens/NoteHistory/NoteHistory';
import { NoteHistoryPreview } from '@Screens/NoteHistory/NoteHistoryPreview';
import { Root } from '@Screens/Root';
import {
  SCREEN_COMPOSE,
  SCREEN_NOTES,
  SCREEN_NOTE_HISTORY,
  SCREEN_NOTE_HISTORY_PREVIEW,
} from '@Screens/screens';
import { MainSideMenu } from '@Screens/SideMenu/MainSideMenu';
import { NoteSideMenu } from '@Screens/SideMenu/NoteSideMenu';
import { ICON_MENU } from '@Style/icons';
import { StyleKit } from '@Style/stylekit';
import { getDefaultDrawerWidth } from '@Style/utils';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Dimensions, Keyboard, ScaledSize } from 'react-native';
import DrawerLayout, {
  DrawerState,
} from 'react-native-gesture-handler/DrawerLayout';
import { HeaderButtons, Item } from 'react-navigation-header-buttons';
import { NoteHistoryEntry } from 'snjs/dist/@types/services/history/entries/note_history_entry';
import { ThemeContext } from 'styled-components';
import { HeaderTitleParams } from './App';
import { ApplicationContext } from './ApplicationContext';
import { ModalStackNavigationProp } from './ModalStack';

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

export type AppStackNavigationProp<
  T extends keyof AppStackNavigatorParamList
> = {
  navigation: CompositeNavigationProp<
    ModalStackNavigationProp<'AppStack'>['navigation'],
    StackNavigationProp<AppStackNavigatorParamList, T>
  >;
  route: RouteProp<AppStackNavigatorParamList, T>;
};

const AppStack = createStackNavigator<AppStackNavigatorParamList>();

export const AppStackComponent = (
  props: ModalStackNavigationProp<'AppStack'>
) => {
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
