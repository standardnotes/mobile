import { BottomSheetSectionType } from '@Components/BottomSheet';
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

  const listedSections = useMemo(() => {
    return (listedExtensions || []).map((extension, index) => ({
      key: `${extension.name}-${index}-section`,
      actions: [
        {
          text: `${extension.name} actions`,
          key: extension.package_info.uuid,
          description: extension.url.replace(/(.*)\/extension.*/i, '$1'),
          iconType: IconType.Listed,
        },
      ],
    }));
  }, [listedExtensions]);

  const historySection = useMemo(() => {
    return {
      key: ActionSection.History,
      actions: [
        {
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
        },
      ],
    };
  }, [editor, navigation, note]);

  const commonSection = useMemo(() => {
    const section: BottomSheetSectionType = {
      key: ActionSection.CommonActions,
      actions: [
        {
          text: note.pinned ? 'Unpin' : 'Pin to top',
          key: NoteAction.Pin,
          iconType: IconType.Pin,
          callback: () =>
            changeNote(mutator => {
              mutator.pinned = !note.pinned;
            }),
          dismissSheetOnPress: true,
        },
        {
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
        },
        {
          text: note.locked ? 'Unlock' : 'Lock',
          key: NoteAction.Lock,
          iconType: IconType.Lock,
          callback: () =>
            changeNote(mutator => {
              mutator.locked = !note.locked;
            }),
          dismissSheetOnPress: true,
        },
        {
          text: note.protected ? 'Unprotect' : 'Protect',
          key: NoteAction.Protect,
          iconType: IconType.Protect,
          callback: async () => await protectOrUnprotectNote(),
          dismissSheetOnPress: true,
        },
        {
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
        },
      ],
    };

    if (note.trashed) {
      section.actions = [
        ...section.actions,
        {
          text: 'Restore',
          key: NoteAction.Restore,
          callback: () => {
            changeNote(mutator => {
              mutator.trashed = false;
            });
          },
          dismissSheetOnPress: true,
        },
        {
          text: 'Delete permanently',
          key: NoteAction.DeletePermanently,
          callback: async () => await deleteNote(true),
          danger: true,
          dismissSheetOnPress: true,
        },
      ];
    } else {
      section.actions.push({
        text: 'Move to Trash',
        key: NoteAction.Trash,
        iconType: IconType.Trash,
        callback: async () => await deleteNote(false),
        dismissSheetOnPress: true,
      });
    }

    return section;
  }, [application, changeNote, deleteNote, note, protectOrUnprotectNote]);

  const sections: Record<string, BottomSheetSectionType> = useMemo(
    () => ({
      [ActionSection.History]: historySection,
      [ActionSection.CommonActions]: commonSection,
    }),
    [commonSection, historySection]
  );

  const getActionSections = useCallback(
    (sectionType: ActionSection) => {
      switch (sectionType) {
        case ActionSection.Listed:
          return listedSections;
        default:
          return [sections[sectionType]];
      }
    },
    [listedSections, sections]
  );

  return getActionSections;
};
