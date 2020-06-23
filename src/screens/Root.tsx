import React, { useContext, useState, useEffect } from 'react';
import { LayoutChangeEvent } from 'react-native';
import styled, { css } from 'styled-components/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { Notes } from './Notes/Notes';
import {
  AppStateEventType,
  TabletModeChangeData,
  NoteSideMenuToggleChange,
  AppStateType,
} from '@Lib/ApplicationState';
import { SCREEN_NOTES, SCREEN_COMPOSE } from '@Root/screens2/screens';
import { AppStackNavigationProp } from '@Root/App';
import { SNNote } from 'snjs/dist/@types';

const Container = styled.View`
  flex: 1;
  flex-direction: row;
`;
const NotesContainer = styled.View<{
  shouldSplitLayout?: boolean;
  notesListCollapsed?: boolean;
}>`
  ${({ shouldSplitLayout, notesListCollapsed }) =>
    shouldSplitLayout
      ? css`
          border-right-color: black;
          border-right-width: 1px;
          width: ${notesListCollapsed ? 0 : '40%'};
        `
      : css`
          flex: 1;
        `}
`;
const ComposeContainer = styled.View<{ notesListCollapsed?: boolean }>`
  width: ${props => (props.notesListCollapsed ? '100%' : '60%')};
`;

type Props = AppStackNavigationProp<typeof SCREEN_NOTES>;

export const Root = (props: Props): JSX.Element => {
  const application = useContext(ApplicationContext);
  const [width, setWidth] = useState<number | undefined>(undefined);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [x, setX] = useState<number | undefined>(undefined);
  const [y, setY] = useState<number | undefined>(undefined);
  const [shouldSplitLayout, setShouldSplitLayout] = useState<
    boolean | undefined
  >(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number | undefined>(
    undefined
  );
  const [notesListCollapsed, setNotesListCollapsed] = useState<
    boolean | undefined
  >();

  /**
   * Register observers
   */
  useEffect(() => {
    let removeApplicationStateEventHandler: (() => void) | undefined;
    let removeStateObserver: (() => void) | undefined;
    const startObservers = async () => {
      removeStateObserver = application
        ?.getAppState()
        .addStateChangeObserver(state => {
          if (state === AppStateType.GainingFocus) {
            application.sync();
          }
        });
      removeApplicationStateEventHandler = application
        ?.getAppState()
        .addStateEventObserver(
          (
            event: AppStateEventType,
            data: TabletModeChangeData | NoteSideMenuToggleChange | undefined
          ) => {
            if (event === AppStateEventType.AppStateEventNoteSideMenuToggle) {
              // update state to toggle Notes side menu if we triggered the collapse
              setNotesListCollapsed(
                (data as NoteSideMenuToggleChange).new_isNoteSideMenuCollapsed
              );
            } else if (event === AppStateEventType.KeyboardChangeEvent) {
              // need to refresh the height of the keyboard when it opens so that we can change the position
              // of the sidebar collapse icon
              if (application?.getAppState().isInTabletMode) {
                setKeyboardHeight(
                  application?.getAppState().getKeyboardHeight()
                );
              }
            }
          }
        );
    };
    startObservers();
    return () => {
      if (removeApplicationStateEventHandler) {
        removeApplicationStateEventHandler();
      }
      if (removeStateObserver) {
        removeStateObserver();
      }
    };
  }, [application]);

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
    setNotesListCollapsed(application?.getAppState().isNoteSideMenuCollapsed);
    setKeyboardHeight(application?.getAppState().getKeyboardHeight());
  };

  const openCompose = () => {
    if (shouldSplitLayout) {
    } else {
      props.navigation.navigate(SCREEN_COMPOSE);
    }
  };

  const onNoteSelect = async (noteUuid: SNNote['uuid']) => {
    await application!.getAppState().openEditor(noteUuid);
    openCompose();
  };

  const onNoteCreate = async () => {
    await application!.getAppState().createEditor();
    openCompose();
  };

  return (
    <Container testID="rootView" onLayout={onLayout}>
      <NotesContainer
        shouldSplitLayout={shouldSplitLayout}
        notesListCollapsed={notesListCollapsed}
      >
        <Notes
          // onUnlockPress={this.onUnlockPress}
          onNoteSelect={onNoteSelect}
          onNoteCreate={onNoteCreate}
        />
      </NotesContainer>

      {shouldSplitLayout && (
        <ComposeContainer notesListCollapsed={notesListCollapsed}>
          {/* <Compose
            ref={ref => {
              this.composeRef = ref;
            }}
            selectedTagId={this.state.selectedTagId}
            navigation={this.props.navigation}
          /> */}
          {/*
          <TouchableHighlight

            style={[
              this.styles.toggleButtonContainer,
              this.styles.toggleButton,
              { bottom: collapseIconBottomPosition },
            ]}
            onPress={this.toggleNoteSideMenu}
          >
            <View>
              <Icon
                name={collapseIconName}
                size={24}
                color={hexToRGBA(
                  this.context!.getThemeService().variables.stylekitInfoColor,
                  0.85
                )}
              />
            </View>
          </TouchableHighlight> */}
        </ComposeContainer>
      )}
    </Container>
  );
};
