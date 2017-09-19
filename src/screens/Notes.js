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
      if(this.mounted) {
        this.loadInitialState();
      }
    })
  }

  loadInitialState() {
    this.mergeState({
      ready: true,
      refreshing: false,
      decrypting: false,
      loading: true
    });
    this.options = App.get().globalOptions();
    this.registerObservers();
    this.loadTabbarIcons();
    this.initializeNotes();
    this.beginSyncTimer();

    super.loadInitialState();
  }

  componentDidMount() {
    if(!this.state.ready) {
      this.loadInitialState();
    }
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange);
    App.get().removeApplicationReadyObserver(this.readyObserver);
    Sync.getInstance().removeSyncObserver(this.syncObserver);
    Auth.getInstance().removeEventObserver(this.signoutObserver);
    this.options.removeChangeObserver(this.optionsObserver);
    clearInterval(this.syncTimer);
  }


  _handleAppStateChange = (nextAppState) => {
    if ( nextAppState === 'active') {
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
      if(Platform.OS == "android") {
        this.configureNavBar();
      }
    })

    this.syncObserver = Sync.getInstance().registerSyncObserver(function(changesMade){
      if(changesMade) {
        console.log("===Changes Made===");
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
        this.reloadList();
        this.mergeState({decrypting: false, loading: false});
      }.bind(this), 0);
    }.bind(this));

    // perform initial sync
    Sync.getInstance().sync(null);
  }

  configureNavBar(initial = false) {
    super.configureNavBar();

    var options = this.options;

    var notesTitle = "Notes";
    var filterTitle = "Filter";
    var numFilters = options.selectedTags.length;

    if(numFilters > 0 || options.archivedOnly) {
      if(numFilters > 0) {
        filterTitle += ` (${numFilters})`
      }
      notesTitle = options.archivedOnly ? "Archived Notes" : "Filtered Notes";
    }

    if(notesTitle === this.notesTitle && filterTitle === this.filterTitle) {
      // no changes, return. We do this so when swiping back from compose to here,
      // we don't change the title while a transition is taking place
      return;
    }

    this.notesTitle = notesTitle;
    this.filterTitle = filterTitle;

    this.props.navigator.setTitle({title: notesTitle, animated: false});

    if(!initial) {
      return;
    }

    var rightButtons = [];
    if(Platform.OS == "ios") {
      rightButtons.push({
        title: 'New',
        id: 'new',
        showAsAction: 'ifRoom',
        buttonColor: GlobalStyles.constants().mainTintColor,
      })
    }

    this.props.navigator.setButtons({
      rightButtons: rightButtons,
      leftButtons: [
        {
          title: filterTitle,
          id: 'sideMenu',
          showAsAction: 'ifRoom',
          buttonColor: GlobalStyles.constants().mainTintColor,
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
      }
      else if (event.id == 'sideMenu') {
        // Android is handled by the drawer attribute of rn-navigation
        if(Platform.OS == "ios") {
          this.presentFilterScreen();
        }
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
        passProps: {noteId: item.uuid}
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
    this.options.setSearchTerm(text);
  }

  onSearchCancel = () => {
    this.options.setSearchTerm(null);
  }

  render() {
    if(!this.state.ready) {
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
