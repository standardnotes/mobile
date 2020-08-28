import { ICON_LOCK } from '@Style/icons';
import { StyleKit } from '@Style/StyleKit';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import WebView from 'react-native-webview';
import styled from 'styled-components/native';

export const FlexContainer = styled(SafeAreaView).attrs(() => ({
  edges: ['bottom'],
}))`
  flex: 1;
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
`;

export const LockedContainer = styled.View`
  justify-content: flex-start;
  flex-direction: row;
  align-items: center;
  padding: 10px;
  background-color: ${({ theme }) => theme.stylekitDangerColor};
  border-bottom-color: ${({ theme }) => theme.stylekitBorderColor};
  border-bottom-width: 1px;
`;
export const LockedText = styled.Text`
  font-weight: bold;
  font-size: 12px;
  color: ${({ theme }) => theme.stylekitBackgroundColor};
  padding-left: 10px;
`;

export const StyledWebview = styled(WebView)`
  flex: 1;
  background-color: transparent;
  opacity: 0.99;
`;

export const StyledIcon = styled(Icon).attrs(({ theme }) => ({
  color: theme.stylekitBackgroundColor,
  size: 16,
  name: StyleKit.nameForIcon(ICON_LOCK),
}))``;
