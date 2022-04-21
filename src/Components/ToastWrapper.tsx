import { useToastStyles } from '@Components/ToastWrapper.styled'
import React, { FC, useContext } from 'react'
import Toast, { ErrorToast, InfoToast, ToastConfig } from 'react-native-toast-message'
import { ThemeContext } from 'styled-components'

export const ToastWrapper: FC = () => {
  const theme = useContext(ThemeContext)
  const styles = useToastStyles(theme)

  const toastStyles: ToastConfig = {
    info: props => <InfoToast {...props} style={styles.info} />,
    error: props => <ErrorToast {...props} style={styles.error} />,
  }

  return <Toast config={toastStyles} />
}
