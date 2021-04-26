import {
  BottomSheet,
  BottomSheetActionType,
  BottomSheetDefaultSectionType,
  BottomSheetExpandableSectionType,
  BottomSheetSectionType,
} from '@Components/BottomSheet';
import { IconType } from '@Components/Icon';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Editor } from '@Lib/editor';
import {
  useChangeNote,
  useDeleteNoteWithPrivileges,
  useProtectOrUnprotectNote,
} from '@Lib/snjs_helper_hooks';
import { useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_NOTE_HISTORY } from '@Screens/screens';
import {
  Action,
  ActionsExtensionMutator,
  SNActionsExtension,
  SNNote,
  UuidString,
} from '@standardnotes/snjs/dist/@types';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Share } from 'react-native';

enum ActionSection {
  History = 'history-section',
  CommonActions = 'common-section',
  Listed = 'listed-section',
}

enum NoteAction {
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

type Props = {
  note: SNNote;
  editor?: Editor;
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  listedExtensions: SNActionsExtension[];
  loadListedExtension: (
    extension: SNActionsExtension
  ) => Promise<SNActionsExtension | undefined>;
};

export const NoteBottomSheet: React.FC<Props> = ({
  note,
  editor,
  bottomSheetRef,
  listedExtensions,
  loadListedExtension,
}) => {
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

  const getListedExpandableSection = useCallback(
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
        iconType: IconType.Listed,
        actions,
      } as BottomSheetExpandableSectionType;
    },
    [getListedActionItem]
  );

  const getReloadedListedSection = useCallback(
    async (
      extension: SNActionsExtension,
      extensionToReloadUuid?: UuidString
    ) => {
      const extensionInContext = extensionToReloadUuid
        ? await loadListedExtension(extension)
        : extension;
      return getListedExpandableSection(extension, extensionInContext);
    },
    [getListedExpandableSection, loadListedExtension]
  );

  const getReloadedListedSections = useCallback(
    async (extensionToReloadUuid?: UuidString) => {
      const extensions = listedExtensions;
      return await Promise.all(
        extensions
          .sort((a: SNActionsExtension, b: SNActionsExtension) =>
            a.uuid > b.uuid ? 1 : -1
          )
          .map(async extension =>
            getReloadedListedSection(extension, extensionToReloadUuid)
          )
      );
    },
    [getReloadedListedSection, listedExtensions]
  );

  useEffect(() => {
    let mounted = true;
    const reloadListedSections = async () => {
      const newSections = await getReloadedListedSections(
        reloadListedExtensionUuid
      );
      if (mounted) {
        setListedSections(newSections);
      }
    };
    reloadListedSections();
    return () => {
      mounted = false;
    };
  }, [getReloadedListedSections, reloadListedExtensionUuid]);

  const historyAction = {
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
  };

  const historySection: BottomSheetDefaultSectionType = {
    expandable: false,
    key: ActionSection.History,
    actions: [historyAction],
  };

  const protectAction = {
    text: note.protected ? 'Unprotect' : 'Protect',
    key: NoteAction.Protect,
    iconType: IconType.Protect,
    callback: async () => await protectOrUnprotectNote(),
    dismissSheetOnPress: true,
  };

  const pinAction = {
    text: note.pinned ? 'Unpin' : 'Pin to top',
    key: NoteAction.Pin,
    iconType: IconType.Pin,
    callback: () =>
      changeNote(mutator => {
        mutator.pinned = !note.pinned;
      }),
    dismissSheetOnPress: true,
  };

  const archiveAction = {
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
  };

  const lockAction = {
    text: note.locked ? 'Unlock' : 'Lock',
    key: NoteAction.Lock,
    iconType: IconType.Lock,
    callback: () =>
      changeNote(mutator => {
        mutator.locked = !note.locked;
      }),
    dismissSheetOnPress: true,
  };

  const shareAction = {
    text: 'Share',
    key: NoteAction.ShareAction,
    iconType: IconType.Share,
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

  const restoreAction = {
    text: 'Restore',
    key: NoteAction.Restore,
    callback: () => {
      changeNote(mutator => {
        mutator.trashed = false;
      });
    },
    dismissSheetOnPress: true,
  };

  const deleteAction = {
    text: 'Delete permanently',
    key: NoteAction.DeletePermanently,
    callback: async () => await deleteNote(true),
    danger: true,
    dismissSheetOnPress: true,
  };

  const moveToTrashAction = {
    text: 'Move to Trash',
    key: NoteAction.Trash,
    iconType: IconType.Trash,
    callback: async () => await deleteNote(false),
    dismissSheetOnPress: true,
  };

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

  const commonSection: BottomSheetDefaultSectionType = {
    expandable: false,
    key: ActionSection.CommonActions,
    actions: actions,
  };

  const title = note.protected ? note.safeTitle() : note.title;

  const sections = note.protected
    ? [commonSection]
    : [historySection, commonSection, ...listedSections];

  return (
    <BottomSheet
      bottomSheetRef={bottomSheetRef}
      title={title}
      sections={sections}
    />
  );
};
