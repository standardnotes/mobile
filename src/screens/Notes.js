import React, { Component } from 'react';
import { StyleSheet, View, Platform, Text, AppState } from 'react-native';
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
var _ = require('lodash')

export default class Notes extends Abstract {

  defaultOptions() {
    return {selectedTags: [], sortBy: "created_at"};
  }

  constructor(props) {
    super(props);
    this.state = {
      refreshing: false,
      decrypting: false,
      loading: true
    };
    this.options = this.defaultOptions();
    this.registerObservers();
    this.configureNavBar();
    this.loadTabbarIcons();
    this.initializeOptionsAndNotes();
    this.beginSyncTimer();
    KeysManager.get().registerAccountRelatedStorageKeys(["options"]);
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange);
    Sync.getInstance().removeSyncObserver(this.syncObserver);
    Auth.getInstance().removeEventObserver(this.signoutObserver);
    clearInterval(this.syncTimer);
  }

  componentDidMount() {
    AppState.addEventListener('change', this._handleAppStateChange);
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
    this.syncObserver = Sync.getInstance().registerSyncObserver(function(changesMade){
      if(changesMade) {
        console.log("===Changes Made===");
        this.reloadList();
      } else {
        this.mergeState({refreshing: false, loading: false});
      }
    }.bind(this))

    this.signoutObserver = Auth.getInstance().addEventObserver([Auth.DidSignOutEvent, Auth.WillSignInEvent], function(event){
      if(event == Auth.DidSignOutEvent) {
        this.options = this.defaultOptions();
        this.reloadList();
      } else if(event == Auth.WillSignInEvent) {
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

  initializeOptionsAndNotes() {
    Promise.all([
      Storage.getItem("options").then(function(result){
        this.options = JSON.parse(result) || this.defaultOptions();
      }.bind(this)),
    ]).then(function(){
      // options and keys loaded
      console.log("===Keys and options loaded===");
      var encryptionEnabled = KeysManager.get().encryptionEnabled();
      console.log("Encryption enabled:", encryptionEnabled);
      this.mergeState({decrypting: encryptionEnabled, loading: !encryptionEnabled})

      Sync.getInstance().loadLocalItems(function(items) {
        setTimeout(function () {
          this.reloadList();
          this.mergeState({decrypting: false, loading: false});
        }.bind(this), 0);
      }.bind(this));

      // perform initial sync
      Sync.getInstance().sync(null);
    }.bind(this))
  }

  configureNavBar() {
    super.configureNavBar();

    var notesTitle = "Notes";
    var filterTitle = "Filter";
    var numFilters = this.options.selectedTags.length;

    if(numFilters > 0 || this.options.archivedOnly) {
      if(numFilters > 0) {
        filterTitle += ` (${numFilters})`
      }
      notesTitle = "Filtered Notes";
    }

    if(notesTitle === this.notesTitle && filterTitle === this.filterTitle) {
      // no changes, return. We do this so when swiping back from compose to here,
      // we don't change the title while a transition is taking place
      return;
    }

    this.notesTitle = notesTitle;
    this.filterTitle = filterTitle;

    this.props.navigator.setTitle({title: notesTitle, animated: false});

    var rightButtons = [];
    if(Platform.OS == "ios") {
      rightButtons.push({
        title: 'New',
        id: 'new',
        showAsAction: 'ifRoom',
        buttonColor: GlobalStyles.constants().mainTintColor,
      })
    }

    console.log("Icon", Icons.getIcon('md-add'));

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
        this.presentFilterScreen();
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
        options: _.cloneDeep(this.options),
        onOptionsChange: (options) => {
          this.setOptions(_.cloneDeep(options));
        }
      }
    });
  }

  reloadList(reloadNavBar = true) {
    if(!this.visible && !this.willBeVisible) {
      console.log("===Scheduling Notes Render Update===");
      this.loadNotesOnVisible = true;
      return;
    }

    console.log("===Reload Notes List===");

    this.forceUpdate();
    this.mergeState({refreshing: false, loading: false})

    // this function may be triggled asyncrounsly even when on a different screen
    // we dont want to update the nav bar unless we are the present screen
    if(reloadNavBar && this.visible) {
      this.configureNavBar();
    }
  }

  setOptions(options) {
    this.options = options;
    Storage.setItem("options", JSON.stringify(options));
    this.reloadList();
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
    this.options = _.merge(this.options, {searchTerm: text});
    this.reloadList(false);
  }

  onSearchCancel = () => {
    this.options = _.merge(this.options, {searchTerm: null});
    this.reloadList(false);
  }

  render() {
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
            decrypting={this.state.decrypting}
            loading={this.state.loading}
          />
        }

      </View>
    );
  }
}
