import React from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
  Platform,
  Text,
  Alert,
} from 'react-native';
import TextView from 'sn-textview';
import { SFAuthManager } from 'standard-file-js';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-navigation';
import LockedView from 'containers/LockedView';
import ApplicationState from 'lib/ApplicationState';
import ComponentManager from 'lib/componentManager';
import Auth from 'lib/sfjs/authManager';
import ModelManager from 'lib/sfjs/modelManager';
import Sync from 'lib/sfjs/syncManager';
import Abstract from 'screens/Abstract';
import ComponentView from 'screens/ComponentView';
import SideMenuManager from '@SideMenu/SideMenuManager';
import { ICON_ALERT, ICON_LOCK, ICON_MENU } from 'style/icons';
import StyleKit from 'style/StyleKit';
import { lighten } from 'style/utils';

export default class Compose extends Abstract {
  static navigationOptions = ({ navigation, navigationOptions }) => {
    const templateOptions = {
      rightButton: {
        title: null,
        iconName: StyleKit.nameForIcon(ICON_MENU),
      },
    };
    return Abstract.getDefaultNavigationOptions({
      navigation,
      navigationOptions,
      templateOptions,
    });
  };

  constructor(props) {
    super(props);

    let note,
      noteId = this.getProp('noteId');
    if (noteId) {
      note = ModelManager.get().findItem(noteId);
    }
    this.setNote(note, true);

    // Use true/false for note.locked as we don't want values of null or undefined, which may cause
    // unnecessary renders.
    this.constructState({
      title: this.note.title,
      noteLocked: this.note.locked
        ? true
        : false /* required to re-render on change */,
    });

    this.configureHeaderBar();

    this.loadStyles();

    this.registerObservers();
  }

  componentDidMount() {
    super.componentDidMount();
    // On tablet, willFocus/didFocus not called on initial launch, causing right side menu to not render. So we'll set handler here.
    this.setSideMenuHandler();
  }

  registerObservers() {
    this.syncObserver = Sync.get().addEventHandler((event, data) => {
      if (event === 'sync:error') {
        this.showSavedStatus(false);
      } else if (event === 'sync:completed') {
        let isInRetrieved =
          data.retrievedItems &&
          data.retrievedItems.map(i => i.uuid).includes(this.note.uuid);
        let isInSaved =
          data.savedItems &&
          data.savedItems.map(i => i.uuid).includes(this.note.uuid);
        if (this.note.deleted || this.note.content.trashed) {
          let clearNote = this.note.deleted === true;
          // if Trashed, and we're in the Trash view, don't clear note.
          if (!this.note.deleted) {
            let selectedTag = this.getSelectedTag();
            let isTrashTag =
              selectedTag != null && selectedTag.content.isTrashTag === true;
            if (this.note.content.trashed) {
              // clear the note if this is not the trash tag. Otherwise, keep it in view.
              clearNote = !isTrashTag;
            }
          }

          if (clearNote) {
            this.props.navigation.closeRightDrawer();
            this.setNote(null);
          }
        } else if (this.note.uuid && (isInRetrieved || isInSaved)) {
          /*
          You have to be careful about when you render inside this component. Rendering with the native SNTextView component
          can cause the cursor to go to the end of the input, both on iOS and Android. We want to force an update only if retrievedItems includes this item

          However, if we make a change to a note from the side menu (such as pin, lock, etc), then we also want
          to update ourselves. This would only be found in data.savedItems.

          Actually, we only care about lock changes, because we display a banner if a note is locked. So we'll just
          make that a part of the state then. Abstract does a deep compare on state before deciding if to render.

          Do not make text part of the state, otherwise that would cause a re-render on every keystroke.
          */

          let newState = {
            title: this.note.title,
            noteLocked: this.note.locked ? true : false,
          };

          // only include `text` if this item is coming back from retrieved, as this will cause text view cursor to reset to top
          if (isInRetrieved) {
            newState.text = this.note.text;
          }

          // Use true/false for note.locked as we don't want values of null or undefined, which may cause
          // unnecessary renders. (on constructor it was undefined, and here, it was null, causing a re-render to occur on android, causing textview to reset cursor)
          this.setState(newState);
        }

        if ((isInSaved && !this.note.dirty) || this.saveError) {
          this.showSavedStatus(true);
        }
      }
    });

    this.componentHandler = ComponentManager.get().registerHandler({
      identifier: 'composer',
      areas: ['editor-editor'],
      actionHandler: (component, action, data) => {
        if (action === 'save-items') {
          if (
            data.items
              .map(item => {
                return item.uuid;
              })
              .includes(this.note.uuid)
          ) {
            this.showSavingStatus();
          }
        }
      },
    });

    this.signoutObserver = Auth.get().addEventHandler(event => {
      if (event === SFAuthManager.DidSignOutEvent) {
        this.setNote(null);
      }
    });

    this.tabletModeChangeHandler = ApplicationState.get().addEventHandler(
      (event, data) => {
        if (event === ApplicationState.AppStateEventTabletModeChange) {
          // If we are now in tablet mode after not being in tablet mode
          if (data.new_isInTabletMode && !data.old_isInTabletMode) {
            this.setSideMenuHandler();
          }
        }
      }
    );
  }

  /*
    In the Compose constructor, setNote is called with an empty value. This will create a new note.
    This is fine for non-tablet, but on tablet, we select the first note of the current view options,
    which initially is null, so setNote(null) will be called twice.

    On tablet, in the options change observer, we select first note, which is null, will call setNote(null) again.
    This is fine throughout normal lifecycle operation, but because the Compose constructor already calls setNote(null),
    it will be called twice.

    Two solutions can be:
    1. In Compose constructor, check if tablet if note is null (hacky)
    2. In setNote(null), if the current note is already a dummy, don't do anything.
  */

  setNote(note, isConstructor = false) {
    if (!note) {
      if (this.note && this.note.dummy) {
        // This method can be called if the + button is pressed. On Tablet, it can be pressed even while we're
        // already here. Just focus input if that's the case.
        this.input && this.input.focus();
        return;
      }
      note = ModelManager.get().createItem({
        content_type: 'Note',
        dummy: true,
        text: '',
      });
      note.dummy = true;
      // Editors need a valid note with uuid and modelmanager mapped in order to interact with it
      // Note that this can create dummy notes that aren't deleted automatically.
      // Also useful to keep right menu enabled at all times. If the note has a uuid and is a dummy,
      // it will be removed locally on blur
      note.initUUID().then(() => {
        ModelManager.get().addItem(note);
        this.forceUpdate();
      });
    }

    this.note = note;

    if (!isConstructor) {
      this.setState({ title: note.title });
      this.forceUpdate();
    }
  }

  configureHeaderBar() {
    this.props.navigation.setParams({
      rightButton: {
        title: null,
        iconName: StyleKit.nameForIcon(ICON_MENU),
        onPress: () => {
          this.props.navigation.openRightDrawer();
        },
      },
    });
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    // We don't want to do this in componentDid/WillBlur because when presenting new tag input modal,
    // the component will blur, and this will be called. Then, because the right drawer is now locked,
    // we ignore render events. This will cause the screen to be white when you save the new tag.
    SideMenuManager.get().removeHandlerForRightSideMenu(this.rightMenuHandler);
    Auth.get().removeEventHandler(this.signoutObserver);
    ApplicationState.get().removeEventHandler(this.tabletModeChangeHandler);
    Sync.get().removeEventHandler(this.syncObserver);
    ComponentManager.get().deregisterHandler(this.componentHandler);
  }

  componentWillFocus() {
    super.componentWillFocus();

    if (!ApplicationState.get().isInTabletMode) {
      this.props.navigation.lockRightDrawer(false);
    }

    if (this.note.dirty) {
      // We want the "Saving..." / "All changes saved..." subtitle to be visible to the user, so we delay
      setTimeout(() => {
        this.changesMade();
      }, 300);
    }

    // This was originally in didFocus, but the problem was if the handler isn't set,
    // the side menu won't render. If we present Tag compose and dismiss, the side menu
    // won't render until didFocus, so there would be a delay.
    this.setSideMenuHandler();
  }

  componentDidFocus() {
    super.componentDidFocus();

    if (this.note.dummy) {
      if (this.refs.input) {
        this.refs.input.focus();
      }
    }

    if (ApplicationState.isIOS) {
      if (this.note.dummy && this.input) {
        this.input.focus();
      }
    }
  }

  setSideMenuHandler() {
    this.rightMenuHandler = SideMenuManager.get().setHandlerForRightSideMenu({
      getCurrentNote: () => {
        return this.note;
      },
      onEditorSelect: editor => {
        if (editor) {
          ComponentManager.get().associateEditorWithNote(editor, this.note);
        } else {
          ComponentManager.get().clearEditorForNote(this.note);
        }
        this.setState({ loadingWebView: false, webViewError: false });
        this.forceUpdate();
        this.props.navigation.closeRightDrawer();
      },
      onPropertyChange: () => {
        this.forceUpdate();
      },
      onTagSelect: tag => {
        let selectedTags = this.note.tags.slice();
        var selected = selectedTags.includes(tag);
        if (selected) {
          // deselect
          selectedTags.splice(selectedTags.indexOf(tag), 1);
        } else {
          // select
          selectedTags.push(tag);
        }
        this.replaceTagsForNote(selectedTags);
        this.changesMade();
      },
      getSelectedTags: () => {
        // Return copy so that list re-renders every time if they change
        return this.note.tags.slice();
      },
      onKeyboardDismiss: () => {
        // Keyboard.dismiss() does not work for native views, which our text input is
        this.input && this.input.blur();
      },
    });
  }

  componentWillBlur() {
    super.componentWillBlur();

    if (!ApplicationState.get().isInTabletMode) {
      this.props.navigation.lockRightDrawer(true);
    }

    this.input && this.input.blur();

    if (this.note.uuid && this.note.dummy) {
      // A dummy note created to work with default external editor. Safe to delete.
      ModelManager.get().removeItemLocally(this.note);
    }
  }

  replaceTagsForNote(newTags) {
    let note = this.note;

    var oldTags = note.tags.slice(); // original array will be modified in the for loop so we make a copy
    for (var oldTag of oldTags) {
      if (!newTags.includes(oldTag)) {
        oldTag.removeItemAsRelationship(note);
        oldTag.setDirty(true);
        // Notes don't have tags as relationships anymore, but we'll keep this to clean up old notes.
        note.removeItemAsRelationship(oldTag);
      }
    }

    for (var newTag of newTags) {
      if (!oldTags.includes(newTag)) {
        newTag.addItemAsRelationship(note);
        newTag.setDirty(true);
      }
    }
  }

  onTitleChange = text => {
    this.setState({ title: text });
    this.note.title = text;
    this.changesMade();
  };

  onTextChange = text => {
    if (this.note.locked) {
      // On Android, we don't disable the text view if the note is locked, as that also disables selection.
      Alert.alert(
        'Note Locked',
        'This note is locked. Please unlock this note to make changes.',
        [{ text: 'OK' }]
      );
      // For some reason, tested on Android, calling forceUpdate here with the intention of re-rendering the note's original text
      // does not render the original text, but keeps the pending edits we have.
      // this.forceUpdate();
      return;
    }

    this.note.text = text;

    // Clear dynamic previews if using plain editor
    this.note.content.preview_html = null;
    this.note.content.preview_plain = null;

    this.changesMade();
  };

  showSavingStatus() {
    this.setSubTitle('Saving...');
  }

  showSavedStatus(success) {
    const debouceMs = 300; // minimum time message is shown
    if (success) {
      if (this.statusTimeout) {
        clearTimeout(this.statusTimeout);
      }
      this.statusTimeout = setTimeout(() => {
        var status = 'All changes saved';
        if (Auth.get().offline()) {
          status += ' (offline)';
        }
        this.saveError = false;
        this.syncTakingTooLong = false;
        this.setSubTitle(status);
      }, debouceMs);
    } else {
      if (this.statusTimeout) {
        clearTimeout(this.statusTimeout);
      }
      this.statusTimeout = setTimeout(() => {
        this.saveError = true;
        this.syncTakingTooLong = false;
        this.setSubTitle(
          'Sync Unavailable (changes saved offline)',
          StyleKit.variables.stylekitWarningColor
        );
      }, debouceMs);
    }
  }

  getSelectedTagId() {
    // On tablet, we use props.selectedTagId
    return this.getProp('selectedTagId') || this.props.selectedTagId;
  }

  getSelectedTag() {
    let id = this.getSelectedTagId();
    if (id) {
      return ModelManager.get().getTagWithId(id);
    }
  }

  changesMade() {
    this.note.hasChanges = true;

    // capture dummy status before timeout
    let isDummy = this.note.dummy;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.showSavingStatus();
      if (isDummy && this.getSelectedTagId()) {
        var tag = this.getSelectedTag();
        // Could be system tag, so wouldn't exist
        if (tag && !tag.isSmartTag()) {
          tag.addItemAsRelationship(this.note);
          tag.setDirty(true);
        }
      }
      this.save();
    }, 325);
  }

  sync(note, callback) {
    note.setDirty(true, true);

    Sync.get()
      .sync()
      .then(response => {
        if (response && response.error) {
          if (!this.didShowErrorAlert) {
            this.didShowErrorAlert = true;
            // alert("There was an error saving your note. Please try again.");
          }
          if (callback) {
            callback(false);
          }
        } else {
          note.hasChanges = false;
          if (callback) {
            callback(true);
          }
        }
      });
  }

  save() {
    var note = this.note;
    if (note.dummy) {
      note.dummy = false;
      ModelManager.get().addItem(note);
    }

    this.sync(note);
  }

  reloadEditor = () => {
    this.setState({ loadingWebView: false, webViewError: false });
    this.forceUpdate();
  };

  render() {
    if (this.state.lockContent) {
      return <LockedView />;
    }

    /*
      For the note text, we are using a custom component that is currently incapable of immediate re-renders on text
      change without flickering. So we do not use this.state.text for the value, but instead this.note.text.
      For the title however, we are not using a custom component and thus can (and must) look at the state value of
      this.state.title for the value. We also update the state onTitleChange.
    */

    let noteEditor = ComponentManager.get().editorForNote(this.note);
    // let windowWidth = this.state.windowWidth || Dimensions.get('window').width;
    // If new note with default editor, note.uuid may not be ready
    let shouldDisplayEditor = noteEditor != null && this.note.uuid != null;

    if (this.state.webViewError) {
      // We'll display alert bar instead
      shouldDisplayEditor = false;
    }

    return (
      <SafeAreaView
        forceInset={{ bottom: 'never', vertical: 'never', left: 'always' }}
        style={[
          this.styles.container,
          StyleKit.styles.container,
          StyleKit.styles.baseBackground,
        ]}
      >
        {this.note.locked && (
          <View style={this.styles.lockedContainer}>
            <Icon
              name={StyleKit.nameForIcon(ICON_LOCK)}
              size={16}
              color={StyleKit.variables.stylekitBackgroundColor}
            />
            <Text style={this.styles.lockedText}>Note Locked</Text>
          </View>
        )}

        {this.state.webViewError && (
          <View style={this.styles.lockedContainer}>
            <Icon
              name={StyleKit.nameForIcon(ICON_ALERT)}
              size={16}
              color={StyleKit.variables.stylekitBackgroundColor}
            />
            <Text style={this.styles.lockedText}>
              Unable to load {noteEditor && noteEditor.content.name}
            </Text>
            <TouchableOpacity
              style={this.styles.webviewReloadButton}
              onPress={this.reloadEditor}
            >
              <Text style={this.styles.webviewReloadButtonText}>Reload</Text>
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          testID="noteTitleField"
          style={this.styles.noteTitle}
          onChangeText={this.onTitleChange}
          value={this.state.title}
          placeholder={'Add Title'}
          selectionColor={StyleKit.variables.stylekitInfoColor}
          underlineColorAndroid={'transparent'}
          placeholderTextColor={StyleKit.variables.stylekitNeutralColor}
          keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
          autoCorrect={true}
          autoCapitalize={'sentences'}
          editable={!this.note.locked}
        />

        {this.state.loadingWebView && (
          <View style={[this.styles.loadingWebViewContainer]}>
            <Text style={[this.styles.loadingWebViewText]}>{'LOADING'}</Text>
            <Text style={[this.styles.loadingWebViewSubtitle]}>
              {noteEditor && noteEditor.content.name}
            </Text>
          </View>
        )}

        {shouldDisplayEditor && (
          <ComponentView
            key={noteEditor.uuid}
            noteId={this.note.uuid}
            editorId={noteEditor.uuid}
            onLoadStart={() => {
              this.setState({ loadingWebView: true, webViewError: false });
            }}
            /* setting webViewError to false on onLoadEnd will cause an infinite loop on Android upon webview error, so, don't do that. */
            onLoadEnd={() => {
              this.setState({ loadingWebView: false });
            }}
            onLoadError={() => {
              this.setState({ loadingWebView: false, webViewError: true });
            }}
          />
        )}

        {!shouldDisplayEditor && Platform.OS === 'android' && (
          <View style={[this.styles.noteTextContainer]}>
            <TextView
              testID="noteContentField"
              style={[
                StyleKit.stylesForKey('noteText'),
                this.styles.textContentAndroid,
              ]}
              ref={ref => (this.input = ref)}
              autoFocus={this.note.dummy}
              value={this.note.text}
              selectionColor={lighten(
                StyleKit.variables.stylekitInfoColor,
                0.35
              )}
              handlesColor={StyleKit.variables.stylekitInfoColor}
              onChangeText={this.onTextChange}
            />
          </View>
        )}

        {!shouldDisplayEditor && Platform.OS === 'ios' && (
          <TextView
            style={[StyleKit.stylesForKey('noteText'), { paddingBottom: 10 }]}
            ref={ref => (this.input = ref)}
            autoFocus={false}
            value={this.note.text}
            keyboardDismissMode={'interactive'}
            keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
            selectionColor={lighten(StyleKit.variables.stylekitInfoColor)}
            onChangeText={this.onTextChange}
            editable={!this.note.locked}
          />
        )}
      </SafeAreaView>
    );
  }

  loadStyles() {
    let padding = 14;
    let noteTitleHeight = 50;
    this.rawStyles = {
      container: {
        flex: 1,
        flexDirection: 'column',
        height: '100%',
      },

      noteTitle: {
        fontWeight: '600',
        fontSize: 16,
        color: StyleKit.variables.stylekitForegroundColor,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
        height: noteTitleHeight,
        borderBottomColor: StyleKit.variables.stylekitBorderColor,
        borderBottomWidth: 1,
        paddingTop: Platform.OS === 'ios' ? 5 : 12,
        paddingLeft: padding,
        paddingRight: padding,
      },

      lockedContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        height: 26,
        maxHeight: 26,
        paddingLeft: padding,
        backgroundColor: StyleKit.variables.stylekitNeutralColor,
        borderBottomColor: StyleKit.variables.stylekitBorderColor,
        borderBottomWidth: 1,
      },

      lockedText: {
        fontWeight: 'bold',
        fontSize: 12,
        color: StyleKit.variables.stylekitBackgroundColor,
        paddingLeft: 10,
      },

      loadingWebViewContainer: {
        position: 'absolute',
        height: '100%',
        width: '100%',
        top: noteTitleHeight,
        bottom: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
      },

      loadingWebViewText: {
        paddingLeft: 0,
        color: StyleKit.variables.stylekitForegroundColor,
        opacity: 0.7,
        fontSize: 22,
        fontWeight: 'bold',
      },

      loadingWebViewSubtitle: {
        paddingLeft: 0,
        color: StyleKit.variables.stylekitForegroundColor,
        opacity: 0.7,
        marginTop: 5,
      },

      webviewReloadButton: {
        position: 'absolute',
        right: padding,
        height: '100%',
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },

      webviewReloadButtonText: {
        color: StyleKit.variables.stylekitBackgroundColor,
        fontSize: 12,
        fontWeight: 'bold',
      },

      textContentAndroid: {
        flexGrow: 1,
        flex: 1,
      },

      contentContainer: {
        flexGrow: 1,
      },

      noteTextContainer: {
        flexGrow: 1,
        flex: 1,
      },
    };

    this.styles = StyleSheet.create(this.rawStyles);
  }
}
