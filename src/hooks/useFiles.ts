import { useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_INPUT_MODAL_FILE_NAME } from '@Screens/screens';
import { TAppStackNavigationProp } from '@Screens/UploadedFilesList/UploadedFileItem';
import {
  UploadedFileItemAction,
  UploadedFileItemActionType,
} from '@Screens/UploadedFilesList/UploadedFileItemAction';
import {
  ChallengeReason,
  ContentType,
  SNFile,
  SNNote,
} from '@standardnotes/snjs';
import { useCustomActionSheet } from '@Style/custom_action_sheet';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import RNFS, { exists } from 'react-native-fs';
import RNShare from 'react-native-share';
import Toast from 'react-native-toast-message';

type Props = {
  note: SNNote;
};

export const useFiles = ({ note }: Props) => {
  const application = useContext(ApplicationContext);

  const { showActionSheet } = useCustomActionSheet();
  const navigation = useNavigation<TAppStackNavigationProp>();

  const [attachedFiles, setAttachedFiles] = useState<SNFile[]>([]);
  const [allFiles, setAllFiles] = useState<SNFile[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFileProtected, setIsFileProtected] = useState(false);

  const reloadAttachedFiles = useCallback(() => {
    if (!application || !note) {
      return [];
    }
    setAttachedFiles(
      application.items
        .getFilesForNote(note)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    );
  }, [application, note]);

  const reloadAllFiles = useCallback(() => {
    if (!application) {
      return [];
    }
    setAllFiles(
      application.items
        .getItems(ContentType.File)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)) as SNFile[]
    );
  }, [application]);

  const deleteFile = useCallback(
    async (file: SNFile) => {
      if (!application) {
        return;
      }
      const shouldDelete = await application.alertService.confirm(
        `Are you sure you want to permanently delete "${file.name}"?`,
        'Delete file',
        'Delete'
      );
      if (shouldDelete) {
        /*Toast.show({
          type: 'info',
          text1: `Deleting file "${file.name}"...`,
        });

        await application.files.deleteFile(file);

        Toast.show({
          type: 'success',
          text1: `Deleted file "${file.name}"`,
        });*/
      }
    },
    [application]
  );

  const deleteFileAtPath = useCallback(async (path: string) => {
    try {
      if (await exists(path)) {
        await RNFS.unlink(path);
      }
    } catch (err) {}
  }, []);

  const shareFile = useCallback(
    (file: SNFile, path: string) => {
      if (!application) {
        return;
      }
      application
        .getAppState()
        .performActionWithoutStateChangeImpact(async () => {
          try {
            const shareDialogResponse = await RNShare.open({
              url: `file://${path}`,
              failOnCancel: false,
            });
            // On Android this response always returns {success: false}, there is an open issue for that:
            //  https://github.com/react-native-share/react-native-share/issues/1059
            console.log('shareDialogResponse is', shareDialogResponse);

            // On iOS the user can store files locally from "Share" screen, so we don't show "Download" option there.
            // For Android the user has a separate "Download" action for the file, therefore after the file is shared,
            // it's not needed anymore and we remove it from the storage.
            if (Platform.OS === 'android') {
              await deleteFileAtPath(path);
            }
            if (shareDialogResponse.success) {
              Toast.show({
                type: 'success',
                text1: 'Successfully exported file',
              });
            }
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: 'There was an error while sharing the file',
            });
          }
        });
    },
    [application, deleteFileAtPath]
  );

  const downloadFile = useCallback(
    async (file: SNFile, showShareScreen = false) => {
      if (isDownloading || !application) {
        return;
      }
      const filesService = application.getFilesService();
      const isGrantedStoragePermissionOnAndroid =
        await filesService.hasStoragePermissionOnAndroid();

      if (!isGrantedStoragePermissionOnAndroid) {
        return;
      }
      setIsDownloading(true);

      try {
        Toast.show({
          type: 'info',
          text1: 'Downloading file...',
          autoHide: false,
        });

        const path = filesService.getDestinationPath(
          file.name,
          showShareScreen
        );

        // Overwrite any existing file with that name
        await deleteFileAtPath(path);

        await filesService.downloadFileInChunks(file, path);

        Toast.hide();

        if (showShareScreen) {
          await shareFile(file, path);
          return;
        }

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Successfully downloaded file',
        });
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'There was an error while downloading the file',
        });
      } finally {
        setIsDownloading(false);
      }
    },
    [application, deleteFileAtPath, isDownloading, shareFile]
  );

  const attachFileToNote = useCallback(
    async (file: SNFile) => {
      if (!application || !note) {
        return;
      }
      await application.items.associateFileWithNote(file, note);
      Toast.show({
        type: 'success',
        text1: 'Successfully attached file to note',
      });
    },
    [application, note]
  );

  const detachFileFromNote = useCallback(
    async (file: SNFile) => {
      if (!application || !note) {
        return;
      }
      await application.items.disassociateFileWithNote(file, note);
      Toast.show({
        type: 'success',
        text1: 'Successfully detached file from note',
      });
    },
    [application, note]
  );

  const toggleFileProtection = useCallback(
    async (file: SNFile) => {
      try {
        if (!application) {
          return file.protected;
        }
        let result: SNFile | undefined;
        if (file.protected) {
          result = await application.mutator.unprotectFile(file);
        } else {
          result = await application.mutator.protectFile(file);
        }
        const isProtected = result ? result.protected : file.protected;
        return isProtected;
      } catch (error) {
        console.log('An error occurred: ', error);
        return file.protected;
      }
    },
    [application]
  );

  const authorizeProtectedActionForFile = useCallback(
    async (file: SNFile, challengeReason: ChallengeReason) => {
      if (!application) {
        return false;
      }
      const authorizedFiles =
        await application.protections.authorizeProtectedActionForFiles(
          [file],
          challengeReason
        );
      return authorizedFiles.length > 0 && authorizedFiles.includes(file);
    },
    [application]
  );

  const renameFile = useCallback(
    async (file: SNFile, fileName: string) => {
      if (!application) {
        return;
      }
      await application.items.renameFile(file, fileName);
    },
    [application]
  );

  const handleFileAction = useCallback(
    async (action: UploadedFileItemAction) => {
      if (!application) {
        return false;
      }

      const file =
        action.type !== UploadedFileItemActionType.RenameFile
          ? action.payload
          : action.payload.file;
      let isAuthorizedForAction = true;

      if (
        file.protected &&
        action.type !== UploadedFileItemActionType.ToggleFileProtection
      ) {
        isAuthorizedForAction = await authorizeProtectedActionForFile(
          file,
          ChallengeReason.AccessProtectedFile
        );
      }

      if (!isAuthorizedForAction) {
        return false;
      }

      switch (action.type) {
        case UploadedFileItemActionType.AttachFileToNote:
          await attachFileToNote(file);
          break;
        case UploadedFileItemActionType.DetachFileToNote:
          await detachFileFromNote(file);
          break;
        case UploadedFileItemActionType.DeleteFile:
          await deleteFile(file);
          break;
        case UploadedFileItemActionType.ShareFile:
          await downloadFile(file, true);
          break;
        case UploadedFileItemActionType.DownloadFile:
          await downloadFile(file);
          break;
        case UploadedFileItemActionType.ToggleFileProtection: {
          const isProtected = await toggleFileProtection(file);
          action.callback(isProtected);
          break;
        }
        case UploadedFileItemActionType.RenameFile:
          await renameFile(file, action.payload.name);
          break;
      }

      application.sync.sync();
      return true;
    },
    [
      application,
      attachFileToNote,
      authorizeProtectedActionForFile,
      deleteFile,
      detachFileFromNote,
      downloadFile,
      renameFile,
      toggleFileProtection,
    ]
  );

  useEffect(() => {
    if (!application) {
      return;
    }
    const unregisterFileStream = application.streamItems(
      ContentType.File,
      () => {
        reloadAttachedFiles();
        reloadAllFiles();
      }
    );

    return () => {
      unregisterFileStream();
    };
  }, [application, reloadAllFiles, reloadAttachedFiles]);

  const showActionsMenu = useCallback(
    (file: SNFile | undefined) => {
      if (!file) {
        return;
      }
      const isAttachedToNote = attachedFiles.includes(file);
      setIsFileProtected(file.protected);

      const actions = [
        {
          text: isAttachedToNote ? 'Detach from note' : 'Attach to note',
          callback: isAttachedToNote
            ? () =>
                handleFileAction({
                  type: UploadedFileItemActionType.DetachFileToNote,
                  payload: file,
                })
            : () =>
                handleFileAction({
                  type: UploadedFileItemActionType.AttachFileToNote,
                  payload: file,
                }),
        },
        {
          text: `${isFileProtected ? 'Disable' : 'Enable'} password protection`,
          callback: () => {
            handleFileAction({
              type: UploadedFileItemActionType.ToggleFileProtection,
              payload: file,
              callback: isProtected => {
                setIsFileProtected(isProtected);
              },
            });
          },
        },
        {
          text: 'Share',
          callback: () => {
            handleFileAction({
              type: UploadedFileItemActionType.ShareFile,
              payload: file,
            });
          },
        },
        {
          text: 'Download',
          callback: () => {
            handleFileAction({
              type: UploadedFileItemActionType.DownloadFile,
              payload: file,
            });
          },
        },
        {
          text: 'Rename',
          callback: () =>
            navigation.navigate(SCREEN_INPUT_MODAL_FILE_NAME, {
              file,
              handleFileAction,
            }),
        },
      ];
      const osDependentActions =
        Platform.OS === 'ios'
          ? actions.filter(action => action.text !== 'Download')
          : [...actions];
      showActionSheet(file.name, osDependentActions);
    },
    [
      attachedFiles,
      handleFileAction,
      isFileProtected,
      navigation,
      showActionSheet,
    ]
  );

  return {
    showActionsMenu,
    attachedFiles,
    allFiles,
  };
};
