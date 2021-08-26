import {
  BottomSheet,
  BottomSheetAction,
  BottomSheetExpandableSectionType,
  BottomSheetSectionType,
} from '@Components/BottomSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Editor } from '@Lib/editor';
import {
  useChangeNote,
  useDeleteNoteWithPrivileges,
  useLoadListedExtension,
} from '@Lib/snjs_helper_hooks';
import { str } from '@Lib/strings';
import { useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_NOTE_HISTORY } from '@Screens/screens';
import {
  Action,
  ActionsExtensionMutator,
  SNActionsExtension,
  SNNote,
  UuidString,
} from '@standardnotes/snjs';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Share } from 'react-native';

enum ActionSection {
  History = 'history-section',
  OneShots = 'one-shots-section',
  Switches = 'switches-section',
  Listed = 'listed-section',
}

enum NoteActionKey {
  Pin = 'pin',
  Archive = 'archive',
  PreventEditing = 'prevent-editing',
  Protect = 'protect',
  OpenHistory = 'history',
  ShareAction = 'share',
  Trash = 'trash',
  Restore = 'restore-note',
  DeletePermanently = 'delete-forever',
  Listed = 'listed',
  PreviewInList = 'preview-in-list',
}

type Props = {
  note: SNNote;
  editor?: Editor;
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  listedExtensions: SNActionsExtension[];
  onUnprotect: (uuid: SNNote['uuid']) => void;
  onDismiss?: () => void;
};

export const NoteBottomSheet: React.FC<Props> = ({
  note,
  editor,
  bottomSheetRef,
  listedExtensions,
  onUnprotect,
  onDismiss,
}) => {
  const application = useContext(ApplicationContext);
  const [changeNote] = useChangeNote(note, editor);
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
  const [loadListedExtension] = useLoadListedExtension(note);
  const navigation = useNavigation();
  const [listedSections, setListedSections] = useState<
    BottomSheetSectionType[]
  >([]);
  const [reloadListedExtensionUuid, setReloadListedExtensionUuid] = useState<
    UuidString | undefined
  >();

  const updateAction = useCallback(
    async (
      action: Action,
      extension: SNActionsExtension,
      params: {
        running?: boolean;
        error?: boolean;
      }
    ) => {
      await application?.changeItem(extension.uuid, mutator => {
        const extensionMutator = mutator as ActionsExtensionMutator;
        extensionMutator.actions = extension.actions.map(act => {
          if (
            act &&
            params &&
            act.verb === action.verb &&
            act.url === action.url
          ) {
            return {
              ...action,
              running: params?.running,
              error: params?.error,
            } as Action;
          }
          return act;
        });
      });
    },
    [application]
  );
  const executeAction = useCallback(
    async (action: Action, extension: SNActionsExtension) => {
      await updateAction(action, extension, { running: true });
      const response = await application?.actionsManager!.runAction(
        action,
        note,
        async () => {
          return '';
        }
      );
      if (response?.error) {
        await updateAction(action, extension, { error: true });
        return;
      }
      await updateAction(action, extension, { running: false });
      setReloadListedExtensionUuid(extension.uuid);
    },
    [application, updateAction, note]
  );

  const getListedActionItem = useCallback(
    (action: Action, extension: SNActionsExtension) => {
      const text = action.label;
      const key = `listed${action.id}-action`;
      const callback = async () => {
        await executeAction(action, extension);
      };
      return {
        text,
        key,
        callback,
      };
    },
    [executeAction]
  );

  const getListedSection = useCallback(
    (extension: SNActionsExtension, updatedExtension?: SNActionsExtension) => {
      const key = updatedExtension
        ? `listed-${updatedExtension.uuid}-section`
        : `listed-${extension.uuid}-section`;
      const text = updatedExtension
        ? `${updatedExtension.name} actions`
        : 'Error loading actions';
      const description = updatedExtension
        ? updatedExtension.url.replace(/(.*)\/extension.*/i, '$1')
        : 'Please try again later.';
      const actions =
        updatedExtension && updatedExtension.actions.length > 0
          ? updatedExtension.actions.map(action =>
              getListedActionItem(action, updatedExtension)
            )
          : [
              {
                text: 'No actions available',
                key: `${extension.uuid}-section`,
              },
            ];
      return {
        expandable: true,
        key,
        text,
        description,
        iconType: 'listed',
        actions,
      } as BottomSheetExpandableSectionType;
    },
    [getListedActionItem]
  );

  const getListedSections = useCallback(
    async (extensionToReloadUuid?: UuidString) => {
      const extensions = listedExtensions;
      return await Promise.all(
        extensions
          .sort((a: SNActionsExtension, b: SNActionsExtension) => {
            if (a.name === b.name && a.url === b.url) {
              return a.uuid > b.uuid ? 1 : -1;
            } else if (a.name === b.name) {
              return a.url > b.url ? 1 : -1;
            } else {
              return a.name > b.name ? 1 : -1;
            }
          })
          .map(async extension => {
            let extensionInContext: SNActionsExtension | undefined = extension;
            if (
              extensionToReloadUuid &&
              extension.uuid === extensionToReloadUuid
            ) {
              extensionInContext = await loadListedExtension(extension);
            }
            return getListedSection(extension, extensionInContext);
          })
      );
    },
    [getListedSection, loadListedExtension, listedExtensions]
  );

  useEffect(() => {
    let mounted = true;
    const reloadListedSections = async () => {
      const newSections = await getListedSections(reloadListedExtensionUuid);
      if (mounted) {
        setListedSections(newSections);
      }
    };
    reloadListedSections();
    return () => {
      mounted = false;
    };
  }, [getListedSections, reloadListedExtensionUuid]);

  const historyAction: BottomSheetAction = {
    text: 'Note history',
    key: NoteActionKey.OpenHistory,
    iconType: 'history',
    callback: () => {
      if (!editor?.isTemplateNote) {
        navigation.navigate('HistoryStack', {
          screen: SCREEN_NOTE_HISTORY,
          params: { noteUuid: note.uuid },
        });
      }
    },
    dismissSheetOnPress: true,
  };

  const protectAction: BottomSheetAction = {
    text: 'Protect',
    key: NoteActionKey.Protect,
    iconType: 'textboxPassword',
    switch: {
      value: note.protected,
      onValueChange(value) {
        if (value) {
          application?.protectNote(note);
        } else {
          onUnprotect(note.uuid);
        }
      },
    },
    dismissSheetOnPress: true,
  };

  const pinAction: BottomSheetAction = {
    text: note.pinned ? 'Unpin' : 'Pin to top',
    key: NoteActionKey.Pin,
    iconType: note.pinned ? 'pinOff' : 'pin',
    callback: () =>
      changeNote(mutator => {
        mutator.pinned = !note.pinned;
      }),
    dismissSheetOnPress: true,
  };

  const archiveAction: BottomSheetAction = {
    text: note.archived ? 'Unarchive' : 'Archive',
    key: NoteActionKey.Archive,
    iconType: note.archived ? 'unarchive' : 'archive',
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
  };

  const preventEditingAction: BottomSheetAction = {
    text: str['Prevent editing'],
    key: NoteActionKey.PreventEditing,
    iconType: 'pencilOff',
    dismissSheetOnPress: false,
    switch: {
      onValueChange(value: boolean) {
        changeNote(mutator => {
          mutator.locked = value;
        });
      },
      value: note.locked,
    },
  };

  const previewInListAction: BottomSheetAction = {
    text: str['Preview in list'],
    key: NoteActionKey.PreviewInList,
    iconType: 'eye',
    dismissSheetOnPress: false,
    switch: {
      onValueChange(value: boolean) {
        changeNote(mutator => {
          mutator.hidePreview = !value;
        });
      },
      value: !note.hidePreview,
    },
  };

  const shareAction: BottomSheetAction = {
    text: 'Share',
    key: NoteActionKey.ShareAction,
    iconType: 'share',
    callback: () => {
      if (note) {
        application?.getAppState().performActionWithoutStateChangeImpact(() => {
          Share.share({
            title: note.title,
            message: note.text,
          });
        });
      }
    },
    dismissSheetOnPress: true,
  };

  const restoreAction: BottomSheetAction = {
    text: 'Restore',
    key: NoteActionKey.Restore,
    callback: () => {
      changeNote(mutator => {
        mutator.trashed = false;
      });
    },
    dismissSheetOnPress: true,
  };

  const deleteAction: BottomSheetAction = {
    text: 'Delete permanently',
    key: NoteActionKey.DeletePermanently,
    callback: () => deleteNote(true),
    danger: true,
    dismissSheetOnPress: true,
  };

  const moveToTrashAction: BottomSheetAction = {
    text: str['Move to trash'],
    key: NoteActionKey.Trash,
    iconType: 'trash',
    callback: () => deleteNote(false),
    dismissSheetOnPress: true,
  };

  return (
    <BottomSheet
      bottomSheetRef={bottomSheetRef}
      title={note.title}
      onDismiss={onDismiss}
      sections={
        note.protected
          ? [
              {
                expandable: false,
                actions: [protectAction],
                key: ActionSection.Switches,
              },
            ]
          : [
              {
                expandable: false,
                key: ActionSection.History,
                actions: [historyAction],
              },
              {
                expandable: false,
                key: ActionSection.Switches,
                actions: [
                  previewInListAction,
                  preventEditingAction,
                  protectAction,
                ],
              },
              {
                expandable: false,
                key: ActionSection.OneShots,
                actions: [
                  pinAction,
                  archiveAction,
                  shareAction,
                  ...(note.trashed
                    ? [restoreAction, deleteAction]
                    : [moveToTrashAction]),
                ],
              },
              ...listedSections,
            ]
      }
    />
  );
};
