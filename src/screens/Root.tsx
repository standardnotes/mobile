import {
  AppStateEventType,
  AppStateType,
  TabletModeChangeData,
} from '@Lib/application_state';
import { useHasEditor, useIsLocked } from '@Lib/snjs_helper_hooks';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ThemeService } from '@Style/theme_service';
import { hexToRGBA } from '@Style/utils';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemeContext } from 'styled-components/native';
import { Compose } from './Compose/Compose';
import { Notes } from './Notes/Notes';
import {
  ComposeContainer,
  Container,
  ExpandTouchable,
  iconNames,
  NotesContainer,
} from './Root.styled';

export const Root = (): JSX.Element | null => {
  // Context
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  const [isLocked] = useIsLocked();

  // State
  const [, setWidth] = useState<number | undefined>(undefined);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [, setX] = useState<number | undefined>(undefined);
  const [hasEditor] = useHasEditor();
  const [noteListCollapsed, setNoteListCollapsed] = useState<boolean>(false);
  const [shouldSplitLayout, setShouldSplitLayout] = useState<
    boolean | undefined
  >(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number | undefined>(
    undefined
  );

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
    const collapseIconPrefix = ThemeService.platformIconPrefix();

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
        <Notes shouldSplitLayout={shouldSplitLayout} />
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
