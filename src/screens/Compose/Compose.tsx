import { Editor } from '@Lib/editor';
import { ApplicationContext } from '@Root/ApplicationContext';
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
import Icon from 'react-native-vector-icons/Ionicons';
import TextView from 'sn-textview';
import {
  ComponentArea,
  ContentType,
  isPayloadSourceRetrieved,
  NoteMutator,
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
const EDITOR_DEBOUNCE = 100;

export const Compose = (): JSX.Element => {
  // Context
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  const styleKit = useContext(StyleKitContext);

  //State
  const [title, setTitle] = useState<string | undefined>();
  const [noteText, setNoteText] = useState<string | undefined>(undefined);
  const [editor, setEditor] = useState<Editor | undefined>();
  const [note, setNote] = useState<SNNote | undefined>();
  const [editorComponent, setEditorComponent] = useState<
    SNComponent | undefined
  >();
  const [webViewError, setWebviewError] = useState(false);
  const [loadingWebview, setLoadingWebiev] = useState(false);

  // Ref
  const editorViewRef = useRef<TextView>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

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

  const reloadComponentContext = useCallback(() => {
    if (note) {
      if (editorComponent?.active) {
        application!.componentManager!.setComponentHidden(
          editorComponent,
          !editorComponent.isExplicitlyEnabledForItem(note.uuid)
        );
      }
    }
    application?.componentManager!.contextItemDidChangeInArea(
      ComponentArea.Editor
    );
  }, [application, editorComponent, note]);

  const reloadComponentEditorState = useCallback(async () => {
    const associatedEditor = application?.componentManager!.editorForNote(
      note!
    );
    if (!associatedEditor) {
      /** No editor */
      let changed = false;
      if (editorComponent) {
        await application?.componentGroup.deactivateComponentForArea(
          ComponentArea.Editor
        );
        changed = true;
      }
      return { updatedEditor: undefined, changed };
    }

    if (associatedEditor.uuid === editorComponent?.uuid) {
      /** Same editor, no change */
      return { updatedEditor: associatedEditor, changed: false };
    }

    await application?.componentGroup.activateComponent(associatedEditor);
    return { updatedEditor: associatedEditor, changed: true };
  }, [application, editorComponent, note]);

  const streamItems = useCallback(() => {
    const removeComponentsObserver = application?.streamItems(
      ContentType.Component,
      async items => {
        const components = items as SNComponent[];
        if (!note) {
          return;
        }
        /** Reload componentStack in case new ones were added or removed */
        reloadComponentContext();
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

    return () => {
      removeComponentsObserver && removeComponentsObserver();
    };
  }, [application, note, reloadComponentContext, reloadComponentEditorState]);

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
        const currentEditor = editorComponent;
        const newEditor = application?.componentGroup.activeComponentForArea(
          ComponentArea.Editor
        );
        if (
          currentEditor &&
          newEditor &&
          currentEditor.uuid !== newEditor.uuid
        ) {
          /** Unload current component view so that we create a new one,
           * then change the active editor */
          // await this.setEditorState({
          //   editorComponentUnloading: true,
          // });
        }
        if (mounted) {
          setEditorComponent(newEditor);
        }

        /** Stop unloading, if we were already unloading */
        // await this.setEditorState({
        //   editorComponentUnloading: false,
        // });
      }
    );

    const removeStreamItems = streamItems();

    return () => {
      mounted = false;
      removeEditorObserver && removeEditorObserver();
      removeComponentGroupObserver && removeComponentGroupObserver();
      removeStreamItems();
    };
  }, [application, editorComponent, streamItems]);

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
          setNote(newNote);
          setTitle(newNote.title);
          setNoteText(newNote.text);
        }
        if (newNote.lastSyncBegan && newNote.lastSyncEnd) {
          if (
            newNote.lastSyncBegan!.getTime() > newNote.lastSyncEnd!.getTime()
          ) {
            // this.showSavingStatus();
          } else if (
            newNote.lastSyncEnd!.getTime() > newNote.lastSyncBegan!.getTime()
          ) {
            // this.showAllChangesSavedStatus();
          }
        }
      }
    );

    return () => {
      removeEditorNoteChangeObserver && removeEditorNoteChangeObserver();
      removeEditorNoteValueChangeObserver &&
        removeEditorNoteValueChangeObserver();
    };
  }, [editor]);

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

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      const noDebounce = bypassDebouncer || application?.noAccount();
      const syncDebouceMs = noDebounce
        ? SAVE_TIMEOUT_NO_DEBOUNCE
        : SAVE_TIMEOUT_DEBOUNCE;
      timeoutRef.current = setTimeout(() => {
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

  const onContentChange = (newNoteText: string) => {
    setNoteText(newNoteText);
    saveNote(false, true, true, false, {
      newTitle: title,
      newNoteText,
    });
  };

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
              setLoadingWebiev(false);
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
        editable={note?.locked}
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
            setLoadingWebiev(true);
            setWebviewError(false);
          }}
          onLoadEnd={() => {
            setLoadingWebiev(false);
          }}
          onLoadError={() => {
            setLoadingWebiev(false);
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
            value={noteText}
            selectionColor={lighten(theme.stylekitInfoColor, 0.35)}
            handlesColor={theme.stylekitInfoColor}
            onChangeText={onContentChange}
          />
        </TextContainer>
      )}
      {!shouldDisplayEditor && application?.platform === Platform.Ios && (
        <StyledTextView
          ref={editorViewRef}
          autoFocus={false}
          multiline
          value={noteText}
          keyboardDismissMode={'interactive'}
          keyboardAppearance={styleKit?.keyboardColorForActiveTheme()}
          selectionColor={lighten(theme.stylekitInfoColor)}
          onChangeText={onContentChange}
          editable={!note?.locked}
          scrollEnabled
        />
      )}
    </Container>
  );
};
