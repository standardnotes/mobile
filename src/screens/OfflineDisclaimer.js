import React, { Component } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-navigation';
import ButtonCell from '@Components/ButtonCell';
import SectionHeader from '@Components/SectionHeader';
import ApplicationState from '@Lib/ApplicationState';
import UserPrefsManager, {
  AGREED_TO_OFFLINE_DISCLAIMER_KEY
} from '@Lib/userPrefsManager';
import { stripNonAlphanumeric, isMatchCaseInsensitive } from '@Lib/utils';
import AlertManager from '@SFJS/alertManager';
import Abstract from '@Screens/Abstract';
import { SCREEN_HOME } from '@Screens/screens';
import { ICON_CLOSE } from '@Style/icons';
import StyleKit from '@Style/StyleKit';

const SCREEN_TITLE        = "No Account";
const PAGE_HEADER         = "Use without an account";
const INPUT_PLACEHOLDER   = "Enter the text in the rectangle above...";
const TEXT_OFFLINE_WARNING =
                `Using Standard Notes without an account carries risks, as your ` +
                `data is not backed up anywhere. You may lose your data at ` +
                `anytime, for example, due to an OS update, or if we accidentally ` +
                `ship a bug in our code that does something unintended.` +
                `\n\n` +
                `You may proceed without an account, but we consider this an ` +
                `advanced mode of usage. You must manually create and export ` +
                `backups of your data regularly from the Settings menu.` +
                `\n\n` +
                `To proceed, please type the following sentence into the text ` +
                `area below.`;
const TEXT_DISCLAIMER     = `I understand that using the app without an account` +
                            ` carries risks, and that I am responsible for` +
                            ` making my own backups at regular intervals from` +
                            ` the Settings menu.`;
const AGREE_BUTTON_TEXT   = "I agree, use without an account.";

export default class OfflineDisclaimer extends Abstract {
  static navigationOptions = ({ navigation, navigationOptions }) => {
    const templateOptions = {
      title: SCREEN_TITLE,
      leftButton: {
        title: ApplicationState.isIOS ? "Cancel" : null,
        iconName: ApplicationState.isIOS
          ? null
          : StyleKit.nameForIcon(ICON_CLOSE)
      }
    };
    return Abstract.getDefaultNavigationOptions({
      navigation,
      navigationOptions,
      templateOptions
    });
  };

  constructor(props) {
    super(props);

    props.navigation.setParams({
      leftButton: {
        title: ApplicationState.isIOS ? "Cancel" : null,
        iconName: ApplicationState.isIOS
          ? null
          : StyleKit.nameForIcon(ICON_CLOSE),
        onPress: () => {
          this.dismiss();
        }
      }
    });

    this.screenView = null;
    this.scrollView = null;
    this.keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      this._keyboardDidShow.bind(this)
    );

    this.state = {
      userInput: '',
      waitingOnAgreement: true,
      keyboardVerticalOffset: 0
    };
  }

  componentDidMount() {
    super.componentDidMount();
    this._onLayout(null)
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.keyboardDidShowListener.remove();
  }

  _keyboardDidShow() {
    this.scrollView.scrollToEnd();
  }

  /**
    Make sure we get the screen's view pageY so we can offset the keyboard.
    This ensures the keyboard does not overlap the view.

    A delay is needed so the modal has time to finish animating into view.
    Without this the position is at the bottom of the screen when the modal
    first opens.
  */
  _onLayout = (_event) => {
    setTimeout(() => {
      if(this.screenView) {
        this.screenView.measure((x, y, width, height, pageX, pageY) => {
          if(this.state.keyboardVerticalOffset !== pageY) {
            this.setState({ keyboardVerticalOffset: pageY })
          }
        })
      }
    }, 300)
  }

  onAgreeToDisclaimer() {
    UserPrefsManager.get()
      .setPref({ key: AGREED_TO_OFFLINE_DISCLAIMER_KEY, value: true })
      .then(() => {
        this.props.navigation.navigate(SCREEN_HOME);
      });
  }

  onInputChange = inputText => {
    const isMatching = isMatchCaseInsensitive(
      stripNonAlphanumeric(inputText),
      stripNonAlphanumeric(TEXT_DISCLAIMER)
    );

    this.setState({
      userInput: inputText,
      waitingOnAgreement: !isMatching
    });
  };

  render() {
    const { keyboardVerticalOffset } = this.state;

    return (
      <SafeAreaView
        style={[StyleKit.styles.container, StyleKit.styles.baseBackground]}
        forceInset={{ top: 'never', bottom: 'never' }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, flexGrow: 1, flexDirection: 'column' }}
          behavior={ApplicationState.isAndroid ? null : 'padding'}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <ScrollView
            ref={view => {
              this.scrollView = view;
            }}
            style={{
              backgroundColor: StyleKit.variables.stylekitBackgroundColor
            }}
            keyboardShouldPersistTaps={'always'}
            keyboardDismissMode={'interactive'}
          >
            <View
              ref={view => {
                this.screenView = view
              }}
              style={this.styles.screenContainer}
              onLayout={this._onLayout}
            >
              <SectionHeader title={PAGE_HEADER} />

              <View style={this.styles.infoTextContainer}>
                <Text style={StyleKit.styles.uiText}>
                  {TEXT_OFFLINE_WARNING}
                </Text>
              </View>

              <View style={this.styles.disclaimerTextContainer}>
                <Text style={this.styles.disclaimerText}>
                  {TEXT_DISCLAIMER}
                </Text>
              </View>

              <View style={this.styles.inputTextContainer}>
                <TextInput
                  style={this.styles.disclaimerInput}
                  value={this.state.userInput}
                  onChangeText={this.onInputChange}
                  placeholder={INPUT_PLACEHOLDER}
                  placeholderTextColor={StyleKit.variables.stylekitNeutralColor}
                  keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
                  underlineColorAndroid={'transparent'}
                  autoCorrect={true}
                  autoCapitalize={'sentences'}
                  multiline={true}
                />
              </View>

              <ButtonCell
                title={AGREE_BUTTON_TEXT}
                extraStyles={this.styles.agreeButton}
                important={!this.state.waitingOnAgreement}
                disabled={this.state.waitingOnAgreement}
                bold={true}
                onPress={() => this.onAgreeToDisclaimer()}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  loadStyles() {
    const componentPadding = 15;
    const textPadding = 10;

    this.styles = {
      screenContainer: {
        flex: 1,
        flexGrow: 1,
        paddingTop: componentPadding,
        paddingBottom: componentPadding
      },
      infoTextContainer: {
        padding: componentPadding,
        paddingTop: 0
      },
      disclaimerTextContainer: {
        padding: textPadding,
        marginBottom: componentPadding,
        backgroundColor: StyleKit.variables.stylekitContrastBackgroundColor
      },
      disclaimerText: {
        ...StyleKit.styles.uiText,
        padding: textPadding,
        fontWeight: 'bold'
      },
      inputTextContainer: {
        paddingLeft: componentPadding,
        paddingRight: componentPadding
      },
      disclaimerInput: {
        marginBottom: componentPadding,
        padding: textPadding,
        paddingTop: textPadding,
        height: 100,
        fontSize: 16,
        color: StyleKit.variables.stylekitForegroundColor,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
        borderColor: StyleKit.variables.stylekitBorderColor,
        borderWidth: 1
      },
      agreeButton: {
        maxHeight: 50,
        borderTopWidth: 1,
        borderColor: StyleKit.variables.stylekitBorderColor
      }
    };
  }
}
