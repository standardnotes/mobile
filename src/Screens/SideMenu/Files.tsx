import { useNavigation } from '@react-navigation/native'
import { AppStackNavigationProp } from '@Root/AppStack'
import { useFiles } from '@Root/Hooks/useFiles'
import { useSafeApplicationContext } from '@Root/Hooks/useSafeApplicationContext'
import { SCREEN_COMPOSE, SCREEN_UPLOADED_FILES_LIST } from '@Root/Screens/screens'
import {
  FileItemContainer,
  FilesContainer,
  IconsContainer,
  SideMenuCellAttachNewFile,
  SideMenuCellShowAllFiles,
  SideMenuCellStyled,
  SNIconStyled,
  styles,
} from '@Root/Screens/SideMenu/Files.styled'
import { SideMenuOptionIconDescriptionType } from '@Root/Screens/SideMenu/SideMenuSection'
import { SNNote } from '@standardnotes/snjs'
import React, { FC } from 'react'

type Props = {
  note: SNNote
}

export const Files: FC<Props> = ({ note }) => {
  const application = useSafeApplicationContext()

  const navigation = useNavigation<AppStackNavigationProp<typeof SCREEN_COMPOSE>['navigation']>()
  const { showActionsMenu, handlePressAttachFile, attachedFiles } = useFiles({ note })

  const openFilesScreen = () => {
    navigation.navigate(SCREEN_UPLOADED_FILES_LIST, { note })
  }

  return (
    <FilesContainer>
      {attachedFiles.map(file => {
        const iconType = application.iconsController.getIconForFileType(file.mimeType)

        return (
          <FileItemContainer key={file.uuid}>
            <SideMenuCellStyled
              text={file.name}
              key={file.uuid}
              onSelect={() => showActionsMenu(file)}
              iconDesc={{
                side: 'right',
                type: SideMenuOptionIconDescriptionType.CustomComponent,
                value: (
                  <IconsContainer>
                    {file.protected && <SNIconStyled type={'lock-filled'} width={16} height={16} />}
                    <SNIconStyled type={iconType} width={16} height={16} />
                  </IconsContainer>
                ),
              }}
              cellContentStyle={styles.cellContentStyle}
            />
          </FileItemContainer>
        )
      })}
      <SideMenuCellAttachNewFile text={'Upload new file'} onSelect={() => handlePressAttachFile()} />
      <SideMenuCellShowAllFiles
        text={'Show all files'}
        onSelect={() => openFilesScreen()}
        cellContentStyle={styles.cellContentStyle}
      />
    </FilesContainer>
  )
}
