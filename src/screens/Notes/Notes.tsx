import { AppStateType } from '@Lib/ApplicationState';
import { useSignedIn, useSyncStatus } from '@Lib/snjsHooks';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStackNavigationProp } from '@Root/AppStack';
import { SCREEN_NOTES } from '@Screens/screens';
import { ICON_ADD } from '@Style/icons';
import { StyleKit } from '@Style/StyleKit';
import React, { useCallback, useContext, useRef, useState } from 'react';
import FAB from 'react-native-fab';
import {
  CollectionSort,
  ContentType,
  MobilePrefKey,
  Platform,
  SNNote,
} from 'snjs';
import { ThemeContext } from 'styled-components/native';
import { NoteList } from './NoteList';
import { StyledIcon } from './Notes.styled';
import { notePassesFilter, NoteSortKey } from './utils';

type Props = {
  onNoteSelect: (noteUuid: SNNote['uuid']) => void;
  onNoteCreate: () => void;
};

export const Notes: React.FC<Props> = ({ onNoteCreate, onNoteSelect }) => {
  // Context
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  const navigation = useNavigation<
    AppStackNavigationProp<typeof SCREEN_NOTES>['navigation']
  >();

  /**
   * Update sync status
   */
  const [loading, decrypting, refreshing, startRefreshing] = useSyncStatus();
  const signedIn = useSignedIn();

  // State
  const [sortBy, setSortBy] = useState<CollectionSort>(() =>
    application!
      .getPrefsService()
      .getValue(MobilePrefKey.SortNotesBy, CollectionSort.UpdatedAt)
  );
  const [sortReverse, setSortReverse] = useState<boolean>(() =>
    application!
      .getPrefsService()
      .getValue(MobilePrefKey.SortNotesReverse, false)
  );
  const [hideDates, setHideDates] = useState<boolean>(() =>
    application!.getPrefsService().getValue(MobilePrefKey.NotesHideDate, false)
  );
  const [hidePreviews, setHidePreviews] = useState<boolean>(() =>
    application!
      .getPrefsService()
      .getValue(MobilePrefKey.NotesHideNotePreview, false)
  );
  const [notes, setNotes] = useState<SNNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<SNNote['uuid']>();
  const [searchText, setSearchText] = useState('');

  // Ref
  const haveDisplayOptions = useRef(false);

  const reloadTitle = useCallback(
    (newNotes?: SNNote[]) => {
      let title = '';
      if (newNotes && searchText.length > 0) {
        const resultCount = newNotes.length;
        title = `${resultCount} search results`;
      } else if (application?.getAppState().selectedTag) {
        title = application.getAppState().selectedTag!.title;
      }

      if (title) {
        navigation.setParams({
          title,
        });
      }
    },
    [application, navigation, searchText.length]
  );

  /**
   * Note that reloading display options destroys the current index and rebuilds it,
   * so call sparingly. The runtime complexity of destroying and building
   * an index is roughly O(n^2).
   * There are optional parameters to force using the new values,
   * use when React is too slow when updating the state.
   */
  const reloadNotesDisplayOptions = useCallback(
    (
      searchFilter?: string,
      sortOptions?: {
        sortBy?: CollectionSort;
        sortReverse: boolean;
      }
    ) => {
      const tag = application!.getAppState().selectedTag!;
      application!.setNotesDisplayOptions(
        tag,
        sortOptions?.sortBy ?? (sortBy! as CollectionSort),
        sortOptions?.sortReverse ?? sortReverse! ? 'asc' : 'dsc',
        (note: SNNote) => {
          return notePassesFilter(
            note,
            tag?.isArchiveTag,
            false,
            searchFilter?.toLowerCase() || searchText.toLowerCase()
          );
        }
      );
    },
    [application, sortBy, sortReverse, searchText]
  );

  const selectNote = useCallback(
    (noteUuid: SNNote['uuid']) => {
      setSelectedNoteId(noteUuid);
      onNoteSelect(noteUuid);
    },
    [onNoteSelect]
  );

  const createNote = useCallback(() => {
    setSelectedNoteId(undefined);
    onNoteCreate();
  }, [onNoteCreate]);

  const getFirstNonProtectedNote = useCallback(
    (newNotes: SNNote[]) => newNotes.find(note => !note.protected),
    []
  );

  const selectFirstNote = useCallback(
    (newNotes: SNNote[]) => {
      const note = getFirstNonProtectedNote(newNotes);
      if (note) {
        selectNote(note.uuid);
      }
    },
    [getFirstNonProtectedNote, selectNote]
  );

  const selectNextOrCreateNew = useCallback(
    (newNotes: SNNote[]) => {
      const note = getFirstNonProtectedNote(newNotes);
      if (note) {
        selectNote(note.uuid);
      } else {
        application?.getAppState().closeActiveEditor();
      }
    },
    [application, getFirstNonProtectedNote, selectNote]
  );

  const reloadNotes = useCallback(
    (reselectNote?: boolean, tagChanged?: boolean) => {
      const tag = application!.getAppState().selectedTag;
      if (!tag) {
        return;
      }

      /** If no display options we set them initially */
      if (!haveDisplayOptions.current) {
        haveDisplayOptions.current = true;
        reloadNotesDisplayOptions();
      }
      const newNotes = application!.getDisplayableItems(
        ContentType.Note
      ) as SNNote[];
      setNotes(newNotes);
      reloadTitle(newNotes);

      if (reselectNote) {
        if (tagChanged) {
          if (newNotes.length > 0) {
            selectFirstNote(newNotes);
          } else {
            application?.getAppState().closeActiveEditor();
          }
        } else {
          const activeNote = application?.getAppState().getActiveEditor()?.note;
          if (activeNote) {
            const discarded = activeNote.deleted || activeNote.trashed;
            if (
              discarded &&
              !application?.getAppState().selectedTag?.isTrashTag
            ) {
              selectNextOrCreateNew(newNotes);
            }
          } else {
            selectFirstNote(newNotes);
          }
        }
      }
    },
    [
      application,
      reloadNotesDisplayOptions,
      reloadTitle,
      selectFirstNote,
      selectNextOrCreateNew,
    ]
  );

  const streamNotesAndTags = useCallback(() => {
    const removeStreamNotes = application!.streamItems(
      [ContentType.Note],
      async () => {
        /** If a note changes, it will be queried against the existing filter;
         * we dont need to reload display options */
        reloadNotes(true);
      }
    );

    const removeStreamTags = application!.streamItems(
      [ContentType.Tag],
      async () => {
        // const tags = items as SNTag[];
        /** A tag could have changed its relationships, so we need to reload the filter */
        reloadNotesDisplayOptions();
        reloadNotes();
      }
    );

    return () => {
      removeStreamNotes();
      removeStreamTags();
    };
  }, [application, reloadNotes, reloadNotesDisplayOptions]);

  const reloadPreferences = useCallback(async () => {
    let newSortBy = application
      ?.getPrefsService()
      .getValue(MobilePrefKey.SortNotesBy, NoteSortKey.UserUpdatedAt);
    if (
      newSortBy === NoteSortKey.UpdatedAt ||
      newSortBy === NoteSortKey.ClientUpdatedAt
    ) {
      /** Use UserUpdatedAt instead */
      newSortBy = NoteSortKey.UserUpdatedAt;
    }
    let displayOptionsChanged = false;

    const newSortReverse = application
      ?.getPrefsService()
      .getValue(MobilePrefKey.SortNotesReverse, false);
    const newHidePreview = application!
      .getPrefsService()
      .getValue(MobilePrefKey.NotesHideNotePreview, false);
    const newHideDate = application!
      .getPrefsService()
      .getValue(MobilePrefKey.NotesHideDate, false);

    if (sortBy !== newSortBy) {
      setSortBy(newSortBy);
      displayOptionsChanged = true;
    }
    if (sortReverse !== newSortReverse) {
      setSortReverse(newSortReverse);
      displayOptionsChanged = true;
    }
    if (hidePreviews !== newHidePreview) {
      setHidePreviews(newHidePreview);
      displayOptionsChanged = true;
    }
    if (hideDates !== newHideDate) {
      setHideDates(newHideDate);
      displayOptionsChanged = true;
    }

    if (displayOptionsChanged) {
      reloadNotesDisplayOptions(undefined, {
        sortBy: newSortBy,
        sortReverse: newSortReverse,
      });
    }
    reloadNotes();
  }, [
    application,
    sortBy,
    sortReverse,
    hidePreviews,
    hideDates,
    reloadNotes,
    reloadNotesDisplayOptions,
  ]);

  const onRefresh = useCallback(() => {
    startRefreshing();
    application?.sync();
  }, [application, startRefreshing]);

  const onSearchChange = (filter: string) => {
    setSearchText(filter);
    reloadNotesDisplayOptions(filter);
    reloadNotes();
  };

  useFocusEffect(
    useCallback(() => {
      reloadPreferences();
      const removeAppStateChangeHandler = application!
        .getAppState()
        .addStateChangeObserver(state => {
          if (state === AppStateType.TagChanged) {
            reloadNotesDisplayOptions();
            reloadNotes(true, true);
          }
          if (state === AppStateType.PreferencesChanged) {
            reloadPreferences();
          }
        });
      const removeStreams = streamNotesAndTags();

      return () => {
        removeAppStateChangeHandler();
        removeStreams();
      };
    }, [
      application,
      reloadNotes,
      reloadNotesDisplayOptions,
      reloadPreferences,
      streamNotesAndTags,
    ])
  );

  return (
    <>
      <NoteList
        onRefresh={onRefresh}
        hasRefreshControl={signedIn}
        onPressItem={selectNote}
        refreshing={refreshing}
        searchText={searchText}
        onSearchChange={onSearchChange}
        onSearchCancel={() => onSearchChange('')}
        notes={notes}
        sortType={sortBy}
        decrypting={decrypting}
        loading={loading}
        hidePreviews={hidePreviews}
        hideDates={hideDates}
        selectedNoteId={
          application?.getAppState().isInTabletMode ? selectedNoteId : undefined
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
        onClickAction={createNote}
        visible={true}
        size={30}
        paddingTop={application!.platform === Platform.Ios ? 1 : 0}
        iconTextComponent={
          <StyledIcon
            testID="newNoteButton"
            name={StyleKit.nameForIcon(ICON_ADD)}
          />
        }
      />
    </>
  );
};
