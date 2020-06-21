import React, { useContext, useState, useEffect, useCallback } from 'react';
import { ApplicationContext } from '@Root/ApplicationContext';
import {
  ContentType,
  SNNote,
  SNTag,
  CollectionSort,
  SNSmartTag,
  Platform,
} from 'snjs';
import { NoteList } from './NoteList';
import FAB from 'react-native-fab';
import { ThemeContext } from 'styled-components/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { StyleKit } from '@Style/StyleKit';
import { ICON_ADD } from '@Style/icons';
import { AppStackNavigationProp } from '@Root/App';
import { SCREEN_NOTES, SCREEN_COMPOSE } from '@Root/screens2/screens';

type Props = {
  onNoteSelect: () => void;
};

export const Notes: React.FC<Props> = props => {
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  const [sortBy, setSortBy] = useState<string>();
  const [sortReverse, setSortReverse] = useState<string>();
  const [notes, setNotes] = useState<SNNote[]>([]);

  // useEffect(() => {
  //   const addNote = async () => {
  //     console.log('testing');
  //     const item = await application?.createManagedItem(ContentType.Note, {
  //       title: 'Testing & Tags',
  //       text: 'test',
  //       references: [],
  //     });
  //     application?.saveItem(item.uuid);
  //   };

  //   addNote();
  // }, [application]);

  const reloadNotes = useCallback(() => {
    const tag = application!.getAppState().selectedTag;
    if (!tag) {
      return;
    }
    setNotes(application!.getDisplayableItems(ContentType.Note) as SNNote[]);
  }, [application]);

  /**
   * Note that reloading display options destroys the current index and rebuilds it,
   * so call sparingly. The runtime complexity of destroying and building
   * an index is roughly O(n^2).
   */
  const reloadNotesDisplayOptions = useCallback(async () => {
    const tag = application!.getAppState().selectedTag!;
    application!.setDisplayOptions(
      ContentType.Note,
      sortBy! as CollectionSort,
      sortReverse! ? 'asc' : 'dsc',
      (note: SNNote) => {
        const matchesTag = tag.isSmartTag()
          ? note.satisfiesPredicate((tag as SNSmartTag).predicate)
          : tag.hasRelationshipWithItem(note);
        return matchesTag;
        // notePassesFilter(
        //   note,
        //   application?.getAppState().selectedTag!,
        //   application?.getAppState().showArchived!,
        //   application?.getAppState().hidePinned!,
        //   application?.getAppState().noteFilter.text.toLowerCase()
        // );
      }
    );
  }, [application, sortBy, sortReverse]);

  const streamNotesAndTags = useCallback(async () => {
    application!.streamItems([ContentType.Note], async items => {
      const tempNotes = items as SNNote[];
      /** Note has changed values, reset its flags */
      for (const note of tempNotes) {
        if (note.deleted) {
          continue;
        }
        // this.loadFlagsForNote(note);
      }
      /** If a note changes, it will be queried against the existing filter;
       * we dont need to reload display options */
      reloadNotes();
      // const activeNote = application!.editorGroup.activeEditor.note;
      // if (activeNote) {
      //   const discarded = activeNote.deleted || activeNote.trashed;
      //   if (discarded) {
      //     this.selectNextOrCreateNew();
      //   }
      // } else {
      //   this.selectFirstNote();
      // }
    });

    application!.streamItems([ContentType.Tag], async items => {
      const tags = items as SNTag[];
      /** A tag could have changed its relationships, so we need to reload the filter */
      reloadNotesDisplayOptions();
      // await this.reloadNotes();
      // if (findInArray(tags, 'uuid', this.appState.selectedTag?.uuid)) {
      //   /** Tag title could have changed */
      //   this.reloadPanelTitle();
      // }
    });
  }, [application, reloadNotes, reloadNotesDisplayOptions]);

  useEffect(() => {
    streamNotesAndTags();
  }, [streamNotesAndTags]);

  const openComposer = () => {
    props.onNoteSelect();
  };

  return (
    <>
      <NoteList
        // onRefresh={this._onRefresh.bind(this)}
        // hasRefreshControl={!Auth.get().offline()}
        // onPressItem={this._onPressItem}
        // refreshing={this.state.refreshing}
        // onSearchChange={this.onSearchTextChange}
        // onSearchCancel={this.onSearchCancel}
        notes={notes}
        // sortType={this.options.sortBy}
        // decrypting={this.state.decrypting}
        // loading={this.state.loading}
        // selectedTags={this.state.tags}
        selectedNoteId={
          application?.getAppState().isInTabletMode
            ? null // selectedNoteId
            : null
        }
      />
      <FAB
        // @ts-ignore style prop does not exist for types
        style={
          application?.getAppState().isInTabletMode
            ? { bottom: application?.getAppState().getKeyboardHeight() }
            : undefined
        }
        buttonColor={theme.stylekitInfoColor}
        iconTextColor={theme.stylekitInfoContrastColor}
        onClickAction={openComposer}
        visible={true}
        size={30}
        paddingTop={application!.platform === Platform.Ios ? 1 : 0}
        iconTextComponent={
          <Icon
            testID="newNoteButton"
            style={{ textAlignVertical: 'center' }}
            name={StyleKit.nameForIcon(ICON_ADD)}
          />
        }
      />
    </>
  );
};
