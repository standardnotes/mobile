import { HeaderTitleView } from '@Components/HeaderTitleView';
import { RouteProp } from '@react-navigation/native';
import {
  createStackNavigator,
  StackNavigationProp,
} from '@react-navigation/stack';
import { NoteHistory } from '@Screens/NoteHistory/NoteHistory';
import { NoteHistoryPreview } from '@Screens/NoteHistory/NoteHistoryPreview';
import {
  SCREEN_NOTE_HISTORY,
  SCREEN_NOTE_HISTORY_PREVIEW,
} from '@Screens/screens';
import React, { useContext } from 'react';
import { NoteHistoryEntry } from 'snjs/dist/@types/services/history/entries/note_history_entry';
import { ThemeContext } from 'styled-components';
import { HeaderTitleParams } from './App';

type HistoryStackNavigatorParamList = {
  [SCREEN_NOTE_HISTORY]:
    | (HeaderTitleParams & { noteUuid: string })
    | (undefined & { noteUuid: string });
  [SCREEN_NOTE_HISTORY_PREVIEW]: HeaderTitleParams & {
    revisionUuid: string;
    revision: NoteHistoryEntry;
  };
};

export type HistoryStackNavigationProp<
  T extends keyof HistoryStackNavigatorParamList
> = {
  navigation: StackNavigationProp<HistoryStackNavigatorParamList, T>;
  route: RouteProp<HistoryStackNavigatorParamList, T>;
};

const MainStack = createStackNavigator<HistoryStackNavigatorParamList>();

export const HistoryStack = () => {
  const theme = useContext(ThemeContext);

  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.stylekitContrastBackgroundColor,
        },
        headerBackTitleVisible: false,
      }}
      initialRouteName={SCREEN_NOTE_HISTORY}
    >
      <MainStack.Screen
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
      <MainStack.Screen
        name={SCREEN_NOTE_HISTORY_PREVIEW}
        options={({ route }) => ({
          title: 'Preview',
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
    </MainStack.Navigator>
  );
};
