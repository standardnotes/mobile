import { AppStateType } from '@Lib/application_state';
import { Editor } from '@Lib/editor';
import { PrefKey } from '@Lib/preferences_manager';
import { useSignedIn, useSyncStatus } from '@Lib/snjs_helper_hooks';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStackNavigationProp } from '@Root/AppStack';
import { PRIVILEGES_UNLOCK_PAYLOAD } from '@Screens/Authenticate/AuthenticatePrivileges';
import {
  SCREEN_AUTHENTICATE_PRIVILEGES,
  SCREEN_COMPOSE,
  SCREEN_NOTES,
} from '@Screens/screens';
import {
  CollectionSort,
  ContentType,
  Platform,
  ProtectedAction,
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
import { notePassesFilter, NoteSortKey } from './utils';

export const Notes = React.memo(
  ({ shouldSplitLayout }: { shouldSplitLayout: boolean | undefined }) => {
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
    const [expectsUnlock, setExpectsUnlock] = useState(false);
    const [editor, setEditor] = useState<Editor | undefined>(undefined);

    // Ref
    const haveDisplayOptions = useRef(false);

    const reloadTitle = useCallback(
      (newNotes?: SNNote[], newFilter?: string) => {
        let title = '';
        if (newNotes && (newFilter ?? searchText).length > 0) {
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
      [application, navigation, searchText]
    );

    const openCompose = useCallback(
      (newNote: boolean) => {
        if (!shouldSplitLayout) {
          navigation.navigate(SCREEN_COMPOSE, {
            title: newNote ? 'Compose' : 'Note',
          });
        }
      },
      [navigation, shouldSplitLayout]
    );

    const openNote = useCallback(
      async (noteUuid: SNNote['uuid']) => {
        await application!.getAppState().openEditor(noteUuid);
        openCompose(false);
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
          if (
            note.protected &&
            (await application?.privilegesService!.actionRequiresPrivilege(
              ProtectedAction.ViewProtectedNotes
            ))
          ) {
            const privilegeCredentials = await application!.privilegesService!.netCredentialsForAction(
              ProtectedAction.ViewProtectedNotes
            );
            setExpectsUnlock(true);
            navigation.navigate(SCREEN_AUTHENTICATE_PRIVILEGES, {
              action: ProtectedAction.ViewProtectedNotes,
              privilegeCredentials,
              unlockedItemId: noteUuid,
              previousScreen: SCREEN_NOTES,
            });
          } else {
            openNote(noteUuid);
          }
        }
      },
      [application, openNote, navigation]
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

    /*
     * After screen is focused read if a requested privilage was unlocked
     */
    useFocusEffect(
      useCallback(() => {
        const readPrivilegesUnlockResponse = async () => {
          if (application?.isLaunched() && expectsUnlock) {
            const result = await application?.getValue(
              PRIVILEGES_UNLOCK_PAYLOAD
            );
            if (
              result &&
              result.previousScreen === SCREEN_NOTES &&
              result.unlockedItemId
            ) {
              setExpectsUnlock(false);
              application?.removeValue(PRIVILEGES_UNLOCK_PAYLOAD);
              openNote(result.unlockedItemId);
            } else {
              setExpectsUnlock(false);
            }
          }
        };

        readPrivilegesUnlockResponse();
      }, [application, expectsUnlock, openNote])
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
              tag?.isArchiveTag || tag?.isTrashTag,
              false,
              searchFilter?.toLowerCase() ?? searchText.toLowerCase()
            );
          }
        );
      },
      [application, sortBy, sortReverse, searchText]
    );

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
      let newSortBy = application
        ?.getPrefsService()
        .getValue(PrefKey.SortNotesBy, NoteSortKey.CreatedAt);
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
        />
        <FAB
          // @ts-ignore style prop does not exist in types
          style={
            application?.getAppState().isInTabletMode
              ? { bottom: application?.getAppState().getKeyboardHeight() }
              : undefined
          }
          buttonColor={theme.stylekitInfoColor}
          iconTextColor={theme.stylekitInfoContrastColor}
          onClickAction={onNoteCreate}
          visible={true}
          size={30}
          paddingTop={application!.platform === Platform.Ios ? 1 : 0}
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
