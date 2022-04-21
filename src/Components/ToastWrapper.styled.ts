import { StyleSheet } from 'react-native'
import { DefaultTheme } from 'styled-components/native'

export const useToastStyles = (theme: DefaultTheme) => {
  return StyleSheet.create({
    info: {
      borderLeftColor: theme.stylekitInfoColor,
    },
    error: {
      borderLeftColor: theme.stylekitWarningColor,
    },
  })
}
