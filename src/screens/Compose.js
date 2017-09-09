import React, { Component } from 'react';
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import ModelManager from '../lib/modelManager'
import Note from '../models/app/note'

import {
  AppRegistry,
  StyleSheet,
  StatusBar,
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

export default class Compose extends Component {

  static navigatorStyle = {
    tabBarHidden: true
  };

  constructor(props) {
    super(props);
    this.note = ModelManager.getInstance().findItem(this.props.noteId);
    if(!this.note) {
      this.note = new Note({});
      this.note.dummy = true;
    }
    this.state = {title: this.note.title, text: this.note.text};
    this.configureNavBar();
  }

  configureNavBar() {
    var title = "Options";
    if(this.note.tags.length > 0) {
      title += ` (${this.note.tags.length})`;
    }
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
    this.props.navigator.setButtons({
      rightButtons: [
        {
          title: title,
          id: 'tags',
          showAsAction: 'ifRoom',
          buttonColor: GlobalStyles.constants.mainTintColor,
        },
      ],
      animated: false
    });
  }

  onNavigatorEvent(event) {
    if(event.id == 'didAppear') {
        if(this.note.dirty) {
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
        noteId: this.note.uuid,
        options: {selectedTags: this.note.tags.map(function(tag){return tag.uuid})},
        onOptionsChange: (options) => {
          var tags = ModelManager.getInstance().getItemsWithIds(options.selectedTags);
          this.note.replaceTags(tags);
          this.note.setDirty(true);
        }
      }
    });
  }

  onTitleChange = (text) => {
    this.setState({title: text});
    this.note.title = text;
    this.changesMade();
  }

  onTextChange = (text) => {
    this.setState({text: text});
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
        this.note.init(function(){
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
    this.props.navigator.setSubTitle({
      subtitle: title
    });
    this.props.navigator.setStyle({
      navBarSubtitleColor: 'gray',
      navBarSubtitleFontSize: 12
    })
  }

  render() {
    console.log("ehe", styles.noteTitle.height);
    return (
      <View style={styles.container}>
        <TextInput
          style={styles.noteTitle}
          onChangeText={this.onTitleChange}
          value={this.state.title}
          placeholder={"Add Title"}
          selectionColor={"red"}
          underlineColorAndroid={'transparent'}
        />

        <KeyboardAvoidingView style={{flexGrow: 1}} keyboardVerticalOffset={rawStyles.noteTitle.height + rawStyles.noteText.paddingTop} behavior={'padding'}>
        <ScrollView style={styles.textContainer} contentContainerStyle={styles.contentContainer} keyboardDismissMode={'interactive'}>
          <TextInput
              style={styles.noteText}
              onChangeText={this.onTextChange}
              multiline = {true}
              value={this.note.text}
              autoFocus={!this.note.uuid}
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
}

let PaddingLeft = 14;

const rawStyles = {
  container: {
    flex: 1,
    backgroundColor: 'white',
    flexDirection: 'column',
    height: "100%",
  },

  noteTitle: {
    fontWeight: "600",
    fontSize: 16,
    color: "black",
    height: 50,
    borderBottomColor: "#F5F5F5",
    borderBottomWidth: 1,
    paddingTop: Platform.OS === "ios" ? 5 : 12,
    paddingLeft: PaddingLeft,
    paddingRight: PaddingLeft,
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
    color: "black",
    paddingLeft: PaddingLeft,
    paddingRight: PaddingLeft,
    textAlignVertical: 'top',
    paddingVertical: 0,
    lineHeight: 22,
  },
}

const styles = StyleSheet.create(rawStyles);
