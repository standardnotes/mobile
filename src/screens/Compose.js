import React, { Component } from 'react';
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import ModelManager from '../lib/modelManager'
import Note from '../models/app/note'
import Abstract from "./Abstract"
import Icons from '../Icons';
import App from '../app'
var _ = require('lodash');

import TextView from "sn-textview";

import {
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';

import GlobalStyles from "../Styles"

export default class Compose extends Abstract {

  static navigatorStyle = {
    tabBarHidden: true
  };

  constructor(props) {
    super(props);
    var note = ModelManager.getInstance().findItem(props.noteId);
    if(!note) {
      note = new Note({});
      note.dummy = true;
    }

    this.note = note;
    this.state = {title: note.title, text: note.text};

    this.loadStyles();

    this.syncObserver = Sync.getInstance().registerSyncObserver((changesMade, retreived, saved) => {
      if(retreived && this.note.uuid && retreived.map((i) => i.uuid).includes(this.note.uuid)) {
        this.mergeState({title: this.note.title, text: this.note.text});
      }
    });
  }

  componentWillMount () {
    super.componentWillMount();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    Sync.getInstance().removeSyncObserver(this.syncObserver);
  }

  viewDidAppear() {
    super.viewDidAppear();

    // Autofocus doesn't work properly on iOS due to navigation push, so we'll focus manually
    if(App.isIOS) {
      if(this.note.dummy) {
        this.input.focus();
      }
    }
  }

  configureNavBar(initial) {
    super.configureNavBar();

    // Only edit the nav bar once, it wont be changed
    if(!initial) {
      return;
    }

    var tagButton = {
      title: "Manage",
      id: 'tags',
      showAsAction: 'ifRoom',
    }

    if(Platform.OS === "android") {
      tagButton.icon = Icons.getIcon("md-more");
    }

    this.props.navigator.setButtons({
      rightButtons: [tagButton],
      animated: false
    });
  }

  onNavigatorEvent(event) {
    super.onNavigatorEvent(event);

    if(event.id == 'didAppear') {
      if(this.note.dummy) {
        if(this.refs.input) {
          this.refs.input.focus();
        }
      }
    } else if(event.id == "willAppear") {
      if(this.note.dirty) {
        // We want the "Saving..." / "All changes saved..." subtitle to be visible to the user, so we delay
        setTimeout(() => {
          this.changesMade();
        }, 300);
      }
    }
    if (event.type == 'NavBarButtonPress') {
      if (event.id == 'tags') {
        this.showOptions();
      }
    }
  }

  showOptions() {

    this.input.blur();
    this.previousOptions = {selectedTags: this.note.tags.map(function(tag){return tag.uuid})};
    this.props.navigator.push({
      screen: 'sn.Filter',
      title: 'Options',
      animationType: 'slide-up',
      passProps: {
        noteId: this.note.uuid,
        singleSelectMode: false,
        options: JSON.stringify(this.previousOptions),
        onOptionsChange: (options) => {
          if(!_.isEqual(options.selectedTags, this.previousOptions.selectedTags)) {
            var tags = ModelManager.getInstance().getItemsWithIds(options.selectedTags);
            this.note.replaceTags(tags);
            this.note.setDirty(true);
            this.changesMade();
          }
        }
      }
    });
  }

  onTitleChange = (text) => {
    this.note.title = text;
    this.changesMade();
  }

  onTextChange = (text) => {
    this.note.text = text;
    this.changesMade();
  }

  changesMade() {
    this.note.hasChanges = true;

    if(this.saveTimeout) clearTimeout(this.saveTimeout);
    if(this.statusTimeout) clearTimeout(this.statusTimeout);
    this.saveTimeout = setTimeout(function(){
      this.setNavBarSubtitle("Saving...");
      if(!this.note.uuid) {
        this.note.initUUID().then(function(){
          this.save();
        }.bind(this));
      } else {
        this.save();
      }
    }.bind(this), 275)
  }

  sync(note, callback) {
    note.setDirty(true);

    Sync.getInstance().sync(function(response){
      if(response && response.error) {
        if(!this.didShowErrorAlert) {
          this.didShowErrorAlert = true;
          // alert("There was an error saving your note. Please try again.");
        }
        if(callback) {
          callback(false);
        }
      } else {
        note.hasChanges = false;
        if(callback) {
          callback(true);
        }
      }
    }.bind(this))
  }

  save() {
    var note = this.note;
    if(note.dummy) {
      note.dummy = false;
      ModelManager.getInstance().addItem(note);
    }
    this.sync(note, function(success){
      if(success) {
        if(this.statusTimeout) clearTimeout(this.statusTimeout);
        this.statusTimeout = setTimeout(function(){
          var status = "All changes saved"
          if(Auth.getInstance().offline()) {
            status += " (offline)";
          }
          this.saveError = false;
          this.syncTakingTooLong = false;
          this.noteStatus = this.setNavBarSubtitle(status);
        }.bind(this), 200)
      } else {
        if(this.statusTimeout) clearTimeout(this.statusTimeout);
        this.statusTimeout = setTimeout(function(){
          this.saveError = true;
          this.syncTakingTooLong = false;
          this.setNavBarSubtitle("Error syncing (changes saved offline)");
        }.bind(this), 200)
      }
    }.bind(this));
  }

  setNavBarSubtitle(title) {
    if(!this.visible || !this.willBeVisible) {
      return;
    }

    this.props.navigator.setSubTitle({
      subtitle: title
    });

    var color = GlobalStyles.constantForKey(App.isIOS ? "mainTextColor" : "navBarTextColor");
    this.props.navigator.setStyle({
      navBarSubtitleColor: GlobalStyles.hexToRGBA(color, 0.5),
      navBarSubtitleFontSize: 12
    });
  }

  render() {
    if(this.state.lockContent) {
      return (<View></View>);
    }

    return (
      <View style={[this.styles.container, GlobalStyles.styles().container]}>
        <TextInput
          style={this.styles.noteTitle}
          onChangeText={this.onTitleChange}
          value={this.state.title}
          placeholder={"Add Title"}
          selectionColor={GlobalStyles.constants().mainTintColor}
          underlineColorAndroid={'transparent'}
          placeholderTextColor={GlobalStyles.constants().mainDimColor}
        />

        {Platform.OS == "android" &&
          <View style={this.styles.noteTextContainer}>
            <TextView style={[GlobalStyles.stylesForKey("noteText")]}
              ref={(ref) => this.input = ref}
              autoFocus={this.note.dummy}
              value={this.note.text}
              selectionColor={GlobalStyles.lighten(GlobalStyles.constants().mainTintColor)}
              onChangeText={this.onTextChange}
            />
          </View>
        }

        {Platform.OS == "ios" &&

          <TextView style={[...GlobalStyles.stylesForKey("noteText"), {paddingBottom: 10}]}
            ref={(ref) => this.input = ref}
            autoFocus={false}
            value={this.note.text}
            keyboardDismissMode={'interactive'}
            selectionColor={GlobalStyles.lighten(GlobalStyles.constants().mainTintColor)}
            onChangeText={this.onTextChange}
          />

        }
      </View>
    );
  }

  loadStyles() {
    this.rawStyles = {
      container: {
        flex: 1,
        flexDirection: 'column',
        height: "100%",
      },

      noteTitle: {
        fontWeight: "600",
        fontSize: 16,
        color: GlobalStyles.constants().mainTextColor,
        height: 50,
        borderBottomColor: GlobalStyles.constants().composeBorderColor,
        borderBottomWidth: 1,
        paddingTop: Platform.OS === "ios" ? 5 : 12,
        paddingLeft: GlobalStyles.constants().paddingLeft,
        paddingRight: GlobalStyles.constants().paddingLeft,
      },

      textContainer: {
        flexGrow: 1,
        flex: 1,
      },

      contentContainer: {
        flexGrow: 1,
      },

      noteTextContainer: {
        flexGrow: 1,
        flex: 1,
      },
    }

    this.styles = StyleSheet.create(this.rawStyles);

  }
}
