import React, { Component } from 'react';
import { StyleSheet, View, Platform, Text, StatusBar, Modal } from 'react-native';
import ModelManager from '../lib/modelManager'
import Storage from '../lib/storage'
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import KeysManager from '../lib/keysManager'
import AlertManager from '../lib/alertManager'
import GlobalStyles from "../Styles"
import Keychain from "../lib/keychain"
import Icons from '../Icons';
import NoteList from "../containers/NoteList"
import Abstract from "./Abstract"
import OptionsState from "../OptionsState"
import App from "../app"
import AuthModal from "../containers/AuthModal"
import LockedView from "../containers/LockedView"
var _ = require('lodash')
import ApplicationState from "../ApplicationState";

export default class Notes extends Abstract {

  constructor(props) {
    super(props);

    this.rendersLockscreen = true;

    this.stateObserver = ApplicationState.get().addStateObserver((state) => {
      if(state == ApplicationState.Resuming) {
        // we only want to perform sync here if the app is resuming, not if it's a fresh start
        if(this.dataLoaded) {
          Sync.getInstance().sync();
        }

        var authProps = ApplicationState.get().getAuthenticationPropsForAppState(state);
        if((authProps.passcode || authProps.fingerprint)) {
          // Android can handle presenting modals no matter which screen you're on
          if(App.isIOS) {
            // The auth modal is only presented if the Notes screen is visible.
            this.props.navigator.popToRoot();

            // Don't use the below as it will also for some reason dismiss the non RNN auth modal as well
            // this.props.navigator.dismissAllModals({animationType: 'none'});

            this.props.navigator.switchToTab({
              tabIndex: 0
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
    this.loadTabbarIcons();
    this.initializeNotes();
    this.beginSyncTimer();

    super.loadInitialState();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    ApplicationState.get().removeStateObserver(this.stateObserver);
    Sync.getInstance().removeSyncObserver(this.syncObserver);
    Sync.getInstance().removeSyncStatusObserver(this.syncStatusObserver);
    Auth.getInstance().removeEventObserver(this.signoutObserver);
    this.options.removeChangeObserver(this.optionsObserver);
    clearInterval(this.syncTimer);
  }

  beginSyncTimer() {
    // Refresh every 30s
    this.syncTimer = setInterval(function () {
      Sync.getInstance().sync(null);
    }, 30000);
  }

  registerObservers() {
    this.optionsObserver = this.options.addChangeObserver((options) => {
      this.reloadList(true);
      // On iOS, configureNavBar would be handle by viewWillAppear. However, we're using a drawer in Android.
      if(Platform.OS == "android" && !this.skipUpdatingNavBar) {
        this.configureNavBar();
      }
    })

    this.syncObserver = Sync.getInstance().registerSyncObserver(function(changesMade, retrieved, saved, unsaved){
      if(_.find(retrieved, {content_type: "Note"}) || _.find(unsaved, {content_type: "Note"})) {
        this.reloadList();
      }
      this.mergeState({refreshing: false, loading: false});
    }.bind(this))

    this.syncStatusObserver = Sync.getInstance().registerSyncStatusObserver((status) => {
      if(status.retrievedCount > 20) {
        if(!this.state.showSyncBar) {
          this.mergeState({showSyncBar: true});
        }
      } else if(this.state.showSyncBar) {
        this.mergeState({syncBarComplete: true});
        setTimeout(() => {
          this.mergeState({showSyncBar: false, syncBarComplete: false});
        }, 1000);
      }
    })

    this.signoutObserver = Auth.getInstance().addEventObserver([Auth.DidSignOutEvent, Auth.WillSignInEvent], function(event){
      if(event == Auth.WillSignInEvent) {
        this.mergeState({loading: true})
      }
    }.bind(this));
  }

  loadTabbarIcons() {
    if(!App.get().isIOS) {
      return;
    }
    this.props.navigator.setTabButton({
      tabIndex: 0,
      icon: Icons.getIcon('ios-menu-outline'),
      selectedIcon: Icons.getIcon('ios-menu-outline')
    });
    this.props.navigator.setTabButton({
      tabIndex: 1,
      icon: Icons.getIcon('ios-contact-outline'),
      selectedIcon: Icons.getIcon('ios-contact-outline')
    });
  }

  initializeNotes() {
    var encryptionEnabled = KeysManager.get().isOfflineEncryptionEnabled();
    this.mergeState({decrypting: encryptionEnabled, loading: !encryptionEnabled})

    Sync.getInstance().loadLocalItems(function(items) {
      setTimeout(function () {
        this.dataLoaded = true;
        this.reloadList();
        this.configureNavBar(true);
        this.mergeState({decrypting: false, loading: false});
        // perform initial sync
        Sync.getInstance().sync(null);
      }.bind(this), 0);
    }.bind(this));
  }

  configureNavBar(initial = false) {
    if(this.state.lockContent) {
      return;
    }

    if(!this.dataLoaded) {
      this.notesTitle = "Notes";
      this.props.navigator.setTitle({title: this.notesTitle, animated: false});
      return;
    }

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
        var tags = ModelManager.getInstance().getItemsWithIds(options.selectedTags);
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

    if(notesTitle !== this.notesTitle) {
      // no changes, return. We do this so when swiping back from compose to here,
      // we don't change the title while a transition is taking place
      this.notesTitle = notesTitle;

      this.props.navigator.setTitle({title: notesTitle, animated: false});
    }

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
        title: 'New',
        id: 'new',
        showAsAction: 'ifRoom',
      })
    } else {
      rightButtons.push({
        title: 'Settings',
        id: 'settings',
        showAsAction: 'ifRoom',
        icon: Icons.getIcon('md-settings'),
      })
    }

    this.props.navigator.setButtons({
      rightButtons: rightButtons,
      leftButtons: [
        {
          title: filterTitle,
          id: 'sideMenu',
          showAsAction: 'ifRoom',
        },
      ],
      fab: {
        collapsedId: 'new',
        collapsedIcon: Icons.getIcon('md-add'),
        backgroundColor: GlobalStyles.constants().mainTintColor
      },
      animated: false
    });
  }

  onNavigatorEvent(event) {

    super.onNavigatorEvent(event);

    if(event.id == "willAppear" || event.id == "didAppear") {
      if(event.id == "willAppear") {
        this.forceUpdate();
      }
      if(this.loadNotesOnVisible) {
        this.loadNotesOnVisible = false;
        this.reloadList();
      }
    }

    if (event.type == 'NavBarButtonPress') {
      if (event.id == 'new') {
        this.presentNewComposer();
      } else if (event.id == 'sideMenu') {
        // Android is handled by the drawer attribute of rn-navigation
        if(Platform.OS == "ios") {
          this.presentFilterScreen();
        }
      } else if(event.id == "settings") {
        this.presentSettingsScreen();
      }
    }
  }

  presentNewComposer() {
    this.props.navigator.push({
      screen: 'sn.Compose',
      title: 'Compose',
      passProps: {selectedTagId: this.selectedTags.length && this.selectedTags[0].uuid}, // For Android
    });
  }

  presentFilterScreen() {
    this.props.navigator.showModal({
      screen: 'sn.Filter',
      title: 'Options',
      animationType: 'slide-up',
      passProps: {
        options: JSON.stringify(this.options),
        onOptionsChange: (options) => {
          this.options.mergeWith(options);
        }
      }
    });
  }

  presentSettingsScreen() {
    this.props.navigator.showModal({
      screen: 'sn.Account',
      title: 'Account',
      animationType: 'slide-up'
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
    this.setState({refreshing: true});
    Sync.getInstance().sync();
  }

  _onPressItem = (item: hash) => {
    var run = () => {
      if(item.conflictOf) {
        item.conflictOf = null;
      }

      this.props.navigator.push({
        screen: 'sn.Compose',
        title: 'Compose',
        passProps: {noteId: item.uuid},
        animationType: "slide-horizontal"
      });
    }

    if(item.errorDecrypting) {
      AlertManager.showConfirmationAlert(
        "Unable to Decrypt", "This note could not be decrypted. Perhaps it was encrypted with another key? Please visit standardnotes.org/help for more. Note: Editing this note may damage its original contents.", "Edit Anyway",
        function(){
          run();
        }.bind(this)
      )
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

    var result = ModelManager.getInstance().getNotes(this.options);
    var notes = result.notes;
    var tags = this.selectedTags = result.tags;

    var syncStatus = Sync.getInstance().syncStatus;

    return (
      <View style={GlobalStyles.styles().container}>
        {notes &&
          <NoteList
            onRefresh={this._onRefresh.bind(this)}
            onPressItem={this._onPressItem}
            refreshing={this.state.refreshing}
            onSearchChange={this.onSearchTextChange}
            onSearchCancel={this.onSearchCancel}
            notes={notes}
            sortType={this.options.sortBy}
            decrypting={this.state.decrypting}
            loading={this.state.loading}
            selectedTags={tags}
          />
        }

        {this.state.showSyncBar &&
          <View style={GlobalStyles.styles().syncBar}>
            <Text style={GlobalStyles.styles().syncBarText}>{this.state.syncBarComplete ? "Download Success" : `Downloading ${syncStatus.retrievedCount} items. Keep app opened.`}</Text>
          </View>
        }
      </View>
    );
  }
}
