import React, { Component } from 'react';
import { StyleSheet, View, Platform, Text, StatusBar, Modal, Alert } from 'react-native';
import {Navigation} from 'react-native-navigation';

import App from "../app"
import ModelManager from '../lib/sfjs/modelManager'
import Storage from '../lib/sfjs/storageManager'
import Sync from '../lib/sfjs/syncManager'
import AlertManager from '../lib/sfjs/alertManager'

import Auth from '../lib/sfjs/authManager'
import KeysManager from '../lib/keysManager'
import Keychain from "../lib/keychain"

import Abstract from "./Abstract"
import GlobalStyles from "../Styles"
import Icons from '../Icons';
import NoteList from "../containers/NoteList"
import OptionsState from "../OptionsState"
import AuthModal from "../containers/AuthModal"
import LockedView from "../containers/LockedView"
import ApplicationState from "../ApplicationState";

export default class Notes extends Abstract {

  constructor(props) {
    super(props);

    this.rendersLockscreen = true;

    this.stateObserver = ApplicationState.get().addStateObserver((state) => {
      if(state == ApplicationState.Resuming) {
        // we only want to perform sync here if the app is resuming, not if it's a fresh start
        if(this.dataLoaded) {
          Sync.get().sync();
        }

        var authProps = ApplicationState.get().getAuthenticationPropsForAppState(state);
        if((authProps.passcode || authProps.fingerprint)) {
          // Android can handle presenting modals no matter which screen you're on
          if(App.isIOS) {
            // The auth modal is only presented if the Notes screen is visible.
            Navigation.popToRoot(this.props.componentId);

            // Don't use the below as it will also for some reason dismiss the non RNN auth modal as well
            // Navigation.dismissAllModals({animationType: 'none'});

            Navigation.mergeOptions('MainTabBar', {
              bottomTabs: {
                currentTabIndex: 0
              }
            });
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
    this.options = App.get().globalOptions();

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
      // should only show for non-search term change
      if(eventType !== OptionsState.OptionsStateChangeEventSearch) {
        this.setNavBarSubtitle("Loading...");
        this.showingNavBarLoadingStatus = true;
      }
      this.reloadList(true);
      // On iOS, configureNavBar would be handle by viewWillAppear. However, we're using a drawer in Android.
      if(Platform.OS == "android" && !this.skipUpdatingNavBar) {
        this.configureNavBar();
      }
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
    console.log("Configure Nav Bar");
    // If you change anything here, be sure to test how it interacts with filtering, when you change which tags to show.
    console.log(this.visible, this.willBeVisible);
    if(this.state.lockContent || (!this.visible && !this.willBeVisible)) {
      this.needsConfigureNavBar = true;
      return;
    }

    if(!this.dataLoaded) {
      this.notesTitle = "Notes";
      this.setTitle(this.notesTitle);
      this.needsConfigureNavBar = true;
      return;
    }

    this.needsConfigureNavBar = false;

    super.configureNavBar();

    var options = this.options;

    var notesTitle = "Notes";
    var filterTitle = "Filter";
    var numTags = options.selectedTags.length;

    if(App.isIOS && (numTags > 0 || options.archivedOnly)) {
      if(numTags > 0) {
        filterTitle += ` (${numTags})`
      }
      notesTitle = options.archivedOnly ? "Archived Notes" : "Filtered Notes";
    }

    // Android only allows 1 tag selection
    if(App.isAndroid) {
      if(numTags > 0) {
        var tags = ModelManager.get().findItems(options.selectedTags);
        if(tags.length > 0) {
          var tag = tags[0];
          notesTitle = tag.title + " notes";
        } else {
          notesTitle = "Notes";
        }
      }

      if(options.archivedOnly) {
        notesTitle = "Archived " + notesTitle;
      }
    }

    // if(notesTitle !== this.notesTitle) {
    //   // no changes, return. We do this so when swiping back from compose to here,
    //   // we don't change the title while a transition is taking place
    //
    //   this.setTitle({title: notesTitle, animated: false});
    // }
    this.notesTitle = notesTitle;

    if(!initial && App.isIOS && filterTitle === this.filterTitle) {
      // On Android, we want to always run the bottom code in the case of the FAB that doesn't
      // reappaer if on the next screen a keyboard is present and you hit back.
      // on iOS, navigation button stack is saved so it only needs to be configured once
      return;
    }

    this.filterTitle = filterTitle;

    var rightButtons = [];
    if(App.get().isIOS) {
      rightButtons.push({
        text: 'New',
        id: 'new',
        showAsAction: 'ifRoom',
      })
    } else {
      rightButtons.push({
        text: 'Settings',
        id: 'settings',
        showAsAction: 'ifRoom',
        icon: Icons.getIcon('md-settings'),
      })
    }

    let leftButtons = [
      {
        text: filterTitle,
        id: 'sideMenu',
        showAsAction: 'ifRoom',
      },
    ]

    Navigation.mergeOptions(this.props.componentId, {
      topBar: {
        leftButtons: leftButtons,
        rightButtons: rightButtons,
        title: {
          text: notesTitle
        }
      }
    });

    //   fab: {
    //     collapsedId: 'new',
    //     collapsedIcon: Icons.getIcon('md-add'),
    //     backgroundColor: GlobalStyles.constants().mainTintColor
    //   },
    //   animated: false
  }

  navigationButtonPressed({ buttonId }) {
    // During incremental load, we wan't to avoid race conditions where we wait for navigator callback for this
    // to be set in Abstract. Setting it here immediately will avoid updating the nav bar while we navigated away.
    // Don't set this for Android if just opening side menu.
    this.willBeVisible = (App.isAndroid && buttonId == 'sideMenu'); // this value is only false (what we want) if it's not Android side menu

    if (buttonId == 'new') {
      this.presentNewComposer();
    } else if (buttonId == 'sideMenu') {
      // Android is handled by the drawer attribute of rn-navigation
      if(Platform.OS == "ios") {
        this.presentFilterScreen();
      }
    } else if(buttonId == "settings") {
      this.presentSettingsScreen();
    }
  }

  onNavigatorEvent(event) {

    super.onNavigatorEvent(event);

    if(event == "willAppear" || event == "didAppear") {
      if(event == "willAppear") {
        this.forceUpdate();
      }
      else if(event == "didAppear") {
        if(this.needsConfigureNavBar) {
          this.configureNavBar(false);
        }
      }
      if(this.loadNotesOnVisible) {
        this.loadNotesOnVisible = false;
        this.reloadList();
      }
    }
  }

  presentNewComposer() {
    Navigation.push(this.props.componentId, {
      component: {
        name: 'sn.Compose',
        passProps: {
          selectedTagId: this.selectedTags.length && this.selectedTags[0].uuid // For Android
        },
        options: {
          bottomTabs: {visible: false},
          topBar: {
            title: {
              text: 'Compose'
            }
          }
        }
      }
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

  componentDidUpdate() {
    // Called when render is complete
    if(this.showingNavBarLoadingStatus) {
      setTimeout(() => {
        this.setNavBarSubtitle(null);
        this.showingNavBarLoadingStatus = false;
      }, 50);
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

  _onPressItem = (item: hash) => {
    var run = () => {
      if(item.conflict_of) {
        item.conflict_of = null;
      }

      Navigation.push(this.props.componentId, {
        component: {
          name: 'sn.Compose',
          passProps: {
            noteId: item.uuid
          },
          options: {
            bottomTabs: {visible: false},
            topBar: {
              title: {
                text: 'Compose'
              }
            }
          }
        }
      });
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
    var tags = this.selectedTags = result.tags;

    var syncStatus = Sync.get().syncStatus;

    return (
      <View style={GlobalStyles.styles().container}>
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
          <View style={GlobalStyles.styles().syncBar}>
            <Text style={GlobalStyles.styles().syncBarText}>{this.state.syncBarText}</Text>
          </View>
        }
      </View>
    );
  }
}
