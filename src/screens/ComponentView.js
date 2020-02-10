import React, { Component } from 'react';
import { Alert, View, Platform, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import ApplicationState from '@Lib/ApplicationState';
import ComponentManager from '@Lib/componentManager';
import ModelManager from '@Lib/sfjs/modelManager';
import UserPrefsManager, {
  DONT_SHOW_AGAIN_UNSUPPORTED_EDITORS_KEY
} from '@Lib/userPrefsManager';
import { ICON_LOCK } from '@Style/icons';
import StyleKit from '@Style/StyleKit';

export default class ComponentView extends Component {
  constructor(props) {
    super(props);

    this.state = {};

    this.loadStyles();

    this.identifier = `${Math.random()}`;

    ComponentManager.get().registerHandler({
      identifier: this.identifier,
      areas: ['note-tags', 'editor-stack', 'editor-editor'],
      contextRequestHandler: () => {
        return this.note;
      }
    });

    this.reloadData();

    if (!this.note) {
      console.log('Unable to find note with ID', props.noteId);
    }

    const url = ComponentManager.get().urlForComponent(this.editor);
    console.log('Loading editor', url);

    if (this.editor.offlineOnly) {
      Alert.alert(
        'Offline Only',
        `You've marked ${
          this.editor.name
        } as 'offline only', which means it can only be accessed via the desktop app. To use this editor on mobile, please use the web or desktop app and check 'Use hosted when local is unavailable' in the editor's extension settings. Otherwise, please change to another editor to edit this note.`,
        [{ text: 'OK' }]
      );
    } else if (!url) {
      Alert.alert(
        'Re-install Extension',
        `This extension is not installed correctly. Please use the web or desktop application to reinstall ${
          this.editor.name
        }, then try again.`,
        [{ text: 'OK' }]
      );
    }
  }

  async componentDidMount() {
    if (Platform.OS === 'android' && Platform.Version <= 23) {
      /**
       * postMessage doesn't work on Android <= 6 (API version 23)
       * https://github.com/facebook/react-native/issues/11594
       */
      const dontShowAgain = await UserPrefsManager.get().isPrefSet({
        key: DONT_SHOW_AGAIN_UNSUPPORTED_EDITORS_KEY
      });

      if (!dontShowAgain) {
        Alert.alert(
          'Editors Not Supported',
          'Web editors require Android 7.0 or greater. Your version does not support web editors. Changes you make may not be properly saved. Please switch to the Plain Editor for the best experience.',
          [
            {
              text: "Don't show again",
              onPress: () =>
                UserPrefsManager.get().setPref({
                  key: DONT_SHOW_AGAIN_UNSUPPORTED_EDITORS_KEY,
                  value: true
                })
            },
            { text: 'OK' }
          ]
        );
      }
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      prevProps.noteId !== this.props.noteId ||
      prevProps.editorId !== this.props.editorId
    ) {
      this.reloadData();
    }
  }

  reloadData() {
    this.editor = ModelManager.get().findItem(this.props.editorId);
    this.note = ModelManager.get().findItem(this.props.noteId);
    ComponentManager.get().contextItemDidChangeInArea('editor-editor');

    const expired =
      this.editor.valid_until && this.editor.valid_until <= new Date();
    this.editor.readonly = expired;
  }

  componentWillUnmount() {
    ComponentManager.get().deregisterHandler(this.identifier);
    ComponentManager.get().deactivateComponent(this.editor);
  }

  onMessage = message => {
    if (!this.note) {
      /** May be the case in tablet mode on app launch */
      return;
    }

    let data;
    try {
      data = JSON.parse(message.nativeEvent.data);
    } catch (e) {
      console.log('Message is not valid JSON, returning');
      return;
    }

    ComponentManager.get().handleMessage(this.editor, data);
  };

  onFrameLoad = syntheticEvent => {
    /**
     * We have no way of knowing if the webview load is successful or not. We
     * have to wait to see if the error event is fired. Looking at the code,
     * the error event is fired right after this, so we can wait just a few ms
     * to see if the error event is fired before registering the component
     * window. Otherwise, on error, this component will be dealloced, and a
     * pending postMessage will cause a memory leak crash on Android in the
     * form of "react native attempt to invoke virtual method double java.lang.double.doublevalue() on a null object reference"
     */
    if (this.registrationTimeout) {
      clearTimeout(this.registrationTimeout);
    }

    this.registrationTimeout = setTimeout(() => {
      ComponentManager.get().registerComponentWindow(this.editor, this.webView);
    }, 1);

    /**
     * The parent will remove their loading screen on load end. We want to
     * delay this by 100 to avoid flicker that may result if using a dark theme.
     * This delay will allow editor to load its theme.
     */
    setTimeout(() => {
      this.props.onLoadEnd();
    }, 100);
  };

  onLoadStart = () => {
    /**
     * There is a known issue where using the PostMessage API will lead to
     * double trigger of this function: https://github.com/facebook/react-native/issues/16547.
     * We only care about initial load, so after it's been set once, no need to
     * unset it.
     */
    if (!this.alreadyTriggeredLoad) {
      this.alreadyTriggeredLoad = true;
      this.props.onLoadStart();
    }
  };

  onLoadError = syntheticEvent => {
    clearTimeout(this.registrationTimeout);
    this.props.onLoadError();
  };

  onShouldStartLoadWithRequest = request => {
    /**
     * We want to handle link clicks within an editor by opening the browser
     * instead of loading inline. On iOS, onShouldStartLoadWithRequest is
     * called for all requests including the initial request to load the editor.
     * On iOS, clicks in the editors have a navigationType of 'click', but on
     * Android, this is not the case (no navigationType).
     * However, on Android, this function is not called for the initial request.
     * So that might be one way to determine if this request is a click or the
     * actual editor load request. But I don't think it's safe to rely on this
     * being the case in the future. So on Android, we'll handle url loads only
     * if the url isn't equal to the editor url.
     */

    const editorUrl = ComponentManager.get().urlForComponent(this.editor);
    if (
      (ApplicationState.isIOS && request.navigationType === 'click') ||
      (ApplicationState.isAndroid && request.url !== editorUrl)
    ) {
      ApplicationState.openURL(request.url);
      return false;
    }
    return true;
  };

  defaultInjectedJavaScript = () => {
    return `(function() {
      window.parent.postMessage = function(data) {
        window.parent.ReactNativeWebView.postMessage(data);
      };
      return true;
    })()`;
  };

  render() {
    const editor = this.editor;
    const url = ComponentManager.get().urlForComponent(editor);

    return (
      <View
        style={[
          StyleKit.styles.flexContainer,
          { backgroundColor: StyleKit.variables.stylekitBackgroundColor }
        ]}
      >
        {this.editor.readonly && (
          <View style={this.styles.lockedContainer}>
            <Icon
              name={StyleKit.nameForIcon(ICON_LOCK)}
              size={16}
              color={StyleKit.variables.stylekitBackgroundColor}
            />
            <Text style={this.styles.lockedText}>
              Extended expired. Editors are in a read-only state. To edit
              immediately, please switch to the Plain Editor.
            </Text>
          </View>
        )}
        {url && (
          <WebView
            style={
              (StyleKit.styles.flexContainer,
              { backgroundColor: 'transparent' })
            }
            source={{ uri: url }}
            key={this.editor.uuid}
            ref={webView => (this.webView = webView)}
            /**
             * onLoad and onLoadEnd seem to be the same exact thing, except
             * that when an error occurs, onLoadEnd is called twice, whereas
             * onLoad is called once (what we want)
             */
            onLoad={this.onFrameLoad}
            onLoadStart={this.onLoadStart}
            onError={this.onLoadError}
            onMessage={this.onMessage}
            useWebKit={true}
            hideKeyboardAccessoryView={true}
            onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest}
            cacheEnabled={true}
            scalesPageToFit={
              true /* Android only, not available with WKWebView */
            }
            autoManageStatusBarEnabled={
              false /* To prevent StatusBar from changing colors when focusing */
            }
            injectedJavaScript={this.defaultInjectedJavaScript()}
          />
        )}
      </View>
    );
  }

  loadStyles() {
    const padding = 10;
    this.styles = {
      lockedContainer: {
        justifyContent: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        padding: padding,
        backgroundColor: StyleKit.variables.stylekitDangerColor,
        borderBottomColor: StyleKit.variables.stylekitBorderColor,
        borderBottomWidth: 1
      },

      lockedText: {
        fontWeight: 'bold',
        fontSize: 12,
        color: StyleKit.variables.stylekitBackgroundColor,
        paddingLeft: 10
      }
    };
  }
}
