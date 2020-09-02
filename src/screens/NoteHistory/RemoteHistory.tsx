import { ApplicationContext } from '@Root/ApplicationContext';
import { LoadingContainer, LoadingText } from '@Screens/Notes/NoteList.styled';
import { useCustomActionSheet } from '@Style/useCustomActionSheet';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SNNote } from 'snjs';
import { PayloadContent } from 'snjs/dist/@types/protocol/payloads/generator';
import {
  RemoteHistoryList,
  RemoteHistoryListEntry,
} from 'snjs/dist/@types/services/history/history_manager';
import { NoteHistoryCell } from './NoteHistoryCell';

type Props = {
  note: SNNote;
  restoreNote: (
    asCopy: boolean,
    uuid: string,
    content: PayloadContent
  ) => Promise<void>;
};
export const RemoteHistory: React.FC<Props> = ({ note, restoreNote }) => {
  // Context
  const application = useContext(ApplicationContext);
  const { showActionSheet } = useCustomActionSheet();
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

  const onPress = useCallback(
    async (item: RemoteHistoryListEntry) => {
      const fetchAndRestoreRevision = async (asCopy: boolean) => {
        const remoteRevision = await application?.historyManager!.fetchRemoteRevision(
          note.uuid,
          item
        );
        if (remoteRevision) {
          restoreNote(
            asCopy,
            remoteRevision.payload.uuid,
            remoteRevision.payload.safeContent
          );
        } else {
          application?.alertService!.alert(
            'The remote revision could not be loaded. Please try again later.',
            'Error'
          );
          return;
        }
      };

      showActionSheet(item.updated_at.toLocaleString(), [
        {
          text: 'Restore',
          callback: () => fetchAndRestoreRevision(false),
        },
        {
          text: 'Restore as copy',
          callback: async () => fetchAndRestoreRevision(true),
        },
      ]);
    },
    [
      application?.alertService,
      application?.historyManager,
      note.uuid,
      restoreNote,
      showActionSheet,
    ]
  );

  const RenderItem:
    | ListRenderItem<RemoteHistoryListEntry>
    | null
    | undefined = ({ item }) => {
    return (
      <NoteHistoryCell
        onPress={() => onPress(item)}
        title={new Date(item.updated_at).toLocaleString()}
      />
    );
  };

  if (
    fetchingRemoteHistory ||
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
