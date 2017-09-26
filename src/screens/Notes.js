import React, { Component } from 'react';
import { StyleSheet, View, Platform, Text, AppState, StatusBar } from 'react-native';
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
import Authenticate from "./Authenticate"
import OptionsState from "../OptionsState"
import App from "../app"
var _ = require('lodash')

export default class Notes extends Abstract {

  constructor(props) {
    super(props);

    this.state = {ready: false};

    this.readyObserver = App.get().addApplicationReadyObserver(() => {
      this.applicationIsReady = true;
      if(this.isMounted() && !this.state.ready) {
        this.loadInitialState();
      }
    })
  }

  loadInitialState() {
    this.options = App.get().globalOptions();
    this.mergeState({
      ready: true,
      refreshing: false,
      decrypting: false,
      loading: true
    });
    this.registerObservers();
    this.loadTabbarIcons();
    this.initializeNotes();
    this.beginSyncTimer();

    super.loadInitialState();
  }

  componentDidMount() {
    super.componentDidMount();
    if(this.applicationIsReady && !this.state.ready) {
      this.loadInitialState();
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    AppState.removeEventListener('change', this._handleAppStateChange);
    App.get().removeApplicationReadyObserver(this.readyObserver);
    Sync.getInstance().removeSyncObserver(this.syncObserver);
    Auth.getInstance().removeEventObserver(this.signoutObserver);
    this.options.removeChangeObserver(this.optionsObserver);
    clearInterval(this.syncTimer);
  }

  _handleAppStateChange = (nextAppState) => {
    // we only want to perform sync here if the app is resuming, not if it's a fresh start
    if(this.dataLoaded && nextAppState === 'active') {
      Sync.getInstance().sync();
    }
  }

  beginSyncTimer() {
    // Refresh every 30s
    this.syncTimer = setInterval(function () {
      Sync.getInstance().sync(null);
    }, 30000);
  }

  registerObservers() {
    AppState.addEventListener('change', this._handleAppStateChange);

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
    var encryptionEnabled = KeysManager.get().encryptionEnabled();
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
    if(!this.dataLoaded) {
      return;
    }
    super.configureNavBar();

    var options = this.options;

    var notesTitle = "Notes";
    var filterTitle = "Filter";
    var numTags = options.selectedTags.length;

    if(numTags > 0 || options.archivedOnly) {
      if(numTags > 0) {
        filterTitle += ` (${numTags})`
      }
      notesTitle = options.archivedOnly ? "Archived Notes" : "Filtered Notes";
    }

    console.log("Configuring with options", options);

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
        } else {
          // Although RNN is supposed to open this automatically, it doesn't sometimes. So this is to force it.
          this.props.navigator.toggleDrawer({
            side: 'left', // the side of the drawer since you can have two, 'left' / 'right'
            animated: true, // does the toggle have transition animation or does it happen immediately (optional)
            to: 'open' // optional, 'open' = open the drawer, 'closed' = close it, missing = the opposite of current state
          });
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
    if(!this.state.ready || this.state.lockContent) {
      console.log("Rendering Locked Notes Content");
      return (<View></View>);
    }
    var notes = ModelManager.getInstance().getNotes(this.options);

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
          />
        }
      </View>
    );
  }
}
