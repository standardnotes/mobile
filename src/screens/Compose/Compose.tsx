import { AppStateEventType } from '@Lib/ApplicationState';
import { Editor } from '@Lib/Editor';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppStackNavigationProp } from '@Root/App';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_COMPOSE } from '@Screens/screens';
import { ICON_ALERT, ICON_LOCK } from '@Style/icons';
import { StyleKit, StyleKitContext } from '@Style/StyleKit';
import { lighten } from '@Style/utils';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Keyboard, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import SNTextView from 'sn-textview';
import {
  ApplicationEvent,
  ComponentArea,
  ContentType,
  isPayloadSourceRetrieved,
  NoteMutator,
  PayloadSource,
  Platform,
  SNComponent,
  SNNote,
} from 'snjs';
import { ThemeContext } from 'styled-components/native';
import { ComponentView } from './ComponentView';
import {
  Container,
  LoadingWebViewContainer,
  LoadingWebViewSubtitle,
  LoadingWebViewText,
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
const SAVE_TIMEOUT_DEBOUNCE = 350;
const SAVE_TIMEOUT_NO_DEBOUNCE = 100;

export const Compose = (): JSX.Element => {
  // Context
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  const styleKit = useContext(StyleKitContext);
  const navigation = useNavigation<
    AppStackNavigationProp<typeof SCREEN_COMPOSE>['navigation']
  >();

  //State
  const [title, setTitle] = useState<string | undefined>();
  const [noteText, setNoteText] = useState<string | undefined>(undefined);
  const [editor, setEditor] = useState<Editor | undefined>();
  const [note, setNote] = useState<SNNote | undefined>();
  const [saveError, setSaveError] = useState(false);
  const [editorComponent, setEditorComponent] = useState<
    SNComponent | undefined
  >();
  const [webViewError, setWebviewError] = useState(false);
  const [loadingWebview, setLoadingWebview] = useState(false);

  // Ref
  const editorViewRef = useRef<SNTextView>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const statusTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const dissmissKeybard = () => {
    Keyboard.dismiss();
    editorViewRef.current?.blur();
  };

  const setStatus = useCallback(
    (status: string, color?: string, wait: boolean = true) => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      if (wait) {
        statusTimeoutRef.current = setTimeout(() => {
          navigation.setParams({
            subTitle: status,
            subTitleColor: color,
          });
        }, MINIMUM_STATUS_DURATION);
      } else {
        navigation.setParams({
          subTitle: status,
          subTitleColor: color,
        });
      }
    },
    [navigation]
  );

  const showSavingStatus = useCallback(() => {
    setStatus('Saving...', undefined, false);
  }, [setStatus]);

  const showAllChangesSavedStatus = useCallback(() => {
    setSaveError(false);
    setStatus('All changes saved');
  }, [setStatus]);

  const showErrorStatus = useCallback(
    (message: string) => {
      setSaveError(true);
      setStatus(message, theme.stylekitWarningColor);
    },
    [setStatus, theme.stylekitWarningColor]
  );

  useEffect(() => {
    const unsubscribeStateEventObserver = application
      ?.getAppState()
      .addStateEventObserver(state => {
        if (state === AppStateEventType.DrawerOpen) {
          dissmissKeybard();
        }
      });

    const unsubscribeAppEventObserver = application?.addEventObserver(
      async eventName => {
        if (eventName === ApplicationEvent.HighLatencySync) {
          // this.setState({ syncTakingTooLong: true });
        } else if (eventName === ApplicationEvent.CompletedFullSync) {
          // this.setState({ syncTakingTooLong: false });
          // const isInErrorState = this.state.saveError;
          /** if we're still dirty, don't change status, a sync is likely upcoming. */
          if (!note?.dirty && saveError) {
            showAllChangesSavedStatus();
          }
        } else if (eventName === ApplicationEvent.FailedSync) {
          /**
           * Only show error status in editor if the note is dirty.
           * Otherwise, it means the originating sync came from somewhere else
           * and we don't want to display an error here.
           */
          if (note?.dirty) {
            showErrorStatus('Sync Unavailable (changes saved offline)');
          }
        } else if (eventName === ApplicationEvent.LocalDatabaseWriteError) {
          showErrorStatus('Offline Saving Issue (changes not saved)');
        }
      }
    );

    return () => {
      unsubscribeAppEventObserver && unsubscribeAppEventObserver();
      unsubscribeStateEventObserver && unsubscribeStateEventObserver();
    };
  }, [
    application,
    note?.dirty,
    saveError,
    setStatus,
    showAllChangesSavedStatus,
    showErrorStatus,
    theme.stylekitWarningColor,
  ]);

  useEffect(() => {
    let mounted = true;
    if (mounted && editor && editor.isTemplateNote) {
      if (application?.platform === Platform.Ios) {
        editorViewRef.current?.focus();
      }
    }
    return () => {
      mounted = false;
    };
  }, [application?.platform, editor, editor?.note?.uuid]);

  useFocusEffect(
    useCallback(() => {
      return dissmissKeybard;
    }, [])
  );

  useEffect(() => {
    let mounted = true;
    if (!editor && mounted) {
      const initialEditor = application?.editorGroup.activeEditor;
      const tempNote = initialEditor?.note;
      setEditor(initialEditor);
      setNote(tempNote);
      setNoteText(initialEditor?.note?.safeText());
      setTitle(initialEditor?.note?.safeTitle());
    }

    return () => {
      mounted = false;
    };
  }, [application, editor]);

  const reloadComponentEditorState = useCallback(async () => {
    const associatedEditor = application?.componentManager!.editorForNote(
      note!
    );
    if (!associatedEditor) {
      /** No editor */
      if (editorComponent) {
        await application?.componentGroup.deactivateComponentForArea(
          ComponentArea.Editor
        );
      }
      return;
    }

    if (associatedEditor.uuid === editorComponent?.uuid) {
      /** Same editor, no change */
      return;
    }
    await application?.componentGroup.activateComponent(associatedEditor);
    application?.componentManager!.contextItemDidChangeInArea(
      ComponentArea.Editor
    );
    return;
  }, [application, editorComponent, note]);

  useEffect(() => {
    let mounted = true;
    const removeEditorObserver = application?.editorGroup.addChangeObserver(
      newEditor => {
        if (mounted) {
          setEditor(newEditor);
          setNote(newEditor?.note);
          if (newEditor && newEditor.note) {
            setTitle(newEditor?.note?.safeTitle());
            setNoteText(newEditor.note?.safeText());
          }
        }
      }
    );

    const removeComponentGroupObserver = application?.componentGroup.addChangeObserver(
      async () => {
        const newEditor = application?.componentGroup.activeComponentForArea(
          ComponentArea.Editor
        );
        if (mounted) {
          setEditorComponent(newEditor);
        }
      }
    );

    return () => {
      mounted = false;
      removeEditorObserver && removeEditorObserver();
      removeComponentGroupObserver && removeComponentGroupObserver();
    };
  }, [application, editorComponent]);

  useEffect(() => {
    const removeComponentsObserver = application?.streamItems(
      ContentType.Component,
      async items => {
        const components = items as SNComponent[];
        if (!note) {
          return;
        }
        /** Reload componentStack in case new ones were added or removed */
        // reloadComponentContext();
        // await this.reloadComponentStack();
        /** Observe editor changes to see if the current note should update its editor */
        const editors = components.filter(component => {
          return component.isEditor();
        });
        if (editors.length === 0) {
          return;
        }
        /** Find the most recent editor for note */
        reloadComponentEditorState();
      }
    );

    return removeComponentsObserver;
  }, [application, note, reloadComponentEditorState]);

  useEffect(() => {
    const removeEditorNoteChangeObserver = editor?.addNoteChangeObserver(
      newNote => {
        setNote(newNote);
        setTitle(newNote.title);
        setNoteText(newNote.text);
      }
    );
    const removeEditorNoteValueChangeObserver = editor?.addNoteValueChangeObserver(
      (newNote, source) => {
        if (isPayloadSourceRetrieved(source!)) {
          if (
            !editorComponent ||
            (editorComponent && source !== PayloadSource.ComponentRetrieved)
          ) {
            setNote(newNote);
          }

          setTitle(newNote.title);
          setNoteText(newNote.text);
        }
        if (newNote.locked !== note?.locked) {
          if (note) {
            setNote(newNote);
          }
        }
        if (newNote.lastSyncBegan && newNote.lastSyncEnd) {
          if (
            newNote.lastSyncBegan!.getTime() > newNote.lastSyncEnd!.getTime()
          ) {
            showSavingStatus();
          } else if (
            newNote.lastSyncEnd!.getTime() > newNote.lastSyncBegan!.getTime()
          ) {
            showAllChangesSavedStatus();
          }
        }
      }
    );

    return () => {
      removeEditorNoteChangeObserver && removeEditorNoteChangeObserver();
      removeEditorNoteValueChangeObserver &&
        removeEditorNoteValueChangeObserver();
    };
  }, [
    editor,
    editorComponent,
    note,
    note?.locked,
    setStatus,
    showAllChangesSavedStatus,
    showSavingStatus,
  ]);

  const saveNote = useCallback(
    async (
      bypassDebouncer: boolean,
      isUserModified: boolean,
      dontUpdatePreviews: boolean,
      closeAfterSync: boolean,
      values: { newTitle: string | undefined; newNoteText: string | undefined }
    ) => {
      if (!note) {
        return;
      }
      if (note?.deleted) {
        application!.alertService!.alert('deteled replace this');
        return;
      }

      if (editor?.isTemplateNote) {
        await editor?.insertTemplatedNote();
        if (application?.getAppState().selectedTag?.isSmartTag() === false) {
          await application.changeItem(
            application?.getAppState().selectedTag!.uuid,
            mutator => {
              mutator.addItemAsRelationship(note!);
            }
          );
        }
      }
      if (!application?.findItem(note!.uuid)) {
        application?.alertService!.alert('invalid note replace');
        return;
      }
      await application!.changeItem(
        note!.uuid,
        mutator => {
          const noteMutator = mutator as NoteMutator;
          noteMutator.title = values.newTitle!;
          noteMutator.text = values.newNoteText!;
          if (!dontUpdatePreviews) {
            const text = values.newNoteText ?? '';
            const truncate = text.length > NOTE_PREVIEW_CHAR_LIMIT;
            const substring = text.substring(0, NOTE_PREVIEW_CHAR_LIMIT);
            const previewPlain = substring + (truncate ? '...' : '');
            noteMutator.preview_plain = previewPlain;
            noteMutator.preview_html = undefined;
          }
        },
        isUserModified
      );

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      const noDebounce = bypassDebouncer || application?.noAccount();
      const syncDebouceMs = noDebounce
        ? SAVE_TIMEOUT_NO_DEBOUNCE
        : SAVE_TIMEOUT_DEBOUNCE;
      saveTimeoutRef.current = setTimeout(() => {
        application?.sync();
        if (closeAfterSync) {
          application?.getAppState().closeEditor(editor!);
        }
      }, syncDebouceMs);
    },
    [application, editor, note]
  );

  const onTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    saveNote(false, true, false, false, {
      newTitle,
      newNoteText: noteText,
    });
  };

  const onContentChange = useCallback(
    (newNoteText: string) => {
      if (application?.platform === Platform.Android && note?.locked) {
        application.alertService?.alert(
          'This note is locked. Please unlock this note to make changes.',
          'Note Locked',
          'OK'
        );
        return;
      }
      setNoteText(newNoteText);
      saveNote(false, true, false, false, {
        newTitle: title,
        newNoteText,
      });
    },
    [
      application?.alertService,
      application?.platform,
      note?.locked,
      saveNote,
      title,
    ]
  );

  const shouldDisplayEditor = editorComponent && Boolean(note) && !webViewError;

  return (
    <Container>
      {note?.locked && (
        <LockedContainer>
          <Icon
            name={StyleKit.nameForIcon(ICON_LOCK)}
            size={16}
            color={theme.stylekitBackgroundColor}
          />
          <LockedText>Note Locked</LockedText>
        </LockedContainer>
      )}
      {webViewError && (
        <LockedContainer>
          <Icon
            name={StyleKit.nameForIcon(ICON_ALERT)}
            size={16}
            color={theme.stylekitBackgroundColor}
          />
          <LockedText>Unable to load</LockedText>
          <WebViewReloadButton
            onPress={() => {
              setLoadingWebview(false);
              setWebviewError(false);
            }}
          >
            <WebViewReloadButtonText>Reload</WebViewReloadButtonText>
          </WebViewReloadButton>
        </LockedContainer>
      )}
      <NoteTitleInput
        testID="noteTitleField"
        onChangeText={onTitleChange}
        value={title}
        placeholder={'Add Title'}
        selectionColor={theme.stylekitInfoColor}
        underlineColorAndroid={'transparent'}
        placeholderTextColor={theme.stylekitNeutralColor}
        keyboardAppearance={styleKit?.keyboardColorForActiveTheme()}
        autoCorrect={true}
        autoCapitalize={'sentences'}
        editable={!note?.locked}
      />
      {loadingWebview && (
        <LoadingWebViewContainer>
          <LoadingWebViewText>{'LOADING'}</LoadingWebViewText>
          <LoadingWebViewSubtitle>
            {/* {noteEditor && noteEditor.content.name} */}
          </LoadingWebViewSubtitle>
        </LoadingWebViewContainer>
      )}
      {/* setting webViewError to false on onLoadEnd will cause an infinite loop on Android upon webview error, so, don't do that. */}
      {shouldDisplayEditor && (
        <ComponentView
          key={editorComponent!.uuid}
          componentUuid={editorComponent!.uuid}
          noteUuid={note!.uuid}
          onLoadStart={() => {
            setLoadingWebview(true);
            setWebviewError(false);
          }}
          onLoadEnd={() => {
            setLoadingWebview(false);
          }}
          onLoadError={() => {
            setLoadingWebview(false);
            setWebviewError(true);
          }}
        />
      )}
      {!shouldDisplayEditor && application?.platform === Platform.Android && (
        <TextContainer>
          <StyledTextView
            testID="noteContentField"
            multiline
            ref={editorViewRef}
            autoFocus={false}
            value={note?.text}
            textAlignVertical="top"
            autoCapitalize={'sentences'}
            selectionColor={lighten(theme.stylekitInfoColor, 0.35)}
            handlesColor={theme.stylekitInfoColor}
            onChangeText={onContentChange}
          />
        </TextContainer>
      )}
      {/* Empty wrapping view fixes native textview crashing */}
      {!shouldDisplayEditor && application?.platform === Platform.Ios && (
        <View>
          <StyledTextView
            testID="noteContentField"
            ref={editorViewRef}
            autoFocus={false}
            multiline
            value={note?.text}
            keyboardAppearance={styleKit?.keyboardColorForActiveTheme()}
            selectionColor={lighten(theme.stylekitInfoColor)}
            onChangeText={onContentChange}
            editable={!note?.locked}
          />
        </View>
      )}
    </Container>
  );
};
