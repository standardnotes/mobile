import React, { Component } from 'react';
import { Alert, View, Linking, Platform, Text } from 'react-native';
import { WebView } from 'react-native-webview';

import ComponentManager from '@Lib/componentManager'
import ModelManager from '@Lib/sfjs/modelManager'

import StyleKit from "@Style/StyleKit"
import ApplicationState from "@Lib/ApplicationState"
import Icon from 'react-native-vector-icons/Ionicons';

export default class ComponentView extends Component {

  constructor(props) {
    super(props);

    this.state = {};

    this.loadStyles();

    this.identifier = `${Math.random()}`

    ComponentManager.get().registerHandler({identifier: this.identifier, areas: ["note-tags", "editor-stack", "editor-editor"],
       contextRequestHandler: (component) => {
        return this.note;
      }
    });

    this.keyboardListener = ApplicationState.get().addEventHandler((event, data) => {
      if(event == ApplicationState.KeyboardChangeEvent) {
        // this.webView.injectJavaScript(`window.scrollTo(0,0); document.body.scrollTop = 0`);
      }
    });

    this.reloadData();

    if(!this.note) {
      console.log("Unable to find note with ID", props.noteId);
    }

    let url = ComponentManager.get().urlForComponent(this.editor);
    console.log("Loading editor", url);

    if(!url) {
      Alert.alert('Re-install Extension', `This extension is not installed correctly. Please use the web or desktop application to reinstall ${this.editor.name}, then try again.`, [{text: 'OK'}])
      return;
    }
  }

  componentDidMount() {
    if(Platform.OS == "android" && Platform.Version <= 23) {
      // postMessage doesn't work on Android <= 6 (API version 23) https://github.com/facebook/react-native/issues/11594
      Alert.alert('Editors Not Supported', `Your version of Android does not support web editors. Changes you make may not be properly saved. Please switch to the Plain Editor for the best experience.`, [{text: 'OK'}])
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if(prevProps.noteId != this.props.noteId || prevProps.editorId != this.props.editorId) {
      this.reloadData();
    }
  }

  reloadData() {
    this.editor = ModelManager.get().findItem(this.props.editorId);
    this.note = ModelManager.get().findItem(this.props.noteId);
    ComponentManager.get().contextItemDidChangeInArea("editor-editor");

    let expired = this.editor.valid_until && this.editor.valid_until <= new Date();
    this.editor.readonly = expired;
  }

  componentWillUnmount() {
    ComponentManager.get().deregisterHandler(this.identifier);
    ComponentManager.get().deactivateComponent(this.editor);
    ApplicationState.get().removeEventHandler(this.keyboardListener);
  }

  onMessage = (message) => {
    if(!this.note) {
      // May be the case in tablet mode on app launch
      return;
    }

    let data;
    try {
      data = JSON.parse(message.nativeEvent.data);
    } catch (e) {
      console.log("Message is not valid JSON, returning");
      return;
    }

    ComponentManager.get().handleMessage(this.editor, data);
  }

  onFrameLoad = (syntheticEvent) => {
    // We have no way of knowing if the webview load is successful or not. We have to wait to see if the error event is fired.
    // Looking at the code, the error event is fired right after this, so we can wait just a few ms to see if the error event is fired
    // before registering the component window. Otherwise, on error, this component will be dealloced, and a pending postMessage will cause
    // a memory leak crash on Android in the form of "react native attempt to invoke virtual method double java.lang.double.doublevalue() on a null object reference"
    if(this.registrationTimeout) {
      clearTimeout(this.registrationTimeout);
    }

    this.registrationTimeout = setTimeout(() => {
      ComponentManager.get().registerComponentWindow(this.editor, this.webView);
    }, 1);

    // The parent will remove their loading screen on load end. We want to delay this by 100
    // to avoid flicker that may result if using a dark theme. This delay will allow editor
    // to load its theme
    setTimeout(() => {
      this.props.onLoadEnd();
    }, 100);
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

  onLoadError = (syntheticEvent) => {
    clearTimeout(this.registrationTimeout);
    this.props.onLoadError();
  }

  render() {
    var editor = this.editor;
    var url = ComponentManager.get().urlForComponent(editor);

    return (
      <View style={[StyleKit.styles.flexContainer, {backgroundColor: StyleKit.variables.stylekitBackgroundColor}]}>
        {this.editor.readonly &&
          <View style={this.styles.lockedContainer}>
            <Icon name={StyleKit.nameForIcon("lock")} size={16} color={StyleKit.variable("stylekitBackgroundColor")} />
            <Text style={this.styles.lockedText}>Extended expired. Editors are in a read-only state. To edit immediately, please switch to the Plain Editor.</Text>
          </View>
        }
        <WebView
           style={StyleKit.styles.flexContainer, {backgroundColor: "transparent"}}
           source={{uri: url}}
           key={this.editor.uuid}
           ref={(webView) => this.webView = webView}
           /* onLoad and onLoadEnd seem to be the same exact thing, except that when an error occurs, onLoadEnd is called twice, whereas onLoad is called once (what we want) */
           onLoad={this.onFrameLoad}
           onLoadStart={this.onLoadStart}
           onError={this.onLoadError}
           onMessage={this.onMessage}
           useWebKit={true}
           hideKeyboardAccessoryView={true}
           cacheEnabled={true}
           automaticallyAdjustContentInsets={false}
           contentInset={{top: 0, left: 0, bottom: 0, right: 0}}
           scalesPageToFit={true /* Android only, not available with WKWebView */}
           injectedJavaScript = {
             `(function() {
               window.isNative = "true";

               window.parent.postMessage = function(data) {
                window.parent.ReactNativeWebView.postMessage(data);
               };

               return true;
             })()`
          }
         />
      </View>
    );
  }

  loadStyles() {
    let padding = 10;
    this.styles = {
      lockedContainer: {
        justifyContent: 'flex-start',
        flexDirection: 'row',
        alignItems: "center",
        padding: padding,
        backgroundColor: StyleKit.variables.stylekitDangerColor,
        borderBottomColor: StyleKit.variables.stylekitBorderColor,
        borderBottomWidth: 1
      },

      lockedText: {
        fontWeight: "bold",
        fontSize: 12,
        color: StyleKit.variables.stylekitBackgroundColor,
        paddingLeft: 10
      },
    }
  }

}
