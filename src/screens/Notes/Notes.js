import React, { Component } from 'react';
import { View, Text, Alert } from 'react-native';

import ModelManager from '@SFJS/modelManager'
import Storage from '@SFJS/storageManager'
import Sync from '@SFJS/syncManager'
import AlertManager from '@SFJS/alertManager'

import Auth from '@SFJS/authManager'
import KeysManager from '@Lib/keysManager'
import Keychain from "@Lib/keychain"

import SideMenuManager from "@SideMenu/SideMenuManager"

import Abstract from "@Screens/Abstract"
import StyleKit from "@Style/StyleKit"
import NoteList from "@Screens/Notes/NoteList"
import OptionsState from "@Lib/OptionsState"
import LockedView from "@Containers/LockedView"
import ApplicationState from "@Lib/ApplicationState"

import AuthenticationSourceAccountPassword from "@Screens/Authentication/Sources/AuthenticationSourceAccountPassword";
import AuthenticationSourceLocalPasscode from "@Screens/Authentication/Sources/AuthenticationSourceLocalPasscode";
import AuthenticationSourceBiometric from "@Screens/Authentication/Sources/AuthenticationSourceBiometric";

import Icon from 'react-native-vector-icons/Ionicons';
import FAB from 'react-native-fab';

export default class Notes extends Abstract {

  constructor(props) {
    super(props);

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
      let authProps = ApplicationState.get().getAuthenticationPropsForAppState(state);
      if(authProps.sources.length > 0) {
        this.presentAuthenticationModal(authProps);
      }
      else if(state == ApplicationState.GainingFocus) {
        // we only want to perform sync here if the app is resuming, not if it's a fresh start
        if(this.dataLoaded) {
          Sync.get().sync();
        }
      }
    })
  }

  loadInitialState() {
    this.options = ApplicationState.getOptions();

    this.mergeState({
      refreshing: false,
      decrypting: false,
      loading: true,
      notes: []
    });

    this.registerObservers();
    this.initializeNotes();
    this.beginSyncTimer();

    super.loadInitialState();
  }

  componentDidMount() {
    super.componentDidMount();
    if(this.authOnMount) {
      // Perform in timeout to avoid stutter when presenting modal on initial app start.
      setTimeout(() => {
        this.presentAuthenticationModal(this.authOnMount);
        this.authOnMount = null;
      }, 20);
    }
  }

  presentAuthenticationModal(authProps) {
    if(!this.isMounted()) {
      console.log("Not yet mounted, not authing.");
      this.authOnMount = authProps;
      return;
    }


    if(this.authenticationInProgress) {
      console.log('Not presenting auth modal because one is already presented.');
      return;
    }

    this.authenticationInProgress = true;

    this.props.navigation.navigate("Authenticate", {
      authenticationSources: authProps.sources,
      onSuccess: () => {
        authProps.onAuthenticate();
        this.authenticationInProgress = false;

        if(this.dataLoaded) {
          Sync.get().sync();
        }
      }
    });
  }

  unlockContent() {
    super.unlockContent();
    this.configureNavBar(true);
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
      if(ApplicationState.get().isTablet) {
        this.selectFirstNote();
      }
    })

    this.mappingObserver = ModelManager.get().addItemSyncObserver("notes-screen", ["Tag", "Note"], () => {
      this.reloadList();
    })

    this.syncObserver = Sync.get().addEventHandler((event, data) => {
      if(event == "sync:completed") {
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
    // this.mergeState({showSyncBar: text != null, syncBarText: text});
    this.setSubTitle(text);
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
    if(this.state.lockContent) {
      this.needsConfigureNavBar = true;
      return;
    }

    this.needsConfigureNavBar = false;

    super.configureNavBar();

    var options = this.options;
    var notesTitle = "Notes";
    var numTags = options.selectedTagIds.length;

    if(numTags > 0) {
      var tags = ModelManager.get().getTagsWithIds(options.selectedTagIds);
      if(tags.length > 0) {
        var tag = tags[0];
        notesTitle = tag.title;
      } else {
        notesTitle = "Notes";
      }
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
        this.props.navigation.closeLeftDrawer();
      },
      getSelectedTags: () => {
        let ids = this.options.getSelectedTagIds();
        return ModelManager.get().getTagsWithIds(ids);
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
  }

  componentWillFocus() {
    super.componentWillFocus();

    if(this.loadNotesOnVisible) {
      this.loadNotesOnVisible = false;
      this.reloadList();
    }
  }

  async presentComposer(note) {
    this.handlePrivilegedAction(note && note.content.protected, SFPrivilegesManager.ActionViewProtectedNotes, () => {
      this.props.navigation.navigate("Compose", {
        noteId: note && note.uuid,
        selectedTagId: this.options.selectedTagIds.length && this.options.selectedTagIds[0],
      });
    })
  }

  reloadList(force) {
    if(!this.visible && !this.willBeVisible && !force) {
      console.log("===Scheduling Notes Render Update===");
      this.loadNotesOnVisible = true;
      return;
    }

    console.log("===Reload Notes List===");

    var result = ModelManager.get().getNotes(this.options);
    var notes = result.notes;
    var tags = result.tags;

    this.setState({notes: notes, tags: tags, refreshing: false});

    // setState is async, but we need this value right away sometimes to select the first note of new set of notes
    this.stateNotes = notes;

    this.forceUpdate();
  }

  selectFirstNote() {
    if(this.stateNotes && this.stateNotes.length > 0) {
      this.handleSelection(this.stateNotes[0]);
    } else {
      this.handleSelection(null);
    }
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

  handleSelection = (note) => {
    if(this.props.onNoteSelect) {
      this.props.onNoteSelect(note);
    } else {
      this.presentComposer(note);
    }
  }

  _onPressItem = (item: hash) => {
    var run = () => {
      if(item.conflict_of) {
        item.conflict_of = null;
      }

      this.handleSelection(item);
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
      return <LockedView />;
    }

    var syncStatus = Sync.get().syncStatus;

    return (
      <View style={StyleKit.styles.container}>
        {this.state.notes &&
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
          />
        }

        {this.state.showSyncBar &&
          <View style={this.styles.syncBar}>
            <Text style={this.styles.syncBarText}>{this.state.syncBarText}</Text>
          </View>
        }

        <FAB
          buttonColor={StyleKit.variable("stylekitInfoColor")}
          iconTextColor={StyleKit.variable("stylekitInfoContrastColor")}
          onClickAction={() => {this.handleSelection()}}
          visible={true}
          iconTextComponent={<Icon name="md-add"/>}
        />
      </View>
    );
  }

  loadStyles() {
    this.styles = {
      syncBar: {
        position: "absolute",
        bottom: 0,
        width: "100%",
        backgroundColor: StyleKit.variables.stylekitContrastBackgroundColor,
        padding: 5
      },

      syncBarText: {
        textAlign: "center",
        color: StyleKit.variables.stylekitContrastForegroundColor
      },
    }
  }
}
