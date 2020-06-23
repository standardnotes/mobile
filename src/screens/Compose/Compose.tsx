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
import { Platform, SNNote, isPayloadSourceRetrieved, NoteMutator } from 'snjs';
import { lighten } from '@Style/utils';
import TextView from 'sn-textview';
import { Editor } from '@Lib/editor';

const NOTE_PREVIEW_CHAR_LIMIT = 80;
const MINIMUM_STATUS_DURATION = 400;
const SAVE_TIMEOUT_DEBOUNCE = 350;
const SAVE_TIMEOUT_NO_DEBOUNCE = 100;
const EDITOR_DEBOUNCE = 100;

export const Compose = (): JSX.Element => {
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  // const [webViewError, setWebviewError] = useState();
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [noteText, setNoteText] = useState<string | undefined>(undefined);
  const [editor, setEditor] = useState<Editor | undefined>(undefined);
  const [note, setNote] = useState<SNNote | undefined>(undefined);
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
    return () => {
      removeEditorObserver && removeEditorObserver();
      // removeEditorNoteChangeObserver();
    };
  }, [application]);

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
