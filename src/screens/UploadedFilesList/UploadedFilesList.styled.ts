import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { DefaultTheme } from 'styled-components/native';

export const useUploadedFilesListStyles = (theme: DefaultTheme) => {
  const insets = useSafeAreaInsets();

  return StyleSheet.create({
    centeredView: {
      justifyContent: 'flex-start',
      alignItems: 'center',
      flexShrink: 1,
      flexGrow: 1,
      paddingBottom: insets.bottom,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomColor: theme.stylekitIron,
      borderBottomWidth: 1,
    },
    headerTabContainer: {
      flexDirection: 'row',
    },
    headerTab: {
      justifyContent: 'center',
      padding: 12,
    },
    activeTab: {
      color: theme.stylekitInfoColor,
      borderBottomColor: theme.stylekitInfoColor,
      borderBottomWidth: 2,
      backgroundColor: '#2b6fcf0f',
    },
    noAttachmentsIconContainer: {
      alignItems: 'center',
      marginTop: 24,
    },
    noAttachmentsIcon: {
      marginTop: 24,
      marginBottom: 24,
    },
    button: {
      borderRadius: 20,
      padding: 10,
      elevation: 2,
    },
    buttonOpen: {
      backgroundColor: '#F194FF',
    },
    buttonClose: {
      backgroundColor: '#2196F3',
    },
  });
};

export const UploadFilesListContainer = styled.View`
  padding-right: 16px;
  padding-left: 16px;
  width: 100%;
  height: 100%;
`;
