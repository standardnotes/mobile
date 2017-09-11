import React, { Component } from 'react';
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import ModelManager from '../lib/modelManager'
import Note from '../models/app/note'
import Abstract from "./Abstract"

import {
  AppRegistry,
  StyleSheet,
  TextInput,
  View,
  FlatList,
  TouchableHighlight,
  ScrollView,
  Text,
  Keyboard,
  KeyboardAvoidingView
} from 'react-native';

import {Platform} from 'react-native';

import GlobalStyles from "../Styles"

export default class Compose extends Abstract {

  static navigatorStyle = {
    tabBarHidden: true
  };

  constructor(props) {
    super(props);
    var note = ModelManager.getInstance().findItem(this.props.noteId);
    if(!note) {
      note = new Note({});
      note.dummy = true;
    }
    this.state = {note: note, text: note.text};
    this.configureNavBar();
    this.loadStyles();

    this.syncObserver = Sync.getInstance().registerSyncObserver(function(changesMade){
      if(changesMade) {
        this.forceUpdate();
      }
    }.bind(this))
  }

  componentWillUnmount() {
    Sync.getInstance().removeSyncObserver(this.syncObserver);
  }

  configureNavBar() {
    super.configureNavBar();

    var title = "Options";
    if(this.state.note.tags.length > 0) {
      title += ` (${this.state.note.tags.length})`;
    }

    this.props.navigator.setButtons({
      rightButtons: [
        {
          title: title,
          id: 'tags',
          showAsAction: 'ifRoom',
          buttonColor: GlobalStyles.constants().mainTintColor,
        },
      ],
      animated: false
    });
  }

  onNavigatorEvent(event) {
    super.onNavigatorEvent(event);

    if(event.id == 'didAppear') {
        if(this.state.note.dirty) {
          this.changesMade();
          this.configureNavBar();
        }
    }
    if (event.type == 'NavBarButtonPress') {
      if (event.id == 'tags') {
        this.showTags();
      }
    }
  }

  showTags() {
    this.props.navigator.push({
      screen: 'sn.Filter',
      title: 'Options',
      animationType: 'slide-up',
      passProps: {
        noteId: this.state.note.uuid,
        options: {selectedTags: this.state.note.tags.map(function(tag){return tag.uuid})},
        onOptionsChange: (options) => {
          var tags = ModelManager.getInstance().getItemsWithIds(options.selectedTags);
          this.state.note.replaceTags(tags);
          this.state.note.setDirty(true);
        }
      }
    });
  }

  onTitleChange = (text) => {
    this.setState({title: text});
    this.state.note.title = text;
    this.changesMade();
  }

  onTextChange = (text) => {
    this.setState({text: text});
    this.state.note.text = text;
    this.changesMade();
  }

  changesMade() {
    this.state.note.hasChanges = true;

    if(this.saveTimeout) clearTimeout(this.saveTimeout);
    if(this.statusTimeout) clearTimeout(this.statusTimeout);
    this.saveTimeout = setTimeout(function(){
      this.setNavBarSubtitle("Saving...");
      if(!this.state.note.uuid) {
        this.state.note.init(function(){
          this.save();
        }.bind(this))
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
    var note = this.state.note;
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

    this.props.navigator.setStyle({
      navBarSubtitleColor: 'gray',
      navBarSubtitleFontSize: 12
    });
  }

  render() {
    return (
      <View style={[this.styles.container, GlobalStyles.styles().container]}>
        <TextInput
          style={this.styles.noteTitle}
          onChangeText={this.onTitleChange}
          value={this.state.note.title}
          placeholder={"Add Title"}
          selectionColor={"red"}
          underlineColorAndroid={'transparent'}
        />

        <KeyboardAvoidingView style={{flexGrow: 1}} keyboardVerticalOffset={this.rawStyles.noteTitle.height + this.rawStyles.noteText.paddingTop} behavior={'padding'}>
          <ScrollView style={this.styles.textContainer} contentContainerStyle={this.styles.contentContainer} keyboardDismissMode={'interactive'}>
            <TextInput
                style={this.styles.noteText}
                onChangeText={this.onTextChange}
                multiline = {true}
                value={this.state.note.text}
                autoFocus={!this.state.note.uuid}
                selectionColor={"red"}
                underlineColorAndroid={'transparent'}
                keyboardDismissMode={'interactive'}
              >
              </TextInput>
            </ScrollView>
          </KeyboardAvoidingView>

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
        flexGrow: 1
      },

      noteText: {
        height: "100%",
        flexGrow: 1,
        fontSize: 17,
        marginTop: 0,
        paddingTop: 10,
        paddingBottom: 10,
        color: GlobalStyles.constants().mainTextColor,
        paddingLeft: GlobalStyles.constants().paddingLeft,
        paddingRight: GlobalStyles.constants().paddingLeft,
        textAlignVertical: 'top',
        paddingVertical: 0,
        lineHeight: 22,
      }
    }

    this.styles = StyleSheet.create(this.rawStyles);

  }
}
