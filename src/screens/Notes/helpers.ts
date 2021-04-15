import { BottomSheetSectionType } from '@Components/BottomSheet';
import { IconType } from '@Components/Icon';
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
import { useContext } from 'react';
import { Share } from 'react-native';

// eslint-disable-next-line no-shadow
export enum ActionSection {
  History = 'history-section',
  CommonActions = 'common-section',
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
}

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
    [ActionSection.History]: {
      data: [
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
        },
      ],
    },
    [ActionSection.CommonActions]: {
      data: [
        {
          text: note.pinned ? 'Unpin' : 'Pin to top',
          key: NoteAction.Pin,
          iconType: IconType.Pin,
          callback: () =>
            changeNote(mutator => {
              mutator.pinned = !note.pinned;
            }),
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
        },
        {
          text: note.locked ? 'Unlock' : 'Lock',
          key: NoteAction.Lock,
          iconType: IconType.Lock,
          callback: () =>
            changeNote(mutator => {
              mutator.locked = !note.locked;
            }),
        },
        {
          text: note.protected ? 'Unprotect' : 'Protect',
          key: NoteAction.Protect,
          iconType: IconType.Protect,
          callback: async () => await protectOrUnprotectNote(),
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
        },
      ],
    },
  };

  if (note.trashed) {
    sections[ActionSection.CommonActions].data = [
      ...sections[ActionSection.CommonActions].data,
      {
        text: 'Restore',
        key: NoteAction.Restore,
        callback: () => {
          changeNote(mutator => {
            mutator.trashed = false;
          });
        },
      },
      {
        text: 'Delete permanently',
        key: NoteAction.DeletePermanently,
        callback: async () => deleteNote(true),
        danger: true,
      },
    ];
  } else {
    sections[ActionSection.CommonActions].data.push({
      text: 'Move to Trash',
      key: NoteAction.Trash,
      iconType: IconType.Trash,
      callback: () => deleteNote(false),
    });
  }

  return sections;
};
