import { SnIcon, TGeneralIcon } from '@Components/SnIcon';
import {
  FileDataContainer,
  FileDateAndSizeContainer,
  FileDetailsContainer,
  FileIconContainer,
  FileName,
} from '@Screens/AttachedFilesModal/PopoverFileItem.styled';
import { formatSizeToReadableString } from '@standardnotes/filepicker';
import { SNFile } from '@standardnotes/snjs';
import { useCustomActionSheet } from '@Style/custom_action_sheet';
import React, { FC, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  PopoverFileItemAction,
  PopoverFileItemActionType,
} from './PopoverFileItemAction';

// TODO: move this function to snjs
const renderIconForFileType = (fileType: string) => {
  let iconType: TGeneralIcon = 'file-other';

  if (fileType === 'pdf') {
    iconType = 'file-pdf';
  }

  if (/^(docx?|odt)/.test(fileType)) {
    iconType = 'file-doc';
  }

  if (/^pptx?/.test(fileType)) {
    iconType = 'file-ppt';
  }

  if (/^(xlsx?|ods)/.test(fileType)) {
    iconType = 'file-xls';
  }

  if (/^(jpe?g|a?png|webp|gif)/.test(fileType)) {
    iconType = 'file-image';
  }

  if (/^(mov|mp4|mkv)/.test(fileType)) {
    iconType = 'file-mov';
  }

  if (/^(wav|mp3|flac|ogg)/.test(fileType)) {
    iconType = 'file-music';
  }

  if (/^(zip|rar|7z)/.test(fileType)) {
    iconType = 'file-zip';
  }
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
        callback: () => console.log('download...'),
      },
      {
        text: 'Rename',
        callback: () => console.log('rename'),
      },
    ];
    showActionSheet('Choose action', actions);
  };

  return (
    <TouchableOpacity onPress={showActionsMenu}>
      <View>
        <FileDataContainer>
          <FileIconContainer>
            {renderIconForFileType(file.ext ?? '')}
          </FileIconContainer>
          <FileDetailsContainer>
            {isRenamingFile ? (
              <Text>Input for renaming</Text>
            ) : (
              <FileName>{file.nameWithExt}</FileName>
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
