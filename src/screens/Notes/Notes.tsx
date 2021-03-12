import { AppStateType } from '@Lib/application_state';
import { Editor } from '@Lib/editor';
import { PrefKey } from '@Lib/preferences_manager';
import { useSignedIn, useSyncStatus } from '@Lib/snjs_helper_hooks';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStackNavigationProp } from '@Root/AppStack';
import {
  SCREEN_COMPOSE,
  SCREEN_NOTES,
  SCREEN_VIEW_PROTECTED_NOTE,
} from '@Screens/screens';
import {
  CollectionSort,
  ContentType,
  NotesDisplayCriteria,
  SNNote,
} from '@standardnotes/snjs';
import { ICON_ADD } from '@Style/icons';
import { ThemeService } from '@Style/theme_service';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import FAB from 'react-native-fab';
import { ThemeContext } from 'styled-components/native';
import { NoteList } from './NoteList';
import { StyledIcon } from './Notes.styled';

type SearchOptions = {
  selected: boolean;
  onPress: () => void;
  label: string;
}[];

export const Notes = React.memo(
  ({
    shouldSplitLayout,
    keyboardHeight,
  }: {
    shouldSplitLayout: boolean | undefined;
    keyboardHeight: number | undefined;
  }) => {
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
    const [signedIn] = useSignedIn();

    // State
    const [sortBy, setSortBy] = useState<CollectionSort>(() =>
      application!
        .getPrefsService()
        .getValue(PrefKey.SortNotesBy, CollectionSort.CreatedAt)
    );
    const [sortReverse, setSortReverse] = useState<boolean>(() =>
      application!.getPrefsService().getValue(PrefKey.SortNotesReverse, false)
    );
    const [hideDates, setHideDates] = useState<boolean>(() =>
      application!.getPrefsService().getValue(PrefKey.NotesHideDate, false)
    );
    const [hidePreviews, setHidePreviews] = useState<boolean>(() =>
      application!
        .getPrefsService()
        .getValue(PrefKey.NotesHideNotePreview, false)
    );
    const [notes, setNotes] = useState<SNNote[]>([]);
    const [selectedNoteId, setSelectedNoteId] = useState<SNNote['uuid']>();
    const [searchText, setSearchText] = useState('');
    const [editor, setEditor] = useState<Editor | undefined>(undefined);
    const [searchOptions, setSearchOptions] = useState<SearchOptions>([]);
    const [
      includeProtectedNoteText,
      setIncludeProtectedNoteText,
    ] = useState<boolean>(
      () =>
        !(
          application!.hasProtectionSources() &&
          application!.areProtectionsEnabled()
        )
    );
    const [includeArchivedNotes, setIncludeArchivedNotes] = useState<boolean>(
      true
    );
    const [includeTrashedNotes, setIncludeTrashedNotes] = useState<boolean>(
      true
    );

    // Ref
    const haveDisplayOptions = useRef(false);
    const protectionsEnabled = useRef(
      application!.hasProtectionSources() &&
        application!.areProtectionsEnabled()
    );

    const reloadTitle = useCallback(
      (newNotes?: SNNote[], newFilter?: string) => {
        let title = '';
        if (newNotes && (newFilter ?? searchText).length > 0) {
          const resultCount = newNotes.length;
          title =
            resultCount > 1
              ? `${resultCount} search results`
              : `${resultCount} search result`;
        } else if (application?.getAppState().selectedTag) {
          title = application.getAppState().selectedTag!.title;
        }

        if (title) {
          navigation.setParams({
            title,
          });
        }
      },
      [application, navigation, searchText]
    );

    const openCompose = useCallback(
      (newNote: boolean, replaceScreen: boolean = false) => {
        if (!shouldSplitLayout) {
          if (replaceScreen) {
            navigation.replace(SCREEN_COMPOSE, {
              title: newNote ? 'Compose' : 'Note',
            });
          } else {
            navigation.navigate(SCREEN_COMPOSE, {
              title: newNote ? 'Compose' : 'Note',
            });
          }
        }
      },
      [navigation, shouldSplitLayout]
    );

    const openNote = useCallback(
      async (noteUuid: SNNote['uuid'], replaceScreen: boolean = false) => {
        await application!.getAppState().openEditor(noteUuid);
        openCompose(false, replaceScreen);
      },
      [application, openCompose]
    );

    const onNoteSelect = useCallback(
      async (noteUuid: SNNote['uuid']) => {
        const note = application?.findItem(noteUuid) as SNNote;
        if (note) {
          if (note.errorDecrypting) {
            if (note.waitingForKey) {
              return application?.presentKeyRecoveryWizard();
            } else {
              return application?.alertService.alert(
                'Standard Notes was unable to decrypt this item. Please sign out of your account and back in to attempt to resolve this issue.',
                'Unable to Decrypt'
              );
            }
          }

          if (note.protected && !application?.hasProtectionSources()) {
            return navigation.navigate(SCREEN_VIEW_PROTECTED_NOTE, {
              onPressView: () => openNote(noteUuid, true),
            });
          }
          if (await application?.authorizeNoteAccess(note)) {
            openNote(noteUuid);
          }
        }
      },
      [application, navigation, openNote]
    );

    useEffect(() => {
      let mounted = true;
      const removeEditorObserver = application?.editorGroup.addChangeObserver(
        activeEditor => {
          if (mounted) {
            setEditor(activeEditor);
            setSelectedNoteId(activeEditor?.note?.uuid);
          }
        }
      );
      const removeEditorNoteChangeObserver = editor?.addNoteChangeObserver(
        newNote => {
          if (mounted) {
            setSelectedNoteId(newNote?.uuid);
          }
        }
      );

      return () => {
        mounted = false;
        removeEditorObserver && removeEditorObserver();
        removeEditorNoteChangeObserver && removeEditorNoteChangeObserver();
      };
    }, [application, editor]);

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
        },
        includeProtected?: boolean,
        includeArchived?: boolean,
        includeTrashed?: boolean
      ) => {
        const tag = application!.getAppState().selectedTag;
        const searchQuery =
          searchText || searchFilter
            ? {
                query: searchFilter?.toLowerCase() ?? searchText.toLowerCase(),
                includeProtectedNoteText:
                  includeProtected ?? includeProtectedNoteText,
              }
            : undefined;

        let applyFilters = false;
        if (typeof searchFilter !== 'undefined') {
          applyFilters = searchFilter !== '';
        } else if (typeof searchText !== 'undefined') {
          applyFilters = searchText !== '';
        }

        const criteria = NotesDisplayCriteria.Create({
          sortProperty: sortOptions?.sortBy ?? (sortBy! as CollectionSort),
          sortDirection:
            sortOptions?.sortReverse ?? sortReverse! ? 'asc' : 'dsc',
          tags: tag ? [tag] : [],
          searchQuery: searchQuery,
          includeArchived:
            applyFilters && (includeArchived ?? includeArchivedNotes),
          includeTrashed:
            applyFilters && (includeTrashed ?? includeTrashedNotes),
        });
        application!.setNotesDisplayCriteria(criteria);
      },
      [
        application,
        includeArchivedNotes,
        includeProtectedNoteText,
        includeTrashedNotes,
        sortBy,
        sortReverse,
        searchText,
      ]
    );

    const toggleIncludeProtected = useCallback(async () => {
      const includeProtected = !includeProtectedNoteText;
      const allowToggling = includeProtected
        ? await application?.authorizeSearchingProtectedNotesText()
        : true;

      if (allowToggling) {
        reloadNotesDisplayOptions(undefined, undefined, includeProtected);
        setIncludeProtectedNoteText(includeProtected);
      }
    }, [application, includeProtectedNoteText, reloadNotesDisplayOptions]);

    const toggleIncludeArchived = useCallback(() => {
      const includeArchived = !includeArchivedNotes;
      reloadNotesDisplayOptions(
        undefined,
        undefined,
        undefined,
        includeArchived
      );
      setIncludeArchivedNotes(includeArchived);
    }, [includeArchivedNotes, reloadNotesDisplayOptions]);

    const toggleIncludeTrashed = useCallback(() => {
      const includeTrashed = !includeTrashedNotes;
      reloadNotesDisplayOptions(
        undefined,
        undefined,
        undefined,
        undefined,
        includeTrashed
      );
      setIncludeTrashedNotes(includeTrashed);
    }, [includeTrashedNotes, reloadNotesDisplayOptions]);

    const reloadSearchOptions = useCallback(() => {
      const protections =
        application?.hasProtectionSources() &&
        application?.areProtectionsEnabled();

      if (protections !== protectionsEnabled.current) {
        protectionsEnabled.current = !!protections;
        setIncludeProtectedNoteText(!protections);
      }

      const selectedTag = application?.getAppState().selectedTag;
      const options = [
        {
          label: 'Include Protected Contents',
          selected: includeProtectedNoteText,
          onPress: toggleIncludeProtected,
        },
      ];

      if (selectedTag?.isAllTag) {
        setSearchOptions([
          ...options,
          {
            label: 'Archived',
            selected: includeArchivedNotes,
            onPress: toggleIncludeArchived,
          },
          {
            label: 'Trashed',
            selected: includeTrashedNotes,
            onPress: toggleIncludeTrashed,
          },
        ]);
      } else {
        setSearchOptions(options);
      }
    }, [
      application,
      includeProtectedNoteText,
      includeArchivedNotes,
      includeTrashedNotes,
      toggleIncludeProtected,
      toggleIncludeArchived,
      toggleIncludeTrashed,
    ]);

    const getFirstSelectableNote = useCallback(
      (newNotes: SNNote[]) =>
        newNotes.find(note => !note.protected && !note.errorDecrypting),
      []
    );

    const selectFirstNote = useCallback(
      (newNotes: SNNote[]) => {
        const note = getFirstSelectableNote(newNotes);
        if (note && !loading && !decrypting) {
          onNoteSelect(note.uuid);
        }
      },
      [decrypting, getFirstSelectableNote, loading, onNoteSelect]
    );

    const selectNextOrCreateNew = useCallback(
      (newNotes: SNNote[]) => {
        const note = getFirstSelectableNote(newNotes);
        if (note) {
          onNoteSelect(note.uuid);
        } else {
          application?.getAppState().closeActiveEditor();
        }
      },
      [application, getFirstSelectableNote, onNoteSelect]
    );

    const reloadNotes = useCallback(
      (reselectNote?: boolean, tagChanged?: boolean, searchFilter?: string) => {
        const tag = application!.getAppState().selectedTag;
        if (!tag) {
          return;
        }

        reloadSearchOptions();

        /** If no display options we set them initially */
        if (!haveDisplayOptions.current) {
          haveDisplayOptions.current = true;
          reloadNotesDisplayOptions();
        }

        const newNotes = application!.getDisplayableItems(
          ContentType.Note
        ) as SNNote[];
        let renderedNotes: SNNote[] = newNotes;

        setNotes(renderedNotes);
        reloadTitle(renderedNotes, searchFilter);

        if (reselectNote && application?.getAppState().isTabletDevice) {
          if (tagChanged) {
            if (renderedNotes.length > 0) {
              selectFirstNote(renderedNotes);
            } else {
              application?.getAppState().closeActiveEditor();
            }
          } else {
            const activeNote = application?.getAppState().getActiveEditor()
              ?.note;
            if (activeNote) {
              const discarded = activeNote.deleted || activeNote.trashed;
              if (
                discarded &&
                !application?.getAppState().selectedTag?.isTrashTag
              ) {
                selectNextOrCreateNew(renderedNotes);
              }
            } else {
              selectFirstNote(renderedNotes);
            }
          }
        }
      },
      [
        application,
        reloadNotesDisplayOptions,
        reloadSearchOptions,
        reloadTitle,
        selectFirstNote,
        selectNextOrCreateNew,
      ]
    );

    const onNoteCreate = useCallback(async () => {
      let title = application!.getAppState().isTabletDevice
        ? `Note ${notes.length + 1}`
        : undefined;
      await application!.getAppState().createEditor(title);
      openCompose(true);
      reloadNotes(true);
    }, [application, notes.length, openCompose, reloadNotes]);

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
      const newSortBy = application
        ?.getPrefsService()
        .getValue(PrefKey.SortNotesBy, CollectionSort.CreatedAt);
      let displayOptionsChanged = false;

      const newSortReverse = application
        ?.getPrefsService()
        .getValue(PrefKey.SortNotesReverse, false);
      const newHidePreview = application!
        .getPrefsService()
        .getValue(PrefKey.NotesHideNotePreview, false);
      const newHideDate = application!
        .getPrefsService()
        .getValue(PrefKey.NotesHideDate, false);

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

    const onSearchChange = useCallback(
      (filter: string) => {
        reloadNotesDisplayOptions(filter);
        setSearchText(filter);
        reloadNotes(undefined, undefined, filter);
      },
      [reloadNotes, reloadNotesDisplayOptions]
    );

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
          onPressItem={onNoteSelect}
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
            application?.getAppState().isInTabletMode
              ? selectedNoteId
              : undefined
          }
          searchOptions={searchOptions}
        />
        <FAB
          // @ts-ignore style prop does not exist in types
          style={
            application?.getAppState().isInTabletMode
              ? { bottom: keyboardHeight }
              : undefined
          }
          buttonColor={theme.stylekitInfoColor}
          iconTextColor={theme.stylekitInfoContrastColor}
          onClickAction={onNoteCreate}
          visible={true}
          size={30}
          iconTextComponent={
            <StyledIcon
              testID="newNoteButton"
              name={ThemeService.nameForIcon(ICON_ADD)}
            />
          }
        />
      </>
    );
  }
);
