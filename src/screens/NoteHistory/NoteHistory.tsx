import SegmentedControl from '@react-native-community/segmented-control';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStackNavigationProp } from '@Root/AppStack';
import {
  SCREEN_NOTE_HISTORY,
  SCREEN_NOTE_HISTORY_PREVIEW,
} from '@Screens/screens';
import { StyleKitContext } from '@Style/stylekit';
import React, { useContext, useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import {
  NavigationState,
  Route,
  SceneRendererProps,
  TabBar,
  TabView,
} from 'react-native-tab-view';
import { SNNote } from 'snjs';
import { NoteHistoryEntry } from 'snjs/dist/@types/services/history/entries/note_history_entry';
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

  const openPreview = (
    uuid: string,
    revision: NoteHistoryEntry,
    title: string
  ) => {
    props.navigation.navigate(SCREEN_NOTE_HISTORY_PREVIEW, {
      title,
      revisionUuid: uuid,
      revision,
    });
  };

  const renderScene = ({
    route,
  }: {
    route: { key: string; title: string };
  }) => {
    switch (route.key) {
      case 'session':
        return <SessionHistory onPress={openPreview} note={note} />;
      case 'remote':
        return <RemoteHistory onPress={openPreview} note={note} />;
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
