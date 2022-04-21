import { StyleSheet } from 'react-native'
import { DefaultTheme } from 'styled-components/native'

export const useToastStyles = (theme: DefaultTheme) => {
  return StyleSheet.create({
    info: {
      borderLeftColor: theme.stylekitInfoColor,
    },
    success: {
      borderLeftColor: theme.stylekitSuccessColor,
    },
    error: {
      borderLeftColor: theme.stylekitWarningColor,
    },
  })
}
