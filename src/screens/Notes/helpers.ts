import { BottomSheetSectionType } from '@Components/BottomSheet';
import { Editor } from '@Lib/editor';
import {
  useChangeNote,
  useDeleteNoteWithPrivileges,
  useProtectOrUnprotectNote,
} from '@Lib/snjs_helper_hooks';
import { useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_NOTE_HISTORY } from '@Screens/screens';
import { SNNote } from '@standardnotes/snjs/dist/@types';
import {
  ICON_ARCHIVE,
  ICON_BOOKMARK,
  ICON_FINGER_PRINT,
  ICON_HISTORY,
  ICON_LOCK,
  ICON_SHARE,
  ICON_TRASH,
} from '@Style/icons';
import { useContext } from 'react';
import { Share } from 'react-native';

export const ACTION_SECTIONS = {
  HISTORY: 'history-section',
  COMMON_ACTIONS: 'common-section',
};

export const NOTE_ACTIONS = {
  PIN: 'pin',
  ARCHIVE: 'archive',
  LOCK: 'lock',
  PROTECT: 'protect',
  OPEN_HISTORY: 'history',
  SHARE: 'share',
  TRASH: 'trash',
  RESTORE: 'restore-note',
  DELETE_PERMANENTLY: 'delete-forever',
};

export const useNoteActionSections = (note: SNNote, editor?: Editor) => {
  const application = useContext(ApplicationContext);
  const [changeNote] = useChangeNote(note, editor);
  const [protectOrUnprotectNote] = useProtectOrUnprotectNote(note);
  const [deleteNote] = useDeleteNoteWithPrivileges(
    note,
    async () => {
      await application?.deleteItem(note);
    },
    () => {
      changeNote(mutator => {
        mutator.trashed = true;
      });
    },
    editor
  );
  const navigation = useNavigation();

  const sections: Record<string, BottomSheetSectionType> = {
    [ACTION_SECTIONS.HISTORY]: {
      data: [
        {
          text: 'Note history',
          key: NOTE_ACTIONS.OPEN_HISTORY,
          iconName: ICON_HISTORY,
          callback: () => {
            if (!editor?.isTemplateNote) {
              navigation.navigate('HistoryStack', {
                screen: SCREEN_NOTE_HISTORY,
                params: { noteUuid: note.uuid },
              });
            }
          },
        },
      ],
    },
    [ACTION_SECTIONS.COMMON_ACTIONS]: {
      data: [
        {
          text: note.pinned ? 'Unpin' : 'Pin to top',
          key: NOTE_ACTIONS.PIN,
          iconName: ICON_BOOKMARK,
          callback: () =>
            changeNote(mutator => {
              mutator.pinned = !note.pinned;
            }),
        },
        {
          text: note.archived ? 'Unarchive' : 'Archive',
          key: NOTE_ACTIONS.ARCHIVE,
          iconName: ICON_ARCHIVE,
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
        },
        {
          text: note.locked ? 'Unlock' : 'Lock',
          key: NOTE_ACTIONS.LOCK,
          iconName: ICON_LOCK,
          callback: () =>
            changeNote(mutator => {
              mutator.locked = !note.locked;
            }),
        },
        {
          text: note.protected ? 'Unprotect' : 'Protect',
          key: NOTE_ACTIONS.PROTECT,
          iconName: ICON_FINGER_PRINT,
          callback: async () => await protectOrUnprotectNote(),
        },
        {
          text: 'Share',
          key: NOTE_ACTIONS.SHARE,
          iconName: ICON_SHARE,
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
        },
      ],
    },
  };

  if (note.trashed) {
    sections[ACTION_SECTIONS.COMMON_ACTIONS].data = [
      ...sections[ACTION_SECTIONS.COMMON_ACTIONS].data,
      {
        text: 'Restore',
        key: NOTE_ACTIONS.RESTORE,
        callback: () => {
          changeNote(mutator => {
            mutator.trashed = false;
          });
        },
      },
      {
        text: 'Delete permanently',
        key: NOTE_ACTIONS.DELETE_PERMANENTLY,
        callback: async () => deleteNote(true),
        danger: true,
      },
    ];
  } else {
    sections[ACTION_SECTIONS.COMMON_ACTIONS].data.push({
      text: 'Move to Trash',
      key: NOTE_ACTIONS.TRASH,
      iconName: ICON_TRASH,
      callback: () => deleteNote(false),
    });
  }

  return sections;
};
