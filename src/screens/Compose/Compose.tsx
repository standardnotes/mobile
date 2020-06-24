import React, {
  useContext,
  useEffect,
  useCallback,
  useState,
  useRef,
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
import {
  Platform,
  SNNote,
  isPayloadSourceRetrieved,
  NoteMutator,
  SNComponent,
  ComponentArea,
  ContentType,
} from 'snjs';
import { lighten } from '@Style/utils';
import TextView from 'sn-textview';
import { Editor } from '@Lib/editor';
import { ComponentView } from './ComponentView';

const NOTE_PREVIEW_CHAR_LIMIT = 80;
const MINIMUM_STATUS_DURATION = 400;
const SAVE_TIMEOUT_DEBOUNCE = 350;
const SAVE_TIMEOUT_NO_DEBOUNCE = 100;
const EDITOR_DEBOUNCE = 100;

export const Compose = (): JSX.Element => {
  // Context
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);

  //State
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [noteText, setNoteText] = useState<string | undefined>(undefined);
  const [editor, setEditor] = useState<Editor | undefined>(undefined);
  const [note, setNote] = useState<SNNote | undefined>(undefined);
  const [editorComponent, setEditorComponent] = useState<
    SNComponent | undefined
  >();
  const [webViewError, setWebviewError] = useState(false);
  const [loadingWebview, setLoadingWebiev] = useState(false);

  // Ref
  const editorViewRef = useRef<TextView>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const removeEditorObserver = application?.editorGroup.addChangeObserver(
      () => {
        const editorTemp = application!.editorGroup.activeEditor;
        setEditor(editorTemp);
        setTitle(editorTemp?.note?.safeTitle());
        setNoteText(editorTemp.note?.safeText());
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
        setEditorComponent(newEditor);
        /** Stop unloading, if we were already unloading */
        // await this.setEditorState({
        //   editorComponentUnloading: false,
        // });
      }
    );

    const removeStreamItems = streamItems();
    const editors = application!.componentManager!.componentsForArea(ComponentArea.Editor).sort((a, b) => {
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    });

    console.log('editors', editors);

    return () => {
      removeEditorObserver && removeEditorObserver();
      removeComponentGroupObserver && removeComponentGroupObserver();
      removeStreamItems();
    };

  }, [application, editorComponent]);

  useEffect(() => {
    const removeEditorNoteChangeObserver = editor?.onNoteChange(setNote);
    const removeEditorNoteValueChangeObserver = editor?.onNoteValueChange(
      (newNote, source) => {
        if (isPayloadSourceRetrieved(source!)) {
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
  }, [application]);

  const reloadComponentContext = () => {
    if (note) {
        if (editorComponent?.active) {
          application!.componentManager!.setComponentHidden(
            editorComponent,
            !editorComponent.isExplicitlyEnabledForItem(note.uuid)
          );
        }
      }
    application?.componentManager!.contextItemDidChangeInArea(ComponentArea.Editor);
  }

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
        reloadComponentEditorState()
      }
    );

    return () => {
      removeComponentsObserver && removeComponentsObserver();
    };
  }, [application?.streamItems, note, reloadComponentEditorState]);

  const saveNote = async (
    bypassDebouncer: boolean,
    isUserModified: boolean,
    dontUpdatePreviews: boolean,
    closeAfterSync: boolean
  ) => {
    const tempNote = note;
    if (tempNote?.deleted) {
      application!.alertService!.alert('deteled replace this');
      return;
    }
    if (editor?.isTemplateNote) {
      await editor?.insertTemplatedNote();
      if (application?.getAppState().selectedTag?.isSmartTag() === false) {
        await application.changeItem(
          application?.getAppState().selectedTag!.uuid,
          mutator => {
            mutator.addItemAsRelationship(tempNote!);
          }
        );
      }
    }
    if (!application?.findItem(tempNote!.uuid)) {
      application?.alertService!.alert('invalid note replace');
      return;
    }
    await application!.changeItem(
      tempNote!.uuid,
      mutator => {
        const noteMutator = mutator as NoteMutator;
        noteMutator.title = title!;
        noteMutator.text = noteText!;
        if (!dontUpdatePreviews) {
          const text = noteText || '';
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
  };

  const onTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (note) {
      saveNote(false, true, false, false);
    }
  };

  const onContentChange = (newNoteText: string) => {
    setNoteText(newNoteText);
    if (note) {
      saveNote(false, true, true, false);
    }
  };

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
          <LockedText>
            Unable to load
          </LockedText>
          <WebViewReloadButton onPress={() => {
             setLoadingWebiev(false);
             setWebviewError(false);
          }}>
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
        keyboardAppearance={application
          ?.getThemeService()
          .keyboardColorForActiveTheme()}
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
      {editorComponent && Boolean(note) && (
        <ComponentView
          key={editorComponent.uuid}
          componentUuid={editorComponent!.uuid}
          onLoadStart={() => {
            setLoadingWebiev(true);
            setWebviewError(false);
          }}
          onLoadEnd={() => {
            setLoadingWebiev(false)
          }}
          onLoadError={() => {
            setLoadingWebiev(false)
            setWebviewError(true);
          }}
        />
      )}
      {application?.platform === Platform.Android && (
        <TextContainer>
          <StyledTextView
            testID="noteContentField"
            ref={editorViewRef}
            autoFocus={false}
            value={noteText}
            selectionColor={lighten(theme.stylekitInfoColor, 0.35)}
            handlesColor={theme.stylekitInfoColor}
            onChangeText={onContentChange}
          />
        </TextContainer>
      )}
      {application?.platform === Platform.Ios && (
        <StyledTextView
          ref={editorViewRef}
          autoFocus={false}
          value={noteText}
          keyboardDismissMode={'interactive'}
          keyboardAppearance={application
            ?.getThemeService()
            .keyboardColorForActiveTheme()}
          selectionColor={lighten(theme.stylekitInfoColor)}
          onChangeText={onContentChange}
          editable={!note?.locked}
        />
      )}
    </Container>
  );
};
