import { TextInput } from 'react-native';
import styled from 'styled-components/native';

export const FileDataContainer = styled.View`
  align-items: flex-start;
  flex-direction: row;
  padding-top: 12px;
`;
export const FileIconContainer = styled.View`
  margin-top: 2px;
  margin-right: 16px;
`;
export const FileDetailsContainer = styled.View`
  margin-right: 16px;
  width: 100%;
`;
export const FileName = styled.Text`
  font-size: 16px;
  margin-bottom: 4px;
  color: ${({ theme }) => theme.stylekitCodGray};
`;
export const FileDateAndSizeContainer = styled.View`
  border-bottom-color: ${({ theme }) => theme.stylekitIron};
  border-bottom-width: 1px;
  color: ${({ theme }) => theme.stylekitAbbey};
  font-size: 12px;
  padding-bottom: 12px;
`;
export const FileNameTextInput = styled(TextInput)`
  border-width: 1px;
  border-style: solid;
  border-color: ${({ theme }) => theme.stylekitInfoColor};
  padding: 4px 8px;
  margin-bottom: 4px;
  margin-right: 120px;
`;
