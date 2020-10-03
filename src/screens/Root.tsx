import {
  AppStateEventType,
  AppStateType,
  TabletModeChangeData,
} from '@Lib/ApplicationState';
import { useHasEditor, useIsLocked } from '@Lib/snjsHooks';
import { useFocusEffect } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStackNavigationProp } from '@Root/AppStack';
import {
  SCREEN_AUTHENTICATE_PRIVILEGES,
  SCREEN_COMPOSE,
  SCREEN_NOTES,
} from '@Screens/screens';
import { StyleKit } from '@Style/StyleKit';
import { hexToRGBA } from '@Style/utils';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { LayoutChangeEvent } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ProtectedAction, SNNote } from 'snjs/';
import { ThemeContext } from 'styled-components/native';
import { PRIVILEGES_UNLOCK_PAYLOAD } from './Authenticate/AuthenticatePrivileges';
import { Compose } from './Compose/Compose';
import { Notes } from './Notes/Notes';
import {
  ComposeContainer,
  Container,
  ExpandTouchable,
  iconNames,
  NotesContainer,
} from './Root.styled';

type Props = AppStackNavigationProp<typeof SCREEN_NOTES>;

export const Root = (props: Props): JSX.Element | null => {
  // Context
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  const isLocked = useIsLocked();

  // State
  const [, setWidth] = useState<number | undefined>(undefined);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [, setX] = useState<number | undefined>(undefined);
  // const [y, setY] = useState<number | undefined>(undefined);
  const hasEditor = useHasEditor();
  const [noteListCollapsed, setNoteListCollapsed] = useState<boolean>(false);
  const [shouldSplitLayout, setShouldSplitLayout] = useState<
    boolean | undefined
  >(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number | undefined>(
    undefined
  );
  const [expectsUnlock, setExpectsUnlock] = useState(false);

  /**
   * Register observers
   */
  useEffect(() => {
    const removeStateObserver = application
      ?.getAppState()
      .addStateChangeObserver(state => {
        if (state === AppStateType.GainingFocus) {
          application.sync();
        }
      });
    const removeApplicationStateEventHandler = application
      ?.getAppState()
      .addStateEventObserver(
        (event: AppStateEventType, data: TabletModeChangeData | undefined) => {
          if (event === AppStateEventType.TabletModeChange) {
            const eventData = data as TabletModeChangeData;
            if (eventData.new_isInTabletMode && !eventData.old_isInTabletMode) {
              setShouldSplitLayout(true);
            } else if (
              !eventData.new_isInTabletMode &&
              eventData.old_isInTabletMode
            ) {
              setShouldSplitLayout(false);
            }
          }
          if (event === AppStateEventType.KeyboardChangeEvent) {
            // need to refresh the height of the keyboard when it opens so that we can change the position
            // of the sidebar collapse icon
            if (application?.getAppState().isInTabletMode) {
              setKeyboardHeight(application?.getAppState().getKeyboardHeight());
            }
          }
        }
      );
    return () => {
      if (removeApplicationStateEventHandler) {
        removeApplicationStateEventHandler();
      }
      if (removeStateObserver) {
        removeStateObserver();
      }
    };
  }, [application]);

  const collapseIconName = useMemo(() => {
    const collapseIconPrefix = StyleKit.platformIconPrefix();

    return (
      collapseIconPrefix +
      '-' +
      iconNames[collapseIconPrefix][noteListCollapsed ? 0 : 1]
    );
  }, [noteListCollapsed]);

  const onLayout = (e: LayoutChangeEvent) => {
    const tempWidth = e.nativeEvent.layout.width;
    /**
          If you're in tablet mode, but on an iPad where this app is running side by
          side by another app, we only want to show the Compose window and not the
          list, because there isn't enough space.
        */
    const MinWidthToSplit = 450;
    if (application?.getAppState().isTabletDevice) {
      if (tempWidth < MinWidthToSplit) {
        application?.getAppState().setTabletModeEnabled(false);
      } else {
        application?.getAppState().setTabletModeEnabled(true);
      }
    }
    setWidth(tempWidth);
    setHeight(e.nativeEvent.layout.height);
    setX(e.nativeEvent.layout.x);
    setShouldSplitLayout(application?.getAppState().isInTabletMode);
    setKeyboardHeight(application?.getAppState().getKeyboardHeight());
  };

  const openCompose = useCallback(
    (newNote: boolean) => {
      if (!shouldSplitLayout) {
        props.navigation.navigate(SCREEN_COMPOSE, {
          title: newNote ? 'Compose' : 'Note',
        });
      }
    },
    [props.navigation, shouldSplitLayout]
  );

  const openNote = useCallback(
    async (noteUuid: SNNote['uuid']) => {
      await application!.getAppState().openEditor(noteUuid);
      openCompose(false);
    },
    [application, openCompose]
  );

  const onNoteSelect = useCallback(
    async (noteUuid: SNNote['uuid']) => {
      const note = application?.findItem(noteUuid) as SNNote;
      if (note) {
        if (
          note.safeContent.protected &&
          (await application?.privilegesService!.actionRequiresPrivilege(
            ProtectedAction.ViewProtectedNotes
          ))
        ) {
          const privilegeCredentials = await application!.privilegesService!.netCredentialsForAction(
            ProtectedAction.ViewProtectedNotes
          );
          setExpectsUnlock(true);
          props.navigation.navigate(SCREEN_AUTHENTICATE_PRIVILEGES, {
            action: ProtectedAction.ViewProtectedNotes,
            privilegeCredentials,
            unlockedItemId: noteUuid,
            previousScreen: SCREEN_NOTES,
          });
        } else {
          openNote(noteUuid);
        }
      }
    },
    [application, openNote, props.navigation]
  );

  /*
   * After screen is focused read if a requested privilage was unlocked
   */
  useFocusEffect(
    useCallback(() => {
      const readPrivilegesUnlockResponse = async () => {
        if (application?.isLaunched() && expectsUnlock) {
          const result = await application?.getValue(PRIVILEGES_UNLOCK_PAYLOAD);
          if (
            result &&
            result.previousScreen === SCREEN_NOTES &&
            result.unlockedItemId
          ) {
            setExpectsUnlock(false);
            application?.removeValue(PRIVILEGES_UNLOCK_PAYLOAD);
            openNote(result.unlockedItemId);
          } else {
            setExpectsUnlock(false);
          }
        }
      };

      readPrivilegesUnlockResponse();
    }, [application, expectsUnlock, openNote])
  );

  const onNoteCreate = useCallback(async () => {
    await application!.getAppState().createEditor();
    openCompose(true);
  }, [application, openCompose]);

  const toggleNoteList = () => {
    setNoteListCollapsed(value => !value);
  };

  const collapseIconBottomPosition =
    (keyboardHeight ?? 0) > (height ?? 0) / 2 ? keyboardHeight : '50%';

  if (isLocked) {
    return null;
  }

  return (
    <Container testID="rootView" onLayout={onLayout}>
      <NotesContainer
        notesListCollapsed={noteListCollapsed}
        shouldSplitLayout={shouldSplitLayout}
      >
        <Notes onNoteSelect={onNoteSelect} onNoteCreate={onNoteCreate} />
      </NotesContainer>
      {hasEditor && shouldSplitLayout && (
        <ComposeContainer>
          <Compose />
          <ExpandTouchable
            style={{ bottom: collapseIconBottomPosition }}
            onPress={toggleNoteList}
          >
            <Icon
              name={collapseIconName}
              size={24}
              color={hexToRGBA(theme.stylekitInfoColor, 0.85)}
            />
          </ExpandTouchable>
        </ComposeContainer>
      )}
    </Container>
  );
};
