import { SnIcon } from '@Components/SnIcon';
import { ApplicationContext } from '@Root/ApplicationContext';
import {
  FileDataContainer,
  FileDateAndSizeContainer,
  FileDetailsContainer,
  FileIconContainer,
  FileName,
} from '@Screens/AttachedFilesModal/PopoverFileItem.styled';
import { formatSizeToReadableString } from '@standardnotes/filepicker';
import { IconType, SNFile } from '@standardnotes/snjs';
import { useCustomActionSheet } from '@Style/custom_action_sheet';
import React, { FC, useContext, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  PopoverFileItemAction,
  PopoverFileItemActionType,
} from './PopoverFileItemAction';

const renderIconForFileType = (iconType: IconType) => {
  return <SnIcon type={iconType} />;
};

export type PopoverFileItemProps = {
  file: SNFile;
  isAttachedToNote: boolean;
  handleFileAction: (action: PopoverFileItemAction) => Promise<boolean>;
};

export const PopoverFileItem: FC<PopoverFileItemProps> = ({
  file,
  isAttachedToNote,
  handleFileAction,
}) => {
  const application = useContext(ApplicationContext);
  const { showActionSheet } = useCustomActionSheet();

  const [isRenamingFile, setIsRenamingFile] = useState(false);

  /*const renameFile = async (file: SNFile, name: string) => {
    const didRename = await handleFileAction({
      type: PopoverFileItemActionType.RenameFile,
      payload: {
        file,
        name,
      },
    });
    if (didRename) {
      setIsRenamingFile(false);
    }
  };

  const handleFileNameInput = (event: Event) => {
    console.log('handle file name input');
  };*/

  const showActionsMenu = () => {
    const actions = [
      {
        text: isAttachedToNote ? 'Detach from note' : 'Attach to note',
        callback: isAttachedToNote
          ? () =>
              handleFileAction({
                type: PopoverFileItemActionType.DetachFileToNote,
                payload: file,
              })
          : () =>
              handleFileAction({
                type: PopoverFileItemActionType.AttachFileToNote,
                payload: file,
              }),
      },
      {
        text: 'Download',
        callback: () => {
          handleFileAction({
            type: PopoverFileItemActionType.DownloadFile,
            payload: file,
          });
        },
      },
      {
        text: 'Rename',
        callback: () => console.log('rename'),
      },
    ];
    showActionSheet('Choose action', actions);
  };
  // console.log('file is', JSON.stringify(file));
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
          <FileDetailsContainer>
            {isRenamingFile ? (
              <Text>Input for renaming</Text>
            ) : (
              <FileName>{file.name}</FileName>
            )}
            <FileDateAndSizeContainer>
              <Text>
                {file.created_at.toLocaleString()} ·{' '}
                {formatSizeToReadableString(file.size)}
              </Text>
            </FileDateAndSizeContainer>
          </FileDetailsContainer>
        </FileDataContainer>
      </View>
    </TouchableOpacity>
  );
};
