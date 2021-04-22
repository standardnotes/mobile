import {
  BottomSheetActionType,
  BottomSheetDefaultSectionType,
  BottomSheetExpandableSectionType,
  BottomSheetSectionType,
} from '@Components/BottomSheet';
import { IconType } from '@Components/Icon';
import { Editor } from '@Lib/editor';
import {
  useChangeNote,
  useDeleteNoteWithPrivileges,
  useListedExtensions,
  useProtectOrUnprotectNote,
} from '@Lib/snjs_helper_hooks';
import { useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_NOTE_HISTORY } from '@Screens/screens';
import { SNNote } from '@standardnotes/snjs/dist/@types';
import { useCallback, useContext, useMemo } from 'react';
import { Share } from 'react-native';

// eslint-disable-next-line no-shadow
export enum ActionSection {
  History = 'history-section',
  CommonActions = 'common-section',
  Listed = 'listed-section',
}

// eslint-disable-next-line no-shadow
export enum NoteAction {
  Pin = 'pin',
  Archive = 'archive',
  Lock = 'lock',
  Protect = 'protect',
  OpenHistory = 'history',
  ShareAction = 'share',
  Trash = 'trash',
  Restore = 'restore-note',
  DeletePermanently = 'delete-forever',
  Listed = 'listed',
}

export const useNoteActionSections = (note: SNNote, editor?: Editor) => {
  const application = useContext(ApplicationContext);
  const [changeNote] = useChangeNote(note, editor);
  const [protectOrUnprotectNote] = useProtectOrUnprotectNote(note);
  const [deleteNote] = useDeleteNoteWithPrivileges(
    note,
    useCallback(async () => {
      await application?.deleteItem(note);
    }, [application, note]),
    useCallback(() => {
      changeNote(mutator => {
        mutator.trashed = true;
      });
    }, [changeNote]),
    editor
  );
  const [listedExtensions] = useListedExtensions(note);
  const navigation = useNavigation();

  const listedSections: BottomSheetExpandableSectionType[] = useMemo(
    () =>
      (listedExtensions || []).map((extension, extensionIndex) => {
        const key = `${extension.name
          .toLowerCase()
          .split(' ')
          .join('-')}-${extensionIndex}`;
        const description = extension.url.replace(/(.*)\/extension.*/i, '$1');
        const actions = extension.actions.map(action => ({
          text: action.label,
          key: `${key}-${action.label}-action`,
        }));
        return {
          expandable: true,
          key: `${key}-section`,
          text: `${extension.name} actions`,
          description,
          iconType: IconType.Listed,
          actions,
        };
      }),
    [listedExtensions]
  );

  const historyAction = useMemo(
    () => ({
      text: 'Note history',
      key: NoteAction.OpenHistory,
      iconType: IconType.History,
      callback: () => {
        if (!editor?.isTemplateNote) {
          navigation.navigate('HistoryStack', {
            screen: SCREEN_NOTE_HISTORY,
            params: { noteUuid: note.uuid },
          });
        }
      },
      dismissSheetOnPress: true,
    }),
    [editor, navigation, note]
  );

  const historySection: BottomSheetDefaultSectionType = useMemo(
    () => ({
      expandable: false,
      key: ActionSection.History,
      actions: [historyAction],
    }),
    [historyAction]
  );

  const protectAction = useMemo(
    () => ({
      text: note.protected ? 'Unprotect' : 'Protect',
      key: NoteAction.Protect,
      iconType: IconType.Protect,
      callback: async () => await protectOrUnprotectNote(),
      dismissSheetOnPress: true,
    }),
    [note, protectOrUnprotectNote]
  );

  const pinAction = useMemo(
    () => ({
      text: note.pinned ? 'Unpin' : 'Pin to top',
      key: NoteAction.Pin,
      iconType: IconType.Pin,
      callback: () =>
        changeNote(mutator => {
          mutator.pinned = !note.pinned;
        }),
      dismissSheetOnPress: true,
    }),
    [changeNote, note]
  );

  const archiveAction = useMemo(
    () => ({
      text: note.archived ? 'Unarchive' : 'Archive',
      key: NoteAction.Archive,
      iconType: IconType.Archive,
      callback: () => {
        if (note.locked) {
          application?.alertService.alert(
            "This note is locked. If you'd like to archive it, unlock it, and try again."
          );
          return;
        }
        changeNote(mutator => {
          mutator.archived = !note.archived;
        });
      },
      dismissSheetOnPress: true,
    }),
    [application, changeNote, note]
  );

  const lockAction = useMemo(
    () => ({
      text: note.locked ? 'Unlock' : 'Lock',
      key: NoteAction.Lock,
      iconType: IconType.Lock,
      callback: () =>
        changeNote(mutator => {
          mutator.locked = !note.locked;
        }),
      dismissSheetOnPress: true,
    }),
    [changeNote, note]
  );

  const shareAction = useMemo(
    () => ({
      text: 'Share',
      key: NoteAction.ShareAction,
      iconType: IconType.Share,
      callback: () => {
        if (note) {
          application
            ?.getAppState()
            .performActionWithoutStateChangeImpact(() => {
              Share.share({
                title: note.title,
                message: note.text,
              });
            });
        }
      },
      dismissSheetOnPress: true,
    }),
    [application, note]
  );

  const restoreAction = useMemo(
    () => ({
      text: 'Restore',
      key: NoteAction.Restore,
      callback: () => {
        changeNote(mutator => {
          mutator.trashed = false;
        });
      },
      dismissSheetOnPress: true,
    }),
    [changeNote]
  );

  const deleteAction = useMemo(
    () => ({
      text: 'Delete permanently',
      key: NoteAction.DeletePermanently,
      callback: async () => await deleteNote(true),
      danger: true,
      dismissSheetOnPress: true,
    }),
    [deleteNote]
  );

  const moveToTrashAction = useMemo(
    () => ({
      text: 'Move to Trash',
      key: NoteAction.Trash,
      iconType: IconType.Trash,
      callback: async () => await deleteNote(false),
      dismissSheetOnPress: true,
    }),
    [deleteNote]
  );

  const commonSection: BottomSheetDefaultSectionType = useMemo(() => {
    const trashActions: BottomSheetActionType[] = note.trashed
      ? [restoreAction, deleteAction]
      : [moveToTrashAction];
    const actions: BottomSheetActionType[] = note.protected
      ? [protectAction]
      : [
          pinAction,
          archiveAction,
          lockAction,
          protectAction,
          shareAction,
          ...trashActions,
        ];

    const section: BottomSheetSectionType = {
      expandable: false,
      key: ActionSection.CommonActions,
      actions: actions,
    };

    return section;
  }, [
    archiveAction,
    deleteAction,
    lockAction,
    moveToTrashAction,
    note.protected,
    note.trashed,
    pinAction,
    protectAction,
    restoreAction,
    shareAction,
  ]);

  const sections: Record<string, BottomSheetSectionType> = useMemo(
    () => ({
      [ActionSection.History]: historySection,
      [ActionSection.CommonActions]: commonSection,
    }),
    [commonSection, historySection]
  );

  const getActionSections = useCallback(
    (sectionType: ActionSection): BottomSheetSectionType[] | [] => {
      switch (sectionType) {
        case ActionSection.Listed:
          return note.protected ? [] : listedSections;
        case ActionSection.CommonActions:
          return [sections[sectionType]];
        default:
          return note.protected ? [] : [sections[sectionType]];
      }
    },
    [listedSections, note.protected, sections]
  );

  return getActionSections;
};
