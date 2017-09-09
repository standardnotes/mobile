import React, { Component } from 'react';
import { StyleSheet, View, Platform, Text } from 'react-native';
import ModelManager from '../lib/modelManager'
import Storage from '../lib/storage'
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import GlobalStyles from "../Styles"
import Keychain from "../lib/keychain"
import {iconsMap, iconsLoaded} from '../Icons';
import NoteList from "../containers/NoteList"
import Abstract from "./Abstract"

export default class Notes extends Abstract {

  defaultOptions() {
    return {selectedTags: [], sortBy: "created_at"};
  }

  constructor(props) {
    super(props);
    this.state = {date: Date.now(), refreshing: false};
    this.options = this.defaultOptions();
    this.registerObservers();
    this.configureNavBar();
    this.loadTabbarIcons();
    this.initializeOptionsAndNotes();
    this.beginSyncTimer();
  }

  beginSyncTimer() {
    // Refresh every 30s
    setInterval(function () {
      // Sync.getInstance().sync(null);
    }, 30000);
  }

  registerObservers() {
    Sync.getInstance().registerSyncObserver(function(changesMade){
      if(changesMade) {
        console.log("===Changes Made===");
        this.loadNotes();
      } else {
        this.setState({refreshing: false});
      }
    }.bind(this))

    Auth.getInstance().onSignOut(function(){
      this.options = this.defaultOptions();
      this.loadNotes();
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
      Auth.getInstance().loadKeys()
    ]).then(function(){
      console.log("===Keys and options loaded===");
      // options and keys loaded
      Sync.getInstance().loadLocalItems(function(items) {
        this.loadNotes();
      }.bind(this));
      // perform initial sync
      Sync.getInstance().sync(null);
    }.bind(this))
  }

  loadNotes = (reloadNavBar = true) => {
    if(!this.visible && !this.willBeVisible) {
      console.log("===Scheduling Load Notes===");
      this.loadNotesOnVisible = true;
      return;
    }

    console.log("===Load Notes===");

    this.notes = ModelManager.getInstance().getNotes(this.options);

    this.reloadList();
    // this function may be triggled asyncrounsly even when on a different screen
    // we dont want to update the nav bar unless we are the present screen
    if(reloadNavBar && this.visible) {
      this.configureNavBar();
    }
  }

  configureNavBar() {
    super.configureNavBar();

    var notesTitle = "Notes";
    var filterTitle = "Filter";
    var numFilters = this.options.selectedTags.length;
    if(numFilters > 0 || this.options.archivedOnly) {
      filterTitle += ` (${numFilters})`
      notesTitle = "Filtered Notes";
    }

    if(notesTitle === this.notesTitle || filterTitle === this.filterTitle) {
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
        buttonColor: GlobalStyles.constants.mainTintColor,
      })
    }

    this.props.navigator.setButtons({
      rightButtons: rightButtons,
      leftButtons: [
        {
          title: filterTitle,
          id: 'sideMenu',
          showAsAction: 'ifRoom',
          buttonColor: GlobalStyles.constants.mainTintColor,
        },
      ],
      fab: {
        collapsedId: 'new',
        collapsedIcon: iconsMap['md-add'],
        backgroundColor: GlobalStyles.constants.mainTintColor
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
        this.loadNotes();
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
        options: this.options,
        onOptionsChange: (options) => {
          this.setOptions(options);
        }
      }
    });
  }

  reloadList() {
    this.setState((prevState, props) => {
      return {date: Date.now(), refreshing: false};
    });
  }

  setOptions(options) {
    this.options = options;
    Storage.setItem("options", JSON.stringify(options));
    this.loadNotes();
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
    this.options.searchTerm = text;
    this.loadNotes(false);
  }

  onSearchCancel = () => {
    this.options.searchTerm = null;
    this.loadNotes(false);
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.decryptNoticeContainer}>
          <Text style={styles.decryptNotice}>Decrypting notes...</Text>
        </View>
        {this.notes &&
          <NoteList
            onRefresh={this._onRefresh.bind(this)}
            onPressItem={this._onPressItem}
            refreshing={this.state.refreshing}
            onSearchChange={this.onSearchTextChange}
            onSearchCancel={this.onSearchCancel}
            notes={this.notes}
          />
        }
      </View>
    );
  }
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: 'white',
  },

  decryptNoticeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },

  decryptNotice: {
    position: "absolute",
    opacity: 0.5
  }
});
