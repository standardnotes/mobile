import React, { Component } from 'react';
import { StyleSheet, View, Platform, Text, AppState } from 'react-native';
import ModelManager from '../lib/modelManager'
import Storage from '../lib/storage'
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import KeysManager from '../lib/keysManager'
import GlobalStyles from "../Styles"
import Keychain from "../lib/keychain"
import {iconsMap, iconsLoaded} from '../Icons';
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
    Auth.getInstance().removeSignoutObserver(this.signoutObserver);
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
        this.setState({refreshing: false});
      }
    }.bind(this))

    this.signoutObserver = Auth.getInstance().addSignoutObserver(function(){
      this.options = this.defaultOptions();
      this.reloadList();
    }.bind(this));
  }

  loadTabbarIcons() {
    iconsLoaded.then(() => {
      this.props.navigator.setTabButton({
        tabIndex: 0,
        icon: iconsMap['ios-menu-outline']
      });
      this.props.navigator.setTabButton({
        tabIndex: 1,
        icon: iconsMap['ios-contact-outline']
      });
    })
  }

  initializeOptionsAndNotes() {
    Promise.all([
      Storage.getItem("options").then(function(result){
        this.options = JSON.parse(result) || this.defaultOptions();
      }.bind(this)),
    ]).then(function(){
      // options and keys loaded
      console.log("===Keys and options loaded===");

      var run = function() {
        var encryptionEnabled = KeysManager.get().encryptionEnabled();
        console.log("Encryption enabled:", encryptionEnabled);
        this.mergeState({decrypting: encryptionEnabled, loading: !encryptionEnabled})

        Sync.getInstance().loadLocalItems(function(items) {
          this.reloadList();
          this.setState(function(prevState){
            return _.merge(prevState, {decrypting: false, loading: false});
          })
        }.bind(this));

        // perform initial sync
        Sync.getInstance().sync(null);
      }.bind(this)

      if(KeysManager.get().hasOfflinePasscode()) {
        this.presentPasscodeAuther(run);
      } else {
        run();
      }
    }.bind(this))
  }

  presentPasscodeAuther(onAuthenticate) {
    this.props.navigator.showModal({
      screen: 'sn.Authenticate',
      title: 'Passcode Required',
      animationType: 'slide-up',
      backButtonHidden: true,
      overrideBackPress: true,
      passProps: {
        mode: "authenticate",
        onAuthenticateSuccess: onAuthenticate
      }
    });
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
        collapsedIcon: iconsMap['md-add'],
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
    this.mergeState({refreshing: false})

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
    this.props.navigator.push({
      screen: 'sn.Compose',
      title: 'Compose',
      passProps: {noteId: item.uuid}
    });
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
