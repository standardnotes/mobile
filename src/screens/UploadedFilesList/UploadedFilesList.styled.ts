import { StyleSheet } from 'react-native';
import styled, { DefaultTheme } from 'styled-components/native';

export const useUploadedFilesListStyles = (theme: DefaultTheme) => {
  return StyleSheet.create({
    centeredView: {
      justifyContent: 'flex-start',
      alignItems: 'center',
      flexShrink: 1,
      flexGrow: 1,
    },
    filesList: {
      width: '100%',
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
`;
export const FilterTextInputContainer = styled.View`
  flex-direction: row;
  padding: 12px 8px;
  border-bottom-width: 1px;
  border-style: solid;
  border-color: ${({ theme }) => theme.stylekitIron};
  position: relative;
`;
export const FilterTextInput = styled.TextInput`
  border-width: 1px;
  border-color: ${({ theme }) => theme.stylekitIron};
  border-radius: 4px;
  padding: 4px 8px;
  flex-grow: 1;
`;
export const ClearFilterTextIconContainer = styled.View`
  position: absolute;
  top: 60%;
  right: 16px;
`;

export const AttachedFilesList = styled.View`
  align-items: flex-start;
  flex-grow: 1;
  background: lightyellow;
  overflow-y: scroll;
`;
