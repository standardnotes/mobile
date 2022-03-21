import { SnIcon } from '@Components/SnIcon';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ModalStackNavigationProp } from '@Root/ModalStack';
import { SCREEN_UPLOADED_FILES_LIST } from '@Screens/screens';
import { UploadedFileItem } from '@Screens/UploadedFilesList/UploadedFileItem';
import {
  UploadedFileItemAction,
  UploadedFileItemActionType,
} from '@Screens/UploadedFilesList/UploadedFileItemAction';
import { ChallengeReason, ContentType, SNFile } from '@standardnotes/snjs';
import { Buffer } from 'buffer';
import React, { FC, useCallback, useContext, useEffect, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import RNFS, {
  DocumentDirectoryPath,
  exists,
  ExternalDirectoryPath,
} from 'react-native-fs';
import RNShare from 'react-native-share';
import Toast from 'react-native-toast-message';
import { ThemeContext } from 'styled-components/native';
import {
  AttachedFilesList,
  ClearFilterTextIconContainer,
  FilterTextInput,
  FilterTextInputContainer,
  ModalViewContainer,
  useUploadedFilesListStyles,
} from './UploadedFilesList.styled';

enum Tabs {
  AttachedFiles,
  AllFiles,
}

type Props = ModalStackNavigationProp<typeof SCREEN_UPLOADED_FILES_LIST>;

export const UploadedFilesList: FC<Props> = props => {
  const theme = useContext(ThemeContext);
  const application = useContext(ApplicationContext);
  const styles = useUploadedFilesListStyles(theme);

  const [currentTab, setCurrentTab] = useState(Tabs.AttachedFiles);
  const [attachedFiles, setAttachedFiles] = useState<SNFile[]>([]);
  const [allFiles, setAllFiles] = useState<SNFile[]>([]);
  const [searchString, setSearchString] = useState('');

  const note = props.route.params.note;

  const reloadAttachedFiles = useCallback(() => {
    if (!application) {
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
      application
        .getItems(ContentType.File)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)) as SNFile[]
    );
  }, [application]);

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

  if (!application) {
    return null;
  }

  const filesList =
    currentTab === Tabs.AttachedFiles ? attachedFiles : allFiles;
  const filteredList = searchString
    ? filesList.filter(file =>
        file.name.toLowerCase().includes(searchString.toLowerCase())
      )
    : filesList;

  const { AttachedFiles, AllFiles } = Tabs;
  const {
    centeredView,
    header,
    headerTabContainer,
    headerTab,
    activeTab,
    noAttachmentsIcon,
    noAttachmentsIconContainer,
  } = styles;

  /*const [selectedFile, setSelectedFile] = useState<DocumentPickerResponse[]>(
    []
  );
  const handleDocumentSelection = async () => {
    try {
      const response = await DocumentPicker.pick({
        presentationStyle: 'fullScreen',
      });
      console.log('file picked');
      return response;
    } catch (err) {
      console.warn(err);
    }
  };*/

  /*const handleError = (err: unknown) => {
    if (DocumentPicker.isCancel(err)) {
      console.warn('cancelled');
      // User cancelled the picker, exit any dialogs or menus and move on
    } else if (isInProgress(err)) {
      console.warn(
        'multiple pickers were opened, only the last will be considered'
      );
    } else {
      throw err;
    }
  };*/

  /*const uploadFile = async () => {
    if (!application) {
      return;
    }
    try {
      const fileResult = await pickSingle(); // TODO: allow picking not only single (pickSingle), but multiple
      if (!fileResult.uri || !fileResult.size) {
        return;
      }
      const uri =
        Platform.OS === 'ios' ? decodeURI(fileResult.uri) : fileResult.uri;
      console.log(
        'picked file',
        fileResult.name,
        fileResult.size,
        fileResult.type,
        uri
      );

      const size = fileResult.size;
      const operation = await application.files.beginNewFileUpload();
      const onChunk = async (
        chunk: Uint8Array,
        index: number,
        isLast: boolean
      ) => {
        await application.files.pushBytesForUpload(
          operation,
          chunk,
          index,
          isLast
        );
      };

      const data = await read(uri, size, 0, 'base64');
      const bytes = Base64.toUint8Array(data);
      await onChunk(bytes, 1, true);

      /!*const fileObj = await application.files.finishUpload(
        operation,
        fileResult.name,
        fileResult.type!
      );*!/
      const fileObj = await application.files.finishUpload(operation, {
        name: fileResult.name,
        mimeType: fileResult.type as string,
      });

      application.alertService.alert(
        // `Uploaded file ${fileObj.nameWithExt}`
        `Uploaded file ${fileObj.name}`
      );
    } catch (e) {
      handleError(e);
    }
  };*/

  const deleteFile = async (file: SNFile) => {
    if (!application) {
      return;
    }
    /*const shouldDelete = await confirmDialog({
      text: `Are you sure you want to permanently delete "${file.nameWithExt}"?`,
      confirmButtonStyle: 'danger',
    });*/
    const shouldDelete = await application.alertService.confirm(
      `Are you sure you want to permanently delete "${file.name}"?`,
      'Delete file',
      'Delete'
    );
    if (shouldDelete) {
      // TODO: show some toast
      await application.deleteItem(file);
      /*const deletingToastId = addToast({
        type: ToastType.Loading,
        message: `Deleting file "${file.nameWithExt}"...`,
      });
      await application.deleteItem(file);
      addToast({
        type: ToastType.Success,
        message: `Deleted file "${file.nameWithExt}"`,
      });
      dismissToast(deletingToastId);*/
    }
  };

  const deleteFileAtPath = async (path: string) => {
    try {
      if (await exists(path)) {
        await RNFS.unlink(path);
      }
    } catch (err) {}
  };

  const shareFile = (file: SNFile, path: string) => {
    application
      .getAppState()
      .performActionWithoutStateChangeImpact(async () => {
        try {
          const shareDialogResponse = await RNShare.open({
            url: `file://${path}`,
            failOnCancel: false,
          });
          // TODO: On Android this response always returns {success: false}, there is an open issue for that
          //  https://github.com/react-native-share/react-native-share/issues/1059
          console.log('shareDialogResponse is', shareDialogResponse);

          // On iOS the user can store files locally from "Share" screen, so we don't show "Download" option there.
          // For Android the user has a separate "Download" action for the file, therefore after the file is shared,
          // it's not needed anymore and we remove it from the storage.
          if (Platform.OS === 'android') {
            await deleteFileAtPath(path);
          }
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: 'There was an error while sharing the file'
          });
        }
      });
  };

  const downloadFile = async (file: SNFile, showShareScreen = false) => {
    try {
      let path = '';

      Toast.show({
        type: 'info',
        text1: 'Preparing file...',
        autoHide: false,
      });

      let directory = DocumentDirectoryPath;
      let tmpInFileName = '';

      if (Platform.OS === 'android') {
        directory = ExternalDirectoryPath;

        if (showShareScreen) {
          tmpInFileName = 'tmp-';
        }
      }
      path = `${directory}/${tmpInFileName}${file.name}`;

      // Overwrite any existing file with that name
      await deleteFileAtPath(path);

      await application.files.downloadFile(
        file,
        async (decryptedBytes: Uint8Array) => {
          const base64String = new Buffer(decryptedBytes).toString('base64');

          await RNFS.appendFile(path, base64String, 'base64');
        }
      );

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
    }
  };

  const attachFileToNote = async (file: SNFile) => {
    await application.items.associateFileWithNote(file, note);
  };

  const detachFileFromNote = async (file: SNFile) => {
    if (!application) {
      return;
    }
    await application.items.disassociateFileWithNote(file, note);
  };

  const toggleFileProtection = async (file: SNFile) => {
    try {
      if (!application) {
        return file.protected;
      }
      let result: SNFile | undefined;
      if (file.protected) {
        result = await application.protections.unprotectFile(file);
      } else {
        result = await application.protections.protectFile(file);
      }
      const isProtected = result ? result.protected : file.protected;
      return isProtected;
    } catch (error) {
      console.log('An error occurred: ', error);
      return file.protected;
    }
  };

  const authorizeProtectedActionForFile = async (
    file: SNFile,
    challengeReason: ChallengeReason
  ) => {
    if (!application) {
      return false;
    }
    const authorizedFiles =
      await application.protections.authorizeProtectedActionForFiles(
        [file],
        challengeReason
      );
    return authorizedFiles.length > 0 && authorizedFiles.includes(file);
  };

  const renameFile = async (file: SNFile, fileName: string) => {
    await application.items.renameFile(file, fileName);
  };

  const handleFileAction = async (action: UploadedFileItemAction) => {
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
  };

  const handleFilter = (textToSearch: string) => {
    setSearchString(textToSearch);
  };

  return (
    <View style={centeredView}>
      <ModalViewContainer hasAttachedFiles={filesList.length > 0}>
        <View style={header}>
          <View style={headerTabContainer}>
            <View
              style={[headerTab, currentTab === AttachedFiles ? activeTab : {}]}
            >
              <Text onPress={() => setCurrentTab(AttachedFiles)}>Attached</Text>
            </View>
            <View style={[headerTab, currentTab === AllFiles ? activeTab : {}]}>
              <Text onPress={() => setCurrentTab(AllFiles)}>All files</Text>
            </View>
          </View>
        </View>
        <FilterTextInputContainer>
          <FilterTextInput
            onChangeText={textToSearch => {
              handleFilter(textToSearch);
            }}
            placeholder={'Search files...'}
            autoCapitalize={'none'}
            autoCorrect={false}
            value={searchString}
          />
          {searchString.length > 0 && (
            <ClearFilterTextIconContainer>
              <TouchableOpacity onPress={() => setSearchString('')}>
                <SnIcon type="clear-circle-filled" width={18} height={18} />
              </TouchableOpacity>
            </ClearFilterTextIconContainer>
          )}
        </FilterTextInputContainer>

        {filteredList.length > 0 ? (
          <AttachedFilesList>
            {filteredList.map((file: SNFile) => {
              return (
                <UploadedFileItem
                  key={file.uuid}
                  file={file}
                  isAttachedToNote={attachedFiles.includes(file)}
                  handleFileAction={handleFileAction}
                />
              );
            })}
          </AttachedFilesList>
        ) : (
          <View style={noAttachmentsIconContainer}>
            <SnIcon
              type={'files-illustration'}
              styles={noAttachmentsIcon}
              width={72}
              height={72}
            />
            <Text>
              {searchString
                ? 'No result found'
                : 'No files attached to this note'}
            </Text>
          </View>
        )}

        {/*<Pressable
              style={[button, buttonClose]}
              onPress={() => setIsModalVisible(false)}
            >
              <Button
                title={`${
                  currentTab === AttachedFiles ? 'Attach' : 'Upload'
                } files`}
                color={theme.stylekitInfoContrastColor}
                onPress={showActionsMenu}
              />
            </Pressable>*/}
      </ModalViewContainer>
    </View>
  );
};
