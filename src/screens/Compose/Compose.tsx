import { AppStateEventType } from '@Lib/application_state';
import { isNullOrUndefined } from '@Lib/utils';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_COMPOSE } from '@Screens/screens';
import {
  ApplicationEvent,
  ComponentAction,
  ComponentArea,
  ContentType,
  isPayloadSourceInternalChange,
  isPayloadSourceRetrieved,
  NoteMutator,
  SNComponent,
} from '@standardnotes/snjs';
import { ICON_ALERT, ICON_LOCK } from '@Style/icons';
import { ThemeService, ThemeServiceContext } from '@Style/theme_service';
import { lighten } from '@Style/utils';
import React, { createRef } from 'react';
import { Keyboard, Platform, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import SNTextView from 'sn-textview';
import { ThemeContext } from 'styled-components';
import { ComponentView } from './ComponentView';
import {
  Container,
  LoadingText,
  LoadingWebViewContainer,
  LockedContainer,
  LockedText,
  NoteTitleInput,
  StyledTextView,
  TextContainer,
  WebViewReloadButton,
  WebViewReloadButtonText,
} from './Compose.styled';

const NOTE_PREVIEW_CHAR_LIMIT = 80;
const MINIMUM_STATUS_DURATION = 400;
const SAVE_TIMEOUT_DEBOUNCE = 250;
const SAVE_TIMEOUT_NO_DEBOUNCE = 100;

type State = {
  title: string | undefined;
  saveError: boolean;
  editorComponent: SNComponent | undefined;
  webViewError: boolean;
  loadingWebview: boolean;
  downloadingEditor: boolean;
};

export class Compose extends React.Component<{}, State> {
  static contextType = ApplicationContext;
  context: React.ContextType<typeof ApplicationContext>;
  editorViewRef: React.RefObject<SNTextView> = createRef();
  saveTimeout: number | undefined;
  alreadySaved: boolean = false;
  statusTimeout: number | undefined;
  downloadingMessageTimeout: number | undefined;
  removeEditorObserver?: () => void;
  removeEditorNoteValueChangeObserver?: () => void;
  removeComponentsObserver?: () => void;
  removeEditorNoteChangeObserver?: () => void;
  removeStreamComponents?: () => void;
  removeComponentGroupObserver?: () => void;
  removeStateEventObserver?: () => void;
  removeAppEventObserver?: () => void;
  removeComponentHandler?: () => void;

  state: State = {
    title: '',
    editorComponent: undefined,
    saveError: false,
    webViewError: false,
    loadingWebview: false,
    downloadingEditor: false,
  };

  componentDidMount() {
    const initialEditor = this.context?.editorGroup.activeEditor;

    // eslint-disable-next-line react/no-did-mount-set-state
    this.setState({
      title: initialEditor?.note?.safeTitle(),
    });

    this.removeEditorNoteChangeObserver = this.editor?.addNoteChangeObserver(
      newNote => {
        this.setState(
          {
            title: newNote.title,
          },
          () => {
            this.reloadComponentEditorState();
            if (newNote.dirty) {
              this.showSavingStatus();
            }
          }
        );
      }
    );

    this.removeEditorNoteValueChangeObserver = this.editor?.addNoteValueChangeObserver(
      (newNote, source) => {
        if (isPayloadSourceRetrieved(source!)) {
          this.setState({
            title: newNote.title,
          });
        }
        if (!this.state.title) {
          this.setState({ title: newNote.title });
        }

        if (newNote.lastSyncBegan || newNote.dirty) {
          if (newNote.lastSyncEnd) {
            if (
              newNote.dirty ||
              newNote.lastSyncBegan!.getTime() > newNote.lastSyncEnd.getTime()
            ) {
              this.showSavingStatus();
            } else if (
              newNote.lastSyncEnd.getTime() > newNote.lastSyncBegan!.getTime()
            ) {
              this.showAllChangesSavedStatus();
            }
          } else {
            this.showSavingStatus();
          }
        }
      }
    );

    this.removeStreamComponents = this.context?.streamItems(
      ContentType.Component,
      async (_items, source) => {
        if (isPayloadSourceInternalChange(source!)) {
          return;
        }
        if (!this.note) {
          return;
        }

        this.reloadComponentEditorState();
      }
    );

    this.removeComponentGroupObserver = this.context?.componentGroup.addChangeObserver(
      async () => {
        const newEditor = this.context?.componentGroup.activeComponentForArea(
          ComponentArea.Editor
        );
        this.setState({
          editorComponent: newEditor,
        });
      }
    );

    this.removeAppEventObserver = this.context?.addEventObserver(
      async eventName => {
        if (eventName === ApplicationEvent.CompletedFullSync) {
          /** if we're still dirty, don't change status, a sync is likely upcoming. */
          if (!this.note?.dirty && this.state.saveError) {
            this.showAllChangesSavedStatus();
          }
        } else if (eventName === ApplicationEvent.FailedSync) {
          /**
           * Only show error status in editor if the note is dirty.
           * Otherwise, it means the originating sync came from somewhere else
           * and we don't want to display an error here.
           */
          if (this.note?.dirty) {
            this.showErrorStatus('Sync Unavailable (changes saved offline)');
          }
        } else if (eventName === ApplicationEvent.LocalDatabaseWriteError) {
          this.showErrorStatus('Offline Saving Issue (changes not saved)');
        }
      }
    );

    this.removeComponentHandler = this.context?.componentManager!.registerHandler(
      {
        identifier: 'component-view-' + Math.random(),
        areas: [ComponentArea.Editor],
        actionHandler: (currentComponent, action, data) => {
          switch (action) {
            case ComponentAction.SetSize:
              this.context?.componentManager!.handleSetSizeEvent(
                currentComponent,
                data
              );
              break;
            case ComponentAction.ThemesActivated:
              this.setState({
                loadingWebview: false,
              });
              break;
          }
        },
        contextRequestHandler: () => this.note,
      }
    );

    this.removeStateEventObserver = this.context
      ?.getAppState()
      .addStateEventObserver(state => {
        if (state === AppStateEventType.DrawerOpen) {
          this.dismissKeyboard();
          /**
           * Saves latest note state before any change might happen in the drawer
           */
        }
      });

    if (this.editor?.isTemplateNote && Platform.OS === 'ios') {
      setTimeout(() => {
        this.editorViewRef?.current?.focus();
      }, 0);
    }
  }

  componentWillUnmount() {
    this.dismissKeyboard();
    this.removeEditorNoteValueChangeObserver &&
      this.removeEditorNoteValueChangeObserver();
    this.removeEditorNoteChangeObserver &&
      this.removeEditorNoteChangeObserver();
    this.removeAppEventObserver && this.removeAppEventObserver();
    this.removeComponentGroupObserver && this.removeComponentGroupObserver();
    this.removeStreamComponents && this.removeStreamComponents();
    this.removeStateEventObserver && this.removeStateEventObserver();
    this.removeComponentHandler && this.removeComponentHandler();
    this.removeStateEventObserver = undefined;
    this.removeComponentHandler = undefined;
    this.removeStreamComponents = undefined;
    this.removeAppEventObserver = undefined;
    this.removeComponentGroupObserver = undefined;
    this.removeEditorNoteChangeObserver = undefined;
    this.removeEditorNoteValueChangeObserver = undefined;
    if (this.editor) {
      this.context?.editorGroup?.closeEditor(this.editor);
    }
    if (this.state.editorComponent) {
      this.context?.componentGroup?.deactivateComponent(
        this.state.editorComponent,
        false
      );
    }

    this.context?.getStatusManager()?.setMessage(SCREEN_COMPOSE, '');
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
    }
    if (this.downloadingMessageTimeout) {
      clearTimeout(this.downloadingMessageTimeout);
    }
  }

  /**
   * Because note.locked accesses note.content.appData,
   * we do not want to expose the template to direct access to note.locked,
   * otherwise an exception will occur when trying to access note.locked if the note
   * is deleted. There is potential for race conditions to occur with setState, where a
   * previous setState call may have queued a digest cycle, and the digest cycle triggers
   * on a deleted note.
   */
  get noteLocked() {
    if (!this.note || this.note.deleted) {
      return false;
    }
    return this.note.locked;
  }

  setStatus = (status: string, color?: string, wait: boolean = true) => {
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
    }
    if (wait) {
      this.statusTimeout = setTimeout(() => {
        this.context
          ?.getStatusManager()
          ?.setMessage(SCREEN_COMPOSE, status, color);
      }, MINIMUM_STATUS_DURATION);
    } else {
      this.context
        ?.getStatusManager()
        ?.setMessage(SCREEN_COMPOSE, status, color);
    }
  };

  showSavingStatus = () => {
    this.setStatus('Saving...', undefined, false);
  };

  showAllChangesSavedStatus = () => {
    this.setState({
      saveError: false,
    });
    const offlineStatus = this.context?.hasAccount() ? '' : ' (offline)';
    this.setStatus('All changes saved' + offlineStatus);
  };

  showErrorStatus = (message: string) => {
    this.setState({
      saveError: true,
    });
    this.setStatus(message);
  };

  get note() {
    return this.context?.editorGroup.activeEditor.note;
  }

  get editor() {
    return this.context?.editorGroup.activeEditor;
  }

  dismissKeyboard = () => {
    Keyboard.dismiss();
    this.editorViewRef.current?.blur();
  };

  reloadComponentEditorState = async () => {
    this.setState({
      loadingWebview: false,
      webViewError: false,
    });

    const associatedEditor = this.context?.componentManager!.editorForNote(
      this.note!
    );

    if (!associatedEditor) {
      /** No editor */
      if (this.state.editorComponent) {
        await this.context?.componentGroup.deactivateComponent(
          this.state.editorComponent
        );
      }
    } else if (associatedEditor.uuid !== this.state.editorComponent?.uuid) {
      await this.context?.componentGroup.activateComponent(associatedEditor);
    }

    this.context?.componentManager!.contextItemDidChangeInArea(
      ComponentArea.Editor
    );
  };

  saveNote = async (
    bypassDebouncer: boolean,
    isUserModified: boolean,
    dontUpdatePreviews: boolean,
    closeAfterSync: boolean,
    newNoteText?: string
  ) => {
    const { editor, note } = this;
    const { title } = this.state;

    if (!note) {
      return;
    }
    if (note?.deleted) {
      this.context!.alertService!.alert(
        'Attempting to save this note has failed. The note has previously been deleted.'
      );
      return;
    }
    if (editor?.isTemplateNote) {
      await editor?.insertTemplatedNote();
      if (this.context?.getAppState().selectedTag?.isSmartTag === false) {
        await this.context.changeItem(
          this.context?.getAppState().selectedTag!.uuid,
          mutator => {
            mutator.addItemAsRelationship(note!);
          }
        );
      }
    }
    if (!this.context?.findItem(note!.uuid)) {
      this.context?.alertService!.alert(
        'Attempting to save this note has failed. The note cannot be found.'
      );
      return;
    }
    await this.context!.changeItem(
      note!.uuid,
      mutator => {
        const noteMutator = mutator as NoteMutator;
        noteMutator.title = title!;
        noteMutator.text = newNoteText ?? note.text;
        if (!dontUpdatePreviews) {
          const text = newNoteText ?? '';
          const truncate = text.length > NOTE_PREVIEW_CHAR_LIMIT;
          const substring = text.substring(0, NOTE_PREVIEW_CHAR_LIMIT);
          const previewPlain = substring + (truncate ? '...' : '');
          noteMutator.preview_plain = previewPlain;
          noteMutator.preview_html = undefined;
        }
      },
      isUserModified
    );

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    const noDebounce = bypassDebouncer || this.context?.noAccount();
    const syncDebouceMs = noDebounce
      ? SAVE_TIMEOUT_NO_DEBOUNCE
      : SAVE_TIMEOUT_DEBOUNCE;
    this.saveTimeout = setTimeout(() => {
      this.context?.sync();
      if (closeAfterSync) {
        this.context?.getAppState().closeEditor(editor!);
      }
    }, syncDebouceMs);
  };

  onTitleChange = (newTitle: string) => {
    this.setState(
      {
        title: newTitle,
      },
      () => this.saveNote(false, true, false, false)
    );
  };

  onContentChange = (newNoteText: string) => {
    if (Platform.OS === 'android' && this.note?.locked) {
      this.context?.alertService?.alert(
        'This note is locked. Please unlock this note to make changes.'
      );
      return;
    }
    this.saveNote(false, true, false, false, newNoteText);
  };

  onDownloadEditorStart = () =>
    this.setState({
      downloadingEditor: true,
    });

  onDownloadEditorEnd = () => {
    if (this.downloadingMessageTimeout) {
      clearTimeout(this.downloadingMessageTimeout);
    }

    this.downloadingMessageTimeout = setTimeout(
      () =>
        this.setState({
          downloadingEditor: false,
        }),
      200
    );
  };

  render() {
    const shouldDisplayEditor =
      this.state.editorComponent &&
      Boolean(this.note) &&
      !this.note?.prefersPlainEditor &&
      !this.state.webViewError;

    return (
      <Container>
        <ThemeContext.Consumer>
          {theme => (
            <>
              {this.noteLocked && (
                <LockedContainer>
                  <Icon
                    name={ThemeService.nameForIcon(ICON_LOCK)}
                    size={16}
                    color={theme.stylekitBackgroundColor}
                  />
                  <LockedText>Note Locked</LockedText>
                </LockedContainer>
              )}
              {this.state.webViewError && (
                <LockedContainer>
                  <Icon
                    name={ThemeService.nameForIcon(ICON_ALERT)}
                    size={16}
                    color={theme.stylekitBackgroundColor}
                  />
                  <LockedText>
                    Unable to load {this.state.editorComponent?.name}
                  </LockedText>
                  <WebViewReloadButton
                    onPress={() => {
                      this.setState({
                        loadingWebview: false,
                        webViewError: false,
                      });
                    }}
                  >
                    <WebViewReloadButtonText>Reload</WebViewReloadButtonText>
                  </WebViewReloadButton>
                </LockedContainer>
              )}
              <ThemeServiceContext.Consumer>
                {themeService => (
                  <>
                    <NoteTitleInput
                      testID="noteTitleField"
                      onChangeText={this.onTitleChange}
                      value={this.state.title}
                      placeholder={'Add Title'}
                      selectionColor={theme.stylekitInfoColor}
                      underlineColorAndroid={'transparent'}
                      placeholderTextColor={theme.stylekitNeutralColor}
                      keyboardAppearance={themeService?.keyboardColorForActiveTheme()}
                      autoCorrect={true}
                      autoCapitalize={'sentences'}
                      editable={!this.noteLocked}
                    />
                    {(this.state.downloadingEditor ||
                      this.state.loadingWebview) && (
                      <LoadingWebViewContainer locked={this.noteLocked}>
                        <LoadingText>
                          {this.state.downloadingEditor
                            ? 'Downloading '
                            : 'Loading '}
                          {this.state.editorComponent?.name}...
                        </LoadingText>
                      </LoadingWebViewContainer>
                    )}
                    {/* setting webViewError to false on onLoadEnd will cause an infinite loop on Android upon webview error, so, don't do that. */}
                    {shouldDisplayEditor && (
                      <ComponentView
                        key={this.state.editorComponent!.uuid}
                        componentUuid={this.state.editorComponent!.uuid}
                        note={this.note!}
                        onLoadStart={() => {
                          this.setState({
                            loadingWebview: true,
                            webViewError: false,
                          });
                        }}
                        onLoadEnd={() => {
                          this.setState({
                            loadingWebview: false,
                          });
                        }}
                        onLoadError={() => {
                          this.setState({
                            loadingWebview: false,
                            webViewError: true,
                          });
                        }}
                        onDownloadEditorStart={this.onDownloadEditorStart}
                        onDownloadEditorEnd={this.onDownloadEditorEnd}
                        offlineOnly={this.state.editorComponent?.offlineOnly}
                      />
                    )}
                    {!shouldDisplayEditor &&
                      !isNullOrUndefined(this.note) &&
                      Platform.OS === 'android' && (
                        <TextContainer>
                          <StyledTextView
                            testID="noteContentField"
                            ref={this.editorViewRef}
                            autoFocus={false}
                            value={this.note?.text}
                            selectionColor={lighten(
                              theme.stylekitInfoColor,
                              0.35
                            )}
                            handlesColor={theme.stylekitInfoColor}
                            onChangeText={this.onContentChange}
                          />
                        </TextContainer>
                      )}
                    {/* Empty wrapping view fixes native textview crashing */}
                    {!shouldDisplayEditor && Platform.OS === 'ios' && (
                      <View key={this.note?.uuid}>
                        <StyledTextView
                          testID="noteContentField"
                          ref={this.editorViewRef}
                          autoFocus={false}
                          multiline
                          value={this.note?.text}
                          keyboardDismissMode={'interactive'}
                          keyboardAppearance={themeService?.keyboardColorForActiveTheme()}
                          selectionColor={lighten(theme.stylekitInfoColor)}
                          onChangeText={this.onContentChange}
                          editable={!this.noteLocked}
                        />
                      </View>
                    )}
                  </>
                )}
              </ThemeServiceContext.Consumer>
            </>
          )}
        </ThemeContext.Consumer>
      </Container>
    );
  }
}
