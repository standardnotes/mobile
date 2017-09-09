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

export default class Notes extends Component {

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

    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
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

  configureNavBar() {
    var notesTitle = "Notes";
    var filterTitle = "Filter";
    var numFilters = this.options.selectedTags.length;
    if(numFilters > 0 || this.options.archivedOnly) {
      filterTitle += ` (${numFilters})`
      notesTitle = "Filtered Notes";
    }
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

    switch(event.id) {
      case 'willAppear':
       this.activeScreen = true;
       this.forceUpdate();
       this.configureNavBar();
       if(this.needsLoadNotes) {
         this.needsLoadNotes = false;
         this.loadNotes();
       }
       break;
      case 'didAppear':
        break;
      case 'willDisappear':
        this.activeScreen = false;
        break;
      case 'didDisappear':
        break;
      }

    if (event.type == 'NavBarButtonPress') {
      if (event.id == 'new') {
        this.presentNewComposer();
      }
      else if (event.id == 'sideMenu') {
        this.presentNewComposer();
      }
    }
  }

  presentNewComposer() {
    this.props.navigator.push({
      screen: 'sn.Compose',
      title: 'Compose',
    });
  }

  this.presentFilterScreen() {
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


  loadNotes = (reloadNavBar = true) => {
    if(!this.activeScreen) {
      this.needsLoadNotes = true;
      return;
    }

    console.log("===Load Notes===");

    this.notes = ModelManager.getInstance().getNotes(this.options);

    this.reloadList();
    // this function may be triggled asyncrounsly even when on a different screen
    // we dont want to update the nav bar unless we are the present screen
    if(reloadNavBar && this.activeScreen) {
      this.configureNavBar();
    }
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
          <NoteList onRefresh={this._onRefresh.bind(this)} onPressItem={this._onPressItem} refreshing={this.state.refreshing} notes={this.notes} />
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
