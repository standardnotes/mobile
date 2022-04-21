import { ToastType } from '@Lib/Types'
import { useNavigation } from '@react-navigation/native'
import { useSafeApplicationContext } from '@Root/Hooks/useSafeApplicationContext'
import { SCREEN_INPUT_MODAL_FILE_NAME } from '@Root/Screens/screens'
import { TAppStackNavigationProp } from '@Root/Screens/UploadedFilesList/UploadedFileItem'
import {
  UploadedFileItemAction,
  UploadedFileItemActionType,
} from '@Root/Screens/UploadedFilesList/UploadedFileItemAction'
import { Tabs } from '@Screens/UploadedFilesList/UploadedFilesList'
import {
  ButtonType,
  ChallengeReason,
  ClientDisplayableError,
  ContentType,
  SNFile,
  SNNote,
} from '@standardnotes/snjs'
import { CustomActionSheetOption, useCustomActionSheet } from '@Style/CustomActionSheet'
import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import DocumentPicker, {
  DocumentPickerResponse,
  isInProgress,
  pickMultiple,
} from 'react-native-document-picker'
import FileViewer from 'react-native-file-viewer'
import RNFS, { exists } from 'react-native-fs'
import { Asset, launchCamera, launchImageLibrary, MediaType } from 'react-native-image-picker'
import RNShare from 'react-native-share'
import Toast from 'react-native-toast-message'

type Props = {
  note: SNNote
}
type TDownloadFileAndReturnLocalPathParams = {
  file: SNFile
  saveInTempLocation?: boolean
  showSuccessToast?: boolean
}

type TUploadFileFromCameraOrImageGalleryParams = {
  uploadFromGallery?: boolean
  mediaType?: MediaType
}

export const isFileTypePreviewable = (fileType: string) => {
  const isImage = fileType.startsWith('image/')
  const isVideo = fileType.startsWith('video/')
  const isAudio = fileType.startsWith('audio/')
  const isPdf = fileType === 'application/pdf'
  const isText = fileType === 'text/plain'

  return isImage || isVideo || isAudio || isPdf || isText
}

export const useFiles = ({ note }: Props) => {
  const application = useSafeApplicationContext()

  const { showActionSheet } = useCustomActionSheet()
  const navigation = useNavigation<TAppStackNavigationProp>()

  const [attachedFiles, setAttachedFiles] = useState<SNFile[]>([])
  const [allFiles, setAllFiles] = useState<SNFile[]>([])
  const [isDownloading, setIsDownloading] = useState(false)

  const { Success, Info, Error } = ToastType

  const filesService = application.getFilesService()

  const reloadAttachedFiles = useCallback(() => {
    setAttachedFiles(
      application.items.getFilesForNote(note).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    )
  }, [application, note])

  const reloadAllFiles = useCallback(() => {
    setAllFiles(
      application.items
        .getItems(ContentType.File)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)) as SNFile[]
    )
  }, [application])

  const deleteFileAtPath = useCallback(async (path: string) => {
    try {
      if (await exists(path)) {
        await RNFS.unlink(path)
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  const downloadFileAndReturnLocalPath = useCallback(
    async ({
      file,
      saveInTempLocation = false,
      showSuccessToast = true,
    }: TDownloadFileAndReturnLocalPathParams): Promise<string | undefined> => {
      if (isDownloading) {
        return
      }
      const isGrantedStoragePermissionOnAndroid = await filesService.hasStoragePermissionOnAndroid()

      if (!isGrantedStoragePermissionOnAndroid) {
        return
      }
      setIsDownloading(true)

      try {
        Toast.show({
          type: Info,
          text1: 'Downloading file...',
          autoHide: false,
          onPress: Toast.hide,
        })

        const path = filesService.getDestinationPath({
          fileName: file.name,
          saveInTempLocation,
        })

        await deleteFileAtPath(path)
        await filesService.downloadFileInChunks(file, path)

        if (showSuccessToast) {
          Toast.show({
            type: Success,
            text1: 'Success',
            text2: 'Successfully downloaded file',
            onPress: Toast.hide,
          })
        } else {
          Toast.hide()
        }

        return path
      } catch (error) {
        Toast.show({
          type: Error,
          text1: 'Error',
          text2: 'An error occurred while downloading the file',
          onPress: Toast.hide,
        })
        return
      } finally {
        setIsDownloading(false)
      }
    },
    [Error, Info, Success, deleteFileAtPath, filesService, isDownloading]
  )

  const cleanupTempFileOnAndroid = useCallback(
    async (downloadedFilePath: string) => {
      if (Platform.OS === 'android') {
        await deleteFileAtPath(downloadedFilePath)
      }
    },
    [deleteFileAtPath]
  )

  const shareFile = useCallback(
    async (file: SNFile) => {
      const downloadedFilePath = await downloadFileAndReturnLocalPath({
        file,
        saveInTempLocation: true,
        showSuccessToast: false,
      })
      if (!downloadedFilePath) {
        return
      }
      await application.getAppState().performActionWithoutStateChangeImpact(async () => {
        try {
          // On Android this response always returns {success: false}, there is an open issue for that:
          //  https://github.com/react-native-share/react-native-share/issues/1059
          const shareDialogResponse = await RNShare.open({
            url: `file://${downloadedFilePath}`,
            failOnCancel: false,
          })

          // On iOS the user can store files locally from "Share" screen, so we don't show "Download" option there.
          // For Android the user has a separate "Download" action for the file, therefore after the file is shared,
          // it's not needed anymore and we remove it from the storage.
          await cleanupTempFileOnAndroid(downloadedFilePath)

          if (shareDialogResponse.success) {
            Toast.show({
              type: Success,
              text1: 'Successfully exported file',
              onPress: Toast.hide,
            })
          }
        } catch (error) {
          Toast.show({
            type: Error,
            text1: 'An error occurred while trying to share this file',
            onPress: Toast.hide,
          })
        }
      })
    },
    [Error, Success, application, cleanupTempFileOnAndroid, downloadFileAndReturnLocalPath]
  )

  const attachFileToNote = useCallback(
    async (file: SNFile, showToastAfterAction = true) => {
      await application.items.associateFileWithNote(file, note)

      if (showToastAfterAction) {
        Toast.show({
          type: Success,
          text1: 'Successfully attached file to note',
          onPress: Toast.hide,
        })
      }
    },
    [Success, application, note]
  )

  const detachFileFromNote = useCallback(
    async (file: SNFile) => {
      await application.items.disassociateFileWithNote(file, note)
      Toast.show({
        type: Success,
        text1: 'Successfully detached file from note',
        onPress: Toast.hide,
      })
    },
    [Success, application, note]
  )

  const toggleFileProtection = useCallback(
    async (file: SNFile) => {
      try {
        let result: SNFile | undefined
        if (file.protected) {
          result = await application.mutator.unprotectFile(file)
        } else {
          result = await application.mutator.protectFile(file)
        }
        const isProtected = result ? result.protected : file.protected
        return isProtected
      } catch (error) {
        console.error('An error occurred: ', error)
        return file.protected
      }
    },
    [application]
  )

  const authorizeProtectedActionForFile = useCallback(
    async (file: SNFile, challengeReason: ChallengeReason) => {
      const authorizedFiles = await application.protections.authorizeProtectedActionForFiles(
        [file],
        challengeReason
      )
      return authorizedFiles.length > 0 && authorizedFiles.includes(file)
    },
    [application]
  )

  const renameFile = useCallback(
    async (file: SNFile, fileName: string) => {
      await application.items.renameFile(file, fileName)
    },
    [application]
  )

  const previewFile = useCallback(
    async (file: SNFile) => {
      let downloadedFilePath: string | undefined = ''
      try {
        const isPreviewable = isFileTypePreviewable(file.mimeType)

        if (!isPreviewable) {
          const tryToPreview = await application.alertService.confirm(
            'This file may not be previewable. Do you wish to try anyway?',
            '',
            'Try to preview',
            ButtonType.Info,
            'Cancel'
          )
          if (!tryToPreview) {
            return
          }
        }

        downloadedFilePath = await downloadFileAndReturnLocalPath({
          file,
          saveInTempLocation: true,
          showSuccessToast: false,
        })

        if (!downloadedFilePath) {
          return
        }
        await FileViewer.open(downloadedFilePath, {
          onDismiss: async () => {
            await cleanupTempFileOnAndroid(downloadedFilePath as string)
          },
        })

        return true
      } catch (error) {
        await cleanupTempFileOnAndroid(downloadedFilePath as string)
        await application.alertService.alert('An error occurred while previewing the file.')

        return false
      }
    },
    [application, cleanupTempFileOnAndroid, downloadFileAndReturnLocalPath]
  )

  const deleteFile = useCallback(
    async (file: SNFile) => {
      const shouldDelete = await application.alertService.confirm(
        `Are you sure you want to permanently delete "${file.name}"?`,
        undefined,
        'Confirm',
        ButtonType.Danger,
        'Cancel'
      )
      if (shouldDelete) {
        Toast.show({
          type: Info,
          text1: `Deleting "${file.name}"...`,
        })
        const response = await application.files.deleteFile(file)

        if (response instanceof ClientDisplayableError) {
          Toast.show({
            type: Error,
            text1: response.text,
          })
          return
        }

        Toast.show({
          type: Success,
          text1: `Successfully deleted "${file.name}"`,
        })
      }
    },
    [Error, Info, Success, application.alertService, application.files]
  )

  const handlePickFilesError = async (error: unknown) => {
    if (DocumentPicker.isCancel(error)) {
      // User canceled the picker, exit any dialogs or menus and move on
    } else if (isInProgress(error)) {
      Toast.show({
        type: Info,
        text2: 'Multiple pickers were opened; only the last one will be considered.',
      })
    } else {
      Toast.show({
        type: Error,
        text1: 'An error occurred while attempting to select files.',
      })
    }
  }

  const handleUploadError = async () => {
    Toast.show({
      type: Error,
      text1: 'Error',
      text2: 'An error occurred while uploading file(s).',
    })
  }

  const pickFiles = async (): Promise<DocumentPickerResponse[] | void> => {
    try {
      const selectedFiles = await pickMultiple()

      return selectedFiles
    } catch (error) {
      await handlePickFilesError(error)
    }
  }

  const uploadSingleFile = async (file: DocumentPickerResponse | Asset): Promise<SNFile | void> => {
    try {
      const fileName = filesService.getFileName(file)
      Toast.show({
        type: Info,
        text1: `Uploading "${fileName}"...`,
        autoHide: false,
      })

      const operation = await application.files.beginNewFileUpload()

      if (operation instanceof ClientDisplayableError) {
        Toast.show({
          type: Error,
          text1: operation.text,
        })
        return
      }

      const onChunk = async (chunk: Uint8Array, index: number, isLast: boolean) => {
        await application.files.pushBytesForUpload(operation, chunk, index, isLast)
      }

      const fileResult = await filesService.readFile(file, onChunk)
      const fileObj = await application.files.finishUpload(operation, fileResult)
      if (fileObj instanceof ClientDisplayableError) {
        Toast.show({
          type: Error,
          text1: fileObj.text,
        })
        return
      }
      return fileObj
    } catch (error) {
      await handleUploadError()
    }
  }

  const uploadFiles = async (): Promise<SNFile[] | void> => {
    try {
      const selectedFiles = await pickFiles()
      if (!selectedFiles || selectedFiles.length === 0) {
        return
      }
      const uploadedFiles: SNFile[] = []
      for (const file of selectedFiles) {
        if (!file.uri || !file.size) {
          continue
        }
        const fileObject = await uploadSingleFile(file)
        if (!fileObject) {
          Toast.show({
            type: Error,
            text1: 'Error',
            text2: `An error occurred while uploading ${file.name}.`,
          })
          continue
        }
        uploadedFiles.push(fileObject)

        Toast.show({ text1: `Successfully uploaded ${fileObject.name}` })
      }
      if (selectedFiles.length > 1) {
        Toast.show({ text1: 'Successfully uploaded' })
      }

      return uploadedFiles
    } catch (error) {
      await handleUploadError()
    }
  }

  const handleAttachFromCamera = (currentTab: Tabs | undefined) => {
    const options = [
      {
        text: 'Photo',
        callback: async () => {
          const uploadedFile = await uploadFileFromCameraOrImageGallery({
            mediaType: 'photo',
          })
          if (!uploadedFile) {
            return
          }
          if (shouldAttachToNote(currentTab)) {
            await attachFileToNote(uploadedFile, false)
          }
        },
      },
      {
        text: 'Video',
        callback: async () => {
          const uploadedFile = await uploadFileFromCameraOrImageGallery({
            mediaType: 'video',
          })
          if (!uploadedFile) {
            return
          }
          await attachFileToNote(uploadedFile, false)
        },
      },
    ]
    showActionSheet({
      title: 'Choose file type',
      options,
    })
  }

  const shouldAttachToNote = (currentTab: Tabs | undefined) => {
    return currentTab === undefined || currentTab === Tabs.AttachedFiles
  }

  const handlePressAttachFile = (currentTab?: Tabs) => {
    const options: CustomActionSheetOption[] = [
      {
        text: 'Attach from files',
        key: 'files',
        callback: async () => {
          const uploadedFiles = await uploadFiles()
          if (!uploadedFiles) {
            return
          }
          if (shouldAttachToNote(currentTab)) {
            uploadedFiles.forEach(file => attachFileToNote(file, false))
          }
        },
      },
      {
        text: 'Attach from Photo Library',
        key: 'library',
        callback: async () => {
          const uploadedFile = await uploadFileFromCameraOrImageGallery({
            uploadFromGallery: true,
          })
          if (!uploadedFile) {
            return
          }
          if (shouldAttachToNote(currentTab)) {
            await attachFileToNote(uploadedFile, false)
          }
        },
      },
      {
        text: 'Attach from Camera',
        key: 'camera',
        callback: async () => {
          handleAttachFromCamera(currentTab)
        },
      },
    ]
    const osSpecificOptions =
      Platform.OS === 'android' ? options.filter(option => option.key !== 'library') : options
    showActionSheet({
      title: 'Choose action',
      options: osSpecificOptions,
    })
  }

  const uploadFileFromCameraOrImageGallery = async ({
    uploadFromGallery = false,
    mediaType = 'photo',
  }: TUploadFileFromCameraOrImageGalleryParams): Promise<SNFile | void> => {
    try {
      const result = uploadFromGallery
        ? await launchImageLibrary({ mediaType: 'mixed' })
        : await launchCamera({ mediaType })

      if (result.didCancel || !result.assets) {
        return
      }
      const file = result.assets[0]
      const fileObject = await uploadSingleFile(file)
      if (!file.uri || !file.fileSize) {
        return
      }
      if (!fileObject) {
        Toast.show({
          type: Error,
          text1: 'Error',
          text2: `An error occurred while uploading ${file.fileName}.`,
        })
        return
      }
      Toast.show({ text1: `Successfully uploaded ${fileObject.name}` })

      return fileObject
    } catch (error) {
      await handleUploadError()
    }
  }

  const handleFileAction = useCallback(
    async (action: UploadedFileItemAction) => {
      const file =
        action.type !== UploadedFileItemActionType.RenameFile ? action.payload : action.payload.file
      let isAuthorizedForAction = true

      if (file.protected && action.type !== UploadedFileItemActionType.ToggleFileProtection) {
        isAuthorizedForAction = await authorizeProtectedActionForFile(
          file,
          ChallengeReason.AccessProtectedFile
        )
      }

      if (!isAuthorizedForAction) {
        return false
      }

      switch (action.type) {
        case UploadedFileItemActionType.AttachFileToNote:
          await attachFileToNote(file)
          break
        case UploadedFileItemActionType.DetachFileToNote:
          await detachFileFromNote(file)
          break
        case UploadedFileItemActionType.ShareFile:
          await shareFile(file)
          break
        case UploadedFileItemActionType.DownloadFile:
          await downloadFileAndReturnLocalPath({ file })
          break
        case UploadedFileItemActionType.ToggleFileProtection: {
          await toggleFileProtection(file)
          break
        }
        case UploadedFileItemActionType.RenameFile:
          await renameFile(file, action.payload.name)
          break
        case UploadedFileItemActionType.PreviewFile:
          await previewFile(file)
          break
        case UploadedFileItemActionType.DeleteFile:
          await deleteFile(file)
          break
        default:
          break
      }

      await application.sync.sync()
      return true
    },
    [
      application.sync,
      attachFileToNote,
      authorizeProtectedActionForFile,
      deleteFile,
      detachFileFromNote,
      downloadFileAndReturnLocalPath,
      previewFile,
      renameFile,
      shareFile,
      toggleFileProtection,
    ]
  )

  useEffect(() => {
    const unregisterFileStream = application.streamItems(ContentType.File, () => {
      reloadAttachedFiles()
      reloadAllFiles()
    })

    return () => {
      unregisterFileStream()
    }
  }, [application, reloadAllFiles, reloadAttachedFiles])

  const showActionsMenu = useCallback(
    (file: SNFile | undefined) => {
      if (!file) {
        return
      }
      const isAttachedToNote = attachedFiles.includes(file)

      const actions: CustomActionSheetOption[] = [
        {
          text: 'Preview',
          callback: async () => {
            await handleFileAction({
              type: UploadedFileItemActionType.PreviewFile,
              payload: file,
            })
          },
        },
        {
          text: isAttachedToNote ? 'Detach from note' : 'Attach to note',
          callback: isAttachedToNote
            ? async () => {
                await handleFileAction({
                  type: UploadedFileItemActionType.DetachFileToNote,
                  payload: file,
                })
              }
            : async () => {
                await handleFileAction({
                  type: UploadedFileItemActionType.AttachFileToNote,
                  payload: file,
                })
              },
        },
        {
          text: `${file.protected ? 'Disable' : 'Enable'} password protection`,
          callback: async () => {
            await handleFileAction({
              type: UploadedFileItemActionType.ToggleFileProtection,
              payload: file,
            })
          },
        },
        {
          text: Platform.OS === 'ios' ? 'Export' : 'Share',
          callback: async () => {
            await handleFileAction({
              type: UploadedFileItemActionType.ShareFile,
              payload: file,
            })
          },
        },
        {
          text: 'Download',
          callback: async () => {
            await handleFileAction({
              type: UploadedFileItemActionType.DownloadFile,
              payload: file,
            })
          },
        },
        {
          text: 'Rename',
          callback: () => {
            navigation.navigate(SCREEN_INPUT_MODAL_FILE_NAME, {
              file,
              handleFileAction,
            })
          },
        },
        {
          text: 'Delete permanently',
          callback: async () => {
            await handleFileAction({
              type: UploadedFileItemActionType.DeleteFile,
              payload: file,
            })
          },
          destructive: true,
        },
      ]
      const osDependentActions =
        Platform.OS === 'ios' ? actions.filter(action => action.text !== 'Download') : [...actions]
      showActionSheet({
        title: file.name,
        options: osDependentActions,
        styles: {
          titleTextStyle: {
            fontWeight: 'bold',
          },
        },
      })
    },
    [attachedFiles, handleFileAction, navigation, showActionSheet]
  )

  return {
    showActionsMenu,
    attachedFiles,
    allFiles,
    handlePressAttachFile,
    uploadFileFromCameraOrImageGallery,
    attachFileToNote,
  }
}
