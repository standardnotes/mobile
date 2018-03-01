import React, { Component } from 'react';
import Auth from '../lib/auth'
import Crypto from '../lib/crypto'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";
import Abstract from "./Abstract"
import Storage from '../lib/storage'
import GlobalStyles from "../Styles"
var _ = require('lodash')

import {
  TextInput,
  SectionList,
  ScrollView,
  View,
  Alert,
  Keyboard,
  WebView
} from 'react-native';

export default class Webview extends Abstract {

  constructor(props) {
    super(props);
  }

  onNavigatorEvent(event) {
    super.onNavigatorEvent(event);
    if (event.type == 'NavBarButtonPress') { // this is the event type for button presses
      if (event.id == 'cancel') { // this is the same id field from the static navigatorButtons definition
        this.dismiss();
      }
    }
  }

  dismiss() {
    this.props.navigator.dismissModal({animationType: "slide-down"})
  }

  configureNavBar() {
    this.props.navigator.setButtons({
      leftButtons: [
        {
          title: 'Cancel',
          id: 'cancel',
          showAsAction: 'ifRoom',
          buttonColor: GlobalStyles.constants().mainTintColor,
          buttonFontSize: 17
        }
      ],
      animated: false
    });
  }

  onMessage = (message) => {
    ComponentManager.get().handleMessage(this.editor, message.nativeEvent.data);
    // var data = JSON.parse(message.nativeEvent.data);
    // console.log("===On message:", data);
    // if(data.status) {
    //   this.postNote();
    // } else {
    //   var id = data.id;
    //   var text = data.text;
    //   var data = data.data;
    //
    //   if(this.props.note.uuid === id) {
    //     this.props.note.text = text;
    //     if(data) {
    //       var changesMade = this.props.editor.setData(id, data);
    //       if(changesMade) {
    //         this.props.editor.setDirty(true);
    //       }
    //     }
    //
    //     this.props.onChangesMade();
    //   }
    // }
  }

  postNote() {
    var data = {
      text: this.props.note.text,
      data: this.props.editor.dataForKey(this.props.note.uuid),
      id: this.props.note.uuid,
    }
    console.log("Posting", data, this.webView);
    this.webView.postMessage(JSON.stringify(data));
  }

  render() {
    var editor = this.props.editor;
    var url = editor.hosted_url || editor.url;
    url = url.replace("sn.local", "localhost");
    return (
      <View style={GlobalStyles.styles().container}>
      <WebView
           style={{flex: 1}}
           source={{uri: url}}
           ref={( webView ) => this.webView = webView}
           onMessage={this.onMessage}
           injectedJavaScript={
             `window.isNative = "true"`
           }
       />
      </View>
    );
  }

}
