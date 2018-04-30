import React, { Component } from 'react';
import App from '../app'
import ComponentManager from '../lib/componentManager'
import ModelManager from '../lib/modelManager'
import TableSection from "../components/TableSection";

import Abstract from "./Abstract"

import GlobalStyles from "../Styles"
var _ = require('lodash')

import { View, WebView } from 'react-native';

export default class Webview extends Abstract {

  constructor(props) {
    super(props);

    this.editor = ModelManager.getInstance().findItem(props.editorId);
    this.note = ModelManager.getInstance().findItem(props.noteId);

    this.handler = ComponentManager.get().registerHandler({identifier: "editor", areas: ["note-tags", "editor-stack", "editor-editor"],
       contextRequestHandler: (component) => {
        return this.note;
      },
      actionHandler: (component, action, data) => {
        if(action === "save-items" || action === "save-success" || action == "save-error") {
          if(data.items.map((item) => {return item.uuid}).includes(this.note.uuid)) {

            if(action == "save-items") {
              if(this.componentSaveTimeout) clearTimeout(this.componentSaveTimeout);
              this.componentSaveTimeout = setTimeout(this.showSavingStatus.bind(this), 10);
            }

            else {
              if(this.componentStatusTimeout) clearTimeout(this.componentStatusTimeout);
              if(action == "save-success") {
                this.componentStatusTimeout = setTimeout(this.showAllChangesSavedStatus.bind(this), 400);
              } else {
                this.componentStatusTimeout = setTimeout(this.showErrorStatus.bind(this), 400);
              }
            }
          }
        }
      }
    });
  }

  componentWillUnmount() {
    ComponentManager.get().deregisterHandler(this.handler);
    ComponentManager.get().deactivateComponent(this.editor);
  }

  showSavingStatus() {
    this.setNavBarSubtitle("Saving...");
  }

  showAllChangesSavedStatus() {
    this.setNavBarSubtitle("All changes saved");
  }

  showErrorStatus() {
    this.setNavBarSubtitle("Error saving");
  }

  setNavBarSubtitle(title) {
    this.props.navigator.setSubTitle({
      subtitle: title
    });

    var color = GlobalStyles.constantForKey(App.isIOS ? "mainTextColor" : "navBarTextColor");
    this.props.navigator.setStyle({
      navBarSubtitleColor: GlobalStyles.hexToRGBA(color, 0.5),
      navBarSubtitleFontSize: 12
    });
  }

  onNavigatorEvent(event) {
    super.onNavigatorEvent(event);
    if (event.type == 'NavBarButtonPress') { // this is the event type for button presses
      if (event.id == 'accept') { // this is the same id field from the static navigatorButtons definition
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
          title: 'Done',
          id: 'accept',
          showAsAction: 'ifRoom',
          buttonColor: GlobalStyles.constants().mainTintColor,
          buttonFontSize: 17
        }
      ],
      animated: false
    });
  }

  onMessage = (message) => {
    let data = JSON.parse(message.nativeEvent.data);
    ComponentManager.get().handleMessage(this.editor, data);
  }

  onFrameLoad = (event) => {
    ComponentManager.get().registerComponentWindow(this.editor, this.webView);
  }

  render() {
    var editor = this.editor;
    var url = ComponentManager.get().urlForComponent(editor);

    let bottomPadding = -34; // For some reason iOS inserts padding on bottom

    return (
      <View style={GlobalStyles.styles().flexContainer}>
        <WebView
             style={GlobalStyles.styles().flexContainer, {backgroundColor: "transparent"}}
             source={{uri: url}}
             ref={(webView) => this.webView = webView}
             onLoad={this.onFrameLoad}
             onMessage={this.onMessage}
             contentInset={{top: 0, left: 0, bottom: bottomPadding, right: 0}}
             scalesPageToFit={App.isIOS ? false : true}
             injectedJavaScript={
               `window.isNative = "true"`
             }
         />
      </View>
    );
  }

}
