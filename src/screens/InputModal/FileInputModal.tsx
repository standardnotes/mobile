import { ButtonCell } from '@Components/ButtonCell'
import { SectionedTableCell } from '@Components/SectionedTableCell'
import { TableSection } from '@Components/TableSection'
import { useSafeApplicationContext } from '@Root/hooks/useSafeApplicationContext'
import { ModalStackNavigationProp } from '@Root/ModalStack'
import { SCREEN_INPUT_MODAL_FILE_NAME } from '@Screens/screens'
import { UploadedFileItemActionType } from '@Screens/UploadedFilesList/UploadedFileItemAction'
import { ThemeServiceContext } from '@Style/theme_service'
import React, { FC, useContext, useEffect, useRef, useState } from 'react'
import { TextInput } from 'react-native'
import { Container, Input } from './InputModal.styled'

type Props = ModalStackNavigationProp<typeof SCREEN_INPUT_MODAL_FILE_NAME>

export const FileInputModal: FC<Props> = props => {
  const { file, handleFileAction } = props.route.params
  const themeService = useContext(ThemeServiceContext)
  const application = useSafeApplicationContext()

  const fileNameInputRef = useRef<TextInput>(null)

  const [fileName, setFileName] = useState(file.name)

  const onSubmit = async () => {
    const trimmedFileName = fileName.trim()
    if (trimmedFileName === '') {
      setFileName(file.name)
      await application?.alertService.alert('File name cannot be empty')
      fileNameInputRef.current?.focus()
      return
    }
    await handleFileAction({
      type: UploadedFileItemActionType.RenameFile,
      payload: {
        file,
        name: trimmedFileName,
      },
    })
    void application.sync.sync()
    props.navigation.goBack()
  }

  useEffect(() => {
    fileNameInputRef.current?.focus()
  }, [])

  return (
    <Container>
      <TableSection>
        <SectionedTableCell textInputCell first={true}>
          <Input
            ref={fileNameInputRef as any}
            placeholder={'File name'}
            onChangeText={setFileName}
            value={fileName}
            autoCorrect={false}
            autoCapitalize={'none'}
            keyboardAppearance={themeService?.keyboardColorForActiveTheme()}
            underlineColorAndroid={'transparent'}
            onSubmitEditing={onSubmit}
          />
        </SectionedTableCell>

        <ButtonCell
          maxHeight={45}
          disabled={fileName.length === 0}
          title={'Save'}
          bold
          onPress={onSubmit}
        />
      </TableSection>
    </Container>
  )
}
