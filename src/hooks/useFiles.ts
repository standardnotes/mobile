import { ToastType } from '@Lib/types';
import { useNavigation } from '@react-navigation/native';
import { useSafeApplicationContext } from '@Root/hooks/useSafeApplicationContext';
import { SCREEN_INPUT_MODAL_FILE_NAME } from '@Screens/screens';
import { TAppStackNavigationProp } from '@Screens/UploadedFilesList/UploadedFileItem';
import {
  UploadedFileItemAction,
  UploadedFileItemActionType,
} from '@Screens/UploadedFilesList/UploadedFileItemAction';
import {
  ButtonType,
  ChallengeReason,
  ContentType,
  SNFile,
  SNNote,
} from '@standardnotes/snjs';
import { useCustomActionSheet } from '@Style/custom_action_sheet';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import FileViewer from 'react-native-file-viewer';
import RNFS, { exists } from 'react-native-fs';
import RNShare from 'react-native-share';
import Toast from 'react-native-toast-message';

type Props = {
  note: SNNote;
};
type TDownloadFileAndReturnLocalPathParams = {
  file: SNFile;
  saveInTempLocation?: boolean;
};

export const isFileTypePreviewable = (fileType: string) => {
  const isImage = fileType.startsWith('image/');
  const isVideo = fileType.startsWith('video/');
  const isAudio = fileType.startsWith('audio/');
  const isPdf = fileType === 'application/pdf';
  const isText = fileType === 'text/plain';

  return isImage || isVideo || isAudio || isPdf || isText;
};

export const useFiles = ({ note }: Props) => {
  const application = useSafeApplicationContext();

  const { showActionSheet } = useCustomActionSheet();
  const navigation = useNavigation<TAppStackNavigationProp>();

  const [attachedFiles, setAttachedFiles] = useState<SNFile[]>([]);
  const [allFiles, setAllFiles] = useState<SNFile[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const { Success, Info, Error } = ToastType;

  const reloadAttachedFiles = useCallback(() => {
    setAttachedFiles(
      application.items
        .getFilesForNote(note)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    );
  }, [application, note]);

  const reloadAllFiles = useCallback(() => {
    setAllFiles(
      application.items
        .getItems(ContentType.File)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)) as SNFile[]
    );
  }, [application]);

  const deleteFileAtPath = useCallback(async (path: string) => {
    try {
      if (await exists(path)) {
        await RNFS.unlink(path);
      }
    } catch (err) {}
  }, []);

  const downloadFileAndReturnLocalPath = useCallback(
    async ({
      file,
      saveInTempLocation = false,
    }: TDownloadFileAndReturnLocalPathParams): Promise<string | undefined> => {
      if (isDownloading) {
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
          type: Info,
          text1: 'Downloading file...',
          autoHide: false,
          onPress: Toast.hide,
        });

        const path = filesService.getDestinationPath({
          fileName: file.name,
          saveInTempLocation,
        });

        await deleteFileAtPath(path);
        await filesService.downloadFileInChunks(file, path);

        Toast.show({
          type: Success,
          text1: 'Success',
          text2: 'Successfully downloaded file',
          onPress: Toast.hide,
        });

        return path;
      } catch (error) {
        Toast.show({
          type: Error,
          text1: 'Error',
          text2: 'An error occurred while downloading the file',
          onPress: Toast.hide,
        });
      } finally {
        setIsDownloading(false);
      }
    },
    [Error, Info, Success, application, deleteFileAtPath, isDownloading]
  );

  const cleanupTempFileOnAndroid = useCallback(
    async (downloadedFilePath: string) => {
      if (Platform.OS === 'android') {
        await deleteFileAtPath(downloadedFilePath);
      }
    },
    [deleteFileAtPath]
  );

  const shareFile = useCallback(
    async (file: SNFile) => {
      const downloadedFilePath = await downloadFileAndReturnLocalPath({
        file,
        saveInTempLocation: true,
      });
      if (!downloadedFilePath) {
        return;
      }
      application
        .getAppState()
        .performActionWithoutStateChangeImpact(async () => {
          try {
            // On Android this response always returns {success: false}, there is an open issue for that:
            //  https://github.com/react-native-share/react-native-share/issues/1059
            const shareDialogResponse = await RNShare.open({
              url: `file://${downloadedFilePath}`,
              failOnCancel: false,
            });

            // On iOS the user can store files locally from "Share" screen, so we don't show "Download" option there.
            // For Android the user has a separate "Download" action for the file, therefore after the file is shared,
            // it's not needed anymore and we remove it from the storage.
            await cleanupTempFileOnAndroid(downloadedFilePath);

            if (shareDialogResponse.success) {
              Toast.show({
                type: Success,
                text1: 'Successfully exported file',
                onPress: Toast.hide,
              });
            }
          } catch (error) {
            Toast.show({
              type: Error,
              text1: 'An error occurred while trying to share this file',
              onPress: Toast.hide,
            });
          }
        });
    },
    [
      Error,
      Success,
      application,
      cleanupTempFileOnAndroid,
      downloadFileAndReturnLocalPath,
    ]
  );

  const attachFileToNote = useCallback(
    async (file: SNFile) => {
      await application.items.associateFileWithNote(file, note);
      Toast.show({
        type: Success,
        text1: 'Successfully attached file to note',
        onPress: Toast.hide,
      });
    },
    [Success, application, note]
  );

  const detachFileFromNote = useCallback(
    async (file: SNFile) => {
      await application.items.disassociateFileWithNote(file, note);
      Toast.show({
        type: Success,
        text1: 'Successfully detached file from note',
        onPress: Toast.hide,
      });
    },
    [Success, application, note]
  );

  const toggleFileProtection = useCallback(
    async (file: SNFile) => {
      try {
        let result: SNFile | undefined;
        if (file.protected) {
          result = await application.mutator.unprotectFile(file);
        } else {
          result = await application.mutator.protectFile(file);
        }
        const isProtected = result ? result.protected : file.protected;
        return isProtected;
      } catch (error) {
        console.error('An error occurred: ', error);
        return file.protected;
      }
    },
    [application]
  );

  const authorizeProtectedActionForFile = useCallback(
    async (file: SNFile, challengeReason: ChallengeReason) => {
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
      await application.items.renameFile(file, fileName);
    },
    [application]
  );

  const previewFile = useCallback(
    async (file: SNFile) => {
      let downloadedFilePath: string | undefined = '';
      try {
        const isPreviewable = isFileTypePreviewable(file.mimeType);

        if (!isPreviewable) {
          const tryToPreview = await application.alertService.confirm(
            'This file may not be previewable. Do you wish to try anyway?',
            '',
            'Try to preview',
            ButtonType.Info,
            'Cancel'
          );
          if (!tryToPreview) {
            return;
          }
        }

        downloadedFilePath = await downloadFileAndReturnLocalPath({
          file,
          saveInTempLocation: true,
        });

        if (!downloadedFilePath) {
          return;
        }
        await FileViewer.open(downloadedFilePath, {
          onDismiss: async () => {
            await cleanupTempFileOnAndroid(downloadedFilePath as string);
          },
        });

        return true;
      } catch (error) {
        await cleanupTempFileOnAndroid(downloadedFilePath as string);
        await application.alertService.alert(
          'An error occurred while previewing the file.'
        );

        return false;
      }
    },
    [application, cleanupTempFileOnAndroid, downloadFileAndReturnLocalPath]
  );
  const handleFileAction = useCallback(
    async (action: UploadedFileItemAction) => {
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
        case UploadedFileItemActionType.ShareFile:
          await shareFile(file);
          break;
        case UploadedFileItemActionType.DownloadFile:
          await downloadFileAndReturnLocalPath({ file });
          break;
        case UploadedFileItemActionType.ToggleFileProtection: {
          await toggleFileProtection(file);
          break;
        }
        case UploadedFileItemActionType.RenameFile:
          await renameFile(file, action.payload.name);
          break;
        case UploadedFileItemActionType.PreviewFile:
          await previewFile(file);
          break;
        default:
          break;
      }

      application.sync.sync();
      return true;
    },
    [
      application,
      attachFileToNote,
      authorizeProtectedActionForFile,
      detachFileFromNote,
      downloadFileAndReturnLocalPath,
      previewFile,
      renameFile,
      shareFile,
      toggleFileProtection,
    ]
  );

  useEffect(() => {
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
          text: `${file.protected ? 'Disable' : 'Enable'} password protection`,
          callback: () => {
            handleFileAction({
              type: UploadedFileItemActionType.ToggleFileProtection,
              payload: file,
            });
          },
        },
        {
          text: 'Preview',
          callback: () => {
            handleFileAction({
              type: UploadedFileItemActionType.PreviewFile,
              payload: file,
            });
          },
        },
        {
          text: Platform.OS === 'ios' ? 'Export' : 'Share',
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
    [attachedFiles, handleFileAction, navigation, showActionSheet]
  );

  return {
    showActionsMenu,
    attachedFiles,
    allFiles,
  };
};
