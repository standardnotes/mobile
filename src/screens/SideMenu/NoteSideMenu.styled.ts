import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

export const SafeAreaContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
  color: ${({ theme }) => theme.stylekitForegroundColor};
`;

export const StyledList = styled(FlatList)`
  padding: 15px;
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
`;
