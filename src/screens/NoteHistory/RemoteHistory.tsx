import { ApplicationContext } from '@Root/ApplicationContext';
import { LoadingContainer, LoadingText } from '@Screens/Notes/NoteList.styled';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SNNote } from 'snjs';
import { NoteHistoryEntry } from 'snjs/dist/@types/services/history/entries/note_history_entry';
import {
  RemoteHistoryList,
  RemoteHistoryListEntry,
} from 'snjs/dist/@types/services/history/history_manager';
import { NoteHistoryCell } from './NoteHistoryCell';

type Props = {
  note: SNNote;
  onPress: (uuid: string, revision: NoteHistoryEntry, title: string) => void;
};
export const RemoteHistory: React.FC<Props> = ({ note, onPress }) => {
  // Context
  const application = useContext(ApplicationContext);
  const insets = useSafeAreaInsets();

  // State
  const [remoteHistoryList, setRemoteHistoryList] = useState<
    RemoteHistoryList
  >();
  const [fetchingRemoteHistory, setFetchingRemoteHistory] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchRemoteHistoryList = async () => {
      if (note) {
        setFetchingRemoteHistory(true);
        const newRemoteHistory = await application?.historyManager?.remoteHistoryForItem(
          note
        );
        if (isMounted) {
          setFetchingRemoteHistory(false);
          setRemoteHistoryList(newRemoteHistory);
        }
      }
    };
    fetchRemoteHistoryList();

    return () => {
      isMounted = false;
    };
  }, [application?.historyManager, note]);

  const onItemPress = useCallback(
    async (item: RemoteHistoryListEntry) => {
      const remoteRevision = await application?.historyManager!.fetchRemoteRevision(
        note.uuid,
        item
      );
      if (remoteRevision) {
        onPress(
          item.uuid,
          remoteRevision as NoteHistoryEntry,
          new Date(item.updated_at).toLocaleString()
        );
      } else {
        application?.alertService!.alert(
          'The remote revision could not be loaded. Please try again later.',
          'Error'
        );
        return;
      }
    },
    [application?.alertService, application?.historyManager, note.uuid, onPress]
  );

  const RenderItem:
    | ListRenderItem<RemoteHistoryListEntry>
    | null
    | undefined = ({ item }) => {
    return (
      <NoteHistoryCell
        onPress={() => onItemPress(item)}
        title={new Date(item.updated_at).toLocaleString()}
      />
    );
  };

  if (
    fetchingRemoteHistory ||
    !remoteHistoryList ||
    (remoteHistoryList && remoteHistoryList.length === 0)
  ) {
    const placeholderText = fetchingRemoteHistory
      ? 'Loading entries...'
      : 'No entries.';
    return (
      <LoadingContainer>
        <LoadingText>{placeholderText}</LoadingText>
      </LoadingContainer>
    );
  }

  return (
    <FlatList<RemoteHistoryListEntry>
      keyExtractor={item => item.uuid}
      contentContainerStyle={{ paddingBottom: insets.bottom }}
      initialNumToRender={10}
      windowSize={10}
      keyboardShouldPersistTaps={'never'}
      data={remoteHistoryList}
      renderItem={RenderItem}
    />
  );
};
