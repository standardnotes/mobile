import { useNavigation } from '@react-navigation/native'
import { AppStackNavigationProp } from '@Root/AppStack'
import { useFiles } from '@Root/hooks/useFiles'
import { useSafeApplicationContext } from '@Root/hooks/useSafeApplicationContext'
import { SCREEN_COMPOSE, SCREEN_UPLOADED_FILES_LIST } from '@Screens/screens'
import {
  FileItemContainer,
  FilesContainer,
  IconsContainer,
  SideMenuCellShowAllFiles,
  SideMenuCellStyled,
  SNIconStyled,
  styles
} from '@Screens/SideMenu/Files.styled'
import { SideMenuOptionIconDescriptionType } from '@Screens/SideMenu/SideMenuSection'
import { SNNote } from '@standardnotes/snjs'
import React, { FC } from 'react'

type Props = {
  note: SNNote
}

const MaximumVisibleFilesCount = 3

export const Files: FC<Props> = ({ note }) => {
  const application = useSafeApplicationContext()

  const navigation =
    useNavigation<AppStackNavigationProp<typeof SCREEN_COMPOSE>['navigation']>()
  const { showActionsMenu, attachedFiles } = useFiles({ note })

  const openFilesScreen = () => {
    navigation.navigate(SCREEN_UPLOADED_FILES_LIST, { note })
  }

  const isFilesListTruncated = attachedFiles.length > MaximumVisibleFilesCount

  return (
    <FilesContainer>
      {attachedFiles.slice(0, MaximumVisibleFilesCount).map(file => {
        const iconType = application.iconsController.getIconForFileType(
          file.mimeType
        )

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
                    {file.protected && (
                      <SNIconStyled
                        type={'lock-filled'}
                        width={16}
                        height={16}
                      />
                    )}
                    <SNIconStyled type={iconType} width={16} height={16} />
                  </IconsContainer>
                )
              }}
              cellContentStyle={styles.cellContentStyle}
            />
          </FileItemContainer>
        )
      })}
      <SideMenuCellShowAllFiles
        text={
          isFilesListTruncated ? 'Show all attached files' : 'Show other files'
        }
        onSelect={openFilesScreen}
        cellContentStyle={styles.cellContentStyle}
      />
    </FilesContainer>
  )
}
