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
  TouchableHighlight
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
      this.save();
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
    console.log("setting subtitle", title);
    this.props.navigator.setSubTitle({
      subtitle: title
    });
    this.props.navigator.setStyle({
      navBarSubtitleColor: 'gray',
      navBarSubtitleFontSize: 12
    })
  }

  render() {
    return (
      <View style={styles.container}>
        <TextInput
          style={styles.noteTitle}
          onChangeText={this.onTitleChange}
          value={this.state.title}
          placeholder={"Add Title"}
          selectionColor={"red"}
          underlineColorAndroid='transparent'
        />

        <TextInput
            style={styles.noteText}
            onChangeText={this.onTextChange}
            multiline = {true}
            value={this.note.text}
            autoFocus={true}
            selectionColor={"red"}
            underlineColorAndroid='transparent'
          />
      </View>
    );
  }
}

let PaddingLeft = 14;

const styles = StyleSheet.create({
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
    paddingLeft: PaddingLeft
  },

  noteText: {
    fontSize: 16,
    marginTop: 0,
    paddingTop: 10,
    color: "black",
    paddingLeft: PaddingLeft,
    flexGrow: 1,
    textAlignVertical: 'top'
  },


});
