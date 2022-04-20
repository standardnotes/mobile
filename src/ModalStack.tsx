import { BlockingModal } from '@Components/BlockingModal'
import { HeaderTitleView } from '@Components/HeaderTitleView'
import { IoniconsHeaderButton } from '@Components/IoniconsHeaderButton'
import { RouteProp } from '@react-navigation/native'
import {
  createStackNavigator,
  StackNavigationProp,
} from '@react-navigation/stack'
import { Authenticate } from '@Screens/Authenticate/Authenticate'
import { FileInputModal } from '@Screens/InputModal/FileInputModal'
import { PasscodeInputModal } from '@Screens/InputModal/PasscodeInputModal'
import { TagInputModal } from '@Screens/InputModal/TagInputModal'
import { ManageSessions } from '@Screens/ManageSessions/ManageSessions'
import {
  MODAL_BLOCKING_ALERT,
  SCREEN_AUTHENTICATE,
  SCREEN_INPUT_MODAL_FILE_NAME,
  SCREEN_INPUT_MODAL_PASSCODE,
  SCREEN_INPUT_MODAL_TAG,
  SCREEN_MANAGE_SESSIONS,
  SCREEN_SETTINGS,
  SCREEN_UPLOADED_FILES_LIST,
} from '@Screens/screens'
import { Settings } from '@Screens/Settings/Settings'
import { UploadedFileItemAction } from '@Screens/UploadedFilesList/UploadedFileItemAction'
import { UploadedFilesList } from '@Screens/UploadedFilesList/UploadedFilesList'
import { Challenge, DeinitSource, SNFile, SNNote } from '@standardnotes/snjs'
import { ICON_CHECKMARK, ICON_CLOSE } from '@Style/icons'
import { ThemeService } from '@Style/theme_service'
import React, { memo, useContext } from 'react'
import { Platform } from 'react-native'
import { HeaderButtons, Item } from 'react-navigation-header-buttons'
import { ThemeContext } from 'styled-components'
import { HeaderTitleParams, TEnvironment } from './App'
import { ApplicationContext } from './ApplicationContext'
import { AppStackComponent } from './AppStack'
import { HistoryStack } from './HistoryStack'

export type ModalStackNavigatorParamList = {
  AppStack: undefined
  HistoryStack: undefined
  [SCREEN_SETTINGS]: undefined
  [SCREEN_MANAGE_SESSIONS]: undefined
  [SCREEN_INPUT_MODAL_TAG]: HeaderTitleParams & {
    tagUuid?: string
    noteUuid?: string
  }
  [SCREEN_INPUT_MODAL_FILE_NAME]: HeaderTitleParams & {
    file: SNFile
    handleFileAction: (action: UploadedFileItemAction) => Promise<boolean>
  }
  [SCREEN_UPLOADED_FILES_LIST]: HeaderTitleParams & {
    note: SNNote
  }
  [SCREEN_INPUT_MODAL_PASSCODE]: undefined
  [SCREEN_AUTHENTICATE]: {
    challenge: Challenge
    title?: string
  }
  [MODAL_BLOCKING_ALERT]: {
    title?: string
    text: string
  }
}

export type ModalStackNavigationProp<
  T extends keyof ModalStackNavigatorParamList
> = {
  navigation: StackNavigationProp<ModalStackNavigatorParamList, T>
  route: RouteProp<ModalStackNavigatorParamList, T>
}

const MainStack = createStackNavigator<ModalStackNavigatorParamList>()

export const MainStackComponent = ({ env }: { env: TEnvironment }) => {
  const application = useContext(ApplicationContext)
  const theme = useContext(ThemeContext)

  const MemoizedAppStackComponent = memo(
    (props: ModalStackNavigationProp<'AppStack'>) => (
      <AppStackComponent {...props} env={env} />
    )
  )

  return (
    <MainStack.Navigator
      screenOptions={{
        gestureEnabled: false,
        presentation: 'modal',
        headerStyle: {
          backgroundColor: theme.stylekitContrastBackgroundColor,
        },
      }}
      initialRouteName="AppStack"
    >
      <MainStack.Screen
        name={'AppStack'}
        options={{
          headerShown: false,
        }}
        component={MemoizedAppStackComponent}
      />
      <MainStack.Screen
        options={{
          headerShown: false,
        }}
        name="HistoryStack"
        component={HistoryStack}
      />
      <MainStack.Screen
        name={SCREEN_SETTINGS}
        options={() => ({
          title: 'Settings',
          headerTitle: ({ children }) => {
            return <HeaderTitleView title={children || ''} />
          },
          headerLeft: ({ disabled, onPress }) => (
            <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
              <Item
                testID="headerButton"
                disabled={disabled}
                title={Platform.OS === 'ios' ? 'Done' : ''}
                iconName={
                  Platform.OS === 'ios'
                    ? undefined
                    : ThemeService.nameForIcon(ICON_CHECKMARK)
                }
                onPress={onPress}
              />
            </HeaderButtons>
          ),
          headerRight: () =>
            (env === 'dev' || __DEV__) && (
              <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
                <Item
                  testID="headerButton"
                  title={'Destroy Data'}
                  onPress={async () => {
                    await application?.deviceInterface?.removeAllRawStorageValues()
                    await application?.deviceInterface?.removeAllRawDatabasePayloads(
                      application?.identifier
                    )
                    application?.deinit(DeinitSource.SignOut)
                  }}
                />
              </HeaderButtons>
            ),
        })}
        component={Settings}
      />
      <MainStack.Screen
        name={SCREEN_MANAGE_SESSIONS}
        options={() => ({
          title: 'Active Sessions',
          headerTitle: ({ children }) => {
            return <HeaderTitleView title={children || ''} />
          },
          headerLeft: ({ disabled, onPress }) => (
            <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
              <Item
                testID="headerButton"
                disabled={disabled}
                title={Platform.OS === 'ios' ? 'Done' : ''}
                iconName={
                  Platform.OS === 'ios'
                    ? undefined
                    : ThemeService.nameForIcon(ICON_CHECKMARK)
                }
                onPress={onPress}
              />
            </HeaderButtons>
          ),
        })}
        component={ManageSessions}
      />
      <MainStack.Screen
        name={SCREEN_INPUT_MODAL_PASSCODE}
        options={{
          title: 'Setup Passcode',
          headerTitle: ({ children }) => {
            return <HeaderTitleView title={children || ''} />
          },
          headerLeft: ({ disabled, onPress }) => (
            <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
              <Item
                testID="headerButton"
                disabled={disabled}
                title={Platform.OS === 'ios' ? 'Cancel' : ''}
                iconName={
                  Platform.OS === 'ios'
                    ? undefined
                    : ThemeService.nameForIcon(ICON_CLOSE)
                }
                onPress={onPress}
              />
            </HeaderButtons>
          ),
        }}
        component={PasscodeInputModal}
      />
      <MainStack.Screen
        name={SCREEN_INPUT_MODAL_TAG}
        options={({ route }) => ({
          title: 'Tag',
          gestureEnabled: false,
          headerTitle: ({ children }) => {
            return (
              <HeaderTitleView
                title={route.params?.title ?? (children || '')}
              />
            )
          },
          headerLeft: ({ disabled, onPress }) => (
            <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
              <Item
                testID="headerButton"
                disabled={disabled}
                title={Platform.OS === 'ios' ? 'Cancel' : ''}
                iconName={
                  Platform.OS === 'ios'
                    ? undefined
                    : ThemeService.nameForIcon(ICON_CLOSE)
                }
                onPress={onPress}
              />
            </HeaderButtons>
          ),
        })}
        component={TagInputModal}
      />
      <MainStack.Screen
        name={SCREEN_INPUT_MODAL_FILE_NAME}
        options={({ route }) => ({
          title: 'File',
          gestureEnabled: false,
          headerTitle: ({ children }) => {
            return (
              <HeaderTitleView
                title={route.params?.title ?? (children || '')}
              />
            )
          },
          headerLeft: ({ disabled, onPress }) => (
            <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
              <Item
                testID="headerButton"
                disabled={disabled}
                title={Platform.OS === 'ios' ? 'Cancel' : ''}
                iconName={
                  Platform.OS === 'ios'
                    ? undefined
                    : ThemeService.nameForIcon(ICON_CLOSE)
                }
                onPress={onPress}
              />
            </HeaderButtons>
          ),
        })}
        component={FileInputModal}
      />

      <MainStack.Screen
        name={SCREEN_AUTHENTICATE}
        options={({ route }) => ({
          title: 'Authenticate',
          headerLeft: () => undefined,
          headerTitle: ({ children }) => (
            <HeaderTitleView title={route.params?.title ?? (children || '')} />
          ),
        })}
        component={Authenticate}
      />
      <MainStack.Screen
        name={SCREEN_UPLOADED_FILES_LIST}
        options={() => ({
          title: 'Files',
          headerLeft: ({ disabled, onPress }) => (
            <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
              <Item
                testID="headerButton"
                disabled={disabled}
                title={Platform.OS === 'ios' ? 'Close' : ''}
                iconName={
                  Platform.OS === 'ios'
                    ? undefined
                    : ThemeService.nameForIcon(ICON_CLOSE)
                }
                onPress={onPress}
              />
            </HeaderButtons>
          ),
        })}
        component={UploadedFilesList}
      />
      <MainStack.Screen
        name={MODAL_BLOCKING_ALERT}
        options={() => ({
          headerShown: false,
          cardStyle: { backgroundColor: 'rgba(0, 0, 0, 0.15)' },
          cardOverlayEnabled: true,
          cardStyleInterpolator: ({ current: { progress } }) => ({
            cardStyle: {
              opacity: progress.interpolate({
                inputRange: [0, 0.5, 0.9, 1],
                outputRange: [0, 0.25, 0.7, 1],
              }),
            },
            overlayStyle: {
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
                extrapolate: 'clamp',
              }),
            },
          }),
        })}
        component={BlockingModal}
      />
    </MainStack.Navigator>
  )
}
