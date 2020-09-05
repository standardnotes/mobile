import SegmentedControl from '@react-native-community/segmented-control';
import { AppStackNavigationProp } from '@Root/App';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_NOTE_HISTORY } from '@Screens/screens';
import { StyleKitContext } from '@Style/StyleKit';
import React, { useCallback, useContext, useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import {
  NavigationState,
  Route,
  SceneRendererProps,
  TabBar,
  TabView,
} from 'react-native-tab-view';
import { ButtonType, ContentType, PayloadSource, SNNote } from 'snjs';
import { PayloadContent } from 'snjs/dist/@types/protocol/payloads/generator';
import { ThemeContext } from 'styled-components/native';
import { IosTabBarContainer } from './NoteHistory.styled';
import { RemoteHistory } from './RemoteHistory';
import { SessionHistory } from './SessionHistory';

const initialLayout = { width: Dimensions.get('window').width };

type Props = AppStackNavigationProp<typeof SCREEN_NOTE_HISTORY>;
export const NoteHistory = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  const styleKit = useContext(StyleKitContext);

  // State
  const [note] = useState<SNNote>(
    () => application?.findItem(props.route.params.noteUuid) as SNNote
  );
  const [routes] = React.useState([
    { key: 'session', title: 'Session' },
    { key: 'remote', title: 'Remote' },
  ]);
  const [index, setIndex] = useState(0);

  const restore = useCallback(
    async (asCopy: boolean, revisionUuid: string, content: PayloadContent) => {
      const run = async () => {
        if (asCopy) {
          const contentCopy = Object.assign({}, content);
          if (contentCopy.title) {
            contentCopy.title += ' (copy)';
          }
          await application?.createManagedItem(
            ContentType.Note,
            contentCopy,
            true
          );
          props.navigation.popToTop();
        } else {
          await application?.changeAndSaveItem(
            revisionUuid,
            mutator => {
              mutator.setContent(content);
            },
            true,
            PayloadSource.RemoteActionRetrieved
          );
          props.navigation.goBack();
        }
      };

      if (!asCopy) {
        const confirmed = await application?.alertService?.confirm(
          "Are you sure you want to replace the current note's contents with what you see in this preview?",
          'Restore note',
          'Restore',
          ButtonType.Info
        );
        if (confirmed) {
          run();
        }
      } else {
        run();
      }
    },
    [application, props.navigation]
  );

  const renderScene = ({
    route,
  }: {
    route: { key: string; title: string };
  }) => {
    switch (route.key) {
      case 'session':
        return <SessionHistory restoreNote={restore} note={note} />;
      case 'remote':
        return <RemoteHistory restoreNote={restore} note={note} />;
      default:
        return null;
    }
  };

  const renderTabBar = (
    tabBarProps: SceneRendererProps & {
      navigationState: NavigationState<Route>;
    }
  ) => {
    return Platform.OS === 'ios' &&
      parseInt(Platform.Version as string, 10) >= 13 ? (
      <IosTabBarContainer>
        <SegmentedControl
          backgroundColor={theme.stylekitContrastBackgroundColor}
          appearance={styleKit?.keyboardColorForActiveTheme()}
          fontStyle={{
            color: theme.stylekitForegroundColor,
          }}
          values={routes.map(route => route.title)}
          selectedIndex={tabBarProps.navigationState.index}
          onChange={event => {
            setIndex(event.nativeEvent.selectedSegmentIndex);
          }}
        />
      </IosTabBarContainer>
    ) : (
      <TabBar
        {...tabBarProps}
        indicatorStyle={{ backgroundColor: theme.stylekitInfoColor }}
        inactiveColor={theme.stylekitBorderColor}
        activeColor={theme.stylekitInfoColor}
        style={{
          backgroundColor: theme.stylekitBackgroundColor,
          shadowColor: theme.stylekitShadowColor,
        }}
        labelStyle={{ color: theme.stylekitInfoColor }}
      />
    );
  };

  return (
    <TabView
      renderTabBar={renderTabBar}
      navigationState={{ index, routes }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={initialLayout}
    />
  );
};
