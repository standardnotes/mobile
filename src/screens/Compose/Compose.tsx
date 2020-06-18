import React, { useContext, useEffect, useCallback } from 'react';
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
import { Platform } from 'snjs';

export const Compose = (): JSX.Element => {
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);

  useEffect(() => {
    // application?.componentGroup.;
  }, [application]);

  useCallback(() => {
    let unregisterComponent = application.componentManager!.registerHandler(
      {
        identifier: 'editor',
        areas: [
          ComponentArea.NoteTags,
          ComponentArea.EditorStack,
          ComponentArea.Editor,,
        ],
        contextRequestHandler: componentUuid => {
          const currentEditor = this.activeEditorComponent;
          if (
            componentUuid === currentEditor?.uuid ||
            componentUuid === this.activeTagsComponent?.uuid ||
            Uuids(this.getState().activeStackComponents).includes(componentUuid)
          ) {
            return this.note;
          }
        },
        focusHandler: (component, focused) => {
          if (component.isEditor() && focused) {
            this.closeAllMenus();
          }
        },
        actionHandler: (component, action, data) => {
          if (action === ComponentAction.SetSize) {
            const setSize = (
              element: HTMLElement,
              size: { width: number; height: number }
            ) => {
              const widthString =
                typeof size.width === 'string' ? size.width : `${data.width}px`;
              const heightString =
                typeof size.height === 'string'
                  ? size.height
                  : `${data.height}px`;
              element.setAttribute(
                'style',
                `width: ${widthString}; height: ${heightString};`
              );
            };
            if (data.type === 'container') {
              if (component.area === ComponentArea.NoteTags) {
                const container = document.getElementById(
                  ElementIds.NoteTagsComponentContainer
                );
                setSize(container!, data);
              }
            }
          } else if (action === ComponentAction.AssociateItem) {
            if (data.item.content_type === ContentType.Tag) {
              const tag = this.application.findItem(data.item.uuid) as SNTag;
              this.addTag(tag);
            }
          } else if (action === ComponentAction.DeassociateItem) {
            const tag = this.application.findItem(data.item.uuid) as SNTag;
            this.removeTag(tag);
          }
        },,
      }
    );
  }, [application]);

  return (
    <Container>
      {this.note.locked && (
        <LockedContainer>
          <Icon
            name={StyleKit.nameForIcon(ICON_LOCK)}
            size={16}
            color={theme.stylekitBackgroundColor}
          />
          <LockedText>Note Locked</LockedText>
        </LockedContainer>
      )}
      {this.state.webViewError && (
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
      )}
      <NoteTitleInput
        testID="noteTitleField"
        style={this.styles.noteTitle}
        onChangeText={this.onTitleChange}
        value={this.state.title}
        placeholder={'Add Title'}
        selectionColor={theme.stylekitInfoColor}
        underlineColorAndroid={'transparent'}
        placeholderTextColor={theme.stylekitNeutralColor}
        keyboardAppearance={application
          ?.getThemeService()
          .keyboardColorForActiveTheme()}
        autoCorrect={true}
        autoCapitalize={'sentences'}
        editable={!this.note.locked}
      />
      {this.state.loadingWebView && (
        <LoadingWebViewContainer>
          <LoadingWebViewText>{'LOADING'}</LoadingWebViewText>
          <LoadingWebViewSubtitle>
            {noteEditor && noteEditor.content.name}
          </LoadingWebViewSubtitle>
        </LoadingWebViewContainer>
      )}
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
      {!shouldDisplayEditor && application?.platform === Platform.Android && (
        <TextContainer>
          <StyledTextView
            testID="noteContentField"
            ref={ref => (this.input = ref)}
            autoFocus={this.note.dummy}
            value={this.note.text}
            selectionColor={lighten(theme.stylekitInfoColor, 0.35)}
            handlesColor={theme.stylekitInfoColor}
            onChangeText={this.onTextChange}
          />
        </TextContainer>
      )}
      {!shouldDisplayEditor && application?.platform === Platform.Ios && (
        <StyledTextView
          ref={ref => (this.input = ref)}
          autoFocus={false}
          value={this.note.text}
          keyboardDismissMode={'interactive'}
          keyboardAppearance={application
            ?.getThemeService()
            .keyboardColorForActiveTheme()}
          selectionColor={lighten(theme.stylekitInfoColor)}
          onChangeText={this.onTextChange}
          editable={!this.note.locked}
        />
      )}
    </Container>
  );
};
