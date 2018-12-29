import React, { Component } from 'react';
import { StyleSheet, View, Platform, Text, StatusBar, Modal, Alert, Button } from 'react-native';

import ModelManager from '../lib/sfjs/modelManager'
import Storage from '../lib/sfjs/storageManager'
import Sync from '../lib/sfjs/syncManager'
import AlertManager from '../lib/sfjs/alertManager'

import Auth from '../lib/sfjs/authManager'
import KeysManager from '../lib/keysManager'
import Keychain from "../lib/keychain"

import SideMenuManager from "@SideMenu/SideMenuManager"

import Abstract from "./Abstract"
import StyleKit from "../style/StyleKit"
import Icons from '@Style/Icons';
import NoteList from "../containers/NoteList"
import OptionsState from "../OptionsState"
import AuthModal from "../containers/AuthModal"
import LockedView from "../containers/LockedView"
import ApplicationState from "../ApplicationState";

import { DrawerActions } from 'react-navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import FAB from 'react-native-fab';
import HeaderButtons, { HeaderButton, Item } from 'react-navigation-header-buttons';

export default class Notes extends Abstract {

  constructor(props) {
    super(props);

    this.rendersLockscreen = true;

    props.navigation.setParams({
      title: "Notes",
      leftButton: {
        title: null,
        iconName: "ios-menu-outline",
        onPress: () => {
          this.props.navigation.openLeftDrawer();
        }
      }
    })

    this.stateObserver = ApplicationState.get().addStateObserver((state) => {
      if(state == ApplicationState.Resuming) {
        // we only want to perform sync here if the app is resuming, not if it's a fresh start
        if(this.dataLoaded) {
          Sync.get().sync();
        }

        var authProps = ApplicationState.get().getAuthenticationPropsForAppState(state);
        if((authProps.passcode || authProps.fingerprint)) {
          // Android can handle presenting modals no matter which screen you're on
          if(ApplicationState.isIOS) {
            // The auth modal is only presented if the Notes screen is visible.
            this.props.navigation.popToTop();
          }
        }
      }
    })
  }

  unlockContent() {
    super.unlockContent();
    this.configureNavBar(true);
  }

  loadInitialState() {
    this.options = ApplicationState.getOptions();

    this.mergeState({
      refreshing: false,
      decrypting: false,
      loading: true,
    });

    this.registerObservers();
    this.initializeNotes();
    this.beginSyncTimer();

    super.loadInitialState();
  }

  componentDidMount() {
    super.componentDidMount();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    ApplicationState.get().removeStateObserver(this.stateObserver);

    Sync.get().removeEventHandler(this.syncObserver);
    Sync.get().removeSyncStatusObserver(this.syncStatusObserver);

    Auth.get().removeEventHandler(this.signoutObserver);
    if(this.options) {
      this.options.removeChangeObserver(this.optionsObserver);
    }
    clearInterval(this.syncTimer);
  }

  beginSyncTimer() {
    // Refresh every 30s
    this.syncTimer = setInterval(function () {
      Sync.get().sync(null);
    }, 30000);
  }

  registerObservers() {
    this.optionsObserver = this.options.addChangeObserver((options, eventType) => {
      // this.props.navigation.closeLeftDrawer();
      // should only show for non-search term change
      if(eventType !== OptionsState.OptionsStateChangeEventSearch) {
        this.setTitle(null, "Loading...");
        this.showingNavBarLoadingStatus = true;
      }
      this.reloadList(true);
      this.configureNavBar();
    })

    this.syncObserver = Sync.get().addEventHandler((event, data) => {
      if(event == "sync:completed") {
        // We want to reload the list of the retrieved items contains notes or tags.
        // Since Notes no longer have relationships on tags, if a note's tags change, only the tag will be synced.
        var retrievedHasNoteOrTag = data.retrievedItems && data.retrievedItems.find((item) => {
          return ["Note", "Tag"].includes(item.content_type);
        })
        if(retrievedHasNoteOrTag || _.find(data.unsavedItems, {content_type: "Note"})) {
          this.reloadList();
        }
        this.mergeState({refreshing: false, loading: false});
      } else if(event == "sync-exception") {
        Alert.alert("Issue Syncing", `There was an error while trying to save your items. Please contact support and share this message: ${data}`);
      }
    })

    this.syncStatusObserver = Sync.get().registerSyncStatusObserver((status) => {
      if(status.error) {
        var text = `Unable to connect to sync server.`
        this.showingErrorStatus = true;
        setTimeout( () => {
          // need timeout for syncing on app launch
          this.setStatusBarText(text);
        }, 250);
      } else if(status.retrievedCount > 20) {
        var text = `Downloading ${status.retrievedCount} items. Keep app opened.`
        this.setStatusBarText(text);
        this.showingDownloadStatus = true;
      } else if(this.showingDownloadStatus) {
        this.showingDownloadStatus = false;
        var text = "Download Complete.";
        this.setStatusBarText(text);
        setTimeout(() => {
          this.setStatusBarText(null);
        }, 2000);
      } else if(this.showingErrorStatus) {
        this.setStatusBarText(null);
      }
    })

    this.signoutObserver = Auth.get().addEventHandler((event) => {
      if(event == SFAuthManager.WillSignInEvent) {
        this.mergeState({loading: true})
      } else if(event == SFAuthManager.DidSignInEvent) {
        // Check if there are items that are errorDecrypting and try decrypting with new keys
        Sync.get().refreshErroredItems().then(() => {
          this.reloadList();
        })
      } else if(event == SFAuthManager.DidSignOutEvent) {
        this.setStatusBarText(null);
      }
    });
  }

  setStatusBarText(text) {
    this.mergeState({showSyncBar: text != null, syncBarText: text});
  }

  initializeNotes() {
    var encryptionEnabled = KeysManager.get().isOfflineEncryptionEnabled();
    this.mergeState({decrypting: encryptionEnabled, loading: !encryptionEnabled})

    this.setStatusBarText(encryptionEnabled ? "Decrypting notes..." : "Loading notes...");
    let incrementalCallback = (current, total) => {
      let notesString = `${current}/${total} items...`
      this.setStatusBarText(encryptionEnabled ? `Decrypting ${notesString}` : `Loading ${notesString}`);
      // Incremental Callback
      if(!this.dataLoaded) {
        this.dataLoaded = true;
        this.configureNavBar(true);
      }
      this.reloadList();
    }

    let loadLocalCompletion = (items) => {
      this.setStatusBarText("Syncing...");
      this.displayNeedSignInAlertForLocalItemsIfApplicable(items);
      this.dataLoaded = true;
      this.reloadList();
      this.configureNavBar(true);
      this.mergeState({decrypting: false, loading: false});
      // perform initial sync
      Sync.get().sync().then(() => {
        this.setStatusBarText(null);
      });
    }

    if(Sync.get().initialDataLoaded()) {
      // Data can be already loaded in the case of a theme change
      loadLocalCompletion();
    } else {
      let batchSize = 100;
      Sync.get().loadLocalItems(incrementalCallback, batchSize).then((items) => {
        setTimeout(() => {
          loadLocalCompletion(items);
        });
      });
    }

  }

  /* If there is at least one item that has an error decrypting, and there are no account keys saved,
    display an alert instructing the user to log in. This happens when restoring from iCloud and data is restored but keys are not.
   */
  displayNeedSignInAlertForLocalItemsIfApplicable(items) {
    if(!items || KeysManager.get().hasAccountKeys()) {
      return;
    }

    var needsDecrypt = false;
    for(var item of items) {
      if(item.errorDecrypting) {
        needsDecrypt = true;
        break;
      }
    }

    if(needsDecrypt) {
      Alert.alert("Missing Keys", "Some of your items cannot be decrypted because the keys are missing. This can happen if you restored your device from backup. Please sign in to restore your data.");
    }
  }

  configureNavBar(initial = false) {
    // If you change anything here, be sure to test how it interacts with filtering, when you change which tags to show.
    if(this.state.lockContent ) {
      this.needsConfigureNavBar = true;
      return;
    }

    this.needsConfigureNavBar = false;

    super.configureNavBar();

    var options = this.options;
    var notesTitle = "Notes";
    var numTags = options.selectedTagIds.length;

    if(numTags > 0) {
      var tags = ModelManager.get().findItems(options.selectedTagIds);
      if(tags.length > 0) {
        var tag = tags[0];
        notesTitle = tag.title + " notes";
      } else {
        notesTitle = "Notes";
      }
    }

    if(options.archivedOnly) {
      notesTitle = "Archived Notes";
    }

    this.setTitle(notesTitle, null);
  }

  componentDidUpdate() {
    // Called when render is complete
    if(this.showingNavBarLoadingStatus) {
      setTimeout(() => {
        this.showingNavBarLoadingStatus = false;
      }, 50);
    }
  }

  setSideMenuHandler() {
    SideMenuManager.get().setHandlerForLeftSideMenu({
      onTagSelect: (tag) => {
        // Single tag at a time only
        this.options.setSelectedTagIds([tag.uuid]);
        // this.props.navigation.closeLeftDrawer();
      },
      getSelectedTags: () => {
        let ids = this.options.getSelectedTagIds();
        return ModelManager.get().findItems(ids);
      }
    })
  }

  componentDidFocus() {
    super.componentDidFocus();

    this.setSideMenuHandler();

    this.forceUpdate();

    if(this.needsConfigureNavBar) {
      this.configureNavBar(false);
    }

    if(this.loadNotesOnVisible) {
      this.loadNotesOnVisible = false;
      this.reloadList();
    }
  }

  presentComposer(item) {
    this.props.navigation.navigate("Compose", {
      noteId: item && item.uuid,
      selectedTagId: this.options.selectedTagIds.length && this.options.selectedTagIds[0],
    });
  }

  presentFilterScreen() {
    Navigation.showModal({
      stack: {
        children: [{
          component: {
            name: 'sn.Filter',
            passProps: {
              options: JSON.stringify(this.options),
              onOptionsChange: (options) => {
                this.options.mergeWith(options);
              }
            }
          }
        }]
      }
    });
  }

  presentSettingsScreen() {
    Navigation.showModal({
      stack: {
        children: [{
          component: {
            name: 'sn.Account',
            title: 'Account',
            animationType: 'slide-up'
          }
        }]
      }
    });
  }

  reloadList(force) {
    if(!this.visible && !this.willBeVisible && !force) {
      console.log("===Scheduling Notes Render Update===");
      this.loadNotesOnVisible = true;
      return;
    }

    console.log("===Reload Notes List===");

    this.forceUpdate();
    this.mergeState({refreshing: false})
  }

  _onRefresh() {
    this.setStatusBarText("Syncing...");
    this.setState({refreshing: true});
    Sync.get().sync().then(() => {
      setTimeout(() => {
        this.setStatusBarText(null);
      }, 100);
    })
  }

  _onPressItem = (item: hash) => {
    var run = () => {
      if(item.conflict_of) {
        item.conflict_of = null;
      }

      this.presentComposer(item);
    }

    if(item.errorDecrypting) {
      Alert.alert("Unable to Decrypt", "This note could not be decrypted. Perhaps it was encrypted with another key? Please try signing out then signing back in, or visit standardnotes.org/help to learn more.");
    } else {
      run();
    }
  }

  onSearchTextChange = (text) => {
    this.skipUpdatingNavBar = true;
    this.options.setSearchTerm(text);
    this.skipUpdatingNavBar = false;
  }

  onSearchCancel = () => {
    this.skipUpdatingNavBar = true;
    this.options.setSearchTerm(null);
    this.skipUpdatingNavBar = false;
  }

  render() {
    if(this.state.lockContent) {
      return <AuthModal />;
    }

    var result = ModelManager.get().getNotes(this.options);
    var notes = result.notes;
    var tags = result.tags;

    var syncStatus = Sync.get().syncStatus;

    return (
      <View style={StyleKit.styles().container}>
        {notes &&
          <NoteList
            onRefresh={this._onRefresh.bind(this)}
            hasRefreshControl={!Auth.get().offline()}
            onPressItem={this._onPressItem}
            refreshing={this.state.refreshing}
            onSearchChange={this.onSearchTextChange}
            onSearchCancel={this.onSearchCancel}
            notes={notes}
            sortType={this.options.sortBy}
            decrypting={this.state.decrypting}
            loading={this.state.loading}
            selectedTags={tags}
            options={this.options.displayOptions}
          />
        }

        {this.state.showSyncBar &&
          <View style={StyleKit.styles().syncBar}>
            <Text style={StyleKit.styles().syncBarText}>{this.state.syncBarText}</Text>
          </View>
        }

        <FAB
          buttonColor={StyleKit.variable("stylekitInfoColor")}
          iconTextColor={StyleKit.variable("stylekitInfoContrastColor")}
          onClickAction={() => {this.presentComposer()}}
          visible={true}
          iconTextComponent={<Icon name="md-add"/>}
        />
      </View>
    );
  }
}
