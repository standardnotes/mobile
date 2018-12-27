import React, { Component } from 'react';
import { Alert, View, WebView, Linking, Platform } from 'react-native';

import ComponentManager from '../lib/componentManager'
import ModelManager from '../lib/sfjs/modelManager'

import StyleKit from "../style/StyleKit"
import ApplicationState from "../ApplicationState"


export default class Webview extends Component {

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
      }
    });
  }

  componentWillUnmount() {
    ComponentManager.get().deregisterHandler(this.handler);
    ComponentManager.get().deactivateComponent(this.editor);
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
    var editor = this.editor;
    var url = ComponentManager.get().urlForComponent(editor);

    let bottomPadding = -34; // For some reason iOS inserts padding on bottom

    return (
      <View style={[StyleKit.styles().flexContainer, this.props.style]}>
        <WebView
           style={StyleKit.styles().flexContainer, {backgroundColor: "transparent"}}
           source={{uri: url}}
           key={this.editor.uuid}
           ref={(webView) => this.webView = webView}
           onLoad={this.onFrameLoad}
           onLoadStart={this.onLoadStart}
           onError={this.onLoadError}
           onMessage={this.onMessage}
           contentInset={{top: 0, left: 0, bottom: bottomPadding, right: 0}}
           scalesPageToFit={ApplicationState.isIOS ? false : true}
           injectedJavaScript = {
             `window.isNative = "true"`
          }
         />
      </View>
    );
  }

}
