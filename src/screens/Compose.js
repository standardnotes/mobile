import React, { Component } from 'react';
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import ModelManager from '../lib/modelManager'
import Note from '../models/app/note'
import Abstract from "./Abstract"
import Icons from '../Icons';
var dismissKeyboard = require('dismissKeyboard');
var _ = require('lodash');

import TextView from "sn-textview";

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
  KeyboardAvoidingView,
  Platform
} from 'react-native';

import GlobalStyles from "../Styles"

export default class Compose extends Abstract {

  static navigatorStyle = {
    tabBarHidden: true
  };

  constructor(props) {
    super(props);
    this.state = {};
    var note = ModelManager.getInstance().findItem(this.props.noteId);
    if(!note) {
      note = new Note({});
      note.dummy = true;
    }

    this.note = note;

    this.loadStyles();

    this.syncObserver = Sync.getInstance().registerSyncObserver(function(changesMade){
      if(changesMade) {
        this.forceUpdate();
      }
    }.bind(this))
  }

  onContentSizeChange = (c) => {
    // This function must not be deleted. This is called by TextInput on onContentSizeChange
    // It for some reason makes it so that TextInput starts at the top and not the bottom for a long note
  }

  componentWillMount () {
    super.componentWillMount();
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);
  }

  _keyboardDidShow = () => {
    this.mergeState({keyboard: true})
  }

  _keyboardDidHide = () => {
    this.mergeState({keyboard: false})
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
    Sync.getInstance().removeSyncObserver(this.syncObserver);
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
      // buttonColor: GlobalStyles.constants().mainTintColor,
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

    this.props.navigator.setStyle({
      navBarSubtitleColor: GlobalStyles.constants().plainCellBorderColor,
      navBarSubtitleFontSize: 12
    });
  }

  onTextFocus = () => {
    // in order to call blur() later, we need to focus here manually, even though it does nothing
    // this.refs.input.focus();
    this.isFocused = true;
  }

  onTextBlur = () =>  {
    this.isFocused = false;
  }

  render() {
    if(this.state.lockContent) {
      return (<View></View>);
    }

    var textBottomPadding = 10;
    var keyboardBehavior = Platform.OS == "android" ? "height" : "padding";
    var keyboardOffset = this.rawStyles.noteTitle.height + this.rawStyles.noteText.paddingTop + (Platform.OS == "android" ? 15 : 0);

    return (
      <View style={[this.styles.container, GlobalStyles.styles().container]}>
        <TextInput
          style={this.styles.noteTitle}
          onChangeText={this.onTitleChange}
          value={this.note.title}
          placeholder={"Add Title"}
          selectionColor={GlobalStyles.constants().mainTintColor}
          underlineColorAndroid={'transparent'}
          placeholderTextColor={GlobalStyles.constants().mainDimColor}
        />

        {Platform.OS == "android" &&
          <View style={this.styles.noteTextContainer}>
            <TextView style={this.styles.noteText} autoFocus={this.note.dummy} text={this.note.text} onChangeText={this.onTextChange}/>
          </View>
        }

        {Platform.OS == "ios" &&
          <KeyboardAvoidingView style={[this.styles.textContainer]} keyboardVerticalOffset={keyboardOffset} behavior={keyboardBehavior}>
              <TextInput
                  style={[this.styles.noteText, {paddingBottom: textBottomPadding}]}
                  onChangeText={this.onTextChange}
                  multiline={true}
                  autoFocus={this.note.dummy}
                  value={this.note.text}
                  ref={'input'}
                  onFocus={this.onTextFocus}
                  onBlur={this.onTextBlur}
                  selectionColor={GlobalStyles.constants().mainTintColor}
                  underlineColorAndroid={'transparent'}
                  keyboardDismissMode={'interactive'}
                  textAlignVertical={'top'}
                  textAlign={'left'}
                  onScroll={() => {}}
                  onContentSizeChange={this.onContentSizeChange}
                  autoCapitalize={'sentences'}
                />

              </KeyboardAvoidingView>
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
      },

      noteText: {
        flexGrow: 1,
        // fontSize: 17,
        marginTop: 0,
        paddingTop: 10,
        // color: GlobalStyles.constants().mainTextColor,
        paddingLeft: GlobalStyles.constants().paddingLeft,
        paddingRight: GlobalStyles.constants().paddingLeft,
        // textAlignVertical: 'top',
        // lineHeight: 22,
      }
    }

    this.styles = StyleSheet.create(this.rawStyles);

  }
}
