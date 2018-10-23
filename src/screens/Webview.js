import React, { Component } from 'react';
import App from '../app'
import ComponentManager from '../lib/componentManager'
import ModelManager from '../lib/sfjs/modelManager'
import TableSection from "../components/TableSection";
import Icons from '../Icons';
import LockedView from "../containers/LockedView";
import Abstract from "./Abstract"

import GlobalStyles from "../Styles"

import { Alert, View, WebView, Linking, Platform } from 'react-native';

export default class Webview extends Abstract {

  static navigatorButtons = Platform.OS == 'android' ? {} : {
    rightButtons: [{
      title: "Info",
      id: 'info',
      showAsAction: 'ifRoom',
    }]
  };

  constructor(props) {
    super(props);

    this.editor = ModelManager.get().findItem(props.editorId);
    this.note = ModelManager.get().findItem(props.noteId);

    if(!this.note) {
      console.log("Unable to find note with ID", props.noteId);
    }

    let url = ComponentManager.get().urlForComponent(this.editor);
    console.log("Loading editor", url);

    if(!url) {
      Alert.alert('Re-install Extension', `This extension is not installed correctly. Please use the web or desktop application to reinstall ${this.editor.name}, then try again.`, [{text: 'OK'}])
      return;
    }

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

  componentDidMount() {
    super.componentDidMount();

    var infoButton = {
      title: "Info",
      id: 'info',
      showAsAction: 'ifRoom',
    }

    if(Platform.OS === "android") {
      infoButton.icon = Icons.getIcon("md-information-circle");
    }

    if(this.props.navigator) {
      this.props.navigator.setButtons({
        rightButtons: [infoButton],
        animated: false
      });
    }
  }

  componentWillUnmount() {
    super.componentWillMount();
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

  onNavigatorEvent(event) {
    super.onNavigatorEvent(event);
    if (event.type == 'NavBarButtonPress') { // this is the event type for button presses
      if (event.id == 'accept') { // this is the same id field from the static navigatorButtons definition
        this.dismiss();
      } else if (event.id == 'info') {
        Alert.alert('Mobile Editors', "Mobile editors allow you to access your desktop editors directly from your mobile device. Note however that editors are primarily web-based and designed for a full desktop experience. Desktop editors are complex and stretch the possibilities of a web browser, let alone a mobile browser. It’s best to treat web editors on mobile as a way to view your marked up data, and if necessary, make minor modifications.", [
          {text: 'OK'},
          {text: 'Send Feedback', onPress: () => {
            var platformString = App.isIOS ? "iOS" : "Android";
            Linking.openURL(`mailto:hello@standardnotes.org?subject=${platformString} editors feedback (v${App.version})`);
          }}
        ])
      }
    }
  }

  dismiss() {
    let animationType = "slide-down";
    this.props.navigator.dismissModal({animationType: animationType})
  }

  configureNavBar() {
    if(!this.props.navigator) {
      return;
    }

    this.props.navigator.setButtons({
      leftButtons: [
        {
          title: 'Done',
          id: 'accept',
          showAsAction: 'ifRoom',
          buttonFontSize: 17
        }
      ],
      animated: false
    });
  }

  onMessage = (message) => {
    var data;
    try {
      data = JSON.parse(message.nativeEvent.data);
    } catch (e) {
      console.log("Message is not valid JSON, returning");
      return;
    }

    // Ignore any incoming events (like save events) if the note is locked. Allow messages that are required for component setup (administrative)
    if(this.note.locked && !ComponentManager.get().isReadOnlyMessage(data)) {
      if(!this.didShowLockAlert) {
        Alert.alert('Note Locked', "This note is locked. Changes you make in the web editor will not be saved. Please unlock this note to make changes.", [{text: 'OK'}])
        this.didShowLockAlert = true;
      }
      this.setNavBarSubtitle("Note Locked");
      return;
    }
    ComponentManager.get().handleMessage(this.editor, data);
  }

  onFrameLoad = (event) => {
    ComponentManager.get().registerComponentWindow(this.editor, this.webView);
    this.props.onLoadEnd();
  }

  onLoadStart = () => {
    // There is a known issue where using the PostMessage API will lead to double trigger
    // of this function: https://github.com/facebook/react-native/issues/16547.
    // We only care about initial load, so after it's been set once, no need to unset it.
    if(!this.alreadyTriggeredLoad) {
      this.alreadyTriggeredLoad = true;
      this.props.onLoadStart();
    }
  }

  onLoadError = () => {
    this.props.onLoadError();
  }

  render() {
    if(this.state.lockContent) {
      return (<LockedView />);
    }

    var editor = this.editor;
    var url = ComponentManager.get().urlForComponent(editor);

    let bottomPadding = -34; // For some reason iOS inserts padding on bottom

    return (
      <View style={[GlobalStyles.styles().flexContainer]}>
        <WebView
           style={GlobalStyles.styles().flexContainer, {backgroundColor: "transparent"}}
           source={{uri: url}}
           key={this.editor.uuid}
           ref={(webView) => this.webView = webView}
           onLoad={this.onFrameLoad}
           onLoadStart={this.onLoadStart}
           onError={this.onLoadError}
           onMessage={this.onMessage}
           contentInset={{top: 0, left: 0, bottom: bottomPadding, right: 0}}
           scalesPageToFit={App.isIOS ? false : true}
           injectedJavaScript = {
             `window.isNative = "true"`
          }
         />
      </View>
    );
  }

}
