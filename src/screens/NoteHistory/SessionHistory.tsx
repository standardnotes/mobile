import { ApplicationContext } from '@Root/ApplicationContext';
import { useCustomActionSheet } from '@Style/useCustomActionSheet';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ItemSessionHistory, SNNote } from 'snjs';
import { PayloadContent } from 'snjs/dist/@types/protocol/payloads/generator';
import { NoteHistoryEntry } from 'snjs/dist/@types/services/history/entries/note_history_entry';
import { NoteHistoryCell } from './NoteHistoryCell';

type Props = {
  note: SNNote;
  restoreNote: (
    asCopy: boolean,
    uuid: string,
    content: PayloadContent
  ) => Promise<void>;
};
export const SessionHistory: React.FC<Props> = ({ note, restoreNote }) => {
  // Context
  const application = useContext(ApplicationContext);
  const { showActionSheet } = useCustomActionSheet();
  const insets = useSafeAreaInsets();

  // State
  const [sessionHistory, setSessionHistory] = useState<ItemSessionHistory>();

  useEffect(() => {
    if (note) {
      setSessionHistory(
        application?.historyManager?.sessionHistoryForItem(note)
      );
    }
  }, [application?.historyManager, note]);

  const onPress = useCallback(
    (item: NoteHistoryEntry) => {
      showActionSheet(item.previewTitle(), [
        {
          text: 'Restore',
          callback: () =>
            restoreNote(false, item.payload.uuid, item.payload.safeContent),
        },
        {
          text: 'Restore as copy',
          callback: async () =>
            restoreNote(true, item.payload.uuid, item.payload.safeContent),
        },
      ]);
    },
    [restoreNote, showActionSheet]
  );

  const RenderItem: ListRenderItem<NoteHistoryEntry> | null | undefined = ({
    item,
  }) => {
    return (
      <NoteHistoryCell
        onPress={() => onPress(item)}
        title={item.previewTitle()}
        subTitle={item.previewSubTitle()}
      />
    );
  };

  return (
    <FlatList<NoteHistoryEntry>
      keyExtractor={item => item.previewTitle()}
      contentContainerStyle={{ paddingBottom: insets.bottom }}
      initialNumToRender={10}
      windowSize={10}
      keyboardShouldPersistTaps={'never'}
      data={sessionHistory?.entries as NoteHistoryEntry[]}
      renderItem={RenderItem}
    />
  );
};
