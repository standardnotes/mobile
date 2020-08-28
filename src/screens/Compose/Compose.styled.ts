import { Platform } from 'react-native';
import SNTextView from 'sn-textview';
import styled, { css } from 'styled-components/native';

const PADDING = 14;
const NOTE_TITLE_HEIGHT = 50;

export const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
`;
export const LockedContainer = styled.View`
  flex: 1;
  justify-content: flex-start;
  flex-direction: row;
  align-items: center;
  height: 26px;
  max-height: 26px;
  padding-left: ${PADDING}px;
  background-color: ${({ theme }) => theme.stylekitNeutralColor};
  border-bottom-color: ${({ theme }) => theme.stylekitBorderColor};
  border-bottom-width: 1px;
`;
export const LockedText = styled.Text`
  font-weight: bold;
  font-size: 12px;
  color: ${({ theme }) => theme.stylekitBackgroundColor};
  padding-left: 10px;
`;
export const WebViewReloadButton = styled.TouchableOpacity`
  position: absolute;
  right: ${PADDING}px;
  height: 100%;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;
export const WebViewReloadButtonText = styled.Text`
  color: ${({ theme }) => theme.stylekitBackgroundColor};
  font-size: 12px;
  font-weight: bold;
`;
export const NoteTitleInput = styled.TextInput`
  font-weight: 600;
  font-size: 16px;
  color: ${({ theme }) => theme.stylekitForegroundColor};
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
  height: ${NOTE_TITLE_HEIGHT}px;
  border-bottom-color: ${({ theme }) => theme.stylekitBorderColor};
  border-bottom-width: 1px;
  padding-top: ${Platform.OS === 'ios' ? 5 : 12}px;
  padding-left: ${PADDING}px;
  padding-right: ${PADDING}px;
`;
export const LoadingWebViewContainer = styled.View`
  position: absolute;
  height: 100%;
  width: 100%;
  top: ${NOTE_TITLE_HEIGHT}px;
  bottom: 0px;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
`;
export const LoadingWebViewText = styled.Text`
  padding-left: 0px;
  color: ${({ theme }) => theme.stylekitForegroundColor};
  opacity: 0.7;
  font-size: 22px;
  font-weight: bold;
`;
export const LoadingWebViewSubtitle = styled.Text`
  padding-left: 0px;
  color: ${({ theme }) => theme.stylekitForegroundColor};
  opacity: 0.7;
  margin-top: 5px;
`;
export const ContentContainer = styled.View`
  flex-grow: 1;
`;
export const TextContainer = styled.View`
  flex: 1;
`;
export const StyledKeyboardAvoidngView = styled.KeyboardAvoidingView`
  flex: 1;
  ${({ theme }) => theme.stylekitBackgroundColor};
`;

export const StyledTextView = styled(SNTextView)`
  height: 90%;
  padding-top: 10px;
  color: ${({ theme }) => theme.stylekitForegroundColor};
  padding-left: ${({ theme }) =>
    theme.paddingLeft - (Platform.OS === 'ios' ? 5 : 0)}px;
  padding-right: ${({ theme }) =>
    theme.paddingLeft - (Platform.OS === 'ios' ? 5 : 0)}px;
  /* padding-bottom: 10px; */
  ${Platform.OS === 'ios' &&
  css`
    font-size: 17px;
  `}
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
  /* ${Platform.OS === 'ios' && 'padding-bottom: 10px'}; */
`;
