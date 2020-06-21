import styled from 'styled-components/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';

// We want top color to be different from bottom color of safe area.
// See https://stackoverflow.com/questions/47725607/react-native-safeareaview-background-color-how-to-assign-two-different-backgro
export const FirstSafeAreaView = styled(SafeAreaView)`
  flex: 0;
  background-color: ${({ theme }) => theme.stylekitContrastBackgroundColor};
`;
export const MainSafeAreaView = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
  color: ${({ theme }) => theme.stylekitForegroundColor};
`;
export const SideMenuSectionContainer = styled(FlatList)`
  padding: 15px;
  flex: 1;
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
`;
