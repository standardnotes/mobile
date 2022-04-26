import { AppStackNavigationProp } from '@Root/AppStack'
import { SnIcon } from '@Root/Components/SnIcon'
import { useFiles } from '@Root/Hooks/useFiles'
import { useSafeApplicationContext } from '@Root/Hooks/useSafeApplicationContext'
import { SCREEN_COMPOSE } from '@Root/Screens/screens'
import { UploadedFileItemActionType } from '@Screens/UploadedFilesList/UploadedFileItemAction'
import { formatSizeToReadableString } from '@standardnotes/filepicker'
import { SNFile, SNNote } from '@standardnotes/snjs'
import React, { FC, useContext, useEffect, useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { ThemeContext } from 'styled-components'
import {
  FileDataContainer,
  FileDateAndSizeContainer,
  FileDetailsContainer,
  FileDetailsWithExtraIconsContainer,
  FileIconContainer,
  FileName,
  uploadedFileItemStyles,
} from './UploadedFileItem.styled'

export type UploadedFileItemProps = {
  file: SNFile
  note: SNNote
  isAttachedToNote: boolean
}

export type TAppStackNavigationProp = AppStackNavigationProp<typeof SCREEN_COMPOSE>['navigation']

export const UploadedFileItem: FC<UploadedFileItemProps> = ({ file, note }) => {
  const application = useSafeApplicationContext()
  const theme = useContext(ThemeContext)

  const { showActionsMenu, handleFileAction } = useFiles({ note })

  const [fileName, setFileName] = useState(file.name)

  useEffect(() => {
    setFileName(file.name)
  }, [file.name])

  const iconType = application.iconsController.getIconForFileType(file.mimeType)

  return (
    <TouchableOpacity
      onPress={() => {
        void handleFileAction({
          type: UploadedFileItemActionType.PreviewFile,
          payload: file,
        })
      }}
      onLongPress={() => showActionsMenu(file)}
    >
      <View>
        <FileDataContainer>
          <FileIconContainer>
            <SnIcon type={iconType} width={32} height={32} />
          </FileIconContainer>
          <FileDetailsWithExtraIconsContainer>
            <FileDetailsContainer>
              <FileName>{fileName}</FileName>
              <FileDateAndSizeContainer>
                <Text>
                  {file.created_at.toLocaleString()} · {formatSizeToReadableString(file.size)}
                </Text>
                {file.protected && (
                  <SnIcon
                    type={'lock-filled'}
                    width={12}
                    height={12}
                    fill={theme.stylekitPalSky}
                    style={uploadedFileItemStyles.lockIcon}
                  />
                )}
              </FileDateAndSizeContainer>
            </FileDetailsContainer>
          </FileDetailsWithExtraIconsContainer>
        </FileDataContainer>
      </View>
    </TouchableOpacity>
  )
}
