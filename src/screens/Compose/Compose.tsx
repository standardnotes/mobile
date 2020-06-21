import React, {
  useContext,
  useEffect,
  useCallback,
  useState,
  createRef,
} from 'react';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ThemeContext } from 'styled-components/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ICON_LOCK, ICON_ALERT } from '@Style/icons';
import {
  Container,
  LockedContainer,
  LockedText,
  WebViewReloadButton,
  WebViewReloadButtonText,
  LoadingWebViewSubtitle,
  StyledTextView,
  TextContainer,
  LoadingWebViewContainer,
  LoadingWebViewText,
  NoteTitleInput,
} from './Compose.styled';
import { StyleKit } from '@Style/StyleKit';
import { Platform, ComponentArea } from 'snjs';
import { lighten } from '@Style/utils';
import TextView from 'sn-textview';

export const Compose = (): JSX.Element => {
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  const [webViewError, setWebviewError] = useState();
  const [title, setTitle] = useState('');
  const [basicNote, setBasicNote] = useState('');
  const editorViewRef = createRef<TextView>();

  return (
    <Container>
      {/* {this.note.locked && (
        <LockedContainer>
          <Icon
            name={StyleKit.nameForIcon(ICON_LOCK)}
            size={16}
            color={theme.stylekitBackgroundColor}
          />
          <LockedText>Note Locked</LockedText>
        </LockedContainer>
      )} */}
      {/* {webViewError && (
        <LockedContainer>
          <Icon
            name={StyleKit.nameForIcon(ICON_ALERT)}
            size={16}
            color={theme.stylekitBackgroundColor}
          />
          <LockedText>
            Unable to load {noteEditor && noteEditor.content.name}
          </LockedText>
          <WebViewReloadButton onPress={this.reloadEditor}>
            <WebViewReloadButtonText>Reload</WebViewReloadButtonText>
          </WebViewReloadButton>
        </LockedContainer>
      )} */}
      <NoteTitleInput
        testID="noteTitleField"
        onChangeText={setTitle}
        value={title}
        placeholder={'Add Title'}
        selectionColor={theme.stylekitInfoColor}
        underlineColorAndroid={'transparent'}
        placeholderTextColor={theme.stylekitNeutralColor}
        keyboardAppearance={application
          ?.getThemeService()
          .keyboardColorForActiveTheme()}
        autoCorrect={true}
        autoCapitalize={'sentences'}
        // editable={!this.note.locked}
      />
      {/* {this.state.loadingWebView && (
        <LoadingWebViewContainer>
          <LoadingWebViewText>{'LOADING'}</LoadingWebViewText>
          <LoadingWebViewSubtitle>
            {noteEditor && noteEditor.content.name}
          </LoadingWebViewSubtitle>
        </LoadingWebViewContainer>
      )} */}
      {/* setting webViewError to false on onLoadEnd will cause an infinite loop on Android upon webview error, so, don't do that. */}
      {/* {shouldDisplayEditor && (
        <ComponentView
          key={noteEditor.uuid}
          noteId={this.note.uuid}
          editorId={noteEditor.uuid}
          onLoadStart={() => {
            this.setState({ loadingWebView: true, webViewError: false });
          }}

          onLoadEnd={() => {
            this.setState({ loadingWebView: false });
          }}
          onLoadError={() => {
            this.setState({ loadingWebView: false, webViewError: true });
          }}
        />
      )} */}
      {application?.platform === Platform.Android && (
        <TextContainer>
          <StyledTextView
            testID="noteContentField"
            ref={editorViewRef}
            autoFocus={false}
            value={basicNote}
            selectionColor={lighten(theme.stylekitInfoColor, 0.35)}
            handlesColor={theme.stylekitInfoColor}
            onChangeText={setBasicNote}
          />
        </TextContainer>
      )}
      {application?.platform === Platform.Ios && (
        <StyledTextView
          ref={editorViewRef}
          autoFocus={false}
          value={basicNote}
          keyboardDismissMode={'interactive'}
          keyboardAppearance={application
            ?.getThemeService()
            .keyboardColorForActiveTheme()}
          selectionColor={lighten(theme.stylekitInfoColor)}
          onChangeText={setBasicNote}
          // editable={!this.note.locked}
        />
      )}
    </Container>
  );
};
