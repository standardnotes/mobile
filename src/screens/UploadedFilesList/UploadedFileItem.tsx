import { SnIcon } from '@Components/SnIcon';
import { useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStackNavigationProp } from '@Root/AppStack';
import { SCREEN_COMPOSE, SCREEN_INPUT_MODAL_FILE_NAME } from '@Screens/screens';
import { formatSizeToReadableString } from '@standardnotes/filepicker';
import { IconType, SNFile } from '@standardnotes/snjs';
import { useCustomActionSheet } from '@Style/custom_action_sheet';
import React, { FC, useContext, useEffect, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { ThemeContext } from 'styled-components';
import {
  FileDataContainer,
  FileDateAndSizeContainer,
  FileDetailsContainer,
  FileDetailsWithExtraIconsContainer,
  FileIconContainer,
  FileName,
  uploadedFileItemStyles,
} from './UploadedFileItem.styled';
import {
  UploadedFileItemAction,
  UploadedFileItemActionType,
} from './UploadedFileItemAction';

const renderIconForFileType = (iconType: IconType) => {
  return <SnIcon type={iconType} width={32} height={32} />;
};

export type UploadedFileItemProps = {
  file: SNFile;
  isAttachedToNote: boolean;
  handleFileAction: (action: UploadedFileItemAction) => Promise<boolean>;
};

export const UploadedFileItem: FC<UploadedFileItemProps> = ({
  file,
  isAttachedToNote,
  handleFileAction,
}) => {
  const application = useContext(ApplicationContext);
  const navigation =
    useNavigation<
      AppStackNavigationProp<typeof SCREEN_COMPOSE>['navigation']
    >();
  const { showActionSheet } = useCustomActionSheet();

  const [fileName, setFileName] = useState(file.name);
  const [isFileProtected, setIsFileProtected] = useState(file.protected);
  const theme = useContext(ThemeContext);

  useEffect(() => {
    setFileName(file.name);
  }, [file.name]);

  const showActionsMenu = () => {
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
        text: `${isFileProtected ? 'Disable' : 'Enable'} Password protection`,
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
  };

  if (!application) {
    return null;
  }

  const iconForFileType = renderIconForFileType(
    application.iconsController.getIconForFileType(file.mimeType)
  );

  return (
    <TouchableOpacity onPress={showActionsMenu}>
      <View>
        <FileDataContainer>
          <FileIconContainer>{iconForFileType}</FileIconContainer>
          <FileDetailsWithExtraIconsContainer>
            <FileDetailsContainer>
              <FileName>{fileName}</FileName>
              <FileDateAndSizeContainer>
                <Text>
                  {file.created_at.toLocaleString()} ·{' '}
                  {formatSizeToReadableString(file.size)}
                </Text>
              </FileDateAndSizeContainer>
            </FileDetailsContainer>
            {file.protected && (
              <SnIcon
                type={'lock-filled'}
                width={12}
                height={12}
                fill={theme.stylekitPalSky}
                styles={uploadedFileItemStyles.lockIcon}
              />
            )}
          </FileDetailsWithExtraIconsContainer>
        </FileDataContainer>
      </View>
    </TouchableOpacity>
  );
};
