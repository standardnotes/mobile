import styled from 'styled-components/native';
import WebView from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';
import { StyleKit } from '@Style/StyleKit';
import { ICON_LOCK } from '@Style/icons';

export const FlexContainer = styled.View`
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
`;

export const StyledIcon = styled(Icon).attrs(({ theme }) => ({
  color: theme.stylekitBackgroundColor,
  size: 16,
  name: StyleKit.nameForIcon(ICON_LOCK),
}))``;
