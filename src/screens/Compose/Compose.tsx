import { AppStateEventType } from '@Lib/application_state';
import { Editor } from '@Lib/editor';
import { useFocusEffect } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_COMPOSE } from '@Screens/screens';
import { ICON_ALERT, ICON_LOCK } from '@Style/icons';
import { ThemeService, ThemeServiceContext } from '@Style/theme_service';
import { lighten } from '@Style/utils';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Keyboard, Platform, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import SNTextView from 'sn-textview';
import {
  ApplicationEvent,
  ComponentArea,
  ContentType,
  isPayloadSourceInternalChange,
  isPayloadSourceRetrieved,
  NoteMutator,
  PayloadSource,
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
const SAVE_TIMEOUT_DEBOUNCE = 250;
const SAVE_TIMEOUT_NO_DEBOUNCE = 100;

export const Compose = (): JSX.Element => {
  // Context
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  const themeService = useContext(ThemeServiceContext);

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
  const alreadySaved = useRef(false);

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
          application
            ?.getStatusManager()
            .setMessage(SCREEN_COMPOSE, status, color);
        }, MINIMUM_STATUS_DURATION);
      } else {
        application
          ?.getStatusManager()
          .setMessage(SCREEN_COMPOSE, status, color);
      }
    },
    [application]
  );

  const showSavingStatus = useCallback(() => {
    alreadySaved.current = true;
    setStatus('Saving...', undefined, false);
  }, [setStatus]);

  const showAllChangesSavedStatus = useCallback(() => {
    setSaveError(false);
    const offlineStatus = application?.hasAccount() ? '' : ' (offline)';
    setStatus('All changes saved' + offlineStatus);
  }, [application, setStatus]);

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
        if (eventName === ApplicationEvent.CompletedFullSync) {
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
      if (Platform.OS === 'ios') {
        editorViewRef.current?.focus();
      }
    }
    return () => {
      mounted = false;
    };
  }, [application?.platform, editor, editor?.note?.uuid]);

  useEffect(() => {
    return () => {
      alreadySaved.current = false;
      application?.getStatusManager()?.setMessage(SCREEN_COMPOSE, '');
    };
  }, [application, note?.uuid]);

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

  const reloadComponentEditorState = useCallback(
    async (updatedNote?: SNNote) => {
      if (!updatedNote) {
        return;
      }
      const associatedEditor = application?.componentManager!.editorForNote(
        updatedNote
      );
      if (!associatedEditor) {
        /** No editor */
        if (editorComponent) {
          await application?.componentGroup.deactivateComponentForArea(
            ComponentArea.Editor
          );
        }
      } else if (associatedEditor.uuid !== editorComponent?.uuid) {
        await application?.componentGroup.activateComponent(associatedEditor);
      }
      application?.componentManager!.contextItemDidChangeInArea(
        ComponentArea.Editor
      );
    },
    [
      application?.componentGroup,
      application?.componentManager,
      editorComponent,
    ]
  );

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
      async (_items, source) => {
        if (
          isPayloadSourceInternalChange(source!) ||
          note?.uuid === undefined
        ) {
          return;
        }
        /**
         * Hook updated only when note uuid changes
         * to avoid running reloadComponentEditorState too often.
         */
        const updatedNote = application.findItem(note.uuid) as SNNote;
        await reloadComponentEditorState(updatedNote!);
      }
    );

    return removeComponentsObserver;
  }, [application, reloadComponentEditorState, note?.uuid]);

  useEffect(() => {
    const removeEditorNoteChangeObserver = editor?.addNoteChangeObserver(
      newNote => {
        setNote(newNote);
        setTitle(newNote.title);
        setNoteText(newNote.text);
        reloadComponentEditorState(newNote);
      }
    );
    return removeEditorNoteChangeObserver;
  }, [editor, reloadComponentEditorState]);

  useEffect(() => {
    let mounted = true;
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
        if (mounted && newNote.lastSyncBegan) {
          if (newNote.lastSyncEnd) {
            if (
              newNote.lastSyncBegan.getTime() > newNote.lastSyncEnd.getTime()
            ) {
              showSavingStatus();
            } else if (
              newNote.lastSyncEnd.getTime() > newNote.lastSyncBegan.getTime() &&
              alreadySaved.current
            ) {
              showAllChangesSavedStatus();
            }
          } else {
            showSavingStatus();
          }
        }
      }
    );

    return () => {
      mounted = false;
      removeEditorNoteValueChangeObserver;
    };
  }, [
    editor,
    editorComponent,
    note,
    note?.locked,
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
      if (Platform.OS === 'android' && note?.locked) {
        application?.alertService?.alert(
          'This note is locked. Please unlock this note to make changes.'
        );
        return;
      }
      setNoteText(newNoteText);
      saveNote(false, true, false, false, {
        newTitle: title,
        newNoteText,
      });
    },
    [application?.alertService, note?.locked, saveNote, title]
  );

  const shouldDisplayEditor = editorComponent && Boolean(note) && !webViewError;

  return (
    <Container>
      {note?.locked && (
        <LockedContainer>
          <Icon
            name={ThemeService.nameForIcon(ICON_LOCK)}
            size={16}
            color={theme.stylekitBackgroundColor}
          />
          <LockedText>Note Locked</LockedText>
        </LockedContainer>
      )}
      {webViewError && (
        <LockedContainer>
          <Icon
            name={ThemeService.nameForIcon(ICON_ALERT)}
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
        keyboardAppearance={themeService?.keyboardColorForActiveTheme()}
        autoCorrect={true}
        autoCapitalize={'sentences'}
        editable={!note?.locked}
      />
      {loadingWebview && (
        <LoadingWebViewContainer locked={note?.locked}>
          <LoadingWebViewText>{'LOADING'}</LoadingWebViewText>
          <LoadingWebViewSubtitle>
            {editorComponent?.name}
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
      {!shouldDisplayEditor && Platform.OS === 'android' && (
        <TextContainer>
          <StyledTextView
            testID="noteContentField"
            multiline
            ref={editorViewRef}
            autoFocus={Boolean(editor && editor.isTemplateNote)}
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
      {!shouldDisplayEditor && Platform.OS === 'ios' && (
        <View key={note?.uuid}>
          <StyledTextView
            testID="noteContentField"
            ref={editorViewRef}
            autoFocus={false}
            multiline
            value={note?.text}
            keyboardDismissMode={'interactive'}
            keyboardAppearance={themeService?.keyboardColorForActiveTheme()}
            selectionColor={lighten(theme.stylekitInfoColor)}
            onChangeText={onContentChange}
            editable={!note?.locked}
          />
        </View>
      )}
    </Container>
  );
};
