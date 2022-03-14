import { SnIcon } from '@Components/SnIcon';
import { ApplicationContext } from '@Root/ApplicationContext';
import {
  AttachedFilesList,
  ClearFilterTextIconContainer,
  FilterTextInput,
  FilterTextInputContainer,
  ModalViewContainer,
  useFileAttachmentStyles,
} from '@Screens/AttachedFilesModal/FileAttachmentModal.styled';
import { PopoverFileItem } from '@Screens/AttachedFilesModal/PopoverFileItem';
import {
  PopoverFileItemAction,
  PopoverFileItemActionType,
} from '@Screens/AttachedFilesModal/PopoverFileItemAction';
import {
  ChallengeReason,
  ContentType,
  SNFile,
  SNNote,
} from '@standardnotes/snjs';
// import { useCustomActionSheet } from '@Style/custom_action_sheet';
import { ICON_CLOSE } from '@Style/icons';
// import { Base64 } from 'js-base64';
import React, { FC, useCallback, useContext, useEffect, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
/*import DocumentPicker, {
  DocumentPickerResponse,
  isInProgress,
  pickSingle,
} from 'react-native-document-picker';
import { read } from 'react-native-fs';*/
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemeContext } from 'styled-components/native';

type Props = {
  note: SNNote;
  isModalVisible: boolean;
  setIsModalVisible: (isVisible: boolean) => void;
};

enum Tabs {
  AttachedFiles,
  AllFiles,
}

export const FileAttachmentModal: FC<Props> = ({
  note,
  isModalVisible,
  setIsModalVisible,
}) => {
  const theme = useContext(ThemeContext);
  const application = useContext(ApplicationContext);
  const styles = useFileAttachmentStyles(theme);
  // const { showActionSheet } = useCustomActionSheet();

  const [currentTab, setCurrentTab] = useState(Tabs.AttachedFiles);
  const [attachedFiles, setAttachedFiles] = useState<SNFile[]>([]);
  const [allFiles, setAllFiles] = useState<SNFile[]>([]);
  const [searchString, setSearchString] = useState('');

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
    closeIcon,
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
    const shouldDelete = application.alertService.confirm(
      `Are you sure you want to permanently delete "${file.name}"?`,
      'Delete file',
      'Delete'
    );
    if (shouldDelete) {
      // TODO: show something instead of toast
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

  const downloadFile = async (file: SNFile) => {
    // appState.files.downloadFile(file);
    // console.log('downloading...', JSON.stringify(file));
    try {
      console.log('file is', JSON.stringify(file));
      await application.files.downloadFile(
        file,
        async (decryptedBytes: Uint8Array) => {
          /*if (isUsingStreamingSaver) {
            await saver.pushBytes(decryptedBytes);
          } else {
            saver.saveFile(file.name, decryptedBytes);
          }*/
          console.log('onDecryptedbytes...', decryptedBytes);
        }
      );
    } catch (error) {
      console.error(error);

      /*addToast({
        type: ToastType.Error,
        message: 'There was an error while downloading the file',
      });*/
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
  };

  /*const reloadAttachedFilesLength = () => {
    setAttachedFilesLength(application.items.getFilesForNote(note).length);
  };*/

  const authorizeProtectedActionForFile = async (
    file: SNFile,
    challengeReason: ChallengeReason
  ) => {
    if (!application) {
      return false;
    }
    const authorizedFiles = await application.protections.authorizeProtectedActionForFiles(
      [file],
      challengeReason
    );
    return authorizedFiles.length > 0 && authorizedFiles.includes(file);
  };

  const handleFileAction = async (action: PopoverFileItemAction) => {
    if (!application) {
      return false;
    }

    const file =
      action.type !== PopoverFileItemActionType.RenameFile
        ? action.payload
        : action.payload.file;
    let isAuthorizedForAction = true;

    if (
      file.protected &&
      action.type !== PopoverFileItemActionType.ToggleFileProtection
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
      case PopoverFileItemActionType.AttachFileToNote:
        await attachFileToNote(file);
        break;
      case PopoverFileItemActionType.DetachFileToNote:
        await detachFileFromNote(file);
        break;
      case PopoverFileItemActionType.DeleteFile:
        await deleteFile(file);
        break;
      case PopoverFileItemActionType.DownloadFile:
        await downloadFile(file);
        break;
      case PopoverFileItemActionType.ToggleFileProtection: {
        const isProtected = await toggleFileProtection(file);
        action.callback(isProtected);
        break;
      }
      case PopoverFileItemActionType.RenameFile:
        // await renameFile(file, action.payload.name);
        console.log('rename file');
        break;
    }

    application.sync.sync();
    return true;
  };

  /*const showActionsMenu = () => {
    const actions = [
      {
        text: 'Attach from files',
        callback: uploadFile,
      },
      {
        text: 'Attach from Camera or Photo Library',
        callback: () => console.log('camera or photo lib'),
      },
    ];
    showActionSheet('Choose file to upload', actions);
  };*/
  const handleFilter = (textToSearch: string) => {
    setSearchString(textToSearch);
  };

  return (
    <View>
      <Modal
        animationType={'slide'}
        transparent={false}
        visible={isModalVisible}
        onRequestClose={() => {
          setIsModalVisible(false);
        }}
      >
        <View style={centeredView}>
          <ModalViewContainer hasAttachedFiles={filesList.length > 0}>
            <View style={header}>
              <View style={headerTabContainer}>
                <View
                  style={[
                    headerTab,
                    currentTab === AttachedFiles ? activeTab : {},
                  ]}
                >
                  <Text onPress={() => setCurrentTab(AttachedFiles)}>
                    Attached
                  </Text>
                </View>
                <View
                  style={[headerTab, currentTab === AllFiles ? activeTab : {}]}
                >
                  <Text onPress={() => setCurrentTab(AllFiles)}>All files</Text>
                </View>
              </View>
              <Icon
                name={ICON_CLOSE}
                size={20}
                onPress={() => setIsModalVisible(false)}
                style={closeIcon}
              />
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
                    <PopoverFileItem
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
      </Modal>
    </View>
  );
};
