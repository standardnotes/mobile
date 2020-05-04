import React from 'react';
import { Alert, Keyboard } from 'react-native';
import FAB from 'react-native-fab';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-navigation';
import LockedView from '@Containers/LockedView';
import Auth from '@Lib/snjs/authManager';
import ModelManager from '@Lib/snjs/modelManager';
import Sync from '@Lib/snjs/syncManager';
import ApplicationState from '@Lib/ApplicationState';
import ItemActionManager from '@Lib/itemActionManager';
import KeysManager from '@Lib/keysManager';
import OptionsState from '@Lib/OptionsState';
import Abstract from '@Screens/Abstract';
import NoteList from '@Screens/Notes/NoteList';
import {
  SCREEN_SETTINGS,
  SCREEN_KEY_RECOVERY,
  SCREEN_COMPOSE,
} from '@Screens/screens';
import SideMenuManager from '@Screens/SideMenu/SideMenuManager';
import { ICON_MENU, ICON_ADD } from '@Style/icons';
import StyleKit from '@Style/StyleKit';

import { SFAuthManager, SFPrivilegesManager } from 'snjs';

export default class Notes extends Abstract {
  constructor(props) {
    super(props);
    this.stateNotes = [];

    this.options = ApplicationState.getOptions();
    this.registerObservers();

    props.navigation.setParams({
      title: 'All notes',
      leftButton: {
        title: null,
        iconName: StyleKit.nameForIcon(ICON_MENU),
        onPress: () => {
          this.props.navigation.openLeftDrawer();
        },
      },
    });
  }

  loadInitialState() {
    // We may be here on non-launch state, where local data will already have been loaded.
    const initialDataLoaded = Sync.get().initialDataLoaded();
    const encryptionEnabled = KeysManager.get().isOfflineEncryptionEnabled();
    this.mergeState({
      refreshing: false,
      decrypting: !initialDataLoaded && encryptionEnabled,
      loading: !initialDataLoaded && !encryptionEnabled,
      notes: [],
    });

    super.loadInitialState();

    // On Android, if you press physical back button, all components will be unmounted.
    // When you reopen, they will be mounted again, but local-data-loaded event will rightfully
    // not be sent again. So we want to make sure that we're able to reload state when component mounts,
    // and loadInitialState is called on componentDidMount
    this.reloadList();
  }

  unlockContent(callback) {
    super.unlockContent(() => {
      // wait for the state.unlocked setState call to finish
      if (this.searching) {
        this.searching = false;
        this.options.setSearchTerm(null);
      }

      this.reloadHeaderBar();
      callback && callback();
    });
  }

  componentWillFocus() {
    super.componentWillFocus();

    /*
      Note that (tested on Android) if you select a protected note then present Authenticate,
      upon Authenticate completion, willBlur/didBlur on Notes will not be called.

      We'll let Compose itself handle whether right drawer should be locked.
    */

    this.reloadTabletStateForEvent({ focus: true });

    if (this.loadNotesOnVisible) {
      this.loadNotesOnVisible = false;
      this.reloadList();
    }
  }

  reloadTabletStateForEvent({ focus, blur }) {
    if (focus) {
      if (!ApplicationState.get().isInTabletMode) {
        this.props.navigation.lockLeftDrawer(false);
        this.props.navigation.lockRightDrawer(true);
      }
    } else if (blur) {
      if (!ApplicationState.get().isInTabletMode) {
        this.props.navigation.lockLeftDrawer(true);
        this.props.navigation.lockRightDrawer(false);
      }
    }
  }

  componentWillBlur() {
    super.componentWillBlur();
    this.reloadTabletStateForEvent({ blur: true });
  }

  componentDidFocus() {
    super.componentDidFocus();

    this.setSideMenuHandler();

    // When this Notes component regains focus we want to make sure to reload Tablet State to ensure the MainSideMenu
    // is accessible again and doesn't remain locked. During authentication (namely FaceID on iOS),
    // the componentWillBlur and componentWillFocus events would sometimes cause a race condition that would
    // result in a locked MainSideMenu. When this Notes component regained focus, the MainSideMenu would remain locked.
    this.reloadTabletStateForEvent({ focus: true });

    this.forceUpdate();
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    ApplicationState.get().removeEventHandler(this.tabletModeChangeHandler);
    Sync.get().removeEventHandler(this.syncObserver);
    Auth.get().removeEventHandler(this.signoutObserver);
    if (this.options) {
      this.options.removeChangeObserver(this.optionsObserver);
    }
  }

  registerObservers() {
    this.optionsObserver = this.options.addChangeObserver(
      (options, eventType) => {
        this.reloadList(true);

        // should only show for non-search term change
        let shouldReloadSubtitleAfterNotesReload = false;
        if (eventType !== OptionsState.OptionsStateChangeEventSearch) {
          shouldReloadSubtitleAfterNotesReload = true;
          this.setSubTitle('Loading...');
          this.reloadHeaderBar();
        } else {
          this.reloadHeaderBar();
        }

        if (shouldReloadSubtitleAfterNotesReload) {
          this.setSubTitle(null);
        }
      }
    );

    this.mappingObserver = ModelManager.get().addItemSyncObserver(
      'notes-screen',
      ['Tag', 'Note'],
      (allRelevantItems, validItems, deletedItems) => {
        if (deletedItems.find(item => item.content_type === 'Tag')) {
          // If a tag was deleted, let's check to see if we should reload our selected tags list
          var tags = ModelManager.get().getTagsWithIds(
            this.options.selectedTagIds
          );
          if (tags.length === 0) {
            this.options.setSelectedTagIds(
              ModelManager.get().defaultSmartTag().uuid
            );
          }
        }
        this.reloadHeaderBar(); // reload header bar in case a tag was renamed
        this.reloadList();
      }
    );

    this.syncObserver = Sync.get().addEventHandler((event, data) => {
      if (event === 'sync:completed') {
        this.mergeState({ refreshing: false, loading: false });
      } else if (event === 'local-data-loaded') {
        this.displayNeedSignInAlertForLocalItemsIfApplicable(
          ModelManager.get().allItems
        );
        this.reloadList();
        this.reloadHeaderBar();
        this.mergeState({ decrypting: false, loading: false });
        if (ApplicationState.get().isInTabletMode) {
          this.selectFirstNote();
        }
      } else if (event === 'sync-exception') {
        Alert.alert(
          'Issue Syncing',
          `There was an error while trying to save your items. Please contact support and share this message: ${data}`
        );
      }
    });

    this.signoutObserver = Auth.get().addEventHandler(event => {
      if (event === SFAuthManager.DidSignOutEvent) {
        this.reloadList();
      } else if (event === SFAuthManager.WillSignInEvent) {
        this.mergeState({ loading: true });
      } else if (event === SFAuthManager.DidSignInEvent) {
        // Check if there are items that are errorDecrypting and try decrypting with new keys
        Sync.get()
          .refreshErroredItems()
          .then(() => {
            this.reloadList();
          });
      }
    });

    this.tabletModeChangeHandler = ApplicationState.get().addEventHandler(
      (event, data) => {
        if (event === ApplicationState.KeyboardChangeEvent) {
          if (ApplicationState.get().isInTabletMode) {
            this.forceUpdate();
          }
        } else if (event === ApplicationState.AppStateEventTabletModeChange) {
          // If we are now in tablet mode after not being in tablet mode
          if (data.new_isInTabletMode && !data.old_isInTabletMode) {
            // Pop to root, if we are in Compose window.
            this.props.navigation.popToTop();
            setTimeout(() => {
              // Reselect previously selected note
              if (this.state.selectedNoteId) {
                let note = ModelManager.get().findItem(
                  this.state.selectedNoteId
                );
                if (note) {
                  this.selectNote(note);
                }
              }
            }, 10);
          }

          if (!data.new_isInTabletMode) {
            this.setState({ selectedNoteId: null });
            this.props.navigation.setParams({
              rightButton: null,
            });
          }
        }
      }
    );
  }

  // Called by Root.tsx
  root_onIncrementalSync() {
    this.reloadList();
    this.reloadHeaderBar();
  }

  /* If there is at least one item that has an error decrypting, and there are no account keys saved,
    display an alert instructing the user to log in. This happens when restoring from iCloud and data is restored but keys are not.
   */
  displayNeedSignInAlertForLocalItemsIfApplicable(items) {
    if (KeysManager.get().shouldPresentKeyRecoveryWizard()) {
      this.props.navigation.navigate(SCREEN_KEY_RECOVERY);
      return;
    }

    if (!items || KeysManager.get().hasAccountKeys()) {
      return;
    }

    let needsDecrypt = false;
    for (const item of items) {
      if (item.errorDecrypting) {
        needsDecrypt = true;
        break;
      }
    }

    if (needsDecrypt) {
      Alert.alert(
        'Missing Keys',
        'Some of your items cannot be decrypted because the keys are missing. This can happen if you restored your device from backup. Please sign in to restore your data.'
      );
    }
  }

  reloadHeaderBar() {
    if (this.state.lockContent) {
      return;
    }

    const tags = ModelManager.get().getTagsWithIds(this.options.selectedTagIds);

    if (this.searching) {
      this.setTitle(`${this.stateNotes.length} search results`);
    } else if (tags.length > 0) {
      // Tags might not be completely loaded yet, as reloadHeaderBar can be called from incrementalSync
      const tag = tags[0];
      const notesTitle = tag.title;
      this.setTitle(notesTitle);
    }
  }

  setSideMenuHandler() {
    SideMenuManager.get().setHandlerForLeftSideMenu({
      onTagSelect: tag => {
        // Single tag at a time only
        this.options.setSelectedTagIds([tag.uuid]);
        this.props.navigation.closeLeftDrawer();
      },
      getSelectedTags: () => {
        let ids = this.options.getSelectedTagIds();
        return ModelManager.get().getTagsWithIds(ids);
      },
    });
  }

  async presentComposer(note) {
    this.props.navigation.navigate(SCREEN_COMPOSE, {
      title: note ? 'Note' : 'Compose',
      noteId: note && note.uuid,
      selectedTagId:
        this.options.selectedTagIds.length && this.options.selectedTagIds[0],
    });
  }

  reloadList(force) {
    if (!this.visible && !this.willBeVisible && !force) {
      console.log('===Scheduling Notes Render Update===');
      this.loadNotesOnVisible = true;
      return;
    }

    console.log('===Reload Notes List===');

    const result = ModelManager.get().getNotes(this.options);
    const { notes, tags } = result;

    this.setState({ notes: notes, tags: tags, refreshing: false });

    // setState is async, but we need this value right away sometimes to select the first note of new set of notes
    this.stateNotes = notes;

    this.forceUpdate();
  }

  selectFirstNote() {
    if (this.stateNotes && this.stateNotes.length > 0) {
      this.selectNote(this.stateNotes[0]);
    } else {
      this.selectNote(null);
    }
  }

  _onRefresh() {
    this.setSubTitle('Syncing...');
    this.setState({ refreshing: true });
    // Perform integrity checks for hard reloads
    Sync.get()
      .sync({ performIntegrityCheck: true })
      .then(() => {
        setTimeout(() => {
          this.setSubTitle(null);
        }, 100);
      });
  }

  selectNote = note => {
    this.handlePrivilegedAction(
      note && note.content.protected,
      SFPrivilegesManager.ActionViewProtectedNotes,
      () => {
        if (this.props.onNoteSelect) {
          this.props.onNoteSelect(note);
        } else {
          this.presentComposer(note);
        }

        this.setState({ selectedNoteId: note && note.uuid });
      }
    );
  };

  _onPressItem = (item: hash) => {
    const run = () => {
      if (item.content.conflict_of) {
        item.content.conflict_of = null;
        item.setDirty(true);
        Sync.get().sync();
      }

      this.selectNote(item);
    };

    if (item.errorDecrypting) {
      this.props.navigation.navigate(SCREEN_SETTINGS);
    } else {
      run();
    }

    if (!ApplicationState.get().isInTabletMode) {
      // Make sure we close the keyboard here, otherwise the
      // search box keeps focus and leaves the Keyboard open. It creates a glitchy state
      // that leave the Keyboard confused if it should be open or closed
      Keyboard.dismiss();
    }
  };

  onSearchTextChange = text => {
    this.searching = true;
    this.options.setSearchTerm(text);
  };

  onSearchCancel = () => {
    this.searching = false;
    this.options.setSearchTerm(null);
  };

  handleActionsheetAction = (item, action, callback) => {
    const run = () => {
      ItemActionManager.handleEvent(
        action,
        item,
        () => {
          callback();
        },
        () => {
          // afterConfirmCallback
          // We want to show "Deleting.." on top of note cell after the user confirms the dialogue
          callback();
        }
      );
    };

    if (
      action === ItemActionManager.TrashEvent ||
      action === ItemActionManager.DeleteEvent
    ) {
      this.handlePrivilegedAction(
        true,
        SFPrivilegesManager.ActionDeleteNote,
        () => {
          run();
        }
      );
    } else {
      run();
    }
  };

  onUnlockPress = () => {
    this.props.onUnlockPress();
  };

  render() {
    if (this.state.lockContent) {
      return <LockedView onUnlockPress={this.onUnlockPress} />;
    }

    return (
      <SafeAreaView
        forceInset={{ top: 'never', bottom: 'never', horizontal: 'always' }}
        style={[StyleKit.styles.container, StyleKit.styles.baseBackground]}
      >
        {this.state.notes && (
          <NoteList
            onRefresh={this._onRefresh.bind(this)}
            hasRefreshControl={!Auth.get().offline()}
            onPressItem={this._onPressItem}
            refreshing={this.state.refreshing}
            onSearchChange={this.onSearchTextChange}
            onSearchCancel={this.onSearchCancel}
            notes={this.state.notes}
            sortType={this.options.sortBy}
            decrypting={this.state.decrypting}
            loading={this.state.loading}
            selectedTags={this.state.tags}
            options={this.options.displayOptions}
            selectedNoteId={
              ApplicationState.get().isInTabletMode && this.state.selectedNoteId
            }
            handleAction={this.handleActionsheetAction}
          />
        )}

        <FAB
          style={
            ApplicationState.get().isInTabletMode
              ? { bottom: ApplicationState.get().getKeyboardHeight() }
              : null
          }
          buttonColor={StyleKit.variables.stylekitInfoColor}
          iconTextColor={StyleKit.variables.stylekitInfoContrastColor}
          onClickAction={() => {
            this.selectNote();
          }}
          visible={true}
          size={30}
          paddingTop={ApplicationState.isIOS ? 1 : 0}
          iconTextComponent={
            <Icon
              testID="newNoteButton"
              style={{ textAlignVertical: 'center' }}
              name={StyleKit.nameForIcon(ICON_ADD)}
            />
          }
        />
      </SafeAreaView>
    );
  }

  loadStyles() {
    this.styles = {};
  }
}
